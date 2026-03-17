import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import type { PaymentGateway } from './payment-gateway.interface';
import { CreateAccessOrderDto, VerifyPaymentDto } from './dto/create-order.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private supabaseService: SupabaseService,
    private razorpayGateway: RazorpayGateway,
    private stripeGateway: StripeGateway,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  getGateway(countryCode: string): { gateway: PaymentGateway; name: 'razorpay' | 'stripe' } {
    if (countryCode === 'IN') {
      return { gateway: this.razorpayGateway, name: 'razorpay' };
    }
    return { gateway: this.stripeGateway, name: 'stripe' };
  }

  private get isDemoMode(): boolean {
    const razorpayKey = this.razorpayGateway['keyId'] || '';
    const stripeKey = this.stripeGateway['secretKey'] || '';
    return (!razorpayKey || razorpayKey === 'placeholder') && (!stripeKey || stripeKey === 'placeholder');
  }

  async createAccessOrder(userId: string, dto: CreateAccessOrderDto) {
    const logger = new Logger('PaymentsService');
    try {
      // Get expert details for pricing
      const { data: expert, error: expertErr } = await this.db
        .from('experts')
        .select('id, access_fee_minor, access_fee_currency, is_available, verification_status')
        .eq('id', dto.expert_id)
        .single();

      if (expertErr || !expert) {
        throw new NotFoundException('Expert not found');
      }

      if (expert.verification_status !== 'verified') {
        throw new BadRequestException('Expert is not verified');
      }

      if (!expert.is_available) {
        throw new BadRequestException('Expert is currently unavailable');
      }

      // Demo/dev mode: auto-create a paid payment without hitting real gateway
      if (this.isDemoMode) {
        logger.log('Demo mode: creating auto-paid payment record');
        const { data: payment, error: paymentErr } = await this.db
          .from('access_payments')
          .insert({
            user_id: userId,
            expert_id: dto.expert_id,
            amount_minor: expert.access_fee_minor,
            currency: expert.access_fee_currency,
            gateway: 'free',
            gateway_order_id: `demo_${Date.now()}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (paymentErr) {
          throw new BadRequestException(`Payment record failed: ${paymentErr.message}`);
        }

        return {
          payment_id: payment.id,
          gateway: 'demo',
          order_id: payment.gateway_order_id,
          amount_minor: expert.access_fee_minor,
          currency: expert.access_fee_currency,
          demo: true,
        };
      }

      // Get user's country for gateway selection
      const { data: user } = await this.db
        .from('users')
        .select('country_code')
        .eq('id', userId)
        .single();

      const { gateway, name: gatewayName } = this.getGateway(user?.country_code || 'IN');

      // Create gateway order (Razorpay/Stripe expect amounts in minor units i.e. paise/cents)
      const order = await gateway.createOrder(
        expert.access_fee_minor * 100,
        expert.access_fee_currency,
        { user_id: userId, expert_id: dto.expert_id },
      );

      // Record payment as pending
      const { data: payment, error: paymentErr } = await this.db
        .from('access_payments')
        .insert({
          user_id: userId,
          expert_id: dto.expert_id,
          amount_minor: expert.access_fee_minor,
          currency: expert.access_fee_currency,
          gateway: gatewayName,
          gateway_order_id: order.order_id,
          status: 'pending',
        })
        .select()
        .single();

      if (paymentErr) {
        throw new BadRequestException(`Payment record failed: ${paymentErr.message}`);
      }

      return {
        payment_id: payment.id,
        ...order,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create access order');
    }
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    try {
      // Find the pending payment
      const { data: payment, error } = await this.db
        .from('access_payments')
        .select('*')
        .eq('gateway_order_id', dto.gateway_order_id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (error || !payment) {
        throw new NotFoundException('Payment not found or already processed');
      }

      const { gateway } = this.getGateway(payment.gateway === 'razorpay' ? 'IN' : 'US');

      const isValid = await gateway.verifyPayment({
        gateway_order_id: dto.gateway_order_id,
        gateway_payment_id: dto.gateway_payment_id,
        gateway_signature: dto.gateway_signature,
      });

      if (!isValid) {
        await this.db
          .from('access_payments')
          .update({ status: 'failed' })
          .eq('id', payment.id);
        throw new BadRequestException('Payment verification failed');
      }

      // Mark as paid
      const { data: updated } = await this.db
        .from('access_payments')
        .update({
          status: 'paid',
          gateway_payment_id: dto.gateway_payment_id,
          gateway_signature: dto.gateway_signature,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .select()
        .single();

      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Process incoming payment webhook events from Razorpay or Stripe.
   */
  async handleWebhookEvent(gateway: 'razorpay' | 'stripe', event: string, payload: any) {
    const logger = new Logger('PaymentWebhook');

    try {
      if (gateway === 'razorpay') {
        switch (event) {
          case 'payment.captured': {
            const paymentId = payload?.payment?.entity?.order_id;
            if (paymentId) {
              await this.db
                .from('access_payments')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('gateway_order_id', paymentId)
                .eq('status', 'pending');
              logger.log(`Razorpay: marked payment ${paymentId} as paid`);
            }
            break;
          }
          case 'payment.failed': {
            const orderId = payload?.payment?.entity?.order_id;
            if (orderId) {
              await this.db
                .from('access_payments')
                .update({ status: 'failed' })
                .eq('gateway_order_id', orderId)
                .eq('status', 'pending');
              logger.log(`Razorpay: marked payment ${orderId} as failed`);
            }
            break;
          }
          case 'refund.processed': {
            const refundId = payload?.refund?.entity?.id;
            if (refundId) {
              await this.db
                .from('refunds')
                .update({ status: 'processed' })
                .eq('gateway_refund_id', refundId);
              logger.log(`Razorpay: refund ${refundId} processed`);
            }
            break;
          }
          default:
            logger.log(`Razorpay: unhandled event ${event}`);
        }
      } else if (gateway === 'stripe') {
        switch (event) {
          case 'payment_intent.succeeded': {
            const intentId = payload?.data?.object?.id;
            if (intentId) {
              await this.db
                .from('access_payments')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('gateway_order_id', intentId)
                .eq('status', 'pending');
              logger.log(`Stripe: marked payment ${intentId} as paid`);
            }
            break;
          }
          case 'payment_intent.payment_failed': {
            const intentId = payload?.data?.object?.id;
            if (intentId) {
              await this.db
                .from('access_payments')
                .update({ status: 'failed' })
                .eq('gateway_order_id', intentId)
                .eq('status', 'pending');
              logger.log(`Stripe: marked payment ${intentId} as failed`);
            }
            break;
          }
          case 'charge.refunded': {
            const refundId = payload?.data?.object?.refunds?.data?.[0]?.id;
            if (refundId) {
              await this.db
                .from('refunds')
                .update({ status: 'processed' })
                .eq('gateway_refund_id', refundId);
              logger.log(`Stripe: refund ${refundId} processed`);
            }
            break;
          }
          default:
            logger.log(`Stripe: unhandled event ${event}`);
        }
      }

      return { processed: true };
    } catch (err) {
      logger.error(`Webhook processing failed: ${(err as Error).message}`);
      return { processed: false, error: (err as Error).message };
    }
  }
}

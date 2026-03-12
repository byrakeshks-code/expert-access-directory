import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { RazorpayGateway } from '../payments/gateways/razorpay.gateway';
import { StripeGateway } from '../payments/gateways/stripe.gateway';
import { PaginationDto } from '../../common/dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent, getNotificationContent } from '../notifications/notification-events';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private razorpayGateway: RazorpayGateway,
    private stripeGateway: StripeGateway,
    private notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async initiateRefund(paymentId: string, requestId: string | null, reason: string) {
    const { data: payment } = await this.db
      .from('access_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('status', 'paid')
      .single();

    if (!payment) {
      this.logger.warn(`Refund skipped — payment ${paymentId} not in paid status`);
      return null;
    }

    // Create refund record
    const { data: refund, error } = await this.db
      .from('refunds')
      .insert({
        access_payment_id: paymentId,
        request_id: requestId,
        user_id: payment.user_id,
        amount_minor: payment.amount_minor,
        currency: payment.currency,
        reason,
        status: 'approved',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Refund creation failed: ${error.message}`);
    }

    // Process via gateway
    try {
      const gateway = payment.gateway === 'razorpay' ? this.razorpayGateway : this.stripeGateway;
      const result = await gateway.refund(payment.gateway_payment_id, payment.amount_minor);

      await this.db
        .from('refunds')
        .update({
          status: 'processed',
          gateway_refund_id: result.refund_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', refund.id);

      // Mark payment as refunded
      await this.db
        .from('access_payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      this.logger.log(`Refund processed for payment ${paymentId}`);

      // Notify user: refund processed
      const refundContent = getNotificationContent(NotificationEvent.REFUND_PROCESSED, {
        amount: `${payment.amount_minor} ${payment.currency}`,
      });
      this.notificationsService.send({
        event: NotificationEvent.REFUND_PROCESSED,
        userId: payment.user_id,
        title: refundContent.title,
        body: refundContent.body,
        channels: ['in_app', 'email'],
      }).catch(() => {});

      return { ...refund, status: 'processed', gateway_refund_id: result.refund_id };
    } catch (err) {
      this.logger.error(`Refund gateway error: ${(err as Error).message}`);
      await this.db
        .from('refunds')
        .update({ status: 'requested' })
        .eq('id', refund.id);
      return refund;
    }
  }

  async listUserRefunds(userId: string, pagination: PaginationDto) {
    const { data, count, error } = await this.db
      .from('refunds')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(pagination.offset, pagination.offset + (pagination.limit ?? 20) - 1);

    if (error) throw new BadRequestException(error.message);
    return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
  }

  async getRefund(refundId: string, userId: string) {
    const { data, error } = await this.db
      .from('refunds')
      .select('*, access_payments(*)')
      .eq('id', refundId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Refund not found');
    return data;
  }
}

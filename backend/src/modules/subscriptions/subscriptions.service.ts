import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { RazorpayGateway } from '../payments/gateways/razorpay.gateway';
import { StripeGateway } from '../payments/gateways/stripe.gateway';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent, getNotificationContent } from '../notifications/notification-events';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private razorpayGateway: RazorpayGateway,
    private stripeGateway: StripeGateway,
    private notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async listTiers() {
    try {
      const { data, error } = await this.db
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly_minor', { ascending: true });

      if (error) return [];
      return data;
    } catch {
      return [];
    }
  }

  async getMySubscription(userId: string) {
    const { data: expert } = await this.db
      .from('experts')
      .select('id, current_tier')
      .eq('user_id', userId)
      .single();

    if (!expert) throw new NotFoundException('Expert profile not found');

    const { data: subscription } = await this.db
      .from('expert_subscriptions')
      .select('*, subscription_tiers(*)')
      .eq('expert_id', expert.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      current_tier: expert.current_tier,
      subscription: subscription || null,
    };
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    const { data: expert } = await this.db
      .from('experts')
      .select('id, user_id, verification_status')
      .eq('user_id', userId)
      .single();

    if (!expert) throw new NotFoundException('Expert profile not found');
    if (expert.verification_status !== 'verified') {
      throw new BadRequestException('Must be verified to subscribe');
    }

    // Get tier pricing
    const { data: tier } = await this.db
      .from('subscription_tiers')
      .select('*')
      .eq('id', dto.tier_id)
      .single();

    if (!tier) throw new NotFoundException('Subscription tier not found');

    const amount =
      dto.billing_cycle === 'yearly' ? tier.price_yearly_minor : tier.price_monthly_minor;

    if (amount === 0) {
      throw new BadRequestException('Cannot subscribe to a free tier');
    }

    // Get user country for gateway
    const { data: user } = await this.db
      .from('users')
      .select('country_code')
      .eq('id', userId)
      .single();

    const gatewayName = user?.country_code === 'IN' ? 'razorpay' : 'stripe';
    const gateway = gatewayName === 'razorpay' ? this.razorpayGateway : this.stripeGateway;

    // Create payment order for the subscription
    const order = await gateway.createOrder(amount, tier.currency, {
      type: 'subscription',
      expert_id: expert.id,
      tier_id: dto.tier_id,
      billing_cycle: dto.billing_cycle,
    });

    // Calculate period end
    const periodEnd = new Date();
    if (dto.billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription record
    const { data: subscription, error } = await this.db
      .from('expert_subscriptions')
      .insert({
        expert_id: expert.id,
        tier_id: dto.tier_id,
        billing_cycle: dto.billing_cycle,
        status: 'active',
        gateway: gatewayName,
        gateway_subscription_id: order.order_id,
        amount_minor: amount,
        currency: tier.currency,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update expert tier
    await this.db
      .from('experts')
      .update({
        current_tier: dto.tier_id,
        max_requests_per_day: tier.max_requests_per_day,
      })
      .eq('id', expert.id);

    // Notify expert: subscription activated
    const subContent = getNotificationContent(NotificationEvent.SUBSCRIPTION_ACTIVATED, {
      tierName: tier.name || tier.id,
    });
    this.notificationsService.send({
      event: NotificationEvent.SUBSCRIPTION_ACTIVATED,
      userId,
      title: subContent.title,
      body: subContent.body,
      actionUrl: subContent.actionUrl,
      channels: ['in_app', 'email'],
    }).catch(() => {});

    return {
      subscription,
      payment: order,
    };
  }

  async cancelSubscription(userId: string) {
    const { data: expert } = await this.db
      .from('experts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!expert) throw new NotFoundException('Expert profile not found');

    const { data: subscription } = await this.db
      .from('expert_subscriptions')
      .select('*')
      .eq('expert_id', expert.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      throw new BadRequestException('No active subscription to cancel');
    }

    // Mark as cancelled — will revert to starter at period end
    await this.db
      .from('expert_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    return {
      cancelled: true,
      effective_until: subscription.current_period_end,
      message: 'Subscription cancelled. You will retain paid features until the current period ends.',
    };
  }

  /**
   * Called by a scheduled job to downgrade expired subscriptions.
   */
  async downgradeExpired() {
    const { data: expired } = await this.db
      .from('expert_subscriptions')
      .select('id, expert_id')
      .eq('status', 'cancelled')
      .lt('current_period_end', new Date().toISOString());

    if (!expired || expired.length === 0) return { downgraded: 0 };

    // Get starter tier defaults
    const { data: starterTier } = await this.db
      .from('subscription_tiers')
      .select('max_requests_per_day')
      .eq('id', 'starter')
      .single();

    for (const sub of expired) {
      await this.db
        .from('expert_subscriptions')
        .update({ status: 'expired' })
        .eq('id', sub.id);

      await this.db
        .from('experts')
        .update({
          current_tier: 'starter',
          max_requests_per_day: starterTier?.max_requests_per_day || 10,
        })
        .eq('id', sub.expert_id);

      // Notify expert: subscription downgraded
      const { data: expert } = await this.db
        .from('experts')
        .select('user_id')
        .eq('id', sub.expert_id)
        .single();

      if (expert) {
        const downgradeContent = getNotificationContent(NotificationEvent.SUBSCRIPTION_DOWNGRADED, {});
        this.notificationsService.send({
          event: NotificationEvent.SUBSCRIPTION_DOWNGRADED,
          userId: expert.user_id,
          title: downgradeContent.title,
          body: downgradeContent.body,
          channels: ['in_app', 'email', 'push'],
        }).catch(() => {});
      }
    }

    this.logger.log(`Downgraded ${expired.length} expired subscriptions`);
    return { downgraded: expired.length };
  }

  /**
   * Process incoming subscription webhook events.
   */
  async handleWebhookEvent(gateway: 'razorpay' | 'stripe', event: string, payload: any) {
    try {
      if (gateway === 'razorpay') {
        switch (event) {
          case 'subscription.charged': {
            // Renewal success — extend the period
            const subId = payload?.subscription?.entity?.id;
            if (subId) {
              const { data: sub } = await this.db
                .from('expert_subscriptions')
                .select('id, billing_cycle, current_period_end')
                .eq('gateway_subscription_id', subId)
                .single();

              if (sub) {
                const newEnd = new Date(sub.current_period_end);
                if (sub.billing_cycle === 'yearly') {
                  newEnd.setFullYear(newEnd.getFullYear() + 1);
                } else {
                  newEnd.setMonth(newEnd.getMonth() + 1);
                }
                await this.db
                  .from('expert_subscriptions')
                  .update({
                    status: 'active',
                    current_period_start: sub.current_period_end,
                    current_period_end: newEnd.toISOString(),
                  })
                  .eq('id', sub.id);
                this.logger.log(`Razorpay: subscription ${subId} renewed`);
              }
            }
            break;
          }
          case 'subscription.halted':
          case 'subscription.cancelled': {
            const subId = payload?.subscription?.entity?.id;
            if (subId) {
              await this.db
                .from('expert_subscriptions')
                .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                .eq('gateway_subscription_id', subId)
                .eq('status', 'active');
              this.logger.log(`Razorpay: subscription ${subId} cancelled/halted`);
            }
            break;
          }
          default:
            this.logger.log(`Razorpay subscription: unhandled event ${event}`);
        }
      } else if (gateway === 'stripe') {
        switch (event) {
          case 'invoice.paid': {
            const subId = payload?.data?.object?.subscription;
            if (subId) {
              const { data: sub } = await this.db
                .from('expert_subscriptions')
                .select('id, billing_cycle, current_period_end')
                .eq('gateway_subscription_id', subId)
                .single();

              if (sub) {
                const newEnd = new Date(sub.current_period_end);
                if (sub.billing_cycle === 'yearly') {
                  newEnd.setFullYear(newEnd.getFullYear() + 1);
                } else {
                  newEnd.setMonth(newEnd.getMonth() + 1);
                }
                await this.db
                  .from('expert_subscriptions')
                  .update({
                    status: 'active',
                    current_period_start: sub.current_period_end,
                    current_period_end: newEnd.toISOString(),
                  })
                  .eq('id', sub.id);
                this.logger.log(`Stripe: subscription ${subId} renewed`);
              }
            }
            break;
          }
          case 'invoice.payment_failed': {
            const subId = payload?.data?.object?.subscription;
            if (subId) {
              this.logger.warn(`Stripe: subscription ${subId} payment failed`);
              // Notify expert about payment failure — handled at controller level
            }
            break;
          }
          case 'customer.subscription.deleted': {
            const subId = payload?.data?.object?.id;
            if (subId) {
              await this.db
                .from('expert_subscriptions')
                .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                .eq('gateway_subscription_id', subId)
                .eq('status', 'active');
              this.logger.log(`Stripe: subscription ${subId} deleted`);
            }
            break;
          }
          default:
            this.logger.log(`Stripe subscription: unhandled event ${event}`);
        }
      }

      return { processed: true };
    } catch (err) {
      this.logger.error(`Subscription webhook processing failed: ${(err as Error).message}`);
      return { processed: false };
    }
  }
}

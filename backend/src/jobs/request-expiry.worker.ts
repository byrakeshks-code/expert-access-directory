import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.config';
import { RefundsService } from '../modules/refunds/refunds.service';

@Processor('request-expiry')
export class RequestExpiryWorker {
  private readonly logger = new Logger(RequestExpiryWorker.name);

  constructor(
    private supabaseService: SupabaseService,
    private refundsService: RefundsService,
  ) {}

  @Process('expire-stale-requests')
  async handleExpiry() {
    const db = this.supabaseService.getServiceClient();

    // Find and expire stale requests
    const { data: expired, error } = await db
      .from('access_requests')
      .update({ status: 'expired' })
      .eq('status', 'sent')
      .lt('expires_at', new Date().toISOString())
      .select('id, access_payment_id');

    if (error) {
      this.logger.error(`Expiry job failed: ${error.message}`);
      return;
    }

    if (!expired || expired.length === 0) {
      return;
    }

    this.logger.log(`Expired ${expired.length} requests`);

    // Check if auto-refund is enabled
    const { data: config } = await db
      .from('platform_config')
      .select('value')
      .eq('key', 'refund_on_expiry')
      .single();

    const autoRefund = config?.value === 'true' || config?.value === true;

    if (autoRefund) {
      for (const req of expired) {
        try {
          await this.refundsService.initiateRefund(
            req.access_payment_id,
            req.id,
            'auto_expired',
          );
        } catch (err) {
          this.logger.error(`Auto-refund failed for request ${req.id}: ${(err as Error).message}`);
        }
      }
    }
  }
}

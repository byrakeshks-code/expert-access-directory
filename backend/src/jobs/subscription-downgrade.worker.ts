import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { SubscriptionsService } from '../modules/subscriptions/subscriptions.service';

@Processor('subscription-downgrade')
export class SubscriptionDowngradeWorker {
  private readonly logger = new Logger(SubscriptionDowngradeWorker.name);

  constructor(private subscriptionsService: SubscriptionsService) {}

  @Process('downgrade-expired')
  async handleDowngrade() {
    this.logger.log('Running subscription downgrade check...');
    try {
      const result = await this.subscriptionsService.downgradeExpired();
      if (result.downgraded > 0) {
        this.logger.log(`Downgraded ${result.downgraded} expired subscriptions`);
      }
    } catch (err) {
      this.logger.error(`Subscription downgrade job failed: ${(err as Error).message}`);
    }
  }
}

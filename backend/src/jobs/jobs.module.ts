import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RequestExpiryWorker } from './request-expiry.worker';
import { SubscriptionDowngradeWorker } from './subscription-downgrade.worker';
import { SchedulerService } from './scheduler.service';
import { RefundsModule } from '../modules/refunds/refunds.module';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'request-expiry' },
      { name: 'subscription-downgrade' },
      { name: 'refund-processing' },
      { name: 'search-sync' },
      { name: 'notifications' },
    ),
    RefundsModule,
    SubscriptionsModule,
  ],
  providers: [
    RequestExpiryWorker,
    SubscriptionDowngradeWorker,
    SchedulerService,
  ],
  exports: [BullModule],
})
export class JobsModule {}

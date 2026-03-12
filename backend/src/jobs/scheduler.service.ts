import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import Bull from 'bull';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('request-expiry') private requestExpiryQueue: Bull.Queue,
    @InjectQueue('subscription-downgrade') private subscriptionDowngradeQueue: Bull.Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.setupRepeatingJobs();
      this.logger.log('Scheduled jobs configured successfully');
    } catch (err) {
      this.logger.warn(`Scheduled jobs setup failed (Redis may be unavailable): ${(err as Error).message}`);
    }
  }

  private async setupRepeatingJobs() {
    // Clean existing repeatable jobs to avoid duplicates on restart
    const existingExpiry = await this.requestExpiryQueue.getRepeatableJobs();
    for (const job of existingExpiry) {
      await this.requestExpiryQueue.removeRepeatableByKey(job.key);
    }

    const existingDowngrade = await this.subscriptionDowngradeQueue.getRepeatableJobs();
    for (const job of existingDowngrade) {
      await this.subscriptionDowngradeQueue.removeRepeatableByKey(job.key);
    }

    // Schedule request expiry check every 15 minutes
    await this.requestExpiryQueue.add(
      'expire-stale-requests',
      {},
      {
        repeat: { cron: '*/15 * * * *' },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
    this.logger.log('Scheduled: request expiry check every 15 minutes');

    // Schedule subscription downgrade check every hour
    await this.subscriptionDowngradeQueue.add(
      'downgrade-expired',
      {},
      {
        repeat: { cron: '0 * * * *' },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
    this.logger.log('Scheduled: subscription downgrade check every hour');
  }
}

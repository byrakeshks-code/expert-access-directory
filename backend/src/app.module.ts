import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from 'nestjs-pino';

import { envValidationSchema } from './config/env.validation';
import { SupabaseModule } from './config/supabase.module';
import { FirebaseAdminModule } from './config/firebase-admin.module';
import { AppController } from './app.controller';
import { RootController } from './root.controller';
import { GlobalExceptionFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SupabaseAuthGuard } from './common/guards';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExpertsModule } from './modules/experts/experts.module';
import { DomainsModule } from './modules/domains/domains.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RequestsModule } from './modules/requests/requests.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BlockedUsersModule } from './modules/blocked-users/blocked-users.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Redis + BullMQ
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redis: { host: string; port: number; password?: string } = {
          host: configService.get('REDIS_HOST') ?? 'localhost',
          port: configService.get('REDIS_PORT') ?? 6379,
        };
        const password = configService.get<string>('REDIS_PASSWORD');
        if (password) redis.password = password;
        return { redis };
      },
      inject: [ConfigService],
    }),

    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: true,
      },
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Global modules
    SupabaseModule,
    FirebaseAdminModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ExpertsModule,
    DomainsModule,
    PaymentsModule,
    RequestsModule,
    RefundsModule,
    SearchModule,
    NotificationsModule,
    SubscriptionsModule,
    ReviewsModule,
    BlockedUsersModule,
    AuditModule,
    AdminModule,
    EmailModule,
    JobsModule,
  ],
  controllers: [RootController, AppController],
  providers: [
    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Global response transform
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Global audit logging for mutations
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Global auth guard
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    // Global rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

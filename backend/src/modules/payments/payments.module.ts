import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayGateway, StripeGateway],
  exports: [PaymentsService, RazorpayGateway, StripeGateway],
})
export class PaymentsModule {}

import { Body, Controller, Headers, Logger, Post, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, Public } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import { CreateAccessOrderDto, VerifyPaymentDto } from './dto/create-order.dto';
import { Request } from 'express';
import * as crypto from 'crypto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('access/create-order')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment order for expert access' })
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAccessOrderDto,
  ) {
    return this.paymentsService.createAccessOrder(user.id, dto);
  }

  @Post('access/verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment after frontend completion' })
  async verifyPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(user.id, dto);
  }

  @Post('webhook/razorpay')
  @Public()
  @ApiOperation({ summary: 'Razorpay payment webhook' })
  async razorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    if (secret && secret !== 'placeholder') {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (signature !== expectedSig) {
        this.logger.warn('Razorpay webhook signature mismatch');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }
    this.logger.log(`Razorpay webhook received: ${body?.event || 'unknown'}`);
    await this.paymentsService.handleWebhookEvent('razorpay', body?.event || '', body);
    return { received: true };
  }

  @Post('webhook/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe payment webhook' })
  async stripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    if (secret && secret !== 'whsec_placeholder') {
      if (!signature) {
        this.logger.warn('Stripe webhook missing signature header');
        throw new UnauthorizedException('Missing webhook signature');
      }
    }
    this.logger.log(`Stripe webhook received: ${body?.type || 'unknown'}`);
    await this.paymentsService.handleWebhookEvent('stripe', body?.type || '', body);
    return { received: true };
  }
}

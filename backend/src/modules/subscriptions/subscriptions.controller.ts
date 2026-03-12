import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, Public } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  @Get('tiers')
  @Public()
  @ApiOperation({ summary: 'List available subscription tiers with pricing' })
  async listTiers() {
    return this.subscriptionsService.listTiers();
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own active subscription' })
  async getMySubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to Pro or Elite tier' })
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(user.id, dto);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription (effective at period end)' })
  async cancel(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }

  @Post('webhook/razorpay')
  @Public()
  @ApiOperation({ summary: 'Razorpay subscription webhook' })
  async razorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    if (secret && secret !== 'placeholder') {
      const crypto = await import('crypto');
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (signature !== expectedSig) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }
    await this.subscriptionsService.handleWebhookEvent('razorpay', body?.event || '', body);
    return { received: true };
  }

  @Post('webhook/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe subscription webhook' })
  async stripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    if (secret && secret !== 'whsec_placeholder' && !signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    await this.subscriptionsService.handleWebhookEvent('stripe', body?.type || '', body);
    return { received: true };
  }
}

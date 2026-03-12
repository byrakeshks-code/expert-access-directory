import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { PaymentGateway, CreateOrderResult, VerifyPaymentParams } from '../payment-gateway.interface';

@Injectable()
export class StripeGateway implements PaymentGateway {
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

  async createOrder(amountMinor: number, currency: string, metadata?: Record<string, any>): Promise<CreateOrderResult> {
    const params = new URLSearchParams();
    params.append('amount', amountMinor.toString());
    params.append('currency', currency.toLowerCase());
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, String(value));
      });
    }

    const response = await fetch(`${this.baseUrl}/payment_intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: params.toString(),
    });

    const intent = await response.json() as any;

    return {
      gateway: 'stripe',
      order_id: intent.id,
      amount_minor: intent.amount,
      currency: intent.currency,
      client_data: {
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    // Stripe payments are verified via webhooks, this is a fallback check
    const response = await fetch(`${this.baseUrl}/payment_intents/${params.gateway_payment_id}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const intent = await response.json() as any;
    return intent.status === 'succeeded';
  }

  async refund(paymentId: string, amountMinor: number): Promise<{ refund_id: string }> {
    const params = new URLSearchParams();
    params.append('payment_intent', paymentId);
    params.append('amount', amountMinor.toString());

    const response = await fetch(`${this.baseUrl}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: params.toString(),
    });

    const refund = await response.json() as any;
    return { refund_id: refund.id };
  }

  verifyWebhookSignature(payload: string, sigHeader: string): boolean {
    const elements = sigHeader.split(',');
    const timestamp = elements.find((e) => e.startsWith('t='))?.split('=')[1];
    const signature = elements.find((e) => e.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    return expectedSignature === signature;
  }
}

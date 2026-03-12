import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { PaymentGateway, CreateOrderResult, VerifyPaymentParams } from '../payment-gateway.interface';

@Injectable()
export class RazorpayGateway implements PaymentGateway {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(private configService: ConfigService) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
  }

  async createOrder(amountMinor: number, currency: string, metadata?: Record<string, any>): Promise<CreateOrderResult> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: currency.toUpperCase(),
        notes: metadata || {},
      }),
    });

    const order = await response.json() as any;

    return {
      gateway: 'razorpay',
      order_id: order.id,
      amount_minor: order.amount,
      currency: order.currency,
      client_data: {
        key_id: this.keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    const body = `${params.gateway_order_id}|${params.gateway_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === params.gateway_signature;
  }

  async refund(paymentId: string, amountMinor: number): Promise<{ refund_id: string }> {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount: amountMinor }),
    });

    const refund = await response.json() as any;
    return { refund_id: refund.id };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }
}

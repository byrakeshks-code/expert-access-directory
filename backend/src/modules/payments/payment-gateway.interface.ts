export interface CreateOrderResult {
  gateway: 'razorpay' | 'stripe';
  order_id: string;
  amount_minor: number;
  currency: string;
  /** Any extra data the frontend needs to complete the payment */
  client_data: Record<string, any>;
}

export interface VerifyPaymentParams {
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
}

export interface PaymentGateway {
  createOrder(amountMinor: number, currency: string, metadata?: Record<string, any>): Promise<CreateOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  refund(paymentId: string, amountMinor: number): Promise<{ refund_id: string }>;
}

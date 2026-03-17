import { api } from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOrder {
  payment_id: string;
  gateway: 'razorpay' | 'stripe' | 'demo';
  order_id: string;
  amount_minor: number;
  currency: string;
  demo?: boolean;
  client_data?: {
    key_id?: string;
    order_id?: string;
    amount?: number;
    currency?: string;
    client_secret?: string;
    payment_intent_id?: string;
  };
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
}

export async function createPaymentOrder(expertId: string): Promise<PaymentOrder> {
  return api.post<PaymentOrder>('/payments/access/create-order', { expert_id: expertId });
}

export async function openRazorpayCheckout(
  order: PaymentOrder,
  userEmail: string,
  userName: string,
): Promise<{ razorpay_payment_id: string; razorpay_signature: string }> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: order.client_data?.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.client_data?.amount ?? order.amount_minor,
      currency: order.client_data?.currency ?? order.currency,
      order_id: order.client_data?.order_id ?? order.order_id,
      name: 'Loop-Ex',
      description: 'Loop Ex - Expert Access Fee',
      prefill: { email: userEmail, name: userName },
      theme: { color: '#4F46E5' },
      handler: (response: any) => {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}

export async function verifyPayment(
  gatewayOrderId: string,
  gatewayPaymentId: string,
  gatewaySignature: string,
): Promise<any> {
  return api.post('/payments/access/verify', {
    gateway_order_id: gatewayOrderId,
    gateway_payment_id: gatewayPaymentId,
    gateway_signature: gatewaySignature,
  });
}

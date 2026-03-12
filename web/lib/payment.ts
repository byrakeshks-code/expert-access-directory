import { api } from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOrder {
  order_id: string;
  gateway: 'razorpay' | 'stripe';
  amount_minor: number;
  currency: string;
  razorpay_order_id?: string;
  stripe_client_secret?: string;
}

/**
 * Load Razorpay script dynamically
 */
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

/**
 * Create a payment order via the backend
 */
export async function createPaymentOrder(expertId: string): Promise<PaymentOrder> {
  return api.post<PaymentOrder>('/payments/access/create-order', { expert_id: expertId });
}

/**
 * Open Razorpay checkout
 */
export async function openRazorpayCheckout(
  order: PaymentOrder,
  userEmail: string,
  userName: string,
): Promise<{ razorpay_payment_id: string; razorpay_signature: string }> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount_minor,
      currency: order.currency,
      order_id: order.razorpay_order_id,
      name: 'Expert Access Directory',
      description: 'Expert Access Fee',
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

/**
 * Verify payment with backend
 */
export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<any> {
  return api.post('/payments/access/verify', {
    order_id: orderId,
    payment_id: paymentId,
    signature,
  });
}

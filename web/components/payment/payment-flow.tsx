'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowLeft, ArrowRight, CreditCard, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { formatFee } from '@/lib/utils';
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from '@/lib/payment';
import { api } from '@/lib/api';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface PaymentFlowProps {
  expert: {
    id: string;
    full_name: string;
    headline: string;
    access_fee_minor: number;
    access_fee_currency: string;
    avatar_url?: string;
  };
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

type Step = 'confirm' | 'payment' | 'request' | 'done';

export function PaymentFlow({ expert, onClose, onSuccess }: PaymentFlowProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>('confirm');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState('');

  const handlePayment = async () => {
    setError('');
    setIsProcessing(true);
    try {
      const order = await createPaymentOrder(expert.id);
      if (order.gateway === 'razorpay' && order.razorpay_order_id) {
        const result = await openRazorpayCheckout(
          order,
          profile?.email || '',
          profile?.full_name || '',
        );
        await verifyPayment(order.order_id, result.razorpay_payment_id, result.razorpay_signature);
        setPaymentId(result.razorpay_payment_id);
      }
      setStep('request');
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const data = await api.post<any>('/requests', {
        expert_id: expert.id,
        subject,
        message,
      });
      setRequestId(data.id);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setIsProcessing(false);
    }
  };

  const containerClass = isMobile
    ? 'fixed inset-0 z-50 bg-background flex flex-col'
    : 'fixed inset-0 z-50 flex items-center justify-center';

  return (
    <div className={containerClass}>
      {!isMobile && (
        <div className="absolute inset-0 bg-overlay" onClick={step !== 'done' ? onClose : undefined} />
      )}

      <motion.div
        initial={{ opacity: 0, y: isMobile ? 20 : 0, scale: isMobile ? 1 : 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`relative bg-surface-elevated ${isMobile ? 'flex-1 flex flex-col' : 'rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col'}`}
      >
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-6">
          {(['confirm', 'payment', 'request', 'done'] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${
              i <= ['confirm', 'payment', 'request', 'done'].indexOf(step) ? 'bg-primary' : 'bg-border'
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-foreground mb-6">Confirm Access Fee</h2>
                <Card className="!p-4 flex items-center gap-4 mb-6">
                  <Avatar name={expert.full_name} src={expert.avatar_url} size="lg" />
                  <div>
                    <p className="font-semibold text-foreground">{expert.full_name}</p>
                    <p className="text-sm text-muted line-clamp-1">{expert.headline}</p>
                  </div>
                </Card>
                <div className="text-center py-6">
                  <p className="text-sm text-muted mb-1">One-time access fee</p>
                  <p className="text-4xl font-extrabold text-foreground">
                    {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted">
                    <CreditCard className="w-4 h-4" />
                    Secure payment via Razorpay / Stripe
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-foreground mb-6">Processing Payment</h2>
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted">Connecting to payment gateway...</p>
                </div>
              </motion.div>
            )}

            {step === 'request' && (
              <motion.div key="request" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-foreground mb-2">Write Your Request</h2>
                <p className="text-sm text-muted mb-6">Describe what you need help with</p>
                <div className="space-y-4">
                  <Input
                    label="Subject"
                    placeholder="Brief summary of your request"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    hint={`${subject.length}/200 characters`}
                  />
                  <Textarea
                    label="Message"
                    placeholder="Describe your query in detail. The more context you provide, the better the expert can help."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxChars={5000}
                    charCount={message.length}
                    rows={6}
                  />
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  >
                    <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">Request Sent!</h2>
                  <p className="text-muted mt-2 max-w-xs mx-auto">
                    Your request has been sent. Expected response within 72 hours.
                  </p>
                  <p className="text-xs text-subtle mt-3">Request ID: {requestId}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => { setStep('payment'); handlePayment(); }} className="flex-1" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Pay {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
              </Button>
            </>
          )}
          {step === 'payment' && (
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
          )}
          {step === 'request' && (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleSubmitRequest}
                isLoading={isProcessing}
                className="flex-1"
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Send Request
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => onSuccess(requestId)} className="flex-1">
              View Request
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

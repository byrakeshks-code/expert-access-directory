'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Send, Clock, CreditCard, Upload, CheckCircle2, AlertCircle,
  FileText, Image as ImageIcon, MessageSquare, ArrowRight, Shield,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn } from '@/lib/utils';
import { PAYMENT_METHODS, COORDINATION_STEPS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  message_type: string;
  metadata?: Record<string, any>;
  attachment_url?: string;
  created_at: string;
  users?: { full_name: string; avatar_url?: string };
}

interface PaymentCoordinationProps {
  requestId: string;
  requestStatus: string;
  coordinationExpiresAt?: string;
  userPaymentConfirmed?: boolean;
  expertPaymentConfirmed?: boolean;
  isExpertView: boolean;
  onStatusChange?: (newStatus: string) => void;
}

function useCountdown(expiresAt?: string) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining('Expired');
        setExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m remaining`);
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { remaining, expired };
}

export function PaymentCoordination({
  requestId,
  requestStatus,
  coordinationExpiresAt,
  userPaymentConfirmed: initialUserConfirmed,
  expertPaymentConfirmed: initialExpertConfirmed,
  isExpertView,
  onStatusChange,
}: PaymentCoordinationProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment info form (expert)
  const [feeAmount, setFeeAmount] = useState('');
  const [feeCurrency, setFeeCurrency] = useState('INR');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [sharingInfo, setSharingInfo] = useState(false);

  // Receipt upload (user)
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [userConfirmed, setUserConfirmed] = useState(initialUserConfirmed || false);
  const [expertConfirmed, setExpertConfirmed] = useState(initialExpertConfirmed || false);

  const { remaining, expired } = useCountdown(coordinationExpiresAt);
  const isActive = requestStatus === 'payment_coordination' && !expired;
  const isCompleted = ['engaged', 'accepted', 'closed'].includes(requestStatus);
  const [historyOpen, setHistoryOpen] = useState(!isCompleted);

  const hasPaymentDetails = useMemo(
    () => messages.some((m) => m.message_type === 'payment_details'),
    [messages],
  );
  const hasReceipt = useMemo(
    () => messages.some((m) => m.message_type === 'payment_receipt'),
    [messages],
  );

  const currentStep = useMemo(() => {
    if (expertConfirmed && userConfirmed) return 4;
    if (hasReceipt) return 3;
    if (hasPaymentDetails) return 2;
    return 1;
  }, [hasPaymentDetails, hasReceipt, userConfirmed, expertConfirmed]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<Message[]>(`/requests/${requestId}/messages`);
      const arr = Array.isArray(data) ? data : [];
      setMessages(arr);

      const hasUC = arr.some((m) => m.message_type === 'payment_confirmed');
      const hasEC = arr.some((m) => m.message_type === 'receipt_verified');
      if (hasUC) setUserConfirmed(true);
      if (hasEC) setExpertConfirmed(true);
    } catch {}
  }, [requestId]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
    if (isActive) {
      pollRef.current = setInterval(fetchMessages, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, isActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text message send
  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/requests/${requestId}/messages`, { body: newMsg.trim() });
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
    } catch {} finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Expert shares payment info
  const handleSharePaymentInfo = async () => {
    if (!feeAmount || !paymentDetails.trim()) return;
    setSharingInfo(true);
    try {
      const msg = await api.post<Message>(`/requests/${requestId}/share-payment-info`, {
        fee_amount: parseFloat(feeAmount),
        fee_currency: feeCurrency,
        payment_method: paymentMethod,
        payment_details: paymentDetails.trim(),
        note: paymentNote.trim() || undefined,
      });
      setMessages((prev) => [...prev, msg]);
    } catch {} finally { setSharingInfo(false); }
  };

  // User uploads receipt
  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const msg = await api.upload<Message>(`/requests/${requestId}/upload-receipt`, formData);
      setMessages((prev) => [...prev, msg]);
    } catch {} finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // User confirms payment
  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      await api.post(`/requests/${requestId}/confirm-payment`, {});
      setUserConfirmed(true);
      await fetchMessages();
    } catch {} finally { setConfirming(false); }
  };

  // Expert verifies receipt
  const handleVerifyPayment = async () => {
    setVerifying(true);
    try {
      const result = await api.post<any>(`/requests/${requestId}/verify-payment`, {});
      setExpertConfirmed(true);
      if (result?.status === 'engaged') {
        onStatusChange?.('engaged');
      }
      await fetchMessages();
    } catch {} finally { setVerifying(false); }
  };

  // Render a special message card for payment_details
  const renderPaymentDetailsCard = (msg: Message) => {
    const meta = msg.metadata || {};
    return (
      <div className="bg-surface-elevated border border-border rounded-xl p-4 space-y-2 max-w-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CreditCard className="w-4 h-4 text-primary" />
          Payment Details
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Amount</span>
            <span className="font-medium text-foreground">{meta.fee_currency} {meta.fee_amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Method</span>
            <span className="font-medium text-foreground capitalize">{(meta.payment_method || '').replace('_', ' ')}</span>
          </div>
          <div className="pt-1 border-t border-border">
            <span className="text-muted text-xs">Payment Details</span>
            <p className="text-foreground font-mono text-sm mt-0.5 break-all">{meta.payment_details}</p>
          </div>
        </div>
      </div>
    );
  };

  // Render receipt message
  const renderReceiptMessage = (msg: Message) => (
    <div className="bg-surface-elevated border border-border rounded-xl p-3 max-w-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
        <FileText className="w-4 h-4 text-info" />
        Payment Receipt
      </div>
      {msg.attachment_url && (
        /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_url) ? (
          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.attachment_url}
              alt="Payment receipt"
              className="rounded-lg max-h-48 w-full object-cover border border-border"
            />
          </a>
        ) : (
          <a
            href={msg.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="w-4 h-4" /> View Receipt
          </a>
        )
      )}
    </div>
  );

  // Render system message
  const renderSystemMessage = (msg: Message) => (
    <div className="flex justify-center py-1">
      <span className="text-xs text-muted bg-surface-elevated px-3 py-1.5 rounded-full">
        {msg.body}
      </span>
    </div>
  );

  // Render confirmation messages
  const renderConfirmationMessage = (msg: Message, icon: React.ReactNode, color: string) => (
    <div className="flex justify-center py-1">
      <span className={cn('inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full', color)}>
        {icon} {msg.body}
      </span>
    </div>
  );

  return (
    <Card className="overflow-hidden !p-0">
      {/* Header with stepper */}
      <div
        className={cn('px-4 py-3 border-b border-border bg-surface space-y-3', isCompleted && 'cursor-pointer hover:bg-surface-elevated transition-colors')}
        onClick={isCompleted ? () => setHistoryOpen((v) => !v) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <Shield className="w-4 h-4 text-warning" />
            )}
            <h3 className="text-sm font-semibold text-foreground">
              {isCompleted ? 'Payment History' : 'Payment Coordination'}
            </h3>
            {isCompleted && (
              <Badge className="bg-success-light text-success text-[10px]">Completed</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {remaining && !isCompleted && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                expired ? 'bg-error-light text-error' : 'bg-warning-light text-warning',
              )}>
                <Clock className="w-3 h-3" /> {remaining}
              </span>
            )}
            {isCompleted && (
              <ChevronDown className={cn('w-4 h-4 text-muted transition-transform', historyOpen && 'rotate-180')} />
            )}
          </div>
        </div>

        {/* Progress stepper — hide when completed and collapsed */}
        {(!isCompleted || historyOpen) && (
          <div className="flex items-center gap-1">
            {COORDINATION_STEPS.map((step, i) => {
              const isStepComplete = i + 1 < currentStep;
              const isCurrent = i + 1 === currentStep;
              return (
                <div key={step.key} className="flex items-center gap-1 flex-1">
                  <div className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0',
                    isStepComplete ? 'bg-success text-white' :
                    isCurrent ? 'bg-primary text-white' :
                    'bg-surface-elevated text-muted',
                  )}>
                    {isStepComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-[10px] leading-tight truncate hidden sm:block',
                    isStepComplete || isCurrent ? 'text-foreground font-medium' : 'text-muted',
                  )}>
                    {step.label}
                  </span>
                  {i < COORDINATION_STEPS.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages area — collapsible when completed */}
      {historyOpen && (
      <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-3 bg-background">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted py-8">
            {isExpertView
              ? 'Share your payment details to get started.'
              : 'Waiting for the expert to share payment details...'}
          </p>
        ) : (
          messages.map((msg, idx) => {
            const key = msg.id || `msg-${idx}`;
            if (msg.message_type === 'system') return <div key={key}>{renderSystemMessage(msg)}</div>;
            if (msg.message_type === 'payment_confirmed') {
              return <div key={key}>{renderConfirmationMessage(msg, <CheckCircle2 className="w-3 h-3" />, 'bg-info-light text-info')}</div>;
            }
            if (msg.message_type === 'receipt_verified') {
              return <div key={key}>{renderConfirmationMessage(msg, <CheckCircle2 className="w-3 h-3" />, 'bg-success-light text-success')}</div>;
            }

            const isMe = msg.sender_id === profile?.id;
            return (
              <div key={key} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : '')}>
                <Avatar
                  name={msg.users?.full_name || 'User'}
                  src={msg.users?.avatar_url}
                  size="sm"
                  className="flex-shrink-0 mt-1"
                />
                <div className={cn('max-w-[80%] min-w-0', isMe ? 'items-end' : '')}>
                  {msg.message_type === 'payment_details' ? (
                    renderPaymentDetailsCard(msg)
                  ) : msg.message_type === 'payment_receipt' ? (
                    renderReceiptMessage(msg)
                  ) : (
                    <div
                      className={cn(
                        'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line break-words',
                        isMe
                          ? 'bg-primary text-white rounded-tr-md'
                          : 'bg-surface-elevated text-foreground rounded-tl-md',
                      )}
                    >
                      {msg.body}
                    </div>
                  )}
                  <p className={cn('text-[10px] text-subtle mt-1 px-1', isMe ? 'text-right' : '')}>
                    {msg.users?.full_name} · {formatDate(msg.created_at, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      )}

      {/* Action panels — context-dependent */}
      {isActive && (
        <div className="border-t border-border bg-surface">
          {/* Expert: Payment info form (show only if not yet shared) */}
          {isExpertView && !hasPaymentDetails && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">Share Payment Details</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Fee Amount"
                  type="number"
                  placeholder="e.g., 2000"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                />
                <Input
                  label="Currency"
                  value={feeCurrency}
                  onChange={(e) => setFeeCurrency(e.target.value)}
                  placeholder="INR"
                />
              </div>
              <Select
                label="Payment Method"
                options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <Textarea
                label={paymentMethod === 'upi' ? 'UPI ID' : 'Bank Account Details'}
                placeholder={paymentMethod === 'upi' ? 'your@upi' : 'Account number, IFSC, name...'}
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                rows={2}
              />
              <Input
                label="Note (optional)"
                placeholder="Any additional instructions..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
              <Button
                onClick={handleSharePaymentInfo}
                isLoading={sharingInfo}
                disabled={!feeAmount || !paymentDetails.trim()}
                leftIcon={<CreditCard className="w-4 h-4" />}
                className="w-full"
              >
                Share Payment Details
              </Button>
            </div>
          )}

          {/* Expert: Verify receipt (show if receipt uploaded and not yet verified) */}
          {isExpertView && hasReceipt && !expertConfirmed && (
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-info flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Payment receipt uploaded</p>
                <p className="text-xs text-muted">Review the receipt above and confirm if payment received.</p>
              </div>
              <Button
                size="sm"
                onClick={handleVerifyPayment}
                isLoading={verifying}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Receipt
              </Button>
            </div>
          )}

          {/* User: Upload receipt + confirm (show after payment details shared) */}
          {!isExpertView && hasPaymentDetails && !userConfirmed && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleUploadReceipt}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={uploading}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      {hasReceipt ? 'Upload Another Receipt' : 'Upload Receipt'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmPayment}
                      isLoading={confirming}
                      disabled={!hasReceipt}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Payment Completed
                    </Button>
                  </div>
                  {!hasReceipt && (
                    <p className="text-xs text-muted">Upload your payment receipt first, then confirm.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Waiting states */}
          {isExpertView && hasPaymentDetails && !hasReceipt && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted">
              <Clock className="w-4 h-4" /> Waiting for user to make payment and upload receipt...
            </div>
          )}

          {!isExpertView && !hasPaymentDetails && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted">
              <Clock className="w-4 h-4" /> Waiting for expert to share payment details...
            </div>
          )}

          {/* Both confirmed indicators */}
          {userConfirmed && !expertConfirmed && !isExpertView && (
            <div className="p-4 flex items-center gap-2 text-sm text-info">
              <Clock className="w-4 h-4" /> You have confirmed payment. Waiting for expert verification...
            </div>
          )}

          {expertConfirmed && !userConfirmed && isExpertView && (
            <div className="p-4 flex items-center gap-2 text-sm text-info">
              <Clock className="w-4 h-4" /> You verified the receipt. Waiting for user to confirm payment...
            </div>
          )}

          {/* Text message input — always available during coordination */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-border">
            <textarea
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message for clarification..."
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none max-h-24 overflow-y-auto"
            />
            <Button
              size="sm"
              onClick={handleSend}
              isLoading={sending}
              disabled={!newMsg.trim()}
              className="h-9 w-9 !p-0 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expired / completed states */}
      {expired && requestStatus === 'payment_coordination' && (
        <div className="px-4 py-3 border-t border-border bg-error-light text-center">
          <p className="text-xs text-error font-medium">Payment coordination window has expired.</p>
        </div>
      )}

      {requestStatus === 'coordination_expired' && (
        <div className="px-4 py-3 border-t border-border bg-surface text-center">
          <p className="text-xs text-muted">This payment coordination has expired.</p>
        </div>
      )}

      {(requestStatus === 'engaged' || (userConfirmed && expertConfirmed)) && (
        <div className="px-4 py-3 border-t border-border bg-success-light text-center">
          <p className="text-xs text-success font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Engagement activated! Full communication is now unlocked.
          </p>
        </div>
      )}
    </Card>
  );
}

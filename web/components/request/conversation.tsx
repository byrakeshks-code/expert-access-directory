'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Lock, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  users?: { full_name: string; avatar_url?: string };
}

interface ConversationProps {
  requestId: string;
  requestStatus: string;
  /** Can this viewer close the conversation? (expert or admin) */
  canClose?: boolean;
  onClose?: () => void;
}

export function Conversation({ requestId, requestStatus, canClose, onClose }: ConversationProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOpen = requestStatus === 'engaged' || requestStatus === 'accepted';
  const isClosed = requestStatus === 'closed';
  const showChat = isOpen || isClosed;

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<Message[]>(`/requests/${requestId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch {}
  }, [requestId]);

  useEffect(() => {
    if (!showChat) { setLoading(false); return; }
    fetchMessages().finally(() => setLoading(false));

    // Poll every 8 seconds for new messages while conversation is open
    if (isOpen) {
      pollRef.current = setInterval(fetchMessages, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, showChat, isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/requests/${requestId}/messages`, { body: newMsg.trim() });
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
    } catch {} finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await api.post(`/requests/${requestId}/close`);
      onClose?.();
    } catch {} finally {
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!showChat) return null;

  return (
    <Card className="overflow-hidden !p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-xs text-muted bg-surface-elevated px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Closed
            </span>
          )}
        </div>
        {canClose && isOpen && (
          <Button size="sm" variant="ghost" onClick={handleClose} isLoading={closing} className="text-error hover:text-error">
            Close Conversation
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-3 bg-background">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted py-8">
            {isOpen ? 'No messages yet. Start the conversation!' : 'No messages were exchanged.'}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : '')}>
                <Avatar
                  name={msg.users?.full_name || 'User'}
                  src={msg.users?.avatar_url}
                  size="sm"
                  className="flex-shrink-0 mt-1"
                />
                <div className={cn('max-w-[75%] min-w-0', isMe ? 'items-end' : '')}>
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

      {/* Input */}
      {isOpen && (
        <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-surface">
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
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
      )}

      {isClosed && (
        <div className="px-4 py-3 border-t border-border bg-surface text-center">
          <p className="text-xs text-muted">This conversation has been closed by the expert.</p>
        </div>
      )}
    </Card>
  );
}

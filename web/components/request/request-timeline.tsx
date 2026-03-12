'use client';

import { CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface TimelineStep {
  label: string;
  status: 'completed' | 'active' | 'upcoming';
  timestamp?: string;
}

interface RequestTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function RequestTimeline({ steps, className }: RequestTimelineProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            {step.status === 'completed' ? (
              <CheckCircle className="w-6 h-6 text-success" />
            ) : step.status === 'active' ? (
              <div className="relative">
                <Clock className="w-6 h-6 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              </div>
            ) : (
              <Circle className="w-6 h-6 text-border" />
            )}
            <span className={cn(
              'text-[10px] mt-1 text-center whitespace-nowrap',
              step.status === 'completed' ? 'text-success font-medium' :
              step.status === 'active' ? 'text-primary font-medium' : 'text-muted',
            )}>
              {step.label}
            </span>
            {step.timestamp && (
              <span className="text-[9px] text-subtle">{formatDate(step.timestamp)}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-1',
              step.status === 'completed' ? 'bg-success' : 'bg-border',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

const RESOLVED_STATUSES = ['accepted', 'payment_coordination', 'engaged', 'rejected', 'expired', 'cancelled', 'closed', 'coordination_expired'];

export function buildTimelineSteps(request: any): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const status = request.status;

  steps.push({
    label: 'Paid',
    status: 'completed',
    timestamp: request.created_at,
  });

  steps.push({
    label: 'Sent',
    status: RESOLVED_STATUSES.includes(status) || status === 'sent' ? 'completed' : status === 'pending' ? 'active' : 'upcoming',
    timestamp: request.sent_at,
  });

  steps.push({
    label: 'Awaiting',
    status: status === 'sent' ? 'active' : RESOLVED_STATUSES.includes(status) ? 'completed' : 'upcoming',
  });

  if (['payment_coordination', 'engaged', 'closed', 'coordination_expired'].includes(status)) {
    steps.push({
      label: status === 'payment_coordination' ? 'Coordination' :
        status === 'engaged' ? 'Engaged' :
        status === 'closed' ? 'Closed' :
        'Coord. Expired',
      status: status === 'payment_coordination' ? 'active' : 'completed',
    });
  } else {
    const finalLabel = status === 'accepted' ? 'Accepted' :
      status === 'rejected' ? 'Rejected' :
      status === 'expired' ? 'Expired' :
      status === 'cancelled' ? 'Cancelled' : 'Resolved';

    steps.push({
      label: finalLabel,
      status: RESOLVED_STATUSES.includes(status) ? 'completed' : 'upcoming',
      timestamp: request.responded_at || request.cancelled_at || request.expired_at,
    });
  }

  return steps;
}

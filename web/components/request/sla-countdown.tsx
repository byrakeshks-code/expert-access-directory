'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLACountdownProps {
  expiresAt: string;
  className?: string;
}

export function SLACountdown({ expiresAt, className }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m remaining`);
      setIsUrgent(hours < 12);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
      isExpired ? 'bg-error-light text-error' :
      isUrgent ? 'bg-warning-light text-warning' :
      'bg-info-light text-info',
      className,
    )}>
      <Clock className="w-4 h-4" />
      {timeLeft}
    </div>
  );
}

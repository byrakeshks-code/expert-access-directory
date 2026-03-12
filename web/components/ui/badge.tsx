'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-surface text-muted',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
  info: 'bg-info-light text-info',
  outline: 'border border-border text-muted bg-transparent',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface TierBadgeProps {
  tier: 'starter' | 'pro' | 'elite';
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const styles = {
    starter: 'bg-tier-starter-bg text-tier-starter',
    pro: 'bg-tier-pro-bg text-tier-pro',
    elite: 'bg-tier-elite-bg text-tier-elite',
  };

  const labels = { starter: 'Starter', pro: 'Pro', elite: 'Elite' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full',
        styles[tier],
        className,
      )}
    >
      {labels[tier]}
    </span>
  );
}

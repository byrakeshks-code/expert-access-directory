'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-elevated border border-border rounded-2xl p-6 transition-all duration-200',
        hover && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function GlassCard({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6',
        'shadow-lg transition-all duration-200',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('flex items-start gap-4', className)}>
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {trend && (
          <p className={cn('text-xs font-medium mt-1', trend.isPositive ? 'text-success' : 'text-error')}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </p>
        )}
      </div>
    </Card>
  );
}

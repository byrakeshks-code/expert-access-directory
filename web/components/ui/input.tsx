'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-2.5 text-sm text-foreground bg-background',
              'border border-border rounded-xl transition-all duration-200',
              'placeholder:text-subtle',
              'hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[44px]',
              leftIcon ? 'pl-10' : undefined,
              rightIcon ? 'pr-10' : undefined,
              error ? 'border-error focus:border-error focus:ring-error/20' : undefined,
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charCount?: number;
  maxChars?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, charCount, maxChars, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              {label}
            </label>
            {maxChars !== undefined && (
              <span className={cn('text-xs', (charCount ?? 0) > maxChars ? 'text-error' : 'text-muted')}>
                {charCount ?? 0}/{maxChars}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 text-sm text-foreground bg-background',
            'border border-border rounded-xl transition-all duration-200',
            'placeholder:text-subtle resize-y min-h-[100px]',
            'hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error focus:border-error focus:ring-error/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="text-muted hover:text-foreground transition-colors focus:outline-none"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 text-sm text-foreground bg-background',
            'border border-border rounded-xl transition-all duration-200',
            'hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[44px] appearance-none cursor-pointer',
            error && 'border-error focus:border-error focus:ring-error/20',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

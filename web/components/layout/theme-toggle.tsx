'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme('system');
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleChange = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-surface rounded-xl">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={cn(
            'p-2 rounded-lg transition-all',
            theme === value
              ? 'bg-surface-elevated text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
  className?: string;
}

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel = (v) => String(v),
  className,
}: RangeSliderProps) {
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPercent = useCallback((v: number) => ((v - min) / (max - min)) * 100, [min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), value[1] - step);
    onChange([newMin, value[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), value[0] + step);
    onChange([value[0], newMax]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{formatLabel(value[0])}</span>
        <span className="text-muted">{formatLabel(value[1])}</span>
      </div>
      <div ref={trackRef} className="relative h-2">
        <div className="absolute inset-0 bg-border-light rounded-full" />
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{
            left: `${getPercent(value[0])}%`,
            width: `${getPercent(value[1]) - getPercent(value[0])}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleMinChange}
          onMouseDown={() => setDragging('min')}
          onMouseUp={() => setDragging(null)}
          onTouchStart={() => setDragging('min')}
          onTouchEnd={() => setDragging(null)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: dragging === 'min' ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={handleMaxChange}
          onMouseDown={() => setDragging('max')}
          onMouseUp={() => setDragging(null)}
          onTouchStart={() => setDragging('max')}
          onTouchEnd={() => setDragging(null)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: dragging === 'max' ? 5 : 4 }}
        />
        {/* Visual thumbs */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-primary shadow-md',
            'transition-transform',
            dragging === 'min' && 'scale-125',
          )}
          style={{ left: `${getPercent(value[0])}%`, zIndex: 6, pointerEvents: 'none' }}
        />
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-primary shadow-md',
            'transition-transform',
            dragging === 'max' && 'scale-125',
          )}
          style={{ left: `${getPercent(value[1])}%`, zIndex: 6, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}

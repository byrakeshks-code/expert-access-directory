'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  height?: 'auto' | 'full' | 'half';
}

export function BottomSheet({ open, onClose, title, children, className, height = 'auto' }: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const heightClass = {
    auto: 'max-h-[85vh]',
    full: 'h-[95vh]',
    half: 'h-[50vh]',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'absolute bottom-0 left-0 right-0 bg-surface-elevated rounded-t-3xl shadow-2xl flex flex-col',
              heightClass[height],
              className,
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {title && (
              <div className="px-6 pb-3 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

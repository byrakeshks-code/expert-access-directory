'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  showNotes?: boolean;
  notesLabel?: string;
  notesPlaceholder?: string;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void> | void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  showNotes = false,
  notesLabel = 'Notes',
  notesPlaceholder = 'Optional notes...',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(showNotes ? notes : undefined);
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">{message}</p>

          {showNotes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {notesLabel}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notesPlaceholder}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

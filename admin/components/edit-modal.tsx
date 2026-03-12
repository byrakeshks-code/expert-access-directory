'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Eye, EyeOff, Upload, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'toggle' | 'readonly' | 'password' | 'image' | 'tags';
  options?: { value: string; label: string }[];
  asyncOptions?: () => Promise<{ value: string; label: string }[]>;
  /** For tags type: async function to fetch tag suggestions */
  asyncSuggestions?: () => Promise<string[]>;
  placeholder?: string;
  required?: boolean;
  help?: string;
  /** For image type: which storage bucket to upload to */
  bucket?: string;
  /** For image type: folder within the bucket */
  folder?: string;
}

interface EditModalProps {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initialValues: Record<string, any>;
  onClose: () => void;
  onSave: (values: Record<string, any>) => Promise<void> | void;
  saveLabel?: string;
  children?: React.ReactNode;
}

function PasswordField({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Enter password'}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ImageField({
  value,
  onChange,
  bucket = 'media',
  folder,
}: {
  value: string;
  onChange: (v: string) => void;
  bucket?: string;
  folder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (folder) formData.append('folder', folder);
      const res = await api.upload<any>('/admin/media/upload', formData);
      const url = res?.data?.url || res?.url || '';
      if (url) onChange(url);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="w-20 h-20 rounded-lg object-cover border border-gray-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      {/* URL input + Upload */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or upload..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 flex-shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? '...' : 'Upload'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}

function TagsField({
  value,
  onChange,
  asyncSuggestions,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  asyncSuggestions?: () => Promise<string[]>;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asyncSuggestions) {
      asyncSuggestions().then(setSuggestions).catch(() => {});
    }
  }, [asyncSuggestions]);

  const tags = Array.isArray(value) ? value : [];

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions
    .filter((s) => !tags.includes(s) && s.includes(input.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      {/* Tag chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Input with suggestions */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder || 'Type a tag and press Enter...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AsyncSelect({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [opts, setOpts] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (field.asyncOptions) {
      field.asyncOptions().then((result) => {
        if (!cancelled) {
          setOpts(result);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    }
    return () => { cancelled = true; };
  }, [field]);

  if (loading) {
    return (
      <select disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400">
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
    >
      <option value="">Select...</option>
      {opts.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function EditModal({
  open,
  title,
  fields,
  initialValues,
  onClose,
  onSave,
  saveLabel,
  children,
}: EditModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setValues({ ...initialValues });
      setError(null);
    }
  }, [open, initialValues]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap: keep focus inside the dialog
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open]);

  if (!open) return null;

  const handleChange = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Save failed. Please try again.';
      setError(msg);
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>

                {f.type === 'readonly' && (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono">
                    {String(values[f.key] ?? '—')}
                  </p>
                )}

                {f.type === 'text' && (
                  <input
                    type="text"
                    value={values[f.key] ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                )}

                {f.type === 'password' && (
                  <PasswordField
                    value={values[f.key] ?? ''}
                    onChange={(v) => handleChange(f.key, v)}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}

                {f.type === 'number' && (
                  <input
                    type="number"
                    value={values[f.key] ?? ''}
                    onChange={(e) =>
                      handleChange(f.key, e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                )}

                {f.type === 'select' && f.asyncOptions && (
                  <AsyncSelect field={f} value={values[f.key]} onChange={(v) => handleChange(f.key, v)} />
                )}

                {f.type === 'select' && !f.asyncOptions && (
                  <select
                    value={values[f.key] ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    required={f.required}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Select...</option>
                    {f.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {f.type === 'textarea' && (
                  <textarea
                    value={values[f.key] ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
                  />
                )}

                {f.type === 'image' && (
                  <ImageField
                    value={values[f.key] ?? ''}
                    onChange={(v) => handleChange(f.key, v)}
                    bucket={f.bucket}
                    folder={f.folder}
                  />
                )}

                {f.type === 'tags' && (
                  <TagsField
                    value={values[f.key] ?? []}
                    onChange={(v) => handleChange(f.key, v)}
                    asyncSuggestions={f.asyncSuggestions}
                    placeholder={f.placeholder}
                  />
                )}

                {f.type === 'toggle' && (
                  <button
                    type="button"
                    onClick={() => handleChange(f.key, !values[f.key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      values[f.key] ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        values[f.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}

                {f.help && (
                  <p className="text-xs text-gray-400 mt-1">{f.help}</p>
                )}
              </div>
            ))}

            {children}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mb-0 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : (saveLabel || 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Format fee amount to display currency string
 * e.g., formatFee(2499, 'INR') -> "₹2,499"
 */
export function formatFee(amount: number, currency: string = 'INR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Format date to locale string
 */
export function formatDate(dateStr: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function timeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Combine class names, filtering out falsy values
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate initials from a full name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Safely extract an array from an API response.
 * Handles: [...], { data: [...] }, { data: { data: [...] } }, or fallback to [].
 */
export function toArray<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
  }
  return [];
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

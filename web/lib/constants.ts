export const STATUS_COLORS = {
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending' },
  sent: { bg: 'bg-info-light', text: 'text-info', label: 'Sent' },
  accepted: { bg: 'bg-success-light', text: 'text-success', label: 'Accepted' },
  payment_coordination: { bg: 'bg-warning-light', text: 'text-warning', label: 'Payment Coordination' },
  engaged: { bg: 'bg-success-light', text: 'text-success', label: 'Engaged' },
  coordination_expired: { bg: 'bg-surface', text: 'text-muted', label: 'Coordination Expired' },
  rejected: { bg: 'bg-error-light', text: 'text-error', label: 'Rejected' },
  expired: { bg: 'bg-surface', text: 'text-muted', label: 'Expired' },
  cancelled: { bg: 'bg-surface', text: 'text-subtle', label: 'Cancelled' },
  closed: { bg: 'bg-surface', text: 'text-muted', label: 'Closed' },
  paid: { bg: 'bg-success-light', text: 'text-success', label: 'Paid' },
  failed: { bg: 'bg-error-light', text: 'text-error', label: 'Failed' },
  refunded: { bg: 'bg-info-light', text: 'text-info', label: 'Refunded' },
} as const;

export const VERIFICATION_STATUS_COLORS = {
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending' },
  under_review: { bg: 'bg-info-light', text: 'text-info', label: 'Under Review' },
  verified: { bg: 'bg-success-light', text: 'text-success', label: 'Verified' },
  rejected: { bg: 'bg-error-light', text: 'text-error', label: 'Rejected' },
} as const;

export const TIER_COLORS = {
  starter: { bg: 'bg-tier-starter-bg', text: 'text-tier-starter', label: 'Starter' },
  pro: { bg: 'bg-tier-pro-bg', text: 'text-tier-pro', label: 'Pro' },
  elite: { bg: 'bg-tier-elite-bg', text: 'text-tier-elite', label: 'Elite' },
} as const;

export const INTERACTION_MODES = [
  { value: 'video_call', label: 'Video Call' },
  { value: 'voice_call', label: 'Voice Call' },
  { value: 'chat', label: 'Chat' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In Person' },
] as const;

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'fee_asc', label: 'Fee: Low to High' },
  { value: 'fee_desc', label: 'Fee: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'response_time', label: 'Fastest Response' },
] as const;

export const REQUEST_TIMELINE_STEPS = [
  { status: 'paid', label: 'Paid' },
  { status: 'sent', label: 'Sent' },
  { status: 'waiting', label: 'Awaiting Response' },
  { status: 'resolved', label: 'Resolved' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const;

export const COORDINATION_STEPS = [
  { key: 'accepted', label: 'Expert Accepted' },
  { key: 'payment_details', label: 'Payment Details Shared' },
  { key: 'receipt_uploaded', label: 'Receipt Uploaded' },
  { key: 'verified', label: 'Payment Verified' },
] as const;

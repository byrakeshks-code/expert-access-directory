const statusColors: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  accepted: 'bg-green-100 text-green-700',
  processed: 'bg-green-100 text-green-700',
  engaged: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  payment_coordination: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  requested: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  coordination_expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
};

export function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

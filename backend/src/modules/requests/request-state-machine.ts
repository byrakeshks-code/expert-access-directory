/**
 * Access Request State Machine
 *
 * PENDING → SENT (payment confirmed)
 * SENT → PAYMENT_COORDINATION (expert accepts)
 * SENT → REJECTED (expert rejects)
 * SENT → EXPIRED (SLA timeout)
 * PENDING | SENT → CANCELLED (user cancels)
 * PAYMENT_COORDINATION → ENGAGED (both parties confirm payment)
 * PAYMENT_COORDINATION → COORDINATION_EXPIRED (48h timeout)
 * PAYMENT_COORDINATION → CANCELLED (user cancels)
 * ENGAGED → CLOSED (expert/admin closes)
 *
 * Legacy: accepted → closed kept for backward compat with existing data
 */

const validTransitions: Record<string, string[]> = {
  pending: ['sent', 'cancelled'],
  sent: ['payment_coordination', 'rejected', 'expired', 'cancelled'],
  payment_coordination: ['engaged', 'coordination_expired', 'cancelled'],
  engaged: ['closed'],
  accepted: ['closed'],
};

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = validTransitions[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

export function getExpiryDate(hoursFromNow: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

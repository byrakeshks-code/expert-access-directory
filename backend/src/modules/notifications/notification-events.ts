/**
 * Notification event definitions — maps event types to templates.
 */
export enum NotificationEvent {
  REQUEST_SENT = 'request.sent',
  REQUEST_ACCEPTED = 'request.accepted',
  REQUEST_REJECTED = 'request.rejected',
  REQUEST_EXPIRED = 'request.expired',
  REQUEST_CANCELLED = 'request.cancelled',
  REFUND_PROCESSED = 'refund.processed',
  EXPERT_VERIFIED = 'expert.verified',
  REVIEW_RECEIVED = 'review.received',
  SUBSCRIPTION_ACTIVATED = 'subscription.activated',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_FAILED = 'subscription.failed',
  SUBSCRIPTION_DOWNGRADED = 'subscription.downgraded',
}

export interface NotificationPayload {
  event: NotificationEvent;
  userId: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  channels: ('in_app' | 'email' | 'push')[];
}

/**
 * Template functions for notification content.
 */
export function getNotificationContent(
  event: NotificationEvent,
  data: Record<string, any>,
): { title: string; body: string; actionUrl?: string } {
  switch (event) {
    case NotificationEvent.REQUEST_SENT:
      return {
        title: 'Request sent',
        body: `Your access request to ${data.expertName} has been sent.`,
        actionUrl: `/requests/${data.requestId}`,
      };
    case NotificationEvent.REQUEST_ACCEPTED:
      return {
        title: 'Request accepted',
        body: `${data.expertName} has accepted your request. View their terms.`,
        actionUrl: `/requests/${data.requestId}`,
      };
    case NotificationEvent.REQUEST_REJECTED:
      return {
        title: 'Request declined',
        body: `${data.expertName} has declined your request. A refund has been initiated.`,
        actionUrl: `/requests/${data.requestId}`,
      };
    case NotificationEvent.REQUEST_EXPIRED:
      return {
        title: 'Request expired',
        body: `Your request to ${data.expertName} has expired without a response.`,
        actionUrl: `/requests/${data.requestId}`,
      };
    case NotificationEvent.REFUND_PROCESSED:
      return {
        title: 'Refund processed',
        body: `Your refund of ${data.amount} has been processed to your original payment method.`,
      };
    case NotificationEvent.EXPERT_VERIFIED:
      return {
        title: 'Profile verified',
        body: 'Congratulations! Your expert profile is now live and visible in search.',
        actionUrl: '/expert/dashboard',
      };
    case NotificationEvent.REVIEW_RECEIVED:
      return {
        title: 'New review',
        body: `You received a ${data.rating}-star review.`,
        actionUrl: '/expert/reviews',
      };
    case NotificationEvent.SUBSCRIPTION_ACTIVATED:
      return {
        title: `Welcome to ${data.tierName}`,
        body: `Your ${data.tierName} subscription is now active. Enjoy enhanced visibility!`,
        actionUrl: '/expert/subscription',
      };
    default:
      return { title: 'Notification', body: 'You have a new notification.' };
  }
}

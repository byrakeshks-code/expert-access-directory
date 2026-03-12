import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import type { NotificationPayload } from './notification-events';
import { PaginationDto } from '../../common/dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  /**
   * Send a notification — inserts in-app record and queues email/push.
   */
  async send(payload: NotificationPayload) {
    try {
      // Always create in-app notification
      if (payload.channels.includes('in_app')) {
        await this.db.from('notifications').insert({
          user_id: payload.userId,
          channel: 'in_app',
          title: payload.title,
          body: payload.body,
          action_url: payload.actionUrl,
          metadata: payload.metadata,
        });
      }

      // Email and push would be dispatched via BullMQ queue
      if (payload.channels.includes('email')) {
        this.logger.log(`[EMAIL] To: ${payload.userId} | ${payload.title}`);
        // In production: queue to BullMQ 'notifications' queue with type: 'email'
      }

      if (payload.channels.includes('push')) {
        this.logger.log(`[PUSH] To: ${payload.userId} | ${payload.title}`);
        // In production: queue to BullMQ 'notifications' queue with type: 'push'
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to send notification');
    }
  }

  async listNotifications(userId: string, pagination: PaginationDto, unreadOnly?: boolean) {
    try {
      let query = this.db
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 20) - 1);

      if (error) throw new InternalServerErrorException(error.message);

      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to list notifications');
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const { data, error } = await this.db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw new InternalServerErrorException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to mark notification as read');
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const { error } = await this.db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw new InternalServerErrorException(error.message);
      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to mark all notifications as read');
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await this.db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw new InternalServerErrorException(error.message);
      return { count: count || 0 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to get unread count');
    }
  }
}

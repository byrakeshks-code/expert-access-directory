import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent, getNotificationContent } from '../notifications/notification-events';

@Injectable()
export class ReviewsService {
  constructor(
    private supabaseService: SupabaseService,
    private notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    try {
      // Verify the request exists and belongs to this user
      const { data: request } = await this.db
        .from('access_requests')
        .select('id, user_id, expert_id, status')
        .eq('id', dto.request_id)
        .eq('user_id', userId)
        .single();

      if (!request) throw new NotFoundException('Request not found');
      if (request.status !== 'accepted') {
        throw new BadRequestException('Can only review accepted requests');
      }

      // Check for existing review
      const { data: existing } = await this.db
        .from('reviews')
        .select('id')
        .eq('request_id', dto.request_id)
        .single();

      if (existing) throw new ConflictException('Review already exists for this request');

      const { data, error } = await this.db
        .from('reviews')
        .insert({
          request_id: dto.request_id,
          user_id: userId,
          expert_id: request.expert_id,
          rating: dto.rating,
          comment: dto.comment,
        })
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);

      // Notify expert: new review received
      const { data: expert } = await this.db
        .from('experts')
        .select('user_id')
        .eq('id', request.expert_id)
        .single();

      if (expert) {
        const reviewContent = getNotificationContent(NotificationEvent.REVIEW_RECEIVED, {
          rating: dto.rating,
        });
        this.notificationsService.send({
          event: NotificationEvent.REVIEW_RECEIVED,
          userId: expert.user_id,
          title: reviewContent.title,
          body: reviewContent.body,
          actionUrl: reviewContent.actionUrl,
          channels: ['in_app'],
        }).catch(() => {});
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create review');
    }
  }

  async flagReview(userId: string, reviewId: string, reason?: string) {
    try {
      // Verify the review exists and belongs to an expert profile this user owns
      const { data: review } = await this.db
        .from('reviews')
        .select('id, expert_id')
        .eq('id', reviewId)
        .single();

      if (!review) throw new NotFoundException('Review not found');

      // Verify this user is the expert who received the review
      const { data: expert } = await this.db
        .from('experts')
        .select('id')
        .eq('id', review.expert_id)
        .eq('user_id', userId)
        .single();

      if (!expert) {
        throw new BadRequestException('You can only flag reviews on your own profile');
      }

      const { data, error } = await this.db
        .from('reviews')
        .update({
          is_flagged: true,
          flag_reason: reason || 'Flagged by expert for moderation',
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to flag review');
    }
  }

  async getExpertReviews(expertId: string, pagination: PaginationDto) {
    try {
      const { data, count, error } = await this.db
        .from('reviews')
        .select('*, users(full_name, avatar_url)', { count: 'exact' })
        .eq('expert_id', expertId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 20) - 1);

      if (error) throw new InternalServerErrorException(error.message);
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch expert reviews');
    }
  }
}

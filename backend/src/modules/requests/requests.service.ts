import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../config/supabase.config';
import {
  CreateRequestDto,
  CreateFreeRequestDto,
  RespondToRequestDto,
  SendMessageDto,
  SharePaymentInfoDto,
  ConfirmPaymentDto,
} from './dto/create-request.dto';
import { isValidTransition, getExpiryDate } from './request-state-machine';
import { PaginationDto } from '../../common/dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent, getNotificationContent } from '../notifications/notification-events';
import { filterContent } from '../../common/utils/content-filter';

const DEFAULT_EXPIRY_HOURS = 72;

const COORDINATION_STATUSES = ['payment_coordination', 'engaged', 'closed', 'accepted'];

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async createRequest(userId: string, dto: CreateRequestDto) {
    try {
      // Verify payment is paid
      const { data: payment } = await this.db
        .from('access_payments')
        .select('*')
        .eq('id', dto.access_payment_id)
        .eq('user_id', userId)
        .eq('status', 'paid')
        .single();

      if (!payment) {
        throw new BadRequestException('Payment not found or not confirmed');
      }

      // Check blocked
      const { data: expert } = await this.db
        .from('experts')
        .select('id, user_id, headline, max_requests_per_day')
        .eq('id', dto.expert_id)
        .single();

      if (!expert) throw new NotFoundException('Expert not found');

      const { data: blocked } = await this.db
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', expert.user_id)
        .eq('blocked_id', userId)
        .single();

      if (blocked) {
        throw new ForbiddenException('You are blocked by this expert');
      }

      // Per-user daily request limit
      const { data: rateLimitConfig } = await this.db
        .from('platform_config')
        .select('value')
        .eq('key', 'max_requests_per_user_per_day')
        .single();

      const maxPerDay = rateLimitConfig ? Number(rateLimitConfig.value) : 5;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: userTodayCount } = await this.db
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      if ((userTodayCount || 0) >= maxPerDay) {
        throw new BadRequestException(
          `Daily request limit reached (${maxPerDay} per day). Please try again tomorrow.`,
        );
      }

      // Expert daily request throttle
      const expertMaxPerDay = expert.max_requests_per_day || 10;
      const { count: expertTodayCount } = await this.db
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('expert_id', dto.expert_id)
        .gte('created_at', todayStart.toISOString());

      if ((expertTodayCount || 0) >= expertMaxPerDay) {
        throw new BadRequestException(
          'This expert has reached their daily request capacity. Please try again tomorrow.',
        );
      }

      // Content moderation — basic keyword filter
      const textToCheck = `${dto.subject || ''} ${dto.message || ''}`;
      const filterResult = filterContent(textToCheck);
      if (!filterResult.passed) {
        throw new BadRequestException(
          'Your message contains content that violates our guidelines. Please revise and try again.',
        );
      }

      // Get expiry config
      const { data: config } = await this.db
        .from('platform_config')
        .select('value')
        .eq('key', 'request_expiry_hours')
        .single();

      const expiryHours = config ? Number(config.value) : DEFAULT_EXPIRY_HOURS;

      const { data, error } = await this.db
        .from('access_requests')
        .insert({
          user_id: userId,
          expert_id: dto.expert_id,
          access_payment_id: dto.access_payment_id,
          subject: dto.subject,
          message: dto.message,
          context_data: dto.context_data,
          status: 'sent',
          expires_at: getExpiryDate(expiryHours),
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to create request: ${error.message}`);
      }

      // Notify user: request sent
      const userContent = getNotificationContent(NotificationEvent.REQUEST_SENT, {
        expertName: expert.headline || 'the expert',
        requestId: data.id,
      });
      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId,
        title: userContent.title,
        body: userContent.body,
        actionUrl: userContent.actionUrl,
        channels: ['in_app', 'email'],
      }).catch(() => {});

      // Notify expert: new request received
      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: expert.user_id,
        title: 'New request received',
        body: 'You have a new access request',
        actionUrl: `/requests/${data.id}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create request');
    }
  }

  async createFreeRequest(userId: string, dto: CreateFreeRequestDto) {
    try {
      // Verify expert exists and fee is actually 0
      const { data: expert } = await this.db
        .from('experts')
        .select('id, user_id, headline, access_fee_minor, is_available, verification_status, max_requests_per_day')
        .eq('id', dto.expert_id)
        .single();

      if (!expert) throw new NotFoundException('Expert not found');

      if (expert.access_fee_minor > 0) {
        throw new BadRequestException('This expert requires a paid access fee. Use the payment flow instead.');
      }

      if (!expert.is_available) {
        throw new BadRequestException('Expert is currently unavailable');
      }

      // Check blocked
      const { data: blocked } = await this.db
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', expert.user_id)
        .eq('blocked_id', userId)
        .single();

      if (blocked) {
        throw new ForbiddenException('You are blocked by this expert');
      }

      // Per-user daily request limit
      const { data: rateLimitConfig } = await this.db
        .from('platform_config')
        .select('value')
        .eq('key', 'max_requests_per_user_per_day')
        .single();

      const maxPerDay = rateLimitConfig ? Number(rateLimitConfig.value) : 5;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: userTodayCount } = await this.db
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      if ((userTodayCount || 0) >= maxPerDay) {
        throw new BadRequestException(
          `Daily request limit reached (${maxPerDay} per day). Please try again tomorrow.`,
        );
      }

      // Expert daily request throttle
      const expertMaxPerDay = expert.max_requests_per_day || 10;
      const { count: expertTodayCount } = await this.db
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('expert_id', dto.expert_id)
        .gte('created_at', todayStart.toISOString());

      if ((expertTodayCount || 0) >= expertMaxPerDay) {
        throw new BadRequestException(
          'This expert has reached their daily request capacity. Please try again tomorrow.',
        );
      }

      // Content moderation
      const textToCheck = `${dto.subject || ''} ${dto.message || ''}`;
      const filterResult = filterContent(textToCheck);
      if (!filterResult.passed) {
        throw new BadRequestException(
          'Your message contains content that violates our guidelines. Please revise and try again.',
        );
      }

      // Create a $0 payment record so the FK constraint is satisfied
      const { data: payment, error: payErr } = await this.db
        .from('access_payments')
        .insert({
          user_id: userId,
          expert_id: dto.expert_id,
          amount_minor: 0,
          currency: expert.access_fee_minor === 0 ? 'INR' : 'INR',
          gateway: 'free',
          gateway_order_id: `free_${Date.now()}`,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (payErr || !payment) {
        throw new BadRequestException(`Failed to create payment record: ${payErr?.message}`);
      }

      // Get expiry config
      const { data: config } = await this.db
        .from('platform_config')
        .select('value')
        .eq('key', 'request_expiry_hours')
        .single();

      const expiryHours = config ? Number(config.value) : DEFAULT_EXPIRY_HOURS;

      const { data, error } = await this.db
        .from('access_requests')
        .insert({
          user_id: userId,
          expert_id: dto.expert_id,
          access_payment_id: payment.id,
          subject: dto.subject,
          message: dto.message,
          context_data: dto.context_data,
          status: 'sent',
          expires_at: getExpiryDate(expiryHours),
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to create request: ${error.message}`);
      }

      // Notify user: request sent
      const userContent = getNotificationContent(NotificationEvent.REQUEST_SENT, {
        expertName: expert.headline || 'the expert',
        requestId: data.id,
      });
      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId,
        title: userContent.title,
        body: userContent.body,
        actionUrl: userContent.actionUrl,
        channels: ['in_app', 'email'],
      }).catch(() => {});

      // Notify expert: new request received
      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: expert.user_id,
        title: 'New request received',
        body: 'You have a new access request',
        actionUrl: `/requests/${data.id}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create free request');
    }
  }

  async listRequests(userId: string, role: string, pagination: PaginationDto) {
    try {
      let query = this.db
        .from('access_requests')
        .select('*, experts(id, headline, users!inner(full_name))', { count: 'exact' });

      if (role === 'expert') {
        // Get expert ID for this user
        const { data: expert } = await this.db
          .from('experts')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (expert) {
          query = query.eq('expert_id', expert.id);
        }
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 20) - 1);

      if (error) throw new InternalServerErrorException(error.message);

      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to list requests');
    }
  }

  async getRequest(requestId: string, userId: string) {
    try {
      const { data, error } = await this.db
        .from('access_requests')
        .select('*, expert_responses(*), access_payments(*)')
        .eq('id', requestId)
        .single();

      if (error || !data) throw new NotFoundException('Request not found');

      // Verify access — either the user who sent it or the expert who received it
      const { data: expert } = await this.db
        .from('experts')
        .select('user_id')
        .eq('id', data.expert_id)
        .single();

      if (data.user_id !== userId && expert?.user_id !== userId) {
        throw new ForbiddenException('Access denied');
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch request');
    }
  }

  async cancelRequest(requestId: string, userId: string) {
    try {
      const { data: request } = await this.db
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single();

      if (!request) throw new NotFoundException('Request not found');

      if (!isValidTransition(request.status, 'cancelled')) {
        throw new BadRequestException(`Cannot cancel request in "${request.status}" status`);
      }

      const { data, error } = await this.db
        .from('access_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);

      // Notify expert: request cancelled
      const { data: expert } = await this.db
        .from('experts')
        .select('user_id')
        .eq('id', request.expert_id)
        .single();

      if (expert) {
        const content = getNotificationContent(NotificationEvent.REQUEST_CANCELLED, {
          requestId,
        });
        this.notificationsService.send({
          event: NotificationEvent.REQUEST_CANCELLED,
          userId: expert.user_id,
          title: content.title,
          body: content.body,
          actionUrl: content.actionUrl,
          channels: ['in_app'],
        }).catch(() => {});
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to cancel request');
    }
  }

  async respondToRequest(requestId: string, userId: string, dto: RespondToRequestDto) {
    try {
      const { data: request } = await this.db
        .from('access_requests')
        .select('*, experts!inner(user_id, headline)')
        .eq('id', requestId)
        .single();

      if (!request) throw new NotFoundException('Request not found');

      if ((request as any).experts?.user_id !== userId) {
        throw new ForbiddenException('Only the assigned expert can respond');
      }

      // Map "accepted" decision to "payment_coordination" status
      const newStatus = dto.decision === 'accepted' ? 'payment_coordination' : dto.decision;

      if (!isValidTransition(request.status, newStatus)) {
        throw new BadRequestException(`Cannot ${dto.decision} request in "${request.status}" status`);
      }

      // Create response record (decision is still 'accepted' / 'rejected' for the expert_responses table)
      const { error: respErr } = await this.db
        .from('expert_responses')
        .insert({
          request_id: requestId,
          decision: dto.decision,
          response_note: dto.response_note,
          contact_terms: dto.contact_terms,
          interaction_mode: dto.interaction_mode,
          contact_price_indicated: dto.contact_price_indicated,
          currency: dto.currency,
        });

      if (respErr) throw new BadRequestException(respErr.message);

      // Get coordination window from config
      const { data: windowConfig } = await this.db
        .from('platform_config')
        .select('value')
        .eq('key', 'coordination_window_hours')
        .single();
      const coordHours = windowConfig ? Number(windowConfig.value) : 48;

      // Build update payload
      const updatePayload: Record<string, any> = { status: newStatus };
      if (newStatus === 'payment_coordination') {
        updatePayload.coordination_expires_at = getExpiryDate(coordHours);
        updatePayload.user_payment_confirmed = false;
        updatePayload.expert_payment_confirmed = false;
      }

      const { data, error } = await this.db
        .from('access_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);

      // Insert system message for payment coordination phase
      if (newStatus === 'payment_coordination') {
        await this.db.from('request_messages').insert({
          request_id: requestId,
          sender_id: userId,
          body: `Expert has accepted your request. Payment coordination started — you have ${coordHours} hours to complete the payment.`,
          message_type: 'system',
        });
      }

      // Notify user
      const event = dto.decision === 'accepted'
        ? NotificationEvent.REQUEST_ACCEPTED
        : NotificationEvent.REQUEST_REJECTED;
      const content = getNotificationContent(event, {
        expertName: (request as any).experts?.headline || 'the expert',
        requestId,
      });
      this.notificationsService.send({
        event,
        userId: request.user_id,
        title: dto.decision === 'accepted' ? 'Request accepted — Payment coordination started' : content.title,
        body: dto.decision === 'accepted'
          ? `The expert has accepted your request. Please coordinate payment within ${coordHours} hours.`
          : content.body,
        actionUrl: content.actionUrl,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to respond to request');
    }
  }

  async getResponse(requestId: string, userId: string) {
    try {
      const request = await this.getRequest(requestId, userId);

      const { data } = await this.db
        .from('expert_responses')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (!data) throw new NotFoundException('No response yet');

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch response');
    }
  }

  /**
   * Verify the caller is a participant (user or expert) of the request.
   * Returns the request row plus expert_user_id.
   */
  private async verifyParticipant(requestId: string, userId: string, role: string) {
    const { data: request } = await this.db
      .from('access_requests')
      .select('*, experts!inner(user_id)')
      .eq('id', requestId)
      .single();

    if (!request) throw new NotFoundException('Request not found');

    const expertUserId = (request as any).experts?.user_id;
    const isParticipant = request.user_id === userId || expertUserId === userId || role === 'admin';

    if (!isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    return { request, expertUserId };
  }

  async listMessages(requestId: string, userId: string, role: string) {
    try {
      await this.verifyParticipant(requestId, userId, role);

      const { data, error } = await this.db
        .from('request_messages')
        .select('*, users:sender_id(full_name, avatar_url)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw new InternalServerErrorException(error.message);

      return data || [];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to list messages');
    }
  }

  async sendMessage(requestId: string, userId: string, dto: SendMessageDto) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, 'user');

      const allowedStatuses = ['payment_coordination', 'engaged', 'accepted'];
      if (!allowedStatuses.includes(request.status)) {
        throw new BadRequestException('Messages can only be sent on active requests');
      }

      const filterResult = filterContent(dto.body);
      if (!filterResult.passed) {
        throw new BadRequestException('Your message contains content that violates our guidelines.');
      }

      const { data, error } = await this.db
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: userId,
          body: dto.body,
          message_type: dto.message_type || 'text',
          metadata: dto.metadata || null,
        })
        .select('*, users:sender_id(full_name, avatar_url)')
        .single();

      if (error) throw new BadRequestException(error.message);

      const recipientId = userId === request.user_id ? expertUserId : request.user_id;
      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: recipientId,
        title: 'New message',
        body: 'You have a new message in your conversation',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  async closeConversation(requestId: string, userId: string, role: string) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, role);

      if (role !== 'admin' && expertUserId !== userId) {
        throw new ForbiddenException('Only the expert or an admin can close a conversation');
      }

      if (!isValidTransition(request.status, 'closed')) {
        throw new BadRequestException(`Cannot close request in "${request.status}" status`);
      }

      const { data, error } = await this.db
        .from('access_requests')
        .update({ status: 'closed' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);

      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: request.user_id,
        title: 'Conversation closed',
        body: 'The expert has closed the conversation.',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app', 'email'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to close conversation');
    }
  }

  // ============================
  // Payment Coordination Methods
  // ============================

  async sharePaymentInfo(requestId: string, userId: string, dto: SharePaymentInfoDto) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, 'expert');

      if (expertUserId !== userId) {
        throw new ForbiddenException('Only the expert can share payment details');
      }
      if (request.status !== 'payment_coordination') {
        throw new BadRequestException('Payment info can only be shared during payment coordination');
      }

      const metadata = {
        fee_amount: dto.fee_amount,
        fee_currency: dto.fee_currency,
        payment_method: dto.payment_method,
        payment_details: dto.payment_details,
      };

      const body = dto.note
        ? `Payment details shared. ${dto.note}`
        : `Payment details shared: ${dto.fee_currency} ${dto.fee_amount} via ${dto.payment_method}`;

      const { data, error } = await this.db
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: userId,
          body,
          message_type: 'payment_details',
          metadata,
        })
        .select('*, users:sender_id(full_name, avatar_url)')
        .single();

      if (error) throw new BadRequestException(error.message);

      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: request.user_id,
        title: 'Payment details received',
        body: 'The expert has shared payment details. Please review and make payment.',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to share payment info');
    }
  }

  async uploadReceipt(requestId: string, userId: string, file: Express.Multer.File) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, 'user');

      if (request.user_id !== userId) {
        throw new ForbiddenException('Only the requester can upload a payment receipt');
      }
      if (request.status !== 'payment_coordination') {
        throw new BadRequestException('Receipts can only be uploaded during payment coordination');
      }

      // Upload to Supabase storage
      const { data: buckets } = await this.db.storage.listBuckets();
      if (!buckets?.find((b: any) => b.name === 'payment-receipts')) {
        await this.db.storage.createBucket('payment-receipts', { public: true, fileSizeLimit: 10485760 });
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${requestId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await this.db.storage
        .from('payment-receipts')
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

      if (uploadError) {
        throw new BadRequestException(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = this.db.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const { data, error } = await this.db
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: userId,
          body: 'Payment receipt uploaded',
          message_type: 'payment_receipt',
          attachment_url: urlData.publicUrl,
          metadata: { file_name: safeName, file_type: file.mimetype, file_size: file.size },
        })
        .select('*, users:sender_id(full_name, avatar_url)')
        .single();

      if (error) throw new BadRequestException(error.message);

      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: expertUserId,
        title: 'Payment receipt uploaded',
        body: 'The user has uploaded a payment receipt. Please verify.',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to upload receipt');
    }
  }

  async confirmPayment(requestId: string, userId: string, dto: ConfirmPaymentDto) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, 'user');

      if (request.user_id !== userId) {
        throw new ForbiddenException('Only the requester can confirm payment');
      }
      if (request.status !== 'payment_coordination') {
        throw new BadRequestException('Payment can only be confirmed during payment coordination');
      }

      await this.db
        .from('access_requests')
        .update({ user_payment_confirmed: true })
        .eq('id', requestId);

      const body = dto.note ? `Payment completed. ${dto.note}` : 'I have completed the payment.';
      await this.db.from('request_messages').insert({
        request_id: requestId,
        sender_id: userId,
        body,
        message_type: 'payment_confirmed',
      });

      // Check if expert also confirmed → auto-engage
      const result = await this.tryEngage(requestId, userId, expertUserId, request.user_id);

      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: expertUserId,
        title: 'Payment confirmed by user',
        body: 'The user has confirmed their payment. Please verify the receipt.',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  async verifyPayment(requestId: string, userId: string, dto: ConfirmPaymentDto) {
    try {
      const { request, expertUserId } = await this.verifyParticipant(requestId, userId, 'expert');

      if (expertUserId !== userId) {
        throw new ForbiddenException('Only the expert can verify payment');
      }
      if (request.status !== 'payment_coordination') {
        throw new BadRequestException('Payment can only be verified during payment coordination');
      }

      await this.db
        .from('access_requests')
        .update({ expert_payment_confirmed: true })
        .eq('id', requestId);

      const body = dto.note ? `Payment receipt verified. ${dto.note}` : 'Payment receipt verified.';
      await this.db.from('request_messages').insert({
        request_id: requestId,
        sender_id: userId,
        body,
        message_type: 'receipt_verified',
      });

      // Check if user also confirmed → auto-engage
      const result = await this.tryEngage(requestId, userId, expertUserId, request.user_id);

      this.notificationsService.send({
        event: NotificationEvent.REQUEST_SENT,
        userId: request.user_id,
        title: 'Payment verified by expert',
        body: 'The expert has verified your payment.',
        actionUrl: `/requests/${requestId}`,
        channels: ['in_app', 'email', 'push'],
      }).catch(() => {});

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Transition to 'engaged' if both user and expert have confirmed payment.
   */
  private async tryEngage(requestId: string, actorId: string, expertUserId: string, requestUserId: string) {
    const { data: fresh } = await this.db
      .from('access_requests')
      .select('user_payment_confirmed, expert_payment_confirmed, status')
      .eq('id', requestId)
      .single();

    if (fresh?.user_payment_confirmed && fresh?.expert_payment_confirmed && fresh?.status === 'payment_coordination') {
      const { data, error } = await this.db
        .from('access_requests')
        .update({ status: 'engaged' })
        .eq('id', requestId)
        .select()
        .single();

      if (!error) {
        await this.db.from('request_messages').insert({
          request_id: requestId,
          sender_id: actorId,
          body: 'Engagement activated! Full communication is now unlocked.',
          message_type: 'system',
        });

        // Notify both parties
        for (const uid of [expertUserId, requestUserId]) {
          this.notificationsService.send({
            event: NotificationEvent.REQUEST_SENT,
            userId: uid,
            title: 'Engagement activated',
            body: 'Payment confirmed by both parties. Full communication is now available.',
            actionUrl: `/requests/${requestId}`,
            channels: ['in_app', 'email', 'push'],
          }).catch(() => {});
        }
        return data;
      }
    }

    return { status: 'payment_coordination', message: 'Waiting for the other party to confirm' };
  }

  /**
   * Expire payment coordination requests that have passed their deadline.
   * Runs every 15 minutes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkCoordinationExpiry() {
    try {
      const { data: expired } = await this.db
        .from('access_requests')
        .select('id, user_id, expert_id, experts!inner(user_id)')
        .eq('status', 'payment_coordination')
        .lt('coordination_expires_at', new Date().toISOString());

      if (!expired || expired.length === 0) return { expired: 0 };

      let count = 0;
      for (const req of expired) {
        const { error } = await this.db
          .from('access_requests')
          .update({ status: 'coordination_expired' })
          .eq('id', req.id);

        if (error) continue;
        count++;

        await this.db.from('request_messages').insert({
          request_id: req.id,
          sender_id: req.user_id,
          body: 'Payment coordination window has expired. The engagement was not activated.',
          message_type: 'system',
        });

        const expertUid = (req as any).experts?.user_id;
        for (const uid of [req.user_id, expertUid].filter(Boolean)) {
          this.notificationsService.send({
            event: NotificationEvent.REQUEST_SENT,
            userId: uid,
            title: 'Coordination expired',
            body: 'The payment coordination window has expired.',
            actionUrl: `/requests/${req.id}`,
            channels: ['in_app', 'email'],
          }).catch(() => {});
        }
      }

      this.logger.log(`Expired ${count} payment coordination requests`);
      return { expired: count };
    } catch (error) {
      this.logger.error('Failed to check coordination expiry', error);
      return { expired: 0 };
    }
  }
}

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash, scryptSync, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../config/supabase.config';
import { EmailService } from '../email/email.service';
import { AuthWebhookPayloadDto } from './dto/auth-webhook.dto';
import { SendEmailOtpDto } from './dto/send-email-otp.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_FAILED_ATTEMPTS_BEFORE_RESEND = 2;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private emailService: EmailService,
  ) {}

  /**
   * Handle Supabase Auth webhook — create a public.users row when a new user signs up.
   * @deprecated With Firebase Auth, user provisioning is handled by the auth guard.
   * This webhook is kept for backward compatibility but may be removed in the future.
   */
  async handleAuthWebhook(payload: AuthWebhookPayloadDto) {
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return { handled: false, reason: 'Not a user insert event' };
    }

    const { id, email, raw_user_meta_data } = payload.record;
    const supabase = this.supabaseService.getServiceClient();

    // Check if user already exists in public.users
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (existing) {
      return { handled: false, reason: 'User already exists' };
    }

    const { error } = await supabase.from('users').insert({
      id,
      email,
      full_name: raw_user_meta_data?.full_name || email.split('@')[0],
      avatar_url: raw_user_meta_data?.avatar_url || null,
      phone: raw_user_meta_data?.phone || null,
      role: 'user',
    });

    if (error) {
      this.logger.error(`Failed to create user record: ${error.message}`, error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    this.logger.log(`Created public.users record for ${id}`);
    return { handled: true, userId: id };
  }

  private hashOtp(otp: string, email: string): string {
    const salt = createHash('sha256').update(email).digest();
    return scryptSync(otp, salt, 64).toString('hex');
  }

  private verifyOtpHash(inputOtp: string, email: string, storedHash: string): boolean {
    const computed = this.hashOtp(inputOtp, email);
    try {
      const a = Buffer.from(computed, 'hex');
      const b = Buffer.from(storedHash, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async sendEmailOtp(dto: SendEmailOtpDto): Promise<{ success: true }> {
    if (!this.emailService.isConfigured()) {
      throw new BadRequestException('Email verification is not configured.');
    }

    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    const supabase = this.supabaseService.getServiceClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    const { data: existing } = await supabase
      .from('email_signup_otp')
      .select('resend_count, rate_limit_window_start')
      .eq('email', email)
      .single();

    if (existing?.rate_limit_window_start) {
      const window = new Date(existing.rate_limit_window_start);
      if (window > windowStart && (existing.resend_count ?? 0) >= MAX_SENDS_PER_WINDOW) {
        throw new HttpException(
          'Too many OTP requests. Please try again in 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = this.hashOtp(otp, email);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const isNewWindow =
      !existing?.rate_limit_window_start ||
      new Date(existing.rate_limit_window_start) <= windowStart;
    const resendCount = isNewWindow ? 1 : (existing?.resend_count ?? 0) + 1;
    const rateLimitWindowStart = isNewWindow
      ? now.toISOString()
      : existing!.rate_limit_window_start;

    const { error: upsertError } = await supabase
      .from('email_signup_otp')
      .upsert(
        {
          email,
          full_name: fullName,
          otp_hash: otpHash,
          expires_at: expiresAt.toISOString(),
          failed_attempts: 0,
          resend_count: resendCount,
          rate_limit_window_start: rateLimitWindowStart,
        },
        { onConflict: 'email' },
      );

    if (upsertError) {
      this.logger.error(`email_signup_otp upsert failed: ${upsertError.message}`);
      throw new BadRequestException('Failed to create verification. Please try again.');
    }

    await this.emailService.sendOtpEmail(email, otp, fullName);

    return { success: true };
  }

  async verifyEmailOtp(
    dto: VerifyEmailOtpDto,
  ): Promise<
    | { success: true; verified: true }
    | { success: false; failedAttempts: number; mayResend?: boolean }
  > {
    const email = dto.email.trim().toLowerCase();
    const supabase = this.supabaseService.getServiceClient();

    const { data: row, error: fetchError } = await supabase
      .from('email_signup_otp')
      .select('otp_hash, expires_at, failed_attempts')
      .eq('email', email)
      .single();

    if (fetchError || !row) {
      return { success: false, failedAttempts: 0 };
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      return { success: false, failedAttempts: row.failed_attempts ?? 0 };
    }

    const valid = this.verifyOtpHash(dto.otp, email, row.otp_hash);

    if (valid) {
      await supabase.from('email_signup_otp').delete().eq('email', email);
      return { success: true, verified: true };
    }

    const failedAttempts = (row.failed_attempts ?? 0) + 1;
    await supabase
      .from('email_signup_otp')
      .update({ failed_attempts: failedAttempts })
      .eq('email', email);

    const mayResend = failedAttempts >= MAX_FAILED_ATTEMPTS_BEFORE_RESEND;
    return { success: false, failedAttempts, mayResend };
  }
}

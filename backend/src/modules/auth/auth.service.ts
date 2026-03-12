import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { AuthWebhookPayloadDto } from './dto/auth-webhook.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Handle Supabase Auth webhook — create a public.users row when a new user signs up.
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
}

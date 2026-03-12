import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private serviceClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.serviceClient = createClient(
      this.configService.get<string>('SUPABASE_URL', ''),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', ''),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }

  /**
   * Service-role client — bypasses RLS. Use for backend operations.
   */
  getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  /**
   * Create a client scoped to a specific user's JWT for RLS-aware queries.
   */
  getClientForUser(accessToken: string): SupabaseClient {
    return createClient(
      this.configService.get<string>('SUPABASE_URL', ''),
      this.configService.get<string>('SUPABASE_ANON_KEY', ''),
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
}

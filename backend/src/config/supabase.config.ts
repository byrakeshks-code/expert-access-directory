import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private serviceClient: SupabaseClient;
  private internalUrl: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.internalUrl = this.configService.get<string>('SUPABASE_URL', '');
    this.publicUrl = this.configService.get<string>(
      'SUPABASE_PUBLIC_URL',
      this.internalUrl,
    );

    this.serviceClient = createClient(
      this.internalUrl,
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
      this.internalUrl,
      this.configService.get<string>('SUPABASE_ANON_KEY', ''),
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }

  /**
   * Rewrites an internal Supabase storage URL to the public-facing URL.
   * In production the Supabase instance is behind an nginx reverse-proxy,
   * so URLs returned by getPublicUrl() contain http://127.0.0.1:54321
   * which is unreachable from browsers.
   */
  toPublicUrl(internalUrl: string): string {
    if (!internalUrl) return internalUrl;
    if (this.internalUrl === this.publicUrl) return internalUrl;
    return internalUrl.replace(this.internalUrl, this.publicUrl);
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Dev-mode bypass: requires BOTH NODE_ENV=development AND ALLOW_DEV_BYPASS=true
    if (
      this.configService.get('NODE_ENV') === 'development' &&
      this.configService.get('ALLOW_DEV_BYPASS') === 'true' &&
      request.headers['x-dev-admin'] === 'true'
    ) {
      this.logger.warn(`Dev auth bypass used for ${request.method} ${request.url}`);
      request.user = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'dev-admin@localhost',
        role: 'admin',
      };
      return true;
    }

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const supabase = this.supabaseService.getServiceClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Fetch the user's role from public.users
      let { data: profile } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      // Auto-provision public.users row if it doesn't exist yet
      if (!profile) {
        const meta = user.user_metadata || {};
        const { data: newProfile, error: insertErr } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email ?? '',
            full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
            avatar_url: meta.avatar_url || null,
            role: 'user',
          })
          .select('role, is_active')
          .single();
        if (!insertErr && newProfile) {
          profile = newProfile;
          this.logger.log(`Auto-provisioned public.users row for ${user.id}`);
        }
      }

      if (profile && !profile.is_active) {
        throw new UnauthorizedException('Account is deactivated');
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: profile?.role || 'user',
      };
      request.accessToken = token;

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}

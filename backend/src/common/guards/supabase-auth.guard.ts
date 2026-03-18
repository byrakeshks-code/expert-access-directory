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
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    private firebaseAdmin: FirebaseAdminService,
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
      const decoded = await this.firebaseAdmin.verifyIdToken(token);
      const firebaseUid = decoded.uid;

      const supabase = this.supabaseService.getServiceClient();

      // Look up user by firebase_uid
      let { data: profile } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('firebase_uid', firebaseUid)
        .single();

      // Auto-provision public.users row for new Firebase users
      if (!profile) {
        const fullName =
          decoded.name ||
          decoded.email?.split('@')[0] ||
          'User';
        const { data: newProfile, error: insertErr } = await supabase
          .from('users')
          .insert({
            firebase_uid: firebaseUid,
            email: decoded.email ?? '',
            full_name: fullName,
            phone: decoded.phone_number || null,
            role: 'user',
          })
          .select('id, role, is_active')
          .single();
        if (insertErr) {
          this.logger.error(`Auto-provision failed for Firebase UID ${firebaseUid}: ${insertErr.message}`);
          throw new UnauthorizedException('Could not create user profile. Please try again.');
        }
        if (newProfile) {
          profile = newProfile;
          this.logger.log(`Auto-provisioned user for Firebase UID ${firebaseUid}`);
        }

        // Set the 'authenticated' custom claim for Supabase third-party auth RLS
        if (!decoded.role) {
          this.firebaseAdmin
            .auth()
            .setCustomUserClaims(firebaseUid, {
              ...decoded,
              role: 'authenticated',
            })
            .catch((err) =>
              this.logger.warn(`Failed to set custom claims: ${err.message}`),
            );
        }
      }

      if (profile && !profile.is_active) {
        throw new UnauthorizedException('Account is deactivated');
      }

      if (!profile?.id) {
        this.logger.error(`No user profile for Firebase UID ${firebaseUid}`);
        throw new UnauthorizedException('User profile not found');
      }

      request.user = {
        id: profile.id,
        email: decoded.email,
        role: profile.role || 'user',
        firebaseUid,
      };
      request.accessToken = token;

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`Auth failed: ${err.message}`);
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

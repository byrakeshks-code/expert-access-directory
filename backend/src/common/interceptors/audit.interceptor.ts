import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Logs all mutating API calls (POST, PUT, PATCH, DELETE) to the audit_logs table.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const action = `${method} ${request.route?.path || request.url}`;
    const user = request.user;

    return next.handle().pipe(
      tap((responseData) => {
        // Fire-and-forget audit log
        this.auditService.log({
          actor_id: user?.id,
          action,
          entity: this.extractEntity(request.route?.path || request.url),
          entity_id: responseData?.id || request.params?.id,
          new_data: typeof responseData === 'object' ? responseData : undefined,
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
        }).catch(() => {}); // Never let audit logging break the request
      }),
    );
  }

  private extractEntity(path: string): string {
    // Extract entity from path: /api/v1/experts/me → experts
    const parts = path.split('/').filter(Boolean);
    // Find the first meaningful segment after version prefix
    for (const part of parts) {
      if (!['api', 'v1', ':id'].includes(part) && !part.startsWith(':')) {
        return part;
      }
    }
    return 'unknown';
  }
}

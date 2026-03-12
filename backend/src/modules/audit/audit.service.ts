import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { PaginationDto } from '../../common/dto';

export interface AuditLogEntry {
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async log(entry: AuditLogEntry) {
    const { error } = await this.db.from('audit_logs').insert(entry);

    if (error) {
      this.logger.error(`Audit log failed: ${error.message}`);
    }
  }

  async queryLogs(
    pagination: PaginationDto,
    filters?: {
      actor_id?: string;
      entity?: string;
      action?: string;
      from?: string;
      to?: string;
    },
  ) {
    try {
      let query = this.db
        .from('audit_logs')
        .select('*, users(full_name, email)', { count: 'exact' });

      if (filters?.actor_id) query = query.eq('actor_id', filters.actor_id);
      if (filters?.entity) query = query.eq('entity', filters.entity);
      if (filters?.action) query = query.ilike('action', `%${filters.action}%`);
      if (filters?.from) query = query.gte('created_at', filters.from);
      if (filters?.to) query = query.lte('created_at', filters.to);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 20) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }
}

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class DomainsService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async listDomains() {
    try {
      const { data, error } = await this.db
        .from('domains')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) return [];
      return data;
    } catch {
      return [];
    }
  }

  async getSubProblems(domainId: number) {
    try {
      const { data, error } = await this.db
        .from('sub_problems')
        .select('*')
        .eq('domain_id', domainId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw new InternalServerErrorException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch guidance areas');
    }
  }

  // --- Admin methods ---

  async createDomain(name: string, slug: string, iconUrl?: string) {
    try {
      const { data, error } = await this.db
        .from('domains')
        .insert({ name, slug, icon_url: iconUrl })
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create domain');
    }
  }

  async updateDomain(id: number, updates: Partial<{ name: string; slug: string; icon_url: string; is_active: boolean; sort_order: number }>) {
    try {
      const { data, error } = await this.db
        .from('domains')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new NotFoundException('Domain not found');
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update domain');
    }
  }

  async deleteDomain(id: number) {
    try {
      const { error } = await this.db.from('domains').delete().eq('id', id);
      if (error) throw new InternalServerErrorException(error.message);
      return { deleted: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to delete domain');
    }
  }

  async createSubProblem(domainId: number, name: string, slug: string) {
    try {
      const { data, error } = await this.db
        .from('sub_problems')
        .insert({ domain_id: domainId, name, slug })
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create guidance area');
    }
  }

  async updateSubProblem(id: number, updates: Partial<{ name: string; slug: string; is_active: boolean; sort_order: number }>) {
    try {
      const { data, error } = await this.db
        .from('sub_problems')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new NotFoundException('Guidance area not found');
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update guidance area');
    }
  }

  async deleteSubProblem(id: number) {
    try {
      const { error } = await this.db.from('sub_problems').delete().eq('id', id);
      if (error) throw new InternalServerErrorException(error.message);
      return { deleted: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to delete guidance area');
    }
  }
}

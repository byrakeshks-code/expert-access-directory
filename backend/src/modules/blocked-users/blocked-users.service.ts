import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { BlockUserDto } from './dto/block-user.dto';

@Injectable()
export class BlockedUsersService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  async blockUser(blockerId: string, dto: BlockUserDto) {
    try {
      const { data, error } = await this.db
        .from('blocked_users')
        .insert({
          blocker_id: blockerId,
          blocked_id: dto.blocked_id,
          reason: dto.reason,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ConflictException('User is already blocked');
        }
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to block user');
    }
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    try {
      const { error } = await this.db
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedUserId);

      if (error) throw new BadRequestException(error.message);
      return { unblocked: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to unblock user');
    }
  }

  async listBlocked(blockerId: string) {
    try {
      const { data, error } = await this.db
        .from('blocked_users')
        .select('*, users!blocked_users_blocked_id_fkey(full_name, email)')
        .eq('blocker_id', blockerId)
        .order('created_at', { ascending: false });

      if (error) throw new InternalServerErrorException(error.message);
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to list blocked users');
    }
  }
}

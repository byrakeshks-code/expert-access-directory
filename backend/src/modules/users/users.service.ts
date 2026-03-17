import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    try {
      const supabase = this.supabaseService.getServiceClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundException('User profile not found');
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch user profile');
    }
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    try {
      const supabase = this.supabaseService.getServiceClient();
      const { data, error } = await supabase
        .from('users')
        .update(dto)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to update profile: ${error.message}`);
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update user profile');
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    try {
      const supabase = this.supabaseService.getServiceClient();

      // Ensure the avatars bucket exists (public)
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find((b) => b.name === 'avatars')) {
        await supabase.storage.createBucket('avatars', { public: true });
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new BadRequestException(`Avatar upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicAvatarUrl = this.supabaseService.toPublicUrl(urlData.publicUrl);

      await supabase
        .from('users')
        .update({ avatar_url: publicAvatarUrl })
        .eq('id', userId);

      return { avatar_url: publicAvatarUrl };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }
}

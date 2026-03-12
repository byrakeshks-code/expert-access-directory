import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { SearchService } from '../search/search.service';
import { ApplyExpertDto } from './dto/apply-expert.dto';
import {
  UpdateExpertDto,
  UpdateAccessFeeDto,
  UpdateAvailabilityDto,
  AddSpecializationDto,
} from './dto/update-expert.dto';

@Injectable()
export class ExpertsService {
  constructor(
    private supabaseService: SupabaseService,
    private searchService: SearchService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  private async getConfigValue(key: string, fallback: number): Promise<number> {
    const { data } = await this.db
      .from('platform_config')
      .select('value')
      .eq('key', key)
      .single();
    return data ? Number(data.value) : fallback;
  }

  private async validateAccessFee(feeMinor: number, currency: string) {
    if (currency === 'INR') {
      const minFee = await this.getConfigValue('min_access_fee_inr', 49);
      if (feeMinor < minFee) {
        throw new BadRequestException(`Access fee must be at least ₹${minFee}`);
      }
    }
  }

  async apply(userId: string, dto: ApplyExpertDto) {
    try {
      // Check if user already has an expert profile
      const { data: existing } = await this.db
        .from('experts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        throw new ConflictException('You already have an expert profile');
      }

      const currency = dto.access_fee_currency || 'INR';
      const defaultFee = await this.getConfigValue('default_access_fee_inr', 49);
      const feeMinor = dto.access_fee_minor || defaultFee;
      await this.validateAccessFee(feeMinor, currency);

      const { data, error } = await this.db
        .from('experts')
        .insert({
          user_id: userId,
          headline: dto.headline,
          bio: dto.bio,
          primary_domain: dto.primary_domain,
          years_of_experience: dto.years_of_experience,
          city: dto.city,
          country: dto.country,
          languages: dto.languages || ['en'],
          linkedin_url: dto.linkedin_url,
          website_url: dto.website_url,
          access_fee_minor: feeMinor,
          access_fee_currency: currency,
          verification_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to create expert profile: ${error.message}`);
      }

      await this.db
        .from('users')
        .update({ role: 'expert' })
        .eq('id', userId);

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to apply as expert');
    }
  }

  async getPublicProfile(expertId: string) {
    try {
      const { data, error } = await this.db
        .from('experts')
        .select(`
          *,
          users!inner(full_name, avatar_url),
          expert_specializations(
            id,
            sub_problems(id, name, domains(id, name))
          )
        `)
        .eq('id', expertId)
        .eq('verification_status', 'verified')
        .single();

      if (error || !data) {
        throw new NotFoundException('Expert not found');
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch expert profile');
    }
  }

  async getOwnProfile(userId: string) {
    try {
      const { data, error } = await this.db
        .from('experts')
        .select(`
          *,
          expert_specializations(
            id,
            sub_problems(id, name, domains(id, name))
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundException('You do not have an expert profile');
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch expert profile');
    }
  }

  async updateProfile(userId: string, dto: UpdateExpertDto) {
    try {
      const expert = await this.getOwnProfile(userId);

      const { data, error } = await this.db
        .from('experts')
        .update(dto)
        .eq('id', expert.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Update failed: ${error.message}`);
      }

      // Sync search index
      this.searchService.updateDocument(expert.id).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update expert profile');
    }
  }

  async updateAccessFee(userId: string, dto: UpdateAccessFeeDto) {
    try {
      const expert = await this.getOwnProfile(userId);
      const currency = dto.access_fee_currency || expert.access_fee_currency;
      await this.validateAccessFee(dto.access_fee_minor, currency);

      const { data, error } = await this.db
        .from('experts')
        .update({
          access_fee_minor: dto.access_fee_minor,
          access_fee_currency: currency,
        })
        .eq('id', expert.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Update failed: ${error.message}`);
      }

      this.searchService.updateDocument(expert.id).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update access fee');
    }
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    try {
      const expert = await this.getOwnProfile(userId);

      const { data, error } = await this.db
        .from('experts')
        .update({ is_available: dto.is_available })
        .eq('id', expert.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Update failed: ${error.message}`);
      }

      this.searchService.updateDocument(expert.id).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update availability');
    }
  }

  async uploadDocument(userId: string, file: Express.Multer.File, documentType: string) {
    try {
      const expert = await this.getOwnProfile(userId);
      const filePath = `verification/${expert.id}/${Date.now()}-${file.originalname}`;

      const { error: uploadError } = await this.db.storage
        .from('verification-docs')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw new BadRequestException(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = this.db.storage
        .from('verification-docs')
        .getPublicUrl(filePath);

      const { data, error } = await this.db
        .from('verification_documents')
        .insert({
          expert_id: expert.id,
          document_type: documentType,
          file_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Document record failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  async getDocuments(userId: string) {
    try {
      const expert = await this.getOwnProfile(userId);

      const { data, error } = await this.db
        .from('verification_documents')
        .select('*')
        .eq('expert_id', expert.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(`Failed to fetch documents: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch documents');
    }
  }

  async addSpecializations(userId: string, dto: AddSpecializationDto) {
    try {
      const expert = await this.getOwnProfile(userId);

      const records = dto.sub_problem_ids.map((subProblemId) => ({
        expert_id: expert.id,
        sub_problem_id: subProblemId,
      }));

      const { data, error } = await this.db
        .from('expert_specializations')
        .upsert(records, { onConflict: 'expert_id,sub_problem_id' })
        .select();

      if (error) {
        throw new BadRequestException(`Failed to add specializations: ${error.message}`);
      }

      this.searchService.updateDocument(expert.id).catch(() => {});

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to add specializations');
    }
  }

  async removeSpecialization(userId: string, specializationId: string) {
    try {
      const expert = await this.getOwnProfile(userId);

      const { error } = await this.db
        .from('expert_specializations')
        .delete()
        .eq('id', specializationId)
        .eq('expert_id', expert.id);

      if (error) {
        throw new BadRequestException(`Failed to remove specialization: ${error.message}`);
      }

      this.searchService.updateDocument(expert.id).catch(() => {});

      return { deleted: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to remove specialization');
    }
  }
}

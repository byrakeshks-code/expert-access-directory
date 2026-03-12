import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { AdminPaginationDto } from '../../../common/dto';

// --- Create User ---
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsOptional()
  @IsEnum(['user', 'expert', 'admin'])
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  preferred_lang?: string;
}

// --- Reset Password ---
export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  new_password: string;
}

// --- Create Expert ---
export class CreateExpertDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsString()
  @IsNotEmpty()
  headline: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  primary_domain?: string;

  @IsOptional()
  @IsNumber()
  years_of_experience?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsString()
  linkedin_url?: string;

  @IsOptional()
  @IsString()
  website_url?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  access_fee_minor?: number;

  @IsOptional()
  @IsString()
  access_fee_currency?: string;

  @IsOptional()
  @IsEnum(['starter', 'pro', 'elite'])
  current_tier?: string;

  @IsOptional()
  @IsEnum(['pending', 'under_review', 'verified', 'rejected', 'suspended'])
  verification_status?: string;
}

// --- Create Config ---
export class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  description?: string;
}

// --- Update Config ---
export class UpdateConfigDto {
  @IsNotEmpty()
  value: any;
}

// --- Update Request (admin override) ---
export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(['pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'])
  status?: string;
}

// --- Update Payment (admin override) ---
export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  status?: string;

  @IsOptional()
  @IsString()
  gateway_payment_id?: string;
}

// --- Verification Documents Query ---
export class ListVerificationDocsDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  expert_id?: string;
}

// --- Experts Query ---
export class ListExpertsQueryDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// --- Requests Query ---
export class ListRequestsQueryDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

// --- Payments Query ---
export class ListPaymentsQueryDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// --- Refunds Query ---
export class ListRefundsQueryDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// --- Audit Logs Query ---
export class ListAuditLogsQueryDto extends AdminPaginationDto {
  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

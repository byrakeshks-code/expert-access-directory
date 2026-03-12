import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExpertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primary_domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  years_of_experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedin_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website_url?: string;
}

export class UpdateAccessFeeDto {
  @ApiPropertyOptional({ description: 'Access fee as whole number in selected currency' })
  @IsInt()
  @Min(0)
  access_fee_minor: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  access_fee_currency?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional()
  @IsBoolean()
  is_available: boolean;
}

export class AddSpecializationDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  sub_problem_ids: number[];
}

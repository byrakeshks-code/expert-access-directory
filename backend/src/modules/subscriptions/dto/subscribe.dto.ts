import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ enum: ['pro', 'elite'] })
  @IsString()
  @IsNotEmpty()
  tier_id: 'pro' | 'elite';

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'] as const)
  billing_cycle: 'monthly' | 'yearly';
}

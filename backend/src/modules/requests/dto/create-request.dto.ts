import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  expert_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  access_payment_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context_data?: Record<string, any>;
}

export class CreateFreeRequestDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  expert_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context_data?: Record<string, any>;
}

export class RespondToRequestDto {
  @ApiProperty({ enum: ['accepted', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  decision: 'accepted' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response_note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interaction_mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  contact_price_indicated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SharePaymentInfoDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  fee_amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_currency: string;

  @ApiProperty({ description: 'UPI or Bank Transfer' })
  @IsString()
  @IsNotEmpty()
  payment_method: string;

  @ApiProperty({ description: 'UPI ID or bank account details' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  payment_details: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

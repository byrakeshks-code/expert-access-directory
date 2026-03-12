import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthWebhookPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string; // e.g., 'INSERT'

  @ApiProperty()
  table: string;

  @ApiProperty()
  schema: string;

  @ApiProperty()
  record: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      avatar_url?: string;
      phone?: string;
    };
  };

  @ApiProperty()
  @IsOptional()
  old_record?: any;
}

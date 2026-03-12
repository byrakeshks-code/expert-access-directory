import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class BlockUserDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  blocked_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

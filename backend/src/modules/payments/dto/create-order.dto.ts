import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateAccessOrderDto {
  @ApiProperty({ description: 'Expert ID to request access to' })
  @IsUUID()
  @IsNotEmpty()
  expert_id: string;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gateway_order_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gateway_payment_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gateway_signature: string;
}

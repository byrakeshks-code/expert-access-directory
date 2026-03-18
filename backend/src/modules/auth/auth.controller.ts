import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { AuthWebhookPayloadDto } from './dto/auth-webhook.dto';
import { SendEmailOtpDto } from './dto/send-email-otp.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Supabase Auth webhook — auto-create user record on signup' })
  async handleWebhook(@Body() payload: AuthWebhookPayloadDto) {
    return this.authService.handleAuthWebhook(payload);
  }

  @Post('send-email-otp')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Send 6-digit OTP to email for signup verification' })
  async sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.authService.sendEmailOtp(dto);
  }

  @Post('verify-email-otp')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email OTP; returns verified true if valid' })
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto);
  }
}

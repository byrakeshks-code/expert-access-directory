import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { AuthWebhookPayloadDto } from './dto/auth-webhook.dto';

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
}

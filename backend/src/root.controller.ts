import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';

/**
 * Handles GET / (excluded from global api/v1 prefix in main.ts).
 */
@Controller('/')
export class RootController {
  @Get()
  @Public()
  getRoot() {
    return {
      service: 'expert-access-directory-api',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }
}

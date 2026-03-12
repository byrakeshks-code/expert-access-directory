import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { RefundsService } from './refunds.service';
import { PaginationDto } from '../../common/dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @ApiOperation({ summary: 'List own refunds' })
  async list(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.refundsService.listUserRefunds(user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund details' })
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.refundsService.getRefund(id, user.id);
  }
}

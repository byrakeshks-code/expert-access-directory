import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { BlockedUsersService } from './blocked-users.service';
import { BlockUserDto } from './dto/block-user.dto';

@ApiTags('Blocked Users')
@ApiBearerAuth()
@Controller('blocked-users')
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post()
  @Roles('expert')
  @ApiOperation({ summary: 'Block a user (expert only)' })
  async block(@CurrentUser() user: AuthUser, @Body() dto: BlockUserDto) {
    return this.blockedUsersService.blockUser(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblock(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) blockedId: string) {
    return this.blockedUsersService.unblockUser(user.id, blockedId);
  }

  @Get()
  @ApiOperation({ summary: 'List blocked users' })
  async list(@CurrentUser() user: AuthUser) {
    return this.blockedUsersService.listBlocked(user.id);
  }
}

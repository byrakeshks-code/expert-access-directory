import { Module } from '@nestjs/common';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUsersService } from './blocked-users.service';

@Module({
  controllers: [BlockedUsersController],
  providers: [BlockedUsersService],
  exports: [BlockedUsersService],
})
export class BlockedUsersModule {}

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DomainsModule } from '../domains/domains.module';
import { AuditModule } from '../audit/audit.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [DomainsModule, AuditModule, SearchModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { DomainsService } from './domains.service';

@ApiTags('Domains')
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active domains' })
  async listDomains() {
    return this.domainsService.listDomains();
  }

  @Get(':id/sub-problems')
  @Public()
  @ApiOperation({ summary: 'List guidance areas for a domain' })
  async getSubProblems(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.getSubProblems(id);
  }
}

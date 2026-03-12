import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../common/decorators';
import { SearchService } from './search.service';
import { SearchExpertsDto } from './dto/search-experts.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('experts')
  @Public()
  @ApiOperation({ summary: 'Search experts (query or name mode)' })
  async searchExperts(@Query() dto: SearchExpertsDto) {
    return this.searchService.searchExperts(dto);
  }

  @Get('facets')
  @Public()
  @ApiOperation({ summary: 'Get available search filter facets' })
  async getFacets() {
    return this.searchService.getFacets();
  }
}

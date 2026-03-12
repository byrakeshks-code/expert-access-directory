import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto';

export enum SearchMode {
  QUERY = 'query',
  NAME = 'name',
}

export enum SortOption {
  RELEVANCE = 'relevance',
  FEE_ASC = 'fee_asc',
  FEE_DESC = 'fee_desc',
  RATING = 'rating',
  EXPERIENCE = 'experience',
  RESPONSE_TIME = 'response_time',
}

export class SearchExpertsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query string' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: SearchMode, default: SearchMode.QUERY })
  @IsOptional()
  @IsEnum(SearchMode)
  mode?: SearchMode = SearchMode.QUERY;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: SortOption, default: SortOption.RELEVANCE })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.RELEVANCE;
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review for a completed request' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get('experts/:id/reviews')
  @Public()
  @ApiOperation({ summary: 'List visible reviews for an expert' })
  async getExpertReviews(
    @Param('id', ParseUUIDPipe) expertId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.getExpertReviews(expertId, pagination);
  }

  @Post('reviews/:id/flag')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Flag a review for admin moderation (expert only)' })
  async flagReview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body('reason') reason?: string,
  ) {
    return this.reviewsService.flagReview(user.id, reviewId, reason);
  }
}

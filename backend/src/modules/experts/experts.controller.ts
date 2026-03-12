import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { ExpertsService } from './experts.service';
import { ApplyExpertDto } from './dto/apply-expert.dto';
import {
  UpdateExpertDto,
  UpdateAccessFeeDto,
  UpdateAvailabilityDto,
  AddSpecializationDto,
} from './dto/update-expert.dto';

@ApiTags('Experts')
@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply as an expert — create profile' })
  async apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyExpertDto) {
    return this.expertsService.apply(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own expert profile' })
  async getOwnProfile(@CurrentUser() user: AuthUser) {
    return this.expertsService.getOwnProfile(user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get expert public profile' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.expertsService.getPublicProfile(id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own expert profile' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateExpertDto,
  ) {
    return this.expertsService.updateProfile(user.id, dto);
  }

  @Put('me/access-fee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set/update access fee' })
  async updateAccessFee(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAccessFeeDto,
  ) {
    return this.expertsService.updateAccessFee(user.id, dto);
  }

  @Put('me/availability')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle availability' })
  async updateAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.expertsService.updateAvailability(user.id, dto);
  }

  @Post('me/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload verification document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('document_type') documentType: string,
  ) {
    return this.expertsService.uploadDocument(user.id, file, documentType);
  }

  @Get('me/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own verification documents' })
  async getDocuments(@CurrentUser() user: AuthUser) {
    return this.expertsService.getDocuments(user.id);
  }

  @Post('me/specializations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add specializations' })
  async addSpecializations(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddSpecializationDto,
  ) {
    return this.expertsService.addSpecializations(user.id, dto);
  }

  @Delete('me/specializations/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove specialization' })
  async removeSpecialization(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expertsService.removeSpecialization(user.id, id);
  }
}

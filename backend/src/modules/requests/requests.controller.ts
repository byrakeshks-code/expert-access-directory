import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { RequestsService } from './requests.service';
import {
  CreateRequestDto,
  CreateFreeRequestDto,
  RespondToRequestDto,
  SendMessageDto,
  SharePaymentInfoDto,
  ConfirmPaymentDto,
} from './dto/create-request.dto';
import { PaginationDto } from '../../common/dto';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create access request (after payment verified)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.createRequest(user.id, dto);
  }

  @Post('free')
  @ApiOperation({ summary: 'Create free access request (no payment needed when fee is 0)' })
  async createFree(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFreeRequestDto,
  ) {
    return this.requestsService.createFreeRequest(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own requests (user) or received requests (expert)' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.requestsService.listRequests(user.id, user.role, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request details' })
  async getOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.getRequest(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel request (user)' })
  async cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.cancelRequest(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Accept or reject request (expert)' })
  async respond(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToRequestDto,
  ) {
    return this.requestsService.respondToRequest(id, user.id, dto);
  }

  @Get(':id/response')
  @ApiOperation({ summary: 'Get expert response for a request' })
  async getResponse(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.getResponse(id, user.id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'List conversation messages for an accepted request' })
  async listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requestsService.listMessages(id, user.id, user.role);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in an accepted request conversation' })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.requestsService.sendMessage(id, user.id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close conversation (expert or admin)' })
  async closeConversation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requestsService.closeConversation(id, user.id, user.role);
  }

  // --- Payment Coordination Endpoints ---

  @Post(':id/share-payment-info')
  @ApiOperation({ summary: 'Expert shares payment details (fee, method, UPI/bank info)' })
  async sharePaymentInfo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SharePaymentInfoDto,
  ) {
    return this.requestsService.sharePaymentInfo(id, user.id, dto);
  }

  @Post(':id/upload-receipt')
  @ApiOperation({ summary: 'User uploads payment receipt' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.requestsService.uploadReceipt(id, user.id, file);
  }

  @Post(':id/confirm-payment')
  @ApiOperation({ summary: 'User confirms they have made the payment' })
  async confirmPayment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.requestsService.confirmPayment(id, user.id, dto);
  }

  @Post(':id/verify-payment')
  @ApiOperation({ summary: 'Expert verifies payment receipt' })
  async verifyPayment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.requestsService.verifyPayment(id, user.id, dto);
  }
}

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/decorators';
import { AdminService } from './admin.service';
import { DomainsService } from '../domains/domains.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import { AdminPaginationDto } from '../../common/dto';
import {
  CreateUserDto,
  ResetPasswordDto,
  CreateExpertDto,
  CreateConfigDto,
  UpdateConfigDto,
  UpdateRequestDto,
  UpdatePaymentDto,
  ListVerificationDocsDto,
  ListExpertsQueryDto,
  ListRequestsQueryDto,
  ListPaymentsQueryDto,
  ListRefundsQueryDto,
  ListAuditLogsQueryDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly domainsService: DomainsService,
    private readonly auditService: AuditService,
    private readonly searchService: SearchService,
  ) {}

  // --- Dashboard ---

  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  // --- Users ---

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Query() pagination: AdminPaginationDto) {
    return this.adminService.listUsers(pagination);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.adminService.updateUser(id, body);
  }

  // --- Experts ---

  @Get('experts')
  @ApiOperation({ summary: 'List experts (with optional status filter)' })
  async listExperts(@Query() query: ListExpertsQueryDto) {
    return this.adminService.listExperts(query, query.status);
  }

  @Post('experts/:id/verify')
  @ApiOperation({ summary: 'Approve expert verification' })
  async verifyExpert(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminService.verifyExpert(id, user.id);
  }

  @Post('experts/:id/reject')
  @ApiOperation({ summary: 'Reject expert verification' })
  async rejectExpert(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectExpert(id, reason);
  }

  // --- Domains ---

  @Post('domains')
  @ApiOperation({ summary: 'Create domain' })
  async createDomain(@Body() body: { name: string; slug: string; icon_url?: string }) {
    return this.domainsService.createDomain(body.name, body.slug, body.icon_url);
  }

  @Patch('domains/:id')
  @ApiOperation({ summary: 'Update domain' })
  async updateDomain(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.domainsService.updateDomain(Number(id), body);
  }

  @Post('domains/:id/sub-problems')
  @ApiOperation({ summary: 'Create guidance area' })
  async createSubProblem(
    @Param('id') domainId: string,
    @Body() body: { name: string; slug: string },
  ) {
    return this.domainsService.createSubProblem(Number(domainId), body.name, body.slug);
  }

  @Patch('sub-problems/:id')
  @ApiOperation({ summary: 'Update guidance area' })
  async updateSubProblem(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.domainsService.updateSubProblem(Number(id), body);
  }

  // --- Requests & Payments ---

  @Get('requests')
  @ApiOperation({ summary: 'List all requests' })
  async listRequests(@Query() query: ListRequestsQueryDto) {
    return this.adminService.listRequests(query, { status: query.status, from: query.from, to: query.to });
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments' })
  async listPayments(@Query() query: ListPaymentsQueryDto) {
    return this.adminService.listPayments(query, query.status);
  }

  // --- Refunds ---

  @Get('refunds')
  @ApiOperation({ summary: 'List all refunds' })
  async listRefunds(@Query() query: ListRefundsQueryDto) {
    return this.adminService.listRefunds(query, query.status);
  }

  // --- Reviews ---

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Update review (visibility, rating, comment)' })
  async updateReview(@Param('id') id: string, @Body() body: Record<string, any>) {
    // Support legacy visibility-only toggle and full edit
    if (Object.keys(body).length === 1 && 'is_visible' in body) {
      return this.adminService.toggleReviewVisibility(id, body.is_visible);
    }
    return this.adminService.updateReview(id, body);
  }

  // --- Config ---

  @Get('config')
  @ApiOperation({ summary: 'Get all platform config' })
  async getConfig() {
    return this.adminService.getConfig();
  }

  @Patch('config/:key')
  @ApiOperation({ summary: 'Update config value' })
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateConfig(key, value, user.id);
  }

  // --- Subscription Tiers ---

  @Patch('subscription-tiers/:id')
  @ApiOperation({ summary: 'Update subscription tier' })
  async updateTier(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.adminService.updateTier(id, body);
  }

  // --- Reviews (Admin Listing) ---

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews with user/expert names' })
  async listReviews(@Query() pagination: AdminPaginationDto) {
    return this.adminService.listReviews(pagination);
  }

  // --- Verification Documents ---

  @Get('verification-documents')
  @ApiOperation({ summary: 'List all verification documents' })
  async listVerificationDocuments(@Query() query: ListVerificationDocsDto) {
    return this.adminService.listVerificationDocuments(query, query.status, query.expert_id);
  }

  @Patch('verification-documents/:id')
  @ApiOperation({ summary: 'Update verification document status' })
  async updateVerificationDocument(
    @Param('id') id: string,
    @Body() body: { status?: string; reviewer_notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateVerificationDocument(id, body, user.id);
  }

  // --- Expert Update ---

  @Patch('experts/:id')
  @ApiOperation({ summary: 'Update expert profile fields' })
  async updateExpert(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.adminService.updateExpert(id, body);
  }

  // --- Expert Tags ---

  @Get('tags')
  @ApiOperation({ summary: 'Get all tags used across experts with counts' })
  async getAllTags() {
    return this.adminService.getAllTags();
  }

  @Get('experts/:id/tags')
  @ApiOperation({ summary: 'Get tags for a specific expert' })
  async getExpertTags(@Param('id') id: string) {
    return this.adminService.getExpertTags(id);
  }

  @Patch('experts/:id/tags')
  @ApiOperation({ summary: 'Set tags for an expert (replaces all)' })
  async setExpertTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return this.adminService.setExpertTags(id, tags);
  }

  // --- Expert Specializations ---

  @Get('experts/:id/specializations')
  @ApiOperation({ summary: 'List expert specializations' })
  async getExpertSpecializations(@Param('id') id: string) {
    return this.adminService.getExpertSpecializations(id);
  }

  // --- Refund Processing ---

  @Patch('refunds/:id')
  @ApiOperation({ summary: 'Process or deny a refund' })
  async updateRefund(
    @Param('id') id: string,
    @Body() body: { status: string; gateway_refund_id?: string },
  ) {
    return this.adminService.updateRefund(id, body);
  }

  // --- Domain Deletion ---

  @Delete('domains/:id')
  @ApiOperation({ summary: 'Delete domain' })
  async deleteDomain(@Param('id') id: string) {
    return this.domainsService.deleteDomain(Number(id));
  }

  @Delete('sub-problems/:id')
  @ApiOperation({ summary: 'Delete guidance area' })
  async deleteSubProblem(@Param('id') id: string) {
    return this.domainsService.deleteSubProblem(Number(id));
  }

  // --- Audit Logs ---

  @Get('audit-logs')
  @ApiOperation({ summary: 'Query audit logs' })
  async getAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.queryLogs(query, { actor_id: query.actor, entity: query.entity, action: query.action, from: query.from, to: query.to });
  }

  // --- Create User ---

  @Post('users')
  @ApiOperation({ summary: 'Create new user (auth + public.users)' })
  async createUser(@Body() body: CreateUserDto) {
    return this.adminService.createUser(body);
  }

  // --- Reset Password ---

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() body: ResetPasswordDto) {
    return this.adminService.resetPassword(id, body.new_password);
  }

  // --- Create Expert ---

  @Post('experts')
  @ApiOperation({ summary: 'Create expert (auth user + users + expert profile)' })
  async createExpert(@Body() body: CreateExpertDto) {
    return this.adminService.createExpert(body);
  }

  // --- Subscription Tier CRUD ---

  @Post('subscription-tiers')
  @ApiOperation({ summary: 'Create subscription tier' })
  async createTier(@Body() body: Record<string, any>) {
    return this.adminService.createTier(body);
  }

  @Delete('subscription-tiers/:id')
  @ApiOperation({ summary: 'Deactivate subscription tier' })
  async deleteTier(@Param('id') id: string) {
    return this.adminService.deleteTier(id);
  }

  @Post('subscription-tiers/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate subscription tier' })
  async reactivateTier(@Param('id') id: string) {
    return this.adminService.reactivateTier(id);
  }

  // --- Config CRUD ---

  @Post('config')
  @ApiOperation({ summary: 'Create config entry' })
  async createConfig(@Body() body: CreateConfigDto) {
    return this.adminService.createConfig(body);
  }

  @Delete('config/:key')
  @ApiOperation({ summary: 'Delete config entry' })
  async deleteConfig(@Param('key') key: string) {
    return this.adminService.deleteConfig(key);
  }

  // --- Request Messages & Close (admin) ---

  @Get('requests/:id/messages')
  @ApiOperation({ summary: 'View request conversation messages (admin)' })
  async listRequestMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.listRequestMessages(id);
  }

  @Post('requests/:id/close')
  @ApiOperation({ summary: 'Close request conversation (admin)' })
  async closeRequestConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.closeRequestConversation(id);
  }

  @Post('requests/:id/force-engage')
  @ApiOperation({ summary: 'Force-activate engagement (admin override)' })
  async forceEngageRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.forceEngageRequest(id);
  }

  @Post('requests/:id/force-expire')
  @ApiOperation({ summary: 'Force-expire payment coordination (admin override)' })
  async forceExpireCoordination(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.forceExpireCoordination(id);
  }

  // --- Request Update (admin override) ---

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Update request (admin override)' })
  async updateRequest(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateRequestDto) {
    return this.adminService.updateRequest(id, body);
  }

  // --- Payment Update (admin override) ---

  @Patch('payments/:id')
  @ApiOperation({ summary: 'Update payment (admin override)' })
  async updatePayment(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePaymentDto) {
    return this.adminService.updatePayment(id, body);
  }

  // --- Search Reindex ---

  @Post('search/reindex')
  @ApiOperation({ summary: 'Trigger full Meilisearch reindex' })
  async reindex() {
    return this.searchService.fullReindex();
  }

  // --- Media Management ---

  @Post('media/upload')
  @ApiOperation({ summary: 'Upload file to media storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('bucket') bucket: string,
    @Body('folder') folder?: string,
  ) {
    return this.adminService.uploadMedia(file, bucket || 'media', folder);
  }

  @Get('media')
  @ApiOperation({ summary: 'List files in a storage bucket' })
  async listMedia(
    @Query('bucket') bucket: string,
    @Query('folder') folder?: string,
  ) {
    return this.adminService.listMedia(bucket || 'media', folder);
  }

  @Post('media/rename')
  @ApiOperation({ summary: 'Rename/move a file in storage' })
  async renameMedia(
    @Body('bucket') bucket: string,
    @Body('oldPath') oldPath: string,
    @Body('newPath') newPath: string,
  ) {
    return this.adminService.renameMedia(bucket, oldPath, newPath);
  }

  @Delete('media')
  @ApiOperation({ summary: 'Delete files from storage' })
  async deleteMedia(
    @Body('bucket') bucket: string,
    @Body('paths') paths: string[],
  ) {
    return this.adminService.deleteMedia(bucket, paths);
  }

  @Post('media/public-url')
  @ApiOperation({ summary: 'Get public URL for a file' })
  async getPublicUrl(
    @Body('bucket') bucket: string,
    @Body('path') path: string,
  ) {
    return this.adminService.getPublicUrl(bucket, path);
  }
}

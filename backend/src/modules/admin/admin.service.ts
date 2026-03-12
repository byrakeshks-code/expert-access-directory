import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { SearchService } from '../search/search.service';
import { AdminPaginationDto } from '../../common/dto';

@Injectable()
export class AdminService {
  constructor(
    private supabaseService: SupabaseService,
    private searchService: SearchService,
  ) {}

  private get db() {
    return this.supabaseService.getServiceClient();
  }

  // --- Dashboard ---

  async getDashboardMetrics() {
    try {
      const [experts, requests, revenueResult, refunds, pendingVerifications] =
        await Promise.all([
          this.db.from('experts').select('id', { count: 'exact', head: true }),
          this.db.from('access_requests').select('id', { count: 'exact', head: true }),
          // Use DB-side aggregation instead of fetching all rows
          this.db.rpc('sum_paid_revenue').single(),
          this.db.from('refunds').select('id', { count: 'exact', head: true }),
          this.db.from('experts').select('id', { count: 'exact', head: true }).in('verification_status', ['pending', 'under_review']),
        ]);

      // Fallback: if the RPC doesn't exist, use client-side sum
      let totalRevenue = (revenueResult.data as any)?.total ?? null;
      if (totalRevenue === null) {
        const { data: payments } = await this.db
          .from('access_payments')
          .select('amount_minor')
          .eq('status', 'paid');
        totalRevenue = (payments || []).reduce(
          (sum: number, p: any) => sum + (p.amount_minor || 0),
          0,
        );
      }

      return {
        total_experts: experts.count || 0,
        total_requests: requests.count || 0,
        total_revenue_minor: totalRevenue,
        total_refunds: refunds.count || 0,
        pending_verifications: pendingVerifications.count || 0,
      };
    } catch {
      return {
        total_experts: 0,
        total_requests: 0,
        total_revenue_minor: 0,
        total_refunds: 0,
        pending_verifications: 0,
      };
    }
  }

  // --- Users ---

  async listUsers(pagination: AdminPaginationDto) {
    try {
      const { data, count, error } = await this.db
        .from('users')
        .select('*, experts(verification_status)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  private static readonly USER_COLUMNS = new Set([
    'full_name', 'email', 'phone', 'country_code', 'timezone',
    'preferred_lang', 'avatar_url', 'role', 'is_active',
  ]);

  async updateUser(userId: string, updates: Record<string, any>) {
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (AdminService.USER_COLUMNS.has(key)) {
        filtered[key] = value;
      }
    }
    if (Object.keys(filtered).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const { data, error } = await this.db
      .from('users')
      .update(filtered)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('User not found');
      throw new BadRequestException(`User update failed: ${error.message}`);
    }
    return data;
  }

  // --- Experts ---

  async listExperts(pagination: AdminPaginationDto, status?: string) {
    try {
      let query = this.db
        .from('experts')
        .select('*, users!inner(full_name, email)', { count: 'exact' });

      if (status) query = query.eq('verification_status', status);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  async verifyExpert(expertId: string, adminId: string) {
    const { data, error } = await this.db
      .from('experts')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('id', expertId)
      .select()
      .single();

    if (error) throw new NotFoundException('Expert not found');

    // Update user role to expert
    await this.db
      .from('users')
      .update({ role: 'expert' })
      .eq('id', data.user_id);

    // Sync search index — add verified expert to search
    this.searchService.updateDocument(expertId).catch(() => {});

    return data;
  }

  async rejectExpert(expertId: string, reason?: string) {
    const { data, error } = await this.db
      .from('experts')
      .update({ verification_status: 'rejected' })
      .eq('id', expertId)
      .select()
      .single();

    if (error) throw new NotFoundException('Expert not found');

    // Add reviewer notes to the latest verification document
    if (reason) {
      await this.db
        .from('verification_documents')
        .update({ reviewer_notes: reason, status: 'rejected' })
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    // Remove rejected expert from search index
    this.searchService.removeDocument(expertId).catch(() => {});

    return data;
  }

  // --- Requests ---

  async listRequests(pagination: AdminPaginationDto, filters?: { status?: string; from?: string; to?: string }) {
    try {
      let query = this.db
        .from('access_requests')
        .select('*, users(full_name), experts(headline, users!inner(full_name))', { count: 'exact' });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.from) query = query.gte('created_at', filters.from);
      if (filters?.to) query = query.lte('created_at', filters.to);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  // --- Payments ---

  async listPayments(pagination: AdminPaginationDto, status?: string) {
    try {
      let query = this.db
        .from('access_payments')
        .select('*, users(full_name, email)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  // --- Refunds ---

  async listRefunds(pagination: AdminPaginationDto, status?: string) {
    try {
      let query = this.db
        .from('refunds')
        .select('*, users(full_name, email), access_payments(*)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  // --- Reviews ---

  async toggleReviewVisibility(reviewId: string, isVisible: boolean) {
    const { data, error } = await this.db
      .from('reviews')
      .update({ is_visible: isVisible })
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw new NotFoundException('Review not found');
    return data;
  }

  async updateReview(reviewId: string, updates: Record<string, any>) {
    const { data, error } = await this.db
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw new NotFoundException('Review not found');
    return data;
  }

  // --- Config ---

  async getConfig() {
    try {
      const { data, error } = await this.db
        .from('platform_config')
        .select('*')
        .order('key');
      if (error) return [];
      return data;
    } catch {
      return [];
    }
  }

  async updateConfig(key: string, value: any, adminId: string) {
    const { data, error } = await this.db
      .from('platform_config')
      .update({ value, updated_by: adminId, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    if (error) throw new NotFoundException(`Config key "${key}" not found`);
    return data;
  }

  // --- Subscription Tiers ---

  async updateTier(tierId: string, updates: Record<string, any>) {
    const { data, error } = await this.db
      .from('subscription_tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();
    if (error) throw new NotFoundException('Tier not found');
    return data;
  }

  // --- Reviews (Admin Listing) ---

  async listReviews(pagination: AdminPaginationDto) {
    try {
      const { data, count, error } = await this.db
        .from('reviews')
        .select('*, users(full_name, email), experts(headline, users!inner(full_name))', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  // --- Verification Documents ---

  async listVerificationDocuments(pagination: AdminPaginationDto, status?: string, expertId?: string) {
    try {
      let query = this.db
        .from('verification_documents')
        .select('*, experts!inner(headline, users!inner(full_name, email))', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + (pagination.limit ?? 500) - 1);

      if (error) return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
      return { data, meta: { total: count, page: pagination.page, limit: pagination.limit } };
    } catch {
      return { data: [], meta: { total: 0, page: pagination.page, limit: pagination.limit } };
    }
  }

  async updateVerificationDocument(docId: string, updates: { status?: string; reviewer_notes?: string }, adminId: string) {
    const updatePayload: Record<string, any> = { ...updates };
    if (updates.status === 'verified' || updates.status === 'rejected') {
      updatePayload.reviewed_at = new Date().toISOString();
      // Only set reviewed_by if the admin user exists in public.users (avoids FK violation in dev mode)
      const { data: adminUser } = await this.db.from('users').select('id').eq('id', adminId).single();
      if (adminUser) {
        updatePayload.reviewed_by = adminId;
      }
    }

    const { data, error } = await this.db
      .from('verification_documents')
      .update(updatePayload)
      .eq('id', docId)
      .select()
      .single();
    if (error) throw new NotFoundException(`Document update failed: ${error.message}`);
    return data;
  }

  // --- Expert Update ---

  private static readonly EXPERT_COLUMNS = new Set([
    'headline', 'bio', 'avatar_url', 'primary_domain', 'years_of_experience',
    'city', 'country', 'languages', 'linkedin_url', 'website_url',
    'access_fee_minor', 'access_fee_currency', 'current_tier',
    'verification_status', 'is_available', 'max_requests_per_day',
    'avg_response_hours', 'search_boost', 'tags',
  ]);

  async updateExpert(expertId: string, updates: Record<string, any>) {
    // Filter to only valid expert columns
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (AdminService.EXPERT_COLUMNS.has(key)) {
        filtered[key] = value;
      }
    }

    if (Object.keys(filtered).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const { data, error } = await this.db
      .from('experts')
      .update(filtered)
      .eq('id', expertId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('Expert not found');
      throw new BadRequestException(`Expert update failed: ${error.message}`);
    }

    // Sync search index
    this.searchService.updateDocument(expertId).catch(() => {});

    return data;
  }

  // --- Expert Tags ---

  async getExpertTags(expertId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('experts')
      .select('tags')
      .eq('id', expertId)
      .single();
    if (error) throw new NotFoundException('Expert not found');
    return data?.tags || [];
  }

  async setExpertTags(expertId: string, tags: string[]) {
    const cleaned = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    const unique = [...new Set(cleaned)];
    const { data, error } = await this.db
      .from('experts')
      .update({ tags: unique })
      .eq('id', expertId)
      .select('id, tags')
      .single();
    if (error) throw new NotFoundException('Expert not found');
    this.searchService.updateDocument(expertId).catch(() => {});
    return data;
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    const { data, error } = await this.db
      .from('experts')
      .select('tags');
    if (error) return [];
    const tagMap = new Map<string, number>();
    for (const row of data || []) {
      for (const tag of row.tags || []) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  // --- Expert Specializations ---

  async getExpertSpecializations(expertId: string) {
    const { data, error } = await this.db
      .from('expert_specializations')
      .select('*, sub_problems(name, slug, domains(name))')
      .eq('expert_id', expertId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data;
  }

  // --- Refund Processing ---

  async updateRefund(refundId: string, updates: { status: string; gateway_refund_id?: string }) {
    const updatePayload: Record<string, any> = { status: updates.status };
    if (updates.gateway_refund_id) updatePayload.gateway_refund_id = updates.gateway_refund_id;
    if (updates.status === 'processed') updatePayload.processed_at = new Date().toISOString();

    const { data, error } = await this.db
      .from('refunds')
      .update(updatePayload)
      .eq('id', refundId)
      .select()
      .single();
    if (error) throw new NotFoundException('Refund not found');
    return data;
  }

  // --- Create User (auth + public.users) ---

  async createUser(body: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    phone?: string;
    country_code?: string;
    timezone?: string;
    preferred_lang?: string;
  }) {
    const { data: authData, error: authError } = await this.db.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (authError) throw new BadRequestException(`Auth error: ${authError.message}`);

    const { data, error } = await this.db.from('users').insert({
      id: authData.user.id,
      email: body.email,
      full_name: body.full_name,
      role: body.role || 'user',
      phone: body.phone || null,
      country_code: body.country_code || 'IN',
      timezone: body.timezone || 'Asia/Kolkata',
      preferred_lang: body.preferred_lang || 'en',
      is_active: true,
    }).select().single();

    if (error) throw new BadRequestException(`DB error: ${error.message}`);
    return data;
  }

  // --- Reset Password ---

  async resetPassword(userId: string, newPassword: string) {
    const { error } = await this.db.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new BadRequestException(`Reset failed: ${error.message}`);
    return { success: true, message: 'Password reset successfully' };
  }

  // --- Create Expert (auth user + public.users + experts) ---

  async createExpert(body: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    country_code?: string;
    headline: string;
    bio?: string;
    primary_domain?: string;
    years_of_experience?: number;
    city?: string;
    country?: string;
    languages?: string[];
    linkedin_url?: string;
    website_url?: string;
    access_fee_minor?: number;
    access_fee_currency?: string;
    current_tier?: string;
    verification_status?: string;
  }) {
    // Create auth user
    const { data: authData, error: authError } = await this.db.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (authError) throw new BadRequestException(`Auth error: ${authError.message}`);

    const userId = authData.user.id;

    // Create public.users record
    await this.db.from('users').insert({
      id: userId,
      email: body.email,
      full_name: body.full_name,
      role: 'expert',
      phone: body.phone || null,
      country_code: body.country_code || 'IN',
      timezone: 'Asia/Kolkata',
      preferred_lang: 'en',
      is_active: true,
    });

    // Create expert profile
    const { data, error } = await this.db.from('experts').insert({
      user_id: userId,
      headline: body.headline,
      bio: body.bio || null,
      primary_domain: body.primary_domain || null,
      years_of_experience: body.years_of_experience || null,
      city: body.city || null,
      country: body.country || null,
      languages: body.languages || ['en'],
      linkedin_url: body.linkedin_url || null,
      website_url: body.website_url || null,
      access_fee_minor: body.access_fee_minor || 0,
      access_fee_currency: body.access_fee_currency || 'INR',
      current_tier: body.current_tier || 'starter',
      verification_status: body.verification_status || 'pending',
    }).select().single();

    if (error) throw new BadRequestException(`Expert creation failed: ${error.message}`);
    return data;
  }

  // --- Create Subscription Tier ---

  async createTier(body: Record<string, any>) {
    const { data, error } = await this.db
      .from('subscription_tiers')
      .insert(body)
      .select()
      .single();
    if (error) throw new BadRequestException(`Failed to create tier: ${error.message}`);
    return data;
  }

  // --- Soft-delete Subscription Tier ---

  async deleteTier(tierId: string) {
    const { data, error } = await this.db
      .from('subscription_tiers')
      .update({ is_active: false })
      .eq('id', tierId)
      .select()
      .single();
    if (error) throw new NotFoundException('Tier not found');
    return data;
  }

  // --- Reactivate Subscription Tier ---

  async reactivateTier(tierId: string) {
    const { data, error } = await this.db
      .from('subscription_tiers')
      .update({ is_active: true })
      .eq('id', tierId)
      .select()
      .single();
    if (error) throw new NotFoundException('Tier not found');
    return data;
  }

  // --- Create Config ---

  async createConfig(body: { key: string; value: any; description?: string }) {
    const { data, error } = await this.db
      .from('platform_config')
      .insert({ key: body.key, value: body.value, description: body.description || '' })
      .select()
      .single();
    if (error) throw new BadRequestException(`Failed to create config: ${error.message}`);
    return data;
  }

  // --- Delete Config ---

  async deleteConfig(key: string) {
    const { error } = await this.db
      .from('platform_config')
      .delete()
      .eq('key', key);
    if (error) throw new NotFoundException(`Config key "${key}" not found`);
    return { deleted: true };
  }

  // --- Request Messages (admin) ---

  async listRequestMessages(requestId: string) {
    const { data, error } = await this.db
      .from('request_messages')
      .select('*, users:sender_id(full_name, avatar_url)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async closeRequestConversation(requestId: string) {
    const { data, error } = await this.db
      .from('access_requests')
      .update({ status: 'closed' })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw new NotFoundException('Request not found or cannot be closed');
    return data;
  }

  async forceEngageRequest(requestId: string) {
    const { data, error } = await this.db
      .from('access_requests')
      .update({
        status: 'engaged',
        user_payment_confirmed: true,
        expert_payment_confirmed: true,
      })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw new NotFoundException('Request not found');

    await this.db.from('request_messages').insert({
      request_id: requestId,
      sender_id: data.user_id,
      body: 'Engagement activated by admin.',
      message_type: 'system',
    });

    return data;
  }

  async forceExpireCoordination(requestId: string) {
    const { data, error } = await this.db
      .from('access_requests')
      .update({ status: 'coordination_expired' })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw new NotFoundException('Request not found');

    await this.db.from('request_messages').insert({
      request_id: requestId,
      sender_id: data.user_id,
      body: 'Payment coordination expired by admin.',
      message_type: 'system',
    });

    return data;
  }

  // --- Update Request (admin override) ---

  async updateRequest(requestId: string, updates: Record<string, any>) {
    const { data, error } = await this.db
      .from('access_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw new NotFoundException('Request not found');
    return data;
  }

  // --- Update Payment (admin override) ---

  async updatePayment(paymentId: string, updates: Record<string, any>) {
    const { data, error } = await this.db
      .from('access_payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();
    if (error) throw new NotFoundException('Payment not found');
    return data;
  }

  // --- Media Management ---

  private async ensureBucket(bucket: string) {
    try {
      await this.db.storage.createBucket(bucket, { public: true, fileSizeLimit: 10485760 });
    } catch {
      // Bucket already exists
    }
  }

  async uploadMedia(file: Express.Multer.File, bucket: string, folder?: string) {
    await this.ensureBucket(bucket);

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = folder
      ? `${folder}/${Date.now()}-${safeName}`
      : `${Date.now()}-${safeName}`;

    const { error: uploadError } = await this.db.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = this.db.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      bucket,
      url: urlData.publicUrl,
      name: safeName,
      size: file.size,
      type: file.mimetype,
    };
  }

  async listMedia(bucket: string, folder?: string) {
    await this.ensureBucket(bucket);

    const { data, error } = await this.db.storage
      .from(bucket)
      .list(folder || '', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw new BadRequestException(`List failed: ${error.message}`);

    // Enrich with public URLs
    const files = (data || [])
      .filter((f) => f.name !== '.emptyFolderPlaceholder')
      .map((f) => {
        const fullPath = folder ? `${folder}/${f.name}` : f.name;
        const { data: urlData } = this.db.storage.from(bucket).getPublicUrl(fullPath);
        return {
          ...f,
          path: fullPath,
          bucket,
          url: urlData.publicUrl,
        };
      });

    return files;
  }

  async renameMedia(bucket: string, oldPath: string, newPath: string) {
    const { error } = await this.db.storage
      .from(bucket)
      .move(oldPath, newPath);

    if (error) throw new BadRequestException(`Rename failed: ${error.message}`);

    const { data: urlData } = this.db.storage.from(bucket).getPublicUrl(newPath);
    return { path: newPath, url: urlData.publicUrl };
  }

  async deleteMedia(bucket: string, paths: string[]) {
    const { error } = await this.db.storage
      .from(bucket)
      .remove(paths);

    if (error) throw new BadRequestException(`Delete failed: ${error.message}`);
    return { deleted: paths.length };
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.db.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  }
}

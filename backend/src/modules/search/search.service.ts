import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { SupabaseService } from '../../config/supabase.config';
import { SearchExpertsDto, SearchMode, SortOption } from './dto/search-experts.dto';

const INDEX_NAME = 'experts';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private index: Index;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    this.client = new MeiliSearch({
      host: this.configService.get<string>('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: this.configService.get<string>('MEILISEARCH_API_KEY', ''),
    });
  }

  async onModuleInit() {
    try {
      await this.setupIndex();
      this.logger.log('Meilisearch index configured');
    } catch (err) {
      this.logger.warn(`Meilisearch setup skipped (not available): ${(err as Error).message}`);
    }
  }

  private async setupIndex() {
    // Create index if not exists
    try {
      await this.client.createIndex(INDEX_NAME, { primaryKey: 'expert_id' });
    } catch {
      // Index may already exist
    }

    this.index = this.client.index(INDEX_NAME);

    // Configure searchable attributes (order matters — higher priority first)
    await this.index.updateSearchableAttributes([
      'headline',
      'tags',
      'primary_domain',
      'sub_problems',
      'bio',
      'full_name',
      'city',
      'country',
      'languages',
    ]);

    // Configure filterable attributes
    await this.index.updateFilterableAttributes([
      'primary_domain',
      'sub_problems',
      'tags',
      'city',
      'country',
      'languages',
      'is_available',
      'access_fee_minor',
      'rating_avg',
      'current_tier',
    ]);

    // Configure sortable attributes
    await this.index.updateSortableAttributes([
      'access_fee_minor',
      'rating_avg',
      'years_of_experience',
      'avg_response_hours',
      'search_boost',
    ]);

    // Ranking rules with search_boost as a custom rule
    await this.index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'search_boost:desc',
    ]);
  }

  async fullReindex() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('experts_search_view')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch experts for reindex: ${error.message}`);
    }

    if (data && data.length > 0) {
      await this.index.addDocuments(data);
    }

    this.logger.log(`Reindexed ${data?.length || 0} experts`);
    return { indexed: data?.length || 0 };
  }

  async updateDocument(expertId: string) {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('experts_search_view')
      .select('*')
      .eq('expert_id', expertId)
      .single();

    if (error || !data) {
      // Expert might have been un-verified, remove from index
      try {
        await this.index.deleteDocument(expertId);
      } catch {
        // Ignore if not found
      }
      return;
    }

    await this.index.addDocuments([data]);
  }

  async removeDocument(expertId: string) {
    try {
      await this.index.deleteDocument(expertId);
    } catch {
      // Ignore
    }
  }

  /**
   * Resolve a domain parameter (could be UUID, numeric ID, name, or slug)
   * to the actual domain name used in experts_search_view.
   */
  private async resolveDomainName(domain: string): Promise<string> {
    const supabase = this.supabaseService.getServiceClient();

    // Try lookup by ID first (UUID or numeric)
    const { data } = await supabase
      .from('domains')
      .select('name')
      .or(`id.eq.${domain},slug.eq.${domain},name.ilike.${domain}`)
      .limit(1)
      .single();

    if (data?.name) return data.name;

    // Return as-is (might be a name already)
    return domain;
  }

  async searchExperts(dto: SearchExpertsDto) {
    const query = dto.q || '';
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    // Resolve domain ID/slug to domain name if provided
    if (dto.domain) {
      dto.domain = await this.resolveDomainName(dto.domain);
    }

    // Try Meilisearch first, fall back to Supabase if unavailable
    try {
      return await this.searchViaMeilisearch(dto, query, page, limit);
    } catch (err) {
      this.logger.warn(
        `Meilisearch unavailable, falling back to database search: ${(err as Error).message}`,
      );
      return await this.searchViaSupabase(dto, query, page, limit);
    }
  }

  private async searchViaMeilisearch(
    dto: SearchExpertsDto,
    query: string,
    page: number,
    limit: number,
  ) {
    // Build filter array
    const filters: string[] = ['is_available = true'];

    if (dto.domain) {
      filters.push(`primary_domain = "${dto.domain}"`);
    }
    if (dto.country) {
      filters.push(`country = "${dto.country}"`);
    }
    if (dto.language) {
      filters.push(`languages = "${dto.language}"`);
    }
    if (dto.tag) {
      filters.push(`tags = "${dto.tag}"`);
    }

    // Build sort
    const sort: string[] = [];
    switch (dto.sort) {
      case SortOption.FEE_ASC:
        sort.push('access_fee_minor:asc');
        break;
      case SortOption.FEE_DESC:
        sort.push('access_fee_minor:desc');
        break;
      case SortOption.RATING:
        sort.push('rating_avg:desc');
        break;
      case SortOption.EXPERIENCE:
        sort.push('years_of_experience:desc');
        break;
      case SortOption.RESPONSE_TIME:
        sort.push('avg_response_hours:asc');
        break;
      default:
        sort.push('search_boost:desc');
    }

    const searchableAttributes =
      dto.mode === SearchMode.NAME
        ? ['full_name']
        : ['headline', 'tags', 'primary_domain', 'sub_problems', 'bio', 'city', 'country'];

    const results = await this.index.search(query, {
      filter: filters.join(' AND '),
      sort,
      offset: (page - 1) * limit,
      limit,
      attributesToSearchOn: searchableAttributes,
    });

    return {
      data: results.hits,
      meta: {
        query,
        mode: dto.mode,
        page,
        limit,
        total: results.estimatedTotalHits || 0,
        processingTimeMs: results.processingTimeMs,
      },
    };
  }

  private async searchViaSupabase(
    dto: SearchExpertsDto,
    query: string,
    page: number,
    limit: number,
  ) {
    const supabase = this.supabaseService.getServiceClient();

    let qb = supabase
      .from('experts_search_view')
      .select('*', { count: 'exact' });

    // Text search via ilike on relevant columns (including bio/description and tags)
    if (query) {
      const pattern = `%${query}%`;
      if (dto.mode === SearchMode.NAME) {
        qb = qb.ilike('full_name', pattern);
      } else {
        qb = qb.or(
          `headline.ilike.${pattern},bio.ilike.${pattern},primary_domain.ilike.${pattern},full_name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},tags.cs.{${query.toLowerCase()}}`,
        );
      }
    }

    if (dto.domain) {
      qb = qb.ilike('primary_domain', dto.domain);
    }
    if (dto.country) {
      qb = qb.ilike('country', `%${dto.country}%`);
    }
    if (dto.tag) {
      qb = qb.contains('tags', [dto.tag.toLowerCase()]);
    }

    // Sort
    switch (dto.sort) {
      case SortOption.FEE_ASC:
        qb = qb.order('access_fee_minor', { ascending: true });
        break;
      case SortOption.FEE_DESC:
        qb = qb.order('access_fee_minor', { ascending: false });
        break;
      case SortOption.RATING:
        qb = qb.order('rating_avg', { ascending: false, nullsFirst: false });
        break;
      case SortOption.EXPERIENCE:
        qb = qb.order('years_of_experience', { ascending: false, nullsFirst: false });
        break;
      default:
        qb = qb.order('rating_avg', { ascending: false, nullsFirst: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    qb = qb.range(from, from + limit - 1);

    const { data, error, count } = await qb;

    if (error) {
      this.logger.error(`Supabase search fallback failed: ${error.message}`);
      return { data: [], meta: { query, mode: dto.mode, page, limit, total: 0 } };
    }

    return {
      data: data || [],
      meta: {
        query,
        mode: dto.mode,
        page,
        limit,
        total: count || (data?.length ?? 0),
        processingTimeMs: 0,
      },
    };
  }

  async getFacets() {
    const supabase = this.supabaseService.getServiceClient();

    const [domainsRes, countriesRes, tagsRes] = await Promise.all([
      supabase
        .from('domains')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('experts')
        .select('country')
        .eq('verification_status', 'verified')
        .eq('is_available', true)
        .not('country', 'is', null),
      supabase
        .from('experts')
        .select('tags')
        .eq('verification_status', 'verified')
        .eq('is_available', true),
    ]);

    const uniqueCountries = [
      ...new Set((countriesRes.data || []).map((e: any) => e.country)),
    ];

    // Aggregate all unique tags with counts
    const tagMap = new Map<string, number>();
    for (const row of tagsRes.data || []) {
      for (const tag of row.tags || []) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
    const tags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return {
      domains: domainsRes.data || [],
      countries: uniqueCountries,
      tags,
    };
  }
}

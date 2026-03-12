/**
 * Comprehensive Seed Script for Expert Access Directory
 *
 * Creates realistic sample data covering ALL tables, ALL enum values,
 * ALL relationship paths, and ALL business use cases.
 *
 * Usage: npx ts-node src/seed.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// User definitions — auth + public.users
// ============================================================

const USERS = [
  // Admin
  {
    email: 'admin@expertaccess.dev',
    password: 'Admin@123456',
    full_name: 'Platform Admin',
    role: 'admin',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9000000001',
    is_active: true,
  },
  // Regular users
  {
    email: 'vikram.singh@gmail.com',
    password: 'User@123456',
    full_name: 'Vikram Singh',
    role: 'user',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9876543210',
    is_active: true,
  },
  {
    email: 'emily.chen@gmail.com',
    password: 'User@123456',
    full_name: 'Emily Chen',
    role: 'user',
    country_code: 'US',
    timezone: 'America/New_York',
    phone: '+1-5551234567',
    is_active: true,
  },
  {
    email: 'james.wilson@gmail.com',
    password: 'User@123456',
    full_name: 'James Wilson',
    role: 'user',
    country_code: 'US',
    timezone: 'America/Los_Angeles',
    phone: '+1-5559876543',
    is_active: false, // deactivated account
  },
  {
    email: 'blocked.user@gmail.com',
    password: 'User@123456',
    full_name: 'Blocked User',
    role: 'user',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9111111111',
    is_active: true,
  },
  // Expert users
  {
    email: 'priya.sharma@lawfirm.in',
    password: 'Expert@123456',
    full_name: 'Dr. Priya Sharma',
    role: 'expert',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9800000001',
    is_active: true,
  },
  {
    email: 'rahul.mehta@techcorp.in',
    password: 'Expert@123456',
    full_name: 'Rahul Mehta',
    role: 'expert',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9800000002',
    is_active: true,
  },
  {
    email: 'sarah.johnson@finance.us',
    password: 'Expert@123456',
    full_name: 'Sarah Johnson',
    role: 'user', // stays user until verified — will be set to expert
    country_code: 'US',
    timezone: 'America/Chicago',
    phone: '+1-5552223333',
    is_active: true,
  },
  {
    email: 'david.kim@health.us',
    password: 'Expert@123456',
    full_name: 'David Kim',
    role: 'expert',
    country_code: 'US',
    timezone: 'America/Los_Angeles',
    phone: '+1-5554445555',
    is_active: true,
  },
  {
    email: 'aisha.patel@educator.in',
    password: 'Expert@123456',
    full_name: 'Aisha Patel',
    role: 'user', // pending verification — stays user
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    phone: '+91-9800000005',
    is_active: true,
  },
];

// ============================================================
// Main seed function
// ============================================================

async function seed() {
  console.log('=== Expert Access Directory — Seed Script ===\n');

  // ----------------------------------------------------------
  // Step 1: Create auth users and public.users
  // ----------------------------------------------------------
  console.log('[1/10] Creating auth users...');
  const userIds: Record<string, string> = {};

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    if (error) {
      // User already exists — look up their ID instead of skipping
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find((eu: any) => eu.email === u.email);
      if (existingUser) {
        userIds[u.email] = existingUser.id;
        console.log(`  Existing: ${u.full_name} (${u.email}) → ${existingUser.id}`);
      } else {
        console.error(`  Failed to create or find ${u.email}: ${error.message}`);
      }
      continue;
    }

    userIds[u.email] = data.user.id;
    console.log(`  Created: ${u.full_name} (${u.email}) → ${data.user.id}`);
  }

  // Insert/update public.users records
  console.log('\n[2/10] Creating public.users records...');
  let userCount = 0;
  for (const u of USERS) {
    const id = userIds[u.email];
    if (!id) continue;

    const { error } = await supabase.from('users').upsert({
      id,
      role: u.role,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      country_code: u.country_code,
      timezone: u.timezone,
      preferred_lang: 'en',
      is_active: u.is_active,
    }, { onConflict: 'id' });

    if (error) console.error(`  Failed public.users for ${u.email}: ${error.message}`);
    else userCount++;
  }
  console.log(`  Upserted ${userCount} users`);

  // ----------------------------------------------------------
  // Step 2: Domains & Sub-Problems
  // ----------------------------------------------------------
  console.log('\n[3/10] Creating domains & sub-problems...');

  // Clean existing
  await supabase.from('expert_specializations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sub_problems').delete().neq('id', 0);
  await supabase.from('domains').delete().neq('id', 0);

  const domainData = [
    {
      name: 'Legal',
      slug: 'legal',
      icon_url: 'https://cdn.example.com/icons/legal.svg',
      sort_order: 1,
      subs: [
        { name: 'Property Dispute', slug: 'property-dispute' },
        { name: 'Business Contract Review', slug: 'business-contract-review' },
        { name: 'Divorce & Family Law', slug: 'divorce-family-law' },
        { name: 'Intellectual Property', slug: 'intellectual-property' },
      ],
    },
    {
      name: 'Technology',
      slug: 'technology',
      icon_url: 'https://cdn.example.com/icons/tech.svg',
      sort_order: 2,
      subs: [
        { name: 'System Architecture', slug: 'system-architecture' },
        { name: 'Cloud Migration', slug: 'cloud-migration' },
        { name: 'Cybersecurity Audit', slug: 'cybersecurity-audit' },
        { name: 'AI/ML Strategy', slug: 'ai-ml-strategy' },
      ],
    },
    {
      name: 'Finance',
      slug: 'finance',
      icon_url: 'https://cdn.example.com/icons/finance.svg',
      sort_order: 3,
      subs: [
        { name: 'Tax Planning', slug: 'tax-planning' },
        { name: 'Investment Strategy', slug: 'investment-strategy' },
        { name: 'Startup Fundraising', slug: 'startup-fundraising' },
      ],
    },
    {
      name: 'Health & Wellness',
      slug: 'health-wellness',
      icon_url: 'https://cdn.example.com/icons/health.svg',
      sort_order: 4,
      subs: [
        { name: 'Nutrition Planning', slug: 'nutrition-planning' },
        { name: 'Mental Health Guidance', slug: 'mental-health-guidance' },
        { name: 'Chronic Disease Management', slug: 'chronic-disease-management' },
      ],
    },
    {
      name: 'Education',
      slug: 'education',
      icon_url: 'https://cdn.example.com/icons/education.svg',
      sort_order: 5,
      subs: [
        { name: 'College Admissions', slug: 'college-admissions' },
        { name: 'Career Counseling', slug: 'career-counseling' },
        { name: 'Curriculum Design', slug: 'curriculum-design' },
      ],
    },
  ];

  const domainIds: Record<string, number> = {};
  const subProblemIds: Record<string, number> = {};

  for (const d of domainData) {
    const { data: dom, error } = await supabase
      .from('domains')
      .insert({ name: d.name, slug: d.slug, icon_url: d.icon_url, sort_order: d.sort_order })
      .select()
      .single();
    if (error) {
      console.error(`  Domain ${d.name}: ${error.message}`);
      continue;
    }
    domainIds[d.slug] = dom.id;

    for (let i = 0; i < d.subs.length; i++) {
      const s = d.subs[i];
      const { data: sub, error: subErr } = await supabase
        .from('sub_problems')
        .insert({ domain_id: dom.id, name: s.name, slug: s.slug, sort_order: i + 1 })
        .select()
        .single();
      if (subErr) {
        console.error(`  Sub-problem ${s.name}: ${subErr.message}`);
      } else {
        subProblemIds[s.slug] = sub.id;
      }
    }
  }
  console.log(`  Created ${Object.keys(domainIds).length} domains, ${Object.keys(subProblemIds).length} sub-problems`);

  // ----------------------------------------------------------
  // Step 3: Expert Profiles
  // ----------------------------------------------------------
  console.log('\n[4/10] Creating expert profiles...');

  const expertDefs = [
    {
      userEmail: 'priya.sharma@lawfirm.in',
      headline: 'Senior Advocate — Supreme Court of India | 20+ years in Property & IP Law',
      bio: 'Dr. Priya Sharma is a seasoned legal professional with over two decades of experience in property disputes, intellectual property, and corporate law. She has represented clients before the Supreme Court and multiple High Courts across India.',
      primary_domain: 'Legal',
      years_of_experience: 22,
      city: 'New Delhi',
      country: 'India',
      languages: ['en', 'hi'],
      linkedin_url: 'https://linkedin.com/in/priya-sharma-advocate',
      website_url: 'https://sharmalawfirm.in',
      access_fee_minor: 2499, // ₹2,499
      access_fee_currency: 'INR',
      current_tier: 'elite' as const,
      verification_status: 'verified' as const,
      verified_at: new Date('2024-06-15').toISOString(),
      is_available: true,
      max_requests_per_day: 999,
      avg_response_hours: 4.2,
    },
    {
      userEmail: 'rahul.mehta@techcorp.in',
      headline: 'CTO & Cloud Architect | AWS Solutions Architect Professional',
      bio: 'Rahul is a technology leader with 15 years of experience in distributed systems, cloud architecture, and AI/ML. Previously VP of Engineering at a unicorn startup. Helps companies navigate digital transformation.',
      primary_domain: 'Technology',
      years_of_experience: 15,
      city: 'Bengaluru',
      country: 'India',
      languages: ['en', 'hi', 'kn'],
      linkedin_url: 'https://linkedin.com/in/rahul-mehta-cto',
      website_url: 'https://rahulmehta.dev',
      access_fee_minor: 1499, // ₹1,499
      access_fee_currency: 'INR',
      current_tier: 'pro' as const,
      verification_status: 'verified' as const,
      verified_at: new Date('2024-08-20').toISOString(),
      is_available: true,
      max_requests_per_day: 30,
      avg_response_hours: 8.5,
    },
    {
      userEmail: 'sarah.johnson@finance.us',
      headline: 'CFA Charterholder | Tax & Investment Advisor for Startups',
      bio: 'Sarah advises early-stage startups and high-net-worth individuals on tax strategy, fundraising, and portfolio management. 10 years at Goldman Sachs before going independent.',
      primary_domain: 'Finance',
      years_of_experience: 12,
      city: 'Chicago',
      country: 'United States',
      languages: ['en', 'es'],
      linkedin_url: 'https://linkedin.com/in/sarah-johnson-cfa',
      website_url: null,
      access_fee_minor: 50, // $50
      access_fee_currency: 'USD',
      current_tier: 'starter' as const,
      verification_status: 'verified' as const,
      verified_at: new Date('2024-10-01').toISOString(),
      is_available: true,
      max_requests_per_day: 10,
      avg_response_hours: 24.0,
    },
    {
      userEmail: 'david.kim@health.us',
      headline: 'Board-Certified Nutritionist | Chronic Disease Management Specialist',
      bio: 'Dr. David Kim specializes in evidence-based nutrition therapy for chronic conditions including diabetes, heart disease, and autoimmune disorders. Published researcher and clinical practitioner.',
      primary_domain: 'Health & Wellness',
      years_of_experience: 18,
      city: 'San Francisco',
      country: 'United States',
      languages: ['en', 'ko'],
      linkedin_url: 'https://linkedin.com/in/david-kim-nutrition',
      website_url: 'https://drkimnutrition.com',
      access_fee_minor: 80, // $80
      access_fee_currency: 'USD',
      current_tier: 'starter' as const,
      verification_status: 'verified' as const,
      verified_at: new Date('2024-09-12').toISOString(),
      is_available: false, // unavailable
      max_requests_per_day: 10,
      avg_response_hours: 48.0,
    },
    {
      userEmail: 'aisha.patel@educator.in',
      headline: 'Education Consultant | Career Counselor for Students & Professionals',
      bio: 'Aisha has guided over 5,000 students through college admissions and career transitions. She specializes in international admissions, scholarship applications, and mid-career pivots.',
      primary_domain: 'Education',
      years_of_experience: 8,
      city: 'Mumbai',
      country: 'India',
      languages: ['en', 'hi', 'mr'],
      linkedin_url: 'https://linkedin.com/in/aisha-patel-edu',
      website_url: null,
      access_fee_minor: 499, // ₹499
      access_fee_currency: 'INR',
      current_tier: 'starter' as const,
      verification_status: 'pending' as const, // not yet verified
      verified_at: null,
      is_available: true,
      max_requests_per_day: 10,
      avg_response_hours: null,
    },
  ];

  const expertIds: Record<string, string> = {};

  for (const e of expertDefs) {
    const userId = userIds[e.userEmail];
    if (!userId) continue;

    const expertPayload = {
      user_id: userId,
      headline: e.headline,
      bio: e.bio,
      primary_domain: e.primary_domain,
      years_of_experience: e.years_of_experience,
      city: e.city,
      country: e.country,
      languages: e.languages,
      linkedin_url: e.linkedin_url,
      website_url: e.website_url,
      access_fee_minor: e.access_fee_minor,
      access_fee_currency: e.access_fee_currency,
      current_tier: e.current_tier,
      verification_status: e.verification_status,
      verified_at: e.verified_at,
      is_available: e.is_available,
      max_requests_per_day: e.max_requests_per_day,
      avg_response_hours: e.avg_response_hours,
    };

    const { data, error } = await supabase
      .from('experts')
      .insert(expertPayload)
      .select()
      .single();

    if (error) {
      // Duplicate — look up existing expert and update it
      const { data: existing } = await supabase
        .from('experts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        expertIds[e.userEmail] = existing.id;
        // Update the existing profile with fresh seed data
        await supabase.from('experts').update(expertPayload).eq('id', existing.id);
        console.log(`  Existing expert updated: ${e.headline.slice(0, 50)}...`);
      } else {
        console.error(`  Expert ${e.userEmail}: ${error.message}`);
      }
    } else {
      expertIds[e.userEmail] = data.id;
      console.log(`  Created expert: ${e.headline.slice(0, 50)}...`);
    }
  }

  // ----------------------------------------------------------
  // Step 4: Expert Specializations
  // ----------------------------------------------------------
  console.log('\n[5/10] Adding expert specializations...');

  const specMap: Record<string, string[]> = {
    'priya.sharma@lawfirm.in': ['property-dispute', 'business-contract-review', 'intellectual-property'],
    'rahul.mehta@techcorp.in': ['system-architecture', 'cloud-migration', 'ai-ml-strategy'],
    'sarah.johnson@finance.us': ['tax-planning', 'investment-strategy', 'startup-fundraising'],
    'david.kim@health.us': ['nutrition-planning', 'chronic-disease-management'],
    'aisha.patel@educator.in': ['college-admissions', 'career-counseling', 'curriculum-design'],
  };

  let specCount = 0;
  for (const [email, slugs] of Object.entries(specMap)) {
    const eid = expertIds[email];
    if (!eid) continue;
    for (const slug of slugs) {
      const spId = subProblemIds[slug];
      if (!spId) continue;
      const { error } = await supabase
        .from('expert_specializations')
        .upsert(
          { expert_id: eid, sub_problem_id: spId },
          { onConflict: 'expert_id,sub_problem_id' },
        );
      if (!error) specCount++;
    }
  }
  console.log(`  Created ${specCount} specializations`);

  // ----------------------------------------------------------
  // Step 5: Verification Documents
  // ----------------------------------------------------------
  console.log('\n[6/10] Creating verification documents...');

  const adminId = userIds['admin@expertaccess.dev'];

  const docDefs = [
    // Priya — all verified
    { expert: 'priya.sharma@lawfirm.in', type: 'id_proof', status: 'verified', notes: 'Aadhaar verified', url: 'https://storage.example.com/docs/priya-id.pdf' },
    { expert: 'priya.sharma@lawfirm.in', type: 'degree', status: 'verified', notes: 'LLB + LLM from NLU Delhi', url: 'https://storage.example.com/docs/priya-degree.pdf' },
    { expert: 'priya.sharma@lawfirm.in', type: 'license', status: 'verified', notes: 'Bar Council registration confirmed', url: 'https://storage.example.com/docs/priya-license.pdf' },
    // Rahul — verified
    { expert: 'rahul.mehta@techcorp.in', type: 'id_proof', status: 'verified', notes: 'PAN card verified', url: 'https://storage.example.com/docs/rahul-id.pdf' },
    { expert: 'rahul.mehta@techcorp.in', type: 'portfolio', status: 'verified', notes: 'AWS cert + GitHub portfolio reviewed', url: 'https://storage.example.com/docs/rahul-portfolio.pdf' },
    // Sarah — verified
    { expert: 'sarah.johnson@finance.us', type: 'id_proof', status: 'verified', notes: 'US driver license verified', url: 'https://storage.example.com/docs/sarah-id.pdf' },
    { expert: 'sarah.johnson@finance.us', type: 'license', status: 'verified', notes: 'CFA certification confirmed', url: 'https://storage.example.com/docs/sarah-cfa.pdf' },
    // David — verified
    { expert: 'david.kim@health.us', type: 'degree', status: 'verified', notes: 'PhD in Nutritional Science', url: 'https://storage.example.com/docs/david-degree.pdf' },
    // Aisha — pending (not yet reviewed)
    { expert: 'aisha.patel@educator.in', type: 'id_proof', status: 'pending', notes: null, url: 'https://storage.example.com/docs/aisha-id.pdf' },
    { expert: 'aisha.patel@educator.in', type: 'degree', status: 'pending', notes: null, url: 'https://storage.example.com/docs/aisha-degree.pdf' },
    { expert: 'aisha.patel@educator.in', type: 'portfolio', status: 'under_review', notes: 'Under admin review', url: 'https://storage.example.com/docs/aisha-portfolio.pdf' },
  ];

  for (const d of docDefs) {
    const eid = expertIds[d.expert];
    if (!eid) continue;
    await supabase.from('verification_documents').insert({
      expert_id: eid,
      document_type: d.type,
      file_url: d.url,
      status: d.status,
      reviewer_notes: d.notes,
      reviewed_by: d.status === 'verified' ? adminId : null,
      reviewed_at: d.status === 'verified' ? new Date().toISOString() : null,
    });
  }
  console.log(`  Created ${docDefs.length} verification documents`);

  // ----------------------------------------------------------
  // Step 6: Access Payments (all statuses)
  // ----------------------------------------------------------
  console.log('\n[7/10] Creating payments, requests, responses, refunds...');

  const vikramId = userIds['vikram.singh@gmail.com'];
  const emilyId = userIds['emily.chen@gmail.com'];
  const blockedUserId = userIds['blocked.user@gmail.com'];

  const priyaExpertId = expertIds['priya.sharma@lawfirm.in'];
  const rahulExpertId = expertIds['rahul.mehta@techcorp.in'];
  const sarahExpertId = expertIds['sarah.johnson@finance.us'];
  const davidExpertId = expertIds['david.kim@health.us'];

  // Clean up existing dependent data in correct order (children first)
  await supabase.from('refunds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expert_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('access_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('access_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('blocked_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expert_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Payment 1: Vikram → Priya (paid, request accepted)
  const { data: pay1 } = await supabase.from('access_payments').insert({
    user_id: vikramId, expert_id: priyaExpertId,
    amount_minor: 249900, currency: 'INR', gateway: 'razorpay',
    gateway_order_id: 'order_RPay_001', gateway_payment_id: 'pay_RPay_001', gateway_signature: 'sig_001',
    status: 'paid', paid_at: new Date('2025-01-15T10:30:00Z').toISOString(),
  }).select().single();

  // Payment 2: Emily → Priya (paid, request accepted with review)
  const { data: pay2 } = await supabase.from('access_payments').insert({
    user_id: emilyId, expert_id: priyaExpertId,
    amount_minor: 249900, currency: 'INR', gateway: 'stripe',
    gateway_order_id: 'pi_Stripe_002', gateway_payment_id: 'pi_Stripe_002', gateway_signature: 'sig_002',
    status: 'paid', paid_at: new Date('2025-02-10T14:00:00Z').toISOString(),
  }).select().single();

  // Payment 3: Vikram → Rahul (paid, request rejected → refunded)
  const { data: pay3 } = await supabase.from('access_payments').insert({
    user_id: vikramId, expert_id: rahulExpertId,
    amount_minor: 149900, currency: 'INR', gateway: 'razorpay',
    gateway_order_id: 'order_RPay_003', gateway_payment_id: 'pay_RPay_003', gateway_signature: 'sig_003',
    status: 'refunded', paid_at: new Date('2025-01-20T09:00:00Z').toISOString(),
  }).select().single();

  // Payment 4: Emily → Rahul (paid, request expired → refunded)
  const { data: pay4 } = await supabase.from('access_payments').insert({
    user_id: emilyId, expert_id: rahulExpertId,
    amount_minor: 149900, currency: 'INR', gateway: 'stripe',
    gateway_order_id: 'pi_Stripe_004', gateway_payment_id: 'pi_Stripe_004', gateway_signature: 'sig_004',
    status: 'refunded', paid_at: new Date('2025-01-25T11:00:00Z').toISOString(),
  }).select().single();

  // Payment 5: Vikram → Sarah (paid, request currently sent/awaiting)
  const { data: pay5 } = await supabase.from('access_payments').insert({
    user_id: vikramId, expert_id: sarahExpertId,
    amount_minor: 4999, currency: 'USD', gateway: 'stripe',
    gateway_order_id: 'pi_Stripe_005', gateway_payment_id: 'pi_Stripe_005', gateway_signature: 'sig_005',
    status: 'paid', paid_at: new Date('2025-02-12T16:00:00Z').toISOString(),
  }).select().single();

  // Payment 6: Vikram → Priya second time (paid, request cancelled)
  const { data: pay6 } = await supabase.from('access_payments').insert({
    user_id: vikramId, expert_id: priyaExpertId,
    amount_minor: 249900, currency: 'INR', gateway: 'razorpay',
    gateway_order_id: 'order_RPay_006', gateway_payment_id: 'pay_RPay_006', gateway_signature: 'sig_006',
    status: 'paid', paid_at: new Date('2025-02-01T08:00:00Z').toISOString(),
  }).select().single();

  // Payment 7: pending (in-progress)
  const { data: pay7 } = await supabase.from('access_payments').insert({
    user_id: emilyId, expert_id: sarahExpertId,
    amount_minor: 4999, currency: 'USD', gateway: 'stripe',
    gateway_order_id: 'pi_Stripe_007', gateway_payment_id: null, gateway_signature: null,
    status: 'pending',
  }).select().single();

  // Payment 8: failed (card declined)
  const { data: pay8 } = await supabase.from('access_payments').insert({
    user_id: blockedUserId, expert_id: rahulExpertId,
    amount_minor: 149900, currency: 'INR', gateway: 'razorpay',
    gateway_order_id: 'order_RPay_008', gateway_payment_id: null, gateway_signature: null,
    status: 'failed',
  }).select().single();

  console.log('  Created 8 payments (paid:4, refunded:2, pending:1, failed:1)');

  // ----------------------------------------------------------
  // Access Requests (all statuses)
  // ----------------------------------------------------------

  // Request 1: Accepted (Vikram → Priya, property dispute)
  const { data: req1 } = await supabase.from('access_requests').insert({
    user_id: vikramId, expert_id: priyaExpertId, access_payment_id: pay1!.id,
    subject: 'Property boundary dispute with neighbor',
    message: 'I have a land boundary dispute with my neighbor in Gurgaon. The neighbor has encroached approximately 200 sq ft into my property. I have the original sale deed and registry. Need legal guidance on how to proceed with resolution or court action.',
    context_data: { property_area: '2400 sqft', location: 'Gurgaon, Haryana', dispute_type: 'boundary_encroachment' },
    status: 'accepted',
    expires_at: new Date('2025-01-18T10:30:00Z').toISOString(),
  }).select().single();

  // Request 2: Accepted with review (Emily → Priya, IP matter)
  const { data: req2 } = await supabase.from('access_requests').insert({
    user_id: emilyId, expert_id: priyaExpertId, access_payment_id: pay2!.id,
    subject: 'Patent infringement analysis for SaaS product',
    message: 'My startup has developed a SaaS product and a competitor has filed a patent that may overlap with our technology. I need an expert analysis of whether we are infringing and what defensive steps we can take.',
    context_data: { product_type: 'SaaS', jurisdiction: 'US + India', urgency: 'high' },
    status: 'accepted',
    expires_at: new Date('2025-02-13T14:00:00Z').toISOString(),
  }).select().single();

  // Request 3: Rejected (Vikram → Rahul, too vague)
  const { data: req3 } = await supabase.from('access_requests').insert({
    user_id: vikramId, expert_id: rahulExpertId, access_payment_id: pay3!.id,
    subject: 'Need help with my app',
    message: 'I have an app idea and need technical help. Can you help me build it?',
    context_data: null,
    status: 'rejected',
    expires_at: new Date('2025-01-23T09:00:00Z').toISOString(),
  }).select().single();

  // Request 4: Expired (Emily → Rahul, no response)
  const { data: req4 } = await supabase.from('access_requests').insert({
    user_id: emilyId, expert_id: rahulExpertId, access_payment_id: pay4!.id,
    subject: 'AWS to GCP migration strategy',
    message: 'Our company is considering migrating from AWS to GCP for cost optimization. We have 50+ microservices running on EKS. Need a migration roadmap and cost analysis.',
    context_data: { current_cloud: 'AWS', services_count: 50, monthly_spend: '$45,000' },
    status: 'expired',
    expires_at: new Date('2025-01-28T11:00:00Z').toISOString(), // already passed
  }).select().single();

  // Request 5: Sent / awaiting (Vikram → Sarah)
  const { data: req5 } = await supabase.from('access_requests').insert({
    user_id: vikramId, expert_id: sarahExpertId, access_payment_id: pay5!.id,
    subject: 'Tax-efficient structure for US subsidiary',
    message: 'I run an India-based SaaS company and am setting up a US subsidiary (Delaware C-Corp). Need advice on transfer pricing, tax treaty benefits, and the most efficient structure to minimize double taxation.',
    context_data: { company_type: 'SaaS', india_revenue: '₹5Cr', us_revenue_target: '$500K' },
    status: 'sent',
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
  }).select().single();

  // Request 6: Cancelled (Vikram cancelled before expert responded)
  const { data: req6 } = await supabase.from('access_requests').insert({
    user_id: vikramId, expert_id: priyaExpertId, access_payment_id: pay6!.id,
    subject: 'Tenant eviction notice review',
    message: 'My tenant has not paid rent for 4 months. I have sent a notice but need legal review of the eviction process under Delhi Rent Control Act.',
    context_data: { property_type: 'residential', location: 'Delhi', months_unpaid: 4 },
    status: 'cancelled',
    expires_at: new Date('2025-02-04T08:00:00Z').toISOString(),
  }).select().single();

  console.log('  Created 6 requests (accepted:2, rejected:1, expired:1, sent:1, cancelled:1)');

  // ----------------------------------------------------------
  // Expert Responses (both decisions)
  // ----------------------------------------------------------

  // Response to req1: accepted with terms
  await supabase.from('expert_responses').insert({
    request_id: req1!.id,
    decision: 'accepted',
    response_note: 'I have reviewed your property dispute details. This is a clear case of encroachment that can be resolved through legal notice followed by civil suit if needed. I can guide you through the entire process.',
    contact_terms: 'Available for a 1-hour video consultation within the next 7 days. Follow-up email support for 30 days.',
    contact_price_indicated: 15000.00,
    currency: 'INR',
  });

  // Response to req2: accepted
  await supabase.from('expert_responses').insert({
    request_id: req2!.id,
    decision: 'accepted',
    response_note: 'Patent infringement analysis is my specialty. I will need to review the competitor\'s patent claims and your product specifications. Let\'s schedule a detailed call.',
    contact_terms: 'Detailed written analysis within 10 business days. Two rounds of revision included.',
    contact_price_indicated: 75000.00,
    currency: 'INR',
  });

  // Response to req3: rejected
  await supabase.from('expert_responses').insert({
    request_id: req3!.id,
    decision: 'rejected',
    response_note: 'Thank you for reaching out. Unfortunately, your request is too vague for me to provide meaningful guidance. I specialize in specific technical architecture challenges. Please resubmit with more details about your technical requirements, scale expectations, and specific queries you have.',
    contact_terms: null,
    contact_price_indicated: null,
    currency: null,
  });

  console.log('  Created 3 expert responses (accepted:2, rejected:1)');

  // ----------------------------------------------------------
  // Refunds (all statuses)
  // ----------------------------------------------------------

  // Refund 1: processed — for rejected request (auto)
  await supabase.from('refunds').insert({
    access_payment_id: pay3!.id, request_id: req3!.id, user_id: vikramId,
    amount_minor: 149900, currency: 'INR', reason: 'expert_rejected',
    status: 'processed', gateway_refund_id: 'rfnd_RPay_001',
    processed_at: new Date('2025-01-21T12:00:00Z').toISOString(),
  });

  // Refund 2: processed — for expired request (auto)
  await supabase.from('refunds').insert({
    access_payment_id: pay4!.id, request_id: req4!.id, user_id: emilyId,
    amount_minor: 149900, currency: 'INR', reason: 'auto_expired',
    status: 'processed', gateway_refund_id: 'rfnd_Stripe_002',
    processed_at: new Date('2025-01-29T00:15:00Z').toISOString(),
  });

  // Refund 3: requested — pending processing
  await supabase.from('refunds').insert({
    access_payment_id: pay6!.id, request_id: req6!.id, user_id: vikramId,
    amount_minor: 249900, currency: 'INR', reason: 'user_cancelled',
    status: 'requested', gateway_refund_id: null, processed_at: null,
  });

  // Refund 4: denied — admin denied manual request
  await supabase.from('refunds').insert({
    access_payment_id: pay1!.id, request_id: req1!.id, user_id: vikramId,
    amount_minor: 249900, currency: 'INR', reason: 'admin_initiated',
    status: 'denied', gateway_refund_id: null, processed_at: null,
  });

  console.log('  Created 4 refunds (processed:2, requested:1, denied:1)');

  // ----------------------------------------------------------
  // Step 7: Reviews
  // ----------------------------------------------------------
  console.log('\n[8/10] Creating reviews, subscriptions, notifications...');

  // Review 1: 5-star visible (Vikram on req1 for Priya)
  await supabase.from('reviews').insert({
    request_id: req1!.id, user_id: vikramId, expert_id: priyaExpertId,
    rating: 5, comment: 'Dr. Sharma provided exceptional legal advice on my property dispute. Her knowledge of Delhi property law is outstanding. She explained the entire process clearly and gave me a realistic timeline. Highly recommend!',
    is_visible: true,
  });

  // Review 2: 3-star visible (Emily on req2 for Priya)
  await supabase.from('reviews').insert({
    request_id: req2!.id, user_id: emilyId, expert_id: priyaExpertId,
    rating: 3, comment: 'Good analysis but the response took longer than expected. The patent review was thorough but I wish there was more actionable advice on next steps.',
    is_visible: true,
  });

  console.log('  Created 2 reviews (5-star visible, 3-star visible)');

  // ----------------------------------------------------------
  // Expert Subscriptions (all statuses)
  // ----------------------------------------------------------

  // Active yearly — Elite (Priya)
  await supabase.from('expert_subscriptions').insert({
    expert_id: priyaExpertId, tier_id: 'elite', billing_cycle: 'yearly',
    status: 'active', gateway: 'razorpay', gateway_subscription_id: 'sub_RPay_elite_001',
    amount_minor: 2499900, currency: 'INR',
    current_period_start: new Date('2025-01-01').toISOString(),
    current_period_end: new Date('2026-01-01').toISOString(),
  });

  // Active monthly — Pro (Rahul)
  await supabase.from('expert_subscriptions').insert({
    expert_id: rahulExpertId, tier_id: 'pro', billing_cycle: 'monthly',
    status: 'active', gateway: 'razorpay', gateway_subscription_id: 'sub_RPay_pro_002',
    amount_minor: 79900, currency: 'INR',
    current_period_start: new Date('2025-02-01').toISOString(),
    current_period_end: new Date('2025-03-01').toISOString(),
  });

  // Cancelled — previously Pro (Sarah, downgrading at period end)
  await supabase.from('expert_subscriptions').insert({
    expert_id: sarahExpertId, tier_id: 'pro', billing_cycle: 'monthly',
    status: 'cancelled', gateway: 'stripe', gateway_subscription_id: 'sub_Stripe_pro_003',
    amount_minor: 4999, currency: 'USD',
    current_period_start: new Date('2025-01-15').toISOString(),
    current_period_end: new Date('2025-02-15').toISOString(),
    cancelled_at: new Date('2025-02-10').toISOString(),
  });

  // Expired — old subscription (Priya had a Pro before upgrading to Elite)
  await supabase.from('expert_subscriptions').insert({
    expert_id: priyaExpertId, tier_id: 'pro', billing_cycle: 'monthly',
    status: 'expired', gateway: 'razorpay', gateway_subscription_id: 'sub_RPay_pro_old_001',
    amount_minor: 79900, currency: 'INR',
    current_period_start: new Date('2024-11-01').toISOString(),
    current_period_end: new Date('2024-12-01').toISOString(),
  });

  console.log('  Created 4 subscriptions (active:2, cancelled:1, expired:1)');

  // ----------------------------------------------------------
  // Notifications (all channels, read/unread)
  // ----------------------------------------------------------

  // in_app unread
  await supabase.from('notifications').insert({
    user_id: vikramId, channel: 'in_app',
    title: 'Request accepted', body: 'Dr. Priya Sharma has accepted your access request. View their terms.',
    action_url: `/requests/${req1!.id}`, is_read: false,
    metadata: { event: 'request.accepted', expert_name: 'Dr. Priya Sharma' },
  });

  // in_app read
  await supabase.from('notifications').insert({
    user_id: vikramId, channel: 'in_app',
    title: 'Payment confirmed', body: 'Your payment of ₹2,499 for Dr. Priya Sharma has been confirmed.',
    action_url: `/payments`, is_read: true,
    metadata: { event: 'payment.confirmed', amount: 249900 },
  });

  // in_app for Emily
  await supabase.from('notifications').insert({
    user_id: emilyId, channel: 'in_app',
    title: 'Request expired', body: 'Your request to Rahul Mehta has expired without a response. A refund has been initiated.',
    action_url: `/requests/${req4!.id}`, is_read: false,
    metadata: { event: 'request.expired', expert_name: 'Rahul Mehta' },
  });

  // email notification
  await supabase.from('notifications').insert({
    user_id: emilyId, channel: 'email',
    title: 'Refund processed', body: 'Your refund of ₹1,499 has been processed to your original payment method.',
    action_url: null, is_read: false,
    metadata: { event: 'refund.processed', amount: 149900 },
  });

  // push notification (expert side)
  await supabase.from('notifications').insert({
    user_id: userIds['priya.sharma@lawfirm.in'], channel: 'push',
    title: 'New access request', body: 'You have a new access request from Vikram Singh regarding property dispute.',
    action_url: `/expert/requests`, is_read: true,
    metadata: { event: 'request.sent', user_name: 'Vikram Singh' },
  });

  // subscription notification
  await supabase.from('notifications').insert({
    user_id: userIds['rahul.mehta@techcorp.in'], channel: 'in_app',
    title: 'Welcome to Pro', body: 'Your Pro subscription is now active. Enjoy enhanced visibility and analytics!',
    action_url: '/expert/subscription', is_read: true,
    metadata: { event: 'subscription.activated', tier: 'Pro' },
  });

  // review notification
  await supabase.from('notifications').insert({
    user_id: userIds['priya.sharma@lawfirm.in'], channel: 'in_app',
    title: 'New review', body: 'You received a 5-star review from Vikram Singh.',
    action_url: '/expert/reviews', is_read: false,
    metadata: { event: 'review.received', rating: 5 },
  });

  console.log('  Created 7 notifications (in_app:5, email:1, push:1)');

  // ----------------------------------------------------------
  // Step 8: Blocked Users
  // ----------------------------------------------------------
  console.log('\n[9/10] Creating blocked users & audit logs...');

  const priyaUserId = userIds['priya.sharma@lawfirm.in'];
  await supabase.from('blocked_users').insert({
    blocker_id: priyaUserId,
    blocked_id: blockedUserId,
    reason: 'Sent multiple vague and low-effort requests. Appears to be spamming.',
  });

  console.log('  Created 1 blocked user record');

  // ----------------------------------------------------------
  // Step 9: Audit Logs
  // ----------------------------------------------------------

  const auditEntries = [
    { actor_id: adminId, action: 'expert.verified', entity: 'experts', entity_id: priyaExpertId, new_data: { verification_status: 'verified' } },
    { actor_id: adminId, action: 'expert.verified', entity: 'experts', entity_id: rahulExpertId, new_data: { verification_status: 'verified' } },
    { actor_id: vikramId, action: 'payment.completed', entity: 'access_payments', entity_id: pay1!.id, new_data: { status: 'paid', gateway: 'razorpay' } },
    { actor_id: vikramId, action: 'request.created', entity: 'access_requests', entity_id: req1!.id, new_data: { status: 'sent', expert_id: priyaExpertId } },
    { actor_id: priyaUserId, action: 'request.accepted', entity: 'access_requests', entity_id: req1!.id, old_data: { status: 'sent' }, new_data: { status: 'accepted' } },
    { actor_id: null, action: 'request.expired', entity: 'access_requests', entity_id: req4!.id, old_data: { status: 'sent' }, new_data: { status: 'expired' } },
    { actor_id: adminId, action: 'config.updated', entity: 'platform_config', entity_id: null, old_data: { key: 'request_expiry_hours', value: 48 }, new_data: { key: 'request_expiry_hours', value: 72 } },
  ];

  for (const a of auditEntries) {
    await supabase.from('audit_logs').insert({
      actor_id: a.actor_id,
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id,
      old_data: a.old_data || null,
      new_data: a.new_data || null,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });
  }

  console.log(`  Created ${auditEntries.length} audit log entries`);

  // ----------------------------------------------------------
  // Step 10: Seed additional platform_config keys
  // ----------------------------------------------------------
  console.log('\n[10/11] Seeding additional platform config keys...');
  const newConfigKeys = [
    { key: 'platform_name', value: '"Expert Access Directory"', description: 'Platform display name' },
    { key: 'platform_tagline', value: '"Find the right expert for your query"', description: 'Platform tagline / subtitle' },
    { key: 'support_email', value: '"support@expertaccess.dev"', description: 'Platform support email address' },
    { key: 'support_phone', value: '"+91-9000000000"', description: 'Platform support phone number' },
    { key: 'terms_url', value: '"https://expertaccess.dev/terms"', description: 'Terms of service URL' },
    { key: 'privacy_url', value: '"https://expertaccess.dev/privacy"', description: 'Privacy policy URL' },
    { key: 'min_access_fee_inr', value: '49', description: 'Minimum access fee an expert can set (INR)' },
    { key: 'default_access_fee_inr', value: '49', description: 'Default access fee for new experts (INR). Must be >= min_access_fee_inr' },
    { key: 'min_access_fee_usd', value: '5', description: 'Minimum expert access fee in USD' },
    { key: 'expert_response_sla_hours', value: '48', description: 'SLA for expert response time (hours)' },
    { key: 'max_experts_per_request', value: '1', description: 'Max experts a user can contact per request' },
    { key: 'review_min_chars', value: '20', description: 'Minimum character length for review comments' },
    { key: 'maintenance_mode', value: 'false', description: 'Enable/disable platform maintenance mode' },
    { key: 'featured_experts_count', value: '6', description: 'Number of featured experts on homepage' },
    { key: 'razorpay_enabled', value: 'true', description: 'Enable Razorpay payment gateway (India)' },
    { key: 'stripe_enabled', value: 'true', description: 'Enable Stripe payment gateway (global)' },
  ];

  for (const cfg of newConfigKeys) {
    const { error } = await supabase.from('platform_config').upsert(cfg, { onConflict: 'key' });
    if (error) console.warn(`  Config key "${cfg.key}" failed: ${error.message}`);
  }
  console.log(`  Upserted ${newConfigKeys.length} config keys`);

  // ----------------------------------------------------------
  // Step 11: Update Sarah's role to 'expert' (verified starter)
  // ----------------------------------------------------------
  console.log('\n[11/11] Final adjustments...');
  await supabase.from('users').update({ role: 'expert' }).eq('id', userIds['sarah.johnson@finance.us']);
  await supabase.from('users').update({ role: 'expert' }).eq('id', userIds['david.kim@health.us']);
  console.log('  Updated Sarah & David user roles to expert');

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  console.log('\n========================================');
  console.log('  SEED COMPLETE');
  console.log('========================================');
  console.log(`
  Users:          ${USERS.length} (1 admin, 4 regular, 5 experts)
  Domains:        ${Object.keys(domainIds).length}
  Guidance areas: ${Object.keys(subProblemIds).length}
  Experts:        ${Object.keys(expertIds).length}
  Specializations: ${specCount}
  Verif. Docs:    ${docDefs.length}
  Payments:       8 (paid:4, refunded:2, pending:1, failed:1)
  Requests:       6 (accepted:2, rejected:1, expired:1, sent:1, cancelled:1)
  Responses:      3 (accepted:2, rejected:1)
  Refunds:        4 (processed:2, requested:1, denied:1)
  Reviews:        2 (visible)
  Subscriptions:  4 (active:2, cancelled:1, expired:1)
  Notifications:  7 (in_app:5, email:1, push:1)
  Blocked Users:  1
  Audit Logs:     ${auditEntries.length}

  Login credentials (all passwords):
    Admin:   admin@expertaccess.dev / Admin@123456
    Users:   vikram.singh@gmail.com / User@123456
             emily.chen@gmail.com / User@123456
    Experts: priya.sharma@lawfirm.in / Expert@123456
             rahul.mehta@techcorp.in / Expert@123456
             sarah.johnson@finance.us / Expert@123456
`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Supabase
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // Meilisearch
  MEILISEARCH_HOST: Joi.string().default('http://localhost:7700'),
  MEILISEARCH_API_KEY: Joi.string().default(''),

  // Razorpay
  RAZORPAY_KEY_ID: Joi.string().default(''),
  RAZORPAY_KEY_SECRET: Joi.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().default(''),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().default(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().default(''),

  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Email
  RESEND_API_KEY: Joi.string().default(''),
  EMAIL_FROM: Joi.string().default('noreply@example.com'),
});

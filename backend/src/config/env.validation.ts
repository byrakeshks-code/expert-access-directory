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
  REDIS_PASSWORD: Joi.string().default(''),

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

  // Firebase Admin
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),

  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Email (Gmail SMTP for signup OTP)
  RESEND_API_KEY: Joi.string().default(''),
  EMAIL_FROM: Joi.string().default('noreply@example.com'),
  EMAIL_SMTP_HOST: Joi.string().default('smtp.gmail.com'),
  EMAIL_SMTP_PORT: Joi.number().default(587),
  EMAIL_SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  EMAIL_SMTP_USER: Joi.string().default(''),
  EMAIL_SMTP_APP_PASSWORD: Joi.string().default(''),
});

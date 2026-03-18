import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix (exclude GET / so root returns service info)
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });

  // Body size limits
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Security
  app.use(helmet());

  // CORS — strict in production
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsRaw = configService.get<string>('CORS_ORIGINS', '');
  if (nodeEnv === 'production' && (!corsRaw || corsRaw === '*')) {
    logger.error('CORS_ORIGINS must be set to specific origins in production. Refusing to start.');
    process.exit(1);
  }
  const corsOrigins = (corsRaw || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Request timeout (30s)
  const httpServer = app.getHttpServer();
  httpServer.setTimeout(30_000);

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Loop Ex API')
    .setDescription(
      'REST API for the Loop Ex Platform — structured access to verified professionals.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Start
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();

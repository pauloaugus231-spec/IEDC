import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/observability/global-exception.filter';
import { requestIdMiddleware } from './common/observability/request-id.middleware';
import { createStructuredLogger } from './common/observability/structured-logger';
import { resolveCorsOrigin } from './config/cors-origin';

async function bootstrap() {
  const logger = createStructuredLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(requestIdMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // Configuração para aumentar limites de payload para uploads.
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // Configuração do CORS. Em produção Docker, o frontend fala com a API via Nginx no mesmo host.
  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true,
  });

  // Validation pipe global.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: isProduction,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // API prefix.
  app.setGlobalPrefix('api');

  // Swagger fica disponível apenas em desenvolvimento ou quando liberado explicitamente.
  const shouldExposeSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;
  if (shouldExposeSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Gestão Dias da Cruz API')
      .setDescription('Sistema local de gestão institucional')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Serve static files from the "uploads" directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(
    {
      event: 'app.started',
      port,
      healthcheck: `/api/health`,
      swagger: shouldExposeSwagger ? `/api/docs` : null,
    },
    'Bootstrap',
  );
  if (shouldExposeSwagger) {
    logger.log({ event: 'swagger.enabled', path: `/api/docs` }, 'Bootstrap');
  }
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { resolveCorsOrigin } from './config/cors-origin';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

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
      whitelist: true, // Remove campos não definidos no DTO
      transform: true, // Transforma payloads em instâncias de DTO
      forbidNonWhitelisted: isProduction,
    }),
  );

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

  console.log(`Backend rodando em: http://localhost:${port}`);
  console.log(`Healthcheck em: http://localhost:${port}/api/health`);
  if (shouldExposeSwagger) {
    console.log(`Documentação em: http://localhost:${port}/api/docs`);
  }
}
bootstrap();

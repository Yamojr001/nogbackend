import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { rawBody: true });

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
    app.useGlobalInterceptors(new SanitizeInterceptor());

    // --- Security Headers ------------------------------------------------------
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // handled by Next.js frontend
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // --- Global Prefix & Validation -------------------------------------------
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,            // strip unknown props (prevents mass assignment)
      transform: true,            // auto-transform payloads to DTO classes
      forbidNonWhitelisted: true, // throw error on unknown properties
    }));

    // --- CORS -----------------------------------------------------------------
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    await app.listen(5000);
    console.log(`🚀 Coop-OS API running on http://localhost:5000/api`);
  } catch (error) {
    const util = require('util');
    console.error('NestJS Bootstrap Error:');
    console.error(util.inspect(error, { showHidden: false, depth: null, colors: true }));
    process.exit(1);
  }
}
bootstrap();

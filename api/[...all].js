const { NestFactory, HttpAdapterHost } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const helmet = require('helmet');

const { AppModule } = require('../dist/src/app.module');
const {
  AllExceptionsFilter,
} = require('../dist/src/common/filters/all-exceptions.filter');
const {
  SanitizeInterceptor,
} = require('../dist/src/common/interceptors/sanitize.interceptor');

let cachedHandler = null;

async function bootstrapServerless() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.useGlobalInterceptors(new SanitizeInterceptor());

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async function handler(req, res) {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServerless();
  }

  return cachedHandler(req, res);
};

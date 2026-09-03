import {
  NestFactory,
} from '@nestjs/core';

import cookieParser
  from 'cookie-parser';

import {
  AppModule,
} from './app.module.js';

async function bootstrap() {
  const app =
    await NestFactory
      .create(
        AppModule,
      );

  app.use(
    cookieParser(),
  );

  const allowedOrigins =
    (
      process.env
        .CORS_ORIGINS ??
      'http://localhost:5173'
    )
      .split(',')
      .map(
        value =>
          value.trim(),
      )
      .filter(Boolean);

  app.enableCors({
    origin:
      allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(
    'api',
  );

  const port =
    Number(
      process.env.PORT,
    ) || 3001;

  const host =
    process.env.HOST ??
    '127.0.0.1';

  await app.listen(
    port,
    host,
  );

  console.log(
    `🚀 API Nayara rodando em http://${host}:${port}/api`,
  );
}

await bootstrap();

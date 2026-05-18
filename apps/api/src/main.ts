import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      const allowed = process.env.FRONTEND_URL ?? 'http://localhost:3002';
      const ok = !origin || origin === allowed
        || origin.startsWith('chrome-extension://')
        || origin.startsWith('moz-extension://');
      cb(ok ? null : new Error('CORS'), ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();

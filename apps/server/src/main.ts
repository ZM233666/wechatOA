import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('apiPrefix', 'api');
  const port = configService.get<number>('port', 3000);
  const corsOrigins = configService.get<string>('corsOrigins', '*');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((item) => item.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`Server is running at http://127.0.0.1:${port}/${apiPrefix}`);
}

void bootstrap();

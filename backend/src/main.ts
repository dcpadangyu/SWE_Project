import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';
import 'dotenv/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableShutdownHooks();

  app.enableCors({
    origin: 'http://localhost:3000',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription(
      'API menu và chi tiết đồ uống. Dùng Try it out để kiểm tra API.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
  console.log(`📚 Swagger API Docs tại: http://localhost:${port}/swagger`);
}
void bootstrap();

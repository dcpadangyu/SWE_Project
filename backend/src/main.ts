/**
 * ============================================================================
 * MAIN ENTRY POINT (ĐIỂM KHỞI CHẠY CHÍNH CỦA BACKEND NESTJS)
 * ============================================================================
 * 
 * Mục đích:
 * - Khởi tạo phiên bản ứng dụng NestJS (AppModule).
 * - Kích hoạt các Middleware, Pipes, Filters bảo vệ hệ thống trước khi mở cổng nhận request.
 * - Cấu hình Swagger API Docs phục vụ kiểm thử API trực quan (Task 2).
 * - Cấu hình cổng mạng và ghi log trạng thái khởi động.
 */

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import 'dotenv/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Khởi tạo ứng dụng NestJS từ AppModule
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Kích hoạt xử lý tắt ứng dụng an toàn (Prisma disconnect)
  app.enableShutdownHooks();

  // 1. Cấu hình CORS (Cross-Origin Resource Sharing):
  // Hỗ trợ đồng thời cả biến CORS_ORIGIN và FRONTEND_URL (trong .env.example / docker-compose.yml)
  const rawOrigin =
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000';
  const allowedOrigins = rawOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global ValidationPipe (Xác thực dữ liệu đầu vào toàn cục - NFR-07/NFR-08):
  // Tự động kích hoạt kiểm tra tính hợp lệ của request payload thông qua các decorator của class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Tự động lược bỏ các trường không có trong DTO
      transform: true,            // Tự động chuyển đổi kiểu dữ liệu payload sang DTO class instance
      forbidNonWhitelisted: true, // Báo lỗi 400 Bad Request ngay nếu client cố tình gửi các trường lạ
    }),
  );

  // 3. Global Exception Filter (Xử lý lỗi tập trung - NFR-07 & NFR-09):
  // Đảm bảo mọi lỗi phát sinh đều được định dạng thành JSON chuẩn và giấu stack trace nhạy cảm.
  app.useGlobalFilters(new AllExceptionsFilter());

  // 4. Cấu hình Swagger API Documentation (Task 2):
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription(
      'Hệ thống RESTful API cho ứng dụng BrewLite. Bao gồm Menu, Danh mục, Đơn hàng và Xác thực.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  // 5. Lắng nghe trên cổng PORT (mặc định 8080 nếu biến môi trường chưa đặt)
  const port = process.env.PORT ?? 8080;
  await app.listen(port);

  logger.log(`🚀 BrewLite Backend API đang chạy tại: http://localhost:${port}`);
  logger.log(`🩺 Health check endpoint: http://localhost:${port}/health`);
  logger.log(`📚 Swagger API Docs tại: http://localhost:${port}/swagger`);
}

// Bắt đầu khởi chạy ứng dụng
void bootstrap();

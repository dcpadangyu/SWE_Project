/**
 * ============================================================================
 * MAIN ENTRY POINT (ĐIỂM KHỞI CHẠY CHÍNH CỦA BACKEND NESTJS)
 * ============================================================================
 * 
 * Mục đích:
 * - Khởi tạo phiên bản ứng dụng NestJS (AppModule).
 * - Kích hoạt các Middleware, Pipes, Filters bảo vệ hệ thống trước khi mở cổng nhận request.
 * - Cấu hình cổng mạng và ghi log trạng thái khởi động.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule, ObserveInstrument } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Khởi tạo ứng dụng NestJS từ AppModule
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // 1. Cấu hình CORS (Cross-Origin Resource Sharing):
  // Cho phép ứng dụng Frontend Next.js (chạy ở localhost:3000 hoặc domain production)
  // có thể gửi request gọi API tới Backend (localhost:8080) mà không bị trình duyệt chặn.
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global ValidationPipe (Xác thực dữ liệu đầu vào toàn cục - NFR-07):
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

  // 4. Lắng nghe trên cổng PORT (mặc định 8080 nếu biến môi trường chưa đặt)
  const port = process.env.PORT ?? 8080;
  await app.listen(port);

  logger.log(`🚀 BrewLite Backend API đang chạy tại: http://localhost:${port}`);
  logger.log(`🩺 Health check endpoint: http://localhost:${port}/health`);
}

// Bắt đầu khởi chạy ứng dụng
void bootstrap();

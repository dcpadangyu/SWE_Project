/**
 * ============================================================================
 * HEALTH CHECK CONTROLLER (ĐIỂM KIỂM TRA SỨC KHỎE DỊCH VỤ)
 * ============================================================================
 * 
 * Mục đích:
 * - Cung cấp endpoint HTTP GET /health để các nền tảng đám mây (Render, Railway, Fly.io, Kubernetes)
 *   hoặc giám sát viên tự động kiểm tra xem ứng dụng NestJS có đang hoạt động bình thường không.
 * - Đáp ứng tiêu chí kiểm thử liveness/readiness trong Task 3.1 & Task 5.2.
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /**
   * Endpoint kiểm tra trạng thái sống của dịch vụ API
   * Đường dẫn: GET http://localhost:8080/health
   * 
   * @returns Object chứa trạng thái 'ok', tên service, thời gian uptime và timestamp
   */
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'brewlite-api',
      uptime: process.uptime(), // Số giây server đã chạy liên tục
      timestamp: new Date().toISOString(), // Thời điểm kiểm tra theo chuẩn ISO 8601
      environment: process.env.NODE_ENV ?? 'development', // Môi trường chạy (development / production)
    };
  }
}

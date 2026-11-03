/**
 * ============================================================================
 * GLOBAL EXCEPTION FILTER (BỘ LỌC BẮT NGOẠI LỆ TOÀN CỤC)
 * ============================================================================
 * 
 * Mục đích:
 * - Đón bắt tất cả các ngoại lệ (Exception) phát sinh trong toàn bộ ứng dụng NestJS.
 * - Chuẩn hóa định dạng JSON phản hồi về Client thống nhất cho mọi API.
 * - Phục vụ tiêu chí phi chức năng quan trọng:
 *   + NFR-07: Xác thực đầu vào và bảo vệ máy chủ (tuyệt đối KHÔNG trả về stack trace
 *     hoặc thông tin nội bộ nhạy cảm cho người dùng).
 *   + NFR-09: Xử lý lỗi tập trung, một request lỗi không làm sập ứng dụng.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Ghi log phục vụ lập trình viên điều tra lỗi nội bộ trên console máy chủ
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Phương thức xử lý ngoại lệ trung tâm
   * @param exception Ngoại lệ bị ném ra (có thể là HttpException hoặc lỗi hệ thống Error)
   * @param host Ngữ cảnh thực thi của request (ArgumentsHost)
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Mặc định là lỗi máy chủ 500 nếu không xác định được mã lỗi cụ thể
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';
    let errors: any = undefined;
    // Mã lỗi nghiệp vụ và dữ liệu kèm theo (ví dụ OUT_OF_STOCK + danh sách món thiếu)
    let code: string | undefined = undefined;
    let details: unknown = undefined;

    // 1. Nếu là lỗi HTTP do NestJS chủ động ném ra (400, 401, 403, 404, 409...)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const respObj = exceptionResponse as Record<string, any>;
        message = respObj['message'] || exception.message;
        // Bắt mảng lỗi validate từ ValidationPipe nếu có
        errors = respObj['errors'] || (Array.isArray(respObj['message']) ? respObj['message'] : undefined);
        code = respObj['code'];
        details = respObj['details'];
      }
    } 
    // 2. Nếu là lỗi hệ thống không mong đợi (Unhandle Error, Database Connection Crash...)
    else if (exception instanceof Error) {
      // Ghi log chi tiết kèm Stack Trace ở console Backend để Dev kiểm tra
      this.logger.error(`[UNHANDLED EXCEPTION] ${exception.message}`, exception.stack);
    }

    // 3. Chuẩn hóa phản hồi JSON trả về Client (Tuyệt đối giấu stack trace theo NFR-07)
    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(errors) ? errors[0] : message,
      errors: errors,
      code: code,
      details: details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

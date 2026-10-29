import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

/** UUID người dùng giả dùng khi chưa có JWT (chỉ để phát triển/test cục bộ). */
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TẠM THỜI: lấy userId của người đặt đơn.
 *
 * Task 7 (Auth/JWT) chưa merge nên chưa có JwtAuthGuard. Hiện đọc header `x-user-id`
 * (mặc định DEV_USER_ID). Header này có thể bị giả mạo nên KHÔNG an toàn cho production.
 *
 * Khi Task 7 xong: thay decorator này bằng userId lấy từ JWT (req.user.id) và xóa file này.
 * Controller chỉ gọi @CurrentUserId() nên không cần sửa gì thêm.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const header = request.headers['x-user-id'];
    const value = Array.isArray(header) ? header[0] : header;
    if (value === undefined || value === '') return DEV_USER_ID;
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException('Header x-user-id phải là UUID hợp lệ.');
    }
    return value;
  },
);

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders - Tạo đơn hàng PENDING từ giỏ hàng (FR-12, AC-02.3, AC-02.4).
   *
   * Yêu cầu xác thực Bearer JWT hợp lệ. Danh tính userId được trích xuất trực tiếp từ JWT token.
   * Header `Idempotency-Key` (khuyến nghị): gửi lại cùng khóa thì trả lại đơn cũ (200),
   * không tạo đơn mới. Nếu thiếu, server tự sinh khóa.
   */
  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng mới ở trạng thái PENDING (yêu cầu JWT)' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc JWT token không hợp lệ.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = this.resolveKey(idempotencyKey);
    const { order, replayed } = await this.ordersService.create(
      user.id,
      key,
      dto,
    );
    res.status(replayed ? 200 : 201);
    return order;
  }

  private resolveKey(raw: string | undefined): string {
    if (raw === undefined) return randomUUID();
    const key = raw.trim();
    if (key.length === 0 || key.length > 128) {
      throw new BadRequestException(
        'Idempotency-Key phải có độ dài từ 1 đến 128 ký tự.',
      );
    }
    return key;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { CurrentUserId } from './current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders - Tạo đơn hàng PENDING từ giỏ hàng (FR-12).
   *
   * Header `Idempotency-Key` (khuyến nghị): gửi lại cùng khóa thì trả lại đơn cũ (200),
   * không tạo đơn mới. Nếu thiếu, server tự sinh khóa (không có bảo vệ gửi lặp).
   */
  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = this.resolveKey(idempotencyKey);
    const { order, replayed } = await this.ordersService.create(
      userId,
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

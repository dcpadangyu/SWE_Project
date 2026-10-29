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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
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
  @ApiOperation({ summary: 'Tạo đơn hàng mới ở trạng thái PENDING từ giỏ hàng (FR-12)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Khóa chống tạo trùng đơn (1–128 ký tự). Nếu gửi lặp lại cùng khóa sẽ trả về đơn đã tạo (HTTP 200). Nếu bỏ trống, server tự sinh UUID.',
    example: '3f2b8c1e-5a7d-4e2f-9b61-0c1d2e3f4a5b',
  })
  @ApiCreatedResponse({
    description: 'Tạo đơn hàng mới thành công ở trạng thái PENDING.',
    schema: {
      example: {
        orderId: '441df135-c462-46c6-94ef-f4b3de09d92f',
        orderCode: '#1042',
        status: 'PENDING',
        subtotal: '104000.00',
        discountAmount: '0.00',
        totalAmount: '104000.00',
        note: 'Ít đường, nhiều đá',
        createdAt: '2026-10-30T00:00:00.000Z',
        items: [
          {
            productId: '20000000-0000-4000-8000-000000000004',
            productName: 'Trà đào',
            size: 'L',
            quantity: 2,
            selectedToppings: [
              { id: 'extra-peach', name: 'Thêm đào', price: 8000 },
            ],
            unitPrice: '52000.00',
            subtotal: '104000.00',
          },
        ],
      },
    },
  })
  @ApiOkResponse({
    description: 'Trả lại đơn hàng cũ khi gửi trùng Idempotency-Key (Idempotent Replay).',
  })
  @ApiBadRequestResponse({
    description:
      'Dữ liệu không hợp lệ (giỏ hàng rỗng, size/topping không hợp lệ, hoặc client cố gửi trường giá/tổng tiền).',
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập hoặc JWT token không hợp lệ.',
  })
  @ApiConflictResponse({
    description:
      'Sản phẩm không đủ tồn kho (OUT_OF_STOCK) hoặc Idempotency-Key đã thuộc về người dùng khác.',
  })
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

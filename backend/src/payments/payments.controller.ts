import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Thanh toán không tiền mặt cho đơn hàng PENDING (Task 8 + Task 10.2 & 10.3)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Khóa chống trừ tiền / trừ kho trùng lặp (UUID v4). Nếu gửi lại cùng khóa sẽ phát lại đúng kết quả cũ.',
    example: '3f2b8c1e-5a7d-4e2f-9b61-0c1d2e3f4a5b',
  })
  @ApiOkResponse({
    description: 'Thanh toán thành công. Đơn hàng chuyển sang trạng thái PAID.',
    schema: {
      example: {
        orderId: '441df135-c462-46c6-94ef-f4b3de09d92f',
        orderNumber: 1042,
        status: 'PAID',
        totalAmount: '104000.00',
        payment: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          method: 'E_WALLET',
          status: 'SUCCESS',
          transactionCode: 'PAY-8F2D1A9C',
          amount: '104000.00',
          completedAt: '2026-11-01T21:40:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.PAYMENT_REQUIRED,
    description:
      'Cổng thanh toán từ chối giao dịch. Đơn hàng chuyển sang PAYMENT_FAILED (khách có thể thử lại tối đa 3 lần).',
  })
  @ApiBadRequestResponse({
    description:
      'Dữ liệu không hợp lệ hoặc thiếu header Idempotency-Key bắt buộc.',
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập hoặc JWT token không hợp lệ.',
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền thanh toán đơn hàng của người khác.',
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng cần thanh toán.',
  })
  @ApiConflictResponse({
    description:
      'Xung đột trạng thái đơn hàng, hết hàng (OUT_OF_STOCK) hoặc xung đột đồng thời (CONCURRENCY_CONFLICT).',
  })
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreatePaymentDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.processPayment(
      user.id,
      idempotencyKey,
      dto,
    );

    if (result.replayed) {
      res.setHeader('Idempotent-Replayed', 'true');
    }

    return result;
  }
}

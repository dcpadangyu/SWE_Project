import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Get,
  Query,
  Res,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVnpayPaymentDto } from './dto/create-vnpay-payment.dto';
import { VnpayCheckoutService } from './vnpay-checkout.service';
import { VnpayCallbackService } from './vnpay-callback.service';
import { VnpayReconciliationService } from './vnpay-reconciliation.service';
import { PaymentConfiguration } from './payment-configuration';

interface AuthenticatedUser {
  id: string;
}

@ApiTags('VNPay')
@Controller('payments/vnpay')
export class VnpayController {
  constructor(
    private readonly checkoutService: VnpayCheckoutService,
    private readonly callbackService: VnpayCallbackService,
    private readonly reconciliationService: VnpayReconciliationService,
    private readonly configuration: PaymentConfiguration,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo giao dịch PENDING và URL thanh toán VNPay',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Khóa riêng của lần thanh toán',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreateVnpayPaymentDto,
    @Req() req: Request,
  ) {
    this.configuration.requireProvider('VNPAY');
    const ipAddress = (
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    ).replace(/^::ffff:/, '');

    return this.checkoutService.createPayment(
      user.id,
      key,
      dto,
      ipAddress === '::1' ? '127.0.0.1' : ipAddress,
    );
  }

  @Post('reconcile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xác minh giao dịch cũ với VNPay trước khi thanh toán lại' })
  reconcile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVnpayPaymentDto,
    @Req() req: Request,
  ) {
    const ip = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
    return this.reconciliationService.reconcileOrder(user.id, dto.orderId, ip === '::1' ? '127.0.0.1' : ip);
  }

  @Get('return')
  @ApiOperation({
    summary: 'Nhận trình duyệt quay về từ VNPay',
  })
  async handleReturn(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const destination = await this.callbackService.getReturnUrl(query);

    return res.redirect(302, destination);
  }

  @Get('ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận thông báo kết quả thanh toán từ VNPay',
  })
  handleIpn(@Query() query: Record<string, unknown>) {
    return this.callbackService.handleIpn(query);
  }
}

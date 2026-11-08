import { Controller, Get, Header, Injectable, OnModuleInit, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaymentProvider } from '../common/types/brewlite';

@Injectable()
export class PaymentConfiguration implements OnModuleInit {
  onModuleInit() { this.getProvider(); }

  getProvider(): PaymentProvider {
    const value = process.env.PAYMENT_PROVIDER?.trim() || 'MOCK';
    if (value !== 'MOCK' && value !== 'VNPAY') {
      throw new ServiceUnavailableException('PAYMENT_PROVIDER phải là MOCK hoặc VNPAY.');
    }
    if (process.env.NODE_ENV === 'production' && value !== 'VNPAY') {
      throw new ServiceUnavailableException('Môi trường production yêu cầu PAYMENT_PROVIDER=VNPAY.');
    }
    return value;
  }

  requireProvider(expected: PaymentProvider) {
    if (this.getProvider() !== expected) {
      throw new ForbiddenException(`Chế độ thanh toán hiện tại không cho phép tạo giao dịch ${expected}. Hãy tải lại trang.`);
    }
  }
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentConfigurationController {
  constructor(private readonly configuration: PaymentConfiguration) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Chế độ thanh toán đang bật, không bao gồm khóa hoặc thông tin merchant' })
  getConfiguration() {
    return { provider: this.configuration.getProvider() };
  }
}

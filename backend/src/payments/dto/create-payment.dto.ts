import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export const PAYMENT_METHODS = [
  PaymentMethod.E_WALLET,
  PaymentMethod.BANK_CARD,
] as const;

export class CreatePaymentDto {
  @ApiProperty({
    description: 'UUID của đơn hàng cần thanh toán (trạng thái PENDING)',
    format: 'uuid',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @IsUUID('all', { message: 'orderId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'orderId không được để trống' })
  orderId!: string;

  @ApiProperty({
    description: 'Phương thức thanh toán: Ví điện tử (E_WALLET) hoặc Thẻ ngân hàng (BANK_CARD)',
    enum: PaymentMethod,
    example: PaymentMethod.E_WALLET,
  })
  @IsIn(PAYMENT_METHODS, {
    message: 'paymentMethod phải là E_WALLET hoặc BANK_CARD',
  })
  @IsNotEmpty({ message: 'paymentMethod không được để trống' })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Cờ mô phỏng thanh toán thất bại (phục vụ kiểm thử lỗi cổng thanh toán E3)',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'simulateFailure phải là kiểu boolean' })
  simulateFailure?: boolean;
}

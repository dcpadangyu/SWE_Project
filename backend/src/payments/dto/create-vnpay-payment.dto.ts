import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateVnpayPaymentDto {
  @ApiProperty({
    description: 'UUID của đơn hàng cần thanh toán',
    format: 'uuid',
  })
  @IsUUID('all', {
    message: 'orderId phải là UUID hợp lệ.',
  })
  orderId!: string;
}

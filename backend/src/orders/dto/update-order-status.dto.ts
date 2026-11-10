import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới cần chuyển đổi cho đơn hàng',
    enum: OrderStatus,
    example: OrderStatus.PREPARING,
  })
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn hàng không hợp lệ.',
  })
  status: OrderStatus;
}

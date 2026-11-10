import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Lý do khách hàng hủy đơn',
    example: 'Tôi đặt nhầm món, muốn đổi lại',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

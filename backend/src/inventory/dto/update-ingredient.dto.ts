import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIngredientDto {
  @ApiPropertyOptional({ description: 'Tên nguyên liệu', example: 'Hạt cà phê Arabica Cầu Đất' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Đơn vị tính', example: 'g' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Số lượng tồn kho', example: 4500 })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ description: 'Ngưỡng cảnh báo sắp hết', example: 300 })
  @IsOptional()
  @IsNumber()
  minThreshold?: number;

  @ApiPropertyOptional({ description: 'Lý do cập nhật', example: 'Điều chỉnh kiểm kê định kỳ' })
  @IsOptional()
  @IsString()
  reason?: string;
}

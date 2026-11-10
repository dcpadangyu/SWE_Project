import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ description: 'Tên nguyên liệu', example: 'Hạt cà phê Robusta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Đơn vị tính', example: 'g' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Số lượng ban đầu', example: 5000 })
  @IsNumber()
  stock: number;

  @ApiPropertyOptional({ description: 'Ngưỡng cảnh báo sắp hết', example: 500 })
  @IsOptional()
  @IsNumber()
  minThreshold?: number;
}

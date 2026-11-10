import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockAction {
  ADD = 'ADD',
  SET = 'SET',
}

export class UpdateIngredientStockDto {
  @ApiProperty({
    description: 'Số lượng cần điều chỉnh (số dương)',
    example: 1000,
  })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Hành động: ADD (cộng dồn) hoặc SET (ghi đè giá trị mới)',
    enum: StockAction,
    default: StockAction.ADD,
  })
  @IsOptional()
  @IsEnum(StockAction)
  action?: StockAction = StockAction.ADD;
}

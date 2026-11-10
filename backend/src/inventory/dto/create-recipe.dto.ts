import { IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Size } from '@prisma/client';

export class CreateRecipeDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '20000000-0000-4000-8000-000000000001' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID nguyên liệu', example: 'ing-coffee' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ description: 'Kích cỡ áp dụng', enum: Size, example: Size.M })
  @IsEnum(Size)
  size: Size;

  @ApiProperty({ description: 'Định lượng cần thiết cho 1 ly', example: 25 })
  @IsNumber()
  amount: number;
}

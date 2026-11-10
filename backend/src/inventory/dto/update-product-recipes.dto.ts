import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Size } from '@prisma/client';

export class UpdateRecipeItemDto {
  @ApiProperty({ description: 'ID nguyên liệu', example: 'c1234567-89ab-cdef-0123-456789abcdef' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ description: 'Kích cỡ', enum: Size, example: Size.M })
  @IsEnum(Size)
  size: Size;

  @ApiProperty({ description: 'Định lượng (theo đơn vị của nguyên liệu)', example: 25 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateProductRecipesDto {
  @ApiProperty({ description: 'Danh sách công thức mới cho sản phẩm', type: [UpdateRecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeItemDto)
  recipes: UpdateRecipeItemDto[];
}

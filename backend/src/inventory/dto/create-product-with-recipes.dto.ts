import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Size } from '@prisma/client';

export class RecipeItemInputDto {
  @ApiProperty({ description: 'ID nguyên liệu', example: 'c1234567-89ab-cdef-0123-456789abcdef' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ description: 'Kích cỡ áp dụng', enum: Size, example: Size.M })
  @IsEnum(Size)
  size: Size;

  @ApiProperty({ description: 'Định lượng (theo đơn vị của nguyên liệu)', example: 20 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateProductWithRecipesDto {
  @ApiProperty({ description: 'Tên đồ uống / món', example: 'Trà Sữa Oolong Nướng' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'ID danh mục (Mặc định Cà phê hoặc Trà)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Giá Size S', example: 35000 })
  @IsNumber()
  @Min(0)
  priceS: number;

  @ApiProperty({ description: 'Giá Size M', example: 40000 })
  @IsNumber()
  @Min(0)
  priceM: number;

  @ApiProperty({ description: 'Giá Size L', example: 45000 })
  @IsNumber()
  @Min(0)
  priceL: number;

  @ApiPropertyOptional({ description: 'Mô tả món', example: 'Hương vị trà oolong đậm đà' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL ảnh món', example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Danh sách công thức theo nguyên liệu và size', type: [RecipeItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemInputDto)
  recipes?: RecipeItemInputDto[];
}

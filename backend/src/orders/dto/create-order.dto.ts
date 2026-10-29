import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const ORDER_SIZES = ['S', 'M', 'L'] as const;
export type OrderSize = (typeof ORDER_SIZES)[number];

/**
 * Một dòng món trong giỏ hàng gửi lên khi tạo đơn.
 * Chỉ chứa lựa chọn của khách. KHÔNG có giá: backend tự lấy giá từ DB (AC-12.3).
 */
export class CreateOrderItemDto {
  @IsUUID('all', { message: 'productId phải là UUID hợp lệ' })
  productId!: string;

  @IsIn(ORDER_SIZES, { message: 'size phải là S, M hoặc L' })
  size!: OrderSize;

  @IsOptional()
  @IsArray({ message: 'toppingIds phải là mảng' })
  @ArrayUnique({ message: 'toppingIds không được trùng nhau' })
  @IsString({ each: true, message: 'Mỗi toppingId phải là chuỗi' })
  toppingIds?: string[];

  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity phải lớn hơn hoặc bằng 1' })
  @Max(99, { message: 'quantity tối đa là 99 mỗi dòng' })
  quantity!: number;
}

/**
 * Payload của POST /orders (FR-12).
 * Không có trường tổng tiền: ValidationPipe (forbidNonWhitelisted) sẽ trả 400
 * nếu client cố gửi `total`, `unitPrice`... (AC-12.3).
 */
export class CreateOrderDto {
  @IsArray({ message: 'items phải là mảng' })
  @ArrayMinSize(1, { message: 'Giỏ hàng không được rỗng' })
  @ArrayMaxSize(50, { message: 'Giỏ hàng tối đa 50 dòng' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString({ message: 'note phải là chuỗi' })
  @MaxLength(200, { message: 'note tối đa 200 ký tự' })
  note?: string;
}

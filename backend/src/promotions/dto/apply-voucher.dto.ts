/**
 * ============================================================================
 * APPLY VOUCHER DTO (ĐỐI TƯỢNG KIỂM TRA DỮ LIỆU ÁP DỤNG MÃ GIẢM GIÁ)
 * ============================================================================
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyVoucherDto {
  @ApiProperty({
    description: 'Mã giảm giá khách hàng nhập (ví dụ: BREWNEW10, CHAOBAN)',
    example: 'BREWNEW10',
  })
  @IsString({ message: 'Mã giảm giá phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã giảm giá.' })
  code: string;

  @ApiProperty({
    description: 'Tổng giá trị đơn hàng tạm tính trước khi giảm giá (VND)',
    example: 65000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá trị đơn hàng phải là kiểu số.' })
  @Min(0, { message: 'Giá trị đơn hàng không được âm.' })
  orderValue: number;
}

/**
 * Kết quả trả về sau khi áp dụng mã giảm giá hợp lệ
 */
export interface ApplyVoucherResult {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountAmount: number;
  finalAmount: number;
}

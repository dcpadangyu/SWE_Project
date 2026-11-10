/**
 * ============================================================================
 * REDEEM POINTS DTO (ĐỐI TƯỢNG DỮ LIỆU ĐỔI ĐIỂM THƯỞNG LẤY VOUCHER)
 * ============================================================================
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({
    description:
      'Mã gói đổi điểm thưởng (REWARD10K: 10 điểm -> 10.000đ, REWARD20K: 20 điểm -> 20.000đ, REWARD50K: 50 điểm -> 50.000đ)',
    example: 'REWARD10K',
    enum: ['REWARD10K', 'REWARD20K', 'REWARD50K'],
  })
  @IsString({ message: 'Mã gói đổi điểm phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã gói đổi điểm thưởng.' })
  rewardId: string;
}

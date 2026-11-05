/**
 * ============================================================================
 * PROMOTIONS CONTROLLER (ĐIỂM CUỐI API KHUYẾN MÃI & VOUCHER)
 * ============================================================================
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { ApplyVoucherDto, ApplyVoucherResult } from './dto/apply-voucher.dto';
import { ApiResponse } from '../common/types/brewlite';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * Endpoint kiểm tra và áp dụng mã giảm giá
   * Đường dẫn: POST http://localhost:8080/promotions/apply
   */
  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra mã giảm giá và tính số tiền giảm (Apply Voucher)',
  })
  @ApiOkResponse({
    description: 'Áp dụng mã giảm giá thành công.',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Áp dụng mã giảm giá thành công.',
        data: {
          code: 'BREWNEW10',
          discountType: 'PERCENTAGE',
          discountAmount: 6500,
          finalAmount: 58500,
        },
        timestamp: '2026-11-03T09:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Mã hết hạn, hết lượt dùng, ngừng kích hoạt hoặc đơn chưa đủ giá trị tối thiểu.',
  })
  @ApiNotFoundResponse({
    description: 'Mã giảm giá không tồn tại.',
  })
  async applyVoucher(
    @Body() dto: ApplyVoucherDto,
  ): Promise<ApiResponse<ApplyVoucherResult>> {
    const result = await this.promotionsService.applyVoucher(dto);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Áp dụng mã giảm giá thành công.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

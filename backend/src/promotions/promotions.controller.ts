/**
 * ============================================================================
 * PROMOTIONS CONTROLLER (ĐIỂM CUỐI API KHUYẾN MÃI & VOUCHER)
 * ============================================================================
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { ApplyVoucherDto, ApplyVoucherResult } from './dto/apply-voucher.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { ApiResponse } from '../common/types/brewlite';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

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

  /**
   * Endpoint lấy danh sách mã giảm giá còn hiệu lực và khả dụng
   * Đường dẫn: GET http://localhost:8080/promotions/vouchers
   */
  @Get('vouchers')
  @ApiOperation({
    summary: 'Lấy danh sách mã giảm giá khả dụng (Get Available Vouchers)',
  })
  @ApiOkResponse({
    description: 'Danh sách mã giảm giá khả dụng.',
  })
  async getAvailableVouchers() {
    return this.promotionsService.getAvailableVouchers();
  }

  /**
   * Endpoint đổi điểm tích lũy lấy mã giảm giá
   * Đường dẫn: POST http://localhost:8080/promotions/redeem-points
   */
  @UseGuards(JwtAuthGuard)
  @Post('redeem-points')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đổi điểm thưởng tích lũy lấy mã giảm giá (Redeem Points)',
  })
  @ApiOkResponse({
    description: 'Đổi điểm thưởng thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Gói đổi điểm không hợp lệ hoặc không đủ điểm.',
  })
  @ApiNotFoundResponse({
    description: 'Người dùng không tồn tại.',
  })
  async redeemPoints(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.promotionsService.redeemPoints(user.id, dto.rewardId);
  }
}

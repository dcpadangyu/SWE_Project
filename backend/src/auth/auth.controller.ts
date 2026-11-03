// backend/src/auth/auth.controller.ts
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng mới (FR-01)' })
  @ApiCreatedResponse({
    description: 'Đăng ký thành công, trả về thông tin người dùng.',
    schema: {
      example: {
        message: 'Đăng ký tài khoản thành công',
        user: {
          id: '10000000-0000-4000-8000-000000000001',
          email: 'khachhang@brewlite.vn',
          fullName: 'Nguyễn Văn A',
          role: 'CUSTOMER',
          loyaltyPoints: 0,
          createdAt: '2026-10-30T00:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đầu vào không hợp lệ (email sai định dạng hoặc mật khẩu < 6 ký tự).',
  })
  @ApiConflictResponse({
    description: 'Email này đã được sử dụng trong hệ thống.',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống và nhận JWT Access Token (FR-02)' })
  @ApiOkResponse({
    description: 'Đăng nhập thành công, trả về JWT token và thông tin người dùng.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '10000000-0000-4000-8000-000000000001',
          email: 'khachhang@brewlite.vn',
          fullName: 'Nguyễn Văn A',
          role: 'CUSTOMER',
          loyaltyPoints: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Thiếu email hoặc mật khẩu.' })
  @ApiUnauthorizedResponse({ description: 'Email hoặc mật khẩu không đúng.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ người dùng hiện tại từ JWT Token' })
  @ApiOkResponse({
    description: 'Thông tin người dùng đang đăng nhập.',
    schema: {
      example: {
        id: '10000000-0000-4000-8000-000000000001',
        email: 'khachhang@brewlite.vn',
        fullName: 'Nguyễn Văn A',
        role: 'CUSTOMER',
        loyaltyPoints: 0,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc JWT token không hợp lệ / hết hạn.' })
  async getProfile(@CurrentUser() user: unknown) {
    return user;
  }
}

// backend/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService (FR-01 & FR-02 with Prisma)', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register (FR-01)', () => {
    it('AC-01.1, AC-01.4, AC-01.5: Tạo tài khoản mới với loyaltyPoints = 0 và không trả về passwordHash', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async ({ data }) => ({
        id: 'user-uuid-1',
        ...data,
      }));

      const result = await service.register({
        email: 'test@brewlite.vn',
        password: 'password123',
      });

      expect(result).toEqual({
        id: 'user-uuid-1',
        email: 'test@brewlite.vn',
        loyaltyPoints: 0,
      });
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('AC-01.2: Ném lỗi ConflictException khi email đã tồn tại', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'test@brewlite.vn',
      });

      await expect(
        service.register({ email: 'test@brewlite.vn', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login (FR-02)', () => {
    it('AC-02.1: Cấp JWT token hợp lệ khi đúng email và mật khẩu', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@brewlite.vn',
        passwordHash: hashedPassword,
        role: 'CUSTOMER',
        loyaltyPoints: 10,
      });

      const result = await service.login({
        email: 'test@brewlite.vn',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@brewlite.vn');
    });

    it('AC-02.2: Từ chối đăng nhập với thông báo chung khi sai mật khẩu', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@brewlite.vn',
        passwordHash: hashedPassword,
      });

      await expect(
        service.login({ email: 'test@brewlite.vn', password: 'wrong_password' }),
      ).rejects.toThrow(
        new UnauthorizedException('Email hoặc mật khẩu không đúng'),
      );
    });
  });
});
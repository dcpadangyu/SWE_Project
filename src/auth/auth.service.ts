// backend/src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/types/brewlite';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // AC-01.2: Kiểm tra trùng email
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trong hệ thống');
    }

    // AC-01.4 & NFR-05: Băm mật khẩu bằng bcrypt
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // AC-01.1: Tạo tài khoản mới với loyaltyPoints = 0
    const newUser = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName,
      role: Role.CUSTOMER,
      loyaltyPoints: 0,
    });

    const savedUser = await this.userRepository.save(newUser);

    // AC-01.5: Chỉ trả về id, email, loyaltyPoints (không trả passwordHash)
    return {
      id: savedUser.id,
      email: savedUser.email,
      loyaltyPoints: savedUser.loyaltyPoints,
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Lấy kèm passwordHash để đối chiếu
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();

    // AC-02.2: Thông báo lỗi chung nếu sai email hoặc mật khẩu
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordMatching = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // AC-02.1: Cấp JWT Token hợp lệ
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }
}
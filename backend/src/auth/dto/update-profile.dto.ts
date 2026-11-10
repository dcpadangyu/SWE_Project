import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Họ và tên người dùng / nhân viên',
    example: 'Nguyễn Văn Pha Chế',
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự.' })
  fullName?: string;
}

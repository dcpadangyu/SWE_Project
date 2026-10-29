// backend/src/users/entities/user.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/types/brewlite';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ unique: true })
  email: string;

  // select: false giúp ngăn việc vô tình truy vấn lộ mật khẩu băm ra ngoài
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true })
  fullName?: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CUSTOMER,
  })
  role: Role;

  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints: number;
}
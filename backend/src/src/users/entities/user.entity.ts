// backend/src/users/entities/user.entity.ts
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/types/brewlite';

export class UserEntity extends BaseEntity {
  email: string;
  passwordHash: string;
  fullName?: string | null;
  role?: Role;
  loyaltyPoints: number = 0;

  constructor(partial?: Partial<UserEntity>) {
    super();
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
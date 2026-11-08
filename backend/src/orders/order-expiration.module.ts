import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderExpirationService } from './order-expiration.service';

@Module({ imports: [PrismaModule], providers: [OrderExpirationService], exports: [OrderExpirationService] })
export class OrderExpirationModule {}

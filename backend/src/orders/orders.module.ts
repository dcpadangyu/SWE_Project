import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderExpirationModule } from './order-expiration.module';

@Module({
  imports: [PrismaModule, PromotionsModule, OrderExpirationModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

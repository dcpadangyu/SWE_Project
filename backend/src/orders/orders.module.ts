import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderExpirationModule } from './order-expiration.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, PromotionsModule, OrderExpirationModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

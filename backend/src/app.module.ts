import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './Product/products.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ProductsModule,
    HealthModule,
    OrdersModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY || 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET || 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

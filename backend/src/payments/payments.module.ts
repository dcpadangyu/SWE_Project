import { Module } from '@nestjs/common';
import { VnpayCallbackService } from './vnpay-callback.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { VnpayController } from './vnpay.controller';
import { VnpayService } from './vnpay.service';
import { VnpayCheckoutService } from './vnpay-checkout.service';
import { VnpayReconciliationService } from './vnpay-reconciliation.service';

@Module({
  imports: [AuthModule, PrismaModule, PromotionsModule],
  controllers: [PaymentsController, VnpayController],
  providers: [
    PaymentsService,
    VnpayService,
    VnpayCheckoutService,
    VnpayCallbackService,
    VnpayReconciliationService,
  ],
  exports: [PaymentsService, VnpayService],
})
export class PaymentsModule {}

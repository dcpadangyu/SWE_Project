import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import { VnpayCallbackService } from './vnpay-callback.service';
import { ORDER_PAYMENT_EXPIRED } from '../orders/order-payment-window';

@Injectable()
export class VnpayReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: VnpayService,
    private readonly callback: VnpayCallbackService,
  ) {}

  async reconcileOrder(userId: string, orderId: string, ipAddress: string) {
    const readOrder = () => this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { orderBy: { attemptNumber: 'desc' as const } } },
    });
    let order = await readOrder();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');

    const describe = (message?: string) => {
      const active = order!.payments.filter(p => p.status === PaymentStatus.PENDING);
      const collected = order!.payments.some(p =>
        p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.REFUNDED);
      const allowed = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] as OrderStatus[];
      const usable = active.length === 0 || (active.length === 1 &&
        active[0].provider === 'VNPAY' && !active[0].errorCode &&
        active[0].amount.equals(order!.totalAmount) && !!active[0].paymentUrl &&
        !!active[0].expiresAt && active[0].expiresAt.getTime() > Date.now());
      return {
        orderId, status: order!.status,
        canPay: allowed.includes(order!.status) && !collected && usable &&
          (active.length > 0 || (order!.payments[0]?.attemptNumber ?? 0) < 3),
        message: message ?? 'Đã cập nhật trạng thái đơn hàng.',
      };
    };

    const pending = order.payments.filter(p => p.status === PaymentStatus.PENDING);
    const isTimeoutCancellation = order.status === OrderStatus.CANCELLED &&
      pending.length === 1 && pending[0].errorCode === ORDER_PAYMENT_EXPIRED;
    if (pending.length !== 1 || pending[0].provider !== 'VNPAY' ||
      (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED && !isTimeoutCancellation)) {
      return describe();
    }
    const payment = pending[0];
    let message = 'Giao dịch chưa được xác nhận. Chưa thể tạo lượt thanh toán mới.';
    try {
      const result = await this.gateway.queryPayment(payment, ipAddress);
      const code = String(result.vnp_ResponseCode).padStart(2, '0');
      const status = String(result.vnp_TransactionStatus).padStart(2, '0');
      // querydr giữ số tiền theo đơn vị x100, khác với verifyIpnCall của SDK.
      const amount = Number(result.vnp_Amount) / 100;
      const valid = result.isVerified && result.isSuccess && code === '00' &&
        result.vnp_Command === 'querydr' && result.vnp_TxnRef === payment.id &&
        String(result.vnp_TransactionType).padStart(2, '0') === '01' &&
        Number.isFinite(amount) && payment.amount.equals(amount);

      if (valid && ['00', '02'].includes(status)) {
        const reply = await this.callback.confirmVerifiedPayment({
          isVerified: true,
          isSuccess: status === '00',
          message: status === '00' ? 'Đã xác minh thanh toán.' : 'VNPay xác nhận giao dịch thất bại.',
          vnp_TmnCode: this.gateway.getMerchantCode(),
          vnp_TxnRef: payment.id,
          vnp_Amount: amount,
          // Mã querydr=00 là truy vấn thành công, không phải thanh toán thành công.
          vnp_ResponseCode: status === '00' ? '00' : '02',
          vnp_TransactionStatus: status,
          vnp_TransactionNo: result.vnp_TransactionNo,
          vnp_PayDate: result.vnp_PayDate,
        });
        message = ['00', '02'].includes(reply.RspCode)
          ? (status === '00' ? 'Đã ghi nhận thanh toán. Hãy kiểm tra trạng thái đơn.' :
            'Giao dịch cũ thất bại. Bạn có thể thử thanh toán lại nếu chưa hết số lượt.')
          : 'Chưa ghi nhận được kết quả xác minh. Vui lòng kiểm tra lại sau.';
      } else if (!result.isVerified) {
        message = 'Không xác minh được phản hồi VNPay. Chưa thể tạo lượt thanh toán mới.';
      } else if (code === '91') {
        message = 'VNPay chưa tìm thấy giao dịch cũ. Vui lòng kiểm tra lại sau hoặc liên hệ cửa hàng để đối soát.';
      } else if (valid && status === '01') {
        message = 'VNPay báo giao dịch chưa hoàn tất. Nếu URL hết hạn, cần chờ xác nhận trước khi thanh toán lại.';
      }
    } catch {
      message = 'Chưa kết nối được VNPay để xác minh. Vui lòng kiểm tra lại sau.';
    }
    // IPN có thể về trong lúc gọi mạng: luôn đọc lại, không ghi đè trạng thái cũ.
    order = await readOrder();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return describe(message);
  }
}

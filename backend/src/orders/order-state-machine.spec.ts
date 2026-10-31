import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  assertOrderTransition,
  canTransitionOrder,
} from './order-state-machine';

//[Trạng thái hiện tại, Trạng thái muốn chuyển tới]
const validTransitions: [OrderStatus, OrderStatus][] = [
  [OrderStatus.PENDING, OrderStatus.PAID],
  [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PENDING, OrderStatus.CANCELLED],

  [OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING],
  [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],

  [OrderStatus.PAID, OrderStatus.PREPARING],
  [OrderStatus.PAID, OrderStatus.CANCELLED],

  [OrderStatus.PREPARING, OrderStatus.READY],
  [OrderStatus.READY, OrderStatus.COMPLETED],
];

//Lấy danh sách tất cả trạng thái
const statuses = Object.values(OrderStatus);

const invalidTransitions: [OrderStatus, OrderStatus][] = [];

for (const current of statuses) {
  for (const target of statuses) {
    //Kiểm tra cặp hiện tại có hợp lệ không
    const isValid = validTransitions.some(
      ([from, to]) => from === current && to === target,
    );

    if (!isValid) {
      invalidTransitions.push([current, target]);
    }
  }
}

describe('canTransitionOrder', () => {
  it.each(validTransitions)(
    'trả true khi chuyển %s → %s',
    (current, target) => {
      expect(canTransitionOrder(current, target)).toBe(true);
    },
  );

  it.each(invalidTransitions)(
    'trả false khi chuyển %s → %s',
    (current, target) => {
      expect(canTransitionOrder(current, target)).toBe(false);
    },
  );
});

describe('assertOrderTransition', () => {
  it.each(validTransitions)(
    'không ném lỗi khi chuyển %s → %s',
    (current, target) => {
      expect(() => assertOrderTransition(current, target)).not.toThrow();
    },
  );

  it.each(invalidTransitions)(
    'ném ConflictException khi chuyển %s → %s',
    (current, target) => {
      expect(() => assertOrderTransition(current, target)).toThrow(
        ConflictException,
      );
    },
  );

  it('thông báo lỗi chứa trạng thái nguồn và đích', () => {
    expect(() =>
      assertOrderTransition(OrderStatus.PENDING, OrderStatus.COMPLETED),
    ).toThrow('Không thể chuyển đơn hàng từ PENDING sang COMPLETED.');
  });
});

describe('Quy tắc nghiệp vụ trọng yếu', () => {
  it.each<[string, OrderStatus, OrderStatus]>([
    [
      'không hủy được khi đã pha chế',
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [
      'không hủy được khi đã sẵn sàng',
      OrderStatus.READY,
      OrderStatus.CANCELLED,
    ],
    [
      'trạng thái COMPLETED là cuối',
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ],
    [
      'không nhảy cóc khi chưa thanh toán',
      OrderStatus.PENDING,
      OrderStatus.COMPLETED,
    ],
  ])('%s', (_label, from, to) => {
    expect(canTransitionOrder(from, to)).toBe(false);
    expect(() => assertOrderTransition(from, to)).toThrow(ConflictException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: {
    create: jest.Mock;
    findMyOrders: jest.Mock;
    findOneForUser: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findMyOrders: jest.fn(),
      findOneForUser: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('PATCH :id/status (Task 10.1 Order State Machine)', () => {
    it('chuyển trạng thái đơn sang PREPARING thành công', async () => {
      const orderId = '441df135-c462-46c6-94ef-f4b3de09d92f';
      const expectedResponse = { orderId, status: OrderStatus.PREPARING };
      service.updateStatus.mockResolvedValue(expectedResponse);

      const result = await controller.updateStatus(orderId, {
        status: OrderStatus.PREPARING,
      });

      expect(result).toEqual(expectedResponse);
      expect(service.updateStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.PREPARING,
      );
    });

    it('bắt lỗi ConflictException nếu chuyển trạng thái không hợp lệ', async () => {
      const orderId = '441df135-c462-46c6-94ef-f4b3de09d92f';
      service.updateStatus.mockRejectedValue(
        new ConflictException('Không thể chuyển đơn hàng từ PENDING sang COMPLETED.'),
      );

      await expect(
        controller.updateStatus(orderId, { status: OrderStatus.COMPLETED }),
      ).rejects.toThrow(ConflictException);
    });

    it('bắt lỗi NotFoundException nếu không tìm thấy đơn', async () => {
      const orderId = '441df135-c462-46c6-94ef-f4b3de09d92f';
      service.updateStatus.mockRejectedValue(
        new NotFoundException('Không tìm thấy đơn hàng cần cập nhật.'),
      );

      await expect(
        controller.updateStatus(orderId, { status: OrderStatus.READY }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET :id', () => {
    it('lấy chi tiết đơn của người dùng', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      const orderId = '441df135-c462-46c6-94ef-f4b3de09d92f';
      service.findOneForUser.mockResolvedValue({ orderId, status: 'PENDING' });

      const result = await controller.findOne(user, orderId);

      expect(result).toEqual({ orderId, status: 'PENDING' });
      expect(service.findOneForUser).toHaveBeenCalledWith('user-1', orderId);
    });
  });
});

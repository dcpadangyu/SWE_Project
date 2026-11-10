import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus, Role } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('OrdersController', () => {
  let controller: OrdersController;
  let reflector: Reflector;
  let service: {
    create: jest.Mock;
    findMyOrders: jest.Mock;
    findStaffOrders: jest.Mock;
    findOneForUser: jest.Mock;
    updateStatus: jest.Mock;
    approveRefund: jest.Mock;
  };

  beforeEach(async () => {
    reflector = new Reflector();
    service = {
      create: jest.fn(),
      findMyOrders: jest.fn(),
      findStaffOrders: jest.fn(),
      findOneForUser: jest.fn(),
      updateStatus: jest.fn(),
      approveRefund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: service },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('RBAC Role Authorization', () => {
    it('PATCH :id/status phải yêu cầu role BARISTA hoặc ADMIN', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        OrdersController.prototype.updateStatus,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.BARISTA);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.CUSTOMER);
    });

    it('GET staff/all phải yêu cầu role BARISTA hoặc ADMIN', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        OrdersController.prototype.findStaffOrders,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.BARISTA);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.CUSTOMER);
    });

    it('POST :id/approve-refund phải yêu cầu role BARISTA hoặc ADMIN', () => {
      const roles = reflector.get<Role[]>(
        ROLES_KEY,
        OrdersController.prototype.approveRefund,
      );
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.BARISTA);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.CUSTOMER);
    });
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

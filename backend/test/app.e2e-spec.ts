import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('BrewLite E2E Flow (Mục 5.2)', () => {
  let app: INestApplication<App> | undefined;
  let prisma: PrismaService | undefined;

  const categoryId = randomUUID();
  const productId = randomUUID();

  const mainKey = randomUUID();
  const unauthorizedKey = randomUUID();
  const replayKey = randomUUID();

  const checkoutKeys = [mainKey, unauthorizedKey, replayKey];
  const testEmails: string[] = [];

  const password = 'MatKhau123!';

  function getApp(): INestApplication<App> {
    if (!app) {
      throw new Error('Ứng dụng test chưa được khởi tạo.');
    }

    return app;
  }

  function getPrisma(): PrismaService {
    if (!prisma) {
      throw new Error('Prisma test chưa được khởi tạo.');
    }

    return prisma;
  }

  function createOrderPayload() {
    return {
      items: [
        {
          productId,
          size: 'M',
          quantity: 2,
          toppingIds: ['jelly'],
        },
      ],
      note: 'Ít đá',
    };
  }

  // Mỗi lần gọi tạo tài khoản riêng qua API thật.
  async function registerAndLogin() {
    const server = getApp().getHttpServer();
    const email = `e2e-${randomUUID()}@example.com`;

    // Ghi nhận trước để cleanup kể cả khi test lỗi giữa chừng.
    testEmails.push(email);

    const registerRes = await request(server)
      .post('/auth/register')
      .send({
        email,
        password,
        fullName: 'Khách hàng E2E',
      })
      .expect(201);

    const userId: string = registerRes.body.id;

    expect(userId).toEqual(expect.any(String));
    expect(registerRes.body.email).toBe(email);
    expect(registerRes.body.loyaltyPoints).toBe(0);
    expect(registerRes.body).not.toHaveProperty('password');
    expect(registerRes.body).not.toHaveProperty('passwordHash');

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken: string = loginRes.body.accessToken;

    expect(accessToken).toEqual(expect.any(String));
    expect(accessToken.length).toBeGreaterThan(0);
    expect(loginRes.body.user.id).toBe(userId);
    expect(loginRes.body.user).not.toHaveProperty('passwordHash');

    return { userId, accessToken };
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const testApp =
      moduleFixture.createNestApplication<INestApplication<App>>();

    // Lưu lại để các test và afterAll sử dụng.
    app = testApp;

    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    testApp.useGlobalFilters(new AllExceptionsFilter());

    const db = testApp.get<PrismaService>(PrismaService);
    prisma = db;

    await testApp.init();

    await db.$transaction(async (tx) => {
      await tx.category.create({
        data: {
          id: categoryId,
          name: 'Danh mục E2E',
        },
      });

      await tx.product.create({
        data: {
          id: productId,
          categoryId,
          name: 'Trà đào E2E',
          priceS: 34000,
          priceM: 39000,
          priceL: 44000,
          stock: 10,
          isAvailable: true,
          toppingOptions: [
            {
              id: 'jelly',
              name: 'Thạch',
              price: 5000,
              isAvailable: true,
            },
          ],
        },
      });
    });
  });

  it('/ (GET) - Kiểm tra khởi động ứng dụng', async () => {
    await request(getApp().getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('Xem menu → đăng ký → đăng nhập → tạo và kiểm tra đơn PENDING', async () => {
    const server = getApp().getHttpServer();
    const db = getPrisma();

    // BƯỚC 1: Xem menu.
    const menuRes = await request(server).get('/products').expect(200);

    expect(Array.isArray(menuRes.body)).toBe(true);

    expect(menuRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: productId,
          name: 'Trà đào E2E',
          priceM: 39000,
          stock: 10,
          isAvailable: true,
        }),
      ]),
    );

    // BƯỚC 2: Đăng ký và đăng nhập.
    const { userId, accessToken } = await registerAndLogin();

    // BƯỚC 3: Tạo đơn.
    const orderRes = await request(server)
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', mainKey)
      .send(createOrderPayload())
      .expect(201);

    const order = orderRes.body;

    // (39.000 giá M + 5.000 topping) × 2 = 88.000.
    expect(order.orderId).toEqual(expect.any(String));
    expect(order.orderCode).toMatch(/^#\d+$/);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.subtotal).toBe('88000.00');
    expect(order.discountAmount).toBe('0.00');
    expect(order.totalAmount).toBe('88000.00');
    expect(order.note).toBe('Ít đá');

    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productId,
      productName: 'Trà đào E2E',
      size: 'M',
      quantity: 2,
      unitPrice: '44000.00',
      subtotal: '88000.00',
    });

    // BƯỚC 4: Kiểm tra dữ liệu đã lưu trong DB.
    const storedOrder = await db.order.findUnique({
      where: { id: order.orderId },
      include: { items: true },
    });

    expect(storedOrder).not.toBeNull();

    if (!storedOrder) {
      throw new Error('Không tìm thấy đơn trong database.');
    }

    expect(storedOrder.userId).toBe(userId);
    expect(storedOrder.checkoutKey).toBe(mainKey);
    expect(storedOrder.status).toBe(OrderStatus.PENDING);
    expect(storedOrder.note).toBe('Ít đá');
    expect(storedOrder.subtotal.toFixed(2)).toBe('88000.00');
    expect(storedOrder.discountAmount.toFixed(2)).toBe('0.00');
    expect(storedOrder.totalAmount.toFixed(2)).toBe('88000.00');

    expect(storedOrder.items).toHaveLength(1);

    const line = storedOrder.items[0];

    expect(line).toMatchObject({
      productId,
      productName: 'Trà đào E2E',
      size: 'M',
      quantity: 2,
      selectedToppings: [
        {
          id: 'jelly',
          name: 'Thạch',
          price: 5000,
        },
      ],
    });

    expect(line.unitPrice.toFixed(2)).toBe('44000.00');
    expect(line.subtotal.toFixed(2)).toBe('88000.00');

    // Theo thiết kế hiện tại: tạo PENDING chưa trừ kho.
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    expect(product?.stock).toBe(10);
  });

  it('Thiếu JWT → trả 401 và không tạo đơn', async () => {
    const db = getPrisma();

    await request(getApp().getHttpServer())
      .post('/orders')
      .set('Idempotency-Key', unauthorizedKey)
      .send(createOrderPayload())
      .expect(401);

    const count = await db.order.count({
      where: { checkoutKey: unauthorizedKey },
    });

    expect(count).toBe(0);
  });

  it('Gửi lại cùng Idempotency-Key → chỉ tạo một đơn', async () => {
    const server = getApp().getHttpServer();
    const db = getPrisma();

    // Tài khoản riêng, không phụ thuộc test trước.
    const { userId, accessToken } = await registerAndLogin();
    const payload = createOrderPayload();

    const firstRes = await request(server)
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', replayKey)
      .send(payload)
      .expect(201);

    const secondRes = await request(server)
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', replayKey)
      .send(payload)
      .expect(200);

    expect(firstRes.body.orderId).toEqual(expect.any(String));
    expect(secondRes.body.orderId).toBe(firstRes.body.orderId);
    expect(secondRes.body).toEqual(firstRes.body);

    const orders = await db.order.findMany({
      where: {
        userId,
        checkoutKey: replayKey,
      },
      include: { items: true },
    });

    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(firstRes.body.orderId);
    expect(orders[0].items).toHaveLength(1);

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    expect(product?.stock).toBe(10);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          const orderFilter = {
            checkoutKey: { in: checkoutKeys },
          };

          // Chỉ xóa dữ liệu của lần chạy này.
          // Xóa bản ghi con trước bản ghi cha.
          await tx.orderItem.deleteMany({
            where: { order: orderFilter },
          });

          await tx.order.deleteMany({
            where: orderFilter,
          });

          await tx.user.deleteMany({
            where: { email: { in: testEmails } },
          });

          await tx.product.deleteMany({
            where: { id: productId },
          });

          await tx.category.deleteMany({
            where: { id: categoryId },
          });
        });
      }
    } finally {
      await app?.close();
    }
  });
});

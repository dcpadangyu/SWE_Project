<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## API tạo đơn hàng - `POST /orders` (Task 6)

Tạo đơn hàng trạng thái `PENDING` từ giỏ hàng (SRS FR-12). Chưa thanh toán, chưa trừ kho.

### Chạy thử

```bash
docker compose up -d db          # ở thư mục gốc repo
cd backend
npm install
npx prisma migrate deploy        # tạo bảng (gồm orders, order_items)
npm run prisma:seed              # nạp menu mẫu
npm run start:dev                # http://localhost:8080
```

Cần `backend/.env` với `DATABASE_URL` trỏ đúng cổng DB (xem `.env.example`).
Lấy `productId` từ `GET /products` (id mẫu: `20000000-0000-4000-8000-000000000004` = Trà đào).

### Request

```http
POST /orders
Content-Type: application/json
Idempotency-Key: 3f2b8c1e-5a7d-4e2f-9b61-0c1d2e3f4a5b

{
  "items": [
    { "productId": "20000000-0000-4000-8000-000000000004", "size": "L",
      "toppingIds": ["extra-peach", "jelly"], "quantity": 2 }
  ],
  "note": "ít đường"
}
```

| Trường | Quy tắc |
| :--- | :--- |
| `items` | Mảng, 1 đến 50 dòng. |
| `items[].productId` | UUID của sản phẩm. |
| `items[].size` | `S`, `M` hoặc `L`. |
| `items[].toppingIds` | Tùy chọn. Không trùng, phải thuộc sản phẩm và còn phục vụ. |
| `items[].quantity` | Số nguyên từ 1 đến 99. |
| `note` | Tùy chọn, tối đa 200 ký tự. |
| Header `Idempotency-Key` | Tùy chọn (1 đến 128 ký tự). Gửi lại cùng khóa thì trả lại đơn cũ (HTTP 200), không tạo đơn mới. Thiếu thì server tự sinh khóa. |

**Không gửi tổng tiền hay đơn giá.** Backend tự tính từ giá trong DB (AC-12.3).
Gửi thêm trường lạ như `total` hoặc `unitPrice` sẽ bị `400`.

### Response `201 Created`

```json
{
  "orderId": "441df135-c462-46c6-94ef-f4b3de09d92f",
  "orderCode": "#1042",
  "status": "PENDING",
  "subtotal": "114000.00",
  "discountAmount": "0.00",
  "totalAmount": "114000.00",
  "note": "ít đường",
  "createdAt": "2026-10-27T08:50:39.079Z",
  "items": [
    { "productId": "...", "productName": "Trà đào", "size": "L", "quantity": 2,
      "selectedToppings": [{ "id": "extra-peach", "name": "Thêm đào", "price": 8000 }],
      "unitPrice": "57000.00", "subtotal": "114000.00" }
  ]
}
```

### Mã lỗi

| HTTP | Khi nào |
| :--- | :--- |
| `400` | Dữ liệu sai (giỏ rỗng, `quantity` không hợp lệ, size sai, trường lạ), sản phẩm không tồn tại hoặc ngừng bán, topping không hợp lệ. |
| `409` | Hết hàng (`code: OUT_OF_STOCK`, `details.outOfStock[]` liệt kê món thiếu). Tồn kho được cộng dồn theo sản phẩm giữa các dòng. Toàn bộ đơn bị hủy, không lưu đơn nào. |
| `409` | `Idempotency-Key` đã thuộc người dùng khác. |

### Lưu ý

- **Người dùng tạm thời:** Task 7 (JWT) chưa merge nên chưa có Guard. Controller đọc header
  `x-user-id` (UUID, mặc định một user giả). Đây chỉ dùng để phát triển và không an toàn cho production.
  Khi có JWT, thay `CurrentUserId` trong `src/orders/current-user.decorator.ts` bằng user lấy từ token.
- **Voucher và `paymentMethod`** chưa nằm trong request (thuộc Task 8 và Task 10).
- Kiểm tra: `npm test` (unit test cho tính tiền, tồn kho, idempotency, validate DTO).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

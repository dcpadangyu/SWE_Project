import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

function loadSource(name, imports, globals = {}) {
  const source = fs.readFileSync(path.join(testDirectory, '../utils', name + '.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: id => imports[id], URL, Error,
    crypto: { randomUUID }, ...globals,
  });
  return exports;
}

function setup(responses, reconciliation = {}) {
  const calls = [];
  const client = loadSource('apiClient', {}, {
    process: { env: {} }, window: {},
    localStorage: { getItem: () => 'test-token' }, console,
    fetch: async (url, config) => {
      calls.push({ url, config });
      const next = responses.shift();
      assert.ok(next, 'Unexpected extra request');
      return new Response(JSON.stringify(next.body), { status: next.status });
    },
  });
  let queryCount = 0;
  const { startVnpayPayment } = loadSource('startVnpayPayment', {
    './apiClient': client,
    './vnpayReconciliation': { reconcileVnpayOrder: async () => {
      queryCount += 1;
      return reconciliation;
    } },
  });
  const keys = [];
  return {
    calls, keys, queryCount: () => queryCount,
    start: () => startVnpayPayment('order-1', 'original-key', key => keys.push(key)),
  };
}

const success = { status: 200, body: {
  orderId: 'order-1', paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?test=1',
} };
const conflict = { status: 409, body: { message: 'Expired payment' } };

test('FE gọi trực tiếp API như Swagger, gửi JWT và khóa chống trùng', async () => {
  const app = setup([success]);
  const result = await app.start();
  assert.equal(result.kind, 'payment');
  assert.equal(new URL(result.url).hostname, 'sandbox.vnpayment.vn');
  assert.equal(app.queryCount(), 0);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].url, 'http://localhost:8080/payments/vnpay/create');
  assert.equal(app.calls[0].config.headers.Authorization, 'Bearer test-token');
  assert.equal(app.calls[0].config.headers['Idempotency-Key'], 'original-key');
  assert.equal(JSON.parse(app.calls[0].config.body).orderId, 'order-1');
});

test('hết hạn chưa xác minh được thì không mở lượt thu tiền mới', async () => {
  const app = setup([conflict], { status: 'PENDING', canPay: false, message: 'Chờ đối soát' });
  await assert.rejects(app.start(), /Chờ đối soát/);
  assert.equal(app.queryCount(), 1);
  assert.equal(app.calls.length, 1);
  assert.equal(app.keys.length, 0);
});

test('xác nhận thất bại rồi mới đổi khóa và tạo lượt mới', async () => {
  const app = setup([conflict, success], { status: 'PAYMENT_FAILED', canPay: true });
  assert.equal((await app.start()).kind, 'payment');
  assert.equal(app.keys.length, 1);
  assert.notEqual(app.keys[0], 'original-key');
  assert.equal(app.calls[1].config.headers['Idempotency-Key'], app.keys[0]);
});

test('đơn đã PAID chuyển về đơn, không gọi tạo thanh toán lần hai', async () => {
  const app = setup([conflict], { status: 'PAID', canPay: false });
  const result = await app.start();
  assert.equal(result.kind, 'order');
  assert.equal(result.orderId, 'order-1');
  assert.equal(app.calls.length, 1);
});

test('lỗi JWT không kích hoạt đối soát hay tạo thêm giao dịch', async () => {
  const app = setup([{ status: 401, body: { message: 'Unauthorized' } }]);
  await assert.rejects(app.start(), /Unauthorized/);
  assert.equal(app.queryCount(), 0);
  assert.equal(app.calls.length, 1);
});

for (const invalid of [
  { orderId: 'other-order', paymentUrl: success.body.paymentUrl },
  { orderId: 'order-1', paymentUrl: 'https://example.com/checkout' },
  { orderId: 'order-1', paymentUrl: 'http://sandbox.vnpayment.vn/checkout' },
]) {
  test('không chuyển hướng với phản hồi sai đơn hoặc URL: ' + invalid.paymentUrl, async () => {
    const app = setup([{ status: 200, body: invalid }]);
    await assert.rejects(app.start(), /Địa chỉ cổng thanh toán không hợp lệ/);
  });
}

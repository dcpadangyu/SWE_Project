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

function setup(responses, reconciliation = {}, env = {}) {
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
  }, { process: { env } });
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

test('FE đọc provider từ BE, không cache và không đoán Mock khi config lỗi', async () => {
  const calls = [];
  const { getPaymentProvider } = loadSource('paymentConfiguration', {
    './apiClient': { apiClient: { get: async (...args) => { calls.push(args); return { provider: 'MOCK' }; } } },
  });
  assert.equal(await getPaymentProvider(), 'MOCK');
  assert.equal(calls[0][0], '/payments/config');
  assert.equal(calls[0][1].cache, 'no-store');
  const invalid = loadSource('paymentConfiguration', {
    './apiClient': { apiClient: { get: async () => ({ provider: 'TYPO' }) } },
  });
  await assert.rejects(invalid.getPaymentProvider(), /không hợp lệ/);
});

for (const provider of ['MOCK', 'VNPAY']) {
  test('dispatcher gọi đúng luồng ' + provider + ', không gọi cổng còn lại', async () => {
    let mockCount = 0;
    let vnpayCount = 0;
    const { startPayment } = loadSource('startPayment', {
      './apiClient': { ApiError: class extends Error {}, apiClient: { post: async (path, data, options) => {
        mockCount++;
        assert.equal(path, '/payments');
        assert.equal(data.orderId, 'order-1');
        assert.equal(options.headers['Idempotency-Key'], 'same-key');
        return { orderId: 'order-1', status: 'PAID' };
      } } },
      './startVnpayPayment': { startVnpayPayment: async (orderId, key) => {
        vnpayCount++;
        assert.equal(key, 'same-key');
        return { kind: 'payment', url: success.body.paymentUrl };
      } },
    });
    assert.equal((await startPayment(provider, 'order-1', 'same-key', () => {})).kind,
      provider === 'MOCK' ? 'order' : 'payment');
    assert.equal(mockCount, provider === 'MOCK' ? 1 : 0);
    assert.equal(vnpayCount, provider === 'VNPAY' ? 1 : 0);
  });
}

for (const status of [402, 403, 500]) {
  test('Mock lỗi ' + status + ': không tự chuyển sang VNPay, chỉ đổi khóa khi thất bại đã xác nhận', async () => {
    class TestApiError extends Error { constructor(status) { super('payment error'); this.status = status; } }
    const keys = [];
    let vnpayCount = 0;
    const { startPayment } = loadSource('startPayment', {
      './apiClient': { ApiError: TestApiError, apiClient: { post: async () => { throw new TestApiError(status); } } },
      './startVnpayPayment': { startVnpayPayment: async () => { vnpayCount++; } },
    });
    await assert.rejects(startPayment('MOCK', 'order-1', 'same-key', key => keys.push(key)), /payment error/);
    assert.equal(keys.length, status === 402 ? 1 : 0);
    assert.equal(vnpayCount, 0);
  });
}

for (const result of [{ orderId: 'other-order', status: 'PAID' }, { orderId: 'order-1', status: 'PENDING' }]) {
  test('Mock không báo thành công với phản hồi không khớp: ' + JSON.stringify(result), async () => {
    const { startPayment } = loadSource('startPayment', {
      './apiClient': { ApiError: class extends Error {}, apiClient: { post: async () => result } },
      './startVnpayPayment': {},
    });
    await assert.rejects(startPayment('MOCK', 'order-1', 'same-key', () => {}), /Chưa xác nhận/);
  });
}

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
  { orderId: 'order-1', paymentUrl: 'https://sandbox.vnpayment.vn:8443/checkout' },
  { orderId: 'order-1', paymentUrl: 'https://sandbox.vnpayment.vn.evil.example/checkout' },
  { orderId: 'order-1', paymentUrl: 'https://user:password@sandbox.vnpayment.vn/checkout' },
  { orderId: 'order-1', paymentUrl: 'not-a-url' },
]) {
  test('không chuyển hướng với phản hồi sai đơn hoặc URL: ' + invalid.paymentUrl, async () => {
    const app = setup([{ status: 200, body: invalid }]);
    await assert.rejects(app.start(), /Địa chỉ cổng thanh toán không hợp lệ/);
  });
}

test('cho phép host khác khi cấu hình chính xác origin HTTPS', async () => {
  const app = setup([{ status: 200, body: {
    orderId: 'order-1', paymentUrl: 'https://gateway.example:8443/checkout?signature=test',
  } }], {}, { NEXT_PUBLIC_VNPAY_ALLOWED_ORIGINS:
    'https://sandbox.vnpayment.vn, https://gateway.example:8443/' });
  assert.equal((await app.start()).url, 'https://gateway.example:8443/checkout?signature=test');
});

test('cấu hình origin thay thế không tự động cho phép sandbox', async () => {
  const app = setup([success], {}, {
    NEXT_PUBLIC_VNPAY_ALLOWED_ORIGINS: 'https://gateway.example',
  });
  await assert.rejects(app.start(), /Địa chỉ cổng thanh toán không hợp lệ/);
});

for (const origin of ['', 'http://gateway.example', 'https://user@gateway.example',
  'https://gateway.example/checkout', 'https://gateway.example?x=1', 'not-a-url']) {
  test('chặn cấu hình origin không hợp lệ: ' + origin, async () => {
    const app = setup([success], {}, { NEXT_PUBLIC_VNPAY_ALLOWED_ORIGINS: origin });
    await assert.rejects(app.start(), /Địa chỉ cổng thanh toán không hợp lệ/);
  });
}

const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { loadTestEnvironment } = require('./test-environment.cjs');

try {
  // Bắt buộc kiểm tra DB test trước khi Prisma được phép thay đổi schema.
  loadTestEnvironment();
  console.log('E2E: đồng bộ migration trên brewlite_test, không reset hoặc seed DB.');
  const result = spawnSync(process.execPath, [
    require.resolve('prisma/build/index.js'), 'migrate', 'deploy',
  ], { cwd: resolve(__dirname, '..'), env: process.env, stdio: 'inherit' });
  if (result.error) throw new Error('Không khởi chạy được Prisma migrate deploy cho E2E.');
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

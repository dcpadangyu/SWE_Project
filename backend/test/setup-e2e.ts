import { config } from 'dotenv';
import { resolve } from 'node:path';

const result = config({
  path: resolve(__dirname, '../.env.test'),
  override: true,
});

if (result.error) {
  throw new Error('Không đọc được backend/.env.test.');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Thiếu DATABASE_URL trong .env.test.');
}

const parsedUrl = new URL(databaseUrl);

if (
  process.env.NODE_ENV !== 'test' ||
  !['postgresql:', 'postgres:'].includes(parsedUrl.protocol) ||
  parsedUrl.pathname !== '/brewlite_test'
) {
  throw new Error('E2E yêu cầu NODE_ENV=test và database brewlite_test.');
}

if (!process.env.JWT_SECRET) {
  throw new Error('Thiếu JWT_SECRET trong .env.test.');
}

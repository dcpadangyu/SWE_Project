const { config } = require('dotenv');
const { resolve } = require('node:path');

function loadTestEnvironment() {
  const result = config({ path: resolve(__dirname, '../.env.test'), override: true });
  if (result.error) throw new Error('Không đọc được backend/.env.test.');
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL trong .env.test.');

  let url;
  try { url = new URL(process.env.DATABASE_URL); }
  catch { throw new Error('DATABASE_URL trong .env.test không hợp lệ.'); }
  if (process.env.NODE_ENV !== 'test' ||
      !['postgresql:', 'postgres:'].includes(url.protocol) || url.pathname !== '/brewlite_test') {
    throw new Error('E2E yêu cầu NODE_ENV=test và database brewlite_test.');
  }
  const schema = url.searchParams.get('schema');
  if (schema && schema !== 'public') throw new Error('E2E yêu cầu schema public của brewlite_test.');
  if (!process.env.JWT_SECRET) throw new Error('Thiếu JWT_SECRET trong .env.test.');
}

module.exports = { loadTestEnvironment };

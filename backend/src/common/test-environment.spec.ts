import { config } from 'dotenv';

jest.mock('dotenv', () => ({ config: jest.fn() }));
const { loadTestEnvironment } = require('../../test/test-environment.cjs') as {
  loadTestEnvironment: () => void;
};

describe('Bảo vệ DB khi chuẩn bị/chạy E2E', () => {
  const names = ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));

  beforeEach(() => {
    jest.mocked(config).mockReset().mockReturnValue({ parsed: {} });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/brewlite_test?schema=public';
    process.env.JWT_SECRET = 'test-only';
  });
  afterEach(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });

  it('đọc .env.test với override và cho phép DB test/schema public', () => {
    expect(() => loadTestEnvironment()).not.toThrow();
    expect(config).toHaveBeenCalledWith({ path: expect.stringMatching(/\.env\.test$/), override: true });
  });

  it.each([
    'postgresql://test:test@localhost:5432/brewlite_db',
    'postgresql://test:test@localhost:5432/brewlite_test_copy',
    'postgresql://test:test@localhost:5432/brewlite_test?schema=other',
    'mysql://test:test@localhost:3306/brewlite_test',
    'invalid-url',
  ])('từ chối URL sai trước khi migrate hoặc tạo dữ liệu test: %s', url => {
    process.env.DATABASE_URL = url;
    expect(() => loadTestEnvironment()).toThrow();
  });

  it('từ chối môi trường production dù tên DB là brewlite_test', () => {
    process.env.NODE_ENV = 'production';
    expect(() => loadTestEnvironment()).toThrow('NODE_ENV=test');
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])('từ chối thiếu %s', name => {
    delete process.env[name];
    expect(() => loadTestEnvironment()).toThrow(name);
  });

  it('không dùng môi trường terminal nếu thiếu .env.test', () => {
    jest.mocked(config).mockReturnValue({ error: new Error('missing file') });
    expect(() => loadTestEnvironment()).toThrow('Không đọc được');
  });
});

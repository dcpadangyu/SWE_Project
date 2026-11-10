# ============================================================================
# BREWLITE BACKEND (NESTJS) - DOCKERFILE ĐA TẦNG (MULTI-STAGE BUILD)
# ============================================================================

# Stage 1: Build source code
FROM node:20-alpine AS builder

WORKDIR /app

# Copy tệp dependency và lược đồ Prisma trước để tận dụng Docker layer cache
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Sinh Prisma Client trước khi biên dịch TypeScript
RUN npx prisma generate

# Copy toàn bộ mã nguồn và biên dịch NestJS sang JavaScript (thư mục dist/)
COPY . .
RUN npm run build

# Stage 2: Runtime image tối ưu dung lượng
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Cài đặt dependencies cho môi trường chạy (production) và sinh Prisma Client
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy mã đã biên dịch từ Stage builder
COPY --from=builder /app/dist ./dist

# Mở cổng API 8080
EXPOSE 8080

# Áp dụng migration, tự động nạp seed nếu CSDL mới tinh, và khởi động ứng dụng
CMD ["sh", "-c", "npx prisma migrate deploy && node -e \"const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.product.count().then(async (c) => { if (c === 0) { console.log('[Docker] CSDL trống, tự động nạp dữ liệu mẫu seed.ts...'); require('child_process').execSync('npm run prisma:seed', { stdio: 'inherit' }); } await p.\\$disconnect(); }).catch(e => console.error(e));\" && node dist/main"]

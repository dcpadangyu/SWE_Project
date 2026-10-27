# ============================================================================
# BREWLITE BACKEND (NESTJS) - DOCKERFILE ĐA TẦNG (MULTI-STAGE BUILD)
# ============================================================================

# Stage 1: Build source code
FROM node:20-alpine AS builder

WORKDIR /app

# Copy tệp dependency trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm ci

# Copy toàn bộ mã nguồn và biên dịch NestJS sang JavaScript (thư mục dist/)
COPY . .
RUN npm run build

# Stage 2: Runtime image tối ưu dung lượng
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Cài đặt chỉ các dependencies cần thiết cho môi trường chạy (production)
COPY package*.json ./
RUN npm ci --only=production

# Copy mã đã biên dịch từ Stage builder
COPY --from=builder /app/dist ./dist

# Mở cổng API 8080
EXPOSE 8080

# Khởi chạy ứng dụng
CMD ["node", "dist/main"]

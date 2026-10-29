# ============================================================================
# BREWLITE FRONTEND (NEXT.JS) - DOCKERFILE ĐA TẦNG (MULTI-STAGE BUILD)
# ============================================================================

# Stage 1: Build mã nguồn Next.js
FROM node:20-alpine AS builder

WORKDIR /app

# Tận dụng cache của Docker cho dependencies
COPY package*.json ./
RUN npm ci

COPY . .

# Truyền địa chỉ API vào bước build của Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Tắt gửi dữ liệu telemetry của Next.js trong quá trình build
ENV NEXT_TELEMETRY_DISABLED=1

# Biên dịch Next.js (retry tự động nếu Next.js 16.4 hiển thị thông báo nâng cấp ở lần chạy đầu)
RUN npm run build || npm run build

# Stage 2: Runtime image tối ưu
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Cài đặt production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy thư mục build và tài nguyên tĩnh
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

# Mở cổng giao diện web 3000
EXPOSE 3000

# Khởi chạy Next.js Server
CMD ["npm", "start"]

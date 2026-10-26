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

# Tắt gửi dữ liệu telemetry của Next.js trong quá trình build
ENV NEXT_TELEMETRY_DISABLED=1

# Biên dịch Next.js (SSG/SSR)
RUN npm run build

# Stage 2: Runtime image tối ưu
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Cài đặt production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy thư mục build và tài nguyên tĩnh
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Mở cổng giao diện web 3000
EXPOSE 3000

# Khởi chạy Next.js Server
CMD ["npm", "start"]

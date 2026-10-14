# BrewLite

Ứng dụng đặt cà phê không dùng tiền mặt. Bài tập lớn môn Công nghệ Phần mềm, Trường Đại học Sài Gòn, thực hiện theo quy trình Agile Scrum.

## Công nghệ
- Backend: NestJS (TypeScript)
- Frontend: Next.js (React, TypeScript, TailwindCSS)
- Cơ sở dữ liệu: PostgreSQL (sẽ tích hợp ở các task sau)

## Yêu cầu cài đặt
- Node.js 24 LTS
- Git

## Cấu trúc thư mục
```
SWE_Project/
├── backend/    # NestJS REST API
├── frontend/   # Next.js
└── README.md
```

## Cách chạy

### Backend
```bash
cd backend
npm install
copy .env.example .env
npm run start:dev
```
Backend chạy ở http://localhost:8080 (hiển thị "Hello World!").

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
Frontend chạy ở http://localhost:3000 (hiển thị "Hello BrewLite").

Lưu ý: lệnh `copy` dành cho Windows. Trên macOS/Linux dùng `cp`.
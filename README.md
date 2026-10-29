# Sàn đặt lịch Photobooth — MVP

Khung ứng dụng MVP cho nền tảng đặt lịch photobooth (đặc tả nghiệp vụ v0.8).
Thư mục này chứa khung khởi đầu: frontend React + Vite, backend Node.js + Express,
và dự kiến MongoDB + Mongoose (chưa kết nối database thật ở bước này).

## Cấu trúc thư mục

```
Photobooth/
├─ CLAUDE.md            # Quy tắc dự án (stack, nghiệp vụ, ranh giới nhiệm vụ)
├─ README.md            # File này
├─ .gitignore
├─ docs/                # Đặc tả v0.8 + tóm tắt nghiệp vụ + quyết định kỹ thuật
├─ client/              # Frontend: React + Vite
│  ├─ index.html
│  ├─ vite.config.js
│  ├─ package.json
│  └─ src/
│     ├─ main.jsx
│     └─ App.jsx
└─ server/              # Backend: Node.js + Express
   ├─ index.js          # GET /api/health + CORS (qua biến môi trường)
   ├─ package.json
   └─ .env.example
```

## Yêu cầu

- **Node.js** phiên bản 18 trở lên (khuyến nghị 20+). Kiểm tra: `node --version`.
- **npm** (đi kèm Node). Kiểm tra: `npm --version`.

## Cài đặt

Chạy lệnh này từ **thư mục gốc** `Photobooth/`:

```bash
npm install --prefix client
npm install --prefix server
```

Mỗi lệnh tạo ra file lockfile (`client/package-lock.json`, `server/package-lock.json`) —
đã được cam kết vào repo.

### (Tuỳ chọn) Tạo file môi trường backend

```bash
copy server\.env.example server\.env
```

(Sau này khi thêm MongoDB/secret, sửa `server/.env` — file này **không** được commit.)

## Chạy frontend (dev)

Từ thư mục gốc:

```bash
npm run dev --prefix client
```

Mở http://localhost:5173 (Vite dev server).

## Chạy backend (dev)

Mở **thêm** một terminal, từ thư mục gốc:

```bash
npm run dev --prefix server
```

Backend khởi động tại http://localhost:3000 (mặc định, có thể đổi bằng biến `PORT`).

Kiểm tra endpoint health:

```bash
curl http://localhost:3000/api/health
```

Kết quả mong đợi (JSON):

```json
{ "status": "ok", "service": "photobooth-server", "timestamp": "..." }
```

## Biến môi trường (backend)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng HTTP của backend. |
| `CORS_ORIGINS` | (rỗng) | Danh sách origin được phép, phân tách bằng dấu phẩy (VD `http://localhost:5173,http://127.0.0.1:5173`). Để rỗng = cho phép mọi origin (chỉ dùng dev). |

## Build frontend (production)

Từ thư mục gốc:

```bash
npm run build --prefix client
```

Kết quả nằm trong `client/dist/`. Chạy xem trước build:

```bash
npm run preview --prefix client
```

## Ghi chú

- Ở bước này **chưa kết nối database thật** và **chưa có chức năng nghiệp vụ**
  (đặt lịch, đăng nhập, thanh toán, model). Đây chỉ là khung khởi động.
- Chi tiết nghiệp vụ: xem `docs/requirements-summary.md` và `docs/technical-decisions.md`.

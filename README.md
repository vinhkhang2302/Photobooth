# Sàn đặt lịch Photobooth — MVP

Khung ứng dụng MVP cho nền tảng đặt lịch photobooth (đặc tả nghiệp vụ v0.8).
Thư mục này chứa khung khởi đầu: frontend React + Vite, backend Node.js + Express,
và database MongoDB Atlas kết nối bằng Mongoose (URI cấu hình qua biến `MONGODB_URI`).

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
└─ server/              # Backend: Node.js + Express + Mongoose
   ├─ index.js          # Khởi động: kết nối MongoDB trước khi listen; GET /api/health + CORS
   ├─ config/
   │  └─ db.js         # connectDB/disconnectDB (Mongoose, đọc MONGODB_URI)
   ├─ package.json
   ├─ .env.example     # Mẫu cấu hình (không chứa bí mật)
   └─ .env             # Tạo từ .env.example — KHÔNG commit
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

### Tạo file môi trường backend (bắt buộc)

Backend cần `MONGODB_URI` để kết nối MongoDB Atlas; server **không khởi động** nếu thiếu.

```bash
copy server\.env.example server\.env
```

Sau đó mở `server/.env` và điền:

- `MONGODB_URI` — connection string của cluster Atlas (định dạng `mongodb+srv://...`), lấy từ console MongoDB Atlas.
- `PORT` (tuỳ chọn) — cổng backend, mặc định `3000`.
- `CORS_ORIGINS` (tuỳ chọn) — origin được phép, mặc định `http://localhost:5173,http://127.0.0.1:5173`.

> ⚠️ `server/.env` chứa credential — **không được commit** (đã có trong `.gitignore`). Chỉ commit `.env.example`.

## Chạy ứng dụng (dev) — hai terminal riêng

Ứng dụng gồm **hai phần chạy độc lập**, mỗi phần chạy trong một terminal riêng từ **thư mục gốc**:

**Terminal 1 — backend** (kết nối MongoDB Atlas trước, sau đó mới lắng nghe request):

```bash
npm run dev --prefix server
```

Backend khởi động tại http://localhost:3000 (mặc định, có thể đổi bằng biến `PORT`).
Khi kết nối thành công sẽ thấy log: `MongoDB connected` → `Photobooth server listening on http://localhost:3000`.
Nếu thiếu `MONGODB_URI` hoặc không kết nối được Atlas, server **in lỗi an toàn và thoát** (không lộ connection string/mật khẩu).

**Terminal 2 — frontend:**

```bash
npm run dev --prefix client
```

Mở http://localhost:5173 (Vite dev server).

### Kiểm tra health check

```bash
curl http://localhost:3000/api/health
```

Kết quả mong đợi (JSON) khi database đang kết nối:

```json
{ "status": "ok", "service": "photobooth-server", "db": "connected", "timestamp": "..." }
```

Trường `db` trả về `"connected"` (đang kết nối Mongoose) hoặc `"disconnected"`. Response **không bao giờ** chứa connection string, username hay password.

## Biến môi trường (backend)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `MONGODB_URI` | (không có) | **Bắt buộc.** Connection string MongoDB Atlas (`mongodb+srv://...`). Để trong `server/.env`, không commit. Server không khởi động nếu thiếu. |
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

- Backend **đã kết nối MongoDB Atlas bằng Mongoose** (file `server/config/db.js`),
  URI lấy từ biến `MONGODB_URI` trong `server/.env` (bắt buộc, không commit).
- Hiện **chưa có chức năng nghiệp vụ** (đặt lịch, đăng nhập, thanh toán, model).
  Đây vẫn là khung khởi động.
- Chi tiết nghiệp vụ: xem `docs/requirements-summary.md` và `docs/technical-decisions.md`.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./config/db.js";

// Nạp server/.env bằng đường dẫn xác định từ vị trí file này (không phụ thuộc
// thư mục terminal đang đứng). index.js nằm trong server/ → .env cùng thư mục.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS cấu hình qua biến môi trường (giữ nguyên logic hiện tại).
// CORS_ORIGINS: danh sách origin phân tách bằng dấu phẩy, ví dụ
//   "http://localhost:5173,http://127.0.0.1:5173"
// Khi không đặt (môi trường dev): cho phép mọi origin (chỉ dùng local dev).
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: true })
);

app.use(express.json());

// Endpoint kiểm tra hoạt động: trả trạng thái server + trạng thái database.
// Không bao giờ bao gồm connection string, username, password hay thông tin nhạy cảm.
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    service: "photobooth-server",
    db: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// 404 cho các đường API chưa định nghĩa
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

let httpServer;

// Đóng kết nối Mongoose an toàn khi nhận tín hiệu dừng (không thêm kiến trúc phức tạp).
function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  if (httpServer) {
    httpServer.close();
  }
  disconnectDB()
    .catch(() => {})
    .finally(() => process.exit(0));
}

async function main() {
  // Kết nối MongoDB TRƯỚC khi lắng nghe request.
  try {
    await connectDB();
  } catch (err) {
    // Báo lỗi an toàn: không in process.env, không in nội dung .env, không lộ URI/mật khẩu.
    console.error(
      `Không thể khởi động: ${err.name === "ConfigError" ? err.message : "kết nối MongoDB thất bại. Kiểm tra MONGODB_URI, mạng và cấu hình Atlas (IP allowlist, firewall)."}`
    );
    process.exit(1);
  }

  httpServer = app.listen(PORT, () => {
    console.log(`Photobooth server listening on http://localhost:${PORT}`);
    console.log(
      `CORS origins: ${corsOrigins.length > 0 ? corsOrigins.join(", ") : "(mọi origin - dev)"}`
    );
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();

export default app;

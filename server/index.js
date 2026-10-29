import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS cấu hình qua biến môi trường (yêu cầu 3).
// CORS_ORIGINS: danh sách origin phân tách bằng dấu phẩy, ví dụ
//   "http://localhost:5173,http://127.0.0.1:5173"
// Khi không đặt (môi trường dev): cho phép mọi origin (chỉ dùng local dev).
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(
    corsOrigins.length > 0
      ? { origin: corsOrigins }
      : { origin: true }
  )
);

app.use(express.json());

// Endpoint kiểm tra hoạt động
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "photobooth-server",
    timestamp: new Date().toISOString(),
  });
});

// 404 cho các đường API chưa định nghĩa
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Lưu ý: Mongoose được khai báo như dependency (chuẩn bị cho giai đoạn sau)
// nhưng CHƯA kết nối database ở bước khung MVP này.

app.listen(PORT, () => {
  console.log(`Photobooth server listening on http://localhost:${PORT}`);
  console.log(
    `CORS origins: ${corsOrigins.length > 0 ? corsOrigins.join(", ") : "(mọi origin - dev)"}`
  );
});

export default app;

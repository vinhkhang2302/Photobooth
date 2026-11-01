import mongoose from "mongoose";

// Thời gian chờ chọn server (ms) — đủ để Atlas/VPN phản hồi mà không treo lâu.
const SERVER_SELECTION_TIMEOUT_MS = 10000;

/**
 * Kết nối MongoDB bằng Mongoose.
 * - Đọc connection string từ process.env.MONGODB_URI (không hardcode credential).
 * - Báo lỗi rõ nếu biến môi trường thiếu/trống.
 * - Resolve khi kết nối thành công, reject khi thiếu cấu hình hoặc lỗi.
 *
 * An toàn: không bao giờ log/in nội dung URI, username hay password.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === "") {
    const err = new Error(
      "Thiếu MONGODB_URI: đặt connection string MongoDB Atlas vào biến môi trường " +
        "MONGODB_URI (xem server/.env.example) trước khi khởi động."
    );
    err.name = "ConfigError";
    throw err;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });

  // host/name không phải bí mật (không chứa credential) — an toàn để log.
  const host = mongoose.connection.host || "(host chưa rõ)";
  const db = mongoose.connection.name || "(db mặc định)";
  console.log(`MongoDB connected: host=${host}, db=${db}`);
  return mongoose.connection;
}

/**
 * Đóng kết nối Mongoose an toàn (dùng cho SIGINT/SIGTERM).
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) {
    console.log("MongoDB was not connected; nothing to close.");
    return;
  }
  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
}

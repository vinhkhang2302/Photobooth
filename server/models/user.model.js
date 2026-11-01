import { Schema } from "mongoose";
import mongoose from "mongoose";
import { emailFormat } from "./validators.js";

// ---------------------------------------------------------------------------
// User -> collection `users`
// Nguồn: docs/database-design.md sec 2.1 (index sec 3).
// ---------------------------------------------------------------------------

export const USER_ROLES = ["CUSTOMER", "STUDIO_OWNER", "STUDIO_STAFF", "ADMIN"];
export const USER_STATUSES = ["ACTIVE", "SUSPENDED"];

const options = {
  autoIndex: false, // KHÔNG tự tạo index khi connect (rule C / 2A.4)
  autoCreate: false, // KHÔNG tự tạo collection khi connect
  strict: true, // chỉ cho các trường đã khai báo trong design
  timestamps: true, // quản lý createdAt / updatedAt (createdAt được design quy là B)
};

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    // unique + chuẩn hóa (lowercase/trim) — index unique khai báo bên dưới.
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: emailFormat,
    },

    // Xác minh cho studio (tùy chọn).
    phone: { type: String },

    // Băm (argon2/bcrypt) — KHÔNG plaintext (design sec 2.1).
    // Trường bắt buộc, giá trị lưu dạng hash (không giữ plaintext).
    // (Giữ đúng thiết kế: không thêm select:false hay hành vi query khác.)
    passwordHash: { type: String, required: true },

    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, required: true, default: "ACTIVE" },

    emailVerifiedAt: { type: Date },
  },
  options
);

// Index (khai báo; chưa thực thi trên Atlas — rule C).
userSchema.index({ email: 1 }, { unique: true });

// Khai báo collection name TƯỜNG MINH (không dựa pluralize/lowercase mặc định — 2A.4 CN1).
export const User = mongoose.model("User", userSchema, "users");
export { userSchema };

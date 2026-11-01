import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Room -> collection `rooms`
// Nguồn: docs/database-design.md sec 2.4 (index sec 3).
//
// Ghi chú: theo design, `rooms` KHÔNG có trường giá/buffer — giá nằm trong
// `services` (V08-06) và giờ hoạt động/buffer nằm trong `studios.scheduling`
// (A6, M5). Vì vậy không khai báo trường tiền ở đây (chuẩn 2B.1: chỉ dùng
// trường đã được tài liệu cho phép).
// ---------------------------------------------------------------------------

export const ROOM_STATUSES = ["ACTIVE", "INACTIVE"];

const options = {
  autoIndex: false,
  autoCreate: false,
  strict: true,
  timestamps: true,
};

const roomSchema = new Schema(
  {
    studioId: { type: Types.ObjectId, ref: "Studio", required: true },
    name: { type: String, required: true, trim: true },
    // Số NGUYÊN DƯƠNG (2B.1a): 0, số âm, 2.5, NaN, Infinity bị từ chối.
    // (`min: 1` không chặn số không nguyên như 2.5, nên bổ sung validator.)
    capacity: {
      type: Number,
      min: 1,
      validate: {
        validator: (v) =>
          v == null || (Number.isInteger(v) && v >= 1),
        message: "room.capacity phải là số nguyên dương (>=1).",
      },
    },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    status: { type: String, enum: ROOM_STATUSES, required: true, default: "ACTIVE" },
  },
  options
);

// Index (design sec 3) — khai báo, chưa thực thi trên Atlas (rule C).
roomSchema.index({ studioId: 1, status: 1 });

// Collection name tường minh (2A.4 CN1).
export const Room = mongoose.model("Room", roomSchema, "rooms");
export { roomSchema };

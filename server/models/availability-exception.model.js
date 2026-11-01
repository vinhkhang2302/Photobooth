import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// AvailabilityException -> collection `availabilityExceptions`
// Nguồn: docs/database-design.md sec 2.6 (A6, M3), index sec 3 + rule C.
//
// Quy tắc priority (CLOSED/BLOCKED > EXTENDED, M3) là LOGIC NGHIỆP VỤ —
// thuộc tầng service (Giai đoạn sau), model chỉ giữ dữ liệu + ràng buộc cấu trúc.
// ---------------------------------------------------------------------------

export const EXC_SCOPES = ["STUDIO", "ROOM"];
export const EXC_TYPES = ["CLOSED", "BLOCKED", "EXTENDED"];

const options = {
  autoIndex: false,
  autoCreate: false,
  strict: true,
  timestamps: true,
};

const availabilityExceptionSchema = new Schema(
  {
    studioId: { type: Types.ObjectId, ref: "Studio", required: true },

    // nullable: scope=STUDIO → mọi phòng; scope=ROOM → bắt buộc (kiểm tra bên dưới).
    roomId: { type: Types.ObjectId, ref: "Room" },

    scope: { type: String, enum: EXC_SCOPES, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    type: { type: String, enum: EXC_TYPES, required: true },
    reason: { type: String, required: true, trim: true },
  },
  options
);

// Ràng buộc cấu trúc (cross-field):
// - scope ROOM → roomId BẮT BUỘC; scope STUDIO → roomId phải bỏ trống (null).
// - startAt < endAt (khoảng thời gian hợp lệ).
availabilityExceptionSchema.pre("validate", function (next) {
  if (this.scope === "ROOM" && !this.roomId) {
    return next(new Error("availabilityException: scope = ROOM yêu cầu roomId (design sec 2.6)."));
  }
  if (this.scope === "STUDIO" && this.roomId) {
    return next(new Error("availabilityException: scope = STUDIO không dùng roomId (phải là null)."));
  }
  if (this.startAt && this.endAt && this.startAt.getTime() >= this.endAt.getTime()) {
    return next(new Error("availabilityException: startAt phải sớm hơn endAt."));
  }
  next();
});

// Index (khai báo trong schema; CHƯA thực thi trên Atlas — rule C):
// - { studioId, scope, startAt, endAt } (design sec 3 — kiểm tra ngoại lệ chồng theo studio/phòng, A6/M3)
// - { roomId: 1 } KHÔNG unique + partial filter scope="ROOM" (rule C, 2A.1 — roomId chỉ có khi scope ROOM)
availabilityExceptionSchema.index({ studioId: 1, scope: 1, startAt: 1, endAt: 1 });
availabilityExceptionSchema.index(
  { roomId: 1 },
  { partialFilterExpression: { scope: "ROOM" } }
);

// Collection name tường minh (2A.4 CN1 — camelCase, Mongoose không pluralize đúng camelCase).
export const AvailabilityException = mongoose.model(
  "AvailabilityException",
  availabilityExceptionSchema,
  "availabilityExceptions"
);
export { availabilityExceptionSchema };

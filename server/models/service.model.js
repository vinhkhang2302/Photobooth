import { Schema, Types } from "mongoose";
import mongoose from "mongoose";
import { vndSafeInt } from "./validators.js";

// ---------------------------------------------------------------------------
// Service -> collection `services`
// Nguồn: docs/database-design.md sec 2.5 (A1 tiền, V08-06/07), index sec 3.
// ---------------------------------------------------------------------------

export const PRICING_MODES = ["HOURLY", "BLOCK", "PACKAGE"];
export const SERVICE_STATUSES = ["ACTIVE", "INACTIVE"];

const options = {
  autoIndex: false,
  autoCreate: false,
  strict: true,
  timestamps: true,
};

const serviceSchema = new Schema(
  {
    studioId: { type: Types.ObjectId, ref: "Studio", required: true },
    name: { type: String, required: true, trim: true },

    pricingMode: { type: String, enum: PRICING_MODES, required: true },

    // A1: tiền VND, số nguyên an toàn, không âm.
    // (validator đặt trong `validate:` — Mongoose chỉ đọc `validator`/`message`
    //  ở trong object `validate`, không đọc property `validator` cấp trường.)
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: vndSafeInt.validator,
        message: vndSafeInt.message,
      },
    },

    // Thời lượng (V08-02): chỉ hợp lệ với BLOCK; bước 30 phút (min 30).
    durationMinutes: {
      type: Number,
      min: 30,
      validate: {
        validator: (v) =>
          v == null || (Number.isInteger(v) && v % 30 === 0),
        message: "durationMinutes phải là bội số 30 (≥30).",
      },
    },

    // V08-07: gói gồm phòng → không cộng giá phòng lần hai.
    includesRoom: { type: Boolean, required: true, default: false },

    // V08-06: giá phần vượt theo 30 phút, studio khai báo (tùy chọn).
    overagePer30Min: {
      type: Number,
      min: 0,
      validate: {
        validator: vndSafeInt.validator,
        message: vndSafeInt.message,
      },
    },

    conditions: { type: String },
    status: { type: String, enum: SERVICE_STATUSES, required: true, default: "ACTIVE" },
  },
  options
);

// Cross-field (quy tắc nghiệp vụ, không chặn ở tầng DB): durationMinutes BẮT
// BUỘC khi pricingMode = BLOCK.
serviceSchema.pre("validate", function (next) {
  if (this.pricingMode === "BLOCK" && !Number.isInteger(this.durationMinutes)) {
    return next(
      new Error("service: durationMinutes bắt buộc (bội số 30) khi pricingMode = BLOCK.")
    );
  }
  next();
});

// Index (design sec 3) — khai báo, chưa thực thi trên Atlas (rule C).
serviceSchema.index({ studioId: 1, status: 1, pricingMode: 1 });

// Collection name tường minh (2A.4 CN1).
export const Service = mongoose.model("Service", serviceSchema, "services");
export { serviceSchema };

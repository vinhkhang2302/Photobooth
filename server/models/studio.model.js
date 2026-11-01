import { Schema, Types } from "mongoose";
import mongoose from "mongoose";
import { emailFormat } from "./validators.js";

// ---------------------------------------------------------------------------
// Studio -> collection `studios`
// Nguồn: docs/database-design.md sec 2.2 (A6, A7, M1, M4, M5), index sec 3.
// ---------------------------------------------------------------------------

export const STUDIO_STATUSES = [
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "CLOSED",
];

// M4: weekday ISO 8601, 1 = Thứ 2 ... 7 = Chủ nhật.
const WEEKDAY_MIN = 1;
const WEEKDAY_MAX = 7;

const options = {
  autoIndex: false, // KHÔNG tự tạo index khi connect (rule C / 2A.4)
  autoCreate: false, // KHÔNG tự tạo collection khi connect
  strict: true, // chỉ cho các trường đã khai báo trong design
  timestamps: true, // quản lý createdAt / updatedAt (createdAt được design quy là B)
};

// Sub-document scheduling (A6 — lịch mở cửa hằng tuần nằm trong cấu hình studio).
const schedulingSchema = new Schema(
  {
    // A8: mặc định Asia/Ho_Chi_Minh; dùng để hiển thị & quy đổi giờ hoạt động (DB lưu UTC).
    timezone: { type: String, required: true, default: "Asia/Ho_Chi_Minh" },

    // Giờ mở cửa hằng tuần (phút tính từ 00:00 giờ local studio).
    // G2 (2B.1a): design quy mỗi ngày DUY NHẤT 1 khung giờ (khung khả dụng
    // hợp nhất (union) chỉ với các ngoại lệ EXTENDED theo M3) → không cho phép
    // 2 entry cùng weekday.
    weekdays: {
      type: [
        {
          weekday: {
            type: Number,
            required: true,
            min: WEEKDAY_MIN,
            max: WEEKDAY_MAX, // M4: ISO 8601
          },
          openMinutes: { type: Number, required: true, min: 0 },
          closeMinutes: { type: Number, required: true, min: 0 },
        },
      ],
      required: true,
      validate: {
        validator: (arr) => {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          const seen = new Set();
          return arr.every((d) => {
            if (!d) return false;
            // G3: weekday phải là NGUYÊN, ISO 1..7 (1.5, 0, 8 đều bị từ chối).
            if (!Number.isInteger(d.weekday) || d.weekday < WEEKDAY_MIN || d.weekday > WEEKDAY_MAX) return false;
            // G2: một khung giờ mỗi ngày.
            if (seen.has(d.weekday)) return false;
            seen.add(d.weekday);
            // G4: open/close phải NGUYÊN, trong [0, 1440] (cho phép close = 1440), open < close.
            if (!Number.isInteger(d.openMinutes) || !Number.isInteger(d.closeMinutes)) return false;
            if (d.openMinutes < 0 || d.openMinutes > 1440 || d.closeMinutes < 0 || d.closeMinutes > 1440) return false;
            return d.openMinutes < d.closeMinutes;
          });
        },
        message:
          "scheduling.weekdays: mỗi ngày DUY NHẤT 1 khung giờ (weekday nguyên 1–7 ISO, không trùng — G2/G3); " +
          "openMinutes/closeMinutes nguyên, 0–1440 (cho phép close = 1440), open < close (G4).",
      },
    },

    // Bước giờ bắt đầu (V08-08/09).
    startStepMinutes: { type: Number, enum: [15, 30], required: true, default: 30 },

    // Thời lượng (V08-02).
    minDurationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 30,
      validate: {
        validator: (v) => Number.isInteger(v) && v % 30 === 0,
        message: "minDurationMinutes phải là bội số 30 (≥30).",
      },
    },
    maxDurationMinutes: {
      type: Number,
      required: true,
      default: 240,
      min: 30,
      max: 480,
      validate: {
        validator: (v) => Number.isInteger(v) && v % 30 === 0,
        message: "maxDurationMinutes phải là bội số 30 (30..480).",
      },
    },

    // M5: buffer chỉ nhận 0, 15 hoặc 30 (bội số 15 để giữ lưới slot A2).
    bufferMinutes: { type: Number, enum: [0, 15, 30], required: true, default: 15 },
  },
  { _id: false }
);

// G1 (2B.1a): khi cả hai trường có giá trị (cả hai là required nên luôn có),
// minDurationMinutes <= maxDurationMinutes.
schedulingSchema.pre("validate", function (next) {
  if (
    this.minDurationMinutes != null &&
    this.maxDurationMinutes != null &&
    this.minDurationMinutes > this.maxDurationMinutes
  ) {
    return next(
      new Error(
        "scheduling: minDurationMinutes (bước 30) không được lớn hơn maxDurationMinutes (G1)."
      )
    );
  }
  next();
});

const studioSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    representative: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, validate: emailFormat },
    phone: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    spacePhotos: { type: [String], required: true },

    verificationDocs: {
      type: [
        {
          docType: { type: String },
          uri: { type: String },
          status: { type: String },
        },
      ],
      default: [],
    },

    businessLicense: {
      uri: { type: String },
      optional: { type: Boolean, default: false },
    },

    // A7: 5 trạng thái (đã duyệt). Chỉ ACTIVE mới công khai/nhận đơn (quy tắc nghiệp vụ,
    // được thực thi ở tầng service/API — model chỉ khai báo enum + index hỗ trợ).
    status: { type: String, enum: STUDIO_STATUSES, required: true, default: "PENDING_REVIEW" },

    // M1: admin yêu cầu bổ sung hồ sơ (PENDING_REVIEW + needsMoreInfo=true).
    needsMoreInfo: { type: Boolean, required: true, default: false },

    approvedAt: { type: Date },
    approvedBy: { type: Types.ObjectId, ref: "User" },

    scheduling: { type: schedulingSchema, required: true },

    banking: {
      bankName: { type: String },
      accountHolder: { type: String },
      accountNumber: { type: String },
      qrImageURI: { type: String },
      qrPayload: { type: String },
      paymentInstructions: { type: String },
      enabled: { type: Boolean, default: false },
    },

    commissionSettings: {
      ratePercent: { type: Number, default: 5, min: 0, max: 100 },
      published: { type: Boolean, default: false },
    },
  },
  options
);

// G5 (2B.1a): banking có ĐIỀU KIỆN theo trạng thái.
// - Hồ sơ / PENDING_REVIEW / REJECTED / SUSPENDED / CLOSED: banking được bỏ
//   trống (REJECTED/SUSPENDED/CLOSED giữ banking đã lưu theo dữ liệu hiện có).
// - ACTIVE: studio nhận cọc chuyển khoản trực tiếp (CORE-01) → bắt buộc có
//   banking ĐỦ 4 trường tối thiểu (bankName, accountHolder, accountNumber,
//   qrImageURI — đúng các trường đã có trong design sec 2.2, không thêm
//   trường mới). Các trường chi tiết (qrPayload, paymentInstructions,
//   enabled) không bắt buộc ở tầng schema.
// - Chuyển status -> ACTIVE mà banking thiếu -> validation TỪ CHỐI; việc
//   chuyển trạng thái được thực thi ở tầng service (giai đoạn sau) bằng cách
//   set lại document rồi validate (cùng hook này).
studioSchema.pre("validate", function (next) {
  if (this.status === "ACTIVE") {
    const b = this.banking;
    const complete =
      b &&
      typeof b.bankName === "string" && b.bankName.trim() !== "" &&
      typeof b.accountHolder === "string" && b.accountHolder.trim() !== "" &&
      typeof b.accountNumber === "string" && b.accountNumber.trim() !== "" &&
      typeof b.qrImageURI === "string" && b.qrImageURI.trim() !== "";
    if (!complete) {
      return next(
        new Error(
          "studio: status = ACTIVE yêu cầu banking đủ 4 trường (bankName, accountHolder, accountNumber, qrImageURI) để nhận cọc (G5/CORE-01)."
        )
      );
    }
  }
  next();
});

// Index (khai báo trong schema; CHƯA thực thi trên Atlas — rule C / 2A.4).
studioSchema.index({ status: 1, needsMoreInfo: 1 }); // danh sách ACTIVE + hàng đợi chờ bổ sung (A7 + M1)
studioSchema.index({ ownerId: 1 }); // tìm studio theo chủ

// Collection name tường minh (2A.4 CN1) — không dựa pluralize/lowercase mặc định.
export const Studio = mongoose.model("Studio", studioSchema, "studios");
export { studioSchema };

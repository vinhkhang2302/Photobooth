import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// StudioMember -> collection `studioMembers`
// Nguồn: docs/database-design.md sec 2.3 (index sec 3).
//
// Ghi chú: chủ studio được liên kết bằng `studios.ownerId` (ref User) — KHÔNG
// cần bắt buộc có bản ghi studioMembers. Bản ghi studioMembers với role=OWNER
// (nếu tạo) chỉ để thống nhất truy vấn quyền; design không quy định bắt buộc.
// ---------------------------------------------------------------------------

export const MEMBER_ROLES = ["OWNER", "STAFF"];
export const MEMBER_STATUSES = ["ACTIVE", "REVOKED"];

const options = {
  autoIndex: false,
  autoCreate: false,
  strict: true,
  timestamps: true,
};

const studioMemberSchema = new Schema(
  {
    studioId: { type: Types.ObjectId, ref: "Studio", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: MEMBER_ROLES, required: true },
    status: { type: String, enum: MEMBER_STATUSES, required: true, default: "ACTIVE" },
  },
  options
);

// Unique compound (design sec 2.3) — khai báo, chưa thực thi trên Atlas (rule C).
studioMemberSchema.index({ studioId: 1, userId: 1 }, { unique: true });

// Collection name tường minh (2A.4 CN1 — camelCase).
export const StudioMember = mongoose.model("StudioMember", studioMemberSchema, "studioMembers");
export { studioMemberSchema };

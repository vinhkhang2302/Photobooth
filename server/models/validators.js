// Validators dùng chung cho các trường tiền VND (quy tắc A1 — đã duyệt).
//
// A1 (technical-decisions.md): mọi trường tiền là SỐ NGUYÊN VND, an toàn
// (Number.isSafeInteger) và KHÔNG ÂM. Giá trị không hợp lệ (âm, không nguyên,
// vượt safe-integer) bị từ chối ở backend TRƯỚC KHI lưu.
//
// Lưu ý (2A.3/2A.4 — I2/IK1):
//   - `validator` Mongoose chỉ là hàng rào THỨ NHẤT (validation phía ứng dụng).
//   - Ràng buộc "không âm / an toàn" không phải là index; nó chạy khi validate.
//   - Không dùng cho unique index.

/** Trả true khi v là số nguyên VND an toàn, không âm. */
export function isVndSafeInt(v) {
  return Number.isSafeInteger(v) && v >= 0;
}

/**
 * Validator Mongoose cho trường tiền (price, overagePer30Min, ...).
 * - Cho phép null/undefined (trường TÙY CHỌN không khai báo).
 * - Trường `required` (ví dụ price) sẽ bị chặn bởi `required: true` trước khi
 *   tới đây, nên null ở đó được bắt sớm hơn.
 * - Giá trị hợp lệ phải thỏa Number.isSafeInteger(v) && v >= 0.
 */
export function vndSafeIntValidator(v) {
  return v == null || isVndSafeInt(v);
}

export const vndSafeInt = {
  validator: vndSafeIntValidator,
  message:
    "Trường tiền phải là số nguyên VND an toàn (Number.isSafeInteger), không âm (A1); null = chưa khai báo.",
};

// ---------------------------------------------------------------------------
// Email — Mongoose KHÔNG có built-in email format, nên định nghĩa validator
// nhẹ (regex) dùng cho `email` của User/Studio (design: "unique, xác minh").
// Trường hợp null/undefined do `required` chặn trước (trường bắt buộc).
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(v) {
  return typeof v === "string" && EMAIL_RE.test(v);
}

export const emailFormat = {
  validator: isValidEmail,
  message: "Email không đúng định dạng (cần 'tên@miễn.gốc').",
};

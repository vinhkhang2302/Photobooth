// Barrel export — 6 Core Mongoose Models (Giai đoạn 2B.1).
//
// Ghi chú triển khai (rule C / 2A.4):
// - Các Model khai báo với autoIndex:false / autoCreate:false — import file này
//   KHÔNG tự tạo collection hay index trên MongoDB Atlas.
// - Index được khai báo trong schema (schema.indexes()) nhưng CHƯA được thực
//   thi; việc tạo index trên Atlas phải do bước đồng bộ index có chủ đích
//   (kèm kiểm tra listIndex trước khi hoạt động thực tế — IK1), không tự chạy
//   trong ứng dụng khi connect.

export { User, userSchema } from "./user.model.js";
export { Studio, studioSchema } from "./studio.model.js";
export { StudioMember, studioMemberSchema } from "./studio-member.model.js";
export { Room, roomSchema } from "./room.model.js";
export { Service, serviceSchema } from "./service.model.js";
export { AvailabilityException, availabilityExceptionSchema } from "./availability-exception.model.js";
export { vndSafeInt } from "./validators.js";

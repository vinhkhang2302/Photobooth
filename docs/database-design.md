# Thiết kế Database MongoDB — Sàn đặt lịch Photobooth (MVP)

Nguồn nghiệp vụ: mục 19 đặc tả v0.8 (`docs/requirements-summary.md` là hợp nhất); quy tắc tiền kiểu dữ liệu: `docs/technical-decisions.md`.
Thiết kế ưu tiên **đơn giản, triển khai được từng phần** (dự án sinh viên): 14 collections, dùng Mongoose schema, không dùng service mới ngoài MongoDB.

**Trạng thái duyệt (2026-10-29, cập nhật 2C.1 ngày 2026-11-01):** quyết định kỹ thuật **A1–A9 đã được chủ dự án duyệt** (chi tiết sec 10.2; bảng tại `docs/technical-decisions.md` sec 5): A2 = lưới slot 15 phút + unique `(roomId, slotStartUtc)`; A3 = Atlas/replica set + multi-document transaction; A4 = job định kỳ idempotent; A5 = **không** tự động số dư tín dụng hoa hồng. **A5b (credit carryover) đã bị chủ dự án BÁC BỎ (chốt 2C.1, sec 10.3/10.6)** — A5a là chính sách duy nhất hiệu lực, không còn điểm mở. Nhóm quyết định 2C.1 (sec 10.6: slotLocks, review, auditLogs, maxAttempts, thời hạn khiếu nại, retry job) đã chốt, sẵn sàng làm cơ sở triển khai Group 2.

**Cập nhật 2A.1 (2026-10-30):** các quyết định **M1–M6 đã được chủ dự án chốt** (sec 10.4): bổ sung collection `incidents` (M2), `studios.needsMoreInfo` (M1), quy tắc `EXTENDED` (M3), quy ước weekday ISO 8601 (M4), `bufferMinutes ∈ {0, 15, 30}` (M5), theo dõi gửi email trong `notifications` (M6).

> **Quy ước chung**
> - Tiền: **`Number` nguyên VND** (đủ với giá trị MVP < 2^53; không dùng Decimal128 để giữ đơn giản). **A1 (đã duyệt):** mọi trường tiền phải thỏa `Number.isSafeInteger()` và **không âm** (đây là điều kiện bắt buộc khi tạo/ghi); giá trị không hợp lệ (thiếu, âm, không nguyên, vượt safe-integer) bị từ chối ở backend trước khi lưu. Trữ lượng (phút, giây): `Number`.
> - Thời gian: **`Date` (UTC) trong DB**, hiển thị theo múi giờ studio. Các deadline (`responseExpiresAt`, `paymentExpiresAt`) tính theo **server time**.
> - `ref` là tham chiếu Mongoose tới `_id` collection khác; trường bắt buộc đánh **(B)**.
> - Trạng thái đặt, trạng thái thanh toán/hoàn, trạng thái đối soát hoa hồng: **tách riêng** (yêu cầu 5) — không gộp một trường chung.

## 1. Tổng quan collections và quan hệ

| Collection | Mục đích | Quan hệ chính (ref) |
|---|---|---|
| `users` | Tài khoản (khách, chủ/nhân viên studio, admin) | 1-1 với studio qua `studios.ownerId` |
| `studios` | Hồ sơ studio + **cấu hình giờ hoạt động hằng tuần (A6)** + thanh toán + trạng thái xác minh (5 trạng thái, A7) | `ownerId`→users, có 1-n rooms/services |
| `studioMembers` | Phân quyền chủ/nhân viên | `studioId`→studios, `userId`→users |
| `rooms` | Phòng (tài nguyên có lịch riêng) | `studioId`→studios, N bookings.items |
| `services` | Gói/dịch vụ (gồm phòng hoặc add-on) | `studioId`→studios, N bookings.items |
| `availabilityExceptions` | Ngày nghỉ/ngày đặc biệt/khoảng khóa lịch (A6): phạm vi **toàn studio hoặc 1 phòng** | `studioId`→studios, `roomId`→rooms (nullable) |
| `bookings` | Đơn đặt lịch (nhiều items/phòng) + snapshot giá/chính sách/hoa hồng | `customerId`→users, `studioId`→studios, `items[].roomId`→rooms, `items[].serviceId`→services |
| `slotLocks` | **Khóa slot thời gian 15 phút + unique index (A2, đã duyệt)** | `roomId`→rooms, `bookingId`→bookings |
| `payments` | Giao dịch cọc/số dư/hoàn tiền (record riêng, tiền không âm) | `bookingId`→bookings, `studioId`→studios |
| `commissions` | Bản ghi hoa hồng + đối soát tháng (idempotent, điều chỉnh có lịch sử riêng) | `bookingId`→bookings, `studioId`→studios |
| `reviews` | Đánh giá (1/đơn COMPLETED, không sửa) | `bookingId`→bookings, `customerId`/`studioId` |
| `incidents` | **(M2) Sự cố booking** — 1 booking có thể có nhiều incident; có incident chưa giải quyết → không tự COMPLETED | `bookingId`→bookings, `reportedBy`→users |
| `notifications` | **(M6) Thông báo website + email** — theo dõi trạng thái gửi PENDING/SENT/FAILED, số lần thử, lỗi gần nhất | `userId`→users |
| `auditLogs` | Nhật ký thao tác nhạy cảm (admin, xác nhận cọc, đối soát, **lỗi email thất bại**...) | `actorId`→users, trỏ resourceType/resourceId |

*Ghi chú cấu trúc (theo A6 đã duyệt):* bỏ collection `availabilityRules` riêng — **giờ mở cửa hằng tuần, bước giờ, đệm, thời lượng nằm trong `studios.scheduling`** (cấu hình studio, A6). Ngày nghỉ, ngày đặc biệt và khoảng khóa lịch nằm trong collection `availabilityExceptions` riêng, hỗ trợ `scope: STUDIO | ROOM`. `studioMembers` có thể hợp nhất vào `studios` (mảng) nếu chưa cần phân quyền nhân viên sâu.

## 2. Schema từng collection (trường quan trọng, kiểu, bắt buộc, ví dụ)

### 2.1 `users`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | String | B | |
| `email` | String | B | unique, xác minh |
| `phone` | String | | xác minh cho studio |
| `passwordHash` | String | B | băm (argon2/bcrypt), **không plaintext** |
| `role` | Enum: `CUSTOMER`, `STUDIO_OWNER`, `STUDIO_STAFF`, `ADMIN` | B | vai trò chính |
| `status` | Enum: `ACTIVE`, `SUSPENDED` | B | |
| `emailVerifiedAt` | Date | | |
| `createdAt` | Date | B | |

Ví dụ:
```json
{ "name": "Nguyễn Văn A", "email": "a@example.com", "phone": "0901234567",
  "passwordHash": "$argon2id$v19$...", "role": "CUSTOMER", "status": "ACTIVE",
  "emailVerifiedAt": "2026-10-20T08:00:00Z", "createdAt": "2026-10-20T08:00:00Z" }
```

### 2.2 `studios`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | String | B | |
| `ownerId` | ref users | B | |
| `representative` | String | B | người đại diện |
| `email`, `phone` | String | B | đã xác minh |
| `address` | String | B | địa chỉ hoạt động |
| `spacePhotos` | [String] (URI) | B | ảnh thực tế (yêu cầu quyết định #2) |
| `verificationDocs` | [{ docType, uri, status }] | | riêng tư, giới hạn truy cập (audit khi xem/sửa) |
| `businessLicense` | { uri, optional: Boolean } | | khi phù hợp, không bắt buộc chung |
| `status` | Enum (A7, đã duyệt): `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `CLOSED` | B | **chỉ ACTIVE công khai/nhận đơn** |
| `needsMoreInfo` | Boolean (M1, đã duyệt) | B | **M1:** admin yêu cầu bổ sung hồ sơ → giữ `status = PENDING_REVIEW` + `needsMoreInfo = true`; studio gửi bổ sung → `needsMoreInfo = false`; lịch sử yêu cầu/phản hồi ghi trong `auditLogs` (action `STUDIO_REQUEST_DOCS` / `STUDIO_DOCS_SUBMITTED`). 5 trạng thái theo A7 giữ nguyên, không thêm trạng thái mới. |
| `approvedAt`, `approvedBy` | Date, ref users | | |
| `scheduling` (A6, đã duyệt) | Sub-doc (dưới) | B | cấu hình giờ hoạt động của studio; phòng có thể kế thừa (mặc định dùng mức studio) |
| `banking` | { bankName, accountHolder, accountNumber, qrImageURI, qrPayload, paymentInstructions, enabled } | B (để nhận cọc) | chỉ hiển thị với studio sở hữu đơn |
| `commissionSettings` | { ratePercent: 5, published: Boolean } | | công bố cho studio trước khi tham gia |

**`studios.scheduling`** (A6 — lịch mở cửa hằng tuần đặt trong cấu hình studio):
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `timezone` | String | B | A8: mặc định `Asia/Ho_Chi_Minh`; dùng để **hiển thị và quy đổi giờ hoạt động**; DB lưu UTC |
| `weekdays` | [{ weekday, openMinutes, closeMinutes }] | B | giờ mở cửa hằng tuần, phút tính từ 00:00 giờ local studio. **M4 (đã duyệt): `weekday` theo ISO 8601 — 1 = Thứ 2, 2 = Thứ 3, …, 7 = Chủ nhật** (thống nhất giữa DB và backend) |
| `startStepMinutes` | Enum: 15, 30 | B | bước giờ bắt đầu (mặc định 30 — V08-08/09) |
| `minDurationMinutes` | Number (≥30, bước 30) | B | 30 (V08-02) |
| `maxDurationMinutes` | Number (30..480, bước 30) | B | mặc định 240 (4 giờ), trần 480 (8 giờ) (V08-02) |
| `bufferMinutes` | Enum: 0, 15, 30 (M5, đã duyệt) | B | **M5: chỉ nhận 0, 15 hoặc 30** (bội số 15 để giữ lưới slot A2 không bị phá); mặc định 15, cho phép 0 (V08-08/09; A2: buffer luôn được giữ). Giá trị khác bị từ chối ở backend. |

**Quy tắc cấu hình scheduling (chốt 2B.1a, được kiểm tra ở tầng Mongoose):**
- **Mỗi ngày DUY NHẤT 1 khung giờ:** `weekdays` không chứa 2 entry cùng `weekday` (G2) — khung khả dụng của một ngày là `[openMinutes, closeMinutes]` (hợp nhất union với các ngoại lệ `EXTENDED` theo M3), không phải danh sách nhiều khung.
- **`weekday` nguyên, ISO 1–7** (G3): giá trị 1.5, 0, 8 bị từ chối (M4).
- **`openMinutes`/`closeMinutes` nguyên, trong `[0, 1440]`, `open < close`** (G4): cho phép `closeMinutes = 1440` (24:00); từ chối giá trị âm, thập phân, > 1440.
- **`minDurationMinutes <= maxDurationMinutes`** (G1): khi cả hai có giá trị (cả hai bắt buộc), vi phạm → validation error; quy tắc "bội số 30" giữ nguyên.

**Quy tắc banking có điều kiện theo status (G5, chốt 2B.1a):**
- **Điều kiện chuyển trạng thái:** một Studio **chỉ được chuyển sang `ACTIVE` khi có đầy đủ cả 4 trường banking** (đúng các field đã có trong sec 2.2, không thêm trường mới, mỗi trường phải có giá trị khác rỗng sau trim): `bankName`, `accountHolder`, `accountNumber`, `qrImageURI` — đủ để nhận cọc chuyển khoản trực tiếp (CORE-01). Việc chuyển `status → ACTIVE` phải đi qua validation; thiếu bất kỳ 1 trong 4 trường → **từ chối** (enforce bằng pre-validate hook trong `studio.model.js`, chạy khi set lại document ở tầng service).
- Các trạng thái khác (`PENDING_REVIEW`, `REJECTED`, `SUSPENDED`, `CLOSED`) **không bắt buộc** phải có đủ 4 trường này: studio tạo hồ sơ / `PENDING_REVIEW` có thể chưa có `banking`; `REJECTED`/`SUSPENDED`/`CLOSED` giữ thông tin banking theo dữ liệu đã lưu (nếu có).
- `qrPayload`, `paymentInstructions`, `enabled` không bắt buộc ở tầng schema.
- Số tài khoản ngân hàng là dữ liệu nhạy cảm: **không log/in** trong test/audit (test dùng giá trị ẩn danh).

Ví dụ (rút gọn):
```json
{ "name": "Lumen Studio", "ownerId": "u_101", "representative": "Trần B",
  "email": "contact@lumen.vn", "phone": "0911223344", "address": "Đà Nẵng",
  "spacePhotos": ["media/space1.jpg"], "status": "ACTIVE",
  "scheduling": { "timezone": "Asia/Ho_Chi_Minh",
    "weekdays": [{ "weekday": 1, "openMinutes": 540, "closeMinutes": 1020 }],
    "startStepMinutes": 30, "minDurationMinutes": 30,
    "maxDurationMinutes": 240, "bufferMinutes": 15 },
  "banking": { "bankName": "Vietcombank", "accountHolder": "Lumen Studio",
               "accountNumber": "0123456789", "qrImageURI": "media/qr.png", "enabled": true },
  "commissionSettings": { "ratePercent": 5, "published": true } }
```

### 2.3 `studioMembers`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `studioId` | ref studios | B | |
| `userId` | ref users | B | |
| `role` | Enum: `OWNER`, `STAFF` | B | |
| `status` | Enum: `ACTIVE`, `REVOKED` | B | |

Unique compound: `(studioId, userId)`.

### 2.4 `rooms`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `studioId` | ref studios | B | một studio |
| `name` | String | B | |
| `capacity` | Number | | **số nguyên dương ≥ 1** (chốt 2B.1a; `0`, âm, thập phân, NaN, Infinity bị từ chối ở tầng Mongoose) |
| `amenities` | [String] | | |
| `images` | [String] | | |
| `status` | Enum: `ACTIVE`, `INACTIVE` | B | |

Ví dụ: `{ "studioId": "s_01", "name": "Phòng A", "capacity": 4, "amenities": ["mirror"], "images": ["..."], "status": "ACTIVE" }`

### 2.5 `services`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `studioId` | ref studios | B | gói/add-on theo studio |
| `name` | String | B | |
| `pricingMode` | Enum: `HOURLY`, `BLOCK`, `PACKAGE` | B | V08-06 |
| `price` | Number (VND) | B | giờ → giá/30 phút cơ sở; block/gói → giá cố định |
| `durationMinutes` | Number | B (cho BLOCK) | bước 30 |
| `includesRoom` | Boolean | B | V08-07: true → không cộng giá phòng lần hai |
| `overagePer30Min` | Number (VND) | | chỉ tính phần vượt nếu studio khai báo (V08-06) |
| `conditions` | String | | |
| `status` | Enum: `ACTIVE`, `INACTIVE` | B | |

Ví dụ (gói gồm phòng):
```json
{ "studioId": "s_01", "name": "Gói chụp 2 giờ", "pricingMode": "PACKAGE",
  "price": 600000, "durationMinutes": 120, "includesRoom": true,
  "overagePer30Min": null, "status": "ACTIVE" }
```

### 2.6 `availabilityExceptions` (A6, đã duyệt)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `studioId` | ref studios | B | |
| `roomId` | ref rooms | | **nullable** — `scope: STUDIO` → ảnh hưởng mọi phòng studio; `scope: ROOM` → 1 phòng (bắt buộc roomId) |
| `scope` | Enum: `STUDIO`, `ROOM` | B | A6: ngoại lệ toàn studio hoặc riêng một phòng |
| `startAt`, `endAt` | Date (UTC, A8) | B | khoảng (UTC; hiển thị theo `scheduling.timezone`) |
| `type` | Enum: `CLOSED`, `BLOCKED`, `EXTENDED` | B | nghỉ/ngày đặc biệt/khoảng chặn, hoặc mở rộng giờ |
| `reason` | String | B | |

> **Lưu ý theo A6:** giờ mở cửa hằng tuần (weekdays/bước/đệm/thời lượng max) **nằm trong `studios.scheduling`**, không phải collection riêng. Collection này chỉ giữ **ngày nghỉ, ngày đặc biệt và khoảng khóa lịch**, cho phép scope toàn studio hoặc 1 phòng.

**Quy tắc hợp nhất ngoại lệ (M3, đã duyệt):**
- **`EXTENDED`** cho phép **mở rộng khung giờ hoạt động trong ngày được chỉ định** (ngoài giờ mở cửa tuần của `studios.scheduling`).
- **Ưu tiên khi chồng lấn:** `CLOSED` và `BLOCKED` luôn **ưu tiên cao hơn** `EXTENDED` — khoảng bị đóng/khóa không thể bị mở rộng.
- Studio ở trạng thái **SUSPENDED hoặc CLOSED (A7)** → **không nhận đặt lịch** cho mọi phòng, kể cả khi có ngoại lệ `EXTENDED` ở cấp ROOM.
- Ngoại lệ cấp **ROOM không thể vượt qua trạng thái đóng cấp STUDIO** (studio đóng → mọi phòng đóng).
- **Hợp nhất khoảng chồng lấn:** với một khoảng truy vấn cụ thể, quét mọi `availabilityExceptions` (scope STUDIO hoặc ROOM phù hợp) giao với khoảng đó:
  1. Có `CLOSED`/`BLOCKED` (STUDIO hoặc ROOM) chạm → khoảng đó **không khả dụng** (dừng, không xét EXTENDED).
  2. Không có CLOSED/BLOCKED → khung giờ khả dụng = `[openMinutes, closeMinutes]` của `weekdays` **hợp nhất (union)** với các khoảng `EXTENDED` (STUDIO hoặc ROOM) trùng ngày.
  3. Chồng hai khoảng EXTENDED → union; EXTENDED không tự hủy đơn đã xác nhận (18.5).

Ví dụ:
```json
{ "studioId": "s_01", "roomId": null, "scope": "STUDIO",
  "startAt": "2026-11-05T00:00:00Z", "endAt": "2026-11-06T00:00:00Z",
  "type": "CLOSED", "reason": "Nghỉ lễ (toàn studio)" }
```

### 2.7 `bookings` (trọng tâm)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bookingCode` | String | B | unique, hiển thị khách/studio |
| `customerId` | ref users | B | |
| `studioId` | ref studios | B | **một đơn chỉ một studio** (CORE-04) |
| `items[]` | mảng (yêu cầu 6) | B | mỗi item: { `roomId` ref, `serviceId` ref?, `addOns[]`, `quantity`/`durationMinutes`, `unitPrice`, `lineAmount` (VND) } |
| `startAt`, `endAt` | Date (UTC) | B | **toàn bộ item cùng startAt/endAt**; `endAt` = backend tính |
| `priceSnapshot` | Sub-doc (yêu cầu 4) | B | { `items[{name, qty, unitPrice, lineAmount}]`, `totalAmount` (VND), `appliedAt` } |
| `policySnapshot` | Sub-doc | B | { `cancelPolicy`, `depositRate: 0.20`, `appliedAt` } |
| `commissionSnapshot` | Sub-doc | B | { `ratePercent: 5`, `formulaNote`, `appliedAt` } (yêu cầu 4) |
| `depositRate` | Number (0.20) | B | snapshot |
| `depositAmount` | Number (VND) | B | `Math.round(total × 0.20)` |
| `remainingAmount` | Number (VND) | B | `total − deposit` |
| `responseExpiresAt` | Date | B | `min(createdAt + 12h, startAt − 60m)` (V08-03) |
| `paymentExpiresAt` | Date | | = thời điểm studio chấp nhận + 30 phút (CORE-01) |
| `bookingStatus` | Enum: `PENDING_STUDIO`, `AWAITING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED` | B | **riêng** (yêu cầu 5) |
| `paymentStatus` | Enum: `DEPOSIT_PENDING`, `DEPOSIT_PAID`, `BALANCE_PARTIAL`, `PAID_IN_FULL` | B | trạng thái thu (riêng, tính từ payments) |
| `refundStatus` | Enum: `NONE`, `REFUND_PENDING`, `REFUND_PROCESSING`, `REFUNDED`, `REFUND_FAILED`, `PARTIALLY_REFUNDED`, `DISPUTED` | B | trạng thái hoàn (riêng) |
| `incidentRevision` | Number (0) (I4, 2A.4) | B | **trường kỹ thuật cho race control**: tăng 1 mỗi khi insert incident hợp lệ cho booking (cùng transaction với insert incident, sec 9). Job tự hoàn thành đọc giá trị này khi check incident; nếu thay đổi giữa đọc và commit → write conflict → retry (sec 9) |
| `completedAt` | Date | | |
| `createdBy`, `createdAt` | ref users, Date | B | |

> Trạng thái thanh toán/hoàn tiền chi tiết hơn (mức record: DEPOSIT_PAID, REFUND_*, ...) nằm ở `payments`; booking chỉ giữ **trạng thái tổng hợp** để dễ hiển thị, luôn có thể đối chiếu về `payments`. Đây là cách "tách nhưng truy vết được".

Ví dụ:
```json
{ "bookingCode": "PB-2026-1029-001", "customerId": "u_200", "studioId": "s_01",
  "items": [
    { "roomId": "r_01", "serviceId": null, "durationMinutes": 60, "unitPrice": 200000, "lineAmount": 200000 },
    { "roomId": "r_02", "serviceId": "sv_05", "durationMinutes": 60, "unitPrice": 600000, "lineAmount": 600000 }
  ],
  "startAt": "2026-11-08T09:00:00Z", "endAt": "2026-11-08T10:00:00Z",
  "priceSnapshot": { "totalAmount": 800000, "appliedAt": "2026-10-29T09:00:00Z" },
  "policySnapshot": { "depositRate": 0.2, "cancelPolicy": "24h:100%, <24h:0", "appliedAt": "..." },
  "commissionSnapshot": { "ratePercent": 5, "appliedAt": "..." },
  "depositAmount": 160000, "remainingAmount": 640000,
  "responseExpiresAt": "2026-10-30T09:00:00Z", "bookingStatus": "PENDING_STUDIO",
  "paymentStatus": "DEPOSIT_PENDING", "refundStatus": "NONE" }
```

### 2.8 `slotLocks` — lưới slot 15 phút + unique index (A2, ĐÃ DUYỆT)
Đây là **trái tim của cơ chế chống trùng** (yêu cầu 7–9). Phương án đã duyệt: chia trục thời gian thành **các ô slot 15 phút cố định** (mốc `slotStartUtc` trùng biên 15 phút của UTC). Mỗi booking **giữ toàn bộ các ô từ giờ bắt đầu đến giờ kết thúc + buffer** (A2: "phải giữ toàn bộ slot bị chiếm, kể cả buffer").

**Vì sao lưới 15 phút đủ với các bước của v0.8:** bước giờ bắt đầu 15/30, thời lượng theo 30 phút, buffer 0/15 — đều là bội số của 15 phút → mọi khung đặt đều khớp lưới ô 15 phút. **Ràng buộc cấu hình:** `bufferMinutes` phải là bội số 15 (0/15/30) để không phá lưới; studio không cấu hình được buffer khác trong MVP (giá trị không hợp lệ bị từ chối ở backend).

Mỗi document = **một ô 15 phút đang bị giữ cho một phòng**:

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `roomId` | ref rooms | B | |
| `slotStartUtc` | Date (UTC, A8) | B | mốc ô 15 phút (biên chia 900 giây trên UTC); **bắt buộc căn đúng lưới 15 phút UTC** (validator tầng Mongoose, 2C.1) |
| `bookingId` | ref bookings | | **`source = BOOKING` ⇒ bắt buộc** (required); **`source = MANUAL` ⇒ phải là `null`** (validation cross-field, 2C.1) |
| `source` | Enum: `BOOKING`, `MANUAL` | B | `MANUAL` = studio/admin chặn lịch thủ công (khóa lịch, v0.8) |

> **Mô hình slot (chốt 2C.1):** **một document `slotLocks` = một slot đang được giữ** — không có field `state`. Slot được giữ hay không thể hiện bằng **sự tồn tại của document** (không phải giá trị trạng thái):
> - Giải phóng (REJECTED/EXPIRED/CANCELLED): **xóa document** trong cùng transaction (sec 6/9) — ô trống lại ngay; **không lưu document "đã giải phóng" trong collection hoạt động** (xóa là cách duy nhất giải phóng, tránh vướng unique index).
> - Job dọn ô đã qua (A4) cũng xóa document (idempotent), không đánh dấu trạng thái.

**Unique index đầy đủ: `{ roomId: 1, slotStartUtc: 1 }` (A2, đã duyệt)** — tại một thời điểm chỉ **một** document (slot đang được giữ) cho mỗi (phòng, ô); không tồn tại document RELEASED (chốt 2C.1). Hai đơn khác nhau muốn chiếm cùng ô → đơn sau bị **duplicate-key error** → rollback (sec 9).

Quy tắc sống của ô (giữ đơn giản, không phức tạp hóa; chốt 2C.1 — **không có field `state`**):
- Giải phóng (REJECTED/EXPIRED/CANCELLED): **xóa** các slotLocks của đơn đó trong transaction (sec 9) — ô trống lại ngay; **không lưu document RELEASED trong collection hoạt động**.
- COMPLETED: giữ đến hết sự kiện; job định kỳ (A4) dọn slot đã qua (`slotStartUtc < now − grace`) theo điều kiện, idempotent (cũng bằng xóa document).

**Ví dụ:** Phòng `r_01` (timezone `Asia/Ho_Chi_Minh` = UTC+7), studio buffer 15 phút, khách đặt **90 phút bắt đầu 14:00 local (07:00 UTC)**: buổi chụp đến 15:30 local (08:30 UTC) + buffer 15 phút → chiếm đến **15:45 local (08:45 UTC)** = **7 ô** 15 phút: `slotStartUtc` = 07:00, 07:15, 07:30, 07:45, 08:00, 08:15, 08:30 UTC (7 document `slotLocks` cho cùng `roomId` trong 1 transaction, sec 9).
```json
{ "roomId": "r_01", "slotStartUtc": "2026-11-08T07:00:00Z", "bookingId": "b_01", "source": "BOOKING" }
```

> **Vì sao không "truy vấn trống rồi ghi đơn" (yêu cầu 7):** chỉ kiểm tra `studios.scheduling`/`availabilityExceptions` rồi insert booking vẫn bị **race condition** khi hai khách đồng thời đặt cùng phòng. `slotLocks` + unique index biến "chống trùng" thành ràng buộc **nguyên tử ở tầng storage**: cùng ô cho cùng phòng chỉ một document được insert thành công, cái thứ hai bị **duplicate-key error** → rollback toàn bộ booking (tất cả phòng, sec 6/9).

### 2.9 `payments`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bookingId` | ref bookings | B | |
| `studioId` | ref studios | B | |
| `purpose` | Enum: `DEPOSIT`, `BALANCE`, `REFUND` | B | **hoàn tiền là record riêng, không âm vào record gốc** (kỹ thuật) |
| `method` | Enum: `BANK_TRANSFER_QR`, `CASH` | B | không cổng tập trung (CORE-02) |
| `amount` | Number (VND, **không âm, `Number.isSafeInteger()`** — A1) | B | không lưu tiền âm; hoàn tiền là record riêng (sec 2.9) |
| `status` | Enum: `PENDING`, `CONFIRMED`, `REJECTED` | B | `CONFIRMED` chỉ sau studio đối chiếu giao dịch ngân hàng thật |
| `verifiedBy`, `verifiedAt` | ref users, Date | | người xác minh (quyền studio/admin) |
| `transactionReference` | String | | mã giao dịch (nếu có) |
| `refundStatus` | Enum (cho purpose=REFUND): `REFUND_PENDING`, `REFUND_PROCESSING`, `REFUNDED`, `REFUND_FAILED`, `PARTIALLY_REFUNDED`, `DISPUTED` | B (khi REFUND) | tách khỏi status thu (yêu cầu 5) |
| `idempotencyKey` | String | B | **required + unique + không đổi sau khi tạo** (I2, quy ước dưới) — chống ghi trùng khi gửi lặp (16.5/v0.8) |
| `createdBy`, `createdAt` | ref users, Date | B | |

**Quy ước idempotencyKey — payments (I2, 2A.3):** mỗi thao tác nghiệp vụ có định danh riêng; **retry cùng thao tác PHẢI dùng lại key cũ**, không tạo key mới chỉ vì request được gửi lại. Cấu trúc:
- `DEPOSIT`: `pay:{bookingId}:DEPOSIT:{paymentAttemptId}`
- `BALANCE`: `pay:{bookingId}:BALANCE:{paymentAttemptId}`
- `REFUND`: `pay:{bookingId}:REFUND:{refundId}`

Trong đó `{paymentAttemptId}`/`{refundId}` = định danh của **thao tác** (ví dụ `refundId` do backend sinh khi tạo yêu cầu hoàn; `paymentAttemptId` do studio/backend sinh khi ghi nhận 1 lần thu). **Không dùng số thứ tự (seq) tăng tự động** nếu chưa có cơ chế cấp số tuần tự an toàn khi nhiều request đồng thời.

Ví dụ (hoàn cọc):
```json
{ "bookingId": "b_01", "purpose": "REFUND", "method": "BANK_TRANSFER_QR",
  "amount": 160000, "status": "CONFIRMED", "refundStatus": "REFUNDED",
  "verifiedBy": "u_101", "transactionReference": "VCB-88213",
  "idempotencyKey": "pay:b_01:REFUND:rf-9f3a" }
```

### 2.10 `commissions` (đối soát hoa hồng)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bookingId` | ref bookings | B | 1 bản ghi gốc/đơn COMPLETED |
| `studioId` | ref studios | B | |
| `kind` | Enum: `ORIGINAL`, `ADJUSTMENT` | B | điều chỉnh = record riêng, **không sửa gốc** (A9) |
| `adjustmentOf` | ref commissions | | trỏ bản ghi gốc (khi ADJUSTMENT) |
| `rateSnapshot` | Number (5) | B | snapshot tại thời điểm |
| `basisAmount` | Number (VND, không âm, A1) | B | `max(0, dịch vụ sau giảm − hoàn hợp lệ)` |
| `commissionAmount` | Number (VND, không âm, A1) | B | `Math.round(basis × 5/100)` |
| `period` | String (`YYYY-MM`) | B | kỳ đối soát tháng |
| `dueAt` | Date | B | hạn = **ngày 5 tháng kế tiếp** (V07-01/v0.8) |
| `status` | Enum: `PENDING`, `SETTLED`, `ADJUSTED`, `UNRECONCILABLE` | B | `UNRECONCILABLE` = chưa thể đối soát → **admin xử lý thủ công** (A5, đã duyệt) |
| `adminNote`, `adminHandledBy`, `adminHandledAt` | String, ref users, Date | | khi chuyển admin (A5) |
| `settledAt`, `payoutReference`, `confirmedBy` | Date, String, ref users | | |
| `idempotencyKey` | String | B | **required + unique + không đổi sau khi tạo** (I2, quy ước dưới) |

**Quy ước idempotencyKey — commissions (I2, 2A.3):**
- `ORIGINAL`: `commission:{bookingId}:ORIGINAL` (đúng 1 bản ghi gốc/đơn COMPLETED, 19.7).
- `ADJUSTMENT`: `commission:{bookingId}:ADJUSTMENT:{adjustmentId}` (nhiều bản ghi điều chỉnh cùng 1 đơn là **phép**; mỗi điều chỉnh là thao tác riêng với `{adjustmentId}` do backend sinh).

**Lưu ý về unique index + MongoDB (I2):** unique index trên **1 trường** của MongoDB coi trường **thiếu/null** như giá trị null → nhiều document cùng thiếu/null `idempotencyKey` **KHÔNG bị coi là trùng**. Do đó:
- Mongoose phải khai báo `idempotencyKey: { required: true, unique: true }` (validation bắt buộc + index unique) để **hàng rào thứ nhất** chặn record thiếu key ngay khi insert (trước khi chạm index).
- **Hàng rào thứ hai** là unique index ở tầng storage: chỉ chặn trùng khi key **có giá trị**. Nếu có code path bypass Mongoose (raw update/bulk) ghi record thiếu key, uniqueness bị vô hiệu im lặng → phải đảm bảo mọi record luôn có key hợp lệ (validation required + không để null).
- Khi triển khai Models: định nghĩa unique index **nhất quán** (1 chỗ, trong schema) và **không tự chạy lệnh tạo/xóa index trên Atlas** (rule C) — Mongoose sync sẽ khai báo.

> **A5 (đã duyệt, 2026-10-29): KHÔNG có trường số dư tín dụng (credit carryover).** Khi điều chỉnh hoa hồng vượt công nợ hiện tại: ghi nhận lịch sử điều chỉnh (record `ADJUSTMENT` + `adjustmentOf`), đặt `status: UNRECONCILABLE` và chuyển admin xử lý thủ công. **Tự động mang khoản vượt sang kỳ đối soát tiếp theo: CHỦ DỰ ÁN BÁC BỎ (chốt 2C.1, 2026-11-01)** — không carryover, **không thêm trường `creditCarryover`** vào `commissions`; A5a là chính sách duy nhất hiệu lực.

> `commissions` là **bảng đối soát** (separate state, yêu cầu 5) — hoàn toàn tách khỏi `bookings` (booking giữ `commissionSnapshot` cho giá, không giữ trạng thái đối soát).

Ví dụ (bản gốc):
```json
{ "bookingId": "b_01", "studioId": "s_01", "kind": "ORIGINAL",
  "rateSnapshot": 5, "basisAmount": 800000, "commissionAmount": 40000,
  "period": "2026-11", "dueAt": "2026-12-05T00:00:00Z", "status": "PENDING",
  "idempotencyKey": "commission:b_01:ORIGINAL" }
```

### 2.11 `reviews`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bookingId` | ref bookings | B | unique — **một đánh giá gốc/đơn** (V08-12) |
| `customerId` | ref users | B | chỉ khách có đơn COMPLETED |
| `studioId` | ref studios | B | |
| `rating` | Number (1–5) | B | |
| `comment` | String | | |
| `status` | Enum: `VISIBLE`, `HIDDEN` | B | admin ẩn kèm lý do |
| `hiddenBy`, `hiddenReason` | ref users, String | | kiểm duyệt, giữ lịch sử (audit) |
| `reported` | Boolean | | có báo cáo |
| `submittedAt` | Date | B | **không sửa sau khi gửi** (không có updatedAt nghiệp vụ) |

> **Quy tắc review (chốt 2C.1):** nội dung review (`rating`, `comment`) **bất biến sau khi gửi** — enforce ở **tầng service** (không thêm Mongoose validator thời gian); **giữ `timestamps: true`** (nhất quán Group 1). Admin vẫn được đổi `status` VISIBLE ↔ HIDDEN (kèm `hiddenBy`/`hiddenReason`, ghi audit log) — việc ẩn **không làm thay đổi nội dung gốc** (rating/comment). Chỉ khách có đơn COMPLETED được đánh giá (V08-12); unique index `{bookingId}` = một đánh giá/đơn.

### 2.12 `incidents` (M2, đã duyệt)
**Một booking có thể có nhiều incident.** Có incident **CHƯA giải quyết** → **không tự động chuyển booking sang COMPLETED** (V08-11: "có sự cố → tạm dừng tự động hoàn thành").

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bookingId` | ref bookings | B | đơn có sự cố |
| `reportedBy` | ref users | B | người báo cáo (khách/studio/admin) |
| `type` (I5) | Enum: `SERVICE`, `DAMAGE`, `PAYMENT`, `OTHER` | B | **ĐÃ CHỐT (2C.1):** danh mục loại sự cố cuối cùng (nghĩa kỹ thuật, không phải danh mục v0.8 quy định). **`type` là trường định danh loại (immutable), không thay đổi sau khi tạo.** |
| `description` | String | B | mô tả |
| `evidence` | [String] (URI) | | bằng chứng (ảnh/video liên kết), riêng tư, giới hạn truy cập |
| `status` (I5) | Enum: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `DISPUTED` | B | **trạng thái xử lý (đổi theo thời gian), TÁCH KHỎI `type`**; `DISPUTED` là trạng thái (tranh chấp), **KHÔNG phải loại** (I5) |
| `resolvedAt`, `resolvedBy`, `resolutionNote` | Date, ref users, String | | khi giải quyết (RESOLVED) |
| `createdAfterCompletion` | Boolean | | (RC2, chốt 2C.1) đánh dấu incident phát sinh **sau** khi booking `COMPLETED`; mặc định `false`. Time-based enforcement (hạn 7 × 24 giờ) ở **tầng service**, không phải schema |
| `createdAt` | Date | B | |

> **I5 — phân biệt `type` và `status` (ĐÃ CHỐT 2C.1):** `type` (tại sao: SERVICE/DAMAGE/PAYMENT/OTHER) là danh mục kỹ thuật, **không phải** danh mục v0.8 quy định — **đã được chủ dự án phê duyệt làm danh mục cuối cùng**; không thay đổi sau khi tạo (immutable). `status` (đang xử lý thế nào: OPEN/IN_PROGRESS/RESOLVED/DISPUTED) là vòng đời xử lý, **tách hoàn toàn** khỏi `type`. Không gộp `DISPUTED` vào `type`.

Quy tắc (M2 + V08-11, chốt 2C.1):
- **Đã chốt (2C.1):** enum `type` = `SERVICE`/`DAMAGE`/`PAYMENT`/`OTHER` (immutable) và `status` = `OPEN`/`IN_PROGRESS`/`RESOLVED`/`DISPUTED` là **danh mục cuối cùng** — tách hoàn toàn `type` (tại sao) khỏi `status` (xử lý thế nào); `DISPUTED` là **trạng thái**, không phải loại (I5).
- **Incident phát sinh sau COMPLETED (RC2, chốt 2C.1):** tiếp nhận khiếu nại trong thời hạn **7 × 24 giờ kể từ `completedAt` (mốc UTC)**; đặt cờ `createdAfterCompletion: true` để phân biệt hiển thị. **Thời hạn enforce ở tầng service** (không dùng Mongoose schema validator để quyết định thời gian); KHÔNG chuyển ngược `bookingStatus` từ `COMPLETED` về `CONFIRMED`; không thay đổi quy tắc `incidentRevision` (RC1).
- **"Chưa giải quyết" = incident ở `OPEN`, `IN_PROGRESS` hoặc `DISPUTED`**; chỉ `RESOLVED` là đã giải quyết (I4).
- Job tự hoàn thành (24h sau giờ kết thúc, V08-11) **bắt buộc kiểm tra TOÀN BỘ** incidents của booking: chỉ tự chuyển `COMPLETED` khi **không có incident nào ở `OPEN`/`IN_PROGRESS`/`DISPUTED`**.
- Khi có sự cố chưa giải quyết, booking giữ nguyên `CONFIRMED`, job ghi log "không tự hoàn thành do incident".
- Lịch sử incident không xóa khi đổi trạng thái (giữ `resolvedAt`/`resolutionNote`).

### 2.13 `notifications` (M6, đã duyệt)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `userId` | ref users | B | |
| `channel` | Enum: `WEB`, `EMAIL` | B | M6: thông báo website và email |
| `type` | String | B | `BOOKING_ACCEPTED`, `DEPOSIT_EXPIRING`, `BOOKING_COMPLETED`, ... |
| `title`, `body` | String | B | nội dung nêu mã đơn, studio, thời gian, số tiền |
| `status` | Enum: `PENDING`, `SENT`, `FAILED` (nullable) | **Điều kiện (EMAIL)** | **`channel = EMAIL` → `status` bắt buộc**, giá trị ∈ {`PENDING`, `SENT`, `FAILED`}. **`channel = WEB` → không có delivery status, `status` = `null`** (WEB chỉ theo dõi đọc qua `readAt`). |
| `attemptCount` | Number (≥0) | B | số lần thử gửi **thực sự** đã chạy (M6); tăng sau mỗi lần thử. **WEB = 0 (hằng số, luôn).** |
| `nextAttemptAt` | Date (nullable) | B | mốc được phép thử lại (xem quy tắc retry dưới). **WEB = `null` (không retry cho channel WEB).** EMAIL mới tạo = thời điểm gửi lần đầu (thường = `createdAt`). |
| `lastError` | String | | lỗi gửi gần nhất (M6) — **không chứa secret** (không in body email/URI) |
| `readAt` | Date | | null = chưa đọc (WEB) |
| `createdAt`, `updatedAt` | Date | B | |

> **`maxAttempts` (chốt 2C.1):** **không phải trường trong document** `notifications` — là **cấu hình ứng dụng (job email)**, không hardcode trong model. Số lần thử cố định = **5 (tính cả lần gửi đầu)**; khi job cần biết trần, đọc từ cấu hình ứng dụng, không đọc từ record. Các trường **`attemptCount` và `nextAttemptAt` tiếp tục lưu trong document** (theo dõi trạng thái gửi — M6).

> **Conditional validation (2C.1-patch, tầng Mongoose):** yêu cầu `status` bắt buộc **chỉ khi `channel = EMAIL`** — khai báo bằng Mongoose `required` có điều kiện (validator: `v => this.channel === "WEB" ? v === null : !!v`), **không phải `required: true` tuyệt đối** (WEB hợp lệ với `status = null`). Khi `channel = WEB` cố định `attemptCount = 0`, `nextAttemptAt = null` (validator/mặc định theo channel). Không thêm field mới.

**Quy tắc retry email (M6/I3, 2A.3; chốt 2C.1):**
- Email mới được tạo: `status = PENDING`, `nextAttemptAt` = thời điểm được phép gửi lần đầu (thường = `createdAt`).
- Gửi **thành công**: `status = SENT`, `nextAttemptAt = null`.
- Gửi **thất bại nhưng còn lượt thử** (attemptCount < 5): `status = FAILED`, đặt `nextAttemptAt` theo **backoff** dưới đây; `attemptCount` tăng 1.
- **Hết số lần thử** (attemptCount ≥ 5): `status = FAILED`, `nextAttemptAt = null` (ngừng retry; để người dùng/admin xem lại).
- Job retry: quét `{ channel: "EMAIL", status: "FAILED", nextAttemptAt: { $lte: now } }` (hoặc `PENDING` có `nextAttemptAt <= now`), gửi, cập nhật `attemptCount`/`status`/`nextAttemptAt`/`lastError`. **Hành động retry KHÔNG đổi trạng thái booking** (M6/CORE-05).
- **Không triển khai Outbox trong MVP** (M6): gửi trực tiếp từ job/sự kiện, thử lại theo `nextAttemptAt` + `attemptCount`.

**Backoff retry (chốt 2C.1):** tăng dần theo lần thử thất bại:
| Lần thử (tính cả lần đầu) | Delay chờ trước lần thử này |
|---|---|
| 1 (gửi lần đầu) | 0 (gửi ngay) |
| 2 (sau attempt 1 thất bại) | 15 phút |
| 3 (sau attempt 2) | 30 phút |
| 4 (sau attempt 3) | 60 phút |
| 5 (sau attempt 4) | 120 phút |

- **120 phút là delay DÀI NHẤT của lịch backoff hiện tại** (4 mức chờ: 15/30/60/120 phút).
- **24 giờ không phải mức delay thứ 5** — chỉ là **giới hạn trần bảo vệ (protective cap)**: công thức `nextAttemptAt = now + min(backoffTier, 24h)` chặn bất kỳ delay cấu hình nào vượt 24 giờ (dự phòng cho cấu hình backoff mở rộng về sau). Với 5 lần gửi hiện tại, delay thực tế luôn ≤ 120 phút.
- **Tối đa 5 lần gửi (tính cả lần đầu)**; `maxAttempts` là **cấu hình ứng dụng, không lưu trong document** `notifications`.

**Index cho job retry (I3):**
- `{ channel: 1, status: 1, nextAttemptAt: 1 }` — job quét email cần retry (thay thế index inbox cũ dẫn đầu bằng userId).
- Giữ `{ userId: 1, channel: 1, readAt: 1, createdAt: -1 }` cho "hộp thông báo" của user (WEB).

Quy tắc (M6, CORE-05/v0.8):
- **Lỗi email KHÔNG làm thay đổi trạng thái booking**: mỗi sự kiện nghiệp vụ ghi 1 document `notifications` (WEB + EMAIL nếu có), trạng thái booking (đã được cập nhật trước đó) là nguồn duy nhất xác định kết quả nghiệp vụ; khi gửi/retry, chỉ các trường `status`/`attemptCount`/`nextAttemptAt`/`lastError` trong document notification thay đổi.
- `auditLogs` ghi nhận sự kiện gửi email **thất bại quan trọng** (action `EMAIL_SEND_FAILED`, metadata: type, bookingId, lần thử, mã lỗi) (M6).
- **Chưa có Outbox riêng trong MVP** (M6): gửi trực tiếp từ job/sự kiện, thử lại theo `nextAttemptAt` + `attemptCount`.

### 2.14 `auditLogs`
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `actorId` | ref users | **Điều kiện** | **Thao tác do USER thực hiện → `actorId` bắt buộc** (ref `users`, B). **Thao tác do SYSTEM/job thực hiện (ví dụ job hết hạn, job tự hoàn thành) → `actorId` được phép `null`** (job không có user gắn trực tiếp). **Không thêm trường `actorType` hay field nào khác; không tạo "SYSTEM user" giả** — nguồn là user hay job thể hiện qua giá trị có/không có `actorId` (và ngữ cảnh `action`). |
| `action` | String | B | `STUDIO_APPROVE`, `DEPOSIT_CONFIRM`, `REFUND_MARK`, `COMMISSION_ADJUST`, `REVIEW_HIDE`... |
| `resourceType` | String | B | `studio`, `booking`, `payment`, `commission`, `review`, `verificationDoc` |
| `resourceId` | String/ObjectId | B | |
| `metadata` | Mixed | | trước/sau (value trước & sau). **Bảo vệ dữ liệu nhạy cảm (2C.1-patch): `metadata` KHÔNG được chứa password, passwordHash, token, secret, hay số tài khoản ngân hàng đầy đủ.** Nếu log thay đổi banking, chỉ lưu giá trị **đã redacted/masked** (ví dụ chỉ 4 số cuối hoặc "••••"). Không thay đổi chính trường `metadata` (Mixed), chỉ ràng buộc nội dung. |
| `createdAt` | Date | B | khai báo tường minh trong schema; **mặc định là hàm `Date.now`** (`default: Date.now`). |

> **Quy tắc audit log (chốt 2C.1 + patch):** `auditLogs` là **append-only** — **không cập nhật, không xóa** log đã ghi; **không có `updatedAt`**. Model **giữ `timestamps`** với cấu hình rõ: `createdAt` khai báo tường minh trong schema, mặc định là **hàm `Date.now`** (không phải `new Date()` nội suy); **`updatedAt` không bật** cho collection này (timestamps chỉ dùng cho `createdAt`) — log chỉ được ghi một lần tại thời điểm thao tác.

## 3. Đề xuất Index

### Unique (ràng buộc tính đúng/sai)
| Index | Collection | Ý nghĩa |
|---|---|---|
| `{ email: 1 }` **unique** | users | một email một tài khoản |
| `{ studioId: 1, userId: 1 }` unique | studioMembers | không trùng phân quyền |
| `{ bookingCode: 1 }` unique | bookings | mã đơn duy nhất |
| `{ idempotencyKey: 1 }` unique | payments | chống ghi trùng thu/hoàn khi gửi lặp (16.5/v0.8); **bắt buộc có giá trị** (Mongoose `required`) — unique index chỉ chặn trùng khi key có giá trị (I2) |
| `{ bookingId: 1 }` unique | reviews | **một đánh giá/đơn** (V08-12) |
| `{ idempotencyKey: 1 }` unique | commissions | 1 bản ghi gốc/đơn + nhiều điều chỉnh (quy ước key I2: `commission:{bookingId}:ORIGINAL` / `...ADJUSTMENT:{adjustmentId}`); bắt buộc có giá trị |
| **`{ roomId: 1, slotStartUtc: 1 }` unique (A2, ĐÃ DUYỆT)** | slotLocks | **chìa khóa chống đặt trùng**: cùng phòng + cùng ô 15 phút chỉ một document sống; đặt trùng → **duplicate-key error** → rollback (sec 7/9). Ô được giải phóng bằng cách xóa document (sec 2.8), không dùng partial index. |

### Tìm kiếm / truy vấn thường dùng
| Index | Collection | Lý do |
|---|---|---|
| `{ studioId: 1, status: 1 }` | rooms | liệt kê phòng studio |
| `{ studioId: 1, status: 1, pricingMode: 1 }` | services | liệt kê gói |
| `{ customerId: 1, createdAt: -1 }` | bookings | "đơn của tôi" (truy vấn theo mã dùng unique index bookingCode) |
| `{ studioId: 1, bookingStatus: 1, responseExpiresAt: 1 }` | bookings | studio xem đơn chờ; **job hết hạn (A4) quét `responseExpiresAt <= now` / `paymentExpiresAt <= now`** |
| `{ slotStartUtc: 1 }` | slotLocks | **job dọn slot đã qua** (A4, sec 9) — xóa ô cũ (KHÔNG dùng cho slot đang hiệu lực, rule B) |
| `{ studioId: 1, scope: 1, startAt: 1, endAt: 1 }` | availabilityExceptions | kiểm tra ngoại lệ chồng theo studio/phòng (A6, M3) |
| `{ bookingId: 1, purpose: 1 }` | payments | đối chiếu tiền đơn (BALANCE/REFUND nhiều record) |
| `{ studioId: 1, period: 1, status: 1 }` | commissions | đối soát tháng theo studio |
| `{ bookingId: 1, status: 1 }` | incidents | **kiểm tra incident chưa giải quyết trước khi tự COMPLETED** (M2, V08-11) |
| `{ channel: 1, status: 1, nextAttemptAt: 1 }` | notifications | **job retry email** — quét `{ channel:"EMAIL", status:"FAILED"/"PENDING", nextAttemptAt <= now }` (I3, M6) |
| `{ userId: 1, channel: 1, readAt: 1, createdAt: -1 }` | notifications | hộp thông báo của user (WEB) |
| `{ status: 1, needsMoreInfo: 1 }` | studios | danh sách ACTIVE công khai + hàng đợi duyệt đang chờ bổ sung (A7 + M1) |
| `{ actorId: 1, createdAt: -1 }` / `{ resourceType: 1, resourceId: 1 }` | auditLogs | truy vết thao tác (gồm lỗi email thất bại — M6) |

*Không tạo text index cho tìm kiếm studio (MVP đủ `studioId + status`); có thể thêm `name` (giới hạn) nếu cần tìm theo tên.*

### Khai báo index & partial filter (rule C)
- **Toàn bộ index được khai báo trong Mongoose schema** (`schema.index(...)` / `index: true` + `unique: true` + `partialFilterExpression`) — không chạy thủ công `createIndex`/dropIndex ngoài script.
- **Không tự chạy lệnh tạo/xóa/sửa index trực tiếp trên MongoDB Atlas trong bước này** (Atlas chỉ dùng để kiểm chứng sau khi Mongoose sync).
- Các trường **tùy chọn/null** cần **partial filter** để index không vô hiệu khi null:
  - `slotLocks { bookingId: 1 }` (không unique) — **`partialFilterExpression: { bookingId: { $type: "objectId" } }`** (index chỉ document mà `bookingId` có tồn tại **và** là ObjectId — tức `source: BOOKING`; document `source: MANUAL` có `bookingId: null` bị loại khỏi index vì BSON type `null` không khớp `$type: "objectId"`). *Patch 2C.1-partial: expression cũ `{ bookingId: { $exists: true, $ne: null } }` dùng `$ne` — **`$ne` không nằm trong danh sách toán tử được hỗ trợ của `partialFilterExpression`** (theo tài liệu MongoDB: chỉ `$eq`/equality, `$exists`, `$gt`, `$gte`, `$in`, `$lt`, `$lte`, `$type`, `$and`, `$or`) → thay bằng `$type: "objectId"` (khớp đúng loại ref `bookings` và phủ luôn điều kiện exists + không-null). Index key giữ nguyên `{ bookingId: 1 }`, không unique.*
  - `availabilityExceptions { roomId: 1 }` (không unique) — **`partialFilterExpression: { scope: "ROOM" }`** (roomId chỉ có khi scope ROOM) — equality filter, **hợp lệ, giữ nguyên**.
  - `payments.refundStatus` nếu index riêng — **`partialFilterExpression: { purpose: "REFUND" }`** (trường chỉ hợp lệ với purpose REFUND) — equality filter, **hợp lệ, giữ nguyên**.
  - Unique index `{ roomId: 1, slotStartUtc: 1 }` (A2) là **full index** (cả hai trường đều bắt buộc, không cần partial) — ô giải phóng bằng **xóa document** (chốt 2C.1: không có document RELEASED trong collection hoạt động).

**Phân biệt 3 lớp ràng buộc quanh `slotLocks` (patch 2C.1-partial — giữ nguyên nghĩa 2C.1, không thêm field):**
1. **Partial index `{ bookingId: 1 }` chỉ để tối ưu truy vấn** (ví dụ "xóa/kiểm tra toàn bộ slot của booking X") — loại document MANUAL (bookingId null) khỏi index cho hiệu quả; **không phải ràng buộc dữ liệu** (không chặn hay từ chối insert nào).
2. **Quy tắc `source=BOOKING ⇒ bookingId required (ObjectId)` / `source=MANUAL ⇒ bookingId=null` là conditional validation ở tầng Mongoose (pre-validate) / service** (chốt 2C.1, sec 2.8) — enforce khi ghi dữ liệu, **độc lập với index** (vi phạm quy tắc bị từ chối insert, không nhờ partial filter).
3. **Unique index `{ roomId: 1, slotStartUtc: 1 }` (A2) là ràng buộc chống đặt trùng riêng** (duplicate-key → rollback transaction) — không liên quan đến partial index `bookingId`.

## 4. Snapshot tại thời điểm đặt (yêu cầu 4)

- `bookings.priceSnapshot`, `bookings.policySnapshot`, `bookings.commissionSnapshot` được **ghi một lần lúc insert** (giá trị hiện hành của `services`, `depositRate`, `cancelPolicy`, `commissionSettings.ratePercent`).
- **Bất biến sau khi tạo** — studio sửa bảng giá/gói/chính sách sau đó **không đổi** đơn cũ (19.3/19.7). Mongoose: đặt `immutable` trên các snapshot, không có `updatedAt` trên snapshot.
- `commissions.rateSnapshot` copy từ `commissionSnapshot` để đối soát giữ lịch sử chính xác (19.4).
- Khi tạo **đơn mới** (khách hủy rồi đặt lại) → snapshot mới, giá hiện hành; cọc cũ **không** chuyển sang (V07-06).

## 5. Tách trạng thái (yêu cầu 5, A9 — ĐÃ DUYỆT)

| Nhóm | Lưu ở | Giá trị | Ghi chú |
|---|---|---|---|
| Trạng thái đơn | `bookings.bookingStatus` | PENDING_STUDIO, AWAITING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, REJECTED, EXPIRED | vòng đời nghiệp vụ |
| Trạng thái thu tiền | `bookings.paymentStatus` (tổng hợp) + `payments[].status` (chi tiết) | DEPOSIT_PENDING/PAID, BALANCE_PARTIAL, PAID_IN_FULL | PAID_IN_FULL chỉ khi Σ payments BALANCE+DEPOSIT xác minh = total (16.2/v0.8) |
| Trạng thái hoàn tiền | `bookings.refundStatus` (tổng hợp) + `payments[purpose=REFUND].refundStatus` (chi tiết) | REFUND_PENDING/PROCESSING/REFUNDED/REFUND_FAILED/PARTIALLY_REFUNDED/DISPUTED | hoàn = record riêng, tiền không âm |
| Trạng thái đối soát hoa hồng | `commissions.status` | PENDING, SETTLED, ADJUSTED, **UNRECONCILABLE** | tách hẳn, theo tháng (V07-01); `UNRECONCILABLE` → admin xử lý thủ công (A5) |

Quy tắc (A9, đã duyệt):
- Không dùng **một trường** chung gộp cả 4 nhóm — mỗi nhóm là trạng thái riêng; `bookings` chỉ giữ bản "tổng hợp" để hiển thị nhanh và luôn truy vết về collection chi tiết (`payments`, `commissions`).
- Giao dịch thanh toán/hoàn tiền và điều chỉnh hoa hồng là **record riêng** (không sửa gốc). Không **ghi đè lịch sử giao dịch hoặc snapshot đã ghi nhận**: snapshot trên `bookings` immutable; điều chỉnh hoa hồng là record `ADJUSTMENT` có `adjustmentOf`; hoàn tiền là record `REFUND` riêng (tiền không âm).

**Phân định trạng thái chính thức vs. tổng hợp (rule D):**
- **Trạng thái chính thức (source of truth):** nằm trong collection chi tiết — `payments[].status`/`refundStatus`, `commissions.status`, `incidents.status`, và **sự tồn tại document `slotLocks`** (chốt 2C.1: không có field `state` — slot đang giữ hay không thể hiện bằng việc document có tồn tại trong collection hay không, giải phóng = xóa document). Đây là dữ liệu dùng để tính tổng hợp và quyết định nghiệp vụ.
- **Trạng thái tổng hợp (denormalized, phục vụ hiển thị):** nằm trên `bookings` — `paymentStatus`, `refundStatus` (booking-level), và `bookingStatus`. Được **tính lại** từ collection chi tiết khi cần, nhưng khi cập nhật phải **nhất quán** (rule A/B dưới đây).
- **Khi đổi trạng thái (rule D):** **quy tắc không xóa/sửa lịch sử** áp dụng cho **dữ liệu nghiệp vụ đã ghi nhận** — giao dịch `payments` (thu/hoàn), điều chỉnh hoa hồng `commissions` (`ADJUSTMENT` + `adjustmentOf`), lịch sử `incidents` (giữ `resolvedAt`/`resolutionNote`), và **snapshot bất biến trên `bookings`** (giá/chính sách/hoa hồng) — không bao giờ ghi đè hay xóa để "dọn" lịch sử. Hoàn tiền/điều chỉnh/incident đều là **record riêng** kèm thời gian điểm. **Ngoại lệ duy nhất: `slotLocks` là document GIỮ CHỖ VẬN HÀNH (không phải lịch sử nghiệp vụ)** — được phép **xóa khi giải phóng** (REJECTED/EXPIRED/CANCELLED hoặc job dọn ô đã qua) theo **D7** (sec 2.8/5b rule B); việc xóa này **không vi phạm** rule D hay quy tắc append-only của `auditLogs` (xóa slotLocks chỉ là thao tác vận hành giữ chỗ, không phải xóa lịch sử đã ghi nhận). Trạng thái tổng hợp trên booking được cập nhật **nguyên tử cùng** record chi tiết (cùng 1 transaction) để tránh lệch.

## 5b. Đồng nhất trạng thái thanh toán & hoàn tiền (rule A, B)

**Payments & refunds (rule A):**
- `payments.purpose` nhận `DEPOSIT`, `BALANCE`, `REFUND` — **mỗi giao dịch là 1 record riêng** (không cộng dồn, không âm vào record khác).
- **Trạng thái từng giao dịch** = `payments.status` (PENDING/CONFIRMED/REJECTED) cho thu; `payments.refundStatus` (REFUND_*) cho hoàn.
- **Trạng thái tổng hợp trên booking** = `bookings.paymentStatus` (DEPOSIT_PENDING/DEPOSIT_PAID/BALANCE_PARTIAL/PAID_IN_FULL) và `bookings.refundStatus` (NONE/REFUND_PENDING/...). Tính lại khi có record mới:
  - `paymentStatus`: tổng số tiền đã xác minh (DEPOSIT + BALANCE) so với tổng đơn → DEPOSIT_PAID / BALANCE_PARTIAL / PAID_IN_FULL.
  - `refundStatus`: dựa trên `payments[purpose=REFUND].refundStatus` mới nhất + mức độ hoàn (toàn phần/1 phần).
- **Cập nhật nhất quán (rule A):** mỗi thao tác (ghi nhận thu / xác nhận hoàn) = 1 transaction: (1) insert/update record `payments`, (2) tính lại & cập nhật `bookings.paymentStatus`/`refundStatus` từ tập record. Không cập nhật tổng hợp mà không có record tương ứng. Dùng `idempotencyKey` chống ghi trùng.
- **Không có payment gateway / webhook** (MVP: chuyển khoản trực tiếp + nhân viên studio xác nhận, CORE-02). `method` chỉ `BANK_TRANSFER_QR`/`CASH`.

**SlotLocks (rule B):**
- Unique index `{ roomId, slotStartUtc }` (A2).
- **Tất cả slot của 1 booking nhiều phòng tạo trong cùng 1 transaction** (A3); 1 slot trùng → duplicate-key → **rollback toàn bộ**.
- Booking bị REJECTED/EXPIRED/CANCELLED hợp lệ → **xóa các slot tương ứng** (giải phóng, sec 6/9).
- **Không dựa vào TTL để giải phóng slot đang có hiệu lực** — TTL chỉ dọn ô đã qua (job định kỳ A4, idempotent), không thay thế xóa khi đổi trạng thái.
- **Công thức tính slot theo `[startAt, endAt + buffer)`:** với khoảng `[startAt, endAt)`, thêm buffer → chiếm đến `endAt + buffer`. Số ô = `ceil((duration + buffer) / 15)`, căn đầu `startAt` theo biên 15 phút (sec 2.8). Ví dụ 90 phút + buffer 15 → 7 ô.

## 6. Đặt nhiều phòng cùng studio — all-or-nothing (yêu cầu 6, A3)

- **1 booking = 1 studio**, mảng `items[]` (mỗi item 1 phòng) **chung `startAt`/`endAt`** (CORE-04).
- Kiểm tra khả dụng: **toàn bộ** phòng trong `items[]` phải trống (kể cả buffer) cùng khung giờ. **Một phòng bận → cả đơn từ chối**, không tạo đơn một phần (CORE-04/16.4).
- Giữ chỗ (A2 + A3, đã duyệt): trong **1 multi-document transaction (replica set/Atlas)**, tạo **N × K documents `slotLocks`** — K ô 15 phút (từ `startAt` đến `endAt` + buffer, sec 2.8) × N phòng. **Commit chỉ khi mọi insert thành công**; duplicate-key ở bất kỳ ô/phòng nào → **rollback toàn bộ** (booking + mọi slotLocks) → **không phòng nào được giữ** ("tất cả thành công hoặc tất cả thất bại", CORE-04).
- Giải phóng (REJECTED/EXPIRED/CANCELLED): **xóa** mọi slotLocks của đơn trong 1 transaction (19.2) — ô được mở lại ngay cho đơn khác.
- Giải pháp "không một phần" được bảo đảm bằng **nguyên tử của transaction + unique index** (sec 7–9), không phải bằng logic ứng dụng.

## 7. Chống đặt trùng phòng (yêu cầu 7) — phân tích

**Rủi ro nếu chỉ "truy vấn lịch trống rồi ghi đơn":**
1. **Race đồng thời:** khách X và Y cùng gửi yêu cầu cùng phòng/giờ; cả hai đọc "trống" rồi cả hai insert → 2 đơn chiếm 1 slot.
2. **Giữ chỗ kép:** đơn PENDING/AWAITING của X đang giữ slot nhưng chưa `CONFIRMED`; Y đọc không thấy "đang giữ" nếu chỉ tra `bookings` theo `CONFIRMED` → đặt đè lên giữ chỗ của X.
3. **Hết hạn đồng thời:** 2 job/worker cùng đánh dấu EXPIRED + giải phóng slot → giải phóng 2 lần hoặc ghi đè trạng thái.

**Cách loại bỏ (không phụ thuộc chỉ app logic, theo A2 đã duyệt):**
- **Biến "khoảng trống" thành tài nguyên có ràng buộc unique:** mỗi ô 15 phút của phòng là một document `slotLocks` với unique index `{ roomId, slotStartUtc }`. Hai đơn khác nhau muốn chiếm cùng ô → **một bên bị duplicate-key error** (ràng buộc ở tầng storage, hoạt động đồng thời/ACID) → rollback đơn đó.
- **Giữ cả buffer (A2):** phần đệm 15 phút sau buổi đặt cũng được giữ thành các ô `slotLocks` → hai lượt liền kề không va nhau (17.3: lượt trước hết 14:00, đệm 15 → lượt sau không được bắt đầu trước 14:15 — ô 14:00–14:15 đã bị chiếm).
- **Job hết hạn (A4):** chỉ chạy **update có điều kiện** + delete slot (kèm deadline theo **server time**, 16.4), **idempotent** khi chạy lặp → 2 worker không cùng giải phóng (sec 9).

## 8. Cơ chế slot đã chọn — lưới 15 phút + unique index (A2, ĐÃ DUYỆT)

Quy tắc giờ áp dụng (V08-02/08/09):
- **Giờ bắt đầu**: bước 15 **hoặc** 30 phút (mặc định 30), do studio cấu hình (`studios.scheduling.startStepMinutes`).
- **Thời lượng**: bước 30 phút, **tối thiểu 30 phút** (max mặc định 4 giờ, trần 8 giờ).
- **Đệm (buffer)**: mặc định 15 phút, cho phép 0 (phải là bội số 15 — ràng buộc cấu hình, sec 2.8).

**Cơ chế (A2):** trục thời gian chia thành **ô 15 phút cố định**; `slotStartUtc` của mỗi ô trùng biên 900 giây của UTC (mốc toàn cục, không phụ thuộc studio).
- Giờ bắt đầu 15/30 phút: do lưới 15 phút mịn hơn, mọi mốc bắt đầu hợp lệ (bước 15 hay 30) đều khớp biên ô 15 phút.
- Thời lượng bước 30 phút: tập ô chiếm là **liên tiếp** (30 phút = 2 ô, 60 phút = 4 ô, 90 phút = 6 ô).
- Buffer 15 phút: thêm **1 ô** vào cuối (buffer 0 → không thêm).
- Số ô giữ = `ceil((duration + buffer) / 15)` (các đầu đã căn lưới).

**So với phương án cũ (không chọn):** 8a range-lock (1 document/khoảng, chặn chồng bằng query + transaction) đã bị thay thế — phương án A2 chặn trùng **nguyên tử, chắc chắn** nhờ unique index; đổi lại, mỗi booking giữ nhiều ô nhỏ (ví dụ 90 phút + buffer = 7 ô/phòng) và cần transaction để giữ **nhiều phòng all-or-nothing** (sec 9, A3).

## 9. Transaction & triển khai MongoDB (yêu cầu 9, A3 + A4 ĐÃ DUYỆT)

**Nền tảng (A3):** dùng **MongoDB Atlas hoặc replica set hỗ trợ multi-document ACID transaction** (đăng ký Atlas M0 miễn phí, hoặc self-host 1-node RS). **KHÔNG dùng MongoDB standalone** cho yêu cầu này — standalone không có multi-document transaction.

**Khi nào dùng transaction:**
1. **Tạo đơn + giữ chỗ all-or-nothing (nhiều phòng):** insert booking + toàn bộ `slotLocks` (N phòng × K ô 15 phút, sec 2.8) trong **1 `session.withTransaction`**: mọi insert thành công → **commit** (đơn + giữ chỗ + buffer); bất kỳ ô nào **duplicate-key** → **rollback toàn bộ** (booking + mọi slot) → không phòng nào được giữ (CORE-04, A2/A3).
2. **Giải phóng (REJECTED/EXPIRED/CANCELLED):** **xóa** mọi `slotLocks` của đơn **trong 1 transaction** (19.2) — ô mở lại ngay, tránh "giải phóng một phần".
3. **Xác nhận COMPLETED + tạo commission ORIGINAL:** làm trong 1 bước, idempotent bằng `idempotencyKey` (tạo đúng 1 bản ghi hoa hồng, 19.7).
4. **Tạo giao dịch (payments):** insert có `idempotencyKey` unique → chống ghi trùng; nên kèm trong transaction khi cập nhật `bookings.paymentStatus`.
5. **Tự hoàn thành booking + tạo commission ORIGINAL (I4):** chuyển `CONFIRMED → COMPLETED` + insert `commissions` (kind ORIGINAL, `idempotencyKey = commission:{bookingId}:ORIGINAL`) trong **1 transaction** (idempotent, 19.7).

**Job định kỳ (A4, ĐÃ DUYỆT):**
- Job định kỳ (cron) quét:
  - `bookings.bookingStatus = PENDING_STUDIO AND responseExpiresAt <= now` → EXPIRED (REJECTED path, 19.2).
  - `bookings.bookingStatus = AWAITING_PAYMENT AND paymentExpiresAt <= now` → EXPIRED + xóa slotLocks.
  - **Tự hoàn thành (I4, V08-11):** `bookings.bookingStatus = CONFIRMED AND endAt + 24h <= now` (server time, A8) **VÀ không tồn tại incident `OPEN`/`IN_PROGRESS`/`DISPUTED` của booking đó** (kiểm tra **toàn bộ** incidents, index `{ bookingId, status }`) → chuyển `COMPLETED` + tạo commission ORIGINAL (transaction, idempotent). Có incident chưa giải quyết → **KHÔNG hoàn thành**, giữ `CONFIRMED`, log.
  - Dọn `slotLocks` đã qua (`slotStartUtc < now − grace` và đơn không còn giữ) — idempotent.
- Mỗi lần: **update có điều kiện**, **giờ server** (16.4), **idempotent** (chạy lặp không lỗi, 16.4/16.6). Không cài/triển khai job trong giai đoạn tài liệu này (A4: "chưa cài hoặc triển khai job").

**Race condition giữa "incident mới" và "job tự hoàn thành" (I4, hoàn thiện 2A.4):**

Rủi ro: thao tác **create incident hợp lệ** (khách/studio/admin) chạy **đồng thời** với job tự hoàn thành → booking bị COMPLETED trong khi sự cố hợp lệ vừa được ghi nhận (vi phạm V08-11).

**Giới hạn của cơ chế "chỉ re-query trong transaction" (đã loại, 2A.4):** transaction MongoDB **đọc snapshot theo thời điểm bắt đầu transaction**. Nếu incident được insert + commit **sau** khi job đọc snapshot nhưng **trước khi job commit**, job **không thấy** incident đó (nằm ngoài snapshot) → vẫn COMPLETED. Do đó **re-query trong transaction không đủ** để chặn.

**Cơ chế thay thế (2A.4) — shared document + revision control + write-conflict retry:**
- **Nguyên lý:** cả 2 đường ghi (create incident, auto-complete) đều **ghi vào cùng 1 document `bookings`** → chúng **xung đột vật lý (write conflict)** tại tầng storage, được MongoDB phát hiện; **không phụ thuộc đọc snapshot cũ**.
- **Trường kỹ thuật `bookings.incidentRevision`** (Number, mặc định 0, sec 2.7):
  - **Create incident (transaction `T_incident`):** (1) `insert` document `incidents`; (2) `update` booking `$inc: { incidentRevision: 1 }` — **cùng 1 transaction**. Ghi booking không thành = incident không hợp lệ (rollback đồng thời).
  - **Job auto-complete (transaction `T_job`):** (1) đọc booking, ghi nhận `incidentRevision` hiện tại = `v`; (2) **ngoài transaction (fresh read)** kiểm tra `incidents { bookingId, status: $in: [OPEN, IN_PROGRESS, DISPUTED] }` → có ≥1 → **abort (không COMPLETED)**; (3) không có → trong `T_job`: `update booking { _id, bookingStatus: "CONFIRMED", incidentRevision: v }` (update có điều kiện: chỉ chạy khi bookingStatus vẫn `CONFIRMED` **VÀ** `incidentRevision` chưa đổi; nếu incident tạo xen vào → điều kiện sai → 0 dòng cập nhật → **abort**); (4) insert commission ORIGINAL (idempotent, key `commission:{bookingId}:ORIGINAL`) → commit.
- **Xử lý write conflict + retry an toàn (2A.4):**
  - Khi 2 transaction ghi trùng document `bookings` (incident commit gần sát điểm commit của job), MongoDB **bắn lỗi write conflict cho một bên** (thường là job). Job:
    1. Bắt lỗi → **rollback** transaction hiện tại.
    2. **Chạy lại toàn bộ quy trình từ đầu** (đọc lại booking, kiểm tra lại `bookingStatus` phải vẫn `CONFIRMED`, **kiểm tra lại TẤT CẢ incidents chưa giải quyết** — không chỉ snapshot cũ).
    3. Incident chưa giải quyết đã tồn tại (mới insert) → **abort lần này**, giữ `CONFIRMED`, để chu kỳ job sau xử lý; không có → làm lại bước (3)–(4).
    4. **Retry có trần (chốt 2C.1, patch):** khi gặp lỗi transient/write conflict, job **thực thi đầu tiên + tối đa 5 lần retry bổ sung = tối đa 6 lần thực thi trong một chuỗi thử lại**; **backoff tăng dần, cấu hình ở tầng job** (không phải tham số schema). **Hết retry → bỏ qua booking trong chu kỳ hiện tại, chờ chu kỳ job tiếp theo** (không block các booking khác). **Không thêm trường retry vào schema `bookings`.** **Không bao giờ chấp nhận "COMPLETED khi incident hợp lệ đã commit trước đó"** — mọi đường dẫn đều qua kiểm tra fresh read hoặc bị chặn bởi write conflict + retry.
  - **Invariant (bằng chứng đúng):** incident hợp lệ (đã commit) ⇒ `incidentRevision` tăng ⇒ job phiên cũ không commit được; fresh read sau retry **thấy incident** ⇒ abort. Incident commit **sau khi** job đã COMPLETED (booking đã đổi trạng thái, không còn write conflict về incidentRevision) ⇒ xử lý theo quy tắc "incident sau COMPLETED" dưới đây.
  - **Tham số khi code (còn lại):** chỉ cách encode điều kiện `incidentRevision` (filter `$eq`). **maxRetries/backoff đã chốt (2C.1, patch):** tối đa **5 lần retry bổ sung** sau lần thực thi đầu tiên (= **tối đa 6 lần thực thi trong một chuỗi thử lại**), backoff tăng dần, cấu hình ở tầng job; **không thêm trường retry vào schema `bookings`**. Hết retry → bỏ qua booking trong chu kỳ hiện tại, chờ chu kỳ job tiếp theo. Giữ 1 số duy nhất, không dùng lock tường minh.

**Quy tắc incident tạo SAU khi booking đã COMPLETED (chốt hướng 2A.4):**
- **Cho phép ghi nhận khiếu nại sau COMPLETED** (incident vẫn insert đầy đủ `type`/mô tả/bằng chứng; có thể gắn cờ `createdAfterCompletion: true` để phân biệt hiển thị).
- **KHÔNG chuyển ngược `bookingStatus` từ `COMPLETED` về `CONFIRMED`** — COMPLETED là sự kiện một chiều.
- Xử lý tiếp thuộc **quy trình khiếu nại/hoàn tiền/điều chỉnh hoa hồng có sẵn**: refund hợp lệ → record `payments` purpose `REFUND` (không âm, sec 2.9) + `commissions` `ADJUSTMENT` (A5a); tranh chấp → `incidents.status = DISPUTED` + admin theo dõi (V08-11/19.6). Trạng thái hoàn/điều chỉnh chạy độc lập, **không "quay" trạng thái đơn**.
- **Thời hạn khiếu nại sau COMPLETED (chốt 2C.1, chủ dự án 2026-11-01):** incident mới sau khi booking `COMPLETED` được tiếp nhận trong **7 × 24 giờ kể từ `completedAt`** (mốc thời gian lưu **UTC**). Thời hạn **enforce ở tầng service** (không dùng Mongoose schema validator để quyết định thời gian); đặt `createdAfterCompletion: true` trên incident phát sinh sau hoàn tất; **không** chuyển booking từ `COMPLETED` ngược về `CONFIRMED`; không thay đổi quy tắc `incidentRevision` (RC1).

**Quy tắc kỹ thuật:**
- `writeConcern` mức `majority` (hoặc mặc định RS) cho transaction an toàn.
- Transaction **ngắn**, ít collection (chỉ booking + slotLocks [+ payments] mỗi lần), tránh giữ khóa dài. **Không mở transaction cho logic tính giá** (giá tính trước, rồi chỉ "ghi + giữ chỗ" trong transaction).
- Với đơn **1 phòng**: vẫn nên dùng transaction để giữ consistent; nhưng **unique index slotLocks (A2) đã chặn trùng** nên ngay cả không transaction cũng an toàn về đặt trùng (chỉ mất all-or-nothing khi có nhiều phòng — không ảnh hưởng đơn 1 phòng).

**9b. Quy tắc triển khai Mongoose (2A.4):**

**(1) Collection naming — khớp chính xác 14 collection, không tin quy tắc mặc định:**
- Tên collection trong MongoDB **phải khớp chính xác** với 14 tên trong sec 1 — **đặc biệt các tên camelCase**: `studioMembers`, `availabilityExceptions`, `slotLocks`, `auditLogs`.
- Mongoose mặc định **tự pluralize + lowercase** (ví dụ model `studioMember` → collection `studiomembers`) → **KHÔNG được dựa vào quy tắc mặc định**.
- Mỗi schema phải khai báo **tường minh**: `new Schema({ ... }, { collection? })` — đúng nhất: gọi `mongoose.model('Incidents', schema, 'incidents')` hoặc `schema.options`/option thứ ba của `model()` chỉ định **tên collection chính xác**. Mỗi collection chỉ map 1 model duy nhất (tránh model trùng tên/khác collection).
- Table đối soát (tên model gợi ý → tên collection bắt buộc):

| Model (gợi ý) | Collection bắt buộc |
|---|---|
| User | `users` |
| Studio | `studios` |
| StudioMember | `studioMembers` |
| Room | `rooms` |
| Service | `services` |
| AvailabilityException | `availabilityExceptions` |
| Booking | `bookings` |
| SlotLock | `slotLocks` |
| Payment | `payments` |
| Commission | `commissions` |
| Review | `reviews` |
| Incident | `incidents` |
| Notification | `notifications` |
| AuditLog | `auditLogs` |

- Trước khi chạy hệ thống thật: **kiểm tra lại tên collection thực tế trên Atlas (Compass)** khớp bảng trên (rule C: index cũng do Mongoose sync, không chạy lệnh tay).

**(2) Phân biệt `required` / `unique` / `immutable` cho `idempotencyKey` (2A.4):**
- **`required: true`** = **validation của Mongoose** (chạy phía application khi `save()`/`create()`); chặn record thiếu key **trước khi** ghi DB. Không phải ràng buộc ở tầng MongoDB.
- **`unique: true`** = **khai báo MongoDB unique index** (sinh ra qua `syncIndexes`/`createIndex` của Mongoose), **KHÔNG phải validator Mongoose**. Chỉ chặn trùng khi key **có giá trị**; document **thiếu/null key** không bị unique index coi là trùng (MongoDB coi như null) — nếu code path nào bypass Mongoose (raw API/bulk) thiếu key, uniqueness bị vô hiệu im lặng.
- **`immutable: true`** = hạn chế (Mongoose) **không sửa trường này sau khi tạo**; chặn sửa sai key ghi nhận (idempotency phải ổn định để retry).
- **Không được kết luận "đã chống trùng" chỉ dựa vào `required`/`unique` trong Schema:** unique thực sự chỉ hiệu lực khi **index tồn tại trên Atlas**. → **Kiểm tra index (listIndex) trước khi đưa hệ thống vào hoạt động thực tế**; bước kiểm tra này là bước vận hành (không phải chạy lệnh sửa index trong giai đoạn tài liệu — rule C: Mongoose sync khai báo index theo tài liệu).

## 10. Phân biệt: nghiệp vụ đã chốt vs. giả định kỹ thuật cần duyệt

### 10.1 Nghiệp vụ **ĐÃ CHỐT** trong v0.8 (không cần duyệt lại)
- Cọc 20% tổng, QR studio, hạn 30 phút; studio xác minh giao dịch ngân hàng (CORE-01/02).
- Hủy trước ≥24h hoàn 100%, trong 24h cuối không hoàn; studio hủy sau nhận cọc hoàn đủ trong 3 ngày làm việc (CORE-03).
- Đơn nhiều phòng **cùng studio, cùng khung giờ**, all-or-nothing (CORE-04).
- Thời lượng bước 30 (min 30, max mặc định 4h, trần 8h); bước bắt đầu 15/30 (mặc định 30); buffer mặc định 15 (cho phép 0) (V08-02/08/09).
- Giá theo 30 phút; gói gồm phòng không cộng phòng lần 2; không coupon; snapshot giá/chính sách (V08-06/07/13).
- Hoa hồng 5% (cơ sở = dịch vụ sau giảm − hoàn hợp lệ, không cộng cọc), đối soát tháng, hạn trả ngày 5 tháng sau (V07-01/19.4).
- 1 đánh giá/đơn COMPLETED, không sửa, báo cáo + audit (V08-12).
- Studio chỉ ACTIVE (admin duyệt) mới công khai/nhận đơn (V08-05/V07-02).

### 10.2 **Quyết định kỹ thuật — ĐÃ DUYỆT bởi chủ dự án (2026-10-29)** (không phải v0.8)
| # | Quyết định | Nội dung đã duyệt |
|---|---|---|
| A1 | Tiền **số nguyên `Number` VND** (không Decimal128) | Xác thực `Number.isSafeInteger()`; từ chối giá trị tiền không hợp lệ (âm, không nguyên, vượt safe-integer) |
| A2 | **Cơ chế chống đặt trùng: lưới slot 15 phút + unique index `{ roomId, slotStartUtc }`** (sec 8) | Thời lượng theo bước 30; bước giờ 15/30; buffer mặc định 15; **giữ toàn bộ slot bị chiếm, kể cả buffer** |
| A3 | **MongoDB Atlas hoặc replica set** (multi-document transaction) | Đơn nhiều phòng tạo **toàn bộ hoặc không tạo gì**; **không dùng standalone** cho yêu cầu này |
| A4 | **Job định kỳ** xử lý đơn hết hạn | Kết hợp update có điều kiện, giờ server, thao tác idempotent; **chưa cài/triển khai trong giai đoạn tài liệu này** |
| A5a | Hoa hồng: **không** tự động chuyển điều chỉnh vượt công nợ thành số dư tín dụng | Ghi nhận lịch sử điều chỉnh; trường hợp chưa đối soát được → `UNRECONCILABLE` + **admin xử lý thủ công** (sec 2.10) |
| A6 | Lịch mở cửa hằng tuần nằm trong **cấu hình studio** (`studios.scheduling`) | Ngày nghỉ/ngày đặc biệt/khoảng khóa lịch nằm trong collection `availabilityExceptions` riêng; hỗ trợ ngoại lệ **toàn studio hoặc riêng 1 phòng** |
| A7 | 5 trạng thái studio: **PENDING_REVIEW, ACTIVE, REJECTED, SUSPENDED, CLOSED** | Chỉ **ACTIVE** công khai và nhận đặt lịch |
| A8 | Lưu ngày giờ dạng **UTC `Date`** | Hiển thị & tính giờ hoạt động theo múi giờ cấu hình trên studio; **mặc định `Asia/Ho_Chi_Minh`** |
| A9 | Tách trạng thái **booking / payment / refund / commission** | Giao dịch & điều chỉnh hoa hồng là record riêng; **không ghi đè lịch sử giao dịch hoặc snapshot đã ghi nhận** |

### 10.3 **Điểm đã được quyết định đóng (2C.1, 2026-11-01)**
| # | Nội dung | Kết luận |
|---|---|---|
| A5b | **Tự động chuyển điều chỉnh hoa hồng vượt công nợ thành số dư tín dụng kỳ đối soát tiếp theo** (`commissions.creditCarryover`) | ❌ **CHỦ DỰ ÁN BÁC BỎ (2C.1)** — không carryover, **không thêm trường `creditCarryover`**; A5a (ghi lịch sử + `UNRECONCILABLE` + admin xử lý thủ công) là chính sách duy nhất hiệu lực. Đề xuất 2A.3 (sec 3.3/3.5 tech-decisions) chính thức khép lại, không còn điểm mở. |

### 10.4 **Quyết định bổ sung — ĐÃ CHỐT bởi chủ dự án (2026-10-30, giai đoạn 2A.1)**
| # | Nội dung đã chốt | Vị trí trong thiết kế |
|---|---|---|
| M1 | Giữ 5 trạng thái studio (A7); thêm **`studios.needsMoreInfo: Boolean`**: admin yêu cầu bổ sung → giữ `PENDING_REVIEW` + `needsMoreInfo=true`; studio gửi bổ sung → `false`; lịch sử trong `auditLogs` | sec 2.2 |
| M2 | Bổ sung collection **`incidents`** (1 booking nhiều incident: bookingId, reporter, type, mô tả, bằng chứng, trạng thái xử lý, thời điểm tạo/giải quyết). **Có incident chưa giải quyết → không tự COMPLETED** | sec 2.12 |
| M3 | **`EXTENDED`** mở rộng khung giờ trong ngày chỉ định; **CLOSED/BLOCKED ưu tiên cao hơn EXTENDED**; studio SUSPENDED/CLOSED không nhận đặt dù có EXTENDED; ROOM không vượt trạng thái STUDIO; quy tắc hợp nhất khoảng chồng | sec 2.6 |
| M4 | **`weekday` theo ISO 8601**: 1=Thứ 2 … 7=Chủ nhật; thống nhất DB + backend | sec 2.2 (`studios.scheduling`) |
| M5 | **`bufferMinutes ∈ {0, 15, 30}`** (bội số 15, giữ lưới slot A2); giá trị khác bị từ chối | sec 2.2 |
| M6 | **`notifications`** theo dõi channel WEB/EMAIL, status PENDING/SENT/FAILED, `attemptCount`, `lastError`; **lỗi email không đổi trạng thái booking**; `auditLogs` ghi sự kiện email thất bại; **chưa có Outbox** | sec 2.13 |

Quy tắc kỹ thuật bổ trợ (rule A–D, 2A.1): ghi rõ trong sec 5b (thanh toán/hoàn tiền, slotLocks, partial filter, phân định trạng thái).

### 10.5 **Chốt chi tiết kỹ thuật cuối (giai đoạn 2A.4, 2026-10-31)**
| # | Nội dung đã chốt | Vị trí |
|---|---|---|
| RC1 | Race incident ↔ auto-complete: **loại cơ chế chỉ re-query trong transaction** (snapshot read cũ); thay bằng **`bookings.incidentRevision` + update có điều kiện + xử lý write conflict + retry (kiểm tra lại bookingStatus và toàn bộ incident chưa giải quyết)** | sec 2.7, 9 |
| RC2 | **Incident sau COMPLETED: cho phép ghi nhận khiếu nại; KHÔNG chuyển ngược bookingStatus**; xử lý qua luồng refund/commission adjustment; **thời hạn khiếu nại đã chốt 7 × 24 giờ** (2C.1) | sec 9, 2.12 |
| CN1 | **Collection naming**: 14 tên khớp chính xác (đặc biệt camelCase `studioMembers`, `availabilityExceptions`, `slotLocks`, `auditLogs`); mỗi schema/model khai báo collection name tường minh, không dựa pluralize/lowercase mặc định của Mongoose | sec 9b |
| IK1 | **`idempotencyKey`**: `required` = validation Mongoose; `unique` = MongoDB unique index (không phải validator); `immutable` = không sửa sau tạo; **không kết luận chống trùng chỉ dựa Schema — phải kiểm tra index tồn tại trước khi hoạt động thực tế** | sec 9b |
| O1 | **Đã khép lại (2C.1 + patch):** 3 điểm mở của 2A.4 đều được chủ dự án quyết định — (i) `maxAttempts` = 5, cấu hình ứng dụng (không lưu trong document); (ii) thời hạn khiếu nại sau COMPLETED = 7 × 24 giờ (enforce tầng service); (iii) job auto-complete: **5 lần retry bổ sung sau lần thực thi đầu tiên (= tối đa 6 lần thực thi trong một chuỗi)**, backoff tăng dần, cấu hình tầng job; hết retry → bỏ qua booking trong chu kỳ hiện tại, chờ chu kỳ job tiếp theo. **Không còn điểm mở chưa chốt.** | sec 9, 2.13 |

Quy ước key idempotencyKey theo 2A.3 giữ nguyên (sec 2.9/2.10), không thay đổi. A1–A9 giữ nguyên; **A5b đã bị chủ dự án BÁC BỎ (2C.1)** — không carryover, A5a là chính sách duy nhất hiệu lực.

> **Nguyên tắc:** mọi mục "nghiệp vụ đã chốt" (10.1) **không** bị ghi đè; A1–A9 (10.2) + M1–M6 (10.4) + 2C.1 (10.6) là quyết định **đã duyệt** — dùng làm cơ sở code. A5b (10.3) đã khép lại bằng quyết định bác bỏ.

### 10.6 **Chốt chi tiết Group 2 + khép điểm mở (giai đoạn 2C.1, chủ dự án 2026-11-01)**
| # | Nội dung đã chốt | Vị trí |
|---|---|---|
| S1 | **SlotLock:** 1 document = 1 slot đang giữ; **không có field `state`** (loại `HELD`/`RELEASED`); unique index đầy đủ `{roomId, slotStartUtc}`; giải phóng = **xóa document trong cùng transaction**; không lưu document RELEASED; `source` = BOOKING/MANUAL với ràng buộc `bookingId` (BOOKING ⇒ required, MANUAL ⇒ null); `slotStartUtc` căn đúng lưới 15 phút UTC (validator Mongoose) | sec 2.8, 3, 5 |
| S2 | **Review:** giữ `timestamps`; nội dung (rating/comment) bất biến sau gửi (enforce tầng service); admin đổi VISIBLE/HIDDEN được phép, không thay đổi nội dung gốc | sec 2.11 |
| S3 | **AuditLog:** append-only; **không có `updatedAt`**; `createdAt` khai báo rõ trong schema (mặc định là **hàm `Date.now`**); không cập nhật/xóa log đã ghi; `actorId` bắt buộc khi USER, được phép `null` khi SYSTEM/job (không thêm field mới, không tạo SYSTEM user giả); `metadata` không chứa secret/password/số TK ngân hàng đầy đủ (chỉ giá trị đã redacted) | sec 2.14 |
| S4 | **A5b:** bác bỏ credit carryover — không thêm `creditCarryover`; giữ A5a (UNRECONCILABLE + admin) | sec 2.10, 10.3 |
| S5 | **incidents.type/status:** enum chốt (`SERVICE`/`DAMAGE`/`PAYMENT`/`OTHER`; `OPEN`/`IN_PROGRESS`/`RESOLVED`/`DISPUTED`), tách hoàn toàn; thêm field `createdAfterCompletion` (Boolean, mặc định false) | sec 2.12 |
| S6 | **maxAttempts = 5** (tính cả lần gửi đầu); cấu hình ứng dụng, **không lưu trong document**; `attemptCount` + `nextAttemptAt` tiếp tục lưu; backoff **15/30/60/120 phút (120 phút = delay dài nhất hiện tại; 24 giờ chỉ là trần bảo vệ, không phải mức delay thứ 5)**; không Outbox trong MVP | sec 2.13 |
| S7 | **Thời hạn khiếu nại sau COMPLETED = 7 × 24 giờ** kể từ `completedAt` (UTC); enforce tầng service (không phải schema validator); giữ `createdAfterCompletion`; không đổi quy tắc `incidentRevision`; không chuyển COMPLETED → CONFIRMED | sec 9, 2.12 |
| S8 | **Job auto-complete:** khi lỗi transient/write conflict → **5 lần retry bổ sung sau lần thực thi đầu tiên (= tối đa 6 lần thực thi trong một chuỗi thử lại)**; backoff tăng dần, **cấu hình ở tầng job**; **hết retry → bỏ qua booking trong chu kỳ hiện tại, chờ chu kỳ job tiếp theo**; không thêm trường retry vào schema `bookings`; điều kiện tự hoàn tất không thay đổi (patch 2C.1) | sec 9 |

Quy tắc kỹ thuật bổ trợ (rule A–D, 2A.1): ghi rõ trong sec 5b (thanh toán/hoàn tiền, slotLocks, partial filter, phân định trạng thái).

## 11. Rủi ro quan trọng nhất (tóm tắt)

1. **Đặt trùng / giữ chỗ kép** — rủi ro cao nhất về nhất quán lịch. Đã duyệt (A2+A3): **lưới slot 15 phút + unique index `{roomId, slotStartUtc}` + multi-document transaction trên Atlas/replica set**; **không dùng standalone** (sec 7–9). buffer phải được giữ cùng slot (A2).
2. **Deadline theo đồng hồ trình duyệt** — phải **server time** cho `responseExpiresAt`/`paymentExpiresAt` (v0.8 16.4); job hết hạn (A4) phải **idempotent**, update có điều kiện; **chưa triển khai job ở giai đoạn này**.
3. **Xác minh cọc thủ công, không có cổng** (CORE-02): phụ thuộc studio nhập đối chiếu; `idempotencyKey` + unique + quyền studio là hàng rào chính; "ảnh biên lai" không phải bằng chứng duy nhất.
4. **Snapshot giá/hoa hồng phải bất biến** (yêu cầu 4, A9) — studio sửa bảng giá không đổi đơn cũ; snapshot `immutable`, điều chỉnh hoa hồng là record riêng (`ADJUSTMENT` + `adjustmentOf`), không sửa/xóa lịch sử.
5. **Hoa hồng điều chỉnh vượt công nợ** — A5a (đã duyệt): **không tự động** chuyển số dư tín dụng; ghi nhận lịch sử + `UNRECONCILABLE` → admin xử lý thủ công. A5b (tự động số dư tín dụng kỳ sau) **đã bị chủ dự án BÁC BỎ (chốt 2C.1, sec 10.3/10.6)** — không carryover, không trường `creditCarryover`; chỉ A5a là chính sách hiệu lực.
6. **Trạng thái gộp** — A9 (đã duyệt): 4 nhóm trạng thái (booking/payment/refund/commission) phải tách riêng; gộp 1 trường → mất truy vết (sec 5).
7. **Rủi ro cấu hình mới (A6/A7):** đổi `studios.scheduling` hoặc thêm `availabilityExceptions` không được tự hủy/sửa đơn đã xác nhận (18.5); chỉ studio **ACTIVE** (A7) được nhận đơn — kiểm tra `status` khi tạo đơn; `EXTENDED` (M3) không được vô hiệu `CLOSED`/`BLOCKED`.
8. **Tự hoàn thành nhầm khi có sự cố (M2, V08-11):** job tự COMPLETED (24h sau kết thúc) phải **luôn kiểm tra `incidents`** của booking (index `{bookingId, status}`) — có incident `OPEN`/`IN_PROGRESS`/`DISPUTED` → **không tự hoàn thành**. Rủi ro bỏ qua bước này = vi phạm quy tắc đã chốt.
9. **Drift trạng thái tổng hợp (rule A/D):** cập nhật `bookings.paymentStatus`/`refundStatus` không nguyên tử cùng record `payments` → lệch giữa tổng hợp và chi tiết; phải update trong cùng transaction.

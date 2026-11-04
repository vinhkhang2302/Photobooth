# Quyết định kỹ thuật — Sàn đặt lịch Photobooth (MVP)

Ngày ghi nhận: 2026-10-29. Tài liệu này ghi nhận các quyết định kỹ thuật đã chốt cho MVP.
Nghiệp vụ có hiệu lực vẫn do `docs/requirements-summary.md` (hợp nhất từ mục 19 đặc tả v0.8) quyết định;
tài liệu này **không thay đổi nghiệp vụ v0.8**, chỉ chốt phần kỹ thuật. Nếu mâu thuẫn về nghiệp vụ, đặc tả v0.8 ưu tiên.

## 1. Stack công nghệ (ĐÃ CHỐT)

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | JavaScript + **React + Vite** | Chưa dùng Next.js trong MVP. |
| Backend | JavaScript + **Node.js + Express** | REST API. |
| Database | **MongoDB + Mongoose** | MongoDB Compass để xem/quản lý dữ liệu. |
| Kiến trúc MVP | **API giữa frontend và backend** | Frontend gọi backend qua API (phân tách rõ hai ứng dụng). |

**Lý do lựa chọn:**

- React + Vite: khởi động nhanh, cấu hình đơn giản, phù hợp phát triển MVP; tách biệt với backend thay vì dùng Next.js (giảm độ phức hợp về framework kết hợp SSR/SSG không cần thiết cho MVP).
- Node.js + Express: stack JavaScript xuyên suốt (một ngôn ngữ cho frontend/backend), Express tối giản, dễ phân quyền và gắn audit log vào các thao tác nhạy cảm theo đặc tả v0.8.
- MongoDB + Mongoose: phù hợp mô hình dữ liệu động (phòng, gói, lịch, booking nhiều item), Mongoose cho schema validation tập trung (thời lượng, bước 30 phút, trạng thái) mà đặc tả yêu cầu backend phải kiểm tra.

**Hệ quả/điểm cần lưu ý khi thiết kế:**

- Hai ứng dụng riêng (web SPA + API server): cần định nghĩa contract API rõ trước khi viết code.
- Backend là nguồn sự thật duy nhất cho giá, thời hạn và trạng thái (theo v0.8): Vite SPA chỉ hiển thị.

## 2. Xác minh studio và dữ liệu (ĐÃ CHỐT)

### 2.1. Hồ sơ studio

- **Bắt buộc:** tên studio, người đại diện, email và **số điện thoại đã xác minh**, địa chỉ, **ảnh thực tế**.
- **Theo yêu cầu (admin):** bằng chứng về quyền sử dụng/vận hành địa điểm — admin có thể yêu cầu bổ sung.
- **Giấy đăng ký kinh doanh:** yêu cầu **khi phù hợp** (áp dụng theo quy định), không bắt buộc chung cho mọi studio.
- **CCCD/hộ chiếu: không bắt buộc trong MVP** nếu chưa có căn cứ về sự cần thiết.

### 2.2. Bảo mật và nhật ký

- Hồ sơ xác minh lưu ở **nơi riêng tư**, **giới hạn quyền truy cập** (chỉ vai trò có thẩm quyền).
- **Mọi thao tác trên hồ sơ (xem/sửa/duyệt/bổ sung) phải có nhật ký (audit log).**

### 2.3. Chính sách lưu trữ dữ liệu

- Chính sách lưu trữ **phải cấu hình được** (không hard-code thời hạn).
- **Chỉ lưu hồ sơ khi còn cần thiết** (cần nguyên tắc data minimization).
- **Việc xóa và thời hạn lưu giữ phải tuân thủ nghĩa vụ pháp lý áp dụng** (không tự ý xóa trước khi có cơ sở pháp lý).
- Dữ liệu thử nghiệm dùng **hồ sơ giả lập** (không dùng dữ liệu thật).

### 2.4. Điểm cần rà soát trước khi vận hành thương mại

> ⚠️ **PHẢI RÀ SOÁT PHÁP LÝ TRƯỚC KHI VẬN HÀNH THƯƠNG MẠI:**

- Rà soát các **nghĩa vụ pháp lý áp dụng** (luật bảo vệ dữ liệu cá nhân, bảo quản hồ sơ giao dịch/định danh) cho: thời hạn lưu trữ tối thiểu, quyền được xóa/chỉnh sửa dữ liệu, nghĩa vụ bảo mật CCCD/giấy tờ nếu sau này yêu cầu.
- Chốt **chính sách lưu trữ cụ thể** (thời hạn theo loại dữ liệu) trước khi vận hành; lưu vào cấu hình.
- Kiểm tra lại việc lưu hồ sơ xác minh (đặc biệt ảnh/giấy tờ) với quy định áp dụng; cân nhắc mã hóa tệp trên đầu.
- Xác nhận cơ sở pháp lý cho việc **giới hạn truy cập và ai được xem hồ sơ** (ma trận quyền theo vai trò).

## 3. Quy tắc tiền và hoa hồng (ĐÃ CHỐT)

### 3.1. Đơn vị tiền

- **Lưu tiền giao dịch bằng số nguyên VND** (đơn vị: đồng; không dùng float, không chia ra đơn vị nhỏ hơn đồng).
- Tránh làm tròn sai do số thực (1/3 VND, v.v.).

### 3.2. Hoa hồng

- **Đơn hoàn thành (COMPLETED) mới phát sinh hoa hồng** (đơn hủy/không hoàn thành không phát sinh hoa hồng hoàn thành).
- Tỷ lệ hoa hồng thông thường: **5%** (theo đặc tả v0.8).
- **Cơ sở hoa hồng** = `max(0, giá trị dịch vụ sau giảm giá − khoản hoàn lại hợp lệ)`.
- **Không tính tiền cọc lần thứ hai** trong cơ sở tính (cọc là một phần của tổng đơn, không phải doanh thu cộng thêm).
- **Làm tròn hoa hồng** đến VND gần nhất bằng `Math.round` trên **giá trị không âm** (cơ sở đã clamp bằng `max(0, …)`).

### 3.3. Hoàn tiền và điều chỉnh

- **Không lưu tiền hoàn dưới dạng số âm.** Hoàn tiền được lưu thành **giao dịch hoàn tiền riêng** (record riêng với `purpose: REFUND`), không âm vào giao dịch gốc.
- **Điều chỉnh hoa hồng có lịch sử riêng** (bản ghi điều chỉnh `adjustmentOf` trỏ bản ghi gốc) — **không sửa ngược** giao dịch hoặc snapshot đã ghi nhận.
- **Khoản điều chỉnh vượt công nợ hiện tại** (A5, đã duyệt 2026-10-29): **KHÔNG tự động** chuyển thành số dư tín dụng kỳ sau. Ghi nhận **lịch sử điều chỉnh** (bản ghi `ADJUSTMENT` riêng, có `adjustmentOf`), trường hợp chưa thể đối soát được → đánh dấu `UNRECONCILABLE` và **chuyển admin xử lý thủ công**.
- ❌ **ĐÃ BỊ CHỦ DỰ ÁN BÁC BỎ (chốt 2C.1, 2026-11-01):** đề xuất (trước đây ghi nhận ở 2A.3) "tự động theo dõi khoản vượt thành **số dư tín dụng** kỳ đối soát tiếp theo" — **không carryover, không thêm trường `creditCarryover`**. A5a (ghi nhận lịch sử điều chỉnh + `UNRECONCILABLE` + admin xử lý thủ công) là chính sách duy nhất hiệu lực. Đề xuất khép lại, không còn điểm mở.

### 3.4. Hệ quả cho mô hình dữ liệu (định hướng, bám theo collection v0.8)

- `commissions`: lưu `rateSnapshot`, `basisAmount`, `commissionAmount` (số nguyên VND, không âm), `period`, `dueAt`, `settledAt`, `payoutReference`, `adjustmentOf` (liên kết bản ghi gốc khi điều chỉnh).
- `payments`: `purpose ∈ {DEPOSIT, BALANCE, REFUND}`, tiền là số nguyên VND không âm cho mỗi record; hoàn tiền là record riêng.
- `priceSnapshot` / `policySnapshot` trên booking: bất biến sau khi tạo.
- Khi có điều chỉnh hoa hồng làm tăng nghĩa vụ vượt công nợ kỳ: (A5, đã duyệt) ghi nhận bản ghi điều chỉnh và chuyển `UNRECONCILABLE` cho admin xử lý thủ công. **Không có trường `creditCarryover`** — đề xuất số dư tín dụng tự động đã bị chủ dự án **bác bỏ (chốt 2C.1)** (xem 3.3 & mục 5); không thiết kế theo đó.

## 4. Thanh điểm kiểm tra nhất quán

| Điểm | Nguồn | Trạng thái |
|---|---|---|
| Tỷ lệ hoa hồng 5% | v0.8 (V07-01) | Giữ nguyên; kỹ thuật chỉ chốt cách lưu/làm tròn |
| Không cộng cọc lần hai | v0.8 (19.4) | Giữ nguyên |
| Cọc 20%, hạn 30 phút, mốc 24 giờ | v0.8 | Giữ nguyên (không đụng trong tài liệu này) |
| Số nguyên VND | **ĐÃ DUYỆT (A1, 2026-10-29)** | `Number.isSafeInteger()`, từ chối giá trị không hợp lệ |
| Hoàn tiền không âm, record riêng | **Mới (kỹ thuật)** | Không mâu thuẫn v0.8 (v0.8 không quy định dấu) |
| Không tự động số dư tín dụng (A5a) | **ĐÃ DUYỆT 2026-10-29** | Điều chỉnh vượt công nợ → ghi lịch sử + `UNRECONCILABLE` + admin xử lý thủ công |
| Số dư tín dụng tự động cho điều chỉnh vượt công nợ (A5b) | **ĐÃ BỊ CHỦ DỰ ÁN BÁC BỎ (chốt 2C.1, 2026-11-01)** | Không carryover, không trường `creditCarryover`; A5a (lịch sử + UNRECONCILABLE + admin) là chính sách duy nhất hiệu lực |

## 5. Nhật ký duyệt quyết định kỹ thuật

**2026-10-29 — Chủ dự án DUYỆT A1–A9** (chi tiết thiết kế tại `docs/database-design.md` sec 10.2):

| Mã | Nội dung đã duyệt |
|---|---|
| A1 | Tiền lưu **số nguyên VND trong `Number`**; xác thực `Number.isSafeInteger()`, từ chối giá trị tiền không hợp lệ (âm, không nguyên, vượt safe-integer). |
| A2 | Khóa thời gian bằng **lưới slot 15 phút + unique index theo `(roomId, slotStartUtc)`**. Thời lượng đặt bước 30 phút; bước giờ bắt đầu 15/30 phút; **mặc định buffer 15 phút sau buổi đặt; giữ toàn bộ slot bị chiếm, kể cả buffer**. |
| A3 | Dùng **MongoDB Atlas hoặc replica set** có hỗ trợ multi-document transaction; transaction bảo đảm **đơn nhiều phòng tạo toàn bộ hoặc không tạo gì**. Không dùng standalone cho yêu cầu này. |
| A4 | Xử lý đơn hết hạn bằng **job định kỳ** + update có điều kiện + giờ server + thao tác idempotent. Chưa cài/triển khai job trong giai đoạn tài liệu này. |
| A5 | (A5a) **Không** tự động chuyển điều chỉnh hoa hồng vượt công nợ thành số dư tín dụng kỳ sau; ghi nhận lịch sử điều chỉnh và chuyển trường hợp chưa đối soát được sang **admin xử lý thủ công** — **chốt duy nhất hiệu lực (xác nhận 2C.1: A5b bị bác bỏ, không carryover, không trường `creditCarryover`)**. |
| A6 | Lịch mở cửa hằng tuần nằm trong **cấu hình studio**; ngày nghỉ/ngày đặc biệt/khoảng khóa lịch nằm trong **collection ngoại lệ riêng**, hỗ trợ ngoại lệ **toàn studio hoặc riêng 1 phòng**. |
| A7 | 5 trạng thái studio: **PENDING_REVIEW, ACTIVE, REJECTED, SUSPENDED, CLOSED**; chỉ **ACTIVE** được công khai và nhận đặt lịch. |
| A8 | Lưu ngày giờ dạng **UTC `Date`**; dùng múi giờ cấu hình trên studio để hiển thị và tính giờ hoạt động; **mặc định `Asia/Ho_Chi_Minh`**. |
| A9 | Tách trạng thái **booking / payment / refund / commission**; giao dịch & điều chỉnh hoa hồng là record riêng; **không ghi đè lịch sử giao dịch hoặc snapshot đã ghi nhận**. |

**2A.1 (2026-10-30) — Chủ dự án CHỐT M1–M6** (điểm còn mở từ phân tích 2A; chi tiết thiết kế tại `docs/database-design.md` sec 10.4):

| Mã | Nội dung đã chốt |
|---|---|
| M1 | Bổ sung hồ sơ studio: **giữ nguyên 5 trạng thái theo A7**; thêm `studios.needsMoreInfo: Boolean`. Admin yêu cầu bổ sung → giữ `status = PENDING_REVIEW`, đặt `needsMoreInfo = true`; studio gửi bổ sung → đặt `false`. Lịch sử yêu cầu/phản hồi lưu trong `auditLogs`. |
| M2 | Sự cố booking: **bổ sung collection `incidents`** (1 booking có thể có nhiều incident). Lưu `bookingId`, người báo cáo, loại sự cố, mô tả, bằng chứng, trạng thái xử lý, thời điểm tạo và giải quyết. **Không tự động chuyển booking sang COMPLETED khi có sự cố chưa giải quyết** (đúng V08-11). *(Cụm "cấu trúc/trạng thái cụ thể chỉ là đề xuất — phải đối chiếu v0.8 trước khi chốt" **đã được thay thế bởi quyết định D2 tại 2C.1, 2026-11-01**: enum `type` = SERVICE/DAMAGE/PAYMENT/OTHER (immutable) và `status` = OPEN/IN_PROGRESS/RESOLVED/DISPUTED là **quyết định đã chốt** (nghĩa kỹ thuật, không phải danh mục v0.8) — không còn là đề xuất.)* |
| M3 | `EXTENDED` (ngoại lệ lịch): cho phép **mở rộng khung giờ hoạt động trong ngày được chỉ định**. **CLOSED và BLOCKED ưu tiên cao hơn EXTENDED**. Studio bị đóng (SUSPENDED/CLOSED) không được đặt phòng kể cả khi phòng có EXTENDED. Ngoại lệ cấp ROOM không vượt được trạng thái đóng cấp STUDIO. Quy tắc hợp nhất các khoảng ngoại lệ chồng lấn đã định nghĩa trong thiết kế. |
| M4 | **Weekday theo ISO 8601**: 1 = Monday, 2 = Tuesday, …, 7 = Sunday. Thống nhất giữa database và backend. |
| M5 | **`bufferMinutes` chỉ nhận 0, 15 hoặc 30** (bội số 15 — ràng buộc bởi lưới slot A2). Giữ nguyên cơ chế khóa slot 15 phút. |
| M6 | Email: collection **`notifications`** lưu thông tin gửi thông báo/email, theo dõi **PENDING/SENT/FAILED + số lần thử + lỗi gửi gần nhất**. *(Patch 2C.1: delivery status chỉ áp dụng cho **channel = EMAIL** — `status` bắt buộc khi EMAIL (enum PENDING/SENT/FAILED), **WEB không có delivery status nên `status = null`**, kèm `attemptCount = 0`, `nextAttemptAt = null`; conditional validation khai báo ở tầng Mongoose, không thêm field mới.)* `auditLogs` ghi nhận sự kiện gửi email thất bại quan trọng. **Chưa triển khai Outbox riêng trong MVP**. **Lỗi email không được làm thay đổi trạng thái booking** (CORE-05/v0.8). |

Quy tắc kỹ thuật bổ trợ (gắn với M1–M6, chi tiết tại `docs/database-design.md` sec 5b & 10.4):
- **(A)** Mỗi giao dịch `DEPOSIT`/`BALANCE`/`REFUND` là 1 record riêng; trạng thái từng giao dịch tách khỏi `paymentStatus`/`refundStatus` tổng hợp trên booking; cập nhật tổng hợp phải nhất quán (cùng transaction) với record chi tiết. Không có payment gateway/webhook (MVP chuyển khoản trực tiếp + studio xác nhận — CORE-02).
- **(B)** SlotLocks: unique index `(roomId, slotStartUtc)`; toàn bộ slot của booking nhiều phòng tạo trong cùng transaction; 1 slot trùng → rollback toàn bộ; REJECTED/EXPIRED/CANCELLED → giải phóng slot tương ứng; **không dùng TTL để giải phóng slot đang hiệu lực**; số ô tính theo `[startAt, endAt + buffer)`.
- **(C)** Index khai báo trong Mongoose (kèm partial filter cho trường tùy chọn/null); không tự chạy lệnh index trên Atlas ở bước này. **(Patch 2C.1-partial):** partial index **không unique** `slotLocks { bookingId: 1 }` dùng `partialFilterExpression: { bookingId: { $type: "objectId" } }` (index chỉ document có `bookingId` là ObjectId — tức `source: BOOKING`; document `MANUAL` có `bookingId: null` bị loại). *Expression cũ trong thiết kế `{ bookingId: { $exists: true, $ne: null } }` dùng **`$ne` — toán tử không được hỗ trợ bởi `partialFilterExpression`** (theo tài liệu MongoDB, chỉ chấp nhận `$eq`/equality, `$exists`, `$gt`, `$gte`, `$in`, `$lt`, `$lte`, `$type`, `$and`, `$or`) → thay bằng `$type: "objectId"`. Phân biệt 3 lớp: (1) partial index này **chỉ tối ưu truy vấn**, không phải ràng buộc dữ liệu; (2) quy tắc `source=BOOKING ⇒ bookingId required (ObjectId)` / `source=MANUAL ⇒ bookingId=null` là **conditional validation ở tầng Mongoose (pre-validate) / service**; (3) unique index `(roomId, slotStartUtc)` (A2) là **ràng buộc chống đặt trùng riêng** (duplicate-key → rollback).*
- **(D)** Phân định trạng thái **chính thức** (collection chi tiết: payments/commissions/incidents/slotLocks) vs. **tổng hợp** (booking); giữ lịch sử mọi giao dịch/hoàn/điều chỉnh — không làm mất dữ liệu khi đổi trạng thái.

**Điểm mở ban đầu của 2A.1 — đã khép lại (2C.1, 2026-11-01):** A5b (số dư tín dụng hoa hồng cho điều chỉnh vượt công nợ) **đã bị chủ dự án BÁC BỎ** — không carryover, không trường `creditCarryover` (mục 3.3). M1–M6 giữ nguyên hiệu lực.

**2A.3 (2026-10-30) — Xử lý điểm I1–I5 trước khi code (chỉ cập nhật tài liệu)**
Chi tiết trong `docs/database-design.md`; đây là ghi nhận quyết định/kết luận, không phải thay đổi nghiệp vụ.

| Mã | Kết luận |
|---|---|
| I1 | **Danh sách collection = 14** (users, studios, studioMembers, rooms, services, availabilityExceptions, bookings, slotLocks, payments, commissions, reviews, incidents, notifications, auditLogs). `requirements-summary.md` mục 7 đã đồng bộ (bỏ `availabilityRules`, thêm `slotLocks`/`incidents`). Không thay đổi v0.8. |
| I2 | **Quy ước idempotencyKey:** commission `commission:{bookingId}:ORIGINAL` / `commission:{bookingId}:ADJUSTMENT:{adjustmentId}`; payment `pay:{bookingId}:DEPOSIT|BALANCE:{paymentAttemptId}` / `pay:{bookingId}:REFUND:{refundId}`. Retry **dùng lại key cũ**, không seq. Mongoose: `required + unique`; **lưu ý MongoDB unique index 1 trường coi null/thiếu như null** → phải luôn có giá trị (validation required chặn trước). |
| I3 | **Retry email:** thêm `nextAttemptAt` (nullable) + index `{ channel, status, nextAttemptAt }`; backoff 15/30/60/120 phút, trần 24h; `attemptCount` tăng sau mỗi lần thử thật; SENT/FAILED hết lượt → `nextAttemptAt = null`. Lỗi email **không đổi trạng thái booking**. **`maxAttempts` = cấu hình vận hành** (không hardcode trong model, không lưu trong document) — **đã chốt = 5 lần gửi (tính cả lần đầu) (2C.1)**; `attemptCount` và `nextAttemptAt` tiếp tục lưu trong document. |
| I4 | **Job tự hoàn thành (V08-11):** điều kiện `CONFIRMED AND endAt + 24h ≤ now (server) AND không có incident OPEN/IN_PROGRESS/DISPUTED` (kiểm tra toàn bộ incident; RESOLVED = đã giải quyết). Chuyển COMPLETED + tạo commission ORIGINAL trong 1 transaction (idempotent). **Không thêm điều kiện `paymentStatus`** (v0.8 không yêu cầu). *(Lưu ý 2C.1-patch: câu gốc "race incident ↔ job: **re-query incident trong transaction + update có điều kiện** `{ bookingStatus: CONFIRMED }`" là **cách cũ, đã bị LOẠI BỎ tại RC1** (2A.4) vì transaction MongoDB đọc snapshot theo thời điểm bắt đầu → có thể bỏ sót incident commit sau đó. **Cơ chế hiệu lực (RC1):** `bookings.incidentRevision` (tăng cùng transaction khi insert incident) + job auto-complete **update có điều kiện** `{ bookingStatus: CONFIRMED, incidentRevision: v }` + **shared booking write** (2 đường ghi chung 1 document → MongoDB phát hiện write conflict) + **xử lý write conflict: rollback → retry** (mỗi retry: fresh read `bookingStatus`, **kiểm tra lại toàn bộ incident chưa giải quyết** bên ngoài transaction) + **retry có trần (2C.1: 5 lần bổ sung sau lần đầu = tối đa 6 lần thực thi/chuỗi, cấu hình tầng job, không thêm trường retry vào schema `bookings`)**. Chi tiết đầy đủ tại `docs/database-design.md` sec 9 (I4/RC1).)* |
| I5 | **Incident enum (đề xuất kỹ thuật, không phải v0.8; đã được chủ dự án CHỐT tại 2C.1):** `type` = SERVICE/DAMAGE/PAYMENT/OTHER (immutable); `status` = OPEN/IN_PROGRESS/RESOLVED/DISPUTED (đổi theo thời gian). **Tách hoàn toàn `type`/`status`, không đưa DISPUTED vào `type`.** Danh mục enum là quyết định cuối (nghĩa kỹ thuật, không phải v0.8) — không thay đổi sau khi tạo. |

**Điểm mở của 2A.3 — đã được chủ dự án QUYẾT ĐỊNH tại 2C.1 (2026-11-01):**
- `maxAttempts` (giới hạn số lần thử email) → **chốt = 5 (tính cả lần gửi đầu), cấu hình ứng dụng, không lưu trong document** (I3).
- **Incident khi booking đã COMPLETED** → **BÁC BỎ phương án chặn tạo incident khi booking đã COMPLETED**; thay vào đó tiếp nhận khiếu nại trong **thời hạn 7 × 24 giờ kể từ `completedAt`** (UTC, enforce tầng service) và giữ `createdAfterCompletion` (I4/RC2); **không chuyển `bookingStatus` từ `COMPLETED` ngược về `CONFIRMED`** (RC2).
- Danh mục `incidents.type` (SERVICE/DAMAGE/PAYMENT/OTHER) → **chốt như danh mục cuối cùng** (I5).

**Giữ nguyên:** A1–A9, A5b (đã BÁC BỎ tại 2C.1), 14 collection, không gateway/webhook, không collection `refunds` riêng, cơ chế slot 15 phút + all-or-nothing transaction.

**2A.4 (2026-10-31) — Chốt chi tiết kỹ thuật cuối trước khi code**
Chi tiết trong `docs/database-design.md` sec 9b & 10.5; đây là ghi nhận kết luận kỹ thuật, không thay đổi nghiệp vụ v0.8.

| Mã | Kết luận |
|---|---|
| RC1 | **Race incident ↔ auto-complete:** loại cơ chế "chỉ re-query trong transaction" (transaction đọc snapshot theo thời điểm bắt đầu → có thể bỏ sót incident commit sau đó). Thay bằng: **`bookings.incidentRevision`** (Number, tăng khi insert incident trong cùng transaction) + job auto-complete **update booking có điều kiện `{ bookingStatus: CONFIRMED, incidentRevision: v }`**; khi **write conflict** → rollback + **retry an toàn**: đọc lại `bookingStatus` + **kiểm tra lại toàn bộ incident chưa giải quyết (OPEN/IN_PROGRESS/DISPUTED)** trước khi hoàn thành. Không bao để COMPLETED khi incident hợp lệ đã commit. |
| RC2 | **Incident sau COMPLETED:** cho phép ghi nhận khiếu nại; **KHÔNG chuyển ngược** `bookingStatus` (COMPLETED → CONFIRMED); xử lý qua luồng khiếu nại/refund/commission adjustment có sẵn. **Thời hạn khiếu nại đã CHỐT tại 2C.1: 7 × 24 giờ kể từ `completedAt` (mốc UTC), enforce ở tầng service (không phải Mongoose validator), giữ `createdAfterCompletion` để phân biệt incident phát sinh sau khi hoàn tất; không thay đổi quy tắc `incidentRevision` (RC1).** |
| CN1 | **Collection naming (Mongoose):** tên collection **khớp chính xác 14 tên**, đặc biệt camelCase `studioMembers`, `availabilityExceptions`, `slotLocks`, `auditLogs`; mỗi schema khai báo collection name **tường minh** (option 3 của `mongoose.model`), **không dựa pluralize/lowercase mặc định**. Kiểm tra lại tên collection thực tế trên Atlas trước khi chạy thật. |
| IK1 | **`idempotencyKey`:** `required` = validation Mongoose; `unique` = **MongoDB unique index** (không phải validator Mongoose, chỉ chặn trùng khi key có giá trị); `immutable` = không sửa sau tạo. **Không được kết luận "đã chống trùng" chỉ dựa Schema** — phải **kiểm tra unique index thực sự tồn tại** trên Atlas trước khi đưa vào hoạt động thực tế. |

**Giữ nguyên (không đổi):** A1–A9; quy ước key idempotencyKey theo 2A.3; 14 collection; không payment gateway/webhook; không collection `refunds` riêng; slot 15 phút + all-or-nothing.

**Điểm mở của 2A.4 — đã được chủ dự án QUYẾT ĐỊNH tại 2C.1 (2026-11-01):** (i) **A5b** (số dư tín dụng hoa hồng) → **BÁC BỎ**, giữ A5a; (ii) `maxAttempts` → **= 5, cấu hình ứng dụng** (không lưu trong document); (iii) thời hạn khiếu nại sau COMPLETED → **7 × 24 giờ kể từ `completedAt`** (UTC, enforce tầng service); (iv) maxRetries/backoff cho job auto-complete → **5 lần retry BỔ SUNG sau lần thực thi đầu tiên (= tối đa 6 lần thực thi trong một chuỗi), backoff tăng dần, cấu hình ở tầng job** (không thêm trường retry vào schema; hết retry → bỏ qua booking trong chu kỳ hiện tại). **Không còn điểm mở chưa chốt cho Nhóm 2 (8 models)** — sẵn sàng làm cơ sở triển khai.

**2B.1a (2026-11-01) — Bổ sung validation cho 6 Core Models (từ audit độc lập)**
Audit nhóm 1 phát hiện 5 gap (G1–G5) + `Room.capacity`; đã thống nhất và chốt tại `docs/database-design.md` (sec 2.2, 2.4):

| Mã | Quyết định |
|---|---|
| G1 | `scheduling.minDurationMinutes <= maxDurationMinutes` (cross-field, giữ rule "bội 30"). |
| G2 | Design quy **mỗi ngày DUY NHẤT 1 khung giờ** (khung khả dụng = union với ngoại lệ EXTENDED theo M3) → `scheduling.weekdays` không chứa 2 entry cùng `weekday`. Không cho nhiều khung giờ mỗi ngày. |
| G3 | `weekday` phải **nguyên, ISO 1–7** (M4): 1.5, 0, 8 bị từ chối. |
| G4 | `openMinutes`/`closeMinutes` **nguyên, trong [0, 1440]** (cho phép close = 1440 tức 24:00), `open < close`; giá trị âm/thập phân/>1440 bị từ chối. |
| G5 | `banking` **có điều kiện theo status**: Studio **chỉ được chuyển sang `ACTIVE` khi có đầy đủ cả 4 trường** `bankName`, `accountHolder`, `accountNumber`, `qrImageURI` (CORE-01, đúng field sec 2.2, không thêm field mới; mỗi trường phải khác rỗng sau trim) — chuyển sang ACTIVE khi thiếu bất kỳ trường nào → validation từ chối (pre-validate hook trong `studio.model.js`). Các trạng thái `PENDING_REVIEW`, `REJECTED`, `SUSPENDED`, `CLOSED` **không bắt buộc** đủ 4 trường (REJECTED/SUSPENDED/CLOSED giữ dữ liệu đã lưu nếu có). Số tài khoản là dữ liệu nhạy cảm: không log/in trong test. |
| CAP | `rooms.capacity` phải là **số nguyên dương ≥ 1** (0, âm, 2.5, NaN, Infinity bị từ chối). |

Giới hạn 2B.1a: chỉ sửa validation trong `server/models/` (studio.model.js, room.model.js) + mở rộng `server/tests/models/check-models.mjs` (không thêm file test mới). Không thay đổi index, collection naming, hay các model khác. Nhóm 2 (8 models còn lại) chưa triển khai.

**2C.1 (2026-11-01) — Chủ dự án CHỐT các quyết định còn mở cho Nhóm 2 (8 models)**
Chốt tại `docs/database-design.md` (sec 2.8, 2.11, 2.12, 2.13, 2.14, 3, 5, 9, 10.3/10.6). Đây là quyết định cuối, dùng làm cơ sở triển khai Nhóm 2; không còn điểm mở.

| Mã | Quyết định |
|---|---|
| D1 | **A5b (credit carryover hoa hồng):** CHỦ DỰ ÁN **BÁC BỎ** — không carryover, **không thêm trường `creditCarryover`** vào `commissions`. A5a (ghi lịch sử + `UNRECONCILABLE` + admin xử lý thủ công) là chính sách duy nhất hiệu lực. |
| D2 | **`incidents.type`:** enum chốt `SERVICE`, `DAMAGE`, `PAYMENT`, `OTHER` (immutable). **`incidents.status`:** `OPEN`, `IN_PROGRESS`, `RESOLVED`, `DISPUTED` (đổi theo thời gian). Tách hoàn toàn `type` (tại sao) khỏi `status` (xử lý thế nào). |
| D3 | **`notifications.maxAttempts`:** tối đa **5 lần thử gửi (tính cả lần đầu)**. Là **cấu hình ứng dụng (job email)**, **không hardcode trong model, không lưu thành field trong document `notifications`**. `attemptCount` + `nextAttemptAt` tiếp tục lưu trong document. |
| D4 | **Notification retry:** backoff **15/30/60/120 phút** — trong đó **120 phút là delay DÀI NHẤT của lịch hiện tại** (4 mức chờ: 15/30/60/120). **24 giờ chỉ là giới hạn trần bảo vệ (protective cap) cho công thức `min(backoffTier, 24h)`**, **KHÔNG phải mức delay thứ 5** (với 5 lần gửi hiện tại, delay thực tế luôn ≤ 120 phút; cap phòng cho cấu hình backoff mở rộng về sau). Tối đa 5 lần gửi (tính cả lần đầu); **lỗi email không thay đổi `bookingStatus`**; **không triển khai Outbox trong MVP**. **Không thêm `maxAttempts` vào document `notifications`.** (patch 2C.1) |
| D5 | **Thời hạn khiếu nại (complaint period) sau COMPLETED:** tiếp nhận incident mới trong **7 × 24 giờ kể từ `completedAt`** (mốc **UTC**). **Enforce ở tầng service** (không dùng Mongoose schema validator để quyết định thời gian). Giữ `createdAfterCompletion` để phân biệt incident phát sinh sau hoàn tất. **Không thay đổi quy tắc `incidentRevision` (RC1)** và **không chuyển booking từ COMPLETED ngược về CONFIRMED**. |
| D6 | **Job auto-complete:** khi gặp lỗi transient/write conflict → **5 lần retry BỔ SUNG sau lần thực thi đầu tiên (= tối đa 6 lần thực thi trong một chuỗi thử lại)**; **backoff tăng dần, cấu hình ở tầng job**; **hết retry → bỏ qua booking trong chu kỳ hiện tại, chờ chu kỳ job tiếp theo** (không block các booking khác); **không thêm trường retry vào schema `bookings`**. Điều kiện tự hoàn tất (I4: `CONFIRMED` + 24h + không incident OPEN/IN_PROGRESS/DISPUTED) **không thay đổi**. (patch 2C.1) |
| D7 | **SlotLock:** 1 document = 1 slot đang giữ. Unique index đầy đủ `{roomId:1, slotStartUtc:1}`. Giải phóng = **xóa document trong cùng transaction**. **Không lưu document RELEASED** trong collection hoạt động. **Không dùng field `state`** trong schema. `source` = `BOOKING`/`MANUAL`; `source=BOOKING` ⇒ `bookingId` bắt buộc; `source=MANUAL` ⇒ `bookingId=null`. `slotStartUtc` **căn đúng lưới 15 phút UTC**. |
| D8 | **Review:** **giữ `timestamps`**. Nội dung review (rating/comment) **không sửa sau khi gửi**. Admin vẫn được đổi `VISIBLE`/`HIDDEN` theo quyền; việc ẩn **không thay đổi nội dung gốc**. |
| D9 | **AuditLog:** **append-only**, **không có `updatedAt`**; dùng `timestamps` với **`createdAt` khai báo rõ trong schema (mặc định là **hàm `Date.now`** — `default: Date.now`, không phải `new Date()`); **không cập nhật/xóa log đã ghi**. **(patch 2C.1) `actorId`:** thao tác do USER → bắt buộc (ref `users`); thao tác do SYSTEM/job → được phép `null`; **không thêm `actorType` hay field mới, không tạo "SYSTEM user" giả**. `metadata`: **không chứa password, passwordHash, token, secret, hay số TK ngân hàng đầy đủ** (chỉ giá trị đã redacted/masked khi log thay đổi banking). |

**Nguyên tắc phân tầng (D1–D9):** quy tắc **schema** (Mongoose field/enum/validator) — chỉ khai báo cấu trúc; quy tắc **service** (thời hạn khiếu nại D5, bất biến nội dung review D8, chặn sửa sau gửi) — enforce ở logic ứng dụng, không hardcode trong schema; quy tắc **job** (maxAttempts D3, backoff D4, retry auto-complete D6) — tham số vận hành cấu hình, không phải field. Chỉ tạo field mới đúng như đã liệt kê trong D1–D9; **không tạo field ngoài các quyết định này**.

**2C.2 (Giai đoạn 2B.2 — model Booking) — các quyết định thiết kế `bookings` + luồng đặt/chốt đơn**
Nguồn: các điểm mở của phân tích model Booking (O1, O2, O3a/O3b, U4, U6, U7, U7b, D10-K, O5a–O5e); chi tiết thiết kế tại `docs/database-design.md` (sec 2.7, 4, 5b, 9, 10.7); quy tắc nghiệp vụ tại `docs/requirements-summary.md` (sec 2, 3, 4).

**Quy ước nhãn (áp dụng cho bảng này):**
- **[TÀI LIỆU]** — có nguyên văn trong đặc tả v0.8 (mục 19) hoặc trong tài liệu dự án; hiệu lực theo tài liệu.
- **[CHỐT]** — chủ dự án đã quyết định; dùng làm cơ sở code.
- **[SUY LUẬN]** — đề xuất kỹ thuật của phân tích, **chưa được phê duyệt**; giữ để tham chiếu, **không coi là quyết định**.
- **[MỞ]** — cần chủ dự án quyết định; **không tự chốt**.

> **Lịch sử:** bảng này được hiệu chỉnh theo FINAL SOURCE ALIGNMENT mới nhất của chủ dự án. Mã quyết định cũ **được giữ nguyên** (không xóa, không đánh số lại); nội dung bị thay thế được đánh dấu tường minh tại chính dòng đó (xem D18 → D24).

| Mã | Điểm mở | Quyết định / trạng thái |
|---|---|---|
| D10 | O1 – `addOns[]` | **[CHỐT]** Add-on gắn **theo từng dòng phòng**; **[CHỐT]** add-on phải lưu **Snapshot** tại thời điểm tạo Booking (không lấy tên/giá hiện tại từ model Service để ghi đè lịch sử Booking). **[MỞ]** *cấu trúc sub-schema cụ thể* của từng add-on — **chưa quyết định**. **[SUY LUẬN — chưa duyệt]** ví dụ cấu trúc: `{ serviceId, nameSnapshot, quantity, unitPriceSnapshot, lineAmountSnapshot }` (tiền VND nguyên, A1). |
| D11 | O2 – `quantity` / `durationMinutes` | **[CHỐT]** phải **Snapshot** cả `quantity` và `durationMinutes`; **[CHỐT]** `quantity` và `durationMinutes` là **hai khái niệm riêng biệt**. **[MỞ]** **ý nghĩa chính xác của `quantity`** (chưa quyết định `quantity` là số lượng dịch vụ hay đại diện gì khác) — **không tự suy luận**. **[MỞ]** `quantity` cho PACKAGE có mặc định bằng 1 hay không — **không tự quy định**. **[MỞ]** required/optional của hai trường. **[SUY LUẬN — chưa duyệt]** `durationMinutes` lưu trong từng item và bằng `endAt − startAt`; các item cùng Booking dùng cùng khung giờ (CORE-04). Không tự tạo quy tắc tính giá mới. |
| D12 | O3a – `cancelPolicy` | **[TÀI LIỆU]** CORE-03 là **chính sách hiệu lực**, giữ nguyên đủ các trường hợp: khách hủy ≥ 24 giờ → hoàn 100% cọc; khách hủy trong 24 giờ → không hoàn; studio hủy sau khi đã thu cọc → hoàn đủ trong 3 ngày làm việc; đơn chưa thanh toán → không phát sinh hoàn. **[TÀI LIỆU]** phần trách nhiệm **nền tảng theo dõi, admin xử lý quá hạn/thất bại/tranh chấp** — **không được bỏ sót** khỏi mô tả CORE-03. **[MỞ]** biểu diễn lưu trữ: **Object có cấu trúc hay chuỗi** — **chưa quyết định, chưa có schema chính thức**. **[SUY LUẬN — chưa duyệt]** ví dụ object: `customerCancellation.{before24Hours, within24Hours}`, `studioCancellationAfterDeposit.{refundPercent, refundDeadlineBusinessDays}`, `unpaidBooking`. |
| D13 | O3b – Nguồn chính sách hủy | **[MỞ]** chính sách hủy do **nền tảng cố định** quản lý hay **Studio được cấu hình** — **chưa có căn cứ để chốt; không tuyên bố nền tảng quản lý cố định là đã được phê duyệt**. **[CHỐT — theo quy tắc snapshot đã chốt]** giá trị chính sách tại thời điểm tạo Booking phải lưu trong `policySnapshot` (immutable, sec 4) để lịch sử giao dịch không bị thay đổi khi quy định hệ thống cập nhật. |
| D14 | U4 – `bookingCode` | **[TÀI LIỆU]** đặc tả **không yêu cầu** `bookingCode` tuần tự. **[CHỐT]** giữ nguyên **unique index** trên `bookingCode`; **[CHỐT]** **không thêm collection counters**; **[CHỐT]** **không vượt 14 collections** (I1); **[CHỐT]** **không thêm collection mới chỉ để cấp số thứ tự Booking**. **[SUY LUẬN / MỞ]** **thuật toán sinh mã cụ thể** (mã ngẫu nhiên + retry có giới hạn, hay cách khác) — **chưa được phê duyệt, chưa chốt thuật toán**. |
| D15 | U6 – `remainingAmount` | `remainingAmount` là **giá trị cố định tại thời điểm tạo Booking** (= tổng đơn − cọc; ví dụ tổng 1.000.000, cọc 20% = 200.000 → `remainingAmount = 800.000`). **Sau khi tạo, không cập nhật theo các khoản thanh toán phát sinh.** Nguồn xác định tiền thực tế đã thanh toán = các **Payment records hợp lệ**; số tiền cần thu hiện tại tính từ các giao dịch được xác nhận và quy tắc thanh toán liên quan. Refund là **Payment record riêng, không dùng giá trị âm** để sửa Payment ban đầu. |
| D16 | U7 – timestamps | Booking Model dùng **`timestamps: true`** (Mongoose tự quản lý `createdAt`, `updatedAt`), **giữ nhất quán với quy ước các Model Group 1**. **AuditLog vẫn là trường hợp ngoại lệ đã phê duyệt (D9):** append-only, không có `updatedAt`, không sửa lịch sử. |
| D17 | U7b – Trạng thái khởi tạo | **[MỞ]** quyết định "Booking Service phải truyền rõ ba trạng thái khởi tạo" — **chưa được phê duyệt**. **[SUY LUẬN / chỉ là giá trị minh họa]** ba giá trị `PENDING_STUDIO` / `DEPOSIT_PENDING` / `NONE` xuất hiện trong ví dụ JSON và **không được hiểu là default đã được đặc tả**; Model chỉ kiểm tra enum/tính hợp lệ dữ liệu. |
| D18 | D10-K – `depositRate` | ⚠️ **ĐÃ BỊ THAY THẾ bởi D24** (FINAL SOURCE ALIGNMENT mới nhất) — nội dung gốc của D18 ("xóa field `depositRate` cấp cao nhất, chỉ lưu `policySnapshot.depositRate`") **không còn hiệu lực**. Giữ mã để bảo toàn lịch sử. **[MỞ / SUY LUẬN]** pre-validate hai giá trị bằng nhau (S7-pre) — **chưa được phê duyệt**. |
| D19 | O5a – Hủy khi PENDING_STUDIO | **[MỞ]** khách có được tự hủy ở `PENDING_STUDIO` hay không — **chưa quyết định, không tự chốt**. **[TÀI LIỆU / D7]** nếu chuyển `CANCELLED`: **xóa SlotLock trong cùng transaction**; giữ lịch sử Booking (không xóa Booking); không tạo Refund khi chưa có khoản tiền thực tế cần hoàn. |
| D20 | O5b – Hủy khi AWAITING_PAYMENT | **[MỞ]** khách có được tự hủy ở `AWAITING_PAYMENT` hay không — **chưa quyết định, không tự chốt** (lưu ý MVP chuyển khoản QR trực tiếp đến studio — có thể đã có giao dịch chưa xác minh, CORE-01/02). **[TÀI LIỆU / CORE-01]** hết 30 phút chờ thanh toán mà không có xác nhận hợp lệ → `EXPIRED` + xóa SlotLock trong cùng transaction. **[MỞ]** xử lý **Payment record DEPOSIT PENDING/CONFIRMED** khi khách hủy. |
| D21 | O5c – Hủy sau khi CONFIRMED | **[TÀI LIỆU / CORE-03 — giữ nguyên đủ]** khách hủy ≥ 24 giờ → hoàn 100% cọc; khách hủy trong vòng 24 giờ → không hoàn; studio hủy sau khi đã nhận cọc → hoàn đủ trong 3 ngày làm việc; **nền tảng theo dõi, admin xử lý quá hạn/thất bại/tranh chấp**. **[TÀI LIỆU]** Booking, Payment và Refund giữ lịch sử độc lập; không xóa Booking khi hủy. **[MỞ]** chi tiết thao tác Payment/Refund cụ thể khi khách hủy. |
| D22 | O5d – Tiền đến sau khi EXPIRED | **[TÀI LIỆU / CORE-02]** nếu Booking đã `EXPIRED` nhưng studio xác minh thực tế đã nhận tiền: **không khôi phục Booking thành `CONFIRMED`**; **không tự động chiếm lại SlotLock**; giữ nguyên `EXPIRED`; **ghi nhận giao dịch đến muộn** theo quy tắc Payment; **đối soát/hoàn thủ công**; **admin xử lý quá hạn/thất bại/tranh chấp theo CORE-03**. **[CHỐT]** **không thêm Payment purpose/state mới**. **[MỞ / SUY LUẬN]** **tỷ lệ hoàn 100% và thời hạn 3 ngày riêng cho tiền đến muộn** — **chưa được phê duyệt, không tự chốt** (mốc 3 ngày làm việc hiện chỉ có trong nguồn cho trường hợp studio hủy sau khi đã thu cọc). |
| D23 | O5e – Incident khi hoàn thành Booking | **[CHỐT — luồng Job tự động]** Job tự động hoàn thành (T11) giữ điều kiện: **không tồn tại Incident chưa giải quyết** (`OPEN`/`IN_PROGRESS`/`DISPUTED`) mới đủ điều kiện `COMPLETED`; chỉ khi tất cả incident liên quan đã `RESOLVED` thì hoàn thành. **[MỞ — luồng Studio xác nhận thủ công]** Studio có được xác nhận hoàn thành thủ công khi còn Incident chưa giải quyết hay không — **chưa có căn cứ, không tự suy diễn**. **[CHỐT — giữ RC1/RC2]** incident vẫn được tạo trong **7 × 24 giờ kể từ `completedAt`**; Booking đã `COMPLETED` **không quay lại `CONFIRMED`**; việc tạo incident **phải cập nhật `incidentRevision` trong cùng transaction** (RC1). |
| D24 | FINAL SOURCE ALIGNMENT – `depositRate` | **[CHỐT]** **Giữ CẢ HAI trường**: `bookings.depositRate` (cấp cao nhất) **và** `bookings.policySnapshot.depositRate` — **không xóa top-level**. Khôi phục trường top-level trong `docs/database-design.md` (sec 2.7, ví dụ JSON, sec 4); `docs/requirements-summary.md` chỉ ở mức nghiệp vụ nên không đổi. **[MỞ]** quy tắc pre-validate hai giá trị bằng nhau (S7-pre) — **chưa được phê duyệt**. **Thay thế D18.** |

**Giữ nguyên (không thay đổi trong 2C.2):** A1–A9 (tiền VND nguyên + `Number.isSafeInteger`, slot 15 phút, unique index `{ roomId: 1, slotStartUtc: 1 }`, transaction khi tạo Booking + SlotLock, 1 Booking 1 Studio nhiều phòng, deposit 20%, hạn thanh toán 30 phút, commission 5% chỉ khi COMPLETED); M1–M6; I1 (14 collections) / I2 (idempotencyKey); RC1/RC2; CN1/IK1; D1–D9; các model Group 1; **D7 (SlotLock: xóa trong transaction cho REJECTED/EXPIRED/CANCELLED; COMPLETED giữ đến khi slot qua, job A4 dọn; không dùng document RELEASED, không field `state`)**; **không thêm collection thứ 15**; không thêm field ngoài những gì đã được chốt trong D10–D24.

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
- ⚠️ **ĐỀ XUẤT KỸ THUẬT, VẪN CHỜ CHỦ DỰ ÁN PHÊ DUYỆT (không phải v0.8, không phải A5 đã duyệt):** tự động theo dõi khoản vượt thành **số dư tín dụng** cho kỳ đối soát tiếp theo (không làm âm công nợ hiện tại; mang sang kỳ sau) — chưa chính thức, **chưa được duyệt** (mục 5, dòng A5b), không được coi là quy tắc hiệu lực.

### 3.4. Hệ quả cho mô hình dữ liệu (định hướng, bám theo collection v0.8)

- `commissions`: lưu `rateSnapshot`, `basisAmount`, `commissionAmount` (số nguyên VND, không âm), `period`, `dueAt`, `settledAt`, `payoutReference`, `adjustmentOf` (liên kết bản ghi gốc khi điều chỉnh).
- `payments`: `purpose ∈ {DEPOSIT, BALANCE, REFUND}`, tiền là số nguyên VND không âm cho mỗi record; hoàn tiền là record riêng.
- `priceSnapshot` / `policySnapshot` trên booking: bất biến sau khi tạo.
- Khi có điều chỉnh hoa hồng làm tăng nghĩa vụ vượt công nợ kỳ: (A5, đã duyệt) ghi nhận bản ghi điều chỉnh và chuyển `UNRECONCILABLE` cho admin xử lý thủ công. **Trường `creditCarryover` (số dư tín dụng tự động) là đề xuất CHƯA được DUYỆT** (xem 3.3 & mục 5) — không thiết kế theo đó cho đến khi có phê duyệt.

## 4. Thanh điểm kiểm tra nhất quán

| Điểm | Nguồn | Trạng thái |
|---|---|---|
| Tỷ lệ hoa hồng 5% | v0.8 (V07-01) | Giữ nguyên; kỹ thuật chỉ chốt cách lưu/làm tròn |
| Không cộng cọc lần hai | v0.8 (19.4) | Giữ nguyên |
| Cọc 20%, hạn 30 phút, mốc 24 giờ | v0.8 | Giữ nguyên (không đụng trong tài liệu này) |
| Số nguyên VND | **ĐÃ DUYỆT (A1, 2026-10-29)** | `Number.isSafeInteger()`, từ chối giá trị không hợp lệ |
| Hoàn tiền không âm, record riêng | **Mới (kỹ thuật)** | Không mâu thuẫn v0.8 (v0.8 không quy định dấu) |
| Không tự động số dư tín dụng (A5a) | **ĐÃ DUYỆT 2026-10-29** | Điều chỉnh vượt công nợ → ghi lịch sử + `UNRECONCILABLE` + admin xử lý thủ công |
| Số dư tín dụng tự động cho điều chỉnh vượt công nợ (A5b) | **Đề xuất kỹ thuật — CHỜ CHỦ DỰ ÁN PHÊ DUYỆT** | Bổ sung thực thi, không thay đổi nghiệp vụ 5%/đối soát tháng; chưa phải quy tắc v0.8 |

## 5. Nhật ký duyệt quyết định kỹ thuật

**2026-10-29 — Chủ dự án DUYỆT A1–A9** (chi tiết thiết kế tại `docs/database-design.md` sec 10.2):

| Mã | Nội dung đã duyệt |
|---|---|
| A1 | Tiền lưu **số nguyên VND trong `Number`**; xác thực `Number.isSafeInteger()`, từ chối giá trị tiền không hợp lệ (âm, không nguyên, vượt safe-integer). |
| A2 | Khóa thời gian bằng **lưới slot 15 phút + unique index theo `(roomId, slotStartUtc)`**. Thời lượng đặt bước 30 phút; bước giờ bắt đầu 15/30 phút; **mặc định buffer 15 phút sau buổi đặt; giữ toàn bộ slot bị chiếm, kể cả buffer**. |
| A3 | Dùng **MongoDB Atlas hoặc replica set** có hỗ trợ multi-document transaction; transaction bảo đảm **đơn nhiều phòng tạo toàn bộ hoặc không tạo gì**. Không dùng standalone cho yêu cầu này. |
| A4 | Xử lý đơn hết hạn bằng **job định kỳ** + update có điều kiện + giờ server + thao tác idempotent. Chưa cài/triển khai job trong giai đoạn tài liệu này. |
| A5 | (A5a) **Không** tự động chuyển điều chỉnh hoa hồng vượt công nợ thành số dư tín dụng kỳ sau; ghi nhận lịch sử điều chỉnh và chuyển trường hợp chưa đối soát được sang **admin xử lý thủ công**. (A5b) Số dư tín dụng tự động vẫn **chưa được duyệt**. |
| A6 | Lịch mở cửa hằng tuần nằm trong **cấu hình studio**; ngày nghỉ/ngày đặc biệt/khoảng khóa lịch nằm trong **collection ngoại lệ riêng**, hỗ trợ ngoại lệ **toàn studio hoặc riêng 1 phòng**. |
| A7 | 5 trạng thái studio: **PENDING_REVIEW, ACTIVE, REJECTED, SUSPENDED, CLOSED**; chỉ **ACTIVE** được công khai và nhận đặt lịch. |
| A8 | Lưu ngày giờ dạng **UTC `Date`**; dùng múi giờ cấu hình trên studio để hiển thị và tính giờ hoạt động; **mặc định `Asia/Ho_Chi_Minh`**. |
| A9 | Tách trạng thái **booking / payment / refund / commission**; giao dịch & điều chỉnh hoa hồng là record riêng; **không ghi đè lịch sử giao dịch hoặc snapshot đã ghi nhận**. |

**2A.1 (2026-10-30) — Chủ dự án CHỐT M1–M6** (điểm còn mở từ phân tích 2A; chi tiết thiết kế tại `docs/database-design.md` sec 10.4):

| Mã | Nội dung đã chốt |
|---|---|
| M1 | Bổ sung hồ sơ studio: **giữ nguyên 5 trạng thái theo A7**; thêm `studios.needsMoreInfo: Boolean`. Admin yêu cầu bổ sung → giữ `status = PENDING_REVIEW`, đặt `needsMoreInfo = true`; studio gửi bổ sung → đặt `false`. Lịch sử yêu cầu/phản hồi lưu trong `auditLogs`. |
| M2 | Sự cố booking: **bổ sung collection `incidents`** (1 booking có thể có nhiều incident). Lưu `bookingId`, người báo cáo, loại sự cố, mô tả, bằng chứng, trạng thái xử lý, thời điểm tạo và giải quyết. **Không tự động chuyển booking sang COMPLETED khi có sự cố chưa giải quyết** (đúng V08-11). Cấu trúc/trạng thái cụ thể chỉ là đề xuất — phải đối chiếu v0.8 trước khi chốt chi tiết. |
| M3 | `EXTENDED` (ngoại lệ lịch): cho phép **mở rộng khung giờ hoạt động trong ngày được chỉ định**. **CLOSED và BLOCKED ưu tiên cao hơn EXTENDED**. Studio bị đóng (SUSPENDED/CLOSED) không được đặt phòng kể cả khi phòng có EXTENDED. Ngoại lệ cấp ROOM không vượt được trạng thái đóng cấp STUDIO. Quy tắc hợp nhất các khoảng ngoại lệ chồng lấn đã định nghĩa trong thiết kế. |
| M4 | **Weekday theo ISO 8601**: 1 = Monday, 2 = Tuesday, …, 7 = Sunday. Thống nhất giữa database và backend. |
| M5 | **`bufferMinutes` chỉ nhận 0, 15 hoặc 30** (bội số 15 — ràng buộc bởi lưới slot A2). Giữ nguyên cơ chế khóa slot 15 phút. |
| M6 | Email: collection **`notifications`** lưu thông tin gửi thông báo/email, theo dõi **PENDING/SENT/FAILED + số lần thử + lỗi gửi gần nhất**. `auditLogs` ghi nhận sự kiện gửi email thất bại quan trọng. **Chưa triển khai Outbox riêng trong MVP**. **Lỗi email không được làm thay đổi trạng thái booking** (CORE-05/v0.8). |

Quy tắc kỹ thuật bổ trợ (gắn với M1–M6, chi tiết tại `docs/database-design.md` sec 5b & 10.4):
- **(A)** Mỗi giao dịch `DEPOSIT`/`BALANCE`/`REFUND` là 1 record riêng; trạng thái từng giao dịch tách khỏi `paymentStatus`/`refundStatus` tổng hợp trên booking; cập nhật tổng hợp phải nhất quán (cùng transaction) với record chi tiết. Không có payment gateway/webhook (MVP chuyển khoản trực tiếp + studio xác nhận — CORE-02).
- **(B)** SlotLocks: unique index `(roomId, slotStartUtc)`; toàn bộ slot của booking nhiều phòng tạo trong cùng transaction; 1 slot trùng → rollback toàn bộ; REJECTED/EXPIRED/CANCELLED → giải phóng slot tương ứng; **không dùng TTL để giải phóng slot đang hiệu lực**; số ô tính theo `[startAt, endAt + buffer)`.
- **(C)** Index khai báo trong Mongoose (kèm partial filter cho trường tùy chọn/null); không tự chạy lệnh index trên Atlas ở bước này.
- **(D)** Phân định trạng thái **chính thức** (collection chi tiết: payments/commissions/incidents/slotLocks) vs. **tổng hợp** (booking); giữ lịch sử mọi giao dịch/hoàn/điều chỉnh — không làm mất dữ liệu khi đổi trạng thái.

**Vẫn CHỜ PHÊ DUYỆT (không triển khai như chính thức):** A5b — số dư tín dụng hoa hồng cho điều chỉnh vượt công nợ (mục 3.3). M1–M6 đã chốt không thay thế A5b; việc tự động mang khoản vượt sang kỳ sau vẫn là đề xuất chưa được duyệt.

**2A.3 (2026-10-30) — Xử lý điểm I1–I5 trước khi code (chỉ cập nhật tài liệu)**
Chi tiết trong `docs/database-design.md`; đây là ghi nhận quyết định/kết luận, không phải thay đổi nghiệp vụ.

| Mã | Kết luận |
|---|---|
| I1 | **Danh sách collection = 14** (users, studios, studioMembers, rooms, services, availabilityExceptions, bookings, slotLocks, payments, commissions, reviews, incidents, notifications, auditLogs). `requirements-summary.md` mục 7 đã đồng bộ (bỏ `availabilityRules`, thêm `slotLocks`/`incidents`). Không thay đổi v0.8. |
| I2 | **Quy ước idempotencyKey:** commission `commission:{bookingId}:ORIGINAL` / `commission:{bookingId}:ADJUSTMENT:{adjustmentId}`; payment `pay:{bookingId}:DEPOSIT|BALANCE:{paymentAttemptId}` / `pay:{bookingId}:REFUND:{refundId}`. Retry **dùng lại key cũ**, không seq. Mongoose: `required + unique`; **lưu ý MongoDB unique index 1 trường coi null/thiếu như null** → phải luôn có giá trị (validation required chặn trước). |
| I3 | **Retry email:** thêm `nextAttemptAt` (nullable) + index `{ channel, status, nextAttemptAt }`; backoff 15/30/60/120 phút, trần 24h; `attemptCount` tăng sau mỗi lần thử thật; SENT/FAILED hết lượt → `nextAttemptAt = null`. Lỗi email **không đổi trạng thái booking**. **`maxAttempts` = cấu hình vận hành, CHƯA CHỐT.** |
| I4 | **Job tự hoàn thành (V08-11):** điều kiện `CONFIRMED AND endAt + 24h ≤ now (server) AND không có incident OPEN/IN_PROGRESS/DISPUTED` (kiểm tra toàn bộ incident; RESOLVED = đã giải quyết). Chuyển COMPLETED + tạo commission ORIGINAL trong 1 transaction (idempotent). **Không thêm điều kiện `paymentStatus`** (v0.8 không yêu cầu). Race incident ↔ job: re-query incident trong transaction + update có điều kiện `{ bookingStatus: CONFIRMED }`. |
| I5 | **Incident enum (đề xuất kỹ thuật, không phải v0.8):** `type` = SERVICE/DAMAGE/PAYMENT/OTHER (immutable); `status` = OPEN/IN_PROGRESS/RESOLVED/DISPUTED (đổi theo thời gian). **Tách `type`/`status`, không đưa DISPUTED vào `type`.** Nếu danh mục không phù hợp v0.8 → báo cáo, không tự đổi. |

**Điểm CHỜ QUYẾT ĐỊNH (không tự chốt, cần chủ dự án):**
- `maxAttempts` (giới hạn số lần thử email) — cấu hình vận hành (I3).
- Có nên **chặn create incident khi booking đã COMPLETED** (chuyển sang luồng khiếu nại thay vì "quay trạng thái") — I4, điểm mấu chốt phụ; không nằm trong v0.8.
- Danh mục `incidents.type` (SERVICE/DAMAGE/PAYMENT/OTHER) — xác nhận trước khi code (I5).

**Giữ nguyên:** A1–A9, A5b (vẫn CHỜ DUYỆT), 14 collection, không gateway/webhook, không collection `refunds` riêng, cơ chế slot 15 phút + all-or-nothing transaction.

**2A.4 (2026-10-31) — Chốt chi tiết kỹ thuật cuối trước khi code**
Chi tiết trong `docs/database-design.md` sec 9b & 10.5; đây là ghi nhận kết luận kỹ thuật, không thay đổi nghiệp vụ v0.8.

| Mã | Kết luận |
|---|---|
| RC1 | **Race incident ↔ auto-complete:** loại cơ chế "chỉ re-query trong transaction" (transaction đọc snapshot theo thời điểm bắt đầu → có thể bỏ sót incident commit sau đó). Thay bằng: **`bookings.incidentRevision`** (Number, tăng khi insert incident trong cùng transaction) + job auto-complete **update booking có điều kiện `{ bookingStatus: CONFIRMED, incidentRevision: v }`**; khi **write conflict** → rollback + **retry an toàn**: đọc lại `bookingStatus` + **kiểm tra lại toàn bộ incident chưa giải quyết (OPEN/IN_PROGRESS/DISPUTED)** trước khi hoàn thành. Không bao để COMPLETED khi incident hợp lệ đã commit. |
| RC2 | **Incident sau COMPLETED:** cho phép ghi nhận khiếu nại; **KHÔNG chuyển ngược** `bookingStatus` (COMPLETED → CONFIRMED); xử lý qua luồng khiếu nại/refund/commission adjustment có sẵn. **Thời hạn khiếu nại sau COMPLETED CHƯA CHỐT** (v0.8 không quy định) — cần thống nhất trước khi code rule này. |
| CN1 | **Collection naming (Mongoose):** tên collection **khớp chính xác 14 tên**, đặc biệt camelCase `studioMembers`, `availabilityExceptions`, `slotLocks`, `auditLogs`; mỗi schema khai báo collection name **tường minh** (option 3 của `mongoose.model`), **không dựa pluralize/lowercase mặc định**. Kiểm tra lại tên collection thực tế trên Atlas trước khi chạy thật. |
| IK1 | **`idempotencyKey`:** `required` = validation Mongoose; `unique` = **MongoDB unique index** (không phải validator Mongoose, chỉ chặn trùng khi key có giá trị); `immutable` = không sửa sau tạo. **Không được kết luận "đã chống trùng" chỉ dựa Schema** — phải **kiểm tra unique index thực sự tồn tại** trên Atlas trước khi đưa vào hoạt động thực tế. |

**Giữ nguyên (không đổi):** A1–A9; quy ước key idempotencyKey theo 2A.3; 14 collection; không payment gateway/webhook; không collection `refunds` riêng; slot 15 phút + all-or-nothing.

**Vẫn CHỜ PHÊ DUYỆT (không tự chốt):** **A5b** (số dư tín dụng hoa hồng) tiếp tục chưa duyệt. Điểm mở còn lại từ 2A.4: `maxAttempts` (cấu hình vận hành email), thời hạn khiếu nại sau COMPLETED, maxRetries/backoff cho job — đều là tham số khi code, không chặn việc viết 14 Mongoose Models.

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

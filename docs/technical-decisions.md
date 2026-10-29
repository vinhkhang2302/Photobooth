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

**Vẫn CHỜ PHÊ DUYỆT (không triển khai như chính thức):** A5b — số dư tín dụng hoa hồng cho điều chỉnh vượt công nợ (mục 3.3).

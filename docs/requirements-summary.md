# Tổng hợp yêu cầu nghiệp vụ MVP — Sàn đặt lịch Photobooth

Nguồn: `docs/Dac_ta_chuc_nang_san_photobooth_v0.8.docx` (v0.8).
Quy tắc có hiệu lực là **mục 19 (Bảng quyết định cuối cùng)** của đặc tả v0.8. Các phần lịch sử (mục 3, 16, 17, 18) chỉ là bối cảnh; nếu mâu thuẫn, áp dụng mục 19.
Quyết định kỹ thuật đã chốt (stack, tiền VND, lưu trữ hồ sơ) xem tại `docs/technical-decisions.md` — tài liệu này không thay đổi nghiệp vụ v0.8.

## 1. Định nghĩa sản phẩm

- Sàn trung gian kết nối khách hàng với nhiều studio photobooth.
- Studio đăng ký, gửi hồ sơ xác minh; **chỉ studio ACTIVE (được admin duyệt) mới công khai và nhận đơn**.
- Khách chọn một hoặc nhiều phòng (cùng studio), gửi yêu cầu, studio phản hồi thủ công, khách trả cọc 20% qua QR studio, studio xác minh tiền thật, đơn mới được xác nhận.
- Nền tảng **không giữ tiền hộ** trong MVP; khách thanh toán trực tiếp cho studio.

## 2. Quy tắc chốt — đặt lịch

| Mã | Quyết định |
|---|---|
| CORE-04 | Một đơn chỉ gồm các phòng **cùng studio, cùng khung giờ**; kiểm tra và giữ chỗ **nguyên tử** (tất cả phòng cùng được giữ hoặc không giữ). |
| Add-on (2C.2) | **[TÀI LIỆU/CHỐT]** Mỗi add-on của một dòng phòng được **lưu snapshot tại thời điểm đặt** — **không lấy tên/giá hiện tại** của dịch vụ sau này để thay đổi đơn đã đặt (nhất quán với quy tắc snapshot, mục 4). **[MỞ]** cấu trúc chi tiết của từng add-on (tên/đơn giá/thành tiền lưu ra sao) — chưa quyết định. |
| V08-03 | Chỉ nhận đơn khi giờ bắt đầu còn **≥ 90 phút**. Hạn phản hồi studio = `min(createdAt + 12 giờ, startAt − 60 phút)`, tính theo server time. Hết hạn → EXPIRED, giải phóng toàn bộ phòng. |
| V08-02/08 | Thời lượng: **bước 30 phút, tối thiểu 30 phút, mặc định tối đa 4 giờ/studio, trần hệ thống 8 giờ** (studio cấu hình tối đa từ 30 phút đến 8 giờ, bước 30). |
| V08-08 | Giờ bắt đầu theo bước **15 hoặc 30 phút** (mặc định 30, do studio chọn). Thời gian đệm mặc định **15 phút**, studio có thể cấu hình 0. |
| Lịch | Studio cấu hình giờ mở cửa theo ngày, ngày nghỉ/đóng cửa, khoảng chặn lịch. Backend kiểm tra lại khi tạo và chuyển trạng thái đơn (không tin giao diện). Đổi cấu hình không tự hủy/sửa đơn đã xác nhận — cảnh báo và xử lý minh bạch. |

## 3. Quy tắc chốt — trạng thái đơn và thanh toán

Trạng thái booking: `PENDING_STUDIO → AWAITING_PAYMENT → CONFIRMED → COMPLETED`, nhánh `REJECTED` / `EXPIRED` / `CANCELLED`.
Trạng thái thu/hoàn tiền (tách riêng, theo từng payment/refund record): `DEPOSIT_PENDING, DEPOSIT_PAID, BALANCE_PARTIAL, PAID_IN_FULL, REFUND_PENDING, REFUND_PROCESSING, REFUNDED, REFUND_FAILED, PARTIALLY_REFUNDED, DISPUTED`.

| Mã | Quyết định |
|---|---|
| CORE-01 | **Cọc bắt buộc 20% tổng đơn** (tính trên tất cả phòng + gói). Khách chuyển QR của studio trong **30 phút** sau khi studio chấp nhận; không xác minh đúng hạn → EXPIRED + giải phóng phòng. |
| CORE-02 | **Không có cổng thanh toán tập trung** (MoMo/VNPay) trong MVP. Studio xác minh giao dịch ngân hàng thật rồi bấm xác nhận trên web; **ảnh biên lai hoặc khách tự bấm "đã chuyển" không đủ** để xác nhận. Chuyển khoản đến muộn: ghi nhận để đối soát/hoàn thủ công, không tự chiếm lại slot đã cấp cho đơn khác. |
| V08-10 | Số dư còn lại: khách trả **tiền mặt hoặc QR tại studio**, sau buổi chụp, **trước khi rời studio**. Chỉ đánh dấu PAID_IN_FULL khi tổng các khoản đã xác minh = tổng phải trả. |
| CORE-03 | Hủy: khách hủy **trước ít nhất 24 giờ** → hoàn 100% cọc; hủy **trong 24 giờ cuối** → không hoàn. **Studio hủy sau khi đã thu cọc → hoàn đủ trong 3 ngày làm việc**; nền tảng theo dõi, admin xử lý quá hạn/thất bại/tranh chấp. Đơn chưa thanh toán → không phát sinh hoàn tiền. |
| Hủy theo trạng thái (2C.2) — **[MỞ]** | Khi đang **PENDING_STUDIO**: khách **có được tự hủy hay không — chưa quyết định**. Khi đang **AWAITING_PAYMENT**: khách **có được tự hủy hay không — chưa quyết định** (lưu ý MVP: tiền chuyển QR trực tiếp cho studio, có thể đã có giao dịch chưa xác minh); xử lý khoản cọc đang chờ xác minh khi khách hủy — **cũng chưa quyết định**. **[TÀI LIỆU]** Hết 30 phút chờ thanh toán mà không xác nhận được thanh toán hợp lệ → EXPIRED + giải phóng phòng (CORE-01). Sau khi CONFIRMED: giữ nguyên CORE-03. |
| Chính sách hủy (2C.2) — **[MỞ]** | Chính sách hủy do **nền tảng cố định quản lý hay Studio được cấu hình — chưa quyết định**. **[TÀI LIỆU / CORE-03 — hiệu lực, giữ nguyên đủ các trường hợp]** khách hủy ≥24h → hoàn 100% cọc; khách hủy trong 24h → không hoàn; studio hủy sau khi đã thu cọc → hoàn 100% trong 3 ngày làm việc; đơn chưa thanh toán → không phát sinh hoàn; **nền tảng theo dõi, admin xử lý quá hạn/thất bại/tranh chấp**. **[TÀI LIỆU]** Giá trị chính sách tại thời điểm đặt được lưu trong `policySnapshot` (mục 4). **[MỞ]** cách biểu diễn lưu trữ (Object hay chuỗi) chưa chốt. |
| Tiền đến muộn sau EXPIRED (2C.2) — **[TÀI LIỆU / CORE-02]** | Nếu đơn đã EXPIRED nhưng studio xác minh thực tế đã nhận tiền từ khách → **không khôi phục đơn, không tự chiếm lại slot**; giữ EXPIRED; **ghi nhận giao dịch đến muộn** theo quy tắc Payment và **đối soát/hoàn thủ công**; **admin xử lý trường hợp quá hạn/thất bại/tranh chấp theo CORE-03**. **[MỞ]** tỷ lệ hoàn 100% và thời hạn 3 ngày làm việc **riêng cho trường hợp tiền đến muộn** — chưa được phê duyệt, không tự chốt. Không thêm trạng thái thanh toán mới. |
| V07-06 | **Không sửa trực tiếp đơn đã gửi**; khách hủy theo chính sách rồi tạo đơn mới. Không tự động chuyển cọc giữa hai đơn. |
| V08-11 | Hoàn thành: studio xác nhận COMPLETED sau buổi chụp; nếu sau **24 giờ** kể từ giờ kết thúc không có sự cố/khiếu nại → hệ thống **tự chuyển COMPLETED**; có sự cố → tạm dừng tự động. |
| Điều kiện hoàn thành khi có Incident (2C.2) | **[TÀI LIỆU / T11 — luồng job tự động]** Job tự động hoàn thành đơn sau 24 giờ chỉ hoàn thành khi **không còn Incident chưa giải quyết** (`OPEN`/`IN_PROGRESS`/`DISPUTED`) — mọi incident liên quan phải `RESOLVED`. **[MỞ — luồng studio xác nhận thủ công]** Studio có được xác nhận hoàn thành thủ công khi còn Incident chưa giải quyết hay không — **chưa có căn cứ, chưa quyết định**. **[TÀI LIỆU]** Giữ nguyên quy tắc đã chốt: incident có thể được tạo trong **7 × 24 giờ** kể từ khi đơn COMPLETED, và đơn đã COMPLETED không bị chuyển ngược về CONFIRMED. |

## 4. Quy tắc chốt — giá, gói và snapshot

| Mã | Quyết định |
|---|---|
| V08-06 | Mô hình giá hỗ trợ: **giá theo giờ** (tính theo từng 30 phút — 100.000đ/giờ = 50.000đ/30 phút), **giá block cố định**, **gói giá phòng**. Studio không tự nhập công thức. Phần vượt block chỉ tính thêm nếu studio đã khai báo đơn giá mỗi 30 phút. |
| V08-07 | Gói và add-on **gắn theo từng phòng**. Gói đã gồm phòng → **không cộng giá phòng lần hai**. |
| V08-13 | **MVP không có mã giảm giá/coupon engine**. Giá niêm yết, giá áp dụng, chi tiết từng dòng, tổng đơn, cọc, số dư và chính sách hủy phải hiển thị **trước khi gửi đơn**. |
| Snapshot | Đơn lưu `priceSnapshot` và `policySnapshot` (tỷ lệ cọc 0.20, mức giá, chính sách hủy, thời điểm áp dụng). Sửa bảng giá/chính sách sau này **không thay đổi đơn cũ**. Tỷ lệ cọc 0.20 được lưu **ở cả hai vị trí** trên đơn (cấp đơn và trong `policySnapshot`) — 2C.2; **[MỞ]** cách biểu diễn lưu trữ của chính sách hủy (Object hay chuỗi) chưa chốt; add-on lưu snapshot trong dòng (mục 2). |
| Làm tròn | Làm tròn đến đồng bằng `Math.round` cho số tiền dương, quy tắc nhất quán UI/backend; **backend là nguồn tính giá cuối cùng**, không tin số tiền do trình duyệt gửi. Tiền lưu **số nguyên VND**; hoa hồng làm tròn `Math.round` trên giá trị không âm; hoàn tiền là giao dịch riêng (không âm), điều chỉnh hoa hồng có lịch sử riêng (không sửa ngược snapshot). Chi tiết: `docs/technical-decisions.md`. |

## 5. Quy tắc chốt — studio, tài khoản và vận hành

| Mã | Quyết định |
|---|---|
| V08-05 | Hồ sơ studio (tiêu chuẩn xác minh): **bắt buộc** tên studio, người đại diện, email + SĐT đã xác minh, địa chỉ, ảnh thực tế; **admin có thể yêu cầu** bằng chứng quyền sử dụng/vận hành địa điểm; **giấy đăng ký kinh doanh khi phù hợp (không bắt buộc chung)**; không bắt buộc CCCD/hộ chiếu trong MVP. Hồ sơ lưu **riêng tư, giới hạn quyền truy cập, có audit log**; chính sách lưu trữ cấu hình được, chỉ lưu khi còn cần thiết, tuân thủ nghĩa vụ pháp lý. **Admin duyệt trước khi ACTIVE**; admin có thể yêu cầu bổ sung, từ chối hoặc tạm ngưng. Studio không ACTIVE không công khai, không nhận đơn. Trạng thái studio (A7, đã duyệt kỹ thuật 2026-10-29): `PENDING_REVIEW, ACTIVE, REJECTED, SUSPENDED, CLOSED`. |
| CORE-05 | Đăng nhập **email + mật khẩu** (MVP: không Google OAuth, không OTP/SMS). Xác minh email; băm mật khẩu; giới hạn đăng nhập sai. Phân quyền 4 vai trò: khách vãng lai, khách hàng, chủ/nhân viên studio, admin — mỗi vai chỉ thao tác trong phạm vi của mình. |
| Thông báo | Thông báo **website + email**; nội dung email nêu mã đơn, studio/phòng, thời gian, số tiền, hành động tiếp theo. **Lỗi email không làm thay đổi trạng thái đơn** (ghi log, cho thử lại). Không SMS/đẩy trong MVP. |

## 6. Quy tắc chốt — hoa hồng, đánh giá và kiểm toán

| Mã | Quyết định |
|---|---|
| V07-01/V08-01 | Hoa hồng = **5%** × (giá trị dịch vụ sau giảm giá hợp lệ − khoản hoàn hợp lệ được phân bổ cho dịch vụ); **không cộng cọc lần hai**. Tạo **bản ghi gốc idempotent** khi đơn COMPLETED; khoản hoàn phát sinh sau → bản ghi điều chỉnh có liên kết, không sửa/xóa lịch sử. **Đối soát theo tháng**; studio thanh toán hoa hồng tháng trước **chậm nhất ngày 5 tháng kế tiếp**. MVP đối soát thủ công (admin/studio xác nhận giao dịch), không tự động khấu trừ. |
| V08-12 | Chỉ khách có đơn **COMPLETED** được đánh giá; **một đánh giá gốc/đơn, không sửa sau khi gửi**; có cơ chế báo cáo và admin ẩn/kiểm duyệt kèm lý do + audit log. |
| Audit | Mọi thao tác nhạy cảm (admin duyệt/tạm ngưng studio, studio xác nhận cọc/số dư/hoàn, điều chỉnh đối soát, tranh chấp, kiểm duyệt đánh giá) **ghi audit log**. |

## 7. Mô hình dữ liệu (ánh xạ kỹ thuật database — đã hợp nhất với `docs/database-design.md`, giai đoạn 2A.3)

Đây là **ánh xạ kỹ thuật** của 14 collection MongoDB, **không thay đổi nghiệp vụ v0.8**. Chi tiết schema, index, validation và transaction nằm trong `docs/database-design.md`. MongoDB Compass dùng để xem/quản lý dữ liệu.

| # | Collection | Ghi chú ngắn |
|---|---|---|
| 1 | `users` | Tài khoản (khách, chủ/nhân viên studio, admin) |
| 2 | `studios` | Hồ sơ + **`scheduling` (lịch tuần, A6)** + thanh toán + trạng thái (A7) + `needsMoreInfo` (M1) |
| 3 | `studioMembers` | Phân quyền chủ/nhân viên |
| 4 | `rooms` | Phòng (tài nguyên có lịch riêng) |
| 5 | `services` | Gói/dịch vụ (gồm phòng hoặc add-on) |
| 6 | `availabilityExceptions` | Ngày nghỉ/ngày đặc biệt/khoảng khóa lịch, scope STUDIO/ROOM (A6, M3) |
| 7 | `bookings` | Đơn nhiều phòng (1 studio), snapshot giá/chính sách/hoa hồng, 3 trạng thái tách |
| 8 | `slotLocks` | **Lưới slot 15 phút + unique index chống đặt trùng (A2)** |
| 9 | `payments` | Giao dịch DEPOSIT/BALANCE/REFUND (record riêng, tiền không âm) |
| 10 | `commissions` | Hoa hồng + đối soát tháng (idempotent, điều chỉnh có lịch sử) |
| 11 | `reviews` | Đánh giá (1/đơn COMPLETED, không sửa) |
| 12 | `incidents` | **(M2) Sự cố booking** — có incident chưa giải quyết → không tự COMPLETED |
| 13 | `notifications` | **(M6) Thông báo WEB + EMAIL** — theo dõi gửi PENDING/SENT/FAILED, backoff |
| 14 | `auditLogs` | Nhật ký thao tác nhạy cảm (gồm lỗi email thất bại) |

> Ghi chú: collection `availabilityRules` (kế hoạch v0.8 cũ) **đã bỏ** vì lịch tuần nằm trong `studios.scheduling` theo A6. Bổ sung `slotLocks` (A2) và `incidents` (M2) so với danh sách dự kiến ban đầu.

## 8. Phạm vi MVP vs. để giai đoạn sau

- **Trong MVP**: tìm kiếm/chi tiết studio đã duyệt; studio quản lý phòng, gói, lịch, khóa lịch; đơn nhiều phòng cùng studio; giữ chỗ nguyên tử + hạn phản hồi động; thanh toán QR studio thủ công; hủy/hoàn theo quy tắc trên; hoa hồng 5% đối soát tháng; đánh giá; thông báo web/email; admin duyệt + audit log.
- **Để sau**: đơn liên kết nhiều studio; ví nội bộ/chia doanh thu tự động; cổng thanh toán tập trung + webhook; chat thời gian thực; ứng dụng di động; AI gợi ý; quảng cáo; khách hàng thân thiết.

> Ghi chú: đây là giai đoạn đặc tả — **chưa triển khai code**. Trước khi code vẫn cần hoàn thiện sơ đồ dữ liệu/API chi tiết và kiểm thử các luồng ngoại lệ (mục 19.8 liệt kê các đầu việc kỹ thuật/pháp lý còn lại; chúng không phải là quyết định nghiệp vụ chưa chốt).

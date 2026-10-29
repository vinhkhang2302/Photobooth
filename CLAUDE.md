# CLAUDE.md — Sàn đặt lịch Photobooth

## Stack đã chốt (MVP)

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | JavaScript + **React + Vite** | Chưa dùng Next.js trong MVP. |
| Backend | JavaScript + **Node.js + Express** | REST API. |
| Database | **MongoDB + Mongoose** | MongoDB Compass để xem/quản lý dữ liệu. |
| Kiến trúc | **API giữa frontend và backend** | Hai ứng dụng riêng, frontend gọi backend qua API. |

Quy tắc kỹ thuật chi tiết (tiền VND số nguyên, hoa hồng, hoàn tiền, lưu trữ hồ sơ): xem `docs/technical-decisions.md`.

## Tài liệu quy tắc

- **Đặc tả nghiệp vụ v0.8 (nguồn quyết định cuối cùng):** `docs/Dac_ta_chuc_nang_san_photobooth_v0.8.docx` — quy tắc có hiệu lực nằm ở **mục 19** (Bảng quyết định cuối cùng); mục 20 là lịch sử phiên bản.
- **Tóm tắt nghiệp vụ MVP đã hợp nhất:** `docs/requirements-summary.md` — dùng làm tài liệu nền tảng khi làm việc.
- **Quyết định kỹ thuật đã chốt:** `docs/technical-decisions.md` — stack, xác minh studio/dữ liệu, quy tắc tiền và hoa hồng.

## Quy tắc bắt buộc

- **Không tự ý thay đổi nghiệp vụ:** các quy tắc đã chốt trong v0.8 (cọc 20%, hạn thanh toán 30 phút, hủy/hoàn mốc 24 giờ, đơn nhiều phòng cùng studio, hoa hồng 5% đối soát tháng, không coupon, không cổng thanh toán tập trung, ...) là đã chốt. Nếu muốn thay đổi phải do chủ dự án quyết định, không áp dụng theo suy luận của AI.
- **Chỉ sửa các file liên quan đến nhiệm vụ được giao:** hạn chế phạm vi thay đổi; không cấu trúc lại, không chỉnh sửa các file không thuộc nhiệm vụ.
- Tiền lưu **số nguyên VND**; hoàn tiền là record riêng không âm; hoa hồng `Math.round` trên cơ sở không âm; điều chỉnh hoa hồng có lịch sử riêng (không sửa ngược snapshot). Chi tiết tại `docs/technical-decisions.md`.
- Hồ sơ xác minh studio lưu riêng tư, giới hạn truy cập, có audit log; chính sách lưu trữ cấu hình được. Rà soát pháp lý trước khi vận hành thương mại.

## Trạng thái dự án

- Giai đoạn hiện tại: **chỉ chuẩn bị tài liệu nền tảng**. Chưa tạo cấu trúc ứng dụng, chưa cài dependency, chưa tạo database, chưa viết code ứng dụng.

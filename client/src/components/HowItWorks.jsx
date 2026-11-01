const STEPS = [
  {
    step: "1",
    title: "Khám phá & chọn studio",
    description:
      "Tìm kiếm, lọc theo khu vực và xem chi tiết phòng, gói dịch vụ cũng như lịch trống của từng studio đã xác minh.",
  },
  {
    step: "2",
    title: "Đặt lịch & gửi yêu cầu",
    description:
      "Chọn một hoặc nhiều phòng cùng studio, chọn ngày giờ và thời lượng. Hệ thống kiểm tra khả dụng trước khi bạn gửi.",
  },
  {
    step: "3",
    title: "Xác nhận & đặt cọc",
    description:
      "Khi studio chấp nhận, bạn thanh toán cọc 20% qua mã QR của studio trong thời hạn quy định. Lịch được giữ chính thức.",
  },
  {
    step: "4",
    title: "Đến buổi chụp & hoàn tất",
    description:
      "Tận hưởng buổi chụp và thanh toán phần còn lại bằng tiền mặt hoặc QR tại studio trước khi rời đi.",
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="container">
        <div className="section-heading">
          <h2>Cách hoạt động</h2>
          <p>Bốn bước đơn giản để bạn có một buổi chụp photobooth trọn vẹn.</p>
        </div>

        <ol className="steps-grid">
          {STEPS.map((item) => (
            <li key={item.step} className="step-card">
              <span className="step-number" aria-hidden="true">
                {item.step}
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

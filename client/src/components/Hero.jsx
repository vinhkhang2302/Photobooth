import { useState } from "react";

export default function Hero() {
  const [keyword, setKeyword] = useState("");

  // Chưa kết nối API — nút tìm kiếm hướng xuống danh sách studio (chức năng tìm kiếm giai đoạn sau).
  function handleSearch(event) {
    event.preventDefault();
    document.getElementById("studios")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-title">
          Đặt lịch chụp Photobooth <span className="text-accent">đúng giờ, đúng ngân sách</span>
        </h1>
        <p className="hero-subtitle">
          Nền tảng kết nối bạn với các studio photobooth đã được xác minh.
          Chọn phòng, chọn giờ, đặt cọc trực tiếp và nhận lịch chụp trong vài bước.
        </p>

        <form className="hero-search" onSubmit={handleSearch} role="search">
          <label className="visually-hidden" htmlFor="studio-search">
            Tìm kiếm studio
          </label>
          <input
            id="studio-search"
            name="keyword"
            type="search"
            placeholder="Tìm theo tên studio, quận huyện hoặc dịch vụ…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Tìm studio
          </button>
        </form>

        <ul className="hero-stats" aria-label="Thống kê nền tảng">
          <li>
            <strong>120+</strong>
            <span>Studio đã xác minh</span>
          </li>
          <li>
            <strong>35.000+</strong>
            <span>Phiên chụp mỗi tháng</span>
          </li>
          <li>
            <strong>4.8/5</strong>
            <span>Đánh giá trung bình</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

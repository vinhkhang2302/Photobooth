export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <span className="brand-name">
            Photo<span className="brand-accent">booth</span>
          </span>
          <p>
            Nền tảng kết nối khách hàng và studio photobooth:
            đặt lịch linh hoạt, thanh toán minh bạch, studio được xác minh.
          </p>
        </div>

        <nav aria-label="Định hướng">
          <h3>Định hướng</h3>
          <ul>
            <li><a href="#top">Trang chủ</a></li>
            <li><a href="#studios">Khám phá studio</a></li>
            <li><a href="#how-it-works">Cách hoạt động</a></li>
          </ul>
        </nav>

        <nav aria-label="Cho studio">
          <h3>Cho studio</h3>
          <ul>
            <li><a href="#studios">Đăng ký làm studio</a></li>
            <li><a href="#how-it-works">Phí hoa hồng</a></li>
            <li><a href="#how-it-works">Chính sách thanh toán</a></li>
          </ul>
        </nav>

        <div>
          <h3>Hỗ trợ</h3>
          <ul>
            <li><a href="#top">Trung tâm trợ giúp</a></li>
            <li><a href="#top">Liên hệ</a></li>
            <li><a href="#top">Điều khoản sử dụng</a></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {year} Photobooth. Nền tảng demo — dữ liệu trên trang chỉ là dữ liệu minh hoạ.</p>
      </div>
    </footer>
  );
}

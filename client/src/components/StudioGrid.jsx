import { studios, formatVnd } from "../data/studios.js";

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 1.8l2.47 5.02 5.53.8-4 3.9.94 5.5L10 14.5l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.8z" />
    </svg>
  );
}

export default function StudioGrid() {
  return (
    <section className="studios-section" id="studios">
      <div className="container">
        <div className="section-heading">
          <h2>Studio nổi bật</h2>
          <p>Chọn từ các studio đã được xác minh — dữ liệu minh hoạ, cập nhật sau khi kết nối API.</p>
        </div>

        <ul className="studio-grid">
          {studios.map((studio) => (
            <li key={studio.id} className="studio-card">
              <div className="studio-card-media">
                <img src={studio.image} alt={`Minh hoạ ${studio.name}`} loading="lazy" />
                <span className="studio-badge">Đã xác minh</span>
              </div>
              <div className="studio-card-body">
                <div className="studio-card-title">
                  <h3>{studio.name}</h3>
                  <span className="studio-rating" aria-label={`Đánh giá ${studio.rating} trên 5`}>
                    <StarIcon />
                    {studio.rating.toFixed(1)}
                    <em>({studio.reviews})</em>
                  </span>
                </div>

                <p className="studio-location">{studio.location}</p>

                <div className="studio-tags">
                  {studio.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="studio-card-footer">
                  <span className="studio-price">
                    Từ <strong>{formatVnd(studio.priceFrom)}</strong>/buổi
                  </span>
                  <a className="btn btn-outline" href="#studios" aria-label={`Xem chi tiết ${studio.name}`}>
                    Xem chi tiết
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

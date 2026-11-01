// Dữ liệu mẫu (mock) — chưa kết nối API/MongoDB.
// Ảnh minh họa được tạo bằng SVG (data URI) nên không phụ thuộc mạng.

function studioImage(label, from, to) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <circle cx="120" cy="300" r="150" fill="rgba(255,255,255,0.10)"/>
  <circle cx="540" cy="80" r="110" fill="rgba(255,255,255,0.12)"/>
  <rect x="40" y="330" width="560" height="60" rx="10" fill="rgba(0,0,0,0.35)"/>
  <text x="60" y="372" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" fill="#ffffff">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const studios = [
  {
    id: "studio-1",
    name: "Lumen Studio",
    location: "Quảng Nam, Đà Nẵng",
    priceFrom: 450000,
    rating: 4.9,
    reviews: 132,
    tags: ["Studio 2–4 người", "Nhiều hiệu ứng"],
    image: studioImage("Lumen Studio", "#4338ca", "#a5b4fc"),
  },
  {
    id: "studio-2",
    name: "Mint Booth",
    location: "Thắng Lợi, Đà Nẵng",
    priceFrom: 390000,
    rating: 4.8,
    reviews: 98,
    tags: ["Tổ chức sự kiện", "Gói chụp 2 giờ"],
    image: studioImage("Mint Booth", "#0f766e", "#5eead4"),
  },
  {
    id: "studio-3",
    name: "Prism Photobooth",
    location: "Hải Châu, Đà Nẵng",
    priceFrom: 520000,
    rating: 4.7,
    reviews: 76,
    tags: ["Phòng chủ đề", "Trang phục miễn phí"],
    image: studioImage("Prism Photobooth", "#9d174d", "#f9a8d4"),
  },
  {
    id: "studio-4",
    name: "Aurora Corner",
    location: "Thanh Khê, Đà Nẵng",
    priceFrom: 480000,
    rating: 4.9,
    reviews: 154,
    tags: ["Ánh sáng RGB", "In ảnh nhiệt"],
    image: studioImage("Aurora Corner", "#7c2d12", "#fdba74"),
  },
];

// Định dạng giá tham khảo: 450000 → "450.000đ"
export function formatVnd(value) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

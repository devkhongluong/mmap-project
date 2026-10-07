# MMAP — Learning Map Platform

> Nền tảng học tập theo lộ trình cá nhân hóa — import Excel, theo dõi tiến độ từng ngày, nhận feedback AI.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Spring Boot 3 + Spring Security (JWT) |
| Database | PostgreSQL (Neon.tech) |
| AI | Google Gemini (note review) + Groq/Whisper (voice chat) |
| Deploy | Vercel (FE) + Render.com (BE) |

---

## Tính năng chính

- 🗺️ **Learning Map** — Import lộ trình học qua file Excel, hiển thị dạng Tree Map trực quan
- ✅ **Daily Checklist** — Tick từng checkpoint mỗi ngày học
- 📝 **Note + AI Review** — Viết note tóm tắt bài học, Gemini AI chấm điểm & nhận xét
- 🎙️ **Voice AI** — Hỏi đáp bằng giọng nói (Ctrl+D) với context bài học hiện tại
- 🍅 **Pomodoro Timer** — Focus timer tích hợp, cảnh báo khi rời tab
- 📋 **Daily Todo** — Quản lý công việc trong ngày
- 🌅 **Dynamic Theme** — Background thay đổi theo thời gian thực (sáng/trưa/chiều/tối)
- 🏅 **Skills & Streak** — Mở khóa kỹ năng khi hoàn thành lộ trình, theo dõi streak học liên tục

---

## Cấu trúc project

```
soloweb/
├── backend/                    ← Spring Boot API
│   └── src/main/java/com/mmap/
│       ├── controller/         ← REST Controllers
│       ├── service/            ← Business Logic
│       ├── entity/             ← JPA Entities
│       ├── dto/
│       │   ├── request/        ← Request DTOs
│       │   └── response/       ← Response DTOs
│       ├── repository/         ← Spring Data JPA
│       ├── security/           ← JWT, Auth Filter
│       ├── config/             ← CORS, Security Config
│       └── exception/          ← Global Exception Handler
├── frontend/                   ← React + Vite SPA
│   └── src/
│       ├── api/                ← Axios API clients (auth, maps, notes, todos...)
│       ├── components/         ← Shared components (Modal, ProtectedRoute...)
│       ├── hooks/              ← Custom hooks (useDashboard, useVoiceChat...)
│       ├── pages/              ← Page components (Dashboard, Login/Auth)
│       ├── store/              ← Zustand stores (auth, map state)
│       ├── App.tsx
│       └── main.tsx
├── docs/                       ← Tài liệu dự án
│   ├── schema.sql              ← PostgreSQL schema
│   ├── scripts/                ← Utility scripts (Python)
│   └── *.txt                   ← Tài liệu phân tích & thiết kế
├── mmap_template.xlsx          ← File Excel mẫu để import lộ trình
├── render.yaml                 ← Render.com deploy config
└── README.md
```

---

## Chạy local

### Prerequisites
- Java 21+
- Node.js 18+
- PostgreSQL (hoặc kết nối Neon.tech)

### Backend
```bash
cd backend

# Cấu hình biến môi trường (xem application.properties)
# DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY

mvn spring-boot:run
# API chạy tại http://localhost:8080
```

### Frontend
```bash
cd frontend

cp .env.example .env
# Điền VITE_API_BASE_URL=http://localhost:8080

npm install
npm run dev
# App chạy tại http://localhost:5173
```

---

## API Endpoints chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/auth/register` | Đăng ký |
| `GET` | `/api/maps` | Danh sách lộ trình của user |
| `GET` | `/api/maps/{userMapId}/day/{date}` | Chi tiết ngày học |
| `POST` | `/api/notes` | Lưu note + hoàn thành ngày |
| `GET` | `/api/notes/{mapId}` | Lịch sử note |
| `POST` | `/api/todos` | Tạo todo |
| `GET` | `/api/me` | Profile + stats + skills |
| `POST` | `/api/import` | Import lộ trình từ Excel |
| `POST` | `/api/ai/review-note` | AI review note |

---

## Deploy

- **Frontend** → Vercel, tự động deploy khi push `main`
- **Backend** → Render.com, cấu hình qua `render.yaml`
- **Database** → PostgreSQL trên Neon.tech (serverless)

---

## Import lộ trình học

1. Tải file mẫu: `mmap_template.xlsx`
2. Điền thông tin lộ trình vào các sheet
3. Đăng nhập app → click **Import Map** → upload file

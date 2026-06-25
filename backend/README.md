# MMAP Backend — Spring Boot 3 REST API

## Tech Stack
- **Java 21** + **Spring Boot 3.3.1**
- **Spring Data JPA** → PostgreSQL (Neon.tech)
- **Spring Security 6** + **JWT** (jjwt 0.12.x) — Stateless
- **Apache POI** — Excel import
- **Lombok** — boilerplate reduction
- **Hosting**: Render.com (Free tier)

---

## Cấu trúc Project

```
backend/
├── pom.xml
└── src/main/java/com/mmap/
    ├── MmapApplication.java
    ├── config/
    │   ├── SecurityConfig.java     ← Spring Security 6, JWT, CORS rules
    │   └── WebConfig.java          ← CORS filter (Vercel → Render)
    ├── security/
    │   ├── JwtUtil.java            ← Generate/validate JWT (jjwt 0.12.x)
    │   ├── JwtAuthFilter.java      ← Đọc JWT từ Authorization header
    │   └── UserDetailsServiceImpl  ← Load user từ DB bằng email
    ├── entity/                     ← 12 JPA Entities (map 1-1 với schema.sql)
    ├── repository/                 ← Spring Data JPA Repositories
    ├── service/                    ← Business logic
    ├── controller/                 ← REST Controllers
    ├── dto/
    │   ├── request/                ← Request bodies (@Valid)
    │   └── response/               ← Response bodies
    └── exception/
        ├── BusinessException       ← 400 Bad Request
        ├── ResourceNotFoundException← 404 Not Found
        └── GlobalExceptionHandler  ← Bắt tất cả exceptions → JSON response
```

---

## API Endpoints

### Auth (Public — không cần JWT)
| Method | URL | Body | Mô tả |
|--------|-----|------|-------|
| POST | `/api/auth/register` | `{username, email, password}` | Đăng ký |
| POST | `/api/auth/login` | `{email, password}` | Đăng nhập → nhận JWT |

### Maps (Protected — cần `Authorization: Bearer <token>`)
| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/api/maps` | Danh sách lộ trình + tiến độ |
| GET | `/api/maps/{mapId}/days/current` | Ngày học hiện tại + checklists |
| PUT | `/api/maps/{userMapId}/access` | Cập nhật Active Map |

### Checklists
| Method | URL | Mô tả |
|--------|-----|-------|
| PUT | `/api/checklists/{checklistId}/toggle` | Toggle checkbox tick/untick |

### Notes
| Method | URL | Body | Mô tả |
|--------|-----|------|-------|
| POST | `/api/notes` | `{mapDayId, noteContent}` | Lưu note + hoàn thành ngày |
| GET | `/api/notes/{mapId}` | — | Lịch sử note của map |

### Todos (Global)
| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/api/todos?date=2026-06-25` | Todos theo ngày (mặc định hôm nay) |
| POST | `/api/todos` | Tạo todo mới |
| PUT | `/api/todos/{id}/toggle` | Toggle PENDING ↔ COMPLETED |
| DELETE | `/api/todos/{id}` | Xóa todo |

---

## Chạy Local

### 1. Chuẩn bị Database
```bash
# Option A: PostgreSQL local
createdb mmap_db

# Option B: Dùng Neon.tech (khuyên dùng)
# Vào neon.tech → tạo project → copy Connection String
```

### 2. Chạy Schema
```bash
psql -d mmap_db -f ../schema.sql
```

### 3. Set Environment Variables (IDE hoặc .env)
```bash
DATABASE_URL=jdbc:postgresql://localhost:5432/mmap_db
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
JWT_SECRET=mySecretKeyForMmapApplicationThatIsAtLeast256BitsLong!!
GEMINI_API_KEY=your_gemini_api_key
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Chạy
```bash
cd backend
mvn spring-boot:run
```

Server sẽ chạy tại `http://localhost:8080`

---

## Deploy lên Render.com (Free Tier)

### Bước 1 — Push lên GitHub
```bash
git init
git add .
git commit -m "Initial Spring Boot backend"
git remote add origin https://github.com/yourusername/mmap-backend
git push -u origin main
```

### Bước 2 — Tạo Web Service trên Render
1. Vào [render.com](https://render.com) → **New** → **Web Service**
2. Connect GitHub repo → chọn repo `mmap-backend`
3. Cấu hình:
   - **Runtime**: Java
   - **Build Command**: `mvn clean package -DskipTests`
   - **Start Command**: `java -jar target/mmap-backend-1.0.0.jar`

### Bước 3 — Environment Variables trên Render
```
DATABASE_URL          = jdbc:postgresql://ep-xxx.neon.tech/mmap_db?sslmode=require
DATABASE_USERNAME     = your_neon_user
DATABASE_PASSWORD     = your_neon_password
JWT_SECRET            = (random 64+ ký tự — dùng: openssl rand -base64 64)
GEMINI_API_KEY        = AIza...
CORS_ALLOWED_ORIGINS  = https://your-app.vercel.app
```

### Bước 4 — API URL
Render cấp cho bạn URL dạng: `https://mmap-backend.onrender.com`

> ⚠️ **Lưu ý Free Tier**: Server sẽ "ngủ" sau 15 phút không có request.
> Lần đầu vào sẽ mất 30-60 giây wake up. Hiển thị loading friendly cho user.

---

## Test nhanh với curl

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"dev","email":"dev@mmap.io","password":"Admin123"}'

# Login → lấy token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@mmap.io","password":"Admin123"}'

# Lấy danh sách maps (thay YOUR_TOKEN)
curl http://localhost:8080/api/maps \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tạo todo hôm nay
curl -X POST http://localhost:8080/api/todos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskContent":"Code bài tập OOP","targetDate":"2026-06-25","dueTime":null}'
```

---

## Ghi chú bảo mật quan trọng

| Điều cần làm | Lý do |
|---|---|
| JWT_SECRET phải >= 32 bytes | jjwt yêu cầu minimum key size cho HS256 |
| Không commit `.env` hay secrets | Dùng Render Environment Variables |
| BCrypt strength = 12 | Cân bằng bảo mật và tốc độ (~250ms/hash) |
| `ddl-auto: validate` trong production | Không cho Hibernate tự sửa schema |
| CORS restrict đúng origin | Chỉ cho phép domain Vercel của bạn |

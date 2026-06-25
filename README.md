# MMAP — Monorepo Structure

## Thư mục
```
soloweb/
├── frontend/          ← React + Vite (deploy Vercel)
├── backend/           ← Spring Boot (deploy Render.com)
├── schema.sql         ← PostgreSQL schema (chạy trên Neon.tech)
├── render.yaml        ← Render.com config
└── mmap_template.xlsx ← File Excel mẫu để import lộ trình
```

## Chạy local
```bash
# Backend
cd backend
mvn spring-boot:run

# Frontend  
cd frontend
npm run dev
```

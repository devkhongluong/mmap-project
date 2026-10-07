-- =====================================================================
-- SCHEMA.SQL — HỆ THỐNG QUẢN LÝ HỌC TẬP (LMS) & TO-DO
-- Database: PostgreSQL 15+
-- Chuẩn hóa: 3NF | 12 bảng
-- =====================================================================

-- Bật extension hỗ trợ UUID (nếu cần mở rộng sau này)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Xóa bảng nếu đã tồn tại (thứ tự từ phụ thuộc → gốc để tránh lỗi FK)
DROP TABLE IF EXISTS user_checklist_progress CASCADE;
DROP TABLE IF EXISTS daily_notes             CASCADE;
DROP TABLE IF EXISTS daily_todos             CASCADE;
DROP TABLE IF EXISTS user_day_progress       CASCADE;
DROP TABLE IF EXISTS user_skills             CASCADE;
DROP TABLE IF EXISTS user_maps               CASCADE;
DROP TABLE IF EXISTS map_skills              CASCADE;
DROP TABLE IF EXISTS map_day_checklists      CASCADE;
DROP TABLE IF EXISTS map_days               CASCADE;
DROP TABLE IF EXISTS learning_maps           CASCADE;
DROP TABLE IF EXISTS skills                  CASCADE;
DROP TABLE IF EXISTS users                   CASCADE;

-- =====================================================================
-- PHẦN 1: ENUMS
-- =====================================================================

CREATE TYPE user_map_status   AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE day_progress_status AS ENUM ('LOCKED', 'UNLOCKED', 'COMPLETED');
CREATE TYPE todo_status        AS ENUM ('PENDING', 'COMPLETED');

-- =====================================================================
-- PHẦN 2: MASTER TABLES (THỰC THỂ GỐC)
-- =====================================================================

-- 1. Bảng users (Tài khoản người dùng)
-- ─────────────────────────────────────
CREATE TABLE users (
    id            BIGSERIAL       PRIMARY KEY,
    username      VARCHAR(50)     NOT NULL,
    email         VARCHAR(100)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,               -- BCrypt hash, KHÔNG lưu plain text
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_username  UNIQUE (username),
    CONSTRAINT uq_users_email     UNIQUE (email),
    CONSTRAINT chk_users_email    CHECK  (email ~* '^[^@]+@[^@]+\.[^@]+$') -- Validate email format
);

COMMENT ON TABLE  users              IS 'Tài khoản người dùng hệ thống';
COMMENT ON COLUMN users.password_hash IS 'BCrypt hash (độ strength >= 12). Tuyệt đối không lưu plain-text.';

-- 2. Bảng skills (Danh mục kỹ năng / huy hiệu)
-- ──────────────────────────────────────────────
CREATE TABLE skills (
    id         SERIAL          PRIMARY KEY,
    skill_name VARCHAR(100)    NOT NULL,
    icon_url   VARCHAR(255),                              -- Nullable: link ảnh hoặc emoji

    CONSTRAINT uq_skills_name UNIQUE (skill_name)
);

COMMENT ON TABLE skills IS 'Danh mục kỹ năng/huy hiệu mà người dùng có thể mở khóa khi hoàn thành lộ trình';

-- 3. Bảng learning_maps (Tổng quan lộ trình học)
-- ─────────────────────────────────────────────────
CREATE TABLE learning_maps (
    id          SERIAL          PRIMARY KEY,
    title       VARCHAR(255)    NOT NULL,
    description TEXT,                                     -- Nullable
    total_days  INT             NOT NULL CHECK (total_days > 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  learning_maps           IS 'Template lộ trình học (dùng chung cho nhiều user)';
COMMENT ON COLUMN learning_maps.total_days IS 'Tổng số ngày học của lộ trình. Phải > 0.';

-- 4. Bảng map_days (Chi tiết từng ngày trong lộ trình)
-- ──────────────────────────────────────────────────────
CREATE TABLE map_days (
    id         BIGSERIAL       PRIMARY KEY,
    map_id     INT             NOT NULL REFERENCES learning_maps(id) ON DELETE CASCADE,
    phase_name VARCHAR(150)    NOT NULL,                  -- Ví dụ: "Phase 1: Java Core"
    week_name  VARCHAR(150),                              -- Nullable
    day_index  INT             NOT NULL CHECK (day_index > 0),
    day_title  VARCHAR(255)    NOT NULL,                  -- Dùng để vẽ node trên Tree Map

    -- Mỗi map chỉ có 1 ngày với thứ tự day_index nhất định
    CONSTRAINT uq_map_days_index UNIQUE (map_id, day_index)
);

CREATE INDEX idx_map_days_map_id ON map_days(map_id);

COMMENT ON TABLE  map_days           IS 'Mỗi hàng đại diện cho 1 ngày học trong 1 lộ trình cụ thể';
COMMENT ON COLUMN map_days.day_index IS 'Thứ tự ngày học, bắt đầu từ 1. Unique trong mỗi map.';

-- 5. Bảng map_day_checklists (Checklist ý chính cần học mỗi ngày)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE map_day_checklists (
    id                 BIGSERIAL       PRIMARY KEY,
    map_day_id         BIGINT          NOT NULL REFERENCES map_days(id) ON DELETE CASCADE,
    checkpoint_content VARCHAR(500)    NOT NULL,          -- Nội dung ngắn gọn của 1 checkpoint
    display_order      INT             NOT NULL DEFAULT 0 -- Thứ tự hiển thị trong ngày
);

CREATE INDEX idx_checklists_map_day_id ON map_day_checklists(map_day_id);

-- =====================================================================
-- PHẦN 3: PIVOT TABLES (BẢNG QUAN HỆ N-N)
-- =====================================================================

-- 6. Bảng map_skills (N-N: Lộ trình ↔ Kỹ năng)
-- ──────────────────────────────────────────────
-- Giải quyết: 1 Lộ trình cấp nhiều kỹ năng; 1 Kỹ năng có thể đạt qua nhiều lộ trình
CREATE TABLE map_skills (
    map_id   INT NOT NULL REFERENCES learning_maps(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id)        ON DELETE CASCADE,

    PRIMARY KEY (map_id, skill_id)                      -- Composite PK = UNIQUE constraint ngầm định
);

-- 7. Bảng user_maps (N-N: User ↔ Lộ trình — Lưu trạng thái học)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE user_maps (
    id               BIGSERIAL         PRIMARY KEY,
    user_id          BIGINT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    map_id           INT               NOT NULL REFERENCES learning_maps(id),
    status           user_map_status   NOT NULL DEFAULT 'IN_PROGRESS',
    last_accessed_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(), -- Dùng để xác định Active Map khi login
    started_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,                               -- NULL nếu chưa xong

    -- Mỗi user chỉ được đăng ký 1 map 1 lần
    CONSTRAINT uq_user_maps UNIQUE (user_id, map_id)
);

CREATE INDEX idx_user_maps_user_id ON user_maps(user_id);
CREATE INDEX idx_user_maps_last_accessed ON user_maps(last_accessed_at DESC);

COMMENT ON COLUMN user_maps.last_accessed_at IS 'Dùng ORDER BY DESC để tải Active Map mặc định khi user login';

-- 8. Bảng user_skills (N-N: User ↔ Kỹ năng đã mở khóa)
-- ───────────────────────────────────────────────────────
CREATE TABLE user_skills (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    skill_id     INT         NOT NULL REFERENCES skills(id),
    unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Mỗi user chỉ mở khóa 1 skill 1 lần
    CONSTRAINT uq_user_skills UNIQUE (user_id, skill_id)
);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);

-- 9. Bảng user_day_progress (N-N: User ↔ Ngày học — Sinh Tree Map)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE user_day_progress (
    id           BIGSERIAL           PRIMARY KEY,
    user_id      BIGINT              NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    map_day_id   BIGINT              NOT NULL REFERENCES map_days(id) ON DELETE CASCADE,
    status       day_progress_status NOT NULL DEFAULT 'LOCKED',
    completed_at TIMESTAMPTZ,                                          -- NULL nếu chưa COMPLETED

    -- Mỗi user chỉ có 1 bản ghi tiến độ cho mỗi ngày của mỗi map
    CONSTRAINT uq_user_day_progress UNIQUE (user_id, map_day_id)
);

CREATE INDEX idx_user_day_progress_user_id    ON user_day_progress(user_id);
CREATE INDEX idx_user_day_progress_map_day_id ON user_day_progress(map_day_id);

-- 10. Bảng user_checklist_progress (N-N: User ↔ Checklist items)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE user_checklist_progress (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
    checklist_id BIGINT      NOT NULL REFERENCES map_day_checklists(id) ON DELETE CASCADE,
    is_checked   BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),                    -- Lưu lần tick/untick cuối

    -- Mỗi user chỉ có 1 trạng thái cho mỗi checkbox
    CONSTRAINT uq_user_checklist_progress UNIQUE (user_id, checklist_id)
);

CREATE INDEX idx_checklist_progress_user_id    ON user_checklist_progress(user_id);
CREATE INDEX idx_checklist_progress_checklist  ON user_checklist_progress(checklist_id);

-- =====================================================================
-- PHẦN 4: TRANSACTION TABLES (DỮ LIỆU TƯƠNG TÁC ĐỘC LẬP)
-- =====================================================================

-- 11. Bảng daily_notes (Ghi chú bài học sau khi AI xác nhận)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE daily_notes (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    map_day_id   BIGINT      NOT NULL REFERENCES map_days(id) ON DELETE CASCADE,
    note_content TEXT        NOT NULL CHECK (length(note_content) >= 20), -- Tối thiểu 20 ký tự
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 1 user chỉ có 1 note cho 1 ngày (có thể UPDATE sau)
    CONSTRAINT uq_daily_notes UNIQUE (user_id, map_day_id)
);

CREATE INDEX idx_daily_notes_user_id   ON daily_notes(user_id);
CREATE INDEX idx_daily_notes_map_day   ON daily_notes(map_day_id);

COMMENT ON COLUMN daily_notes.note_content IS 'Nội dung do user tự gõ (paste bị chặn ở frontend). Tối thiểu 20 ký tự.';

-- 12. Bảng daily_todos (To-do List — Hoạt động độc lập, Global)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE daily_todos (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_content VARCHAR(255) NOT NULL CHECK (length(trim(task_content)) > 0),
    target_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Thay TIME → TIMESTAMPTZ để tránh lỗi timezone
    due_time     TIMESTAMPTZ,                                -- Nullable: nếu NULL = "Cả ngày"
    status       todo_status  NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_todos_user_date ON daily_todos(user_id, target_date);
CREATE INDEX idx_daily_todos_due_time  ON daily_todos(due_time ASC NULLS LAST);

COMMENT ON TABLE  daily_todos         IS 'To-do list toàn cục (Global), không bị thay đổi khi user đổi Map';
COMMENT ON COLUMN daily_todos.due_time IS 'TIMESTAMPTZ thay vì TIME để xử lý đúng timezone. NULL = cả ngày.';

-- =====================================================================
-- PHẦN 5: TRIGGER — TỰ ĐỘNG CẬP NHẬT updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho các bảng có cột updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_user_checklist_progress_updated_at
    BEFORE UPDATE ON user_checklist_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_daily_notes_updated_at
    BEFORE UPDATE ON daily_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_daily_todos_updated_at
    BEFORE UPDATE ON daily_todos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================================
-- PHẦN 6: SEED DATA MẪU (DEMO)
-- =====================================================================

-- Kỹ năng
INSERT INTO skills (skill_name, icon_url) VALUES
    ('Java Core',   '☕'),
    ('Spring Boot', '🍃'),
    ('PostgreSQL',  '🐘'),
    ('IELTS 7.0',   '📚'),
    ('Docker',      '🐋');

-- Lộ trình mẫu: Java → Spring Boot
INSERT INTO learning_maps (title, description, total_days) VALUES
    (
        'Lộ trình Java Core → Spring Boot 3',
        'Lộ trình tự học từ nền tảng Java OOP đến xây dựng REST API với Spring Boot 3 và PostgreSQL. Mục tiêu: sẵn sàng apply Junior Backend Developer.',
        98
    ),
    (
        'Luyện thi IELTS 7.0 (Reading & Listening)',
        'Chinh phục IELTS 7.0 trong 60 ngày với phương pháp học khoa học, tập trung vào Reading và Listening.',
        60
    );

-- Gán kỹ năng cho lộ trình
INSERT INTO map_skills (map_id, skill_id) VALUES
    (1, 1), -- Java Core
    (1, 2), -- Spring Boot
    (1, 3), -- PostgreSQL
    (2, 4); -- IELTS 7.0

-- Ngày học mẫu cho Map 1 (Java)
INSERT INTO map_days (map_id, phase_name, week_name, day_index, day_title) VALUES
    (1, 'Phase 1: Java Core', 'Tuần 1', 1, 'Nền tảng OOP & Class'),
    (1, 'Phase 1: Java Core', 'Tuần 1', 2, 'Kế thừa & Encapsulation'),
    (1, 'Phase 1: Java Core', 'Tuần 1', 3, 'Đa hình & Interface'),
    (1, 'Phase 1: Java Core', 'Tuần 1', 4, 'Collections Framework'),
    (1, 'Phase 1: Java Core', 'Tuần 1', 5, 'Stream API & Lambda');

-- Checklist cho Day 3
INSERT INTO map_day_checklists (map_day_id, checkpoint_content, display_order) VALUES
    (3, 'Hiểu khái niệm Polymorphism và cách JVM xử lý runtime dispatch',        1),
    (3, 'Phân biệt Abstract Class vs Interface và biết khi nào dùng cái nào',    2),
    (3, 'Implement Interface Comparable để sort Custom Object với Collections.sort()', 3),
    (3, 'Code bài tập: Xây dựng hệ thống quản lý động vật đa hình',              4);

-- =====================================================================
-- PHẦN 7: VIEWS HỮU ÍCH (CHO API TRUY VẤN NHANH)
-- =====================================================================

-- View: Tiến độ tổng quan của user trên từng map
CREATE VIEW v_user_map_summary AS
SELECT
    um.user_id,
    um.map_id,
    lm.title          AS map_title,
    lm.total_days,
    um.status         AS map_status,
    um.last_accessed_at,
    COUNT(udp.id)     AS days_unlocked,
    COUNT(CASE WHEN udp.status = 'COMPLETED' THEN 1 END) AS days_completed,
    ROUND(
        100.0 * COUNT(CASE WHEN udp.status = 'COMPLETED' THEN 1 END) / NULLIF(lm.total_days, 0),
        1
    )                 AS completion_pct
FROM user_maps um
JOIN learning_maps lm ON lm.id = um.map_id
LEFT JOIN map_days md ON md.map_id = lm.id
LEFT JOIN user_day_progress udp ON udp.map_day_id = md.id AND udp.user_id = um.user_id
GROUP BY um.user_id, um.map_id, lm.title, lm.total_days, um.status, um.last_accessed_at;

COMMENT ON VIEW v_user_map_summary IS 'Dashboard: Tiến độ tổng hợp của user trên từng lộ trình. Dùng cho API /api/me/maps';

-- View: Checklist của 1 ngày kèm trạng thái đã check chưa
CREATE VIEW v_day_checklist_status AS
SELECT
    mdc.id          AS checklist_id,
    mdc.map_day_id,
    md.map_id,
    mdc.checkpoint_content,
    mdc.display_order,
    ucp.user_id,
    COALESCE(ucp.is_checked, FALSE) AS is_checked,
    ucp.updated_at  AS checked_at
FROM map_day_checklists mdc
JOIN map_days md ON md.id = mdc.map_day_id
LEFT JOIN user_checklist_progress ucp ON ucp.checklist_id = mdc.id;

COMMENT ON VIEW v_day_checklist_status IS 'Trạng thái tick của từng checkbox trong ngày học. Dùng cho API /api/days/{dayId}/checklists';

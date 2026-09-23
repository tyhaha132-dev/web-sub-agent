# web-sub-agent

Hệ thống pipeline tự động sinh web app full-stack bằng 3 AI sub-agent:

| Agent    | Model                                      | Việc                                 |
| -------- | ------------------------------------------ | ------------------------------------ |
| Planner  | `opencode/nemotron-3-ultra-free`           | Lập kế hoạch hiện thực từ yêu cầu    |
| Coder    | `opencode/muse-spark-1.3-contributor-free` | Viết code frontend + backend         |
| Reviewer | `opencode/mimo-v2.6-flash-free`            | Review và quyết định approve / retry |

Stack chuẩn của app được sinh: **Next.js (frontend) + FastAPI (backend) + PostgreSQL (database)**.
Thiếu binary `opencode` thì pipeline tự fallback (kế hoạch mẫu, giữ code workspace, duyệt theo test) nên vẫn chạy được.

## Pipeline

```
STARTING → ANALYZING → ENVIRONMENT_SETUP → PLANNING → PLAN_VALIDATING
  → CODING → DATABASE_SETUP → TESTING → REVIEWING → DECIDING → COMPLETED
```

- `DECIDING` cho `approve` (xong) hoặc `retry` về `CODING` (tối đa `PIPELINE_MAX_ITERATIONS`).
- `ENVIRONMENT_SETUP`: copy `templates/` vào workspace (giữ file cũ để retry), `npm install` + `pip install`.
- `DATABASE_SETUP` (bắt buộc Postgres): tạo DB → chạy `*.sql` trong `backend/migrations` → seed demo.
- `TESTING`: `npm run build` frontend (với `NODE_ENV=production`) + kiểm tra Postgres.
- Mỗi workspace nằm ở `workspaces/<pipeline-id>/{frontend,backend}`, artifacts ở `artifacts/pipelines/`.

## Yêu cầu

- Node.js 22+, Python 3.12+ (có `pip`), PostgreSQL đang chạy
- Không bắt buộc: CLI `opencode` (có thì Planner/Coder/Reviewer chạy thật)

## Cài đặt & chạy

```powershell
copy .env.example .env   # sửa POSTGRES_PASSWORD cho đúng
npm install
npm start -- "<mô tả web>" --id <ten-web>
```

Ví dụ:

```powershell
npm start -- "English learning app" --id english-1
```

Lệnh hữu ích:

| Lệnh               | Ý nghĩa                                     |
| ------------------ | ------------------------------------------- |
| `npm run check`    | `typecheck` + unit test                     |
| `npm run db`       | Xem database (`words 50`, `quiz`, `tables`) |
| `npx tsx shots.ts` | Chụp màn hình kiểm tra UI                   |

## Cấu trúc

```
src/
  agents/          # planner / coder / reviewer + factory, service, executor
  application/     # create-pipeline.ts (nối DB thật, tester thật)
  artifacts/       # đọc/ghi artifact theo pipeline
  config/          # config.ts, models.ts (3 model), paths.ts
  contracts/       # pipeline, agent, project, database, tester, review
  errors/          # mã lỗi, phân loại, chính sách retry
  git/             # git + checkpoint
  infrastructure/  # environment, database (health, migrate, seed), services
  logging/         # logger, pipeline-logger, audit-logger
  orchestrator/    # state-machine, steps (9 step), iteration, runner
  planner/         # plan-schema, validator, acceptance-criteria
  project/         # analyzer, manifest, detectors, validator
  runtime/         # process-runner, opencode-runner, timeout
  tester/          # tester + checks (build/typecheck/lint/unit/api/db/...) + health
  workspace/       # manager, lock, cleaner, layout
templates/         # mẫu frontend Next.js + backend FastAPI + migration
workspaces/<id>/   # web được sinh ra (không commit)
tests/             # unit + integration + fixtures
docs/              # architecture, decisions, development
```

Nguyên tắc làm việc: xem `AGENTS.md` (feature mới làm trên branch, verify rồi mới merge).

---

## Trang web mẫu: EnglishFun (`workspaces/english-1`)

Web luyện tiếng Anh phong cách IELTS: hero gradient + thẻ kỹ năng màu sắc, tiếng Việt.

**Tính năng:**

- 🔤 **Từ điển** — tra Anh/Việt, lọc 6 chủ đề (education, environment, technology, health, society, general), phiên âm IPA, ví dụ, nút 🔊 phát âm
- 🃏 **Flashcards** — lật thẻ, trộn bài, đếm từ đã thuộc, nghe phát âm
- 🏆 **Quiz** — 10 câu trắc nghiệm ngẫu nhiên từ DB, thanh tiến trình, đúng/sai tô màu, tự lưu điểm
- 📈 **Tiến độ** — số lượt làm, % đúng trung bình, cấp độ, lịch sử điểm

**Dữ liệu:** 302 từ (20 cơ bản + 30 IELTS + ~152 theo list Oxford 3000), bảng `words`, `quiz_results`.

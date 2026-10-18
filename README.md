# 🤖 web-sub-agent

![Node](https://img.shields.io/badge/node-22-green)
![Python](https://img.shields.io/badge/python-3.12-blue)
![PostgreSQL](https://img.shields.io/badge/postgres-16-blue)
![Next.js](https://img.shields.io/badge/next.js-14-black)
![FastAPI](https://img.shields.io/badge/fastapi-0.115-teal)
![License](https://img.shields.io/badge/license-MIT-yellow)

> Pipeline tự động sinh **web app full-stack** bằng 3 AI sub-agent:
> **Planner** lập kế hoạch → **Coder** viết code → **Reviewer** duyệt và quyết định.

Stack chuẩn của app được sinh: **Next.js 14** (frontend) + **FastAPI** (backend) + **PostgreSQL** (database).

## 📑 Mục lục

- [Tính năng pipeline](#-tính-năng-pipeline)
- [Kiến trúc pipeline](#-kiến-trúc-pipeline)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
- [Tạo web mới](#-tạo-web-mới)
- [Web mẫu: EnglishFun](#-web-mẫu-englishfun)
  - [Điểm nổi bật & Ngôn ngữ thiết kế](#điểm-nổi-bật--ngôn-ngữ-thiết-kế)
  - [Danh sách trang & Chức năng](#danh-sách-trang--chức-năng)
  - [Chạy thử local](#chạy-thử-local)
- [API reference](#-api-reference)
- [Database & Migrations](#-database--migrations)
- [Scripts tiện ích](#-scripts-tiện-ích)
- [Kiến trúc bảo mật](#-kiến-trúc-bảo-mật)
- [Deploy hệ thống](#-deploy-hệ-thống)
- [Nguyên tắc làm việc](#-nguyên-tắc-làm-việc)

## ✨ Tính năng pipeline

- 🔄 Pipeline 10 trạng thái với **retry tự động** (`DECIDING` quay về `CODING`, tối đa `PIPELINE_MAX_ITERATIONS` lần).
- 🧠 3 role agent tách biệt, cấu hình model tập trung tại `src/config/models.ts`.
- 🛡️ Không có binary `opencode` vẫn chạy mượt mà nhờ cơ chế **fallback**: kế hoạch mẫu, giữ nguyên code workspace, duyệt tự động theo kết quả test.
- 🐘 Database chuẩn hóa: tự tạo DB → chạy migration `*.sql` theo thứ tự → seed dữ liệu khởi tạo.
- ✅ Gate kiểm thử tự động: build production Next.js + kiểm tra kết nối Postgres trước khi approve.
- 🪟 Tối ưu hóa trên môi trường Windows (`npm.cmd`, `shell: true`, `NODE_ENV=production` khi build).

## 🧩 Kiến trúc pipeline

```mermaid
flowchart LR
    A[STARTING] --> B[ANALYZING]
    B --> C[ENVIRONMENT_SETUP<br/>copy templates + install deps]
    C --> D[PLANNING<br/>planner agent]
    D --> E[PLAN_VALIDATING]
    E --> F[CODING<br/>coder agent]
    F --> G[DATABASE_SETUP<br/>migrate + seed]
    G --> H[TESTING<br/>build + db check]
    H --> I[REVIEWING<br/>reviewer agent]
    I --> J{DECIDING}
    J -->|approve| K([COMPLETED])
    J -->|retry| F
    J -->|fail| L([FAILED])
```

Mỗi workspace sinh ra nằm tại `workspaces/<pipeline-id>/{frontend,backend}`, artifact báo cáo lưu tại `artifacts/pipelines/`.

## 🚀 Bắt đầu nhanh

**Yêu cầu môi trường:** Node.js 22+, Python 3.12+ (`pip`), PostgreSQL đang chạy. Không bắt buộc cài CLI `opencode`.

```powershell
copy .env.example .env   # Cấu hình POSTGRES_PASSWORD và các biến cần thiết
npm install
npm run check            # Chạy typecheck + vitest unit test
```

## 🆕 Tạo web mới

```powershell
npm start -- "<mô tả web>" --id <ten-web>
# Ví dụ:
npm start -- "English learning app" --id english-1
```

Pipeline sẽ tự động scaffold code từ `templates/`, cài đặt dependencies, chạy migrate + seed DB, build production, chạy test suite và báo `COMPLETED` kèm đường dẫn workspace.

---

## 📚 Web mẫu: EnglishFun

> 🌐 **Bản demo trực tuyến:** [https://english-fun-omega.vercel.app](https://english-fun-omega.vercel.app/)

Web app học từ vựng và luyện thi tiếng Anh toàn diện (`workspaces/english-1`) được phát triển từ pipeline gốc và hoàn thiện đầy đủ tính năng: **862+ từ vựng học thuật & giao tiếp**, **43 bộ Flashcards 3D**, **515 câu hỏi luyện thi TOEIC Reading** biên soạn chuẩn format có giải thích chi tiết song ngữ Việt – Anh.

### Điểm nổi bật & Ngôn ngữ thiết kế

- ☁️ **Giao diện Cirrus SaaS Cloudscape**: Bầu trời xanh cerulean thanh lịch, mây SVG đa tầng trôi nhẹ nhàng, hệ thống thẻ trắng viền mỏng tinh tế (`slate`/`sky blue` tokens), thanh điều hướng capsule pill nổi (floating pill navbar) với hiệu ứng kính mờ (frosted glass).
- 🌓 **Chuyển đổi giao diện Sáng / Tối UIverse**: Tích hợp công tắc hoạt họa mặt trời & mặt trăng cao cấp (UIverse `strong-squid-82`), hiệu ứng 3D mượt mà, lưu trạng thái vào `localStorage`.
- 🔊 **Phát âm đa kênh**: Kết hợp Web Speech API (`en-US`) với tốc độ tùy chỉnh (0.75x – 1.25x) và audio URL trực tiếp từ Wiktionary media list.
- 🎨 **Hệ thống minh họa SVG độc quyền (`EnglishIllustration`)**: Minh họa vector sắc nét cho từng chủ đề (Apple, Book, Business, Tech, Travel, Lightbulb, Trophy, Earth...).
- 📱 **Responsive 100%**: Co giãn tối ưu cho mọi kích thước màn hình từ Desktop đến Mobile Drawer Menu.

### Danh sách trang & Chức năng

| Trang | Route | Chức năng nổi bật |
|---|---|---|
| 🏠 **Trang chủ** | `/` | • Landing page Cirrus SaaS với typography nổi bật và ambient cloudscape.<br/>• Mockup bảng điều khiển tương tác (Dashboard Window Mockup) hiển thị dữ liệu học thực tế: chuỗi học streak (`🔥`), độ chính xác quiz (`🎯`), thời gian học trung bình mỗi ngày (`⏱️`).<br/>• Thẻ 3D demo lật tương tác tự động/click phát âm chuẩn từ vựng mẫu.<br/>• Bộ đếm số liệu thực tế (862+ từ vựng, 43 bộ flashcards, 515 câu TOEIC, 7 chế độ luyện tập).<br/>• Marquee ribbon từ vựng, showcase 6 nhóm tính năng và lộ trình 4 bước học tập.<br/>• Truy cập mở tự do cho khách vãng lai không bắt buộc đăng nhập. |
| 📖 **Từ điển** | `/dictionary` | • **Public Access**: Tra cứu tự do cho cả khách vãng lai lẫn thành viên.<br/>• **Tra cứu đa tầng**: Ưu tiên tìm kiếm trong 862+ từ nội bộ DB → Tự động tra cứu mở rộng Wiktionary (nghĩa, IPA, audio mp3) → Oxford Learner's dự phòng → Panel liên kết tra cứu nhanh Cambridge/Oxford/Google.<br/>• Thẻ từ vựng sinh động với hình minh họa vector SVG, phát âm IPA chuẩn, định nghĩa, ví dụ in nghiêng và hộp mẹo nhớ `💡 Gợi ý & Mẹo nhớ`.<br/>• Thanh tìm kiếm tức thì, bộ lọc chuyên đề và tính năng đánh dấu từ yêu thích (Bookmark) lưu vào `localStorage`. |
| 🃏 **Flashcards 3D** | `/flashcards` | • **Toolbar điều khiển tinh tế**: Dropdown chọn nhanh 43 bộ Flashcards (20 từ/bộ), bộ lọc từ (`Tất cả` / `Chưa thuộc` / `Đã thuộc ⭐`), tùy chỉnh tốc độ phát âm (`0.75x`, `1.0x`, `1.25x`), xáo trộn từ (`🔀`) và nút gộp nhiều bộ (`🧩 Gộp bộ`).<br/>• **Thẻ 3D 2 mặt tương tác (`flip 180°`)**:<br/>  - *Mặt trước*: Từ tiếng Anh to rõ, nút loa 🔊, phiên âm IPA, loại từ, minh họa SVG.<br/>  - *Mặt sau*: Nghĩa tiếng Việt lớn, định nghĩa, hộp ví dụ ngữ cảnh (`✨ NGỮ CẢNH & CÂU VÍ DỤ`), hộp mẹo thi cử (`⚡ Mẹo ghi nhớ / Lưu ý đề thi`).<br/>  - *Phím tắt tiện lợi*: `Space` (lật thẻ), `P` (phát âm), `← / →` (chuyển thẻ).<br/>• **7 chế độ luyện tập toàn diện**:<br/>  1. *Lật thẻ 3D*: Ghi nhớ trực quan.<br/>  2. *Điền từ (Write Mode)*: Nhập từ theo nghĩa tiếng Việt, phím `Enter` kiểm tra & qua câu, hiển thị đầy đủ phiên âm và nghĩa khi làm bài.<br/>  3. *Nghe – chép (Listen Mode)*: Nghe phát âm gõ lại từ, tự động focus ô nhập và phím `Enter` qua câu.<br/>  4. *Ghép cặp (Match Mode)*: Trò chơi nối từ tiếng Anh với nghĩa tiếng Việt tương ứng.<br/>  5. *Card Blast vô hạn*: Trò chơi arcade gõ từ rơi phản xạ nhanh, 3 mạng, không giới hạn vòng chơi.<br/>  6. *Quiz nhanh*: Trắc nghiệm 4 lựa chọn tức thì.<br/>  7. *Danh sách từ*: Xem toàn bộ danh sách từ vựng, phiên âm và nghĩa trong bộ. |
| 🎓 **Đấu trường Quiz** | `/quiz` | • **Màn hình Setup**: Chọn chuyên đề kiểm tra hoặc toàn bộ kho từ vựng, tùy chọn số lượng câu hỏi (5, 10, 15, 20 câu).<br/>• **Đấu trường phản xạ 20s**: Đồng hồ đếm ngược 20 giây mỗi câu với cảnh báo đổi màu khi ≤5s, phát âm tự động và minh họa SVG.<br/>• Thao tác nhanh với phím tắt bàn phím: `1–4` hoặc `A–D` chọn đáp án, `Enter`/`Space` chuyển câu, `P` phát âm.<br/>• Hộp giải thích & mẹo ghi nhớ chuyên sâu (`.quiz-explain`) hiển thị chi tiết ngữ cảnh và phân tích từ sau khi chọn đáp án.<br/>• Màn hình kết quả (Score Banner) vinh danh thành tích, hiển thị tỷ lệ % chính xác và tự động tích lũy vào tiến độ cá nhân. |
| 📝 **Luyện thi TOEIC** | `/toeic` | • **515 câu hỏi TOEIC Reading** biên soạn chuẩn cấu trúc đề thi mới nhất:<br/>  - **Part 5** (Incomplete Sentences): 195 câu từ vựng & ngữ pháp.<br/>  - **Part 6** (Text Completion): 100 câu điền đoạn văn kèm bài đọc.<br/>  - **Part 7** (Reading Comprehension): 220 câu đọc hiểu đoạn đơn & đoạn kép thực tế.<br/>• **100% câu hỏi có giải thích chi tiết song ngữ Việt – Anh**.<br/>• Cơ chế làm bài linh hoạt: Đổi đáp án tự do ở câu hiện tại, nút Nộp bài sớm kèm hộp thoại xác nhận số câu đã làm / bỏ qua, review chi tiết bài thi và phân tích câu sai.<br/>• Quản lý mục tiêu điểm số và lưu trữ lịch sử thi theo từng Part. |
| 📁 **Thư mục cá nhân** | `/folders` | • Quản lý thư mục học tập cá nhân hóa, đồng bộ lên server theo tài khoản người dùng.<br/>• **Import từ vựng đa dạng**:<br/>  - Nhập thủ công qua 2 ô Anh – Việt hoặc cú pháp inline `word : meaning`.<br/>  - Import file Excel `.xlsx` hoặc `.csv` (dung lượng ≤2MB qua SheetJS) tự động nhận diện tiêu đề cột.<br/>  - Nhập cộng dồn thông minh (loại trừ từ trùng lặp, tối đa 500 từ/thư mục).<br/>  - Tự động làm giàu dữ liệu từ vựng (điền phiên âm IPA, nghĩa và lấy audio theo nhu cầu).<br/>• Luyện tập đầy đủ 7 chế độ học tập riêng cho từng thư mục. |
| 📊 **Tiến độ học tập** | `/progress` | • 4 thẻ chỉ số tóm tắt: Tổng số phút đã học, Số lượt luyện tập, Độ chính xác trung bình, Cấp độ học viên.<br/>• **Biểu đồ hoạt động 14 ngày (Daily Activity Chart)** trực quan với thống kê tổng, trung bình và kỷ lục ngày.<br/>• Bảng thống kê độ chính xác chi tiết theo từng hình thức luyện tập kèm thanh tiến độ đổi màu trực quan.<br/>• Danh sách lịch sử làm bài gần đây với điểm số, tỷ lệ % và thời gian chi tiết.<br/>• Cơ chế **Heartbeat (60s/nhịp)** tự động theo dõi thời gian học thực tế của người dùng (`/api/activity`). |
| 🏆 **Bảng xếp hạng** | `/leaderboard` | • Tôn vinh top người học xuất sắc nhất theo công thức: `Điểm = Thời gian học (phút) × Tỷ lệ chính xác`.<br/>• Bảo mật danh tính: Không làm lộ email hay thông tin nhạy cảm của học viên. |
| 👤 **Tài khoản & Bảo mật** | `/account` | • Đăng ký tài khoản mới (xác thực email duy nhất).<br/>• Đăng nhập bảo mật (mã hóa mật khẩu bcrypt cost 10, chống timing attack, thời gian phản hồi <500ms).<br/>• Quên mật khẩu qua mã OTP 6 số gửi về email (hỗ trợ Gmail SMTP SSL port 465 hoặc SendGrid API chạy nền).<br/>• Đổi mật khẩu tiện lợi với giao diện Cirrus SaaS và cảnh báo an toàn phiên làm việc.<br/>• Cơ chế chịu tải cold-start thông minh (tự động đánh thức backend Render khi mở form đăng nhập). |

### Chạy thử local

**Terminal 1 — Backend (FastAPI):**
```powershell
cd workspaces/english-1/backend
# Tự động đọc cấu hình DB từ .env của project hoặc gán biến môi trường:
$env:POSTGRES_PASSWORD='<mat-khau-postgres>'
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (Next.js):**
```powershell
cd workspaces/english-1/frontend
npm run dev -- --port 3000
```

Truy cập `http://localhost:3000` để trải nghiệm đầy đủ giao diện và tính năng.

---

## 🔌 API reference

Base URL: `http://localhost:8000`

### 1. Xác thực & Tài khoản (`/api/auth/*`)
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| POST | `/api/auth/register` | ❌ | Đăng ký tài khoản mới (username, email, password) |
| POST | `/api/auth/login` | ❌ | Đăng nhập, trả về Bearer session token (bcrypt cost 10) |
| GET  | `/api/auth/me` | ✅ | Lấy thông tin tài khoản đang đăng nhập |
| POST | `/api/auth/logout` | ✅ | Đăng xuất và hủy token phiên hiện tại |
| POST | `/api/auth/change-password` | ✅ | Đổi mật khẩu tài khoản |
| POST | `/api/auth/forgot` | ❌ | Gửi mã OTP 6 số đặt lại mật khẩu qua email (chạy nền) |
| POST | `/api/auth/reset` | ❌ | Xác thực mã OTP và cập nhật mật khẩu mới |

### 2. Từ vựng & Tra cứu (`/api/words/*`, `/api/topics`)
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| GET | `/api/words` | ❌ (tùy chọn) | Danh sách từ vựng hỗ trợ phân trang (`limit`, `offset`) và lọc `topic` |
| GET | `/api/words/search` | ❌ (tùy chọn) | Tìm kiếm từ vựng theo từ tiếng Anh, tiếng Việt hoặc IPA |
| GET | `/api/words/lookup` | ❌ (tùy chọn) | Tra từ đa tầng: DB → Wiktionary (nghĩa, IPA, audio) → Oxford |
| GET | `/api/words/audio` | ❌ (tùy chọn) | Lấy URL audio phát âm trực tiếp từ Wiktionary media list |
| GET | `/api/topics` | ❌ (tùy chọn) | Danh sách các chuyên đề từ vựng kèm số lượng từ tương ứng |

### 3. Luyện tập & Thống kê (`/api/quiz/*`, `/api/progress`, `/api/activity`, `/api/leaderboard`)
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| GET  | `/api/quiz/random` | ❌ (tùy chọn) | Sinh bộ câu hỏi trắc nghiệm ngẫu nhiên hoặc theo chuyên đề (`count` 1–50) |
| GET  | `/api/progress` | ✅ | Thống kê tiến độ: tổng phút, độ chính xác, biểu đồ 14 ngày, lịch sử làm bài |
| POST | `/api/progress` | ✅ | Lưu kết quả luyện tập (`quiz`, `write`, `listen`, `blast`), thời lượng làm bài |
| POST | `/api/activity` | ✅ | Nhịp tim Heartbeat ghi nhận thời gian học thực tế (1–120s/nhịp) |
| GET  | `/api/leaderboard` | ✅ | Bảng xếp hạng học tập vinh danh top thành viên |

### 4. Luyện thi TOEIC Reading (`/api/toeic/*`)
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| GET  | `/api/toeic/levels` | ✅ | Danh sách các Part và cấu trúc đề thi TOEIC |
| GET  | `/api/toeic/reading` | ✅ | Lấy câu hỏi Part 5, Part 6, Part 7 kèm bài đọc (`passage`) |
| POST | `/api/toeic/submit` | ✅ | Nộp bài thi, chấm điểm, hỗ trợ nộp sớm, phân tích câu sai |
| GET  | `/api/toeic/attempts` | ✅ | Lịch sử các lượt làm bài thi TOEIC |
| GET/POST | `/api/toeic/profile` | ✅ | Xem hoặc cập nhật mục tiêu điểm số và chuỗi học tập TOEIC |

### 5. Thư mục từ vựng cá nhân (`/api/folders/*`)
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| GET    | `/api/folders` | ✅ | Lấy danh sách tất cả thư mục từ vựng của người dùng |
| PUT    | `/api/folders/{key}` | ✅ | Tạo mới hoặc cập nhật nội dung từ vựng trong thư mục |
| DELETE | `/api/folders/{key}` | ✅ | Xóa thư mục từ vựng |

### 6. Trạng thái hệ thống
| Method | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|---|---|:---:|---|
| GET | `/health` | ❌ | Kiểm tra sức khỏe dịch vụ và kết nối PostgreSQL (an toàn, không lộ secret) |

---

## 🐘 Database & Migrations

- Hệ thống quản lý cơ sở dữ liệu qua **50 file migration chuẩn SQL** (`workspaces/english-1/backend/migrations/*.sql`), thực thi tuần tự và idempotent.
- **Các bảng dữ liệu chính:**
  - `words`: Kho 862+ từ vựng học thuật & giao tiếp, phiên âm IPA chuẩn Mỹ, ví dụ ngữ cảnh, chuyên đề.
  - `quiz_results`: Lịch sử làm bài trắc nghiệm và các chế độ luyện tập (`quiz`, `write`, `listen`, `blast`) kèm thời lượng.
  - `users`: Tài khoản người dùng, email duy nhất, mật khẩu mã hóa bcrypt cost 10.
  - `user_sessions`: Quản lý phiên đăng nhập, `token_hash` được đánh index tối ưu truy vấn.
  - `password_resets`: Mã OTP quên mật khẩu 6 số (bảo mật bằng `secrets.randbelow`, giới hạn 5 lần thử, hết hạn sau 15 phút).
  - `user_folders`: Lưu trữ thư mục từ vựng cá nhân của từng người dùng trên máy chủ.
  - `toeic_questions`: 515 câu hỏi TOEIC Reading chuẩn format (Part 5, 6, 7), liên kết đoạn văn `passage_id`, giải thích song ngữ Việt – Anh.
  - `toeic_attempts`: Lịch sử thi TOEIC (điểm số, số câu đã trả lời, danh sách câu sai, thời lượng thi).
  - `toeic_profile`: Hồ sơ TOEIC (mục tiêu điểm, streak học tập).
  - `study_activity`: Tích lũy thời gian học thực tế theo từng ngày phục vụ biểu đồ và bảng xếp hạng.
- **Tối ưu hóa chỉ mục (Indexes):** Đã đánh index các trường truy vấn tần suất cao (`user_sessions.token_hash`, `words.topic`, `toeic_questions.part`).
- **Cơ chế driver kết nối kép:** Mặc định sử dụng `psycopg2-binary`, tự động chuyển sang `pg8000` thuần Python nếu máy tính local bị chặn DLL qua Application Control.

---

## 🛠️ Scripts tiện ích

| Lệnh | Ý nghĩa & Mô tả |
|---|---|
| `npm start` | Khởi chạy pipeline AI tự động sinh ứng dụng web mới |
| `npm run check` | Chạy bộ kiểm tra kép: `tsc --noEmit` (typecheck) + `vitest` unit test |
| `npm run test` | Chạy bộ unit tests với Vitest |
| `npm run db` | Kiểm tra nhanh cơ sở dữ liệu: `npm run db` (tổng quan), `npm run db -- words 50`, `npm run db -- tables` |
| `npm run db:migrate` | Chạy migration SQL cho workspace bất kỳ (hỗ trợ DB Cloud với `POSTGRES_SSL=true`) |
| `npx tsx shots.ts` | Kịch bản kiểm thử E2E tự động chụp màn hình toàn bộ các routes và dark mode bằng headless Chromium |

---

## 🔒 Kiến trúc bảo mật

- 🔑 **Quản lý bí mật:** Toàn bộ secrets nằm trong `.env` (đã gitignore tuyệt đối); repo chỉ chứa `.env.example`.
- 🛡️ **Bảo vệ mật khẩu:** Sử dụng bcrypt với `rounds = 10` (tối ưu hóa thời gian xử lý đăng nhập 47ms thay vì 400ms+, giảm tải CPU Render). Cơ chế dummy-hash bảo vệ chống timing attack khi tài khoản không tồn tại.
- ✉️ **Bảo mật luồng OTP:** Mã xác nhận ngẫu nhiên an toàn qua `secrets.randbelow`, cooldown 60 giây chống spam email bombing, hủy hiệu lực ngay sau khi sử dụng hoặc khi quá 5 lần nhập sai. Gửi email qua luồng nền `BackgroundTasks` chống nghẽn I/O.
- 🚪 **Phân quyền & Ranh giới API:**
  - Route công khai an toàn: `/`, `/dictionary`, `/health` phục vụ khách vãng lai ở chế độ đọc mà không yêu cầu token.
  - Route ghi và thông tin cá nhân: 100% bảo vệ bằng Bearer token (`Depends(get_current_user)`), trả mã `401 Unauthorized` ngay khi thiếu hoặc sai token.
- 💉 **Phòng chống tấn công:** Mọi câu lệnh SQL đều được parameterized 100%; frontend Next.js không sử dụng `dangerouslySetInnerHTML` hay `eval`.
- 🌐 **CORS & Headers:** Cấu hình nguồn gốc CORS nghiêm ngặt (`FRONTEND_URL`), bổ sung `x-content-type-options: nosniff` và `x-frame-options: DENY`.

---

## ☁️ Deploy hệ thống

Triển khai production với bộ ba dịch vụ miễn phí tối ưu: **Neon** (PostgreSQL) + **Render** (FastAPI Backend) + **Vercel** (Next.js Frontend).

```mermaid
flowchart LR
    V[Vercel<br/>Next.js 14 Frontend] -->|HTTPS API Requests| R[Render<br/>FastAPI Backend]
    R -->|SSL Connection| N[(Neon Serverless<br/>PostgreSQL 16)]
```

1. **Neon (Database):**
   - Tạo database instance trên Neon.
   - Chạy migration toàn bộ 50 files SQL lên cloud:
     ```powershell
     $env:DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
     npm run db:migrate -- workspaces/english-1
     ```
2. **Render (FastAPI Backend):**
   - Tạo Web Service, liên kết repository.
   - Cấu hình: Root Directory `workspaces/english-1/backend`, Build Command `pip install -r requirements.txt`, Start Command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   - Biến môi trường: `DATABASE_URL` (kết nối Neon), `FRONTEND_URL` (domain Vercel), và cấu hình gửi mail `SMTP_USER` / `SMTP_PASS` hoặc `SENDGRID_API_KEY`.
3. **Vercel (Next.js Frontend):**
   - Import project trên Vercel, Root Directory chọn `workspaces/english-1/frontend`.
   - Biến môi trường: `NEXT_PUBLIC_API_URL` trỏ tới URL Web Service của Render.
4. **Cơ chế giữ ấm (Keep-warm):**
   - GitHub Actions workflow (`.github/workflows/warmup.yml`) ping `/health` định kỳ mỗi 10 phút để hạn chế cold-start của Render free tier.

---

## 📏 Nguyên tắc làm việc

Mọi đóng góp và phát triển tuân thủ quy chuẩn trong [AGENTS.md](file:///d:/project/web-sub-agent/AGENTS.md):
- Chức năng mới hoặc sửa lỗi bắt buộc thực hiện trên **branch riêng biệt**, không can thiệp trực tiếp nhánh `main`.
- Đảm bảo kiểm thử nghiêm ngặt tại local (`npm run check` pass, typecheck 0 lỗi, API 200, E2E không lỗi) trước khi merge vào `main` và push lên GitHub.

---

> 🚀 *Dự án được xây dựng và phát triển với pipeline tự động hóa `web-sub-agent` · Planner / Coder / Reviewer.*

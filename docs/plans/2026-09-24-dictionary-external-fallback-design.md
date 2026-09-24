# Design: Dictionary external fallback (Free Dictionary API, no cache)

Date: 2026-09-24 | Branch: `feature/dictionary-external-fallback` | Status: approved 2/3, implement on branch, test before push.

## 1. Kiến trúc (đã chốt)

- Thêm `GET /api/words/lookup?en=<từ đơn>` ở backend (`workspaces/english-1/backend/app/main.py`), dùng stdlib `urllib` (không thêm dep mới để Render không phải cài thêm).
- Luồng: 1) tìm DB exact match `WHERE en ILIKE :e` (không `%`, case-insensitive). Có → `{source:'db', words:[...]}`. 2) Nếu trắng và `q` khớp `^[A-Za-z][A-Za-z\-']*$` → fetch `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` timeout 8s, parse entry đầu tiên: phonetic text đầu tiên khác rỗng, audio đầu tiên khác rỗng,flatten meanings lấy tối đa 3 definitions `{pos, definition, example}`, `sourceUrls[0]`. Trả `{source:'external', words:[], external:{...}}`. 3) 404/timeout/lỗi parse → `{source:'none', words:[], external:null}`. Không ghi DB (user chốt Không cache).
- Frontend giữ `/api/words/search` như cũ. `dictionary/page.tsx` chỉ gọi `lookupWord(q)` khi search DB trả rỗng và `q` là 1 từ tiếng Anh. Không gọi khi có topic filter? Có gọi nhưng `q` rỗng thì bỏ qua.

## 2. UI + lỗi (đã chốt)

- `lib/api.ts`: thêm `ExternalMeaning`, `ExternalEntry`, `LookupResult`, `lookupWord(en)`.
- `page.tsx`: thêm state `external`, `lookupLoading`. `run()` reset external trước mỗi lần tra; nếu DB có kết quả thì hiện DB; nếu rỗng + từ đơn thì hiện "Đang tra nguồn mở rộng…" rồi card riêng: badge `Nguồn mở rộng`, IPA text, `<audio controls>` khi có audio thật + nút 🔊 fallback `speak()`, list nghĩa Anh + ví dụ, link Wiktionary. Lỗi/timeout/404 giữ thông báo "Không tìm thấy" như cũ.
- Test: `npm run check` root xanh + `tsc --noEmit` frontend + chạy local backend/frontend + `npx tsx shots.ts` chụp trang dictionary với từ DB có, từ ngoài DB (vd `serendipity`), từ vô nghĩa. Không migration (không đổi schema).

## 3. Không làm (YAGNI)

- Không cache vào DB, không cột mới, không nút Tra mở rộng thủ công, không gộp fallback vào `/search` (giữ search nhanh, tránh external làm chậm list).

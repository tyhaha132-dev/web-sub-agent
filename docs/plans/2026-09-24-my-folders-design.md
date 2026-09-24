# Design: My Folders (import từ vựng) + theme sáng/tối

Date: 2026-09-24 | Status: user đã duyệt 4 phần (kiến trúc, làm giàu, UI/test, theme 2 phase).

## Quyết định đã chốt

1. Thư mục lưu `localStorage` theo máy (`englishfun_folders_v1`), không login, không đụng backend/DB.
2. "AI lọc" = tách từ + loại trùng/rác + làm giàu qua `/lookup` có sẵn (DB/Wiktionary), không LLM.
3. Đọc `.xlsx`/`.csv` ở frontend bằng SheetJS (thêm dep frontend).
4. Thư mục dùng để luyện tập + tiến độ riêng từng thư mục (trạng thái từ mới/đang học/đã nhớ).
5. Thêm toggle sáng/tối toàn web, lưu lựa chọn vào localStorage.

## Phase 1 — theme toggle (làm trước, branch riêng)

- Chuyển `frontend/app/globals.css` sang biến CSS (`--bg`, `--panel`, `--text`, ...),
  thêm `[data-theme="dark"]` override; nút toggle ở navbar + `ThemeProvider`
  (đọc localStorage, mặc định sáng). Mọi trang hiện tại giữ nguyên giao diện sáng.

## Phase 2 — thư mục của bạn (branch riêng)

- Route `/folders` (danh sách: tên, số từ, % đã nhớ) + `/folders/[id]` (xem/xóa từ,
  nút Luyện tập). Modal Import 2 tab: Nhập tay (textarea, tối đa 500 từ) và
  Tải file Excel (SheetJS, cột 1 = từ, cột 2 = nghĩa nếu có, file ≤2MB, sheet đầu).
- Model: `Folder {id, name, createdAt, words: [{en, vi, ipa, example,
  source: 'db'|'external'|'pending'|'unknown'}], wordStatus: {en: 'new'|'learning'|'known'},
  stats: {attempts, correct, total}}`. CRUD thư mục + xóa từ; mất dữ liệu khi đổi
  máy/xóa cache (ghi rõ trong UI).
- Làm giàu lười: lưu ngay sau "Kiểm tra danh sách", từng từ `pending` gọi `/lookup`
  khi mở thư mục/luyện tập, cache vào localStorage; `unknown` dùng nút loa.
- Luyện tập qua adapter `Word[]`: flashcard tái dùng UI lật thẻ, quiz sinh câu hỏi
  local (cần ≥4 từ). Tiến độ local riêng từng thư mục.

## Kiểm thử (mỗi phase)

- `npm run check` + `tsc` frontend + chạy local: import tay/xlsx/csv thật,
  screenshot (danh sách, modal, chi tiết, luyện tập, cả 2 theme), không lỗi trang.
- Không migration, không env mới, backend giữ nguyên 100%.

# Nguyên tắc làm việc

## Quy trình thêm chức năng (branch workflow)

1. Mọi chức năng mới/sửa đổi hành vi phải làm trên **branch mới**, KHÔNG sửa trực tiếp nhánh chính (`main`/`master`).
2. Đặt tên branch rõ ràng theo chức năng, ví dụ: `feature/dictionary-search`, `fix/footer-layout`.
3. Trên branch: hiện thực → `typecheck` + `test` pass → chạy thử thực tế (pipeline `COMPLETED`, chụp màn hình nếu là UI).
4. Chỉ **merge vào nhánh chính khi chức năng đã được xác minh hoạt động**. Nếu lỗi, sửa trên branch hoặc bỏ branch.
5. Sau merge: chạy lại `npm run check` trên nhánh chính để xác nhận.

## Các nguyên tắc khác

- Có gì chưa rõ thì **hỏi trước khi đoán**.
- Báo cáo ngắn gọn, dựa trên kết quả chạy thật (log, test, screenshot), không suy đoán.
- Secret (`.env`, mật khẩu) không bao giờ commit; `.env` đã nằm trong `.gitignore`.

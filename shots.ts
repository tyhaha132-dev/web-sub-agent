import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const SHELL =
  "C:\\Users\\Taitaiquackquack\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1243\\chrome-headless-shell-win64\\chrome-headless-shell.exe";
const BASE = process.env.APP_URL ?? "http://localhost:3005";
const OUT = "workspaces/english-1/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: SHELL });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("404") && !m.text().includes("Failed to load resource")) {
    errors.push(m.text().slice(0, 200));
  }
});

// 1. Landing Page (Light Mode)
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/home.png` });
await page.screenshot({ path: `${OUT}/home-full.png`, fullPage: true });
console.log("shot home (light mode full) ok");

// 2. Landing Page (Dark Mode)
await page.waitForSelector(".theme-toggle", { timeout: 10000 });
await page.click(".theme-toggle >> nth=0");
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/home-dark.png`, fullPage: true });
await page.click(".theme-toggle >> nth=0"); // Chuyển lại sáng
console.log("shot home-dark ok");

// 3. Từ điển Tra cứu công khai (Public Landing Page - Không yêu cầu đăng nhập trước)
await page.goto(BASE + "/dictionary", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/dictionary.png` });
await page.screenshot({ path: `${OUT}/dictionary-full.png`, fullPage: true });
console.log("shot dictionary public landing ok");

// Chế độ tối trên trang từ điển
try {
  await page.click(".theme-toggle >> nth=0");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/dictionary-dark.png`, fullPage: true });
  await page.click(".theme-toggle >> nth=0");
  console.log("shot dictionary-dark ok");
} catch (e) {
  console.log("dict theme toggle note:", e);
}

// Thử tìm kiếm từ "apple"
try {
  const searchInput = await page.$('input[placeholder*="Nhập từ"]');
  if (searchInput) {
    await searchInput.fill("apple");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/dictionary-search.png` });
    console.log("shot dictionary-search ok");
  }
} catch (e) {
  console.log("dict search note:", e);
}

// 4. Đăng ký tài khoản test để kiểm thử các route cần auth
const stamp = String(Date.now()).slice(-5);
const uname = `shot${stamp}`;
await page.goto(BASE + "/flashcards", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
try {
  const regBtn = await page.$("text=📝 Đăng ký");
  if (regBtn) {
    await regBtn.click();
    await page.fill('input[placeholder="vd: hoangtai"]', uname);
    await page.fill('input[placeholder="vd: ban@gmail.com"]', `${uname}@example.com`);
    await page.fill('input[placeholder="Ít nhất 4 ký tự"]', "Pass1234");
    await page.fill('input[placeholder="Nhập lại mật khẩu"]', "Pass1234");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log("registered test account ok:", uname);
  }
} catch (e) {
  console.log("auth test note:", e);
}

// 5. Flashcards 3D Page Test & Screenshots
await page.goto(BASE + "/flashcards", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector(".flash3d", { timeout: 15000 });
await page.waitForTimeout(800);

await page.screenshot({ path: `${OUT}/flashcards-3d-front.png` });
await page.screenshot({ path: `${OUT}/flashcards-3d-full.png`, fullPage: true });
console.log("shot flashcards-3d-front & full ok");

try {
  await page.click(".flash3d");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/flashcards-3d-back.png` });
  console.log("shot flashcards-3d-back ok");
} catch (e) {
  console.log("flash3d flip note:", e);
}

// 6. Test Quiz Đấu trường phản xạ 20s chuẩn bio-app
await page.goto(BASE + "/quiz", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/quiz-setup.png` });

try {
  await page.click(".theme-toggle >> nth=0");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/quiz-setup-dark.png` });
  await page.click(".theme-toggle >> nth=0");
} catch (e) {
  console.log("quiz theme toggle note:", e);
}

// Chọn 5 câu hỏi để hoàn thành nhanh
const fiveBtn = await page.$("text=5 câu");
if (fiveBtn) await fiveBtn.click();
await page.waitForTimeout(400);

const startQuizBtn = (await page.$("text=Bắt đầu làm bài thi ngay")) || (await page.$("text=Bắt đầu ngay"));
if (startQuizBtn) {
  await startQuizBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/quiz-q1.png` });

  // Trả lời câu 1
  const firstChoice = await page.$(".choice-btn");
  if (firstChoice) {
    await firstChoice.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/quiz-answered.png` });
  }

  // Làm hết 5 câu để ra màn hình kết quả
  for (let q = 0; q < 5; q++) {
    try {
      const nextBtn = (await page.$("text=Câu tiếp theo")) || (await page.$("text=Xem kết quả"));
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
      const choice = await page.$(".choice-btn:not([disabled])");
      if (choice) {
        await choice.click();
        await page.waitForTimeout(500);
      }
    } catch {
      break;
    }
  }

  // Click nút xem kết quả cuối cùng nếu còn
  const finalBtn = await page.$("text=Xem kết quả");
  if (finalBtn) {
    await finalBtn.click();
    await page.waitForTimeout(800);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/quiz-done.png` });
  await page.screenshot({ path: `${OUT}/quiz-play.png` });
  console.log("shot quiz setup, q1, answered, done ok");
}

// 7. Test trang Tiến độ học tập (Progress Page chuẩn bio-app)
await page.goto(BASE + "/progress", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

await page.screenshot({ path: `${OUT}/progress.png` });
await page.screenshot({ path: `${OUT}/progress-full.png`, fullPage: true });
console.log("shot progress & progress-full ok");

// 8. Các routes chính còn lại
for (const route of ["/toeic", "/folders"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const name = route.slice(1);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${route} ok`);
}

// 9. Test trang Tài khoản & Đổi mật khẩu (Account Page Cirrus SaaS)
await page.goto(BASE + "/account", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/account.png` });
try {
  await page.click(".theme-toggle >> nth=0");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/account-dark.png` });
  await page.click(".theme-toggle >> nth=0");
} catch {}
console.log("shot account & account-dark ok");

// 10. Quay lại home khi đã đăng nhập (kiểm tra streak, accuracy, real progress stats, logout button)
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/home-authenticated.png` });
await page.screenshot({ path: `${OUT}/home-authenticated-full.png`, fullPage: true });
console.log("shot home-authenticated ok");

console.log("PAGE ERRORS:", errors.length === 0 ? "none" : errors);
await browser.close();

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

// 3. Đăng ký tài khoản test để vượt qua AuthGate
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

// 4. Flashcards 3D Page Test & Screenshots (Khi đã authenticated)
await page.goto(BASE + "/flashcards", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector(".flash3d", { timeout: 15000 });
await page.waitForTimeout(800);

// Chụp mặt trước 3D Flashcard
await page.screenshot({ path: `${OUT}/flashcards-3d-front.png` });
await page.screenshot({ path: `${OUT}/flashcards-3d-full.png`, fullPage: true });
console.log("shot flashcards-3d-front & full ok");

// Thử click lật thẻ sang mặt sau
try {
  await page.click(".flash3d");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/flashcards-3d-back.png` });
  console.log("shot flashcards-3d-back ok");
} catch (e) {
  console.log("flash3d flip note:", e);
}

// Chế độ tối trên trang flashcards
try {
  await page.click(".theme-toggle >> nth=0");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/flashcards-3d-dark.png` });
  await page.click(".theme-toggle >> nth=0"); // Chuyển lại sáng
  console.log("shot flashcards-3d-dark ok");
} catch (e) {
  console.log("flash3d theme toggle note:", e);
}

// Thử click nút "Thẻ tiếp theo ›"
try {
  await page.click("text=Thẻ tiếp theo ›");
  await page.waitForTimeout(600);
  console.log("click next flashcard ok");
} catch (e) {
  console.log("flash3d next note:", e);
}

// 5. Các routes chính khác
for (const route of ["/dictionary", "/quiz", "/progress", "/toeic", "/folders"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const name = route.slice(1);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${route} ok`);
}

// 6. Tương tác từ điển & quiz sau login
await page.goto(BASE + "/dictionary", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const searchInput = await page.$('input[placeholder*="Nhập từ"]');
if (searchInput) {
  await searchInput.fill("learn");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/dictionary-search.png` });
  console.log("shot dictionary-search ok");
}

await page.goto(BASE + "/quiz", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const startQuizBtn = await page.$("text=Bắt đầu ngay");
if (startQuizBtn) {
  await startQuizBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/quiz-play.png` });
  console.log("shot quiz-play ok");
}

// 7. Quay lại home khi đã đăng nhập
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/home-authenticated.png` });
console.log("shot home-authenticated ok");

console.log("PAGE ERRORS:", errors.length === 0 ? "none" : errors);
await browser.close();

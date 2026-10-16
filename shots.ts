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

// 3. Test interactive 3D demo flashcard pronunciation button
try {
  await page.click(".demo-card .speak-btn >> nth=0");
  await page.waitForTimeout(500);
  console.log("click 3D demo flashcard speak ok");
} catch (e) {
  console.log("demo flashcard speak skip:", e);
}

// 4. Các routes chính
for (const route of ["/dictionary", "/flashcards", "/quiz", "/progress", "/toeic", "/folders"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const name = route.slice(1);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${route} ok`);
}

// 5. Thử đăng ký/đăng nhập tài khoản test
const stamp = String(Date.now()).slice(-5);
const uname = `shot${stamp}`;
await page.goto(BASE + "/dictionary", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
// Nếu thấy form đăng nhập/đăng ký
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

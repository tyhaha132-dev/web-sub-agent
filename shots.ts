import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const SHELL =
  "C:\\Users\\Taitaiquackquack\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1243\\chrome-headless-shell-win64\\chrome-headless-shell.exe";
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const OUT = "workspaces/english-1/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: SHELL });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});

for (const route of ["/", "/dictionary", "/flashcards", "/quiz", "/progress"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const name = route === "/" ? "home" : route.slice(1);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${route} ok`);
}

// tương tác thử: search từ điển + bắt đầu quiz
await page.goto(BASE + "/dictionary", { waitUntil: "networkidle" });
await page.fill('input[placeholder*="Nhập từ"]', "learn");
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/dictionary-search.png` });
console.log("shot dictionary-search ok");

await page.goto(BASE + "/quiz", { waitUntil: "networkidle" });
await page.click("text=Bắt đầu ngay");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/quiz-play.png` });
console.log("shot quiz-play ok");

console.log("PAGE ERRORS:", errors.length === 0 ? "none" : errors);
await browser.close();

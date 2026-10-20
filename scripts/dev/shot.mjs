import { chromium } from "@playwright/test";
const out = process.argv[2];
const pages = process.argv.slice(3);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const path of pages) {
  await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "networkidle" });
  const name = path.replace(/[^a-z0-9]+/gi, "_") || "home";
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(path, "scrollWidth", w);
}
await b.close();

#!/usr/bin/env node
// Drive every page in a headless browser and check that it works.
//
// verify.mjs checks the arithmetic. This checks the pages: each one loads
// without a script error, its main buttons do what they say, and nothing
// scrolls sideways on a phone-width screen. It does not listen to any audio.
//
// Usage: node tools/browser.mjs        (exits 1 if any check fails)
// Needs Playwright with a Chromium build (npm i playwright, then
// npx playwright install chromium; or a global install).

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadPlaywright() {
  try { return await import("playwright"); } catch (e) { /* fall through */ }
  const globalPath = "/opt/node22/lib/node_modules/playwright/index.mjs";
  if (existsSync(globalPath)) return await import(pathToFileURL(globalPath).href);
  console.error("Playwright not found. npm i playwright && npx playwright install chromium");
  process.exit(2);
}

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? "PASS  " : "FAIL  ") + name + (detail ? "   [" + detail + "]" : ""));
  if (!ok) failures.push(name);
}

// Per-page actions. Each returns after asserting what it can see.
const ACTIONS = {
  "index.html": async (p) => {
    await p.click("#b-run");
    await p.waitForFunction(() => /capacity/.test(document.getElementById("run-read").textContent), null, { timeout: 30000 });
    const read = await p.$eval("#run-read", (e) => e.textContent);
    check("main page: Run the experiment reports capacity 9.69", read.includes("9.69"), read.slice(0, 70));
    await p.click("#b-write");
    const store = await p.$eval("#store-read", (e) => e.textContent);
    check("main page: the register takes a message", store.includes("I␣LOVE␣YOU"), store.slice(0, 60));
    await p.$eval("#wander", (e) => { e.value = "0"; e.dispatchEvent(new Event("input")); });
    const mail = await p.$eval("#mail-read", (e) => e.textContent);
    check("main page: a textbook piano mails for nothing", /textbook, 0\. Against the key before, 0\./.test(mail), mail.slice(0, 80));
  },
  "lab/ladder.html": async (p) => {
    await p.click("[data-key=golden]");
    const t = await p.$eval("#ladder-read", (e) => e.textContent);
    check("ladder: the golden ratio's rungs are Fibonacci", t.includes("Fibonacci"), t.slice(0, 60));
  },
  "lab/bakeoff.html": async (p) => {
    await p.waitForFunction(() => /holds the most/.test(document.getElementById("contest-read").textContent), null, { timeout: 60000 });
    const t = await p.$eval("#contest-read", (e) => e.textContent);
    check("bakeoff: the contest runs and Kirnberger III wins", t.startsWith("Kirnberger III holds the most"), t.slice(0, 70));
  },
  "lab/instrument.html": async (p) => {
    await p.click("#b-noise");
    await p.waitForTimeout(1500);
  },
};

const pages = ["index.html", ...readdirSync(join(root, "lab")).filter((f) => f.endsWith(".html")).sort().map((f) => "lab/" + f)];

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
for (const page of pages) {
  for (const [width, scheme] of [[1280, "dark"], [390, "light"]]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    p.on("console", (m) => {
      // Chrome nags about ScriptProcessorNode; that is a warning, not a failure
      if (m.type() === "error") errs.push(m.text());
    });
    await p.emulateMedia({ colorScheme: scheme });
    await p.goto(pathToFileURL(join(root, page)).href);
    await p.waitForTimeout(1200);
    if (width === 1280 && ACTIONS[page]) {
      try { await ACTIONS[page](p); }
      catch (e) { check(page + ": actions ran", false, String(e).slice(0, 120)); }
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(page + " at " + width + "px " + scheme + ": no script errors, no sideways scroll",
      errs.length === 0 && sw <= width, errs.length ? errs[0].slice(0, 120) : "scrollWidth " + sw);
    await p.close();
  }
}
await browser.close();

console.log(failures.length ? "\n" + failures.length + " check(s) FAILED" : "\nevery page loads and works");
process.exit(failures.length ? 1 : 0);

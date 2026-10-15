import { spawnSync } from "node:child_process";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { walkSmoke } from "./walk.mjs";

const webRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(webRoot, "../..");
const origin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const rawDir = path.join(webRoot, "test-results", "smoke-record");
const dest = path.join(repoRoot, "docs", "assets", "smoke.webm");
const destVtt = path.join(repoRoot, "docs", "assets", "smoke.vtt");
const maxBytes = 25 * 1024 * 1024;
const viewport = { width: 1280, height: 800 };

await rm(rawDir, { recursive: true, force: true });
await mkdir(rawDir, { recursive: true });

const cues = [];
const started = Date.now();

const browser = await chromium.launch({
  headless: true,
  slowMo: 350,
});
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: rawDir, size: viewport },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await walkSmoke(page, {
    origin,
    demo: true,
    onStep: (text) => cues.push({ at: Date.now(), text }),
    pause: (ms = 800) => page.waitForTimeout(ms),
  });
  await page.waitForTimeout(1200);
} finally {
  await context.close();
  await browser.close();
}

const raw = await findWebm(rawDir);
if (!raw) throw new Error("Playwright did not write a video");

await mkdir(path.dirname(dest), { recursive: true });
await writeFile(destVtt, toVtt(cues, started), "utf8");

const muxed = path.join(rawDir, "muxed.webm");
const compressed = await tryCompress(raw, destVtt, muxed);
await copyFile(compressed ? muxed : raw, dest);

const size = (await stat(dest)).size;
if (size >= maxBytes) {
  throw new Error(`${dest} is ${(size / 1024 / 1024).toFixed(1)} MB (limit 25)`);
}
console.log(
  `Wrote ${path.relative(repoRoot, dest)} (${(size / 1024 / 1024).toFixed(2)} MB) and ${path.relative(repoRoot, destVtt)} from ${origin}`,
);

async function findWebm(dir) {
  const { readdir } = await import("node:fs/promises");
  const names = await readdir(dir);
  const hit = names.find((n) => n.endsWith(".webm"));
  return hit ? path.join(dir, hit) : null;
}

function toVtt(list, t0) {
  const lines = ["WEBVTT", ""];
  for (let i = 0; i < list.length; i++) {
    const begin = (list[i].at - t0) / 1000;
    const end = i + 1 < list.length ? (list[i + 1].at - t0) / 1000 : begin + 2;
    lines.push(`${fmt(begin)} --> ${fmt(Math.max(end, begin + 0.5))}`);
    lines.push(`${i + 1}. ${list[i].text}`);
    lines.push("");
  }
  return lines.join("\n");
}

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${s.toFixed(3).padStart(6, "0")}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

async function tryCompress(input, vtt, output) {
  const args = [
    "-y",
    "-i",
    input,
    "-i",
    vtt,
    "-map",
    "0:v:0",
    "-map",
    "1:0",
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "500k",
    "-crf",
    "34",
    "-deadline",
    "good",
    "-c:s",
    "webvtt",
    output,
  ];
  const run = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (run.error || run.status !== 0) {
    console.warn("ffmpeg mux failed; compressing video only");
    const plain = spawnSync(
      "ffmpeg",
      ["-y", "-i", input, "-an", "-c:v", "libvpx-vp9", "-b:v", "500k", "-crf", "34", "-deadline", "good", output],
      { stdio: "inherit" },
    );
    return !(plain.error || plain.status !== 0);
  }
  return true;
}

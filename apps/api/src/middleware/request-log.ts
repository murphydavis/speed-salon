import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { RequestHandler } from "express";

export function requestLog(logFile: string): RequestHandler {
  const dir = path.dirname(logFile);
  return (req, res, next) => {
    const receivedAt = new Date();
    const t0 = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6;
      const line =
        JSON.stringify({
          receivedAt: receivedAt.toISOString(),
          durationMs: Math.round(durationMs * 1000) / 1000,
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
        }) + "\n";
      mkdir(dir, { recursive: true })
        .then(() => appendFile(logFile, line))
        .catch((err) => console.error("request log write failed", err));
    });
    next();
  };
}

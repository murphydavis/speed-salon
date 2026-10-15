import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

const api: ProxyOptions = {
  target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000",
  bypass(req) {
    if (req.headers.accept?.includes("text/html")) return req.url;
  },
};

const proxy = {
  "/moderators": api,
  "/games": api,
  "/runs": api,
  "/docs": api,
  "/openapi.yaml": api,
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy,
  },
  preview: {
    host: true,
    port: 5173,
    proxy,
  },
});

import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

const api: ProxyOptions = {
  target: "http://127.0.0.1:3000",
  bypass(req) {
    if (req.headers.accept?.includes("text/html")) return req.url;
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/moderators": api,
      "/games": api,
      "/runs": api,
    },
  },
});

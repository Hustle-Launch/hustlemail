import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: { "@": fileURLToPath(new URL("../web", import.meta.url)) },
    dedupe: ["react", "react-dom", "convex"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || "127.0.0.1",
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: { target: "es2022", sourcemap: true },
});

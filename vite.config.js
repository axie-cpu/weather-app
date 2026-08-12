import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built site works on GitHub project Pages
// (axie-cpu.github.io/weather-app/) AND when opened from a subpath.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});

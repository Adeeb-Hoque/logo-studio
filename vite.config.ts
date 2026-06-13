import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/logo-studio/",
  plugins: [react()],
  server: { port: 5180 },
});

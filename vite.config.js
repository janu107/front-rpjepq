import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/rpj_administrativo/",
  plugins: [react()],
  server: {
    port: 5173
  }
});

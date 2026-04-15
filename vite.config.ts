import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  server: {
    port: 4333,
  },
  preview: {
    port: 4332,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  staged: { "*": "vp check --fix" },
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
  },
});

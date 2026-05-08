import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import devServer from "@hono/vite-dev-server";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    devServer({
      entry: "api/boot.ts",
      exclude: [
        /^\/src\/.*/,
        /^\/node_modules\/.*/,
        /^\/@.+$/,
        /^\/content\/.*/,
        /.*\.ts$/,
        /.*\.tsx$/,
      ],
      injectClientScript: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@api": path.resolve(__dirname, "./api"),
    },
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});

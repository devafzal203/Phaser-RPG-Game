import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      "/api/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});

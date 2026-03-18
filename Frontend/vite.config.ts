import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      ignored: ["**/db.json"],
    },
    proxy: {
      // Dev proxy to backend to avoid CORS during local development
      "/api": {
        target: "http://172.16.2.6:8001",
        changeOrigin: true,
      },
    },
  },
})

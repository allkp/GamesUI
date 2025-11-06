import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window", // 👈 Fix SockJS expecting "global"
  },
  build: {
    outDir: "build", // 👈 Output your production build to /build instead of /dist
  },
});

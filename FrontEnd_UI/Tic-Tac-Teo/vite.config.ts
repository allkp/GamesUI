import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '10.10.21.39',
    port: 5173, // default Vite port, you can change this
  },
  define: {
    global: 'window', // 👈 Fix SockJS expecting "global"
  },
})

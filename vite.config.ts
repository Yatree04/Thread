import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // relative asset paths — required for the built app to load correctly
  // via file:// inside the packaged Electron app (electron/windows.cjs)
  base: './',
  plugins: [react(), tailwindcss()],
})

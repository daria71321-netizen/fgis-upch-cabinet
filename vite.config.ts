import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base = имя репозитория на GitHub Pages (https://<user>.github.io/<repo>/)
export default defineConfig({
  base: '/fgis-upch-cabinet/',
  plugins: [react()],
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// En GitHub Pages el sitio vive en /<nombre-repo>/. El workflow de deploy
// define BASE_PATH automáticamente; en local queda en '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

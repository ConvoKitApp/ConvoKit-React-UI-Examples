import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import process from 'node:process'
import { resolveDemoConfig } from './src/endpoints'

export default defineConfig(({ command, mode }) => {
  resolveDemoConfig(loadEnv(mode, process.cwd(), 'VITE_'), command === 'build' && mode === 'production')
  return {
    plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'] },
    test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
  }
})

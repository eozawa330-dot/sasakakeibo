import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './server/api.js'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), { name: 'local-api', configureServer(server) { server.middlewares.use('/api', handler); } }] };
})

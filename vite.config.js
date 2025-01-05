import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

console.log('Vite config is loading...')
console.log('Current working directory:', process.cwd())

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      {
        name: 'env-checker',
        configureServer(server) {
          console.log('Development server starting...')
        //   console.log('Environment variables available:', server.config.env)
        }
      }
    ],
    server: {
      port: 5173,
      strictPort: true,
      open: true
    },
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY)
    },
    root: process.cwd(),
    publicDir: 'public'
  }
}) 
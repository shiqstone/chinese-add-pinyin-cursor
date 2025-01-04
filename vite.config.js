import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY)
    }
  }
}) 
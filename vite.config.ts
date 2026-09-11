import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableLocator = env.VITE_ENABLE_LOCATOR === 'true'

  return {
    base: process.env.VITE_BASE_URL || (mode === 'production' ? '/ekam-crm/' : '/'),
    plugins: [
      react({
        babel: enableLocator
          ? {
              plugins: [
                ['@locator/babel-jsx/dist/index.js', {}]
              ]
            }
          : undefined
      })
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://dev-api.ekamnetwork.com',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules') && id.includes('exceljs')) {
              return 'vendor_exceljs'
            }
          },
        },
      },
    },
  }
})

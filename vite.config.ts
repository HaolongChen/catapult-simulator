import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const trajectoryApiPlugin = () => ({
  name: 'trajectory-api',
  configureServer(server: ViteDevServer) {
    server.middlewares.use(
      async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === '/api/save-trajectory' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const trajectory = JSON.parse(body)
              const publicPath = path.join(
                __dirname,
                'public',
                'trajectory.json',
              )
              fs.writeFileSync(publicPath, JSON.stringify(trajectory, null, 2))
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                }),
              )
            }
          })
        } else {
          next()
        }
      },
    )
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), trajectoryApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name === 'trajectory.json' ||
            assetInfo.name === 'simulation_log.csv'
          ) {
            return '[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  publicDir: 'public',
})

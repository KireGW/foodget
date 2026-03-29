import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readReceiptCatalog } from './scripts/receiptParser.mjs'

const virtualReceiptsModuleId = 'virtual:receipts'
const resolvedVirtualReceiptsModuleId = '\0virtual:receipts'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

function receiptsPlugin() {
  const receiptsDir = path.resolve(rootDir, 'receipts')

  return {
    name: 'foodget-receipts',
    resolveId(id) {
      if (id === virtualReceiptsModuleId) {
        return resolvedVirtualReceiptsModuleId
      }

      return null
    },
    load(id) {
      if (id !== resolvedVirtualReceiptsModuleId) {
        return null
      }

      return `export const receipts = ${JSON.stringify(
        readReceiptCatalog(receiptsDir),
        null,
        2,
      )}`
    },
    configureServer(server) {
      server.watcher.add(receiptsDir)

      server.middlewares.use('/receipts', (req, res, next) => {
        const requestPath = req.url ? decodeURIComponent(req.url.split('?')[0]) : '/'
        const relativePath = requestPath.replace(/^\/+/, '')
        const filePath = path.normalize(path.join(receiptsDir, relativePath))

        if (!filePath.startsWith(receiptsDir) || !fs.existsSync(filePath)) {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/pdf')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    handleHotUpdate(ctx) {
      if (!ctx.file.startsWith(receiptsDir)) {
        return
      }

      const module = ctx.server.moduleGraph.getModuleById(
        resolvedVirtualReceiptsModuleId,
      )

      if (module) {
        ctx.server.moduleGraph.invalidateModule(module)
        return [module]
      }

      return
    },
    generateBundle() {
      for (const receipt of readReceiptCatalog(receiptsDir)) {
        this.emitFile({
          type: 'asset',
          fileName: receipt.url.replace(/^\//, ''),
          source: fs.readFileSync(path.join(receiptsDir, receipt.relativePath)),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), receiptsPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:3101',
    },
  },
})

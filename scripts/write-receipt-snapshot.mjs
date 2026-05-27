import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const snapshotPath = path.join(rootDir, 'data', 'receipt-catalog.json')

process.env.FOODGET_DISABLE_SERVER = 'true'
const { getReceiptCatalog } = await import('../server/uploadServer.mjs')
const { closeReceiptIndexStore } = await import('../server/receiptIndexStore.mjs')

try {
  const { receipts: catalog } = await getReceiptCatalog()

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true })
  fs.writeFileSync(snapshotPath, `${JSON.stringify(catalog, null, 2)}\n`)

  console.log(
    `Wrote ${catalog.length} receipts to ${path.relative(rootDir, snapshotPath)}.`,
  )
} finally {
  await closeReceiptIndexStore()
}

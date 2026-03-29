import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readReceiptCatalog } from './receiptParser.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const receiptsDir = path.join(rootDir, 'receipts')
const snapshotPath = path.join(rootDir, 'data', 'receipt-catalog.json')

const catalog = readReceiptCatalog(receiptsDir)

fs.mkdirSync(path.dirname(snapshotPath), { recursive: true })
fs.writeFileSync(snapshotPath, `${JSON.stringify(catalog, null, 2)}\n`)

console.log(
  `Wrote ${catalog.length} receipts to ${path.relative(rootDir, snapshotPath)}.`,
)

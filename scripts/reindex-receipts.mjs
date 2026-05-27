import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rebuildReceiptIndex } from '../server/uploadServer.mjs'
import { closeReceiptIndexStore } from '../server/receiptIndexStore.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const receiptIndexPath = path.join(rootDir, 'data', 'receipt-index.json')
const protectedPaths = [
  path.join(rootDir, 'data', 'product-overrides.json'),
  path.join(rootDir, 'data', 'receipt-reviews.json'),
  path.join(rootDir, 'data', 'receipt-item-overrides.json'),
  path.join(rootDir, 'data', 'manual-receipts.json'),
]

try {
  const protectedStatsBefore = readProtectedFileStats()
  const startedAt = Date.now()
  const { receipts, reparsedCount, indexEntries } = await rebuildReceiptIndex()
  const protectedStatsAfter = readProtectedFileStats()
  const indexStat = fs.statSync(receiptIndexPath)

  console.log(
    JSON.stringify(
      {
        receipts: receipts.length,
        reparsed: reparsedCount,
        indexEntries: Object.keys(indexEntries).length,
        indexPath: path.relative(rootDir, receiptIndexPath),
        indexSizeBytes: indexStat.size,
        elapsedMs: Date.now() - startedAt,
        protectedFilesUnchanged:
          JSON.stringify(protectedStatsBefore) === JSON.stringify(protectedStatsAfter),
      },
      null,
      2,
    ),
  )
} finally {
  await closeReceiptIndexStore()
}

function readProtectedFileStats() {
  return protectedPaths.map((filePath) => ({
    path: path.relative(rootDir, filePath),
    size: fs.statSync(filePath).size,
    mtimeMs: fs.statSync(filePath).mtimeMs,
  }))
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  closeReceiptIndexStore,
  readManualReceiptsStore,
  readProductOverridesStore,
  readReceiptIndexStore,
  readReceiptItemOverridesStore,
  readReceiptReviewsStore,
} from './receiptIndexStore.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadLocalEnv(rootDir)

const receiptIndexPath = path.join(rootDir, 'data', 'receipt-index.json')
const productOverridesPath = path.join(rootDir, 'data', 'product-overrides.json')
const receiptReviewsPath = path.join(rootDir, 'data', 'receipt-reviews.json')
const receiptItemOverridesPath = path.join(rootDir, 'data', 'receipt-item-overrides.json')
const manualReceiptsPath = path.join(rootDir, 'data', 'manual-receipts.json')
const receiptIndexSchemaVersion = 1

export async function readLiveReceiptCatalog() {
  const index = await readReceiptIndexStore({
    receiptIndexPath,
    schemaVersion: receiptIndexSchemaVersion,
  })

  return Object.values(index.entries)
    .map((entry) => entry.receipt)
    .sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt))
}

export async function readLiveProductOverrides() {
  return readProductOverridesStore({
    productOverridesPath,
  })
}

export async function readLiveReceiptReviews() {
  return readReceiptReviewsStore({
    receiptReviewsPath,
  })
}

export async function readLiveReceiptItemOverrides() {
  return readReceiptItemOverridesStore({
    receiptItemOverridesPath,
  })
}

export async function readLiveManualReceipts() {
  return readManualReceiptsStore({
    manualReceiptsPath,
  })
}

export async function closeLiveReadStore() {
  await closeReceiptIndexStore()
}

function loadLocalEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env.local')

  if (!fs.existsSync(envPath)) {
    return
  }

  const envContent = fs.readFileSync(envPath, 'utf8')

  for (const line of envContent.split(/\r?\n/u)) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()

    if (!key || key in process.env) {
      continue
    }

    const rawValue = trimmedLine.slice(separatorIndex + 1).trim()
    const value =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue.startsWith("'") && rawValue.endsWith("'")
          ? rawValue.slice(1, -1)
          : rawValue

    process.env[key] = value
  }
}

import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { fileURLToPath } from 'node:url'
import {
  buildImportPlanFromFile,
  buildImportPlanFromText,
  extractPdfText,
  parseReceiptForImport,
  readReceiptCatalog,
} from '../scripts/receiptParser.mjs'

const app = express()
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const receiptsDir = path.join(rootDir, 'receipts')
const tempDir = path.join(rootDir, 'tmp', 'uploads')
const productOverridesPath = path.join(rootDir, 'data', 'product-overrides.json')
const receiptReviewsPath = path.join(rootDir, 'data', 'receipt-reviews.json')
const receiptItemOverridesPath = path.join(rootDir, 'data', 'receipt-item-overrides.json')
const manualReceiptsPath = path.join(rootDir, 'data', 'manual-receipts.json')
const port = Number(process.env.UPLOAD_SERVER_PORT ?? 3101)

fs.mkdirSync(tempDir, { recursive: true })
fs.mkdirSync(receiptsDir, { recursive: true })
fs.mkdirSync(path.dirname(productOverridesPath), { recursive: true })

if (!fs.existsSync(productOverridesPath)) {
  fs.writeFileSync(productOverridesPath, '[]\n')
}

if (!fs.existsSync(receiptReviewsPath)) {
  fs.writeFileSync(receiptReviewsPath, '[]\n')
}

if (!fs.existsSync(receiptItemOverridesPath)) {
  fs.writeFileSync(receiptItemOverridesPath, '[]\n')
}

if (!fs.existsSync(manualReceiptsPath)) {
  fs.writeFileSync(manualReceiptsPath, '[]\n')
}

app.use(express.json())

const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 20,
  },
  fileFilter(_req, file, callback) {
    const isSupportedReceipt =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpeg' ||
      /\.(pdf|png|jpe?g)$/i.test(file.originalname)

    callback(
      isSupportedReceipt ? null : new Error('Only PDF, PNG, and JPEG receipts are supported.'),
      isSupportedReceipt,
    )
  },
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/product-overrides', (_req, res) => {
  res.json({
    overrides: readProductOverrides(),
  })
})

app.get('/api/receipt-reviews', (_req, res) => {
  res.json({
    reviews: readReceiptReviews(),
  })
})

app.get('/api/receipt-item-overrides', (_req, res) => {
  res.json({
    overrides: readReceiptItemOverrides(),
  })
})

app.get('/api/manual-receipts', (_req, res) => {
  res.json({
    receipts: readManualReceipts(),
  })
})

app.get('/api/receipts/catalog', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    receipts: readReceiptCatalog(receiptsDir),
  })
})

app.delete('/api/receipts', (req, res) => {
  const { relativePath = null, receiptId } = req.body ?? {}

  if (!receiptId) {
    res.status(400).json({
      error: 'receiptId is required.',
    })
    return
  }

  const catalogReceipt = readReceiptCatalog(receiptsDir).find(
    (receipt) => receipt.id === receiptId,
  )
  const resolvedRelativePath = catalogReceipt?.relativePath ?? relativePath

  if (!resolvedRelativePath) {
    res.status(404).json({
      error: 'Receipt file was not found.',
    })
    return
  }

  const normalizedRelativePath = path.normalize(String(resolvedRelativePath))
  const targetPath = path.resolve(receiptsDir, normalizedRelativePath)

  if (!targetPath.startsWith(`${receiptsDir}${path.sep}`)) {
    res.status(400).json({
      error: 'Receipt path is invalid.',
    })
    return
  }

  if (!fs.existsSync(targetPath)) {
    res.status(404).json({
      error: 'Receipt file was not found.',
    })
    return
  }

  fs.rmSync(targetPath, { force: true })
  pruneEmptyReceiptFolders(path.dirname(targetPath))
  writeReceiptReviews(
    readReceiptReviews().filter((review) => review.receiptId !== receiptId),
  )
  writeReceiptItemOverrides(
    readReceiptItemOverrides().filter((override) => override.receiptId !== receiptId),
  )

  res.json({
    deleted: {
      receiptId,
      relativePath: normalizedRelativePath,
    },
  })
})

app.delete('/api/manual-receipts', (req, res) => {
  const { receiptId } = req.body ?? {}

  if (!receiptId) {
    res.status(400).json({
      error: 'receiptId is required.',
    })
    return
  }

  const nextManualReceipts = readManualReceipts().filter(
    (receipt) => receipt.id !== receiptId,
  )

  writeManualReceipts(nextManualReceipts)

  res.json({
    deleted: {
      receiptId,
    },
  })
})

app.post('/api/product-overrides', (req, res) => {
  const { productCode = null, originalName = null, canonicalName, category } = req.body ?? {}

  if ((!productCode && !originalName) || !canonicalName || !category) {
    res.status(400).json({
      error: 'productCode or originalName, plus canonicalName and category, are required.',
    })
    return
  }

  const overrides = readProductOverrides()
  const nextOverride = {
    ...(productCode ? { productCode } : {}),
    ...(originalName ? { originalName } : {}),
    canonicalName,
    category,
  }
  const existingIndex = overrides.findIndex(
    (override) =>
      (productCode && override.productCode === productCode) ||
      (!productCode && !override.productCode && override.originalName === originalName),
  )

  if (existingIndex === -1) {
    overrides.push(nextOverride)
  } else {
    overrides.splice(existingIndex, 1, nextOverride)
  }

  fs.writeFileSync(productOverridesPath, `${JSON.stringify(overrides, null, 2)}\n`)

  res.status(201).json({
    override: nextOverride,
  })
})

app.post('/api/receipt-reviews', (req, res) => {
  const { receiptId, decision } = req.body ?? {}

  if (!receiptId || !['use_official_total', 'keep_parsed_items'].includes(decision)) {
    res.status(400).json({
      error: 'receiptId and a valid decision are required.',
    })
    return
  }

  const reviews = readReceiptReviews()
  const nextReview = { receiptId, decision }
  const existingIndex = reviews.findIndex((review) => review.receiptId === receiptId)

  if (existingIndex === -1) {
    reviews.push(nextReview)
  } else {
    reviews.splice(existingIndex, 1, nextReview)
  }

  fs.writeFileSync(receiptReviewsPath, `${JSON.stringify(reviews, null, 2)}\n`)

  res.status(201).json({
    review: nextReview,
  })
})

app.post('/api/receipt-item-overrides', (req, res) => {
  const { receiptId, items } = req.body ?? {}

  if (!receiptId || !Array.isArray(items)) {
    res.status(400).json({
      error: 'receiptId and items are required.',
    })
    return
  }

  const cleanedItems = items
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      originalName: String(item.originalName ?? item.name ?? '').trim(),
      productCode: item.productCode ? String(item.productCode) : null,
      category: String(item.category ?? 'Other').trim() || 'Other',
      quantity: Number(item.quantity),
      totalMxn: Number(item.totalMxn),
      swedenUnitSek: Number(item.swedenUnitSek ?? 0),
      normalizationStatus: String(item.normalizationStatus ?? 'user_override'),
    }))
    .filter(
      (item) =>
        item.name &&
        item.category &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.totalMxn) &&
        item.totalMxn >= 0,
    )

  const overrides = readReceiptItemOverrides()
  const nextOverride = { receiptId, items: cleanedItems }
  const existingIndex = overrides.findIndex((override) => override.receiptId === receiptId)

  if (existingIndex === -1) {
    overrides.push(nextOverride)
  } else {
    overrides.splice(existingIndex, 1, nextOverride)
  }

  fs.writeFileSync(receiptItemOverridesPath, `${JSON.stringify(overrides, null, 2)}\n`)

  res.status(201).json({
    override: nextOverride,
  })
})

app.post('/api/manual-receipts', (req, res) => {
  const {
    purchasedAt,
    title,
    category,
    totalMxn,
    notes = '',
  } = req.body ?? {}

  if (!purchasedAt || !title || !category || !Number.isFinite(Number(totalMxn))) {
    res.status(400).json({
      error: 'purchasedAt, title, category, and totalMxn are required.',
    })
    return
  }

  const normalizedAmount = Number(totalMxn)

  if (normalizedAmount <= 0) {
    res.status(400).json({
      error: 'totalMxn must be greater than 0.',
    })
    return
  }

  const manualReceipts = readManualReceipts()
  const id = buildManualReceiptId(purchasedAt, title, manualReceipts)
  const receipt = {
    id,
    fileName: `Manual - ${String(title).trim()}`,
    relativePath: null,
    purchasedAt: String(purchasedAt),
    monthKey: String(purchasedAt).slice(0, 7),
    url: null,
    parseStatus: 'manual_entry',
    parseNotes: notes
      ? `Manual entry. ${String(notes).trim()}`
      : 'Manual entry added in the app.',
    textPreview: String(notes).trim(),
    store: 'Manual entry',
    sourceType: 'manual',
    totalMxnValue: normalizedAmount,
    soldItemsCount: 1,
    ignoredAdjustmentTotalMxn: 0,
    totalMxn: formatCurrency(normalizedAmount, 'MXN'),
    items: [
      {
        name: String(title).trim(),
        productCode: null,
        originalName: String(title).trim(),
        category: String(category).trim(),
        quantity: 1,
        unitType: 'count',
        totalMxnValue: normalizedAmount,
        totalMxn: normalizedAmount,
        swedenAverageSek: 0,
        normalizationStatus: 'user_override',
      },
    ],
  }

  manualReceipts.push(receipt)
  writeManualReceipts(manualReceipts)

  res.status(201).json({
    receipt,
  })
})

app.post('/api/receipts/import', upload.array('receipts', 20), (req, res) => {
  const files = req.files ?? []
  const allowDuplicates = String(req.body?.allowDuplicates ?? '').toLowerCase() === 'true'

  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'No supported receipt files were uploaded.' })
    return
  }

  try {
    const imported = []
    const existingCatalog = readReceiptCatalog(receiptsDir)
    const existingHashes = new Map(
      existingCatalog.map((receipt) => [
        receipt.relativePath,
        hashFile(path.join(receiptsDir, receipt.relativePath)),
      ]),
    )

    for (const file of files) {
      const extractedText = extractPdfText(file.path)
      const textPlan = buildImportPlanFromText(extractedText, file.originalname)
      const fallbackPlan = buildImportPlanFromFile(file.originalname, new Date())
      const importPlan = textPlan ?? fallbackPlan
      const parsedReceipt = parseReceiptForImport(extractedText, importPlan.purchasedAt)
      const incomingHash = hashFile(file.path)
      const duplicateMatch = allowDuplicates
        ? null
        : findDuplicateReceipt(
            existingCatalog,
            existingHashes,
            incomingHash,
            importPlan,
            parsedReceipt,
          )

      if (duplicateMatch) {
        cleanupTempFiles(files)
        res.status(409).json({
          error: 'This receipt looks identical to one that is already imported.',
          duplicate: duplicateMatch,
        })
        return
      }

      const targetMonthDir = path.join(receiptsDir, importPlan.folderMonth)

      fs.mkdirSync(targetMonthDir, { recursive: true })
      const targetExtension = determineReceiptExtension(file)

      const targetFileName = buildUniqueFileName(
        targetMonthDir,
        importPlan.baseName,
        targetExtension,
      )
      const targetFilePath = path.join(targetMonthDir, targetFileName)

      fs.renameSync(file.path, targetFilePath)

      imported.push({
        fileName: targetFileName,
        folderMonth: importPlan.folderMonth,
        purchasedAt: importPlan.purchasedAt,
        source: importPlan.source,
      })
    }

    res.status(201).json({
      imported,
      message: `Imported ${imported.length} receipt${imported.length === 1 ? '' : 's'}.`,
    })
  } catch (error) {
    cleanupTempFiles(files)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Receipt import failed.',
    })
  }
})

app.use((error, _req, res, _next) => {
  res.status(400).json({
    error: error instanceof Error ? error.message : 'Request failed.',
  })
})

app.listen(port, () => {
  console.log(`Receipt upload server listening on http://localhost:${port}`)
})

function cleanupTempFiles(files) {
  files.forEach((file) => {
    fs.rmSync(file.path, { force: true })
  })
}

function determineReceiptExtension(file) {
  const originalExtension = path.extname(file.originalname ?? '').toLowerCase()

  if (['.pdf', '.png', '.jpg', '.jpeg'].includes(originalExtension)) {
    return originalExtension
  }

  if (file.mimetype === 'image/png') {
    return '.png'
  }

  if (file.mimetype === 'image/jpeg') {
    return '.jpg'
  }

  return '.pdf'
}

function buildUniqueFileName(directory, baseName, extension) {
  const sanitizedBaseName = sanitizeSegment(baseName)
  let candidate = `${sanitizedBaseName}${extension}`
  let counter = 2

  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${sanitizedBaseName}-${counter}${extension}`
    counter += 1
  }

  return candidate
}

function findDuplicateReceipt(
  existingCatalog,
  existingHashes,
  incomingHash,
  importPlan,
  parsedReceipt,
) {
  const byteMatch = existingCatalog.find(
    (receipt) => existingHashes.get(receipt.relativePath) === incomingHash,
  )

  if (byteMatch) {
    return buildDuplicateDescriptor(byteMatch)
  }

  if (parsedReceipt.totalMxnValue == null || parsedReceipt.items.length === 0) {
    return null
  }

  const incomingFingerprint = buildReceiptFingerprint(importPlan.purchasedAt, parsedReceipt)

  const existingReceipt = existingCatalog.find((receipt) => {
    if (receipt.totalMxnValue == null || receipt.items.length === 0) {
      return false
    }

    return buildReceiptFingerprint(receipt.purchasedAt, receipt) === incomingFingerprint
  })

  if (!existingReceipt) {
    return null
  }

  return buildDuplicateDescriptor(existingReceipt)
}

function buildReceiptFingerprint(purchasedAt, receipt) {
  const normalizedItems = receipt.items.map((item) => [
    item.productCode ?? '',
    item.originalName ?? item.name ?? '',
    Number(item.quantity ?? 0).toFixed(3),
    Number(item.totalMxnValue ?? item.totalMxn ?? 0).toFixed(2),
  ])

  return JSON.stringify({
    purchasedAt,
    total: Number(receipt.totalMxnValue ?? 0).toFixed(2),
    items: normalizedItems,
  })
}

function buildDuplicateDescriptor(receipt) {
  return {
    receiptId: receipt.id,
    fileName: receipt.fileName,
    purchasedAt: receipt.purchasedAt,
    totalMxn: receipt.totalMxn,
    itemCount: receipt.items.reduce(
      (sum, item) => sum + (item.unitType === 'weight' ? 1 : item.quantity),
      0,
    ),
    lineCount: receipt.items.length,
  }
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function sanitizeSegment(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .toLowerCase()
}

function readProductOverrides() {
  return JSON.parse(fs.readFileSync(productOverridesPath, 'utf8'))
}

function readReceiptReviews() {
  return JSON.parse(fs.readFileSync(receiptReviewsPath, 'utf8'))
}

function readReceiptItemOverrides() {
  return JSON.parse(fs.readFileSync(receiptItemOverridesPath, 'utf8'))
}

function readManualReceipts() {
  return JSON.parse(fs.readFileSync(manualReceiptsPath, 'utf8'))
}

function writeReceiptReviews(reviews) {
  fs.writeFileSync(receiptReviewsPath, `${JSON.stringify(reviews, null, 2)}\n`)
}

function writeReceiptItemOverrides(overrides) {
  fs.writeFileSync(receiptItemOverridesPath, `${JSON.stringify(overrides, null, 2)}\n`)
}

function writeManualReceipts(receipts) {
  fs.writeFileSync(manualReceiptsPath, `${JSON.stringify(receipts, null, 2)}\n`)
}

function pruneEmptyReceiptFolders(directory) {
  let currentDirectory = directory

  while (currentDirectory.startsWith(receiptsDir) && currentDirectory !== receiptsDir) {
    if (fs.readdirSync(currentDirectory).length > 0) {
      return
    }

    fs.rmdirSync(currentDirectory)
    currentDirectory = path.dirname(currentDirectory)
  }
}

function buildManualReceiptId(purchasedAt, title, receipts) {
  const baseId = `manual-${sanitizeSegment(purchasedAt)}-${sanitizeSegment(title)}`
  let candidate = baseId
  let counter = 2

  while (receipts.some((receipt) => receipt.id === candidate)) {
    candidate = `${baseId}-${counter}`
    counter += 1
  }

  return candidate
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

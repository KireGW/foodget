import fs from 'node:fs'
import { Pool } from 'pg'

const receiptIndexTableName = 'receipt_index_entries'
const manualReceiptsTableName = 'manual_receipts'
const productOverridesTableName = 'product_overrides'
const receiptReviewsTableName = 'receipt_reviews'
const receiptItemOverridesTableName = 'receipt_item_overrides'

let receiptIndexPool = null
let receiptIndexTableReady = false
let manualReceiptsTableReady = false
let productOverridesTableReady = false
let receiptReviewsTableReady = false
let receiptItemOverridesTableReady = false
const warningState = {
  receiptIndexRead: false,
  receiptIndexWrite: false,
  manualReceiptsRead: false,
  manualReceiptsWrite: false,
  productOverridesRead: false,
  productOverridesWrite: false,
  productOverridesDivergence: false,
  receiptReviewsRead: false,
  receiptReviewsWrite: false,
  receiptReviewsDivergence: false,
  receiptItemOverridesRead: false,
  receiptItemOverridesWrite: false,
  receiptItemOverridesDivergence: false,
}

export async function readReceiptIndexStore({ receiptIndexPath, schemaVersion }) {
  const fileIndex = readReceiptIndexFile({ receiptIndexPath, schemaVersion })
  const databaseEnabled = Boolean(process.env.DATABASE_URL)

  if (!databaseEnabled) {
    return fileIndex
  }

  const databaseIndex = await readReceiptIndexFromDatabase({ schemaVersion })

  if (!databaseIndex) {
    return fileIndex
  }

  if (
    Object.keys(databaseIndex.entries).length === 0 &&
    Object.keys(fileIndex.entries).length > 0
  ) {
    await writeReceiptIndexToDatabase(fileIndex.entries)
    return fileIndex
  }

  if (!indexesAreEqual(fileIndex, databaseIndex)) {
    writeReceiptIndexFile(receiptIndexPath, databaseIndex)
  }

  return databaseIndex
}

export async function writeReceiptIndexStore({
  entries,
  receiptIndexPath,
  schemaVersion,
}) {
  const nextIndex = {
    schemaVersion,
    entries,
  }

  writeReceiptIndexFile(receiptIndexPath, nextIndex)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await writeReceiptIndexToDatabase(entries)
  } catch (error) {
    warnWriteFailure(error)
  }
}

export async function upsertReceiptIndexStoreEntry({
  fileHash,
  parserVersion,
  receipt,
  receiptIndexPath,
  relativePath,
  schemaVersion,
  updatedAt,
}) {
  const currentIndex = readReceiptIndexFile({ receiptIndexPath, schemaVersion })

  currentIndex.entries[relativePath] = {
    fileHash,
    parserVersion,
    receipt,
    updatedAt,
  }
  writeReceiptIndexFile(receiptIndexPath, currentIndex)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await upsertReceiptIndexDatabaseEntry({
      fileHash,
      parserVersion,
      receipt,
      relativePath,
      updatedAt,
    })
  } catch (error) {
    warnWriteFailure(error)
  }
}

export async function removeReceiptIndexStoreEntry({
  receiptIndexPath,
  relativePath,
  schemaVersion,
}) {
  const currentIndex = readReceiptIndexFile({ receiptIndexPath, schemaVersion })

  if (currentIndex.entries[relativePath]) {
    delete currentIndex.entries[relativePath]
    writeReceiptIndexFile(receiptIndexPath, currentIndex)
  }

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await removeReceiptIndexDatabaseEntry(relativePath)
  } catch (error) {
    warnWriteFailure(error)
  }
}

export async function readManualReceiptsStore({ manualReceiptsPath }) {
  const fileReceipts = readJsonArrayFile(manualReceiptsPath)

  if (!process.env.DATABASE_URL) {
    return fileReceipts
  }

  const databaseReceipts = await readManualReceiptsFromDatabase()

  if (!databaseReceipts) {
    return fileReceipts
  }

  if (databaseReceipts.length === 0 && fileReceipts.length > 0) {
    await writeManualReceiptsToDatabase(fileReceipts)
    return fileReceipts
  }

  if (!arraysAreEqual(fileReceipts, databaseReceipts)) {
    writeJsonArrayFile(manualReceiptsPath, databaseReceipts)
  }

  return databaseReceipts
}

export async function readProductOverridesStore({ productOverridesPath }) {
  return readJsonBackedArrayStore({
    filePath: productOverridesPath,
    subject: 'product-overrides',
    divergenceWarningKey: 'productOverridesDivergence',
    readFromDatabase: readProductOverridesFromDatabase,
    writeToDatabase: writeProductOverridesToDatabase,
    preferDatabase: true,
  })
}

export async function writeProductOverridesStore({ overrides, productOverridesPath }) {
  writeJsonArrayFile(productOverridesPath, overrides)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await writeProductOverridesToDatabase(overrides)
  } catch (error) {
    warnWriteFailure('productOverridesWrite', 'product-overrides', error)
  }
}

export async function readReceiptReviewsStore({ receiptReviewsPath }) {
  return readJsonBackedArrayStore({
    filePath: receiptReviewsPath,
    subject: 'receipt-reviews',
    divergenceWarningKey: 'receiptReviewsDivergence',
    readFromDatabase: readReceiptReviewsFromDatabase,
    writeToDatabase: writeReceiptReviewsToDatabase,
    preferDatabase: true,
  })
}

export async function writeReceiptReviewsStore({ receiptReviewsPath, reviews }) {
  writeJsonArrayFile(receiptReviewsPath, reviews)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await writeReceiptReviewsToDatabase(reviews)
  } catch (error) {
    warnWriteFailure('receiptReviewsWrite', 'receipt-reviews', error)
  }
}

export async function readReceiptItemOverridesStore({ receiptItemOverridesPath }) {
  return readJsonBackedArrayStore({
    filePath: receiptItemOverridesPath,
    subject: 'receipt-item-overrides',
    divergenceWarningKey: 'receiptItemOverridesDivergence',
    readFromDatabase: readReceiptItemOverridesFromDatabase,
    writeToDatabase: writeReceiptItemOverridesToDatabase,
    preferDatabase: true,
  })
}

export async function writeReceiptItemOverridesStore({
  overrides,
  receiptItemOverridesPath,
}) {
  writeJsonArrayFile(receiptItemOverridesPath, overrides)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await writeReceiptItemOverridesToDatabase(overrides)
  } catch (error) {
    warnWriteFailure('receiptItemOverridesWrite', 'receipt-item-overrides', error)
  }
}

export async function writeManualReceiptsStore({ manualReceiptsPath, receipts }) {
  writeJsonArrayFile(manualReceiptsPath, receipts)

  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    await writeManualReceiptsToDatabase(receipts)
  } catch (error) {
    warnWriteFailure('manualReceiptsWrite', 'manual-receipts', error)
  }
}

export async function closeReceiptIndexStore() {
  if (!receiptIndexPool) {
    return
  }

  const pool = receiptIndexPool
  receiptIndexPool = null
  receiptIndexTableReady = false
  manualReceiptsTableReady = false
  productOverridesTableReady = false
  receiptReviewsTableReady = false
  receiptItemOverridesTableReady = false
  await pool.end()
}

function readReceiptIndexFile({ receiptIndexPath, schemaVersion }) {
  if (!fs.existsSync(receiptIndexPath)) {
    return {
      schemaVersion,
      entries: {},
    }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(receiptIndexPath, 'utf8'))
    return {
      schemaVersion,
      entries: parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    }
  } catch {
    return {
      schemaVersion,
      entries: {},
    }
  }
}

function readJsonArrayFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeReceiptIndexFile(receiptIndexPath, index) {
  const tempPath = `${receiptIndexPath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(index, null, 2)}\n`)
  fs.renameSync(tempPath, receiptIndexPath)
}

function writeJsonArrayFile(filePath, entries) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(entries, null, 2)}\n`)
  fs.renameSync(tempPath, filePath)
}

async function readJsonBackedArrayStore({
  divergenceWarningKey = null,
  filePath,
  preferDatabase = false,
  readFromDatabase,
  subject = 'json-backed-store',
  writeToDatabase,
}) {
  const fileEntries = readJsonArrayFile(filePath)

  if (!process.env.DATABASE_URL) {
    return fileEntries
  }

  const databaseEntries = await readFromDatabase()

  if (!databaseEntries) {
    return fileEntries
  }

  if (databaseEntries.length === 0 && fileEntries.length > 0) {
    await writeToDatabase(fileEntries)
    return fileEntries
  }

  if (preferDatabase) {
    if (!arraysAreEqual(fileEntries, databaseEntries)) {
      warnDivergence(divergenceWarningKey, subject)
    }

    if (databaseEntries.length > 0 || fileEntries.length === 0) {
      return databaseEntries
    }
  }

  if (!arraysAreEqual(fileEntries, databaseEntries)) {
    await writeToDatabase(fileEntries)
  }

  return fileEntries
}

function indexesAreEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function arraysAreEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getReceiptIndexPool() {
  if (!process.env.DATABASE_URL) {
    return null
  }

  if (!receiptIndexPool) {
    receiptIndexPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
    })

    receiptIndexPool.on('error', (error) => {
      console.warn(`[receipt-index] Neon pool error: ${error.message}`)
    })
  }

  return receiptIndexPool
}

async function ensureReceiptIndexTable() {
  if (receiptIndexTableReady) {
    return true
  }

  const pool = getReceiptIndexPool()

  if (!pool) {
    return false
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${receiptIndexTableName} (
      relative_path text PRIMARY KEY,
      file_hash text NOT NULL,
      parser_version text NOT NULL,
      receipt jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `)

  receiptIndexTableReady = true
  return true
}

async function ensureManualReceiptsTable() {
  if (manualReceiptsTableReady) {
    return true
  }

  const pool = getReceiptIndexPool()

  if (!pool) {
    return false
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${manualReceiptsTableName} (
      receipt_id text PRIMARY KEY,
      purchased_at text NOT NULL,
      receipt jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `)

  manualReceiptsTableReady = true
  return true
}

async function ensureProductOverridesTable() {
  if (productOverridesTableReady) {
    return true
  }

  const pool = getReceiptIndexPool()

  if (!pool) {
    return false
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${productOverridesTableName} (
      override_key text PRIMARY KEY,
      sort_index integer NOT NULL,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `)

  productOverridesTableReady = true
  return true
}

async function ensureReceiptReviewsTable() {
  if (receiptReviewsTableReady) {
    return true
  }

  const pool = getReceiptIndexPool()

  if (!pool) {
    return false
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${receiptReviewsTableName} (
      receipt_id text PRIMARY KEY,
      sort_index integer NOT NULL,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `)

  receiptReviewsTableReady = true
  return true
}

async function ensureReceiptItemOverridesTable() {
  if (receiptItemOverridesTableReady) {
    return true
  }

  const pool = getReceiptIndexPool()

  if (!pool) {
    return false
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${receiptItemOverridesTableName} (
      receipt_id text PRIMARY KEY,
      sort_index integer NOT NULL,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `)

  receiptItemOverridesTableReady = true
  return true
}

async function readReceiptIndexFromDatabase({ schemaVersion }) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return null
  }

  try {
    await ensureReceiptIndexTable()
    const result = await pool.query(`
      SELECT relative_path, file_hash, parser_version, receipt, updated_at
      FROM ${receiptIndexTableName}
      ORDER BY relative_path
    `)

    return {
      schemaVersion,
      entries: Object.fromEntries(
        result.rows.map((row) => [
          row.relative_path,
          {
            fileHash: row.file_hash,
            parserVersion: row.parser_version,
            receipt: row.receipt,
            updatedAt: new Date(row.updated_at).toISOString(),
          },
        ]),
      ),
    }
  } catch (error) {
    warnReadFailure('receiptIndexRead', 'receipt-index', 'local JSON cache', error)
    return null
  }
}

async function writeReceiptIndexToDatabase(entries) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return
  }

  await ensureReceiptIndexTable()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const relativePaths = Object.keys(entries)

    if (relativePaths.length === 0) {
      await client.query(`DELETE FROM ${receiptIndexTableName}`)
    } else {
      await client.query(
        `DELETE FROM ${receiptIndexTableName} WHERE NOT (relative_path = ANY($1::text[]))`,
        [relativePaths],
      )
    }

    for (const [relativePath, entry] of Object.entries(entries)) {
      await client.query(
        `
          INSERT INTO ${receiptIndexTableName} (
            relative_path,
            file_hash,
            parser_version,
            receipt,
            updated_at
          )
          VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
          ON CONFLICT (relative_path) DO UPDATE SET
            file_hash = EXCLUDED.file_hash,
            parser_version = EXCLUDED.parser_version,
            receipt = EXCLUDED.receipt,
            updated_at = EXCLUDED.updated_at
        `,
        [
          relativePath,
          entry.fileHash,
          entry.parserVersion,
          JSON.stringify(entry.receipt),
          entry.updatedAt,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function upsertReceiptIndexDatabaseEntry({
  fileHash,
  parserVersion,
  receipt,
  relativePath,
  updatedAt,
}) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return
  }

  await ensureReceiptIndexTable()
  await pool.query(
    `
      INSERT INTO ${receiptIndexTableName} (
        relative_path,
        file_hash,
        parser_version,
        receipt,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
      ON CONFLICT (relative_path) DO UPDATE SET
        file_hash = EXCLUDED.file_hash,
        parser_version = EXCLUDED.parser_version,
        receipt = EXCLUDED.receipt,
        updated_at = EXCLUDED.updated_at
    `,
    [
      relativePath,
      fileHash,
      parserVersion,
      JSON.stringify(receipt),
      updatedAt,
    ],
  )
}

async function removeReceiptIndexDatabaseEntry(relativePath) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return
  }

  await ensureReceiptIndexTable()
  await pool.query(`DELETE FROM ${receiptIndexTableName} WHERE relative_path = $1`, [
    relativePath,
  ])
}

async function readManualReceiptsFromDatabase() {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return null
  }

  try {
    await ensureManualReceiptsTable()
    const result = await pool.query(`
      SELECT receipt
      FROM ${manualReceiptsTableName}
      ORDER BY purchased_at, receipt_id
    `)

    return result.rows.map((row) => row.receipt)
  } catch (error) {
    warnReadFailure('manualReceiptsRead', 'manual-receipts', 'local JSON file', error)
    return null
  }
}

async function writeManualReceiptsToDatabase(receipts) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return
  }

  await ensureManualReceiptsTable()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const receiptIds = receipts.map((receipt) => receipt.id)

    if (receiptIds.length === 0) {
      await client.query(`DELETE FROM ${manualReceiptsTableName}`)
    } else {
      await client.query(
        `DELETE FROM ${manualReceiptsTableName} WHERE NOT (receipt_id = ANY($1::text[]))`,
        [receiptIds],
      )
    }

    for (const receipt of receipts) {
      await client.query(
        `
          INSERT INTO ${manualReceiptsTableName} (
            receipt_id,
            purchased_at,
            receipt,
            updated_at
          )
          VALUES ($1, $2, $3::jsonb, $4::timestamptz)
          ON CONFLICT (receipt_id) DO UPDATE SET
            purchased_at = EXCLUDED.purchased_at,
            receipt = EXCLUDED.receipt,
            updated_at = EXCLUDED.updated_at
        `,
        [
          receipt.id,
          receipt.purchasedAt,
          JSON.stringify(receipt),
          new Date().toISOString(),
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function readProductOverridesFromDatabase() {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return null
  }

  try {
    await ensureProductOverridesTable()
    const result = await pool.query(`
      SELECT payload
      FROM ${productOverridesTableName}
      ORDER BY sort_index, override_key
    `)

    return result.rows.map((row) => row.payload)
  } catch (error) {
    warnReadFailure(
      'productOverridesRead',
      'product-overrides',
      'local JSON file',
      error,
    )
    return null
  }
}

async function writeProductOverridesToDatabase(overrides) {
  await writeJsonArrayEntriesToDatabase({
    tableName: productOverridesTableName,
    entries: overrides,
    entryIdColumn: 'override_key',
    ensureTable: ensureProductOverridesTable,
    getEntryId: getProductOverrideKey,
  })
}

async function readReceiptReviewsFromDatabase() {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return null
  }

  try {
    await ensureReceiptReviewsTable()
    const result = await pool.query(`
      SELECT payload
      FROM ${receiptReviewsTableName}
      ORDER BY sort_index, receipt_id
    `)

    return result.rows.map((row) => row.payload)
  } catch (error) {
    warnReadFailure(
      'receiptReviewsRead',
      'receipt-reviews',
      'local JSON file',
      error,
    )
    return null
  }
}

async function writeReceiptReviewsToDatabase(reviews) {
  await writeJsonArrayEntriesToDatabase({
    tableName: receiptReviewsTableName,
    entries: reviews,
    entryIdColumn: 'receipt_id',
    ensureTable: ensureReceiptReviewsTable,
    getEntryId: (entry) => entry.receiptId,
  })
}

async function readReceiptItemOverridesFromDatabase() {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return null
  }

  try {
    await ensureReceiptItemOverridesTable()
    const result = await pool.query(`
      SELECT payload
      FROM ${receiptItemOverridesTableName}
      ORDER BY sort_index, receipt_id
    `)

    return result.rows.map((row) => row.payload)
  } catch (error) {
    warnReadFailure(
      'receiptItemOverridesRead',
      'receipt-item-overrides',
      'local JSON file',
      error,
    )
    return null
  }
}

async function writeReceiptItemOverridesToDatabase(overrides) {
  await writeJsonArrayEntriesToDatabase({
    tableName: receiptItemOverridesTableName,
    entries: overrides,
    entryIdColumn: 'receipt_id',
    ensureTable: ensureReceiptItemOverridesTable,
    getEntryId: (entry) => entry.receiptId,
  })
}

async function writeJsonArrayEntriesToDatabase({
  tableName,
  entries,
  entryIdColumn,
  ensureTable,
  getEntryId,
}) {
  const pool = getReceiptIndexPool()

  if (!pool) {
    return
  }

  await ensureTable()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const entryIds = entries.map(getEntryId)

    if (entryIds.length === 0) {
      await client.query(`DELETE FROM ${tableName}`)
    } else {
      await client.query(
        `DELETE FROM ${tableName} WHERE NOT (${entryIdColumn} = ANY($1::text[]))`,
        [entryIds],
      )
    }

    for (const [index, entry] of entries.entries()) {
      await client.query(
        `
          INSERT INTO ${tableName} (
            ${entryIdColumn},
            sort_index,
            payload,
            updated_at
          )
          VALUES ($1, $2, $3::jsonb, $4::timestamptz)
          ON CONFLICT (${entryIdColumn}) DO UPDATE SET
            sort_index = EXCLUDED.sort_index,
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
        `,
        [
          getEntryId(entry),
          index,
          JSON.stringify(entry),
          new Date().toISOString(),
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function getProductOverrideKey(entry) {
  if (entry.productCode) {
    return `code:${entry.productCode}`
  }

  return `name:${entry.originalName ?? ''}`
}

function warnReadFailure(key, subject, fallbackLabel, error) {
  if (warningState[key]) {
    return
  }

  warningState[key] = true
  console.warn(
    `[${subject}] Neon read failed, falling back to ${fallbackLabel}: ${error.message}`,
  )
}

function warnWriteFailure(key, subject, error) {
  if (warningState[key]) {
    return
  }

  warningState[key] = true
  console.warn(
    `[${subject}] Neon write failed, continuing with local JSON storage: ${error.message}`,
  )
}

function warnDivergence(key, subject) {
  if (!key || warningState[key]) {
    return
  }

  warningState[key] = true
  console.warn(
    `[${subject}] Local JSON differs from Neon; using Neon data for live reads and leaving local JSON untouched.`,
  )
}

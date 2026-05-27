import fs from 'node:fs'
import { Pool } from 'pg'

const receiptIndexTableName = 'receipt_index_entries'
const manualReceiptsTableName = 'manual_receipts'

let receiptIndexPool = null
let receiptIndexTableReady = false
let manualReceiptsTableReady = false
const warningState = {
  receiptIndexRead: false,
  receiptIndexWrite: false,
  manualReceiptsRead: false,
  manualReceiptsWrite: false,
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

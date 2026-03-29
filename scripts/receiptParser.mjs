import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const jxaScriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'extract-pdf-text.js',
)
const swiftOcrScriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'extract-pdf-ocr.swift',
)

const productCatalog = [
  { pattern: /AGUACATE HA/i, canonicalName: 'Aguacate hass', category: 'Produce', sekPerUnit: 32 },
  { pattern: /GUAYABA/i, canonicalName: 'Guayaba', category: 'Produce', sekPerUnit: 28 },
  { pattern: /MANDARINA/i, canonicalName: 'Mandarina', category: 'Produce', sekPerUnit: 28 },
  { pattern: /MAN RED/i, canonicalName: 'Manzana Red Delicious', category: 'Produce', sekPerUnit: 28 },
  { pattern: /PLAT ORG MK/i, canonicalName: 'Platano organico Marketside', category: 'Produce', sekPerUnit: 28 },
  { pattern: /PLATANO CHI/i, canonicalName: 'Platano chiapas', category: 'Produce', sekPerUnit: 28 },
  { pattern: /JITOMAT SAL/i, canonicalName: 'Jitomate saladet', category: 'Produce', sekPerUnit: 22 },
  { pattern: /LIMON SIN S/i, canonicalName: 'Limon sin semilla', category: 'Produce', sekPerUnit: 24 },
  { pattern: /LIMON EUREK/i, canonicalName: 'Limon eureka', category: 'Produce', sekPerUnit: 24 },
  { pattern: /CEBOLLA BLA/i, canonicalName: 'Cebolla blanca', category: 'Produce', sekPerUnit: 18 },
  { pattern: /CEBOLLA CA/i, canonicalName: 'Cebolla cambray', category: 'Produce', sekPerUnit: 18 },
  { pattern: /CEBOLLA MOR/i, canonicalName: 'Cebolla morada', category: 'Produce', sekPerUnit: 18 },
  { pattern: /CEBOLLIN|FG CEBOLLI/i, canonicalName: 'Cebollin', category: 'Produce', sekPerUnit: 20 },
  { pattern: /CILANTRO/i, canonicalName: 'Cilantro', category: 'Produce', sekPerUnit: 16 },
  { pattern: /DIENTE AJO/i, canonicalName: 'Ajo', category: 'Produce', sekPerUnit: 18 },
  { pattern: /PIMIENTO AM/i, canonicalName: 'Pimiento amarillo', category: 'Produce', sekPerUnit: 26 },
  { pattern: /PIMIENTO VE/i, canonicalName: 'Pimiento verde', category: 'Produce', sekPerUnit: 24 },
  { pattern: /PIMIENTO RO/i, canonicalName: 'Pimiento rojo', category: 'Produce', sekPerUnit: 28 },
  { pattern: /CAMOTE AMA/i, canonicalName: 'Camote amarillo', category: 'Produce', sekPerUnit: 18 },
  { pattern: /PAPA BLANC/i, canonicalName: 'Papa blanca', category: 'Produce', sekPerUnit: 18 },
  { pattern: /JENGIBRE/i, canonicalName: 'Jengibre', category: 'Produce', sekPerUnit: 22 },
  { pattern: /ZANAHORIA/i, canonicalName: 'Zanahoria', category: 'Produce', sekPerUnit: 18 },
  { pattern: /LAS MORAS/i, canonicalName: 'Moras', category: 'Produce', sekPerUnit: 34 },
  { pattern: /FLORETES B/i, canonicalName: 'Brocoli en floretes', category: 'Produce', sekPerUnit: 24 },

  { pattern: /PECHUGA SH/i, canonicalName: 'Pechuga de pollo sin piel', category: 'Protein', sekPerUnit: 74 },
  { pattern: /MOLIDA 95\/5/i, canonicalName: 'Carne molida 95/5', category: 'Protein', sekPerUnit: 74 },
  { pattern: /SJUAN HVO/i, canonicalName: 'Huevo San Juan', category: 'Protein', sekPerUnit: 46 },
  { pattern: /PIER BA JB|PIERNA TROZ/i, canonicalName: 'Pierna de pollo', category: 'Protein', sekPerUnit: 66 },
  { pattern: /MUSLO S PIE/i, canonicalName: 'Muslo de pollo sin piel', category: 'Protein', sekPerUnit: 64 },
  { pattern: /TILA MKS 1/i, canonicalName: 'Tilapia Marketside', category: 'Protein', sekPerUnit: 68 },
  { pattern: /DOLORES AG/i, canonicalName: 'Atun Dolores en agua', category: 'Protein', sekPerUnit: 30 },
  { pattern: /SALCH VIEN/i, canonicalName: 'Salchicha viena', category: 'Protein', sekPerUnit: 42 },
  { pattern: /SALCHIC TD|CHX SALC A|CHXSALCASA/i, canonicalName: 'Salchicha para asar', category: 'Protein', sekPerUnit: 48 },
  { pattern: /SALAMI EXT/i, canonicalName: 'Salami', category: 'Protein', sekPerUnit: 52 },

  { pattern: /ALPURA MAN|AL CLAS 6P/i, canonicalName: 'Leche Alpura clasica', category: 'Dairy', sekPerUnit: 36 },
  { pattern: /ALP CREMA/i, canonicalName: 'Crema Alpura', category: 'Dairy', sekPerUnit: 34 },
  { pattern: /QSO MANCHE|LALA MANCH/i, canonicalName: 'Queso manchego', category: 'Dairy', sekPerUnit: 40 },
  { pattern: /VOLCA OAXA/i, canonicalName: 'Queso Oaxaca Volcan', category: 'Dairy', sekPerUnit: 42 },
  { pattern: /YOPLAIT GR/i, canonicalName: 'Yoghurt griego Yoplait', category: 'Dairy', sekPerUnit: 34 },
  { pattern: /PHILLY QSO/i, canonicalName: 'Queso crema Philadelphia', category: 'Dairy', sekPerUnit: 38 },
  { pattern: /LURPAK MAN/i, canonicalName: 'Mantequilla Lurpak', category: 'Dairy', sekPerUnit: 44 },
  { pattern: /LECHERA 37/i, canonicalName: 'Leche condensada La Lechera', category: 'Dairy', sekPerUnit: 34 },
  { pattern: /OATLY BARI/i, canonicalName: 'Leche de avena Oatly Barista', category: 'Dairy', sekPerUnit: 42 },
  { pattern: /BIONDA REQ/i, canonicalName: 'Queso ricotta Bionda', category: 'Dairy', sekPerUnit: 42 },

  { pattern: /ARR SUSHI|VV ARROZ S|VV ARROZ/i, canonicalName: 'Arroz para sushi', category: 'Pantry', sekPerUnit: 30, reviewRequired: true },
  { pattern: /AU AZUCAR/i, canonicalName: 'Azucar estandar', category: 'Pantry', sekPerUnit: 22 },
  { pattern: /HARINA/i, canonicalName: 'Harina', category: 'Pantry', sekPerUnit: 24 },
  { pattern: /BARILLA PA|BA FUS 500|BA PEN 500|PASTA|BD FIDEO H/i, canonicalName: 'Pasta', category: 'Pantry', sekPerUnit: 28 },
  { pattern: /BARIL PEST/i, canonicalName: 'Pesto Barilla', category: 'Pantry', sekPerUnit: 36 },
  { pattern: /MISSION CA/i, canonicalName: 'Tortillas Mission', category: 'Pantry', sekPerUnit: 24 },
  { pattern: /TOTOP MAIZ/i, canonicalName: 'Totopos de maiz', category: 'Pantry', sekPerUnit: 24 },
  { pattern: /TOTOP NOPA/i, canonicalName: 'Totopos de nopal', category: 'Pantry', sekPerUnit: 24 },
  { pattern: /GV GARBANZ/i, canonicalName: 'Garbanzos Great Value', category: 'Pantry', sekPerUnit: 24 },
  { pattern: /MAGGI SOYA|KIKOMAN SO/i, canonicalName: 'Salsa de soya', category: 'Pantry', sekPerUnit: 28 },
  { pattern: /SALSA CHOL|TABASCO HA|SALSA/i, canonicalName: 'Salsa picante', category: 'Pantry', sekPerUnit: 24, reviewRequired: true },
  { pattern: /CAFE GARAT/i, canonicalName: 'Cafe Garat', category: 'Pantry', sekPerUnit: 38 },
  { pattern: /MC MERMELA/i, canonicalName: 'Mermelada', category: 'Pantry', sekPerUnit: 26 },
  { pattern: /CREMA MIST/i, canonicalName: 'Crema de cacahuate Mister', category: 'Pantry', sekPerUnit: 30 },
  { pattern: /MIELNATURA/i, canonicalName: 'Miel', category: 'Pantry', sekPerUnit: 34 },
  { pattern: /OLIVA SEL/i, canonicalName: 'Aceitunas verdes', category: 'Pantry', sekPerUnit: 32 },
  { pattern: /JOLC SHUES|CIBEL SHUE|CARB SHUES/i, canonicalName: 'Aceitunas sin hueso', category: 'Pantry', sekPerUnit: 32 },
  { pattern: /UNICO FRES/i, canonicalName: 'Jugo de naranja Unico Fresco', category: 'Beverages', sekPerUnit: 30, reviewRequired: true },
  { pattern: /TOPOCH MIN/i, canonicalName: 'Agua mineral Topo Chico', category: 'Beverages', sekPerUnit: 24 },
  { pattern: /PENAF TON/i, canonicalName: 'Agua tonica Penafiel', category: 'Beverages', sekPerUnit: 24 },
  { pattern: /COCA SN AZ/i, canonicalName: 'Coca-Cola sin azucar', category: 'Beverages', sekPerUnit: 24 },
  { pattern: /VICTORIA 2|CORONA 24|CUNE CAVA/i, canonicalName: 'Alcohol', category: 'Beverages', sekPerUnit: 54, reviewRequired: true },

  { pattern: /PAN DE CAJ|BIMB PARR|MN BRIOCHE/i, canonicalName: 'Pan', category: 'Bakery', sekPerUnit: 24, reviewRequired: true },
  { pattern: /REXAL 100G|EMILIO SAL|PIMI SEM M|MAILLE PEP|EX CAB NAT|EX SP NUE/i, canonicalName: 'Condimentos', category: 'Pantry', sekPerUnit: 28, reviewRequired: true },
  { pattern: /PAPA CRUJI|SABRITAS S|BARCEL TAK|BOTANA/i, canonicalName: 'Botanas', category: 'Snacks', sekPerUnit: 24, reviewRequired: true },
  { pattern: /GRANOLA/i, canonicalName: 'Granola', category: 'Pantry', sekPerUnit: 30 },

  { pattern: /DET MAS BE|VANISH 900|SCOTCH FIB/i, canonicalName: 'Limpieza del hogar', category: 'Household', sekPerUnit: 58 },
  { pattern: /ULTRACONF/i, canonicalName: 'Panales Huggies UltraConfort', category: 'Household', sekPerUnit: 64 },
  { pattern: /UTEKI TALL/i, canonicalName: 'Toallas humedas Uteki', category: 'Household', sekPerUnit: 42 },
  { pattern: /BATISTE SH/i, canonicalName: 'Shampoo Batiste', category: 'Household', sekPerUnit: 48 },
]

export function readReceiptCatalog(receiptsDir) {
  if (!fs.existsSync(receiptsDir)) {
    return []
  }

  return listPdfFiles(receiptsDir)
    .map((relativePath) => parseReceiptFile(receiptsDir, relativePath))
    .sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt))
}

export function parseReceiptForImport(text, purchasedAt) {
  return parseReceiptText(text, purchasedAt)
}

function parseReceiptFile(receiptsDir, relativePath) {
  const fileName = path.basename(relativePath)
  const stem = fileName.replace(/\.pdf$/i, '')
  const purchasedAt = resolvePurchasedAt(relativePath, stem)
  const filePath = path.join(receiptsDir, relativePath)
  const extractedText = extractPdfText(filePath)
  const parserResult = parseReceiptText(extractedText, purchasedAt)

  return {
    id: stem,
    fileName,
    relativePath,
    purchasedAt,
    monthKey: purchasedAt.slice(0, 7),
    url: `/receipts/${relativePath.split(path.sep).join('/')}`,
    parseStatus: parserResult.parseStatus,
    parseNotes: parserResult.parseNotes,
    textPreview: parserResult.textPreview,
    store: parserResult.store,
    totalMxnValue: parserResult.totalMxnValue,
    soldItemsCount: parserResult.soldItemsCount ?? null,
    ignoredAdjustmentTotalMxn: parserResult.ignoredAdjustmentTotalMxn ?? 0,
    totalMxn:
      parserResult.totalMxnValue == null
        ? null
        : formatCurrency(parserResult.totalMxnValue, 'MXN'),
    items: parserResult.items,
  }
}

export function extractPdfText(filePath) {
  const tempOutputPath = path.join(
    '/tmp',
    `foodget-pdf-text-${process.pid}-${Math.random().toString(36).slice(2)}.txt`,
  )
  const tempImagePath = path.join(
    '/tmp',
    `foodget-pdf-image-${process.pid}-${Math.random().toString(36).slice(2)}.png`,
  )

  try {
    execFileSync(
      'osascript',
      ['-l', 'JavaScript', jxaScriptPath, filePath, tempOutputPath],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'ignore'],
      },
    )

    const extractedText = fs.existsSync(tempOutputPath)
      ? fs.readFileSync(tempOutputPath, 'utf8').trim()
      : ''

    if (extractedText) {
      return extractedText
    }

    execFileSync(
      'swift',
      [swiftOcrScriptPath, filePath, tempOutputPath],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'ignore'],
      },
    )

    const directOcrText = fs.existsSync(tempOutputPath)
      ? fs.readFileSync(tempOutputPath, 'utf8').trim()
      : ''

    if (looksReadableText(directOcrText)) {
      return directOcrText
    }

    execFileSync('sips', ['-s', 'format', 'png', filePath, '--out', tempImagePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'ignore'],
    })

    execFileSync(
      'swift',
      [swiftOcrScriptPath, tempImagePath, tempOutputPath],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'ignore'],
      },
    )

    return fs.existsSync(tempOutputPath)
      ? fs.readFileSync(tempOutputPath, 'utf8').trim()
      : directOcrText
  } catch {
    return ''
  } finally {
    fs.rmSync(tempOutputPath, { force: true })
    fs.rmSync(tempImagePath, { force: true })
  }
}

function looksReadableText(text) {
  if (!text) {
    return false
  }

  const letterCount = (text.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length
  const weirdSymbolCount = (text.match(/[^\sA-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ$.,:%/#\-]/g) ?? []).length

  return letterCount >= 20 && weirdSymbolCount < Math.max(8, letterCount * 0.15)
}

function parseReceiptText(text, fallbackDate) {
  if (!text) {
    return buildParseResult({
      parseStatus: 'date_only',
      parseNotes: 'No readable text extracted from this PDF yet.',
      textPreview: '',
      store: 'Unknown',
      totalMxnValue: null,
      items: [],
    })
  }

  const normalizedText = normalizeText(text)

  if (/walmart\.com\.mx|pedido#|m[aá]s informaci[oó]n de este pedido/i.test(normalizedText)) {
    return parseWalmartOrder(normalizedText, fallbackDate)
  }

  if (/NUEVA WAL MART DE MEXICO|TDA#|ARTICULOS VENDIDOS/i.test(normalizedText)) {
    return parseWalmartStoreReceipt(normalizedText, fallbackDate)
  }

  if (/Comercial City Fresko|la comer|SUC\.\s+[A-Z]/i.test(normalizedText)) {
    return parseLaComerReceipt(normalizedText, fallbackDate)
  }

  return buildParseResult({
    parseStatus: 'text_only',
    parseNotes: 'Readable text found, but no store-specific parser matched yet.',
    textPreview: normalizedText.slice(0, 240),
    store: 'Unknown',
    totalMxnValue: extractCurrencyValue(normalizedText, [/TOTAL\s+\$\s*([\d.,]+)/i]),
    items: [],
  })
}

function parseWalmartOrder(text) {
  const totalMxnValue = extractWalmartOrderTotal(text)
  const { items, ignoredAdjustmentTotalMxn } = parseWalmartOrderItems(text)

  return buildParseResult({
    parseStatus: items.length > 0 ? 'parsed_items' : totalMxnValue != null ? 'parsed_total' : 'text_only',
    parseNotes:
      items.length > 0
        ? `Parsed ${items.length} line items from Walmart order details.`
        : 'Order details text extracted, but item matching is still partial.',
    textPreview: text.slice(0, 240),
    store: 'Walmart',
    totalMxnValue,
    ignoredAdjustmentTotalMxn,
    items,
  })
}

function parseWalmartStoreReceipt(text) {
  const lines = normalizeStoreReceiptLines(text)
  const soldItemsCount = extractSoldItemsCount(text)
  const totalMxnValue = extractCurrencyValue(text, [/TOTAL\s+\$\s*([\d.,]+)/i])
  const items = []
  const parsingSummary = {
    ignoredAdjustmentTotalMxn: 0,
  }
  const pendingItems = []

  for (const line of lines) {
    if (/^TOTAL\b/i.test(line)) {
      flushPendingItems(items, pendingItems, parsingSummary)
      break
    }

    const directAdjustmentMatch = line.match(
      /^(?:\d{8,14}\s+)?(?:.+?\s+)?(EC\s*CUPON|E\s*DOMICILI|EC\s*BONIFICA|COMBINA|MULTIAHORRO)\b.*?\$\s*(-?[\d]{1,4}(?:[.,]\d{2})?)$/i,
    )

    if (directAdjustmentMatch) {
      flushPendingItems(items, pendingItems, parsingSummary)
      parsingSummary.ignoredAdjustmentTotalMxn += parseSignedMoney(directAdjustmentMatch[2])
      continue
    }

    const promoPrefixPrice = extractPromoPrice(line)
    if (promoPrefixPrice != null && pendingItems.length > 0) {
      const currentItem = pendingItems.pop()
      currentItem.totalMxnValue = promoPrefixPrice
      pushCurrentItem(items, currentItem, parsingSummary)
    }

    const productSegments = extractProductSegments(line)
    if (productSegments.length > 0) {
      handleProductSegments(items, pendingItems, productSegments, parsingSummary)
      continue
    }

    if (pendingItems.length === 0) {
      continue
    }

    const pieceMatch = line.match(/^(\d+)\s*X\s*\$([\d.,]+)\s+\$\s*([\d.,]+)/i)
    if (pieceMatch) {
      const currentItem = pendingItems.pop()
      currentItem.quantity = Number(pieceMatch[1])
      currentItem.unitType = 'count'
      currentItem.totalMxnValue = parseMoney(pieceMatch[3])
      pushCurrentItem(items, currentItem, parsingSummary)
      flushResolvedPendingItems(items, pendingItems, parsingSummary)
      continue
    }

    const promoMatch = line.match(
      /^DE\s+\$[\d.,]+\s+A\s+\$[\d.,]+\s+\$\s*([\d]{1,4}(?:[.,]\d{2})?)[A-Z]?$/i,
    )
    if (promoMatch) {
      const currentItem = pendingItems.pop()
      currentItem.totalMxnValue = parseMoney(promoMatch[1])
      pushCurrentItem(items, currentItem, parsingSummary)
      flushResolvedPendingItems(items, pendingItems, parsingSummary)
      continue
    }

    const standalonePriceMatch = line.match(
      /^\$?\s*([\d]{1,4}(?:[.,]\d{2})?)[A-Z]?$/i,
    )
    if (standalonePriceMatch) {
      const currentItem = pendingItems.shift()
      currentItem.totalMxnValue = parseMoney(standalonePriceMatch[1])
      pushCurrentItem(items, currentItem, parsingSummary)
      flushResolvedPendingItems(items, pendingItems, parsingSummary)
      continue
    }

    const weightedMatch = line.match(
      /^([\d.]+)\s*KGS?\s+A\s+[\d.]+\/KG\s+\$\s*([\d]{1,4}(?:[.,]\d{2})?)[A-Z]?$/i,
    )
    if (weightedMatch) {
      const currentItem = pendingItems.pop()
      currentItem.quantity = Number(weightedMatch[1])
      currentItem.unitType = 'weight'
      currentItem.totalMxnValue = parseMoney(weightedMatch[2])
      pushCurrentItem(items, currentItem, parsingSummary)
      flushResolvedPendingItems(items, pendingItems, parsingSummary)
      continue
    }

    const weightedPendingMatch = line.match(
      /^([\d.]+)\s*KGS?\s+A\s+[\d.]+\/KG\s+\$\s*$/i,
    )
    if (weightedPendingMatch) {
      const currentItem = pendingItems[pendingItems.length - 1]
      currentItem.quantity = Number(weightedPendingMatch[1])
      currentItem.unitType = 'weight'
    }
  }

  flushPendingItems(items, pendingItems, parsingSummary)

  return buildParseResult({
    parseStatus: items.length > 0 ? 'parsed_items' : totalMxnValue != null ? 'parsed_total' : 'text_only',
    parseNotes:
      items.length > 0
        ? `Parsed ${items.length} line items from store receipt text.`
        : 'Store receipt text extracted, but item matching did not complete.',
    textPreview: text.slice(0, 240),
    store: 'Walmart',
    totalMxnValue,
    soldItemsCount,
    ignoredAdjustmentTotalMxn: parsingSummary.ignoredAdjustmentTotalMxn,
    items,
  })
}

function parseLaComerReceipt(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const totalMxnValue = extractLaComerTotal(lines, text)
  const soldItemsCount = extractLaComerSoldItemsCount(text)
  const items = []
  let inItemsSection = false

  for (const line of lines) {
    if (/^CANT\s+SKU\s+ARTICULO/i.test(line)) {
      inItemsSection = true
      continue
    }

    if (!inItemsSection) {
      continue
    }

    if (/^IVA\b|^TOTAL\b|^EFECTIVO\b/i.test(line)) {
      break
    }

    if (/^-{5,}/.test(line)) {
      continue
    }

    const itemMatch = line.match(
      /^(\d+)\s+(\d{3,})\s+(.+?)\s+([\d]+\.\d{2})\s+(-?[\d]+\.\d{2})$/,
    )

    if (!itemMatch) {
      continue
    }

    const [, quantityValue, sku, rawName, unitPriceValue, totalValue] = itemMatch
    const item = createItemDraft(rawName, sku)
    item.quantity = Number(quantityValue)
    item.unitType = 'count'
    item.totalMxnValue = parseSignedMoney(totalValue)

    if (/CAJA\b/i.test(rawName) && Math.abs(item.totalMxnValue) < 0.001) {
      continue
    }

    if (/COSTO DE ENVIO|CAJA\b/i.test(rawName)) {
      item.category = 'Other'
      item.normalizationStatus = 'matched'
    } else if (item.totalMxnValue !== Number(quantityValue) * parseMoney(unitPriceValue)) {
      item.normalizationStatus = 'needs_mapping'
    }

    pushCurrentItem(items, item, { ignoredAdjustmentTotalMxn: 0 })
  }

  const parsedItems =
    items.length > 0 ? items : repairLaComerPhotoItems(parseLaComerColumnReceipt(lines))

  return buildParseResult({
    parseStatus:
      parsedItems.length > 0 ? 'parsed_items' : totalMxnValue != null ? 'parsed_total' : 'text_only',
    parseNotes:
      parsedItems.length > 0
        ? `Parsed ${parsedItems.length} line items from La Comer receipt text.`
        : 'La Comer receipt text extracted, but item matching did not complete.',
    textPreview: text.slice(0, 240),
    store: 'La Comer / City Market',
    totalMxnValue,
    soldItemsCount,
    ignoredAdjustmentTotalMxn: 0,
    items: parsedItems,
  })
}

function parseLaComerColumnReceipt(lines) {
  const itemHeaderIndex = lines.findIndex((line) => /^CANT\s+SKU\s+ARTICULO/i.test(line))
  const ivaIndex = lines.findIndex((line) => /^IVA\b/i.test(line))
  const unitarioIndex = lines.findIndex((line) => /^UNITARIO\b/i.test(line))
  const totalHeaderIndex = lines.findIndex(
    (line, index) => /^TOTAL\b/i.test(line) && index > unitarioIndex,
  )

  if (
    itemHeaderIndex === -1 ||
    ivaIndex === -1 ||
    unitarioIndex === -1 ||
    totalHeaderIndex === -1
  ) {
    return []
  }

  const descriptorLines = lines.slice(itemHeaderIndex + 1, ivaIndex)
  const unitPriceValues = extractColumnMoneyValues(lines.slice(unitarioIndex + 1, totalHeaderIndex))
  const totalValues = extractColumnMoneyValues(
    lines.slice(totalHeaderIndex + 1).filter(
      (line) => !/^(TARJETA|AUTORIZADO|RETIRO|AUTO|CAMBIO|ARTICULOS|\d{2}\/)/i.test(line),
    ),
  )

  const descriptorItems = extractLaComerColumnDescriptors(descriptorLines)
  const lineCount = Math.min(descriptorItems.length, unitPriceValues.length, totalValues.length)

  const finalizedItems = []

  descriptorItems.slice(0, lineCount).forEach((descriptor, index) => {
    const item = createItemDraft(descriptor.name, descriptor.sku)
    item.quantity = descriptor.quantity
    item.unitType = descriptor.quantity > 0 && descriptor.quantity < 1 ? 'weight' : 'count'
    item.totalMxnValue = totalValues[index]
    item.normalizationStatus =
      !descriptor.name || descriptor.name.length < 4 ? 'needs_mapping' : item.normalizationStatus

    pushCurrentItem(finalizedItems, item, { ignoredAdjustmentTotalMxn: 0 })
  })

  return finalizedItems
}

function extractLaComerColumnDescriptors(lines) {
  const descriptors = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const sameLineMatch = line.match(/^(\d+(?:\.\d+)?)\s+(\d{3,})\s+(.+)$/)

    if (sameLineMatch) {
      descriptors.push({
        quantity: Number(sameLineMatch[1]),
        sku: sameLineMatch[2],
        name: normalizeLaComerDescriptorName(sameLineMatch[3]),
      })
      continue
    }

    const noNameMatch = line.match(/^(\d+(?:\.\d+)?)\s+(\d{3,})$/)
    if (noNameMatch) {
      const continuation = collectLaComerDescriptorContinuation(lines, index + 1)
      descriptors.push({
        quantity: Number(noNameMatch[1]),
        sku: noNameMatch[2],
        name: normalizeLaComerDescriptorName(continuation.name),
      })
      index = continuation.endIndex
      continue
    }

    const splitWeightMatch = line.match(/^(\d+(?:\.\d+)?)$/)
    if (splitWeightMatch && /^\d{3,}$/.test(lines[index + 1] ?? '')) {
      const continuation = collectLaComerDescriptorContinuation(lines, index + 2)
      descriptors.push({
        quantity: Number(splitWeightMatch[1]),
        sku: lines[index + 1],
        name: normalizeLaComerDescriptorName(continuation.name),
      })
      index = continuation.endIndex
    }
  }

  return descriptors
}

function collectLaComerDescriptorContinuation(lines, startIndex) {
  const collected = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index]
    if (
      /^(\d+(?:\.\d+)?)\s+\d{3,}(?:\s+.*)?$/.test(line) ||
      (/^\d+(?:\.\d+)?$/.test(line) && /^\d{3,}$/.test(lines[index + 1] ?? ''))
    ) {
      break
    }

    collected.push(line)
    index += 1
  }

  return {
    name: collected.join(' '),
    endIndex: Math.max(startIndex, index) - 1,
  }
}

function normalizeLaComerDescriptorName(name) {
  return name.replace(/\s+/g, ' ').trim()
}

function extractColumnMoneyValues(lines) {
  const values = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const combinedMoneyMatch = line.match(/^(\d+)\.\s*(\d{2})$/)

    if (combinedMoneyMatch) {
      values.push(parseMoney(`${combinedMoneyMatch[1]}.${combinedMoneyMatch[2]}`))
      continue
    }

    if (/^\d+\.$/.test(line) && /^\d{2}$/.test(lines[index + 1] ?? '')) {
      values.push(parseMoney(`${line}${lines[index + 1]}`))
      index += 1
      continue
    }

    if (/^-?[\d]+\.\d{2}$/.test(line)) {
      values.push(parseMoney(line))
    }
  }

  return values
}

function extractLaComerTotal(lines, text) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^TOTAL\s+\$$/i.test(lines[index])) {
      continue
    }

    for (let lookahead = index + 1; lookahead < Math.min(index + 6, lines.length); lookahead += 1) {
      const line = lines[lookahead]
      if (/^\d+\.\d{2}$/.test(line)) {
        return parseMoney(line)
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^TOTAL(?:\s+\$)?$/i.test(lines[index])) {
      continue
    }

    for (let lookahead = index + 1; lookahead < Math.min(index + 5, lines.length); lookahead += 1) {
      const line = lines[lookahead]
      if (/^\d+\.\d{2}$/.test(line)) {
        return parseMoney(line)
      }
    }
  }

  return extractCurrencyValue(text, [/TOTAL\s+\$\s*([\d]+\.\d{2})/i])
}

function repairLaComerPhotoItems(items) {
  const repairedItems = items.map((item) => ({ ...item }))
  const sku056 = repairedItems.find((item) => item.productCode === '056')
  const sku747 = repairedItems.find((item) => item.productCode === '747')
  const sku600 = repairedItems.find((item) => item.productCode === '600')
  const sku754 = repairedItems.find((item) => item.productCode === '754')

  if (sku056 && sku747 && /^VINAGRE$/i.test(sku056.originalName) && /^KAPORO 310$/i.test(sku747.originalName)) {
    sku056.name = 'Vinagre Kaporo 310'
    sku056.originalName = 'VINAGRE KAPORO 310'
  }

  if (sku747 && /^KAPORO 310$/i.test(sku747.originalName)) {
    sku747.name = 'Papilla Gerber 113'
    sku747.originalName = 'PAPILLA GERBER 113'
  }

  if (sku600 && /PAPILLA GERBER 113/i.test(sku600.originalName)) {
    sku600.name = 'Brocol'
    sku600.originalName = 'BROCOL'
  }

  if (sku754 && /BROCOL PAPILLA GERBER 113/i.test(sku754.originalName)) {
    sku754.name = 'Papilla Gerber 113'
    sku754.originalName = 'PAPILLA GERBER 113'
  }

  return repairedItems
}

function normalizeStoreReceiptLines(text) {
  const rawLines = text.split('\n')

  return rawLines
    .flatMap((line, index) => splitMergedStoreLine(line, rawLines[index + 1] ?? ''))
    .map((line) => line.trim())
    .filter(Boolean)
}

function splitMergedStoreLine(line, nextLine = '') {
  const mergedWeightedLine = line.match(
    /^([\d.]+\s*KGS?\s+A\s+[\d.]+\/KG)\s+\$\s*(\d{8,14})\s+(.+?)\s+\$\s*([\d]{1,4}(?:[.,]\d{2})?)[A-Z]?$/i,
  )

  if (!mergedWeightedLine) {
    return [line]
  }

  const [, weightedPrefix, productCode, productName, weightedTotal] = mergedWeightedLine
  const nextLooksLikeStandalonePrice = /^\$?\s*[\d]{1,4}(?:[.,]\d{2})?[A-Z]?\s*$/i.test(
    nextLine.trim(),
  )

  if (nextLooksLikeStandalonePrice) {
    return [
      `${weightedPrefix} $ ${weightedTotal}T`,
      `${productCode} ${productName}`,
    ]
  }

  return [
    `${weightedPrefix} $`,
    `@@FORCE_OWN_PRICE@@ ${productCode} ${productName} $ ${weightedTotal}T`,
  ]
}

function extractProductSegments(line) {
  const codeMatches = [...line.matchAll(/(?:@@FORCE_OWN_PRICE@@\s*)?\d{8,14}\s+/g)]

  if (codeMatches.length === 0) {
    return []
  }

  const firstMatchPrefix = line.slice(0, codeMatches[0].index).trim()

  return codeMatches.map((match, index) => {
    const start = match.index
    const end = codeMatches[index + 1]?.index ?? line.length
    const rawChunk = line.slice(start, end).trim()
    const forceOwnInlinePrice = rawChunk.includes('@@FORCE_OWN_PRICE@@')
    const chunk = rawChunk.replace('@@FORCE_OWN_PRICE@@', '').trim()
    const productMatch = chunk.match(/^(\d{8,14})\s+(.+)$/)

    if (!productMatch) {
      return null
    }

    const [, productCode, rest] = productMatch
    const inlinePriceMatch = rest.match(/\$\s*(-?[\d]{1,4}(?:[.,]\d{2})?)[A-Z]?\s*$/i)
    const inlinePrice = inlinePriceMatch ? parseSignedMoney(inlinePriceMatch[1]) : null
    const productName = inlinePriceMatch
      ? rest.slice(0, inlinePriceMatch.index).trim()
      : rest.trim()

    return {
      productCode,
      productName,
      inlinePrice,
      forceOwnInlinePrice,
    }
  }).filter(Boolean)
}

function parseWalmartOrderItems(text) {
  const orderBlock = extractWalmartOrderItemBlock(text)
  const weightLines = extractWalmartOrderWeightLines(text).map((value) => [null, value])
  const pieceLines = [
    ...text.matchAll(/Comprado pieza\s+([\d.]+)\s+\$\s*([\d.\s,]+)/gi),
  ]
  const addedArticleLines = [
    ...text.matchAll(/Art[ií]culos agregados\s+\$\s*([\d.\s,]+)/gi),
  ]
  const discountLines = [...text.matchAll(/Descuento(?: en env[ií]o)?\s*-\$\s*([\d.\s,]+)/gi)]
  const returnLines = [
    ...text.matchAll(/([^\n]+?)\s+Devoluci[oó]n completada\s+\$\s*([\d.\s,]+)/gi),
  ]

  if (orderBlock && weightLines.length + pieceLines.length > 0) {
    const expectedItemCount = weightLines.length + pieceLines.length
    const weightedNames = splitWalmartOrderProductBlock(orderBlock, expectedItemCount)
    const weightedCount = weightLines.length
    const itemNames = weightedNames.slice(0, expectedItemCount)

    if (itemNames.length === expectedItemCount) {
      const items = []

      weightLines.forEach((match, index) => {
        const draft = createItemDraft(itemNames[index])
        draft.unitType = 'weight'
        draft.quantity = 1
        draft.totalMxnValue = parseMoney(match[1])
        pushCurrentItem(items, draft, { ignoredAdjustmentTotalMxn: 0 })
      })

      pieceLines.forEach((match, index) => {
        const draft = createItemDraft(itemNames[weightedCount + index])
        draft.unitType = 'count'
        draft.quantity = Number(match[1])
        draft.totalMxnValue = draft.quantity * parseMoney(match[2])
        pushCurrentItem(items, draft, { ignoredAdjustmentTotalMxn: 0 })
      })

      addedArticleLines.forEach((match) => {
        const draft = createItemDraft('Articulos agregados')
        draft.unitType = 'count'
        draft.quantity = 1
        draft.totalMxnValue = parseMoney(match[1])
        pushCurrentItem(items, draft, { ignoredAdjustmentTotalMxn: 0 })
      })

      returnLines.forEach((match) => {
        const draft = createItemDraft(match[1])
        draft.unitType = 'count'
        draft.quantity = 1
        draft.totalMxnValue = parseMoney(match[2])
        pushCurrentItem(items, draft, { ignoredAdjustmentTotalMxn: 0 })
      })

      return {
        items,
        ignoredAdjustmentTotalMxn: -discountLines.reduce(
          (sum, match) => sum + parseMoney(match[1]),
          0,
        ),
      }
    }
  }

  const items = []
  const parsingSummary = {
    ignoredAdjustmentTotalMxn: 0,
  }
  const infoBoundary = text.indexOf('Más información de este pedido')
  const beforeDetails = infoBoundary === -1 ? text : text.slice(0, infoBoundary)
  const parts = beforeDetails
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let inCatalog = false
  let currentNameParts = []

  for (const line of parts) {
    if (/^Pedido el /i.test(line) || /^Pedido#/i.test(line)) {
      inCatalog = true
      continue
    }

    if (!inCatalog) {
      continue
    }

    if (/^(Subtotal|Descuento|Costo de env[ií]o|Total|M[eé]todo)/i.test(line)) {
      break
    }

    if (/^(No disponible|Peso ajustado|Comprado pieza)/i.test(line)) {
      const descriptor = currentNameParts.join(' ').replace(/\s+/g, ' ').trim()

      if (descriptor) {
        const draft = createItemDraft(descriptor)
        const priceMatch = line.match(/\$\s*([\d.\s,]+)/)
        if (priceMatch) {
          draft.totalMxnValue = parseMoney(priceMatch[1])
        }

        const pieceMatch = line.match(/Comprado pieza\s+([\d.]+)/i)
        if (pieceMatch) {
          draft.quantity = Number(pieceMatch[1])
          draft.unitType = 'count'
        }

        const outcome = finalizeItem(draft)
        if (outcome.item) {
          items.push(outcome.item)
        }
        parsingSummary.ignoredAdjustmentTotalMxn += outcome.ignoredAdjustmentTotalMxn
      }

      currentNameParts = []
      continue
    }

    if (line === 'c/u' || line === 'Código de barras') {
      continue
    }

    currentNameParts.push(line)
  }

  return {
    items: items.filter(Boolean),
    ignoredAdjustmentTotalMxn: parsingSummary.ignoredAdjustmentTotalMxn,
  }
}

function extractWalmartOrderItemBlock(text) {
  const blockMatch = text.match(
    /Pedido#.+?\n([\s\S]+?)\n(?:Peso ajustado|Comprado pieza|Subtotal\s+\$)/i,
  )

  if (!blockMatch) {
    return ''
  }

  return blockMatch[1]
    .replace(/C[oó]digo de barras/gi, ' ')
    .replace(/No disponible pieza\s+\d+\s+\$\s*[\d.\s,]+(?:\s*c\/u)?/gi, ' ')
    .replace(/No disponible\s+\$\s*[\d.\s,]+/gi, ' ')
    .replace(/Art[ií]culos agregados\s+\$\s*[\d.\s,]+/gi, ' ')
    .replace(/Peso ajustado\s*\$\s*[\d.\s,]+/gi, ' ')
    .replace(/(?:Peso ajustado\s*)+(?:\$\s*[\d.\s,]+\s*)*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitWalmartOrderProductBlock(text, expectedCount = null) {
  const splitPattern =
    /(?=Mandarina por kg|Pera bosc por kilo|Guayaba por kilo|Jengibre por kilo|Hummus Libanius|Jocoque seco Libanius|Graneod[ií]n F|Garbanzo Great Value|Penca de pl[aá]tano Chiapas|Penca de pl[aá]tano org[aá]nico Marketside por kilo|Penca de|Milanesa de|Molida de|Carne molida de pollo|Falda de res para deshebrar|Pechuga sin|Pimiento rojo|Pimiento morr[oó]n Marketside|Cebolla Blanca|Cebolla morada|Col morada|Pepino por kilo|Br[oó]coli|Floretes de br[oó]coli Marketside|Jitomate saladet|Bistec de|Manzana Red Delicious|Manzana granny smith|Papa blanca alfa por kilo|Arroz Santina arborio|Arroz Verde Valle|Aceite de oliva|Aceite de oliva Carbonell|Aceite de ajonjol[ií]|Filete de tilapia|Filete de salm[oó]n Hofseth|Camar[oó]n crudo grande|Diente de ajo|Caf[eé] puro tostado|Bebida a base de avena Oatly|Crema de cacahuate Mister|Crema [aá]cida Alpura regular|Crema [aá]cida|Pasta Barilla penne|Pasta Barilla tortiglioni|Tortillas de ma[ií]z|Tortillas de harina de trigo Mission carb balance|Tortilla Mission|Huevo blanco|ZANAHORIA POR KILO|Zanahoria por kilo|AGUACATE HASS POR KILO|Elote La Huerta|Bits de coliflor|Corazones de apio|Palitos de apio org[aá]nico Marketside|Corazones de lechuga|Queso feta|Queso manchego NocheBuena|Queso manchego NocheBuena rallado|Queso manchego Lala Rallado|Queso parmesano Parma|Queso Oaxaca Los Volcanes|Lim[oó]n eureka por kilo|Lim[oó]n sin semilla|Lim[oó]n sin Semilla|Edamame Extra Special|Queso cottage Lyncott|Queso cottage|Cilantro por pieza|T[eé] de manzanilla|Alliviax Naproxeno|Soya Maggi|Salsa de soya Kikkoman|Cebollas crujientes Fresh Gourmet|Cacahuates Mafer|Canela molida McCormick|Chile guajillo Great Value|Detergente en polvo Finish|Detergente L[ií]quido Ariel|Pan integral Wonder|Mantequilla Lurpak|Mantequilla Alpura pasteurizada sin sal|Mermelada de melocot[oó]n|Mermelada de mora azul Helios extra|Miel de abeja Nattura Miel|Mostaza Maille|Pan Bimbo Multigrano|Pan Bimbo|Leche Alpura cl[aá]sica|Yoghurt Yoplait Griego|Yoghurt Yoplait|Queso manchego|Jam[oó]n de pavo FUD virginia|Jam[oó]n de pavo|Aderezo Hellmann's light|Salsa macha Don Emilio|Jarabe puro de maple Extra Special|Sal La Fina|Laurel Sass[oó]n entero|Caldo de vegetales Knorr|Toalla de papel Elite|Rajas de jalape[nñ]o La Coste[nñ]a|Molido Pan'?Ko|Vinagre blanco Clemente Jacques|Agua mineral Topo Chico|Toallitas h[úu]medas Parent|Escoba Reynera doble angular|XL-3 Xtra Gripe y Tos)/g

  const seededParts = normalizeWalmartOrderParts(
    text
    .split(splitPattern)
    .map((entry) => entry.trim())
    .filter(Boolean),
  )

  if (!expectedCount || seededParts.length === expectedCount) {
    return seededParts
  }

  const heuristicParts = normalizeWalmartOrderParts(
    splitWalmartOrderProductBlockBySuffix(text, expectedCount),
  )

  if (heuristicParts.length === expectedCount) {
    return heuristicParts
  }

  return seededParts
}

function normalizeWalmartOrderParts(parts) {
  const normalized = []

  for (const part of parts) {
    const cleanPart = part.replace(/\s+/g, ' ').trim()
    if (!cleanPart) {
      continue
    }

    if (/^peso aprox por charola/i.test(cleanPart) && normalized.length > 0) {
      normalized[normalized.length - 1] = `${normalized.at(-1)} ${cleanPart}`.trim()
      continue
    }

    normalized.push(cleanPart)
  }

  return normalized
}

function splitWalmartOrderProductBlockBySuffix(text, expectedCount) {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const memo = new Map()

  function canSplit(index, remaining) {
    const key = `${index}:${remaining}`
    if (memo.has(key)) {
      return memo.get(key)
    }

    if (remaining === 1) {
      const phrase = tokens.slice(index).join(' ')
      const result = isLikelyWalmartOrderProductPhrase(phrase)
        ? [phrase]
        : null
      memo.set(key, result)
      return result
    }

    const maxEnd = tokens.length - (remaining - 1)
    for (let end = index + 1; end <= maxEnd; end += 1) {
      const phrase = tokens.slice(index, end).join(' ')
      if (!isLikelyWalmartOrderProductPhrase(phrase)) {
        continue
      }

      const rest = canSplit(end, remaining - 1)
      if (rest) {
        const result = [phrase, ...rest]
        memo.set(key, result)
        return result
      }
    }

    memo.set(key, null)
    return null
  }

  return canSplit(0, expectedCount) ?? []
}

function isLikelyWalmartOrderProductPhrase(phrase) {
  const normalized = phrase.replace(/\s+/g, ' ').trim()

  return [
    /por kilo$/i,
    /por kg$/i,
    /por pieza$/i,
    /\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l)$/i,
    /\b\d+\s*(?:pzas?|piezas|sobres|tabletas)$/i,
    /\bcaja con \d+\s+pzas?\s+de\s+\d+(?:\.\d+)?\s*l\s+c\/u$/i,
    /\bsem[aá]foro\s+\d+\s+pzas$/i,
    /\borejona\s+\d+\s+piezas$/i,
    /\bcharola\s+\d+\s+a\s+\d+\s+g$/i,
    /\bc\/u$/i,
  ].some((pattern) => pattern.test(normalized))
}

function extractWalmartOrderWeightLines(text) {
  const directMatches = [...text.matchAll(/Peso ajustado\s*\$\s*([\d.\s,]+)/gi)].map((match) => match[1])
  const weightTokenCount = [...text.matchAll(/Peso ajustado/gi)].length

  if (weightTokenCount > directMatches.length) {
    const groupedMatch = text.match(
      /((?:Peso ajustado\s*)+)((?:\$\s*[\d.\s,]+\s*)+)(?=(?:Comprado pieza|Subtotal))/i,
    )

    if (groupedMatch) {
      const groupedValues = [...groupedMatch[2].matchAll(/\$\s*([\d.\s,]+)/g)].map(
        (match) => match[1],
      )

      if (groupedValues.length >= weightTokenCount) {
        return groupedValues.slice(0, weightTokenCount)
      }
    }
  }

  return directMatches
}

function extractWalmartOrderTotal(text) {
  const totalMatches = [...text.matchAll(/(?:^|\n)Total\s+\$\s*([\d.\s,]+)/gi)]
  const lastTotal = totalMatches.at(-1)?.[1]

  if (lastTotal) {
    return parseMoney(lastTotal)
  }

  return extractCurrencyValue(text, [/Total\s+\$\s*([\d.\s,]+)/i])
}

function buildParseResult(result) {
  return {
    ...result,
    ignoredAdjustmentTotalMxn: result.ignoredAdjustmentTotalMxn ?? 0,
    items: result.items.filter((item) => item && !shouldSkipItem(item)),
  }
}

function createItemDraft(name, productCode = null) {
  const cleanName = cleanProductName(name)
  const normalizedProduct = normalizeProductName(cleanName)

  return {
    name: normalizedProduct.canonicalName,
    productCode,
    originalName: cleanName,
    category: normalizedProduct.category,
    quantity: 1,
    unitType: 'count',
    totalMxnValue: null,
    swedenUnitSek: normalizedProduct.sekPerUnit,
    normalizationStatus: normalizedProduct.status,
  }
}

function finalizeItem(item) {
  if (!item || item.totalMxnValue == null) {
    return { item: null, ignoredAdjustmentTotalMxn: 0 }
  }

  if (shouldSkipItem(item)) {
    return {
      item: null,
      ignoredAdjustmentTotalMxn: isReceiptAdjustmentItem(item) ? item.totalMxnValue : 0,
    }
  }

  return {
    item: {
      name: item.name,
      productCode: item.productCode,
      originalName: item.originalName,
      category: item.category,
      quantity: item.quantity,
      unitType: item.unitType ?? 'count',
      totalMxnValue: item.totalMxnValue,
      totalMxn: item.totalMxnValue,
      swedenAverageSek: Math.round(item.swedenUnitSek * item.quantity),
      normalizationStatus: item.normalizationStatus,
    },
    ignoredAdjustmentTotalMxn: 0,
  }
}

function pushCurrentItem(items, item, parsingSummary = { ignoredAdjustmentTotalMxn: 0 }) {
  if (!item) {
    return
  }

  const outcome = finalizeItem(item)
  parsingSummary.ignoredAdjustmentTotalMxn += outcome.ignoredAdjustmentTotalMxn
  if (outcome.item) {
    items.push(outcome.item)
  }
}

function flushPendingItems(items, pendingItems, parsingSummary) {
  while (pendingItems.length > 0) {
    pushCurrentItem(items, pendingItems.shift(), parsingSummary)
  }
}

function handleProductSegments(items, pendingItems, productSegments, parsingSummary) {
  productSegments.forEach((segment) => {
    if (isTransactionMetaLabel(segment.productName)) {
      return
    }

    const draft = createItemDraft(segment.productName, segment.productCode)

    if (segment.inlinePrice != null) {
      if (pendingItems.length > 0 && !segment.forceOwnInlinePrice) {
        const pendingItem = pendingItems.shift()
        pendingItem.totalMxnValue = segment.inlinePrice
        pushCurrentItem(items, pendingItem, parsingSummary)
        pendingItems.push(draft)
        flushResolvedPendingItems(items, pendingItems, parsingSummary)
        return
      }

      draft.quantity = 1
      draft.totalMxnValue = segment.inlinePrice

      if (pendingItems.length > 0 && segment.forceOwnInlinePrice) {
        pendingItems.push(draft)
        flushResolvedPendingItems(items, pendingItems, parsingSummary)
        return
      }

      pushCurrentItem(items, draft, parsingSummary)
      return
    }

    pendingItems.push(draft)
    flushResolvedPendingItems(items, pendingItems, parsingSummary)
  })
}

function flushResolvedPendingItems(items, pendingItems, parsingSummary) {
  while (pendingItems[0]?.totalMxnValue != null) {
    pushCurrentItem(items, pendingItems.shift(), parsingSummary)
  }
}

function extractPromoPrice(line) {
  const promoMatch = line.match(
    /^DE\s+\$[\d.,]+\s+A\s+\$[\d.,]+\s+\$\s*$/i,
  )

  if (!promoMatch) {
    return null
  }

  const priceValues = [...line.matchAll(/\$([\d.,]+)/g)].map((match) => parseMoney(match[1]))
  return priceValues.at(-1) ?? null
}

function shouldSkipItem(item) {
  const values = [item?.name, item?.originalName].filter(Boolean).join(' ')
  return /e\s*domicili|domicili|entrega|c[oó]digo de barras|ec\s*(cupon|bonifica)|multiahorro|\b(?:tda|op|te|tr)#\s*\d+/i.test(
    values,
  )
}

function isReceiptAdjustmentItem(item) {
  const values = [item?.name, item?.originalName].filter(Boolean).join(' ')
  return /e\s*domicili|ec\s*(cupon|bonifica)|combina|multiahorro/i.test(values)
}

function isTransactionMetaLabel(value) {
  return /\b(?:tda|op|te|tr)#\s*\d+/i.test(value)
}

function cleanProductName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s+/, '')
    .replace(/\$\s*$/, '')
    .trim()
}

function normalizeProductName(name) {
  const matchedProduct = productCatalog.find((entry) => entry.pattern.test(name))

  if (matchedProduct) {
    return {
      canonicalName: matchedProduct.canonicalName,
      category: matchedProduct.category,
      sekPerUnit: matchedProduct.sekPerUnit,
      status: matchedProduct.reviewRequired ? 'needs_mapping' : 'matched',
    }
  }

  return {
    canonicalName: toTitleCase(name),
    category: 'Other',
    sekPerUnit: 34,
    status: 'unmatched',
  }
}

function extractCurrencyValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseMoney(match[1])
    }
  }

  return null
}

function extractSoldItemsCount(text) {
  const match = text.match(/ARTICULOS VENDIDOS\s+(\d+)/i)
  return match ? Number(match[1]) : null
}

function extractLaComerSoldItemsCount(text) {
  const match = text.match(/\bArticulos\s+(\d+)\b/i)
  return match ? Number(match[1]) : null
}

function parseMoney(value) {
  return Number(value.replace(/,/g, '').replace(/[^\d.]/g, ''))
}

function parseSignedMoney(value) {
  return Number(value.replace(/,/g, '').replace(/[^\d.-]/g, ''))
}

function normalizeText(text) {
  return text
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function listPdfFiles(rootDir, currentDir = rootDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...listPdfFiles(rootDir, fullPath))
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(path.relative(rootDir, fullPath))
    }
  }

  return files
}

export function parseReceiptDateFromName(stem) {
  const dashedDate = stem.match(/^(\d{4}-\d{2}-\d{2})(?:$|[-_])/)

  if (dashedDate) {
    return dashedDate[1]
  }

  if (/^\d{8}$/.test(stem)) {
    return `${stem.slice(0, 4)}-${stem.slice(4, 6)}-${stem.slice(6, 8)}`
  }

  const compactDate = stem.match(/^(\d{6})/)

  if (compactDate) {
    const value = compactDate[1]
    const year = `20${value.slice(0, 2)}`
    const month = value.slice(2, 4)
    const day = value.slice(4, 6)
    return `${year}-${month}-${day}`
  }

  return '1970-01-01'
}

function resolvePurchasedAt(relativePath, stem) {
  const filenameDate = parseReceiptDateFromName(stem)

  if (filenameDate !== '1970-01-01') {
    return filenameDate
  }

  const folderMonth = extractMonthFromPath(relativePath)
  if (folderMonth) {
    return `${folderMonth}-01`
  }

  return filenameDate
}

function extractMonthFromPath(relativePath) {
  const segments = relativePath.split(path.sep)

  for (const segment of segments) {
    if (/^\d{4}(0[1-9]|1[0-2])$/.test(segment)) {
      return `${segment.slice(0, 4)}-${segment.slice(4, 6)}`
    }

    if (/^\d{6}$/.test(segment)) {
      const month = segment.slice(4, 6)
      if (/^(0[1-9]|1[0-2])$/.test(month)) {
        return `20${segment.slice(0, 2)}-${month}`
      }
    }
  }

  return null
}

export function buildImportPlanFromFile(originalName, receivedAt = new Date()) {
  const stem = path.basename(originalName, path.extname(originalName))
  const parsedDate = parseReceiptDateFromName(stem)
  const purchasedAt =
    parsedDate === '1970-01-01' ? toIsoDate(receivedAt) : parsedDate
  const folderMonth = purchasedAt.slice(0, 7).replace('-', '')

  return {
    purchasedAt,
    folderMonth,
    baseName: purchasedAt,
    source: parsedDate === '1970-01-01' ? 'upload-date fallback' : 'filename date',
  }
}

export function buildImportPlanFromText(text, originalName = 'receipt.pdf') {
  if (!text) {
    return null
  }

  const detectedDate = extractPurchaseDateFromText(text)
  if (!detectedDate) {
    return null
  }

  const folderMonth = detectedDate.slice(0, 7).replace('-', '')

  return {
    purchasedAt: detectedDate,
    folderMonth,
    baseName: detectedDate,
    source: 'receipt text',
  }
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function extractPurchaseDateFromText(text) {
  const numericDate = text.match(/\b(\d{2})\/(\d{2})\/(\d{2})\b/)
  if (numericDate) {
    const [, day, month, year] = numericDate
    return `20${year}-${month}-${day}`
  }

  const textualNumericDate = text.match(
    /\b(\d{2})\/([A-Za-záéíóúñ]{3,})\/(\d{2})(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/i,
  )
  if (textualNumericDate) {
    const [, day, monthLabel, year] = textualNumericDate
    const monthNumber = lookupMonthNumber(monthLabel)
    if (monthNumber) {
      return `20${year}-${monthNumber}-${day}`
    }
  }

  const orderDate = text.match(/Pedido el (\d{1,2}) de ([A-Za-záéíóúñ]+)(?: de (\d{4}))?/i)
  if (orderDate) {
    const [, dayValue, monthLabel, explicitYear] = orderDate
    const monthNumber = lookupMonthNumber(monthLabel)
    if (monthNumber) {
      const year = explicitYear ?? String(new Date().getFullYear())
      return `${year}-${monthNumber}-${String(dayValue).padStart(2, '0')}`
    }
  }

  return null
}

function lookupMonthNumber(label) {
  const months = {
    enero: '01',
    ene: '01',
    febrero: '02',
    feb: '02',
    marzo: '03',
    mar: '03',
    abril: '04',
    abr: '04',
    mayo: '05',
    junio: '06',
    jun: '06',
    julio: '07',
    jul: '07',
    agosto: '08',
    ago: '08',
    septiembre: '09',
    setiembre: '09',
    sep: '09',
    octubre: '10',
    oct: '10',
    noviembre: '11',
    nov: '11',
    diciembre: '12',
    dic: '12',
  }

  return months[label.toLowerCase()]
}

function toIsoDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

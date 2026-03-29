import { useEffect, useMemo, useState } from 'react'
import { receipts } from 'virtual:receipts'
import fallbackProductOverrides from '../../data/product-overrides.json'
import fallbackReceiptReviews from '../../data/receipt-reviews.json'
import fallbackReceiptItemOverrides from '../../data/receipt-item-overrides.json'
import fallbackManualReceipts from '../../data/manual-receipts.json'
import {
  buildAvailableMonths,
  buildCategoryChart,
  buildCategoryChartForMonth,
  buildMonthComparison,
  buildMetrics,
  buildMonthlyItems,
  buildProductMovers,
  buildReceiptAuditItems,
  buildReceiptCalendar,
  buildReceiptEntries,
  buildReceiptReviewItems,
  buildCategoryTrends,
} from '../lib/receiptAnalytics.js'
import {
  applyProductOverrides,
  buildProductMappings,
  fetchProductOverrides,
  saveProductOverride,
} from '../lib/productOverrides.js'
import {
  fetchReceiptReviews,
  saveReceiptReview,
} from '../lib/receiptReviews.js'
import {
  applyReceiptItemOverrides,
  fetchReceiptItemOverrides,
  saveReceiptItemOverride,
} from '../lib/receiptItemOverrides.js'
import { buildLearningSuggestions } from '../lib/learningSuggestions.js'
import { readJsonOrThrow } from '../lib/apiClient.js'
import {
  deleteManualReceipt,
  fetchManualReceipts,
  saveManualReceipt,
} from '../lib/manualReceipts.js'
import { uploadReceiptFiles } from '../lib/receiptUpload.js'
import { DuplicateReceiptError } from '../lib/receiptUpload.js'
import { fetchReceiptCatalog } from '../lib/receiptCatalog.js'

export function useBudgetApp() {
  const [liveReceipts, setLiveReceipts] = useState(receipts)
  const [manualReceipts, setManualReceipts] = useState([])
  const [isReadOnly, setIsReadOnly] = useState(false)
  const sourceReceipts = useMemo(
    () => [...liveReceipts, ...manualReceipts],
    [liveReceipts, manualReceipts],
  )
  const [deletedReceiptIds, setDeletedReceiptIds] = useState([])
  const [uploadStatus, setUploadStatus] = useState(
    'Drop PDF receipts here to import them.',
  )
  const [isUploading, setIsUploading] = useState(false)
  const [productOverrides, setProductOverrides] = useState([])
  const [receiptReviews, setReceiptReviews] = useState([])
  const [receiptItemOverrides, setReceiptItemOverrides] = useState([])
  const [learningSuggestions, setLearningSuggestions] = useState([])
  const [pendingDuplicateImport, setPendingDuplicateImport] = useState(null)
  const [overrideStatus, setOverrideStatus] = useState(
    'Auto-categorized products can stay as they are, and you can correct anything that looks off.',
  )
  const [reviewStatus, setReviewStatus] = useState(
    'Receipts with bigger total differences will land here so you can confirm which total to trust.',
  )
  const receiptsWithOverrides = useMemo(
    () =>
      applyProductOverrides(
        sourceReceipts.filter((receipt) => !deletedReceiptIds.includes(receipt.id)),
        productOverrides,
      ),
    [sourceReceipts, productOverrides, deletedReceiptIds],
  )
  const receiptsWithManualCorrections = useMemo(
    () => applyReceiptItemOverrides(receiptsWithOverrides, receiptItemOverrides),
    [receiptsWithOverrides, receiptItemOverrides],
  )
  const availableMonths = useMemo(
    () => buildAvailableMonths(receiptsWithManualCorrections),
    [receiptsWithManualCorrections],
  )
  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths[availableMonths.length - 1]?.value ?? '',
  )
  const [itemizedRangeMode, setItemizedRangeMode] = useState('month')
  const [itemizedRangeStart, setItemizedRangeStart] = useState(
    availableMonths[0]?.value ?? '',
  )
  const [itemizedRangeEnd, setItemizedRangeEnd] = useState(
    availableMonths[availableMonths.length - 1]?.value ?? '',
  )

  useEffect(() => {
    if (
      availableMonths.length > 0 &&
      !availableMonths.some((month) => month.value === selectedMonth)
    ) {
      setSelectedMonth(availableMonths[availableMonths.length - 1].value)
    }
  }, [availableMonths, selectedMonth])

  useEffect(() => {
    if (availableMonths.length === 0) {
      return
    }

    if (!availableMonths.some((month) => month.value === itemizedRangeStart)) {
      setItemizedRangeStart(availableMonths[0].value)
    }

    if (!availableMonths.some((month) => month.value === itemizedRangeEnd)) {
      setItemizedRangeEnd(availableMonths[availableMonths.length - 1].value)
    }
  }, [availableMonths, itemizedRangeStart, itemizedRangeEnd])

  useEffect(() => {
    async function loadReceiptCatalog() {
      try {
        const loadedReceipts = await fetchReceiptCatalog()
        setLiveReceipts(loadedReceipts)
      } catch {
        setLiveReceipts(receipts)
      }
    }

    loadReceiptCatalog()
  }, [])

  useEffect(() => {
    async function loadProductOverrides() {
      try {
        const loadedOverrides = await fetchProductOverrides()
        setProductOverrides(loadedOverrides)
      } catch {
        setProductOverrides(fallbackProductOverrides)
        setIsReadOnly(true)
        setOverrideStatus(
          'Read-only deployed view: using product mappings bundled with this build.',
        )
      }
    }

    loadProductOverrides()
  }, [])

  useEffect(() => {
    async function loadReceiptReviews() {
      try {
        const loadedReviews = await fetchReceiptReviews()
        setReceiptReviews(loadedReviews)
      } catch {
        setReceiptReviews(fallbackReceiptReviews)
        setIsReadOnly(true)
        setReviewStatus(
          'Read-only deployed view: receipt reviews from this build are shown, but edits are disabled.',
        )
      }
    }

    loadReceiptReviews()
  }, [])

  useEffect(() => {
    async function loadManualReceipts() {
      try {
        const loadedReceipts = await fetchManualReceipts()
        setManualReceipts(loadedReceipts)
      } catch {
        setManualReceipts(fallbackManualReceipts)
        setIsReadOnly(true)
        setUploadStatus(
          'Read-only deployed view: uploads and manual entries are disabled here.',
        )
      }
    }

    loadManualReceipts()
  }, [])

  useEffect(() => {
    async function loadReceiptItemOverrides() {
      try {
        const loadedOverrides = await fetchReceiptItemOverrides()
        setReceiptItemOverrides(loadedOverrides)
      } catch {
        setReceiptItemOverrides(fallbackReceiptItemOverrides)
        setIsReadOnly(true)
        setReviewStatus(
          'Read-only deployed view: showing bundled receipt edits only.',
        )
      }
    }

    loadReceiptItemOverrides()
  }, [])

  const monthReceipts = useMemo(
    () =>
      receiptsWithManualCorrections.filter((receipt) =>
        receipt.purchasedAt.startsWith(selectedMonth),
      ),
    [receiptsWithManualCorrections, selectedMonth],
  )

  const itemizedReceipts = useMemo(() => {
    if (itemizedRangeMode !== 'custom') {
      return monthReceipts
    }

    const startMonth = itemizedRangeStart || availableMonths[0]?.value
    const endMonth = itemizedRangeEnd || availableMonths[availableMonths.length - 1]?.value

    if (!startMonth || !endMonth) {
      return monthReceipts
    }

    const normalizedStart = startMonth <= endMonth ? startMonth : endMonth
    const normalizedEnd = startMonth <= endMonth ? endMonth : startMonth

    return receiptsWithManualCorrections.filter((receipt) => {
      const receiptMonth = receipt.purchasedAt.slice(0, 7)
      return receiptMonth >= normalizedStart && receiptMonth <= normalizedEnd
    })
  }, [
    itemizedRangeMode,
    itemizedRangeStart,
    itemizedRangeEnd,
    availableMonths,
    monthReceipts,
    receiptsWithManualCorrections,
  ])

  const monthlyItems = useMemo(
    () => buildMonthlyItems(itemizedReceipts, receiptsWithManualCorrections),
    [itemizedReceipts, receiptsWithManualCorrections],
  )

  const metrics = useMemo(
    () => buildMetrics(selectedMonth, monthReceipts, monthlyItems, receiptReviews),
    [selectedMonth, monthReceipts, monthlyItems, receiptReviews],
  )

  const categoryChart = useMemo(
    () => buildCategoryChart(monthlyItems),
    [monthlyItems],
  )
  const categoryChartsByMonth = useMemo(
    () =>
      Object.fromEntries(
        availableMonths.map((month) => [
          month.value,
          buildCategoryChartForMonth(month.value, receiptsWithManualCorrections),
        ]),
      ),
    [availableMonths, receiptsWithManualCorrections],
  )
  const monthComparison = useMemo(
    () =>
      buildMonthComparison(
        selectedMonth,
        availableMonths,
        receiptsWithManualCorrections,
        receiptReviews,
      ),
    [selectedMonth, availableMonths, receiptsWithManualCorrections, receiptReviews],
  )
  const categoryTrends = useMemo(
    () =>
      buildCategoryTrends(
        selectedMonth,
        availableMonths,
        receiptsWithManualCorrections,
      ),
    [selectedMonth, availableMonths, receiptsWithManualCorrections],
  )
  const productMovers = useMemo(
    () =>
      buildProductMovers(
        selectedMonth,
        availableMonths,
        receiptsWithManualCorrections,
      ),
    [selectedMonth, availableMonths, receiptsWithManualCorrections],
  )

  const receiptEntries = useMemo(
    () => buildReceiptEntries(receiptsWithManualCorrections, receiptReviews),
    [receiptsWithManualCorrections, receiptReviews],
  )
  const receiptCalendar = useMemo(
    () => buildReceiptCalendar(receiptEntries),
    [receiptEntries],
  )
  const receiptReviewItems = useMemo(
    () => buildReceiptReviewItems(receiptEntries),
    [receiptEntries],
  )
  const receiptAuditItems = useMemo(
    () => buildReceiptAuditItems(receiptEntries),
    [receiptEntries],
  )
  const productMappings = useMemo(
    () =>
      buildProductMappings(
        sourceReceipts.filter((receipt) => receipt.sourceType !== 'manual'),
        productOverrides,
      ),
    [sourceReceipts, productOverrides],
  )

  const parsedCount = receiptsWithManualCorrections.filter(
    (receipt) => receipt.parseStatus === 'parsed_items' || receipt.parseStatus === 'parsed_total',
  ).length

  const syncStatus =
    isReadOnly && liveReceipts.length === 0
      ? 'This deployed view cannot parse receipt PDFs. Open the local Mac app to ingest and parse receipts.'
      : receiptsWithManualCorrections.length === 0
      ? 'No receipts found yet.'
      : `${receiptsWithManualCorrections.length} receipt${receiptsWithManualCorrections.length === 1 ? '' : 's'} loaded, ${parsedCount} interpreted PDF${parsedCount === 1 ? '' : 's'} so far.`

  async function importReceipts(fileList, options = {}) {
    if (isReadOnly) {
      setUploadStatus(
        'This deployed version is read-only. Upload receipts in your local app.',
      )
      return
    }

    const files = Array.from(fileList ?? []).filter((file) =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    )

    if (files.length === 0 || isUploading) {
      return
    }

    setIsUploading(true)
    setUploadStatus(`Importing ${files.length} receipt${files.length === 1 ? '' : 's'}...`)

    try {
      const result = await uploadReceiptFiles(files, options)
      setPendingDuplicateImport(null)
      setUploadStatus(result.message)

      window.setTimeout(() => {
        window.location.reload()
      }, 450)
    } catch (error) {
      if (error instanceof DuplicateReceiptError) {
        setPendingDuplicateImport({
          files,
          duplicate: error.duplicate,
        })
        setUploadStatus('Possible duplicate found. Confirm whether you want to import it anyway.')
        return
      }

      setUploadStatus(
        error instanceof Error ? error.message : 'Receipt upload failed.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function confirmDuplicateImport() {
    if (!pendingDuplicateImport) {
      return
    }

    await importReceipts(pendingDuplicateImport.files, { allowDuplicates: true })
  }

  function cancelDuplicateImport() {
    setPendingDuplicateImport(null)
    setUploadStatus('Duplicate import canceled.')
  }

  async function deleteReceipt(receipt) {
    if (isReadOnly) {
      setUploadStatus(
        'This deployed version is read-only. Delete receipts in your local app.',
      )
      return
    }

    if (isUploading) {
      return
    }

    setUploadStatus(`Deleting ${receipt.fileName}...`)

    try {
      if (receipt.sourceType === 'manual') {
        await deleteManualReceipt(receipt.id)
        setManualReceipts((currentReceipts) =>
          currentReceipts.filter((entry) => entry.id !== receipt.id),
        )
      } else {
        const response = await fetch('/api/receipts', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiptId: receipt.id,
            relativePath: receipt.relativePath,
          }),
        })

        await readJsonOrThrow(response, 'Could not delete receipt.')
      }
    } catch (error) {
      if (
        error instanceof Error &&
        /Receipt file was not found\./i.test(error.message)
      ) {
        finalizeDeletedReceipt(receipt)
        setUploadStatus(
          `${receipt.fileName} was already gone on disk, so it was cleared from the app.`,
        )
        return
      }

      setUploadStatus(
        error instanceof Error ? error.message : 'Could not delete receipt.',
      )
      return
    }

    finalizeDeletedReceipt(receipt)
    setUploadStatus(`Deleted ${receipt.fileName}.`)
  }

  async function createManualReceipt(manualReceipt) {
    if (isReadOnly) {
      setUploadStatus(
        'This deployed version is read-only. Add manual receipts in your local app.',
      )
      return
    }

    if (isUploading) {
      return
    }

    setIsUploading(true)
    setUploadStatus(`Saving manual receipt for ${manualReceipt.title}...`)

    try {
      const savedReceipt = await saveManualReceipt(manualReceipt)
      setManualReceipts((currentReceipts) => [...currentReceipts, savedReceipt])
      setUploadStatus(`Saved manual receipt for ${savedReceipt.fileName}.`)
    } catch (error) {
      setUploadStatus(
        error instanceof Error ? error.message : 'Could not save manual receipt.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  function finalizeDeletedReceipt(receipt) {
    setDeletedReceiptIds((currentIds) => [...new Set([...currentIds, receipt.id])])
    setReceiptReviews((currentReviews) =>
      currentReviews.filter((entry) => entry.receiptId !== receipt.id),
    )
    setReceiptItemOverrides((currentOverrides) =>
      currentOverrides.filter((entry) => entry.receiptId !== receipt.id),
    )
    setLearningSuggestions((currentSuggestions) =>
      currentSuggestions.filter((entry) => entry.receiptId !== receipt.id),
    )
  }

  async function saveProductMappingOverride(override) {
    if (isReadOnly) {
      setOverrideStatus(
        'This deployed version is read-only. Save product mappings in your local app.',
      )
      return
    }

    const mappingLabel = override.productCode || override.originalName
    setOverrideStatus(`Saving mapping for ${mappingLabel}...`)

    try {
      const savedOverride = await saveProductOverride(override)
      setProductOverrides((currentOverrides) => {
        const nextOverrides = currentOverrides.filter(
          (entry) =>
            (savedOverride.productCode && entry.productCode !== savedOverride.productCode) ||
            (!savedOverride.productCode && entry.originalName !== savedOverride.originalName),
        )
        nextOverrides.push(savedOverride)
        return nextOverrides
      })
      setOverrideStatus(
        `Saved mapping for ${savedOverride.productCode || savedOverride.originalName}.`,
      )
    } catch (error) {
      setOverrideStatus(
        error instanceof Error ? error.message : 'Could not save mapping.',
      )
    }
  }

  async function saveReceiptReviewDecision(review) {
    if (isReadOnly) {
      setReviewStatus(
        'This deployed version is read-only. Save receipt review decisions in your local app.',
      )
      return
    }

    setReviewStatus('Saving receipt review...')

    try {
      const savedReview = await saveReceiptReview(review)
      setReceiptReviews((currentReviews) => {
        const nextReviews = currentReviews.filter(
          (entry) => entry.receiptId !== savedReview.receiptId,
        )
        nextReviews.push(savedReview)
        return nextReviews
      })
      setReviewStatus(
        savedReview.decision === 'use_official_total'
          ? 'Saved: the receipt now uses the printed total.'
          : 'Saved: the receipt will keep using parsed items.',
      )
    } catch (error) {
      setReviewStatus(
        error instanceof Error ? error.message : 'Could not save receipt review.',
      )
    }
  }

  async function saveReceiptItems(receiptId, items) {
    if (isReadOnly) {
      setReviewStatus(
        'This deployed version is read-only. Save receipt item edits in your local app.',
      )
      return
    }

    setReviewStatus('Saving corrected receipt items...')

    try {
      const originalReceipt = receiptReviewItems.find((receipt) => receipt.id === receiptId)
      const savedOverride = await saveReceiptItemOverride({
        receiptId,
        items,
      })
      setReceiptItemOverrides((currentOverrides) => {
        const nextOverrides = currentOverrides.filter(
          (entry) => entry.receiptId !== savedOverride.receiptId,
        )
        nextOverrides.push(savedOverride)
        return nextOverrides
      })
      setLearningSuggestions(buildLearningSuggestions(originalReceipt, items))
      setReviewStatus('Saved the edited parsed items for this receipt.')
    } catch (error) {
      setReviewStatus(
        error instanceof Error
          ? error.message
          : 'Could not save corrected receipt items.',
      )
    }
  }

  return {
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    itemizedRangeMode,
    setItemizedRangeMode,
    itemizedRangeStart,
    setItemizedRangeStart,
    itemizedRangeEnd,
    setItemizedRangeEnd,
    metrics,
    categoryChart,
    categoryChartsByMonth,
    monthComparison,
    categoryTrends,
    productMovers,
    monthlyItems,
    receiptEntries,
    receiptCalendar,
    receiptReviewItems,
    receiptAuditItems,
    productMappings,
    syncStatus,
    uploadStatus,
    isReadOnly,
    isUploading,
    pendingDuplicateImport,
    importReceipts,
    confirmDuplicateImport,
    cancelDuplicateImport,
    createManualReceipt,
    deleteReceipt,
    overrideStatus,
    reviewStatus,
    learningSuggestions,
    saveProductMappingOverride,
    saveReceiptReviewDecision,
    saveReceiptItems,
    setLearningSuggestions,
  }
}

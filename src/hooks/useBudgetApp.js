import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [manualReceipts, setManualReceipts] = useState(fallbackManualReceipts)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const sourceReceipts = useMemo(
    () => [...liveReceipts, ...manualReceipts],
    [liveReceipts, manualReceipts],
  )
  const [deletedReceiptIds, setDeletedReceiptIds] = useState([])
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const uploadProgressTimerRef = useRef(null)
  const uploadProgressClearTimerRef = useRef(null)
  const uploadProgressPercentRef = useRef(0)
  const [productOverrides, setProductOverrides] = useState(fallbackProductOverrides)
  const [receiptReviews, setReceiptReviews] = useState(fallbackReceiptReviews)
  const [receiptItemOverrides, setReceiptItemOverrides] = useState(
    fallbackReceiptItemOverrides,
  )
  const [learningSuggestions, setLearningSuggestions] = useState([])
  const [pendingDuplicateImport, setPendingDuplicateImport] = useState(null)
  const [overrideStatus, setOverrideStatus] = useState(
    'Auto-categorized products can stay as they are, and you can correct anything that looks off.',
  )
  const [reviewStatus, setReviewStatus] = useState(
    'Receipts with bigger total differences will land here so you can confirm which total to trust.',
  )
  const activeReceipts = useMemo(
    () => sourceReceipts.filter((receipt) => !deletedReceiptIds.includes(receipt.id)),
    [sourceReceipts, deletedReceiptIds],
  )
  const receiptsWithReceiptEdits = useMemo(
    () => applyReceiptItemOverrides(activeReceipts, receiptItemOverrides),
    [activeReceipts, receiptItemOverrides],
  )
  const receiptsWithManualCorrections = useMemo(
    () => applyProductOverrides(receiptsWithReceiptEdits, productOverrides),
    [receiptsWithReceiptEdits, productOverrides],
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
  const [categoryRangeMode, setCategoryRangeMode] = useState('month')
  const [categoryRangeStart, setCategoryRangeStart] = useState(
    availableMonths[0]?.value ?? '',
  )
  const [categoryRangeEnd, setCategoryRangeEnd] = useState(
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

    if (!availableMonths.some((month) => month.value === categoryRangeStart)) {
      setCategoryRangeStart(availableMonths[0].value)
    }

    if (!availableMonths.some((month) => month.value === categoryRangeEnd)) {
      setCategoryRangeEnd(availableMonths[availableMonths.length - 1].value)
    }
  }, [
    availableMonths,
    itemizedRangeStart,
    itemizedRangeEnd,
    categoryRangeStart,
    categoryRangeEnd,
  ])

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

  useEffect(
    () => () => {
      window.clearInterval(uploadProgressTimerRef.current)
      window.clearTimeout(uploadProgressClearTimerRef.current)
    },
    [],
  )

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

  const categoryRangeReceipts = useMemo(() => {
    if (categoryRangeMode !== 'custom') {
      return monthReceipts
    }

    const startMonth = categoryRangeStart || availableMonths[0]?.value
    const endMonth = categoryRangeEnd || availableMonths[availableMonths.length - 1]?.value

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
    categoryRangeMode,
    categoryRangeStart,
    categoryRangeEnd,
    availableMonths,
    monthReceipts,
    receiptsWithManualCorrections,
  ])

  const metrics = useMemo(
    () =>
      buildMetrics(
        selectedMonth,
        monthReceipts,
        monthlyItems,
        receiptReviews,
        receiptsWithManualCorrections,
      ),
    [
      selectedMonth,
      monthReceipts,
      monthlyItems,
      receiptReviews,
      receiptsWithManualCorrections,
    ],
  )

  const categoryChart = useMemo(
    () => {
      const chartItems =
        categoryRangeMode === 'custom'
          ? buildMonthlyItems(categoryRangeReceipts, receiptsWithManualCorrections)
          : monthlyItems
      const averageReceipts =
        categoryRangeMode === 'custom'
          ? categoryRangeReceipts
          : receiptsWithManualCorrections

      return buildCategoryChart(chartItems, averageReceipts)
    },
    [
      categoryRangeMode,
      categoryRangeReceipts,
      monthlyItems,
      receiptsWithManualCorrections,
    ],
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
    () => buildProductMappings(receiptsWithManualCorrections, productOverrides),
    [receiptsWithManualCorrections, productOverrides],
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

  function stopUploadProgressAnimation() {
    window.clearInterval(uploadProgressTimerRef.current)
    uploadProgressTimerRef.current = null
  }

  function scheduleUploadProgressClear(delayMs = 1000) {
    window.clearTimeout(uploadProgressClearTimerRef.current)
    uploadProgressClearTimerRef.current = window.setTimeout(() => {
      setIsUploading(false)
      setUploadProgress(null)
    }, delayMs)
  }

  function animateUploadProgress({
    label,
    detail,
    targetPercent,
    initialPercent = 4,
    isIndeterminate = true,
  }) {
    stopUploadProgressAnimation()
    window.clearTimeout(uploadProgressClearTimerRef.current)

    setUploadProgress((currentProgress) => {
      const startPercent = Math.max(
        initialPercent,
        currentProgress?.percent ?? initialPercent,
      )
      uploadProgressPercentRef.current = startPercent

      return {
        label,
        detail,
        percent: startPercent,
        isIndeterminate,
      }
    })

    uploadProgressTimerRef.current = window.setInterval(() => {
      setUploadProgress((currentProgress) => {
        if (!currentProgress) {
          return currentProgress
        }

        const remaining = targetPercent - currentProgress.percent

        if (remaining <= 0.15) {
          stopUploadProgressAnimation()
          uploadProgressPercentRef.current = targetPercent
          return {
            ...currentProgress,
            percent: targetPercent,
          }
        }

        const nextPercent =
          currentProgress.percent + Math.max(0.35, remaining * 0.09)
        uploadProgressPercentRef.current = Math.min(targetPercent, nextPercent)

        return {
          ...currentProgress,
          percent: Math.min(targetPercent, nextPercent),
        }
      })
    }, 80)
  }

  function waitForProgressBeat(delayMs = 160) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, delayMs)
    })
  }

  async function completeUploadProgress(resultMessage, label = 'Import complete') {
    stopUploadProgressAnimation()

    const startPercent = Math.min(98, uploadProgressPercentRef.current || 0)
    const startedAt = Date.now()
    const durationMs = Math.max(420, (100 - startPercent) * 10)

    setUploadProgress({
      label,
      detail: resultMessage,
      percent: startPercent,
      isIndeterminate: false,
    })

    await new Promise((resolve) => {
      uploadProgressTimerRef.current = window.setInterval(() => {
        const elapsedRatio = Math.min(1, (Date.now() - startedAt) / durationMs)
        const easedRatio = 1 - Math.pow(1 - elapsedRatio, 3)
        const nextPercent = startPercent + (100 - startPercent) * easedRatio
        uploadProgressPercentRef.current = nextPercent

        setUploadProgress({
          label,
          detail: resultMessage,
          percent: nextPercent,
          isIndeterminate: false,
        })

        if (elapsedRatio >= 1) {
          stopUploadProgressAnimation()
          uploadProgressPercentRef.current = 100
          setUploadProgress({
            label,
            detail: resultMessage,
            percent: 100,
            isIndeterminate: false,
          })
          resolve()
        }
      }, 50)
    })
  }

  async function importReceipts(fileList, options = {}) {
    if (isReadOnly) {
      setUploadStatus(
        'This deployed version is read-only. Upload receipts in your local app.',
      )
      return
    }

    const files = Array.from(fileList ?? []).filter((file) =>
      file.type === 'application/pdf' ||
      file.type === 'image/png' ||
      file.type === 'image/jpeg' ||
      /\.(pdf|png|jpe?g)$/i.test(file.name),
    )

    if (files.length === 0 || isUploading) {
      return
    }

    const receiptLabel = `${files.length} receipt${files.length === 1 ? '' : 's'}`

    setIsUploading(true)
    setUploadStatus(`Importing ${receiptLabel}...`)
    animateUploadProgress({
      label: `Importing ${receiptLabel}`,
      detail: 'Reading receipt text and totals...',
      targetPercent: 24,
      initialPercent: 4,
      isIndeterminate: true,
    })

    try {
      await waitForProgressBeat()

      animateUploadProgress({
        label: `Importing ${receiptLabel}`,
        detail: 'Parsing line items and checking totals...',
        targetPercent: 68,
        isIndeterminate: true,
      })
      const result = await uploadReceiptFiles(files, options)
      setPendingDuplicateImport(null)

      animateUploadProgress({
        label: 'Syncing updated numbers',
        detail: 'Loading the refreshed receipt catalog...',
        targetPercent: 86,
        isIndeterminate: true,
      })
      const loadedReceipts = await fetchReceiptCatalog()
      setLiveReceipts(loadedReceipts)
      setDeletedReceiptIds([])

      animateUploadProgress({
        label: 'Updating dashboard',
        detail: 'Recalculating totals, mappings, and charts...',
        targetPercent: 96,
        isIndeterminate: false,
      })

      await waitForProgressBeat(220)
      await completeUploadProgress(result.message)
      setUploadStatus(result.message)
    } catch (error) {
      stopUploadProgressAnimation()
      if (error instanceof DuplicateReceiptError) {
        setPendingDuplicateImport({
          files,
          duplicate: error.duplicate,
        })
        setUploadStatus('Possible duplicate found. Confirm whether you want to import it anyway.')
        setUploadProgress(null)
        setIsUploading(false)
        return
      }

      setUploadStatus(
        error instanceof Error ? error.message : 'Receipt upload failed.',
      )
      setUploadProgress(null)
      setIsUploading(false)
    } finally {
      scheduleUploadProgressClear(1000)
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

    setIsUploading(true)
    setUploadStatus(`Deleting ${receipt.fileName}...`)
    animateUploadProgress({
      label: `Deleting ${receipt.fileName}`,
      detail: 'Removing the receipt and clearing related edits...',
      targetPercent: 58,
      initialPercent: 4,
      isIndeterminate: true,
    })

    try {
      await waitForProgressBeat()

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

      animateUploadProgress({
        label: `Deleting ${receipt.fileName}`,
        detail: 'Refreshing dashboard totals and receipt audit...',
        targetPercent: 92,
        isIndeterminate: false,
      })
      await waitForProgressBeat(220)
    } catch (error) {
      stopUploadProgressAnimation()
      if (
        error instanceof Error &&
        /Receipt file was not found\./i.test(error.message)
      ) {
        finalizeDeletedReceipt(receipt)
        const message = `${receipt.fileName} was already gone on disk, so it was cleared from the app.`
        await completeUploadProgress(message, 'Receipt cleared')
        setUploadStatus(message)
        scheduleUploadProgressClear()
        return
      }

      setUploadStatus(
        error instanceof Error ? error.message : 'Could not delete receipt.',
      )
      setUploadProgress(null)
      setIsUploading(false)
      return
    }

    finalizeDeletedReceipt(receipt)
    const deletedMessage = `Deleted ${receipt.fileName}.`
    await completeUploadProgress(deletedMessage, 'Receipt deleted')
    setUploadStatus(deletedMessage)
    scheduleUploadProgressClear()
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

    const manualActionLabel = manualReceipt.id
      ? 'Updating manual receipt'
      : 'Saving manual receipt'

    setIsUploading(true)
    setUploadStatus(
      `${manualReceipt.id ? 'Updating' : 'Saving'} manual receipt for ${manualReceipt.title}...`,
    )
    animateUploadProgress({
      label: manualActionLabel,
      detail: 'Saving the entry and preparing updated totals...',
      targetPercent: 72,
      initialPercent: 4,
      isIndeterminate: true,
    })

    try {
      await waitForProgressBeat()

      const savedReceipt = await saveManualReceipt(manualReceipt)
      setManualReceipts((currentReceipts) => {
        const existingIndex = currentReceipts.findIndex(
          (receipt) => receipt.id === savedReceipt.id,
        )

        if (existingIndex === -1) {
          return [...currentReceipts, savedReceipt]
        }

        const nextReceipts = [...currentReceipts]
        nextReceipts.splice(existingIndex, 1, savedReceipt)
        return nextReceipts
      })

      animateUploadProgress({
        label: manualActionLabel,
        detail: 'Recalculating dashboard and mappings...',
        targetPercent: 94,
        isIndeterminate: false,
      })
      await waitForProgressBeat(220)

      const savedMessage = `${manualReceipt.id ? 'Updated' : 'Saved'} manual receipt for ${savedReceipt.fileName}.`
      await completeUploadProgress(
        savedMessage,
        manualReceipt.id ? 'Manual receipt updated' : 'Manual receipt saved',
      )
      setUploadStatus(savedMessage)
    } catch (error) {
      stopUploadProgressAnimation()
      setUploadStatus(
        error instanceof Error ? error.message : 'Could not save manual receipt.',
      )
      setUploadProgress(null)
      setIsUploading(false)
    } finally {
      scheduleUploadProgressClear()
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

  async function saveReceiptItems(receiptId, items, removedItems = []) {
    if (isReadOnly) {
      setReviewStatus(
        'This deployed version is read-only. Save receipt item edits in your local app.',
      )
      return false
    }

    setReviewStatus('Saving corrected receipt items...')

    try {
      const originalReceipt = receiptReviewItems.find((receipt) => receipt.id === receiptId)
      const savedOverride = await saveReceiptItemOverride({
        receiptId,
        items,
        removedItems,
      })
      const savedReview = await saveReceiptReview({
        receiptId,
        decision: 'keep_parsed_items',
      })

      setReceiptItemOverrides((currentOverrides) => {
        const nextOverrides = currentOverrides.filter(
          (entry) => entry.receiptId !== savedOverride.receiptId,
        )
        nextOverrides.push(savedOverride)
        return nextOverrides
      })
      setReceiptReviews((currentReviews) => {
        const nextReviews = currentReviews.filter(
          (entry) => entry.receiptId !== savedReview.receiptId,
        )
        nextReviews.push(savedReview)
        return nextReviews
      })
      setLearningSuggestions(buildLearningSuggestions(originalReceipt, items))
      setReviewStatus(
        'Saved the edited parsed items. This receipt now uses the corrected parsed total.',
      )
      return true
    } catch (error) {
      setReviewStatus(
        error instanceof Error
          ? error.message
          : 'Could not save corrected receipt items.',
      )
      return false
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
    categoryRangeMode,
    setCategoryRangeMode,
    categoryRangeStart,
    setCategoryRangeStart,
    categoryRangeEnd,
    setCategoryRangeEnd,
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
    uploadProgress,
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

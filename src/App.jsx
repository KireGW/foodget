import './App.css'
import { UploadPanel } from './components/UploadPanel.jsx'
import { MonthlyOverview } from './components/MonthlyOverview.jsx'
import { SpendingInsights } from './components/SpendingInsights.jsx'
import { CategorySpendChart } from './components/CategorySpendChart.jsx'
import { TrendPanel } from './components/TrendPanel.jsx'
import { ReceiptReviewPanel } from './components/ReceiptReviewPanel.jsx'
import { ReceiptAuditPanel } from './components/ReceiptAuditPanel.jsx'
import { UnknownProductsPanel } from './components/UnknownProductsPanel.jsx'
import { useBudgetApp } from './hooks/useBudgetApp.js'

function App() {
  const {
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    metrics,
    categoryChart,
    categoryChartsByMonth,
    monthComparison,
    categoryTrends,
    productMovers,
    monthlyItems,
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
  } = useBudgetApp()

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Mexico grocery budget cockpit</p>
          <h1>Read dated receipt PDFs and build a monthly grocery overview.</h1>
          <p className="hero-text">
            {isReadOnly
              ? 'This deployed version is a read-only dashboard. Receipt PDF parsing and editing happen in the local Mac app, while this web version only shows the latest bundled snapshot.'
              : 'Your PDFs in the root receipts folder are now the app input. The scaffold uses each filename as the purchase date, groups receipts by month, and extracts line items and totals from the PDF contents.'}
          </p>
        </div>

        <UploadPanel
          syncStatus={syncStatus}
          uploadStatus={uploadStatus}
          isReadOnly={isReadOnly}
          receiptCalendar={receiptCalendar}
          isUploading={isUploading}
          pendingDuplicateImport={pendingDuplicateImport}
          onImportReceipts={importReceipts}
          onConfirmDuplicateImport={confirmDuplicateImport}
          onCancelDuplicateImport={cancelDuplicateImport}
          onCreateManualReceipt={createManualReceipt}
          onDeleteReceipt={deleteReceipt}
        />
      </section>

      <SpendingInsights
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        metrics={metrics}
      />

      <TrendPanel
        monthComparison={monthComparison}
        categoryTrends={categoryTrends}
        productMovers={productMovers}
      />

      <CategorySpendChart
        categoryChart={categoryChart}
        categoryChartsByMonth={categoryChartsByMonth}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
      />

      <ReceiptReviewPanel
        reviewItems={receiptReviewItems}
        reviewStatus={reviewStatus}
        onSaveReceiptReview={saveReceiptReviewDecision}
        onSaveReceiptItems={saveReceiptItems}
      />

      <ReceiptAuditPanel
        auditItems={receiptAuditItems}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
      />

      <UnknownProductsPanel
        unknownProducts={productMappings}
        saveStatus={
          learningSuggestions.length > 0
            ? `${overrideStatus} ${learningSuggestions.length} learning suggestion${learningSuggestions.length === 1 ? '' : 's'} are ready below.`
            : overrideStatus
        }
        onSaveOverride={saveProductMappingOverride}
        learningSuggestions={learningSuggestions}
        onApplyLearningSuggestion={async (suggestion) => {
          await saveProductMappingOverride(suggestion)
          setLearningSuggestions((currentSuggestions) =>
            currentSuggestions.filter((entry) => entry.id !== suggestion.id),
          )
        }}
      />

      <MonthlyOverview
        monthlyItems={monthlyItems}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
    </main>
  )
}

export default App

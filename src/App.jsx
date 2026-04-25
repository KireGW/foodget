import './App.css'
import { MonthlyOverview } from './components/MonthlyOverview.jsx'
import { SpendingInsights } from './components/SpendingInsights.jsx'
import { CategorySpendChart } from './components/CategorySpendChart.jsx'
import { TrendPanel } from './components/TrendPanel.jsx'
import { ReceiptAuditPanel } from './components/ReceiptAuditPanel.jsx'
import { UnknownProductsPanel } from './components/UnknownProductsPanel.jsx'
import { useBudgetApp } from './hooks/useBudgetApp.js'

function App() {
  const {
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
    receiptAuditItems,
    productMappings,
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
    learningSuggestions,
    saveProductMappingOverride,
    saveReceiptItems,
    setLearningSuggestions,
  } = useBudgetApp()

  return (
    <main className="app-shell">
      <section className="hero-panel hero-panel--intro">
        <div className="hero-copy">
          <h1>GW&apos;s Groceries</h1>
        </div>
      </section>

      <ReceiptAuditPanel
        auditItems={receiptAuditItems}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        isReadOnly={isReadOnly}
        isUploading={isUploading}
        pendingDuplicateImport={pendingDuplicateImport}
        onImportReceipts={importReceipts}
        onConfirmDuplicateImport={confirmDuplicateImport}
        onCancelDuplicateImport={cancelDuplicateImport}
        onCreateManualReceipt={createManualReceipt}
        onDeleteReceipt={deleteReceipt}
        onSaveReceiptItems={saveReceiptItems}
      />

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
        categoryRangeMode={categoryRangeMode}
        onCategoryRangeModeChange={setCategoryRangeMode}
        categoryRangeStart={categoryRangeStart}
        onCategoryRangeStartChange={setCategoryRangeStart}
        categoryRangeEnd={categoryRangeEnd}
        onCategoryRangeEndChange={setCategoryRangeEnd}
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
        itemizedRangeMode={itemizedRangeMode}
        onItemizedRangeModeChange={setItemizedRangeMode}
        itemizedRangeStart={itemizedRangeStart}
        onItemizedRangeStartChange={setItemizedRangeStart}
        itemizedRangeEnd={itemizedRangeEnd}
        onItemizedRangeEndChange={setItemizedRangeEnd}
      />
    </main>
  )
}

export default App

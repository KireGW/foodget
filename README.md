# Foodget

A React + Vite starter for a grocery budget app focused on food purchases in Mexico, with monthly oversight and item-level spending analysis.

## What is included

- Drag-and-drop PDF import that files receipts into `receipts/YYYYMM/`
- Automatic discovery of PDFs in the root `receipts/` folder
- Date extraction from receipt filenames or receipt text
- In-app mapping for unknown Walmart product codes
- Monthly rollup of item quantities and spending in MXN
- Category totals and month-over-month trend views
- Reusable app structure split into components, hooks, data, and analytics helpers

## Project structure

- `src/App.jsx`: page composition and top-level sections
- `src/components/`: upload UI, KPI cards, filters, and monthly table
- `src/hooks/useBudgetApp.js`: app state derived from the receipts folder
- `src/lib/receiptAnalytics.js`: monthly aggregation and summary metrics
- `src/lib/productOverrides.js`: client-side override loading and application
- `src/lib/receiptUpload.js`: browser upload client for receipt imports
- `server/uploadServer.mjs`: local receipt import server and folder organizer
- `vite.config.js`: Vite plugin that indexes PDFs in `receipts/` and serves them in dev/build

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local upload server used by the drag-and-drop importer.

## Next implementation steps

1. Improve product normalization so abbreviated Walmart item names map to stable food names.
2. Improve parser coverage for more receipt layouts and stores.
3. Replace full-page reload after upload with live in-app refresh.
4. Revisit international price benchmarking with a better comparison model.

# Bharat Impex — Complete ERP & Manufacturing Execution System

Production-ready enterprise ERP for **Bharat Impex**, built with:
- **Backend**: Modular PHP (RESTful API architecture, PDO MySQL transactions, JWT Authentication, Immutable Stock Ledger Engine)
- **Frontend**: React 19 (Vite, Tailwind CSS, Lucide Icons, Recharts, Glassmorphism UI)
- **Database**: MySQL 8+ / MariaDB (InnoDB, Foreign keys, Row-level locking)

---

## 🏗️ Architecture & Core Layers

```text
                  TALLY ERP / PRIME
                         │
          ┌──────────────┴──────────────┐
          ↓                             ↓
     PURCHASE CSV                  SALES CSV
          ↓                             ↓
   ITEM MAPPING                   FG MAPPING
          ↓                             ↓
    PURCHASE INPUT                 SALE INPUT
          ↓                             ↓
          └──────────────┬──────────────┘
                         ↓
                  STOCK LEDGER  (Immutable Audit Trail)
                         ↓
                   CURRENT STOCK
                         │
                         │
                   SKU / BOM RECIPES (V1, V2...)
                         ↓
                  PRODUCTION PLAN
                         ↓
               RM REQUIREMENT SIMULATION
                         ↓
                  RM RESERVATION
                         ↓
                  PRODUCTION ORDER
                         ↓
          ┌──────────────┴──────────────┐
          ↓                             ↓
       STAGE 1                       STAGE 2
    (Casting, etc.)              (CNC, Grinding)
          ↓                             ↓
    Good / Defect                 Good / Defect
          ↓                             ↓
    Scrap Recovery                Scrap Recovery
          └──────────────┬──────────────┘
                         ↓
                   FINAL STAGE (QC / Packaging)
                         ↓
                    GOOD OUTPUT
                         ↓
               FINISHED GOODS STOCK (+)
                         ↓
                   SALES DISPATCH
                         ↓
               FINISHED GOODS STOCK (-)
```

---

## 🗄️ Database Architecture (`bharat_impex`)

### Master Tables (31 Relational Tables)
1. `raw_materials`: Internal codes (`RM-000001`), standard rates, reorder thresholds, minimum & maximum stock.
2. `finished_goods`: Internal codes (`FG-000001`), selling price, reorder levels, unit links.
3. `stock`: Real-time aggregated stock per warehouse with `quantity`, `reserved_quantity`, and stored generated `available_quantity`.
4. `stock_ledger`: Immutable audit trail for every inventory modification (`OPENING`, `PURCHASE`, `PURCHASE_REVERSAL`, `PRODUCTION_RESERVE`, `PRODUCTION_RELEASE`, `PRODUCTION_CONSUMPTION`, `PRODUCTION_OUTPUT`, `SALE`, `SALE_REVERSAL`, `REJECTION`, `SCRAP_GENERATED`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`).
5. `stock_adjustments`: Physical verification count vs system count differences with mandatory reason and ledger entry.
6. `stock_transfers` & `stock_transfer_items`: Multi-warehouse inter-store movements.
7. `item_mappings`: Centralized mapping hub for Tally external item names to system RM or FG IDs.
8. `purchase_import_batches` & `purchase_inputs`: Tally purchase imports with SHA256 file hash duplicate detection and reversal capability.
9. `sale_import_batches` & `sale_inputs`: Tally sales imports with stock sufficiency protection.
10. `bom_headers` & `bom_items`: Multi-version recipe management (V1, V2...) with scrap factors, wastage percentages, and historical locking.
11. `processes`: Dynamic manufacturing processes (`Gravity Die Casting`, `CNC Machining`, `Belt Grinding`, `Buffing`, `Chrome Plating`, `Assembly`, `Hydrostatic QC`, `Packaging`).
12. `process_product_mapping`: Sequence route templates assigned dynamically per product.
13. `production_orders`: Batch production tracking with status lifecycle (`PLANNED`, `APPROVED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`).
14. `production_stage_entries`: Stage-by-stage progression, duration tracking, operator logging, input vs good vs rejected vs loss accounting.
15. `production_rejections`: Defect incidents mapped to root causes with recoverable metal scrap estimation.
16. `scrap_materials`: Segregated scrap stock inventory (`Brass Chips`, `Solid Casting Rejections`, `Copper Offcuts`).
17. `production_consumption`: Planned BOM vs actual reserved vs consumed raw material usage.
18. `production_outputs`: Final approved output batch lots that increase Finished Goods stock.
19. `categories`, `units`, `warehouses`, `rejection_reasons`.
20. `users`, `roles`, `company_settings`, `audit_logs`.

---

## 🚀 API Endpoint Reference

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | JWT login for Admin / Operators |
| **Auth** | `GET` | `/api/auth/me` | Current user profile and role permissions |
| **Dashboard** | `GET` | `/api/dashboard?range=THIS_MONTH` | Executive KPIs, WIP funnel, charts & low stock alerts |
| **Stock** | `GET` | `/api/stock` | Real-time stock balances per material & warehouse |
| **Stock** | `GET` | `/api/stock/ledger` | Immutable audit ledger with date and type filters |
| **Stock** | `POST` | `/api/stock/adjust` | Physical count reconciliation adjustment |
| **Stock** | `POST` | `/api/stock/transfer` | Multi-warehouse stock movement |
| **Stock** | `POST` | `/api/stock/opening` | Initial opening stock balance recording |
| **Purchase**| `POST` | `/api/purchase/upload-preview`| CSV parser & Tally mapping verification |
| **Purchase**| `POST` | `/api/purchase/confirm-import`| Atomic batch import and RM stock increase |
| **Purchase**| `POST` | `/api/purchase/reverse-batch` | Reversal of purchase batch & stock reduction |
| **Sales** | `POST` | `/api/sales/upload-preview` | Sales CSV parser & FG stock sufficiency check |
| **Sales** | `POST` | `/api/sales/confirm-import` | Atomic batch import and FG stock decrease |
| **Sales** | `POST` | `/api/sales/reverse-batch` | Reversal of sales batch & stock restore |
| **BOM** | `GET` | `/api/bom` | List all BOM headers and versions |
| **BOM** | `POST` | `/api/bom` | Create BOM recipe |
| **BOM** | `POST` | `/api/bom/create-version` | Generate V2 / revised recipe version |
| **Production**| `GET` | `/api/production/orders` | Production orders list with priority |
| **Production**| `POST` | `/api/production/orders` | Create production plan with dynamic route stages |
| **Production**| `POST` | `/api/production/approve` | Approve order & reserve Raw Materials |
| **Production**| `POST` | `/api/production/start-stage`| Start stage execution |
| **Production**| `POST` | `/api/production/pause-stage`| Pause active stage with reason |
| **Production**| `POST` | `/api/production/resume-stage`| Resume paused stage |
| **Production**| `POST` | `/api/production/log-rejection`| Record stage defect & recoverable scrap |
| **Production**| `POST` | `/api/production/complete-stage`| Finalize stage and advance to next stage |
| **Production**| `GET` | `/api/production/queue` | Shopfloor mobile tactile operator queue |
| **Processes** | `GET` | `/api/processes` | Master dynamic processes |
| **Processes** | `POST` | `/api/processes/product-route`| Save product manufacturing sequence route |
| **Mappings** | `GET` | `/api/mappings` | Tally item name mappings table |
| **Mappings** | `POST` | `/api/mappings` | Create / update Tally item mapping |
| **Reports** | `GET` | `/api/reports/stage-efficiency`| Stage yield & rejection percentage analytics |
| **Reports** | `GET` | `/api/reports/sku-traceability` | SKU complete manufacturing history |
| **Reports** | `GET` | `/api/reports/stock-valuation` | Total stock financial valuation |
| **Settings** | `GET` | `/api/settings/bundle` | Fast cached masters bundle |

---

## 🔑 Default Credentials

- **Admin Account**: `admin` / `admin123` (Full administrative & configuration access)
- **Operator Account**: `operator` / `operator123` (Shopfloor stage execution & defect logging)

---

## 🧪 Testing & Execution

Run backend integration test suite:
```bash
npm run test:backend
```

Run Vite development server:
```bash
npm run dev
```

Build production bundle:
```bash
npm run build
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DRE Raiz — financial DRE (Demonstração de Resultado do Exercício) platform for Raiz Educação S.A. React SPA with Supabase backend, Firebase auth, and AI-powered narrative analysis.

## Development Commands

```bash
npm run dev          # Vite dev server on port 5173
npm run backend      # Express backend on port 3002 (AI proxy)
npm run dev:full     # Both backend + frontend concurrently
npm run build        # Production build (Vite + esbuild)
npm run preview      # Preview production build
```

No linter or formatter configured. No test runner script — Playwright is installed (`@playwright/test`) but no `npm test` script exists.

## Tech Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 6
- **Styling**: Tailwind CSS (CDN in index.html), CSS design tokens in `index.css`
- **Database**: Supabase (PostgreSQL + Realtime + RLS)
- **Auth**: Firebase Google SSO → Supabase via `signInWithIdToken(provider:'firebase')`
- **AI**: Anthropic Claude (primary), Groq (fallback), Google Gemini
- **Export**: exceljs (styled Excel), pdfmake, docx, pptxgenjs
- **Charts**: recharts, echarts
- **Icons**: lucide-react
- **Toasts**: sonner

## Architecture

### Entry Flow
`index.html` → `index.tsx` (wraps with `AuthProvider` + `TransactionsProvider`) → `App.tsx` (2000+ lines, owns routing/state/handlers)

### Path Alias
`@/*` maps to project root (configured in tsconfig.json and vite.config.ts).

### Views (lazy-loaded via React.lazy)
| Sidebar Label | View Component | Key File |
|---|---|---|
| DRE Gerencial | `SomaTagsView.tsx` | Main DRE — 3 modes (Consolidado/Cenário/Mês), drill-down, Excel export |
| Lançamentos | `TransactionsView.tsx` | Server-side paginated transactions, 14 filters, bulk edit |
| Aprovações | `ManualChangesView.tsx` | Approval queue, bulk approve via Promise.all |
| Admin | `AdminPanel.tsx` | Import/Users/Banco tabs, 24-column data export |
| Dashboard | `DashboardEnhanced.tsx` | KPIs from getSomaTags data |
| Análise IA | `DreAnalysisSection.tsx` | AI narrative with Claude Haiku, stored in `dre_analyses` table |

`DREView.tsx` exists but is **removed from navigation** (replaced by SomaTagsView).

### Key Services (`services/`)
- **`supabaseService.ts`** (~66KB) — All RPC calls, CRUD, caching, permission filtering. Central data layer.
- **`anthropicService.ts`** — Claude AI insights and narrative generation
- **`permissionsService.ts`** — Global permission singleton (marcas, filiais, tags)
- **`transactionCache.ts`** — Client-side cache with TTL

### Auth Flow (`contexts/AuthContext.tsx`)
1. Firebase `signInWithPopup` (Google)
2. Firebase ID token → Supabase `signInWithIdToken(provider:'firebase')`
3. Load user from `users` table, load `user_permissions` rows
4. Store in global singleton via `setUserPermissions()`
5. Roles: `admin | manager | viewer | approver | pending`

### State Management
- **React Context**: `AuthProvider`, `TransactionsProvider` (Realtime subscription)
- **sessionStorage**: DRE filters, drill-down state
- **localStorage**: Column visibility (`COL_VISIBILITY_KEY`), density mode (`DENSITY_KEY`)
- **useRef**: `yearRef`, `recurringRef`, `filialCleanupRef` prevent stale closures and double-fetches

### Database (Supabase PostgreSQL)
- **Tables**: `transactions`, `manual_changes`, `users`, `user_permissions`, `dre_analyses`, `tag0_map`, `rateio_raiz_log`
- **Materialized View**: `dre_agg` — used by drill-down and filter RPCs
- **Key RPCs**: `get_soma_tags` (8 params), `get_dre_dimension`, `get_dre_filter_options`, `calcular_rateio_raiz_real` (pg_cron)
- **Triggers**: `trg_auto_tag0` (populates tag0 via tag0_map), `trg_propagate_tag0_map`
- **SQL files**: in `database/` and `migrations/` directories

### API Proxies
Vite dev server proxies `/api/anthropic` → Anthropic API and `/api/groq` → Groq API (CORS-safe). In production, Vercel serverless functions in `api/` handle this.

## Critical Patterns — Must Follow

### Cache check: always use `in` operator
```tsx
// CORRECT — empty array [] is a valid cached result
if (!(cacheKey in dimensionCache)) { loadData(...) }

// WRONG — re-fetches infinitely for empty results
if (!dimensionCache[cacheKey]?.length) { loadData(...) }
```

### useRef for stale closures in useCallback with empty deps
```tsx
const yearRef = useRef(year);
useEffect(() => { yearRef.current = year; }, [year]);
const load = useCallback(async () => { /* use yearRef.current */ }, []);
```

### activeElements column order
`selectionOrder` is the source of truth for column order. Always derive `activeElements` by filtering `selectionOrder`, never by building a new array and sorting.

### MultiSelectFilter colorScheme
Only accepts `'blue' | 'orange' | 'purple'`. Using `'green'` or any other value crashes: `Cannot read properties of undefined (reading 'borderLight')`.

### dre_agg materialized view
**ALWAYS** include `SET statement_timeout = 0;` before any `DROP/CREATE MATERIALIZED VIEW dre_agg`. Without it, timeout can destroy the view (DROP succeeds but CREATE times out), breaking drill-down and filters site-wide. Recovery SQL: `restaurar_dre_agg.sql`.

### SQL RPC parameters
Never pass a TypeScript parameter that doesn't exist in the SQL function signature — results in HTTP 500. Always verify SQL params match before changing RPC calls.

### Approval flow performance
```tsx
// Independent Supabase ops in parallel:
await Promise.all([deleteTransaction(id), updateManualChange(changeId, meta)]);
// Don't block UI with data refresh:
refreshData(); // fire-and-forget — no await
```

### filialCleanupRef
`useRef(false)` — set `true` when brand change triggers filial cleanup. Prevents double-fetch when switching Marca. Tag02 must NOT be blocked by this ref.

## Environment Variables

Copy `.env.example` to `.env`. Required:
- `VITE_FIREBASE_*` — Firebase project config (6 vars)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase connection
- `VITE_ANTHROPIC_API_KEY` — For AI features (dev proxy)
- `ANTHROPIC_API_KEY` — For backend/Vercel functions

## DRE Structure (Business Domain)

Tag hierarchy: `tag0` (auto-populated via trigger) → `tag01` (centro de custo) → `tag02` (segmento) → `tag03` (projeto)

DRE groups by tag0 prefix:
- `01.` RECEITA LÍQUIDA
- `02.` CUSTOS VARIÁVEIS
- `03.` CUSTOS FIXOS
- `04.` DESPESAS SG&A
- `06.` RATEIO RAIZ

Calculated rows: MARGEM DE CONTRIBUIÇÃO (revenue + variable costs), EBITDA (margin + fixed + rateio). These CalcRows are hidden when any tag filter is active.

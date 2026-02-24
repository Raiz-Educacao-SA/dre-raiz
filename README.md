# DRE Raiz — Plataforma de Gestão Financeira

Sistema de **DRE Gerencial** com drill-down interativo, lançamentos, aprovações e dashboard — desenvolvido para a Raiz Educação S.A.

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Realtime + RLS) |
| Auth | Firebase (Google SSO) → Supabase via `signInWithIdToken` |
| Deploy | Vercel (CI/CD automático via push no `master`) |
| Export | SheetJS (XLSX) |

---

## Funcionalidades

### DRE Gerencial (`SomaTagsView`)
- **3 modos de exibição**: Consolidado | Cenário (por mês) | Mês
- **Filtros em cascata**: Ano, Mês De/Até, Marca, Filial, Tag01 (multi), Tag02 (multi, server-side)
- **Colunas configuráveis**: Real, Orçado, A-1, ΔR$ e Δ% vs Orçado/A-1 — aparecem na **ordem em que foram ativadas**
- **Drill-down**: expande cada Tag01 por Marca, Filial, Fornecedor, Tag02 ou Tag03
- **CalcRows**: Margem de Contribuição e EBITDA calculados automaticamente
- **Tela cheia**: overlay sem navegação
- **Sort A-Z / valor**: ordena Tag01 e drill-down simultaneamente

### Lançamentos (`TransactionsView`)
- Paginação server-side com 14 filtros simultâneos
- **Visibilidade de colunas**: ocultar/exibir individualmente com persistência em `localStorage`
- **Modos de densidade**: Confortável / Compacto / Ultra, persistidos em `localStorage`
- Exportação para Excel

### Aprovações (`ManualChangesView`)
- Fila de reclassificações com controle de acesso por papel (Admin / Aprovador / Visualizador)
- **Aprovação em massa**: checkboxes por linha, seleção total, processamento paralelo via `Promise.all`
- **Performance**: operações Supabase independentes em paralelo, `refreshData` fire-and-forget
- Tipos: `CONTA`, `DATA`, `MARCA`, `FILIAL`, `MULTI`, `RATEIO`, `EXCLUSAO`
- Exportação para Excel com dados filtrados

### Dashboard
- KPIs calculados da mesma fonte do DRE Gerencial (`getSomaTags`)
- Receita, Custos Variáveis, Custos Fixos, EBITDA

### Rateio Raiz (automático)
- `calcular_rateio_raiz_real()` via `pg_cron` a cada 15 min
- Aplica rateio proporcional sobre a tag `05. RATEIO RAIZ`

---

## Estrutura de Pastas

```
/
├── App.tsx                     # Raiz: rotas, estado global, handlers
├── components/
│   ├── SomaTagsView.tsx        # DRE Gerencial (principal)
│   ├── TransactionsView.tsx    # Lançamentos
│   ├── ManualChangesView.tsx   # Aprovações
│   ├── DashboardEnhanced.tsx   # Dashboard
│   ├── Sidebar.tsx             # Navegação lateral
│   └── ...
├── services/
│   └── supabaseService.ts      # RPCs, queries, cache
├── contexts/
│   └── AuthContext.tsx         # Firebase + Supabase auth
├── hooks/
│   └── usePermissions.ts       # Permissões por marca/filial/tag01
├── types.ts                    # Tipos globais
└── constants.ts                # Categorias, filiais
```

---

## SQL Ativo (Supabase)

| Arquivo | Função |
|---------|--------|
| `fix_get_soma_tags_v7_tags01.sql` | RPC principal do DRE (7 params, filtro por tag01) |
| `create_dre_rpc_functions.sql` | RPCs auxiliares |
| `RATEIO_RAIZ_REAL_AUTOMATICO.sql` | Rateio automático + pg_cron |

---

## Permissões

- **Firebase Auth**: SSO Google, token repassado ao Supabase via `signInWithIdToken(provider:'firebase')`
- **RLS Supabase**: `SECURITY DEFINER` nas RPCs para bypassar RLS onde necessário
- **Permissões granulares**: por `marca`, `filial`, `tag01` — tabela `user_permissions`
- **Papéis**: `admin`, `approver`, usuário comum

---

## Desenvolvimento Local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção
```

Variáveis de ambiente (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

---

## Deploy

Push no `master` → Vercel detecta e faz build automaticamente.

Deploy manual:
```bash
npx vercel --prod
```

URL de produção: **https://dre-raiz.vercel.app**

---

## Decisões Técnicas

- **Cache com `in`**: `!(key in cache)` evita re-fetch de resultados vazios
- **`activeElements`**: filtrado de `selectionOrder` — ordem de exibição respeita clique do usuário
- **`filialCleanupRef`**: previne double-fetch ao trocar Marca
- **Aprovação paralela**: `Promise.all` para ops independentes — reduz latência ~50%

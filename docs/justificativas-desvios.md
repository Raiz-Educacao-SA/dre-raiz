# Justificativas de Desvios — Leia-me

## Visão Geral

Guia de cobrança estruturada de justificativas dos responsáveis (pacoteiros) por linhas da DRE quando há desvios entre **Real × Orçado** e **Real × Ano Anterior (A-1)**.

O FP&A gera os desvios, envia cobranças por email, o pacoteiro justifica no nível mais granular (tag03), e a IA sintetiza hierarquicamente (tag03 → tag02 → tag01 → tag0). O FP&A revisa e aprova/rejeita.

---

## Fluxo Completo (Ciclo Mensal)

```
1. GERAR DESVIOS
   FP&A → Justificativas → seleciona mês → "Gerar Desvios"
   → Cruza Real × Orçado E Real × A-1 via dre_agg
   → Gera linhas tag0/tag01/tag02/tag03
   → Identifica pacoteiro via user_permissions
   → Status = 'pending'

2. ENVIAR COBRANÇAS
   FP&A → "Enviar Cobranças"
   → Email via Resend para cada pacoteiro
   → Lista desvios tag03 que ele precisa justificar
   → Status → 'notified'

3. PACOTEIRO JUSTIFICA (nível tag03)
   Pacoteiro acessa → vê seus desvios tag03
   → "Justificar" → preenche texto + plano de ação
   → Status → 'justified'

4. SÍNTESE IA (cascata automática)
   Todas tag03 de uma tag02 justificadas →
     IA sintetiza tag02 (resume justificativas tag03)
   Todas tag02 de uma tag01 com síntese →
     IA sintetiza tag01 (resume sínteses tag02)

5. FP&A REVISA
   → Vê árvore hierárquica com sínteses IA
   → Aprova ou Rejeita com comentário
   → Se rejeitado, pacoteiro pode resubmeter

6. CONSOLIDADO YTD (opcional)
   Admin → "Gerar Síntese YTD"
   → IA consolida sínteses de todos os meses
```

---

## Controle de Versão

Cada "Gerar Desvios" incrementa a **versão** (`version` na tabela).

Ao re-gerar:
- **Itens com justificativa** (justified/approved/rejected): valores financeiros são **atualizados**, mas justificativa e status são **preservados**
- **Itens pendentes/notificados**: são **substituídos** pelos novos valores
- **Itens novos** (tags que não existiam antes): são **inseridos**

Isso permite que o FP&A atualize os dados financeiros sem perder o trabalho já feito pelos pacoteiros.

---

## Arquitetura

### Tabelas SQL

#### `variance_justifications`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | bigint (PK) | Auto-increment |
| year_month | text | '2026-01' |
| marca | text | Marca/empresa |
| tag0 | text | Grupo DRE |
| tag01 | text | Centro de custo |
| tag02 | text | Segmento (nullable) |
| tag03 | text | Projeto (nullable) |
| comparison_type | text | 'orcado' ou 'a1' |
| real_value | numeric | Valor real |
| compare_value | numeric | Valor orçado ou A-1 |
| variance_abs | numeric | real - compare |
| variance_pct | numeric | ((real - compare) / \|compare\|) × 100 |
| version | integer | Versão (incrementa a cada geração) |
| status | text | 'pending' / 'notified' / 'justified' / 'approved' / 'rejected' |
| owner_email | text | Email do pacoteiro |
| owner_name | text | Nome do pacoteiro |
| justification | text | Texto do pacoteiro (só tag03) |
| action_plan | text | Plano de ação (opcional) |
| ai_summary | text | Síntese IA (tag02/tag01/tag0) |
| ai_summary_at | timestamptz | Quando a síntese foi gerada |
| justified_at | timestamptz | Quando justificou |
| reviewed_by | text | Email de quem revisou |
| reviewed_at | timestamptz | Quando revisou |
| review_note | text | Comentário do FP&A |
| notified_at | timestamptz | Quando o email foi disparado |
| created_at | timestamptz | Criação |
| updated_at | timestamptz | Última atualização |

**Índice único**: `(year_month, marca, tag0, tag01, COALESCE(tag02,''), COALESCE(tag03,''), comparison_type)`

#### `variance_thresholds`
Configuração de limites mínimos para gerar desvio (inicialmente todos passam).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| marca | text | NULL = todas |
| tag0 | text | NULL = todos |
| min_abs_value | numeric | 0 = sem threshold |
| min_pct_value | numeric | 0 = sem threshold |
| active | boolean | Ativo/inativo |

### RLS
- SELECT: usuários autenticados
- INSERT/UPDATE/DELETE: apenas admin (`auth.email()`)
- UPDATE especial: pacoteiro pode atualizar `justification` e `action_plan` nos seus itens (`owner_email = auth.email()`)
- Realtime habilitado

---

## Arquivos do Feature

| Arquivo | Descrição |
|---------|-----------|
| `database/create_variance_justifications.sql` | Tabelas + RLS + triggers |
| `database/add_variance_version.sql` | Coluna version + índice |
| `components/VarianceJustificationsView.tsx` | Componente principal (~1000 linhas) |
| `services/supabaseService.ts` | Funções CRUD + geração de desvios |
| `services/anthropicService.ts` | Síntese IA hierárquica |
| `api/variance/notify.ts` | Endpoint de email via Resend |
| `types.ts` | ViewType inclui 'justificativas' |
| `App.tsx` | Lazy-load + switch case |
| `components/Sidebar.tsx` | Item de menu |

---

## Service Layer (`supabaseService.ts`)

### Interfaces
- `VarianceJustification` — espelha a tabela
- `VarianceThreshold` — espelha a tabela de thresholds

### Funções Principais

| Função | Descrição |
|--------|-----------|
| `getVarianceJustifications(filters?)` | Lista com filtros (year_month, marca, status, owner_email, comparison_type) |
| `generateVarianceItems(yearMonth, marca?)` | Gera desvios a partir de `dre_agg`. Retorna `{ created, updated, version }` |
| `submitJustification(id, justification, actionPlan?)` | Pacoteiro justifica |
| `reviewJustification(id, status, reviewNote?)` | FP&A aprova/rejeita |
| `bulkReviewJustifications(ids[], status, reviewNote?)` | Ação em massa |
| `getVarianceThresholds()` | Buscar limites |
| `upsertVarianceThreshold(row)` | Salvar limite |
| `subscribeVarianceJustifications(onChange)` | Realtime subscription |

### `generateVarianceItems` — Detalhes

1. Calcula `nextVersion = MAX(version) + 1`
2. Busca itens existentes com justificativa (justified/approved/rejected)
3. Indexa por `pathKey|compType` para lookup O(1)
4. Consulta `dre_agg` para cenários Real, Orçado e A-1
5. Para cada combinação tag0/tag01/tag02/tag03:
   - Se existe item com justificativa → **UPDATE** valores financeiros + bump version
   - Senão → **INSERT** novo item
6. DELETE pending/notified antigos
7. INSERT novos em batches de 200

---

## Síntese IA (`anthropicService.ts`)

### `generateVarianceSummary(level, items[])`

Função hierárquica com 3 níveis:

| Nível | Trigger | Input | Output |
|-------|---------|-------|--------|
| tag02 | Todas tag03 justificadas | Lista `{ tag03, real, compare, Δ%, justificativa }` | Resumo 2-3 frases |
| tag01 | Todas tag02 com ai_summary | Lista `{ tag02, real, compare, Δ%, ai_summary }` | Consolidação 2-3 frases |
| ytd | Botão manual (admin) | Lista `{ month, tag01, real, compare, Δ%, ai_summary }` | Narrativa acumulada |

**Modelo**: Claude Haiku (`claude-haiku-4-5-20251001`) via `/api/anthropic` proxy, com fallback Groq.

---

## Componente UI (`VarianceJustificationsView.tsx`)

### Layout da Tela

```
┌──────────────────────────────────────────────────────────────────┐
│ Filtros: [Mês ▼] [Marca ▼] [Status ▼] [Tipo ▼]                │
│ Ações:  [Gerar Desvios] [Enviar Cobranças] [Aprovar] [Rejeitar] │
├──────────────────────────────────────────────────────────────────┤
│ Stats: v2 · 15 pendentes · 8 justificados · 3 aprovados         │
├──────────────────────────────────────────────────────────────────┤
│ ☐ │ Conta / Centro de Custo │ Real │ vs Orçado          │ vs A-1              │ Resp.│
│   │                          │      │ Comp │ Δ% │ Ação   │ Comp │ Δ% │ Ação   │      │
├───┼──────────────────────────┼──────┼──────┼────┼────────┼──────┼────┼────────┼──────┤
│   │ ▼ 01. RECEITA LÍQUIDA    │ 500K │ 600K │-17%│ síntIA │ 480K │ +4%│ síntIA │      │
│   │   ▼ Comercial            │ 200K │ 280K │-29%│ síntIA │ 190K │ +5%│ síntIA │ João │
│   │     ▼ Marketing Digital  │ 120K │ 180K │-33%│ síntIA │ 100K │+20%│ síntIA │      │
│ ☑ │       Google Ads         │  80K │ 120K │-33%│[Justif]│  70K │+14%│[Justif]│ João │
│ ☑ │       Meta Ads           │  40K │  60K │-33%│[Justif]│  30K │+33%│[Justif]│ João │
└──────────────────────────────────────────────────────────────────┘
```

### Hierarquia Visual (4 níveis)

| Depth | Nível | Background | Pode justificar | Síntese IA |
|-------|-------|------------|-----------------|------------|
| 0 | tag0 | `bg-gray-200` (forte) | Não | Sim (consolida tag01) |
| 1 | tag01 | `bg-gray-100` (médio) | Não | Sim (consolida tag02) |
| 2 | tag02 | `bg-gray-50` (leve) | Não | Sim (consolida tag03) |
| 3 | tag03 | branco | **Sim** | Não (texto humano) |

### Colunas Merged

A tabela mostra **uma linha por tag path** com colunas lado a lado:
- **Real**: valor real (compartilhado)
- **vs Orçado**: Comparação | Δ% | Ação/Status
- **vs Ano Anterior**: Comparação | Δ% | Ação/Status

O filtro "Tipo" controla quais grupos de colunas são visíveis.

### Status Badges

| Status | Cor | Descrição |
|--------|-----|-----------|
| pending | Amber | Aguardando justificativa |
| notified | Blue | Email enviado |
| justified | Purple | Pacoteiro justificou |
| approved | Green | FP&A aprovou |
| rejected | Red | FP&A rejeitou |

### Permissões na View

| Role | Pode ver | Gerar desvios | Enviar cobranças | Justificar | Aprovar/Rejeitar |
|------|----------|---------------|------------------|------------|-----------------|
| Admin/Manager | Todos os itens | Sim | Sim | Não | Sim |
| Pacoteiro | Apenas seus itens | Não | Não | Sim (tag03) | Não |
| Viewer | Todos (read-only) | Não | Não | Não | Não |

---

## Endpoint de Email (`api/variance/notify.ts`)

- Recebe `{ yearMonth, marca?, tag0? }`
- Busca justificativas pendentes
- Agrupa por `owner_email`
- Envia email via Resend API com tabela de desvios
- Atualiza status → `notified` + `notified_at`

---

## SQL Executado

1. `database/create_variance_justifications.sql` — tabelas, RLS, triggers, realtime
2. `database/add_variance_version.sql` — coluna version + índice

---

## Navegação

- **Sidebar**: item "Justificativas" com ícone `ClipboardCheck` (lucide-react)
- **Visível para todos** (não só admin)
- **ViewType**: `'justificativas'` em `types.ts`
- **Lazy-load**: `React.lazy(() => import('./components/VarianceJustificationsView'))` em `App.tsx`

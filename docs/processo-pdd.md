# Processo de PDD — Provisão para Devedores Duvidosos

## Visão Geral

Cálculo automático de PDD por marca e filial, com base na receita bruta recorrente e percentuais definidos por marca. Segue o mesmo padrão arquitetural do Rateio Raiz.

---

## Tabelas

### `share_pdd` — Percentuais por marca
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGINT (identity) | PK |
| `marca` | TEXT UNIQUE | Sigla da marca (ex: AP, MT, CGS) |
| `valor` | NUMERIC(5,2) | % de PDD (ex: 5.00 = 5%) |
| `updated_at` | TIMESTAMPTZ | Auto-atualizado via trigger |

**Dados atuais:**
| Marca | % PDD |
|-------|-------|
| AP | 5,00% |
| CGS | 2,50% |
| CLV | 1,00% |
| GEU | 5,00% |
| GT | 0,50% |
| MT | 11,00% |
| QI | 2,50% |
| SAP | 1,00% |
| SD | 0,10% |
| SP | 0,50% |

### `pdd_contas` — Contas base do cálculo
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGINT (identity) | PK |
| `tag0` | TEXT | Grupo contábil (ex: 01. RECEITA LÍQUIDA) |
| `tag01` | TEXT | Centro de custo |
| UNIQUE | (tag0, tag01) | Sem duplicatas |

Define quais contas (tag0 + tag01) entram na soma da receita base para PDD.

### `pdd_log` — Log de auditoria
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year_month` | TEXT | YYYY-MM |
| `filial` | TEXT | Código da filial |
| `marca` | TEXT | Marca |
| `receita_bruta` | NUMERIC | Soma da receita das contas selecionadas |
| `share_pdd_pct` | NUMERIC(5,2) | % aplicado |
| `valor_pdd` | NUMERIC | Valor calculado (negativo) |
| UNIQUE | (year_month, filial) | Um registro por filial/mês |

---

## Fórmula de Cálculo

```
1. RECEITA BASE
   = SUM(amount) de transactions
     WHERE (tag0, tag01) IN pdd_contas
       AND scenario IN ('Real', 'Original')
       AND recurring = 'Sim'
       AND chave_id NOT LIKE 'PDD_REAL_%'  -- evita auto-referência
     GROUP BY mês, filial

2. SHARE PDD
   = share_pdd.valor WHERE marca = transactions.marca

3. VALOR PDD
   = receita_base × share_pdd% / 100 × -1
   (negativo porque é custo/despesa)
```

---

## Campos Inseridos em `transactions`

| Campo | Valor |
|-------|-------|
| `date` | `YYYY-MM-01` (1º do mês) |
| `description` | `'PDD calculada Supabase'` |
| `category` | `'PDD'` |
| `conta_contabil` | `'4.2.1.13.01.03'` |
| `amount` | valor_pdd (negativo) |
| `type` | `'04. SG&A'` (= tag0) |
| `scenario` | `'Real'` |
| `status` | `'Calculado'` |
| `tag0` | `'04. SG&A'` |
| `tag01` | via de-para tabela `tags` (cod_conta = 4.2.1.13.01.03) |
| `tag02` | via de-para tabela `tags` |
| `tag03` | via de-para tabela `tags` |
| `vendor` | `'Planejamento Financeiro'` |
| `recurring` | `'Sim'` |
| `chave_id` | `'PDD_REAL_YYYY-MM_FILIAL'` (determinístico, idempotente) |

---

## Função SQL

```sql
SELECT * FROM calcular_pdd();
```

**Retorna:** `year_month`, `filiais` (count), `total_pdd` (soma)

**Características:**
- `SECURITY DEFINER` + `SET LOCAL row_security = off` — bypassa RLS
- `ON CONFLICT (chave_id) DO UPDATE` — idempotente, pode rodar N vezes
- Timestamp `v_ts` identifica registros da execução atual
- `PERFORM refresh_dre_agg()` ao final — atualiza materialized view

---

## Automação

**pg_cron** agendado a cada **15 minutos**:

```sql
SELECT cron.schedule(
  'calcular-pdd',
  '*/15 * * * *',
  'SELECT calcular_pdd()'
);
```

**Verificar job:**
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'calcular-pdd';
```

---

## Interface Admin

Aba **Cálculo PDD** no AdminPanel (`components/AdminPanel.tsx`):

### Layout 2 colunas

| Esquerda (320px) | Direita (flex) |
|---|---|
| Tabela ultra-compacta de % PDD por marca | Painel de contas base do cálculo |
| Edição inline (lápis → input → check/X) | Filtro por Tag0 (dropdown) + busca Tag01 |
| Inserir nova marca (sigla + %) | Lista checkbox agrupada por tag0 |
| Excluir marca (lixeira + confirm) | Chips das contas selecionadas com X |

### Funcionalidades
- **CRUD completo**: inserir, editar, excluir marcas e contas
- **Realtime bidirecional**: `subscribeSharePdd()` e `subscribePddContas()` via Supabase Realtime
- **Feedback visual**: toast verde/vermelho com auto-dismiss 4s
- **Validações**: marca duplicada, valor 0-100, campo obrigatório

---

## Serviços TypeScript

**`services/supabaseService.ts`:**

| Função | Descrição |
|--------|-----------|
| `getSharePdd()` | Lista share_pdd ordenado por marca |
| `updateSharePdd(id, valor)` | Atualiza % com feedback de erro detalhado |
| `insertSharePdd(marca, valor)` | Insere nova marca (uppercase + trim) |
| `deleteSharePdd(id)` | Remove marca |
| `subscribeSharePdd(onChange)` | Realtime — INSERT/UPDATE/DELETE |
| `getPddContas()` | Lista contas selecionadas |
| `addPddConta(tag0, tag01)` | Adiciona conta |
| `removePddConta(id)` | Remove conta |
| `subscribePddContas(onChange)` | Realtime — INSERT/DELETE |

---

## SQL Files

| Arquivo | Descrição |
|---------|-----------|
| `database/create_share_pdd.sql` | Tabela share_pdd + RLS + seed |
| `database/create_pdd_contas.sql` | Tabela pdd_contas + RLS |
| `database/pdd_etapa1_validacao.sql` | Query de validação (sem inserção) |
| `database/pdd_etapa2_funcao.sql` | Versão intermediária (histórico) |
| `database/pdd_final.sql` | **SQL ATIVO** — função + log + pg_cron |

---

## RLS Policies

Todas as tabelas PDD usam `auth.email()` (padrão do projeto):
- **SELECT**: todos os autenticados
- **INSERT/UPDATE/DELETE**: apenas `role = 'admin'`

---

## Queries de Conferência

```sql
-- Log de cálculos
SELECT year_month, filial, marca,
  TO_CHAR(receita_bruta, 'FM999,999,990.00') AS receita,
  TO_CHAR(share_pdd_pct, 'FM990.00') || '%' AS "% PDD",
  TO_CHAR(valor_pdd, 'FM999,999,990.00') AS valor_pdd
FROM pdd_log
ORDER BY year_month, marca, filial;

-- Lançamentos em transactions
SELECT LEFT(date::text, 7) AS mes, filial, marca,
  TO_CHAR(amount, 'FM999,999,990.00') AS valor,
  tag0, tag01, tag02, tag03, chave_id
FROM transactions
WHERE chave_id LIKE 'PDD_REAL_%'
ORDER BY date, filial;

-- Job pg_cron
SELECT jobid, jobname, schedule, active
FROM cron.job WHERE jobname = 'calcular-pdd';
```

---

## Fluxo de Dados

```
[pg_cron: cada 15 min]
        ↓
[calcular_pdd()]
        ↓
[CTE 1: receita_base — JOIN transactions × pdd_contas, recurring='Sim']
[CTE 2: calculo — JOIN receita_base × share_pdd → valor_pdd]
        ↓
[UPSERT → pdd_log]  (auditoria)
        ↓
[UPSERT → transactions]  (chave_id: PDD_REAL_YYYY-MM_FILIAL)
        ↓
[refresh_dre_agg()]  (materialized view)
        ↓
[UI: SomaTagsView / CEO Dashboard refletem PDD automaticamente]
```

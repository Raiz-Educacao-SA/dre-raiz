# BUG #002 — Campo recurring com variações de capitalização (sim, SIM, NÃO, nao, etc.)

**Data:** 2026-02-27
**Severidade:** Alta — dados desapareciam da DRE por mismatch de case
**Status:** Corrigido

## Sintoma

Filial "QI - Freguesia" e possivelmente outras mostravam dados incompletos no DRE Gerencial. Investigação revelou que o campo `recurring` nas tabelas `transactions`, `transactions_orcado` e `transactions_ano_anterior` continha variações:

| Valor no banco | Rows (via get_soma_tags) | Deveria ser |
|----------------|--------------------------|-------------|
| `Sim`          | 560                      | `Sim`       |
| `sim`          | 42                       | `Sim`       |
| `Não`          | 4                        | `Não`       |
| `não`          | 4                        | `Não`       |
| `NÃO`          | 4                        | `Não`       |

O SQL `COALESCE(t.recurring, 'Sim') = p_recurring` fazia comparação **case-sensitive**, então `'sim' != 'Sim'` excluía 42+ registros.

## Causa Raiz

1. **Importação de dados** gravava o campo `recurring` com capitalização inconsistente
2. **SQL** comparava com `=` exato (case-sensitive)
3. **`dre_agg`** materializava os dados sem normalizar, propagando o problema para drill-down

## Correção

### 1. SQL — Comparação case-insensitive com `INITCAP()`

Em todas as funções (`get_soma_tags`, `get_dre_dimension`) e na view `dre_agg`:

```sql
-- ANTES (case-sensitive)
AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)

-- DEPOIS (case-insensitive via INITCAP)
AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
```

Na `dre_agg`:
```sql
-- ANTES
COALESCE(t.recurring, 'Sim') AS recurring

-- DEPOIS
INITCAP(COALESCE(t.recurring, 'Sim')) AS recurring
```

### 2. SQL — Normalização one-time dos dados existentes

```sql
UPDATE transactions SET recurring = 'Sim'
WHERE LOWER(TRIM(recurring)) = 'sim' AND recurring != 'Sim';

UPDATE transactions SET recurring = 'Não'
WHERE LOWER(TRANSLATE(TRIM(recurring), 'ãÃ', 'aA')) IN ('nao', 'nAo') AND recurring != 'Não';
```

(Mesmo para `transactions_orcado` e `transactions_ano_anterior`)

### 3. Frontend — Default mudado para "Todos"

```tsx
// SomaTagsView.tsx
const [recurring, setRecurring] = useState<'Sim' | 'Não' | null>(null); // era 'Sim'
```

## Arquivos Modificados

- `database/fix_recurring_normalization.sql` (NOVO — SQL para executar no Supabase)
- `add_tag03_filter.sql` — INITCAP na comparação
- `add_recurring_filter.sql` — INITCAP na dre_agg e get_dre_dimension
- `components/SomaTagsView.tsx` — default recurring = null

## Como Executar

1. Abrir Supabase SQL Editor
2. Executar `database/fix_recurring_normalization.sql` **inteiro**
   - Parte 1: normaliza dados (UPDATE)
   - Parte 2: recria get_soma_tags com INITCAP
   - Parte 3: recria dre_agg com INITCAP (inclui SET statement_timeout = 0)
3. Deploy do frontend (já feito no commit)

## Como Validar

1. Abrir DRE Gerencial → toggle Recorr → "Sim" → verificar QI-Freguesia aparece com dados completos
2. Toggle "Não" → dados não-recorrentes aparecem
3. Toggle "Todos" → soma de Sim + Não bate
4. No Supabase: `SELECT DISTINCT recurring FROM transactions` → deve retornar apenas 'Sim' e 'Não'

## Prevenção Futura

Qualquer pipeline de importação deve normalizar o campo `recurring` para 'Sim' ou 'Não' antes de inserir no banco. Caso contrário, o `INITCAP()` no SQL garante a comparação correta mesmo com dados sujos.

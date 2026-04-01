# Automações Supabase — Projeto DRE Raiz

Documentação centralizada de todos os triggers, funções automáticas e jobs agendados ativos no banco Supabase.

---

## Índice

1. [Triggers: tag0 nas transações](#1-triggers-tag0-nas-transações)
2. [Trigger: propagar tag0_map para transações](#2-trigger-propagar-tag0_map-para-transações)
3. [Triggers: tag0 na tabela tags](#3-triggers-tag0-na-tabela-tags)
4. [pg_cron: Rateio Raiz Real (a cada 15 min)](#4-pg_cron-rateio-raiz-real-a-cada-15-min)
5. [Função: insert_dre_batch (importação)](#5-função-insert_dre_batch-importação)
6. [Como verificar o que está ativo](#6-como-verificar-o-que-está-ativo)

---

## 1. Triggers: tag0 nas transações

**Arquivo de origem:** `RATEIO_RAIZ_REAL_V2_FILIAL.sql` — Passo 1

### O que faz
Preenche automaticamente a coluna `tag0` nas 3 tabelas de transações sempre que `tag01` é inserido ou alterado. A busca é feita na tabela `tag0_map` (chave: `LOWER(TRIM(tag01))` = `LOWER(TRIM(tag1_norm))`).

### Triggers ativos

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_auto_tag0` | `transactions` | BEFORE INSERT OR UPDATE OF tag01 |
| `trg_auto_tag0_orcado` | `transactions_orcado` | BEFORE INSERT OR UPDATE OF tag01 |
| `trg_auto_tag0_ano_anterior` | `transactions_ano_anterior` | BEFORE INSERT OR UPDATE OF tag01 |

### Função
```sql
CREATE OR REPLACE FUNCTION fn_auto_populate_tag0()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tag0 := (
    SELECT tm.tag0
    FROM tag0_map tm
    WHERE LOWER(TRIM(tm.tag1_norm)) = LOWER(TRIM(NEW.tag01))
    LIMIT 1
  );
  RETURN NEW;
END;
$$;
```

### Quando recriar
Se reimportar dados em massa ou receber erro de `tag0` nulo em transações com `tag01` preenchido, executar o backfill manual:
```sql
UPDATE transactions t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS DISTINCT FROM tm.tag0);
-- repetir para transactions_orcado e transactions_ano_anterior
```

---

## 2. Trigger: propagar tag0_map para transações

**Arquivo de origem:** `RATEIO_RAIZ_REAL_V2_FILIAL.sql` — Passo 1

### O que faz
Quando um mapeamento na tabela `tag0_map` é inserido ou alterado (colunas `tag0` ou `tag1_norm`), propaga a mudança automaticamente para as 3 tabelas de transações existentes.

### Trigger ativo

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_propagate_tag0_map` | `tag0_map` | AFTER INSERT OR UPDATE OF tag0, tag1_norm |

### Função
```sql
CREATE OR REPLACE FUNCTION fn_propagate_tag0_map_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE transactions              SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_orcado       SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_ano_anterior SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  RETURN NEW;
END;
$$;
```

### Efeito prático
Se você corrigir um mapeamento em `tag0_map`, **todas as transações existentes** são atualizadas automaticamente — sem necessidade de backfill manual.

---

## 3. Triggers: tag0 na tabela tags

**Arquivo de origem:** `AUTOMATIZAR_TAG0_EM_TAGS.sql`

### O que faz
Mantém a coluna `tag0` da tabela `tags` sincronizada com `tag0_map`, usando `tag1` como chave de ligação.

Há dois mecanismos complementares:
- **Ao inserir/editar em `tags`**: preenche `tag0` automaticamente via `tag0_map`
- **Ao editar `tag0_map`**: propaga a mudança para todos os registros correspondentes em `tags`

### Triggers ativos

| Trigger | Tabela | Evento |
|---|---|---|
| `trg_auto_tag0_em_tags` | `tags` | BEFORE INSERT OR UPDATE OF tag1 |
| `trg_propagar_tag0_map_para_tags` | `tag0_map` | AFTER INSERT OR UPDATE OR DELETE |

### Funções
```sql
-- Preenchimento automático ao inserir/editar tags
CREATE OR REPLACE FUNCTION fn_auto_tag0_em_tags()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tag1 IS NULL THEN RETURN NEW; END IF;
  SELECT tag0 INTO NEW.tag0
  FROM tag0_map
  WHERE LOWER(TRIM(tag1_norm)) = LOWER(TRIM(NEW.tag1))
  LIMIT 1;
  RETURN NEW;
END;
$$;

-- Propagação de mudanças do tag0_map para tags
CREATE OR REPLACE FUNCTION fn_propagar_tag0_map_para_tags()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE tags SET tag0 = NEW.tag0
    WHERE LOWER(TRIM(tag1)) = LOWER(TRIM(NEW.tag1_norm));
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE tags SET tag0 = '99 - Cadastrar Tag0'
    WHERE LOWER(TRIM(tag1)) = LOWER(TRIM(OLD.tag1_norm));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### Update inicial (backfill)
Executar uma vez para preencher registros existentes:
```sql
UPDATE tags t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS NULL OR t.tag0 = '99 - Cadastrar Tag0');
```

---

## 4. pg_cron: Rateio Raiz Real (a cada 15 min)

**Arquivo de origem:** `RATEIO_RAIZ_REAL_V2_FILIAL.sql` — Passo 4 e 5

### O que faz
A cada 15 minutos, calcula automaticamente o rateio dos custos da holding RZ e distribui entre as filiais, proporcionalmente à receita bruta de cada filial no mês.

### Job agendado

| Campo | Valor |
|---|---|
| Nome | `rateio-raiz-real` |
| Schedule | `*/15 * * * *` (todo quarto de hora) |
| Comando | `SELECT calcular_rateio_raiz_real()` |

### Lógica do cálculo (`calcular_rateio_raiz_real()`)

1. **EBITDA da RZ**: soma de `transactions` onde `marca = 'RZ'` e `tag0 LIKE '02.%' OR '03.%' OR '04.%'` e `recurring = 'Sim'`
2. **Receita bruta por filial**: soma de `transactions` onde `tag0 LIKE '01.%'`, excluindo Tributos e Devoluções
3. **Share por filial**: `receita_filial / receita_total_mes`
4. **Valor rateado**: `ebitda_rz × share_filial`
5. **UPSERT em `rateio_raiz_log`**: chave única `(year_month, filial)`
6. **UPSERT em `transactions`**: chave `chave_id = 'RATEIO_RAIZ_REAL_YYYY-MM_FILIAL'`

### Campos gerados em transactions

| Campo | Valor |
|---|---|
| `category` | `RATEIO ADM` |
| `conta_contabil` | `4.2.1.17.01.01` |
| `tag0` | `05. RATEIO RAIZ` |
| `tag01` | `RATEIO ADM` |
| `scenario` | `Real` |
| `status` | `Rateado` |
| `vendor` | `RZ Educação — CSC` |

### Comandos úteis
```sql
-- Ver status do job
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'rateio-raiz-real';

-- Executar manualmente
SELECT * FROM calcular_rateio_raiz_real();

-- Ver log do último cálculo
SELECT year_month, filial, nome_filial,
       TO_CHAR(share_pct * 100, 'FM990.00') || '%' AS share,
       TO_CHAR(valor_rateado, 'FM999,999,990.00') AS valor
FROM rateio_raiz_log
ORDER BY year_month DESC, valor_rateado DESC;

-- Cancelar o job (se necessário)
SELECT cron.unschedule('rateio-raiz-real');

-- Recriar o job
SELECT cron.schedule('rateio-raiz-real', '*/15 * * * *', 'SELECT calcular_rateio_raiz_real()');
```

---

## 5. Função: insert_dre_batch (importação)

**Arquivo de origem:** `atualizar_function_insert_dre_batch.sql`

### O que faz
Recebe um JSONB com lote de transações e faz UPSERT em `transactions`. Usado pelo painel de importação (AdminPanel → aba Importação) para carregar dados do Excel.

### Chamada
```sql
SELECT insert_dre_batch('[ { ...dados... } ]'::jsonb);
```

### Observações
- Timeout configurado para 180s (`atualizar_function_insert_dre_batch_180s.sql`)
- Após a inserção, os triggers do item 1 acionam automaticamente e preenchem `tag0`

---

## 6. Como verificar o que está ativo

### Ver todos os triggers ativos
```sql
SELECT
  trigger_name,
  event_object_table AS tabela,
  event_manipulation AS evento,
  action_timing AS momento,
  action_statement AS funcao
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### Ver jobs pg_cron ativos
```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;
```

### Ver histórico de execuções do rateio
```sql
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'rateio-raiz-real')
ORDER BY start_time DESC
LIMIT 20;
```

---

## Mapa de dependências

```
tag0_map
  │
  ├── trg_propagate_tag0_map ──────────────→ transactions.tag0
  │                                          transactions_orcado.tag0
  │                                          transactions_ano_anterior.tag0
  │
  └── trg_propagar_tag0_map_para_tags ────→ tags.tag0

tags
  └── trg_auto_tag0_em_tags ─────────────→ tags.tag0 (preenchimento ao inserir)

transactions
  ├── trg_auto_tag0 ───────────────────────→ transactions.tag0 (preenchimento ao inserir)
  └── calcular_rateio_raiz_real() ─────────→ UPSERT de lançamentos de rateio
       └── pg_cron (*/15 * * * *) ─────────→ execução automática
```

---

*Última atualização: 28/02/2026*

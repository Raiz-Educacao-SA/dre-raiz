# Rateio Raiz — Documentação Completa

> Última atualização: 23/02/2026
> Arquivo SQL de referência: `RATEIO_RAIZ_REAL_AUTOMATICO.sql`

---

## 1. O que é o Rateio Raiz?

O **Rateio Raiz** é a distribuição dos custos do **CSC (Centro de Serviços Compartilhados)** da Raiz Educação para as filiais (unidades escolares).

A marca `RZ` (holding/corporativo) acumula custos centrais (administrativos, financeiros, TI, RH etc.) que precisam ser absorvidos pelas filiais que se beneficiam desses serviços. O rateio transfere esses custos da RZ para cada filial de forma proporcional à sua Receita Bruta.

**Resultado prático:** cada filial passa a enxergar seu custo real após absorver a parcela que lhe cabe do CSC.

---

## 2. Posição na Estrutura da DRE

```
01. RECEITA BRUTA
    − 02. CUSTOS VARIÁVEIS
    − 03. CUSTOS FIXOS
    ─────────────────────────────────────────
    = MARGEM DE CONTRIBUIÇÃO          (linha calculada)
    − 04. SG&A
    ─────────────────────────────────────────
    = EBITDA (S/ RATEIO RAIZ CSC)     (linha calculada — a implementar)
    − 05. RATEIO RAIZ
    ─────────────────────────────────────────
    = EBITDA TOTAL COM RATEIO         (linha calculada — a implementar)
```

---

## 3. Status por Cenário

| Cenário | Tabela | Como é calculado | Status |
|---------|--------|-----------------|--------|
| **Real** | `transactions` | Automático via `calcular_rateio_raiz_real()` + pg_cron a cada 2 min | ✅ Funcionando |
| **Orçado** | `transactions_orcado` | Estático — importado via arquivo .bat | ✅ OK |
| **A-1** | `transactions_ano_anterior` | Estático — importado via arquivo .bat | ✅ OK |

---

## 4. Lógica de Cálculo (Cenário Real)

### Fórmula

```
share_filial    = receita_bruta_filial / receita_bruta_total_todas_filiais
valor_rateado   = ebitda_rz × share_filial
```

### Passo a passo

**Passo 1 — Calcular o EBITDA da RZ no mês:**
- Busca todas as transações da marca `RZ` com `scenario IN (NULL → 'Real', 'Original')`
- Filtra apenas categorias de custo: `tag0 LIKE '02.%' OR '03.%' OR '04.%'`
- Soma os valores → este é o `ebitda_rz` (número negativo, pois são custos)

**Passo 2 — Calcular a Receita Bruta de cada filial:**
- Busca transações de todas as filiais com `nome_filial IS NOT NULL`
- Exclui filiais da marca `RZ`
- Filtra `tag0 LIKE '01.%'` (receita)
- **Exclui** tag01 de: `tributos`, `devoluções & cancelamentos`
- Agrupa por filial, marca e mês
- Descarta filiais com receita ≤ 0 naquele mês

**Passo 3 — Calcular o share de cada filial:**
- `share_pct = receita_bruta_filial / soma_receita_bruta_de_todas_filiais`
- A soma dos shares de todas as filiais deve ser ~100%

**Passo 4 — Aplicar o rateio:**
- `valor_rateado = ebitda_rz × share_pct`
- O valor é negativo (custo) para cada filial
- A soma de todos os `valor_rateado` deve igualar o `ebitda_rz`

---

## 5. SQL Completo — Execute em Ordem no Supabase

### PASSO 1 — Tabela de auditoria `rateio_raiz_log`

```sql
CREATE TABLE IF NOT EXISTS rateio_raiz_log (
  id              BIGSERIAL PRIMARY KEY,
  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  year_month      TEXT          NOT NULL,   -- 'YYYY-MM'
  rz_ebitda       NUMERIC       NOT NULL,   -- EBITDA total da RZ no mês
  filial          TEXT          NOT NULL,   -- nome_filial da unidade beneficiada
  filial_code     TEXT,                     -- código da filial (coluna filial da transactions)
  marca           TEXT,                     -- marca da filial (informativo)
  receita_bruta   NUMERIC       NOT NULL,   -- receita bruta da filial
  receita_total   NUMERIC       NOT NULL,   -- receita bruta total de todas as filiais
  share_pct       NUMERIC(12,8) NOT NULL,   -- share = receita_filial / receita_total
  valor_rateado   NUMERIC       NOT NULL,   -- valor_rateado = ebitda_rz × share_pct

  CONSTRAINT rateio_raiz_log_unico UNIQUE (year_month, filial)
);

CREATE INDEX IF NOT EXISTS idx_rateio_log_yearmonth ON rateio_raiz_log (year_month);
CREATE INDEX IF NOT EXISTS idx_rateio_log_filial    ON rateio_raiz_log (filial);
CREATE INDEX IF NOT EXISTS idx_rateio_log_marca     ON rateio_raiz_log (marca);

COMMENT ON TABLE rateio_raiz_log IS
'Auditoria do cálculo de Rateio ADM Real.
Cada linha representa o share de uma filial em um mês.
Atualizado a cada execução de calcular_rateio_raiz_real().';
```

> **Se a tabela já existir e precisar adicionar `filial_code`:**
> ```sql
> ALTER TABLE rateio_raiz_log ADD COLUMN IF NOT EXISTS filial_code TEXT;
> ```

---

### PASSO 2 — Mapeamento tag01 → tag0 no `tag0_map`

```sql
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
VALUES ('rateio adm', 'RATEIO ADM', '05. RATEIO RAIZ')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0     = EXCLUDED.tag0,
      tag1_raw = EXCLUDED.tag1_raw;

-- Verificar:
-- SELECT * FROM tag0_map WHERE tag1_norm = 'rateio adm';
```

---

### PASSO 3 — Função principal `calcular_rateio_raiz_real()`

```sql
DROP FUNCTION IF EXISTS calcular_rateio_raiz_real();

CREATE OR REPLACE FUNCTION calcular_rateio_raiz_real()
RETURNS TABLE (
  o_year_month    TEXT,
  o_rz_ebitda     NUMERIC,
  o_filiais_ok    BIGINT,
  o_total_rateado NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN

  -- Desabilita RLS para acesso completo
  SET LOCAL row_security = off;

  -- Limpa rateio anterior
  DELETE FROM transactions  WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%';
  DELETE FROM rateio_raiz_log;

  -- Calcula e salva auditoria
  INSERT INTO rateio_raiz_log
    (year_month, calculated_at, rz_ebitda,
     filial, filial_code, marca,
     receita_bruta, receita_total, share_pct, valor_rateado)
  WITH
  rz_ebitda AS (
    -- EBITDA da RZ: custos (02/03/04) da marca RZ por mês
    SELECT
      to_char(t.date::date, 'YYYY-MM') AS ym,
      SUM(t.amount)                    AS ebitda_rz
    FROM transactions t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.marca = 'RZ'
      AND (tm.tag0 LIKE '02.%' OR tm.tag0 LIKE '03.%' OR tm.tag0 LIKE '04.%')
    GROUP BY 1
  ),
  receita_por_filial AS (
    -- Receita Bruta por filial por mês (excluindo RZ, tributos e devoluções)
    SELECT
      to_char(t.date::date, 'YYYY-MM') AS ym,
      t.nome_filial                    AS filial,
      t.filial                         AS filial_code,
      t.marca                          AS marca,
      SUM(t.amount)                    AS receita_bruta
    FROM transactions t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.nome_filial IS NOT NULL
      AND t.marca <> 'RZ'
      AND tm.tag0 LIKE '01.%'
      AND LOWER(TRIM(t.tag01)) NOT IN (
            'tributos',
            'devolu' || chr(231) || chr(245) || 'es & cancelamentos',
            'devolucoes & cancelamentos'
          )
    GROUP BY 1, 2, 3, 4
    HAVING SUM(t.amount) > 0
  ),
  receita_total_mes AS (
    SELECT rpf.ym, SUM(rpf.receita_bruta) AS receita_total
    FROM receita_por_filial rpf
    GROUP BY rpf.ym
  ),
  rateio AS (
    SELECT
      rpf.ym,
      rpf.filial,
      rpf.filial_code,
      rpf.marca,
      rz.ebitda_rz,
      rpf.receita_bruta,
      rtm.receita_total,
      rpf.receita_bruta / rtm.receita_total                   AS share_pct,
      rz.ebitda_rz * (rpf.receita_bruta / rtm.receita_total) AS valor_rateado
    FROM receita_por_filial rpf
    JOIN receita_total_mes  rtm ON rtm.ym = rpf.ym
    JOIN rz_ebitda          rz  ON rz.ym  = rpf.ym
  )
  SELECT
    r.ym, NOW(), r.ebitda_rz,
    r.filial, r.filial_code, r.marca,
    r.receita_bruta, r.receita_total, r.share_pct, r.valor_rateado
  FROM rateio r;

  -- Insere em transactions: uma linha por filial/mês
  INSERT INTO transactions (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, marca, nome_filial, tag01, tag02, tag03,
    vendor, chave_id, created_at, updated_at
  )
  SELECT
    gen_random_uuid()::TEXT,
    (l.year_month || '-01')::date::TEXT,
    'Rateio ADM ' || l.year_month        AS description,
    'RATEIO ADM'                          AS category,
    'Rateio ADM'                          AS conta_contabil,
    l.valor_rateado                       AS amount,
    'RATEIO'                              AS type,
    'Real'                                AS scenario,
    'Rateado'                             AS status,
    l.filial_code,                        -- código real da filial
    l.marca,
    l.filial,                             -- nome_filial
    'RATEIO ADM'                          AS tag01,
    NULL                                  AS tag02,
    NULL                                  AS tag03,
    'RZ Educação — CSC'                   AS vendor,
    'RATEIO_RAIZ_REAL_' || l.year_month || '_' || l.filial AS chave_id,
    NOW(), NOW()
  FROM rateio_raiz_log l;

  -- Atualiza dre_agg
  PERFORM refresh_dre_agg();

  -- Retorna resumo por mês
  RETURN QUERY
    SELECT
      l.year_month,
      l.rz_ebitda,
      COUNT(*)::BIGINT     AS o_filiais_ok,
      SUM(l.valor_rateado) AS o_total_rateado
    FROM rateio_raiz_log l
    GROUP BY 1, 2
    ORDER BY 1;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro em calcular_rateio_raiz_real(): %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION calcular_rateio_raiz_real() TO authenticated;
```

---

### PASSO 4 — Agendamento via pg_cron (a cada 2 minutos)

> **Pré-requisito:** pg_cron habilitado em Supabase Dashboard → Database → Extensions → pg_cron

```sql
-- Remove job anterior se existir
SELECT cron.unschedule('rateio-raiz-real');

-- Agenda a cada 2 minutos
SELECT cron.schedule(
  'rateio-raiz-real',
  '*/2 * * * *',
  $$SELECT calcular_rateio_raiz_real()$$
);

-- Verificar se foi agendado:
-- SELECT jobid, jobname, schedule, command, active FROM cron.job;
```

> **Nota:** não é necessário recriar o agendamento ao alterar a função. O pg_cron chama apenas o nome da função — ao recriar a função, o próximo ciclo já executa a versão nova automaticamente.

---

### PASSO 5 — Teste manual e validação

```sql
-- 5.1 Executar manualmente
SELECT * FROM calcular_rateio_raiz_real();

-- 5.2 Ver detalhes por filial e mês
SELECT
  year_month,
  filial,
  filial_code,
  marca,
  TO_CHAR(receita_bruta, 'FM999,999,990.00')      AS receita_filial,
  TO_CHAR(receita_total, 'FM999,999,990.00')      AS receita_total,
  TO_CHAR(share_pct * 100, 'FM990.0000') || '%'   AS share,
  TO_CHAR(valor_rateado,  'FM999,999,990.00')     AS valor_rateado,
  TO_CHAR(calculated_at, 'DD/MM/YYYY HH24:MI')    AS calculado_em
FROM rateio_raiz_log
WHERE year_month = '2026-02'   -- substitua pelo mês desejado
ORDER BY share_pct DESC;

-- 5.3 Verificar soma dos shares por mês (deve ser ~100%)
SELECT
  year_month,
  TO_CHAR(rz_ebitda, 'FM999,999,990.00')            AS ebitda_rz,
  COUNT(*)                                            AS qtd_filiais,
  TO_CHAR(SUM(share_pct) * 100, 'FM990.0000') || '%' AS soma_shares,
  TO_CHAR(SUM(valor_rateado), 'FM999,999,990.00')   AS total_rateado
FROM rateio_raiz_log
GROUP BY year_month, rz_ebitda
ORDER BY year_month;

-- 5.4 Verificar transações inseridas
SELECT
  to_char(date::date, 'YYYY-MM')              AS year_month,
  filial,
  nome_filial,
  marca,
  TO_CHAR(amount, 'FM999,999,990.00')         AS amount,
  status,
  chave_id
FROM transactions
WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%'
ORDER BY date DESC, nome_filial;

-- 5.5 Verificar na dre_agg
SELECT
  year_month, scenario, tag0, marca,
  SUM(total_amount) AS total
FROM dre_agg
WHERE tag0 = '05. RATEIO RAIZ'
  AND scenario = 'Real'
  AND year_month BETWEEN '2026-01' AND '2026-12'
GROUP BY year_month, scenario, tag0, marca
ORDER BY year_month, marca;

-- 5.6 Conferência cruzada: log vs dre_agg (devem bater)
SELECT
  l.year_month,
  l.filial,
  TO_CHAR(l.valor_rateado, 'FM999,999,990.00') AS log_valor,
  TO_CHAR(a.total,         'FM999,999,990.00') AS dre_agg_valor,
  CASE
    WHEN ABS(l.valor_rateado - COALESCE(a.total, 0)) < 0.01 THEN 'OK'
    ELSE 'DIVERGENCIA'
  END AS status
FROM rateio_raiz_log l
LEFT JOIN (
  SELECT year_month, nome_filial, SUM(total_amount) AS total
  FROM dre_agg
  WHERE tag0 = '05. RATEIO RAIZ' AND scenario = 'Real'
  GROUP BY year_month, nome_filial
) a ON a.year_month = l.year_month AND a.nome_filial = l.filial
WHERE l.year_month BETWEEN '2026-01' AND '2026-12'
ORDER BY l.year_month, l.filial;
```

---

## 6. Como Gerenciar o Agendamento (pg_cron)

### Ver job configurado
```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'rateio-raiz-real';
```

### Ver histórico de execuções
```sql
SELECT
  runid,
  status,
  return_message,
  TO_CHAR(start_time, 'DD/MM/YYYY HH24:MI:SS') AS inicio,
  TO_CHAR(end_time,   'DD/MM/YYYY HH24:MI:SS') AS fim
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'rateio-raiz-real')
ORDER BY start_time DESC
LIMIT 20;
```

### Alterar frequência
```sql
SELECT cron.unschedule('rateio-raiz-real');

-- Escolha uma das opções:
SELECT cron.schedule('rateio-raiz-real', '*/2 * * * *',  $$SELECT calcular_rateio_raiz_real()$$); -- a cada 2 min
SELECT cron.schedule('rateio-raiz-real', '*/15 * * * *', $$SELECT calcular_rateio_raiz_real()$$); -- a cada 15 min
SELECT cron.schedule('rateio-raiz-real', '0 * * * *',    $$SELECT calcular_rateio_raiz_real()$$); -- a cada 1 hora
SELECT cron.schedule('rateio-raiz-real', '0 6 * * *',    $$SELECT calcular_rateio_raiz_real()$$); -- 1x por dia às 6h
```

**Referência de sintaxe cron:**
```
┌───── minuto (0-59)
│ ┌─── hora (0-23)
│ │ ┌─ dia do mês (1-31)
│ │ │ ┌ mês (1-12)
│ │ │ │ ┌ dia da semana (0=dom, 1=seg...7=dom)
│ │ │ │ │
* * * * *
```

### Pausar / Reativar
```sql
UPDATE cron.job SET active = false WHERE jobname = 'rateio-raiz-real'; -- pausar
UPDATE cron.job SET active = true  WHERE jobname = 'rateio-raiz-real'; -- reativar
```

### Deletar definitivamente
```sql
SELECT cron.unschedule('rateio-raiz-real');
```

---

## 7. Como Alterar a Lógica de Cálculo

### 7.1 Mudar quais categorias da RZ entram no EBITDA

Atualmente usa `02.% + 03.% + 04.%`. Para incluir receita (01.):

```sql
-- Na CTE rz_ebitda, altere:
AND (tm.tag0 LIKE '02.%' OR tm.tag0 LIKE '03.%' OR tm.tag0 LIKE '04.%')
-- Para:
AND (tm.tag0 LIKE '01.%' OR tm.tag0 LIKE '02.%' OR tm.tag0 LIKE '03.%' OR tm.tag0 LIKE '04.%')
```

### 7.2 Excluir uma filial específica do rateio

```sql
-- Na CTE receita_por_filial, adicione:
AND t.nome_filial NOT IN ('NOME DA FILIAL A EXCLUIR')
```

### 7.3 Voltar a distribuir por marca (em vez de filial)

Troque na CTE `receita_por_filial`:
- `t.nome_filial AS filial` → `t.marca AS filial`
- Remova `t.filial AS filial_code` e `t.nome_filial` do GROUP BY
- No INSERT em transactions: `filial = l.filial`, `nome_filial = NULL`

### 7.4 Incluir outra fonte de EBITDA além da RZ

```sql
-- Na CTE rz_ebitda, mude:
AND t.marca = 'RZ'
-- Para:
AND t.marca IN ('RZ', 'OUTRA_MARCA')
```

---

## 8. Troubleshooting

### Função retorna 0 linhas

```sql
-- Verificar se RZ tem dados de custo no período
SELECT
  to_char(t.date::date, 'YYYY-MM') AS mes,
  tm.tag0,
  SUM(t.amount) AS total
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.marca = 'RZ'
  AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
  AND (tm.tag0 LIKE '02.%' OR tm.tag0 LIKE '03.%' OR tm.tag0 LIKE '04.%')
GROUP BY 1, 2
ORDER BY 1;

-- Verificar se filiais têm receita bruta
SELECT
  to_char(t.date::date, 'YYYY-MM') AS mes,
  t.nome_filial,
  SUM(t.amount) AS receita
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
  AND t.nome_filial IS NOT NULL
  AND t.marca <> 'RZ'
  AND tm.tag0 LIKE '01.%'
GROUP BY 1, 2
ORDER BY 1, receita;
```

### Soma dos shares não é 100%

Significa que alguma filial teve receita negativa e foi excluída pelo `HAVING SUM > 0`. Rode a query acima para identificar e decidir se inclui ou não.

### Valor dobrado na DRE Gerencial

```sql
SELECT
  to_char(date::date, 'YYYY-MM') AS year_month,
  CASE WHEN chave_id LIKE 'RATEIO_RAIZ_REAL_%'
       THEN 'Calculado (função)'
       ELSE 'Original (ERP/importação)'
  END AS origem,
  COUNT(*) AS qtd,
  SUM(amount) AS total
FROM transactions
WHERE LOWER(TRIM(tag01)) = 'rateio adm'
  AND (scenario IS NULL OR scenario = 'Real')
GROUP BY 1, 2
ORDER BY 1, 2;
```

Se aparecer `origem = 'Original'`, ampliar o DELETE na função:
```sql
-- Substituir:
DELETE FROM transactions WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%';
-- Por:
DELETE FROM transactions
WHERE LOWER(TRIM(tag01)) = 'rateio adm'
  AND (scenario IS NULL OR scenario = 'Real');
```

### `tag0` aparece como 'Sem Classificação'

```sql
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
VALUES ('rateio adm', 'RATEIO ADM', '05. RATEIO RAIZ')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

SELECT refresh_dre_agg();
```

---

## 9. Fluxo Completo

```
pg_cron (*/2 * * * *)
    │
    └─► calcular_rateio_raiz_real()
              │
              ├─ 1. DELETE transactions  WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%'
              ├─ 2. DELETE rateio_raiz_log
              │
              ├─ 3. CTE rz_ebitda
              │       transactions WHERE marca='RZ' AND tag0 IN (02/03/04)
              │       → ebitda_rz por mês
              │
              ├─ 4. CTE receita_por_filial
              │       transactions WHERE marca≠'RZ' AND tag0='01.' (sem tributos)
              │       → receita_bruta por (filial, filial_code, marca, mês)
              │
              ├─ 5. CTE receita_total_mes
              │       → soma receita de todas as filiais por mês
              │
              ├─ 6. CTE rateio
              │       share_pct    = receita_filial / receita_total
              │       valor_rateado = ebitda_rz × share_pct
              │
              ├─ 7. INSERT rateio_raiz_log
              │       (auditoria completa por filial/mês)
              │
              ├─ 8. INSERT transactions
              │       filial      = filial_code  (código real)
              │       nome_filial = filial        (nome da unidade)
              │       tag01       = 'RATEIO ADM'
              │       scenario    = 'Real'
              │       chave_id    = 'RATEIO_RAIZ_REAL_YYYY-MM_NOME_FILIAL'
              │
              ├─ 9. refresh_dre_agg()
              │
              └─ 10. RETURN (year_month, rz_ebitda, qtd_filiais, total_rateado)
```

---

## 10. Estrutura dos Objetos no Banco

### `rateio_raiz_log`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGSERIAL | PK auto-incremental |
| `calculated_at` | TIMESTAMPTZ | Quando foi calculado |
| `year_month` | TEXT | Mês de referência ('YYYY-MM') |
| `rz_ebitda` | NUMERIC | EBITDA total da RZ no mês |
| `filial` | TEXT | nome_filial da unidade (chave de distribuição) |
| `filial_code` | TEXT | Código da filial (coluna `filial` em transactions) |
| `marca` | TEXT | Marca da filial (informativo) |
| `receita_bruta` | NUMERIC | Receita bruta da filial no mês |
| `receita_total` | NUMERIC | Receita bruta total de todas as filiais |
| `share_pct` | NUMERIC(12,8) | share = receita_filial / receita_total |
| `valor_rateado` | NUMERIC | Valor alocado = ebitda_rz × share_pct |

**UNIQUE:** `(year_month, filial)`

### Campos inseridos em `transactions`

| Campo | Valor |
|-------|-------|
| `tag01` | `'RATEIO ADM'` |
| `tag0` | `'05. RATEIO RAIZ'` (via tag0_map) |
| `filial` | código real da filial (ex: `'AP'`) |
| `nome_filial` | nome da filial (ex: `'AP São Paulo'`) |
| `marca` | marca da filial (ex: `'AP'`) |
| `scenario` | `'Real'` |
| `status` | `'Rateado'` |
| `type` | `'RATEIO'` |
| `vendor` | `'RZ Educação — CSC'` |
| `chave_id` | `'RATEIO_RAIZ_REAL_YYYY-MM_NOME_FILIAL'` |
| `date` | Primeiro dia do mês (`'YYYY-MM-01'`) |

---

## 11. Checklist para Recriar do Zero

- [ ] Criar tabela `rateio_raiz_log` (PASSO 1)
- [ ] Inserir mapeamento em `tag0_map` (PASSO 2)
- [ ] Criar função `calcular_rateio_raiz_real()` (PASSO 3)
- [ ] Confirmar que `refresh_dre_agg()` existe com `SECURITY DEFINER`
- [ ] Habilitar `pg_cron` em Supabase Dashboard → Database → Extensions
- [ ] Agendar via pg_cron (PASSO 4)
- [ ] Testar: `SELECT * FROM calcular_rateio_raiz_real();`
- [ ] Validar soma de shares ≈ 100% por mês
- [ ] Confirmar `filial_code` preenchido corretamente nos lançamentos
- [ ] Confirmar que aparece em `dre_agg` com `tag0 = '05. RATEIO RAIZ'`

---

## 12. Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `RATEIO_RAIZ_REAL_AUTOMATICO.sql` | SQL original (versão por marca — referência histórica) |
| `RATEIO_RAIZ_DOCUMENTACAO.md` | Esta documentação |
| `RATEIO_RAIZ_TODO.md` | Contexto original e pendências do projeto |
| `REBUILD_DRE_BACKEND_V2.sql` | Backend da DRE (inclui `refresh_dre_agg`) |
| `ADD_TAG02_TAG03_DRE_AGG.sql` | Estrutura da `dre_agg` com tag02 e tag03 |

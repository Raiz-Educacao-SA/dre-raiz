-- ============================================
-- COMPARAÇÃO SIMPLIFICADA PARA EXPORTAR EXCEL
-- ============================================
-- Retorna UMA tabela só com todas as informações
-- Fácil de exportar para CSV/Excel
-- Data: 2026-02-03
-- ============================================

WITH dados AS (
  SELECT
    -- Status
    CASE
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        'OK'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        'VALOR_DIFERENTE'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        'FALTA_EM_TRANSACTIONS'
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        'EXTRA_EM_TRANSACTIONS'
      ELSE 'OUTRO'
    END as status,

    -- IDs
    COALESCE(df.chave_id, t.chave_id) as chave_id,

    -- Valores
    df.valor as valor_fabric,
    t.amount as valor_transactions,

    -- Diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        ROUND((df.valor - t.amount)::NUMERIC, 2)
      ELSE NULL
    END as diferenca,

    -- Percentual de diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL AND df.valor != 0 THEN
        ROUND(ABS((df.valor - t.amount) / df.valor) * 100, 2)
      ELSE NULL
    END as perc_diferenca,

    -- Descrições
    df.complemento as descricao_fabric,
    t.description as descricao_transactions,

    -- Hierarquia
    df.filial as filial_fabric,
    t.filial as filial_transactions,
    df.cia as marca_fabric,
    t.marca as marca_transactions,

    -- Classificação
    df.type as type_fabric,
    t.type as type_transactions,

    -- Conta
    df.conta as conta_fabric,
    t.category as conta_transactions,

    -- Data/Período
    df.anomes as anomes_fabric,
    t.date as data_transactions,

    -- Timestamps
    df.updated_at as atualizado_fabric,
    t.updated_at as atualizado_transactions

  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL
)
SELECT * FROM dados
ORDER BY
  CASE status
    WHEN 'FALTA_EM_TRANSACTIONS' THEN 1
    WHEN 'VALOR_DIFERENTE' THEN 2
    WHEN 'OK' THEN 3
    WHEN 'EXTRA_EM_TRANSACTIONS' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(valor_fabric, valor_transactions, 0)) DESC;

-- ============================================
-- COMO USAR:
-- ============================================
-- 1. Execute esta query no Supabase SQL Editor
-- 2. Clique em "Download CSV" ou "Export" (botão no canto superior direito dos resultados)
-- 3. Abra o CSV no Excel
-- 4. Use filtros/tabela dinâmica para analisar
-- ============================================

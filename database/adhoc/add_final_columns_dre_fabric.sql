-- SQL FINAL: Adicionar APENAS as colunas que realmente faltam no dre_fabric
-- Agora que sabemos que tag2, tag3, recorrente e tag_orc JÁ EXISTEM
-- Execute este script no SQL Editor do Supabase
-- Data: 2026-02-03 (Atualizado)

BEGIN;

-- ========================================
-- COLUNAS QUE REALMENTE FALTAM (apenas 4)
-- ========================================

-- 1. TYPE (tipo de transação: REVENUE, COST, SGA, RATEIO)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS type TEXT;

COMMENT ON COLUMN dre_fabric.type IS 'Tipo de transação: REVENUE, FIXED_COST, VARIABLE_COST, SGA, RATEIO';

-- 2. SCENARIO (cenário: Real, Orçado, A-1)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'Real';

COMMENT ON COLUMN dre_fabric.scenario IS 'Cenário: Real (padrão do Fabric), Orçado, A-1';

-- 3. STATUS (status do lançamento)
-- Nota: já existe status_lanc_financeiro, mas vamos criar um campo normalizado
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Normal';

COMMENT ON COLUMN dre_fabric.status IS 'Status normalizado: Normal, Pendente, Ajustado, Rateado, Excluído';

-- 4. DATA (data do lançamento)
-- Verificar se já existe antes de adicionar
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS data DATE;

COMMENT ON COLUMN dre_fabric.data IS 'Data do lançamento financeiro';

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_dre_fabric_type ON dre_fabric(type);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_scenario ON dre_fabric(scenario);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_status ON dre_fabric(status);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_data ON dre_fabric(data);

-- ========================================
-- POPULAR CAMPOS COM VALORES PADRÃO
-- ========================================

-- Definir scenario padrão
UPDATE dre_fabric
SET scenario = 'Real'
WHERE scenario IS NULL;

-- Mapear status_lanc_financeiro para status normalizado
UPDATE dre_fabric
SET status = CASE
    WHEN status_lanc_financeiro IS NULL THEN 'Normal'
    WHEN status_lanc_financeiro = 'Normal' THEN 'Normal'
    WHEN status_lanc_financeiro LIKE '%Pendent%' THEN 'Pendente'
    WHEN status_lanc_financeiro LIKE '%Ajust%' THEN 'Ajustado'
    WHEN status_lanc_financeiro LIKE '%Exclu%' THEN 'Excluído'
    ELSE 'Normal'
END
WHERE status IS NULL;

-- ========================================
-- CALCULAR O CAMPO TYPE BASEADO NA CONTA
-- ========================================

-- Regra de negócio para calcular type baseado no plano de contas
UPDATE dre_fabric
SET type = CASE
    -- Receitas (contas 3.x)
    WHEN conta LIKE '3.%' THEN 'REVENUE'

    -- Custos Variáveis (contas 4.1.x)
    WHEN conta LIKE '4.1.%' THEN 'VARIABLE_COST'

    -- Custos Fixos (contas 4.2.x)
    WHEN conta LIKE '4.2.%' THEN 'FIXED_COST'

    -- SG&A (contas 4.3.x)
    WHEN conta LIKE '4.3.%' THEN 'SGA'

    -- Rateio (contas específicas)
    WHEN conta LIKE '%RATEIO%' THEN 'RATEIO'

    -- Padrão: REVENUE
    ELSE 'REVENUE'
END
WHERE type IS NULL;

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- 1. Verificar estrutura das colunas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name IN ('type', 'scenario', 'status', 'data')
ORDER BY column_name;

-- 2. Contar registros por tipo
SELECT
  type,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual
FROM dre_fabric
WHERE type IS NOT NULL
GROUP BY type
ORDER BY quantidade DESC;

-- 3. Contar registros por scenario
SELECT
  scenario,
  COUNT(*) as quantidade
FROM dre_fabric
GROUP BY scenario;

-- 4. Contar registros por status
SELECT
  status,
  COUNT(*) as quantidade
FROM dre_fabric
GROUP BY status
ORDER BY quantidade DESC;

-- 5. Verificar registros sem data
SELECT
  COUNT(*) as total_registros,
  COUNT(data) as com_data,
  COUNT(*) - COUNT(data) as sem_data
FROM dre_fabric;

COMMIT;

-- ========================================
-- MENSAGEM DE SUCESSO
-- ========================================

SELECT
  '✅ Colunas adicionadas com sucesso!' as status,
  'type, scenario, status, data' as colunas_adicionadas,
  (SELECT COUNT(*) FROM dre_fabric) as total_registros;

-- ========================================
-- MAPEAMENTO COMPLETO ATUALIZADO
-- ========================================

/*
MAPEAMENTO FINAL: transactions ↔ dre_fabric

✅ COLUNAS MAPEADAS (16/20 = 80%):

transactions     →  dre_fabric
─────────────────────────────────────
id               =  id (ou gerar novo)
chave_id         =  chave
filial           =  filial
marca            =  cia
tag01            =  tag1         ⭐
tag02            =  tag2         ⭐ JÁ EXISTE
tag03            =  tag3         ⭐ JÁ EXISTE
ticket           =  ticket
vendor           =  fornecedor_padrao
date             =  data         ⭐ ADICIONADO
amount           =  valor
category         =  conta
description      =  complemento
recurring        =  recorrente   ⭐ JÁ EXISTE
nat_orc          =  tag_orc      ⭐ JÁ EXISTE
created_at       =  created_at
updated_at       =  updated_at

❌ COLUNAS CALCULADAS (4/20 = 20%):

type             =  CALCULADO (baseado em conta)
scenario         =  FIXO ('Real')
status           =  MAPEADO (de status_lanc_financeiro)
*/

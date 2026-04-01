-- Adicionar colunas faltantes na tabela dre_fabric
-- Para ter correspondência completa com a tabela transactions
-- Execute este script no SQL Editor do Supabase (ou Fabric Data Warehouse)
-- Data: 2026-02-03

BEGIN;

-- 1. Adicionar coluna TYPE (tipo de transação)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS type TEXT;

-- 2. Adicionar coluna SCENARIO (cenário: Real/Orçado/A-1)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'Real';

-- 3. Adicionar coluna STATUS (status do lançamento)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Normal';

-- 4. Adicionar coluna TAG02 (segmento)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS tag02 TEXT;

-- 5. Adicionar coluna TAG03 (projeto)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS tag03 TEXT;

-- 6. Adicionar coluna NAT_ORC (natureza orçamentária)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS nat_orc TEXT;

-- 7. Adicionar coluna RECURRING (recorrência)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS recurring TEXT;

-- 8. Adicionar coluna DESCRIPTION (para equivaler a complemento)
-- Nota: complemento já existe, mas podemos criar um alias ou view

-- 9. Adicionar coluna MARCA (para equivaler a cia)
-- Nota: cia já existe, podemos usar um alias na sincronização

-- 10. Criar índices para as novas colunas (opcional)
CREATE INDEX IF NOT EXISTS idx_dre_fabric_type ON dre_fabric(type);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_scenario ON dre_fabric(scenario);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_status ON dre_fabric(status);

-- 11. Adicionar comentários nas colunas
COMMENT ON COLUMN dre_fabric.type IS 'Tipo de transação: REVENUE, FIXED_COST, VARIABLE_COST, SGA, RATEIO';
COMMENT ON COLUMN dre_fabric.scenario IS 'Cenário: Real (padrão), Orçado, A-1';
COMMENT ON COLUMN dre_fabric.status IS 'Status: Normal (padrão), Pendente, Ajustado, Rateado, Excluído';
COMMENT ON COLUMN dre_fabric.tag02 IS 'TAG02 - Segmento (Educação Infantil, Fundamental, etc)';
COMMENT ON COLUMN dre_fabric.tag03 IS 'TAG03 - Projeto (Operação Regular, Reforma, etc)';
COMMENT ON COLUMN dre_fabric.nat_orc IS 'Natureza orçamentária';
COMMENT ON COLUMN dre_fabric.recurring IS 'Indicador de recorrência (Sim/Não)';

-- 12. Atualizar registros existentes com valores padrão
UPDATE dre_fabric
SET
  scenario = 'Real',
  status = 'Normal'
WHERE scenario IS NULL OR status IS NULL;

-- 13. Verificação - Listar todas as colunas da tabela
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
ORDER BY ordinal_position;

-- 14. Contagem de registros
SELECT
  COUNT(*) as total_registros,
  COUNT(type) as com_type,
  COUNT(scenario) as com_scenario,
  COUNT(status) as com_status,
  COUNT(tag02) as com_tag02,
  COUNT(tag03) as com_tag03,
  COUNT(nat_orc) as com_nat_orc,
  COUNT(recurring) as com_recurring
FROM dre_fabric;

COMMIT;

-- Mensagem de sucesso
SELECT 'Colunas adicionadas no dre_fabric com sucesso!' as status,
       'type, scenario, status, tag02, tag03, nat_orc, recurring' as colunas_adicionadas;

/*
PRÓXIMOS PASSOS APÓS EXECUTAR ESTE SCRIPT:

1. CALCULAR O CAMPO TYPE baseado na conta contábil
   UPDATE dre_fabric
   SET type = CASE
     WHEN conta LIKE '3.%' THEN 'REVENUE'
     WHEN conta LIKE '4.1%' THEN 'VARIABLE_COST'
     WHEN conta LIKE '4.2%' THEN 'FIXED_COST'
     WHEN conta LIKE '4.3%' THEN 'SGA'
     ELSE 'REVENUE'
   END
   WHERE type IS NULL;

2. BUSCAR NAT_ORC da tabela conta_contabil (se existir)
   UPDATE dre_fabric df
   SET nat_orc = cc.nat_orc
   FROM conta_contabil cc
   WHERE df.conta = cc.cod_conta
   AND df.nat_orc IS NULL;

3. Verificar integridade:
   SELECT type, COUNT(*) FROM dre_fabric GROUP BY type;
   SELECT scenario, COUNT(*) FROM dre_fabric GROUP BY scenario;
   SELECT status, COUNT(*) FROM dre_fabric GROUP BY status;
*/

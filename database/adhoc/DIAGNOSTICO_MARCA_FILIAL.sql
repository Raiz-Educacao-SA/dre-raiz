-- =====================================================
-- DIAGNÓSTICO: Correlação Marca-Filial
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver estrutura completa da tabela FILIAL
SELECT
  cia,
  filial as codigo_filial,
  nomefilial,
  COUNT(*) OVER (PARTITION BY cia, nomefilial) as qtd_duplicatas
FROM filial
ORDER BY cia, nomefilial, filial
LIMIT 50;

-- 2. Ver se há filiais com MESMO NOME em CIAs DIFERENTES
SELECT
  nomefilial,
  STRING_AGG(DISTINCT cia, ', ') as cias_com_esse_nome,
  COUNT(DISTINCT cia) as total_cias_diferentes
FROM filial
GROUP BY nomefilial
HAVING COUNT(DISTINCT cia) > 1
ORDER BY total_cias_diferentes DESC, nomefilial;

-- 3. Ver quantas filiais cada CIA tem
SELECT
  cia,
  COUNT(DISTINCT nomefilial) as total_filiais_unicas,
  COUNT(*) as total_registros
FROM filial
GROUP BY cia
ORDER BY cia;

-- 4. Ver sample de dados de CADA CIA
(SELECT 'GT' as marca, * FROM filial WHERE cia = 'GT' ORDER BY nomefilial LIMIT 5)
UNION ALL
(SELECT 'CGS' as marca, * FROM filial WHERE cia = 'CGS' ORDER BY nomefilial LIMIT 5)
UNION ALL
(SELECT 'QI' as marca, * FROM filial WHERE cia = 'QI' ORDER BY nomefilial LIMIT 5);

-- 5. Verificar se há CIAs NULL ou vazias
SELECT
  CASE
    WHEN cia IS NULL THEN 'NULL'
    WHEN cia = '' THEN 'VAZIO'
    ELSE cia
  END as cia_status,
  COUNT(*) as total
FROM filial
GROUP BY cia
ORDER BY cia;

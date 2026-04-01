# ✅ PENDÊNCIAS: Reativar Cenários ORÇADO e A-1

## Status Atual (14/02/2026)
- ✅ Cenário **Real** funcionando 100%
- ⚠️ Cenários **Orçado** e **A-1** desabilitados temporariamente
- ⚠️ Tabelas `transactions_orcado` e `transactions_ano_anterior` estão vazias

---

## 📋 CHECKLIST - Reativar Orçado e A-1

### 1️⃣ BANCO DE DADOS

#### 1.1. Verificar Estrutura das Tabelas
```sql
-- Verificar se as tabelas existem e têm a estrutura correta
\d transactions_orcado
\d transactions_ano_anterior

-- Verificar se têm as mesmas colunas que transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('transactions', 'transactions_orcado', 'transactions_ano_anterior')
ORDER BY table_name, ordinal_position;
```

#### 1.2. Verificar Triggers de Auto-Populate `nome_filial`
```sql
-- Confirmar que os triggers existem nas 3 tabelas
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%nome_filial%'
ORDER BY event_object_table;

-- Deve retornar 6 triggers:
-- ✅ trigger_transactions_nome_filial_insert (INSERT em transactions)
-- ✅ trigger_transactions_nome_filial_update (UPDATE em transactions)
-- ✅ trigger_transactions_orcado_nome_filial_insert (INSERT em transactions_orcado)
-- ✅ trigger_transactions_orcado_nome_filial_update (UPDATE em transactions_orcado)
-- ✅ trigger_transactions_ano_anterior_nome_filial_insert (INSERT em transactions_ano_anterior)
-- ✅ trigger_transactions_ano_anterior_nome_filial_update (UPDATE em transactions_ano_anterior)
```

#### 1.3. Verificar Função `get_dre_dimension`
```sql
-- Confirmar que a função aceita os 3 cenários
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dre_dimension';

-- A função deve ter lógica para:
-- ✅ Consultar transactions quando scenario = 'Real'
-- ✅ Consultar transactions_orcado quando scenario = 'Orçado'
-- ✅ Consultar transactions_ano_anterior quando scenario = 'A-1'
```

#### 1.4. Verificar Função `get_dre_summary`
```sql
-- Confirmar que a função agrega os 3 cenários
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_dre_summary';

-- A função deve fazer UNION ALL de:
-- ✅ transactions (scenario = 'Real')
-- ✅ transactions_orcado (scenario = 'Orçado')
-- ✅ transactions_ano_anterior (scenario = 'A-1')
```

---

### 2️⃣ POPULAR DADOS

#### 2.1. Importar Dados de Orçado
```sql
-- Exemplo de INSERT (ajustar conforme fonte de dados)
INSERT INTO transactions_orcado (
  description, amount, date, conta_contabil, type,
  filial, marca, status, scenario,
  tag0, tag01, tag02, tag03,
  ticket, vendor, recurring, nat_orc, chave_id
)
SELECT
  description, amount, date, conta_contabil, type,
  filial, marca, 'Normal' as status, 'Orçado' as scenario,
  tag0, tag01, tag02, tag03,
  ticket, vendor, recurring, nat_orc, chave_id
FROM fonte_dados_orcado;

-- ✅ O trigger vai popular nome_filial automaticamente!

-- Verificar quantos registros foram inseridos
SELECT COUNT(*) as total_orcado FROM transactions_orcado;
```

#### 2.2. Importar Dados de Ano Anterior (A-1)
```sql
-- Exemplo de INSERT (ajustar conforme fonte de dados)
INSERT INTO transactions_ano_anterior (
  description, amount, date, conta_contabil, type,
  filial, marca, status, scenario,
  tag0, tag01, tag02, tag03,
  ticket, vendor, recurring, nat_orc, chave_id
)
SELECT
  description, amount, date, conta_contabil, type,
  filial, marca, 'Normal' as status, 'A-1' as scenario,
  tag0, tag01, tag02, tag03,
  ticket, vendor, recurring, nat_orc, chave_id
FROM fonte_dados_ano_anterior;

-- ✅ O trigger vai popular nome_filial automaticamente!

-- Verificar quantos registros foram inseridos
SELECT COUNT(*) as total_a1 FROM transactions_ano_anterior;
```

#### 2.3. Validar Dados Importados
```sql
-- Verificar se nome_filial foi populado corretamente
SELECT
  'Orçado' as tabela,
  COUNT(*) as total,
  COUNT(nome_filial) as com_nome_filial,
  COUNT(*) - COUNT(nome_filial) as sem_nome_filial
FROM transactions_orcado

UNION ALL

SELECT
  'A-1' as tabela,
  COUNT(*) as total,
  COUNT(nome_filial) as com_nome_filial,
  COUNT(*) - COUNT(nome_filial) as sem_nome_filial
FROM transactions_ano_anterior;

-- Se tiver registros sem nome_filial, rodar UPDATE manual:
UPDATE transactions_orcado t
SET nome_filial = f.nome_filial
FROM filial f
WHERE t.marca = f.cia
  AND t.filial = f.filial
  AND t.nome_filial IS NULL;

UPDATE transactions_ano_anterior t
SET nome_filial = f.nome_filial
FROM filial f
WHERE t.marca = f.cia
  AND t.filial = f.filial
  AND t.nome_filial IS NULL;
```

---

### 3️⃣ CÓDIGO REACT - DREViewV2.tsx

#### 3.1. Reativar Loop de Cenários no Drill-Down
**Arquivo:** `components/DREViewV2.tsx`
**Linhas:** ~1739 e ~1769

**Trocar:**
```typescript
// ⚠️ TEMPORÁRIO: Apenas cenário Real (Orçado e A-1 vazios por enquanto)
for (const scenario of ['Real']) {
```

**Para:**
```typescript
// ✅ REATIVADO: Todos os cenários (Real, Orçado, A-1)
for (const scenario of ['Real', 'Orçado', 'A-1']) {
```

**Fazer em 2 lugares:**
1. Loop de verificação de cache (~linha 1739)
2. Loop de extração de valores únicos (~linha 1769)

---

### 4️⃣ TESTES FUNCIONAIS

#### 4.1. Testar Busca Inicial
- [ ] Abrir DRE Gerencial
- [ ] Selecionar período (ex: Jan/2025 a Dez/2025)
- [ ] Selecionar filtros (marca, filial, tag01)
- [ ] Clicar em **Buscar Dados**
- [ ] Verificar se aparecem colunas: **Real**, **Orçado**, **A-1**
- [ ] Verificar se os valores são diferentes entre os cenários

#### 4.2. Testar Drill-Down com 3 Cenários
- [ ] Expandir uma linha de Tag0 (ex: RECEITA)
- [ ] Verificar se carrega dados para os 3 cenários
- [ ] Console NÃO deve mostrar loop infinito
- [ ] Expandir Tag01 → Tag02 → Tag03
- [ ] Verificar se todos os níveis carregam corretamente

#### 4.3. Testar Cálculos de Delta
- [ ] Verificar coluna **ΔOrc %** (variação vs Orçado)
- [ ] Verificar coluna **ΔA-1 %** (variação vs Ano Anterior)
- [ ] Verificar coluna **ΔOrc R$** (diferença absoluta vs Orçado)
- [ ] Verificar coluna **ΔA-1 R$** (diferença absoluta vs A-1)
- [ ] Fórmulas:
  - `ΔOrc % = (Real - Orçado) / |Orçado| * 100`
  - `ΔA-1 % = (Real - A-1) / |A-1| * 100`

#### 4.4. Testar Filtros Avançados
- [ ] Filtrar por marca específica
- [ ] Filtrar por filial específica
- [ ] Filtrar por tag01/tag02/tag03
- [ ] Verificar se os 3 cenários respeitam os filtros

#### 4.5. Testar Exportação
- [ ] Exportar para Excel
- [ ] Verificar se exporta os 3 cenários
- [ ] Exportar para PDF
- [ ] Verificar se PDF contém os 3 cenários

---

### 5️⃣ VALIDAÇÕES DE QUALIDADE

#### 5.1. Verificar Performance
```sql
-- Testar velocidade da query com 3 cenários
EXPLAIN ANALYZE
SELECT * FROM get_dre_summary(
  '2025-01',
  '2025-12',
  ARRAY['GT', 'QI', 'NE', 'BS']::text[],
  NULL::text[],
  NULL::text[]
);

-- Tempo esperado: < 2 segundos para ~2000 linhas agregadas
```

#### 5.2. Verificar Consistência dos Dados
```sql
-- Comparar totais por cenário
SELECT
  scenario,
  COUNT(*) as total_linhas,
  SUM(amount) as soma_total,
  MIN(date) as data_min,
  MAX(date) as data_max
FROM (
  SELECT scenario, amount, date FROM transactions
  UNION ALL
  SELECT scenario, amount, date FROM transactions_orcado
  UNION ALL
  SELECT scenario, amount, date FROM transactions_ano_anterior
) t
GROUP BY scenario
ORDER BY scenario;
```

#### 5.3. Verificar Integridade Referencial
```sql
-- Verificar se todos os marca+filial têm correspondência na tabela filial
SELECT
  'transactions_orcado' as tabela,
  COUNT(*) as total_sem_match
FROM transactions_orcado t
WHERE NOT EXISTS (
  SELECT 1 FROM filial f
  WHERE f.cia = t.marca AND f.filial = t.filial
)

UNION ALL

SELECT
  'transactions_ano_anterior' as tabela,
  COUNT(*) as total_sem_match
FROM transactions_ano_anterior t
WHERE NOT EXISTS (
  SELECT 1 FROM filial f
  WHERE f.cia = t.marca AND f.filial = t.filial
);

-- Resultado esperado: 0 para ambas
```

---

### 6️⃣ DOCUMENTAÇÃO

#### 6.1. Atualizar MEMORY.md
Adicionar nota:
```markdown
## Reativação Orçado/A-1 (DATA DA REATIVAÇÃO)
- ✅ Tabelas transactions_orcado e transactions_ano_anterior populadas
- ✅ Triggers de nome_filial funcionando
- ✅ DREViewV2.tsx loops reativados para 3 cenários
- ✅ Testes funcionais aprovados
```

#### 6.2. Atualizar Comentários no Código
Remover comentários `⚠️ TEMPORÁRIO` e trocar por `✅ ATIVADO`

---

## 🎯 RESUMO RÁPIDO

Quando as tabelas estiverem populadas:

1. **Banco:** Verificar triggers + funções RPC
2. **Dados:** Popular transactions_orcado e transactions_ano_anterior
3. **Código:** Trocar `['Real']` → `['Real', 'Orçado', 'A-1']` em 2 lugares
4. **Testar:** Drill-down + filtros + exportação
5. **Validar:** Performance + consistência + integridade
6. **Documentar:** Atualizar MEMORY.md

---

## ⚠️ ATENÇÃO

- **NÃO** reativar se as tabelas estiverem vazias (causará loop infinito)
- **SEMPRE** testar em desenvolvimento antes de ir para produção
- **VERIFICAR** se nome_filial está populado em 100% dos registros
- **MEDIR** performance antes/depois da reativação

---

## 📞 SUPORTE

Se houver problemas na reativação:
1. Verificar logs do console (drill-down)
2. Verificar logs do Supabase (RPC functions)
3. Verificar se get_dre_dimension está retornando dados vazios
4. Voltar para modo `['Real']` se necessário

---

**Última atualização:** 14/02/2026
**Status:** Aguardando população das tabelas transactions_orcado e transactions_ano_anterior

# 🔄 Guia - Migração: Adicionar Conta Contábil

Sistema corrigido: nova coluna `conta_contabil` em `transactions` para fazer JOIN com Google Sheets.

---

## 🎯 Nova Abordagem

### ✅ Estrutura Corrigida

**Antes (errado):**
```sql
transactions.category = conta_contabil.cod_conta  ❌
```
- `category` armazena categoria geral (Receita, Despesa, etc.)
- Não é o código da conta contábil

**Agora (correto):**
```sql
transactions.conta_contabil = conta_contabil.cod_conta  ✅
```
- Nova coluna `conta_contabil` criada em `transactions`
- Armazena código específico da conta (ex: "3.01.001")
- JOIN correto com plano de contas do Google Sheets

---

## 📋 Passo a Passo de Implementação

### PASSO 1: Executar Migration

**1.1. Abrir Supabase SQL Editor**

**1.2. Executar o script:**
```
database/add_conta_contabil_column.sql
```

**1.3. Verificar sucesso:**
```sql
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'conta_contabil';
```

Deve retornar:
```
conta_contabil | text
```

---

### PASSO 2: Configurar Google Sheets Sync

**2.1. Configurar Google Apps Script** (conforme GUIA_GOOGLE_SHEETS_SYNC.md)

**2.2. Sincronizar dados do Google Sheets:**

Menu no Sheets: 🔄 Sincronização → ✅ Sincronizar Tudo Agora

**2.3. Verificar no Supabase:**
```sql
SELECT COUNT(*) FROM conta_contabil;
-- Deve retornar número de linhas do Google Sheets
```

---

### PASSO 3: Popular conta_contabil nas Transactions

Você tem 3 opções para popular a coluna:

#### **Opção A: Popular Automaticamente (Tentativa)**

Se `category` já contém códigos de contas:

```sql
UPDATE transactions t
SET conta_contabil = c.cod_conta
FROM conta_contabil c
WHERE t.category = c.cod_conta
  AND t.conta_contabil IS NULL;

-- Verificar quantas foram atualizadas
SELECT
  COUNT(*) FILTER (WHERE conta_contabil IS NOT NULL) as com_conta,
  COUNT(*) FILTER (WHERE conta_contabil IS NULL) as sem_conta
FROM transactions;
```

#### **Opção B: Popular Manualmente por Regras**

Criar regras de mapeamento:

```sql
-- Exemplo 1: Receitas de mensalidade
UPDATE transactions
SET conta_contabil = '3.01.001'
WHERE description ILIKE '%mensalidade%'
  AND conta_contabil IS NULL;

-- Exemplo 2: Despesas com salário
UPDATE transactions
SET conta_contabil = '4.02.001'
WHERE description ILIKE '%salário%'
  AND conta_contabil IS NULL;

-- Exemplo 3: Por categoria
UPDATE transactions
SET conta_contabil = '1.01.001'
WHERE category = 'Caixa'
  AND conta_contabil IS NULL;
```

#### **Opção C: Importar CSV com Mapeamento**

**3.1. Exportar transactions sem conta:**
```sql
SELECT
  id,
  date,
  description,
  category,
  amount,
  '' as conta_contabil_sugerida
FROM transactions
WHERE conta_contabil IS NULL
ORDER BY date DESC;
```

**3.2. Preencher no Excel/Sheets:**
- Adicionar código da conta em `conta_contabil_sugerida`

**3.3. Importar de volta:**
```sql
-- Template (ajustar conforme seu CSV)
UPDATE transactions
SET conta_contabil = tmp.conta_contabil
FROM csv_import tmp
WHERE transactions.id = tmp.id;
```

---

## 🧪 Testar o JOIN

### Teste 1: Verificar View

```sql
SELECT
  date,
  conta_contabil,
  description,
  amount,
  conta_tag1,
  conta_bp_dre
FROM vw_transactions_with_conta
WHERE scenario = 'Real'
LIMIT 10;
```

### Teste 2: JOIN Manual

```sql
SELECT
  t.date,
  t.conta_contabil,
  t.description,
  t.amount,
  c.tag1,
  c.bp_dre,
  c.responsavel
FROM transactions t
LEFT JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.scenario = 'Real'
LIMIT 10;
```

### Teste 3: Análise por Tag

```sql
SELECT
  c.tag1,
  COUNT(t.id) as num_transacoes,
  SUM(t.amount) as valor_total
FROM transactions t
INNER JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.scenario = 'Real'
GROUP BY c.tag1
ORDER BY valor_total DESC;
```

---

## 📊 Monitorar Qualidade

### Dashboard de Preenchimento

```sql
SELECT
  'Total de Transações' as metrica,
  COUNT(*) as valor
FROM transactions
WHERE scenario = 'Real'

UNION ALL

SELECT
  'Com conta_contabil preenchida',
  COUNT(*)
FROM transactions
WHERE conta_contabil IS NOT NULL
  AND scenario = 'Real'

UNION ALL

SELECT
  'Sem conta_contabil (precisa corrigir)',
  COUNT(*)
FROM transactions
WHERE conta_contabil IS NULL
  AND scenario = 'Real'

UNION ALL

SELECT
  'Percentual preenchido',
  ROUND(
    COUNT(*) FILTER (WHERE conta_contabil IS NOT NULL) * 100.0 /
    COUNT(*),
    2
  )
FROM transactions
WHERE scenario = 'Real';
```

### Alertas

```sql
-- Alerta 1: Transações sem conta
SELECT
  'ALERTA' as tipo,
  'Transações sem conta_contabil' as descricao,
  COUNT(*) as quantidade
FROM transactions
WHERE conta_contabil IS NULL
  AND scenario = 'Real';

-- Alerta 2: Contas inválidas
SELECT
  'ALERTA' as tipo,
  'Contas que não existem no Google Sheets' as descricao,
  COUNT(*) as quantidade
FROM transactions t
LEFT JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.conta_contabil IS NOT NULL
  AND c.id IS NULL
  AND t.scenario = 'Real';
```

---

## 🔄 Workflow Contínuo

### Para Novas Transactions

**Opção 1: Preencher na Importação**

Ao importar novas transactions, já preencher `conta_contabil`:

```sql
INSERT INTO transactions (
  id, date, description, category, amount,
  type, scenario, branch, conta_contabil  -- ← incluir aqui
)
VALUES (
  'uuid', '2026-01-31', 'Mensalidade João', 'Receita', 1000,
  'Receita', 'Real', 'São Paulo', '3.01.001'  -- ← código da conta
);
```

**Opção 2: Trigger Automático**

Criar trigger que preenche automaticamente:

```sql
CREATE OR REPLACE FUNCTION auto_fill_conta_contabil()
RETURNS TRIGGER AS $$
BEGIN
  -- Se conta_contabil não foi preenchida
  IF NEW.conta_contabil IS NULL THEN
    -- Tentar encontrar match por category
    SELECT cod_conta INTO NEW.conta_contabil
    FROM conta_contabil
    WHERE cod_conta = NEW.category
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_fill_conta_contabil_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_conta_contabil();
```

---

## 📈 Queries Úteis

### Ver Status Geral

```sql
SELECT
  COUNT(*) as total,
  COUNT(conta_contabil) as preenchidas,
  COUNT(*) - COUNT(conta_contabil) as vazias,
  ROUND(COUNT(conta_contabil) * 100.0 / COUNT(*), 2) || '%' as percentual
FROM transactions
WHERE scenario = 'Real';
```

### Top Contas Sem Preencher

```sql
SELECT
  category,
  COUNT(*) as quantidade,
  SUM(amount) as valor_total,
  'Precisa definir conta_contabil' as acao
FROM transactions
WHERE conta_contabil IS NULL
  AND scenario = 'Real'
GROUP BY category
ORDER BY quantidade DESC
LIMIT 10;
```

### Contas Mais Usadas

```sql
SELECT
  t.conta_contabil,
  c.tag1,
  c.nome_nat_orc,
  COUNT(t.id) as num_usos
FROM transactions t
INNER JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.scenario = 'Real'
GROUP BY t.conta_contabil, c.tag1, c.nome_nat_orc
ORDER BY num_usos DESC
LIMIT 20;
```

---

## ✅ Checklist de Implementação

### Banco de Dados
- [ ] Executar `add_conta_contabil_column.sql`
- [ ] Verificar coluna `conta_contabil` criada
- [ ] Verificar índice criado
- [ ] Verificar view `vw_transactions_with_conta` criada

### Google Sheets
- [ ] Configurar Google Apps Script
- [ ] Sincronizar dados para `conta_contabil`
- [ ] Verificar dados no Supabase

### Preenchimento
- [ ] Popular `conta_contabil` nas transactions existentes
- [ ] Verificar percentual de preenchimento
- [ ] Corrigir transações sem conta
- [ ] Validar contas inválidas

### Testes
- [ ] Testar JOIN manualmente
- [ ] Testar view `vw_transactions_with_conta`
- [ ] Testar análises por tag
- [ ] Testar análises por BP/DRE

### Monitoramento
- [ ] Configurar alertas de qualidade
- [ ] Definir workflow para novas transactions
- [ ] Documentar regras de mapeamento

---

## 🎯 Arquivos Criados

```
database/
├── add_conta_contabil_column.sql    # Migration principal
└── queries_conta_contabil_v2.sql    # Queries atualizadas

GUIA_MIGRACAO_CONTA_CONTABIL.md      # Este guia
GUIA_GOOGLE_SHEETS_SYNC.md           # Sync com Google Sheets
```

---

## 📊 Estrutura Final

### Tabela: transactions

```
transactions
├── id
├── date
├── description
├── category                 ← Categoria geral
├── amount
├── conta_contabil           ← NOVA! Código da conta contábil
└── ...
```

### Tabela: conta_contabil (Google Sheets)

```
conta_contabil
├── cod_conta                ← JOIN aqui!
├── tag1, tag2, tag3, tag4
├── tag_orc
├── ger
├── bp_dre
├── nat_orc
├── nome_nat_orc
└── responsavel
```

### JOIN Correto

```sql
transactions.conta_contabil = conta_contabil.cod_conta
```

---

## 🎉 Resultado Final

✅ Coluna `conta_contabil` em `transactions`
✅ Tabela `conta_contabil` sincronizada com Google Sheets
✅ JOIN correto funcionando
✅ View `vw_transactions_with_conta` pronta
✅ Queries de análise atualizadas
✅ Sistema de alertas e monitoramento

Agora você pode fazer análises completas usando o plano de contas do Google Sheets! 🚀

---

**Data:** 31 de Janeiro de 2026
**Versão:** 2.0.0
**Status:** ✅ MIGRAÇÃO DOCUMENTADA

🔗 **JOIN correto implementado!**

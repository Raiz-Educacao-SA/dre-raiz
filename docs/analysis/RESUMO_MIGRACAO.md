# 📦 Resumo: Arquivos da Migração conta_contabil

## 🎯 Visão Geral

Sistema completo para sincronizar Google Sheets "Conta Cont" com Supabase e fazer JOIN com transactions.

**Estrutura:**
```
Google Sheets (Conta Cont)
    ↓ [Sincronização automática]
Supabase: conta_contabil
    ↓ [JOIN]
Supabase: transactions.conta_contabil
```

---

## 📂 Arquivos Criados

### 1. 📋 Guias e Documentação

| Arquivo | Descrição | Quando usar |
|---------|-----------|-------------|
| `GUIA_MIGRACAO_CONTA_CONTABIL.md` | **Guia principal** com passo a passo completo | **Comece aqui!** |
| `RESUMO_MIGRACAO.md` | Este arquivo - índice de todos os arquivos | Referência rápida |
| `google-sheets-sync/INSTRUCOES_GOOGLE_APPS_SCRIPT.md` | Instruções detalhadas para configurar Google Apps Script | Configurar sincronização |

---

### 2. 🗄️ Scripts SQL

| Arquivo | Descrição | Executar onde |
|---------|-----------|---------------|
| `database/add_conta_contabil_column.sql` | **Migration principal** - Cria coluna, tabela, índices, view | Supabase SQL Editor |
| `database/validate_conta_contabil.sql` | Validação completa - Verifica se tudo funcionou | Supabase SQL Editor (após migration) |
| `database/queries_conta_contabil_v2.sql` | Exemplos de queries usando o JOIN correto | Referência / Copiar queries |

---

### 3. 🔧 Scripts Auxiliares

| Arquivo | Descrição | Como usar |
|---------|-----------|-----------|
| `EXECUTAR_MIGRACAO.bat` | Menu interativo para acessar todos os arquivos | Duplo clique |
| `google-sheets-sync/google-apps-script.js` | Código do Google Apps Script para sincronização | Copiar para Apps Script |

---

### 4. 📚 Arquivos Antigos (Referência)

| Arquivo | Status | Nota |
|---------|--------|------|
| `database/queries_conta_contabil.sql` | ⚠️ Desatualizado | Usava t.category (errado) - usar queries_conta_contabil_v2.sql |
| `database/create_conta_contabil_fixed.sql` | ⚠️ Substituído | Abordagem antiga - usar add_conta_contabil_column.sql |

---

## 🚀 Ordem de Execução

### Fase 1: Preparação (5 min)

1. **Ler documentação**
   - Abra: `GUIA_MIGRACAO_CONTA_CONTABIL.md`
   - Entenda o processo completo

2. **Executar menu auxiliar**
   - Duplo clique: `EXECUTAR_MIGRACAO.bat`
   - Menu interativo para acessar arquivos

---

### Fase 2: Banco de Dados (10 min)

3. **Executar migration no Supabase**
   - Abra: `database/add_conta_contabil_column.sql`
   - Copie todo o conteúdo
   - Cole no Supabase SQL Editor
   - Execute
   - ✅ Deve retornar: "Coluna conta_contabil adicionada com sucesso!"

4. **Validar estrutura**
   - Abra: `database/validate_conta_contabil.sql`
   - Execute no Supabase SQL Editor
   - Verifique todos os ✅ e ⚠️
   - Se tudo OK, prossiga

---

### Fase 3: Google Apps Script (15 min)

5. **Configurar sincronização**
   - Abra: `google-sheets-sync/INSTRUCOES_GOOGLE_APPS_SCRIPT.md`
   - Siga TODOS os 10 passos
   - Configure credenciais do Supabase
   - Cole código do `google-apps-script.js`
   - Teste a sincronização

6. **Verificar dados sincronizados**
   - Execute no Supabase:
   ```sql
   SELECT COUNT(*) FROM conta_contabil;
   -- Deve retornar número de linhas do Google Sheets
   ```

---

### Fase 4: Popular Transactions (5-30 min)

7. **Popular conta_contabil nas transactions existentes**

   **Opção A: Automático (se category já tem códigos)**
   ```sql
   UPDATE transactions t
   SET conta_contabil = c.cod_conta
   FROM conta_contabil c
   WHERE t.category = c.cod_conta
     AND t.conta_contabil IS NULL;
   ```

   **Opção B: Manual por regras**
   ```sql
   -- Exemplo: Receitas de mensalidade
   UPDATE transactions
   SET conta_contabil = '3.01.001'
   WHERE description ILIKE '%mensalidade%'
     AND conta_contabil IS NULL;
   ```

   **Opção C: Importar CSV**
   - Exportar transactions sem conta
   - Preencher manualmente em Excel/Sheets
   - Importar de volta

---

### Fase 5: Validação Final (5 min)

8. **Executar validação completa**
   - Execute: `database/validate_conta_contabil.sql`
   - Verificar:
     - ✅ Percentual preenchido > 80%
     - ✅ JOIN funcionando
     - ✅ Sem contas inválidas

9. **Testar queries de análise**
   - Abra: `database/queries_conta_contabil_v2.sql`
   - Execute alguns exemplos
   - Verificar se retornam dados corretos

---

## 📊 Estrutura Final

### Tabela: transactions

```sql
transactions
├── id
├── date
├── description
├── category                 -- Categoria geral (Receita, Despesa, etc.)
├── amount
├── conta_contabil           -- ✨ NOVA! Código da conta contábil
└── ...
```

### Tabela: conta_contabil (Google Sheets)

```sql
conta_contabil
├── id                       -- UUID (Supabase)
├── cod_conta                -- ✨ CHAVE! (ex: "3.01.001")
├── tag1, tag2, tag3, tag4
├── tag_orc
├── ger
├── bp_dre                   -- Balanço Patrimonial ou DRE
├── nat_orc
├── nome_nat_orc
├── responsavel
├── created_at
├── updated_at
└── synced_at                -- Última sincronização
```

### View: vw_transactions_with_conta

```sql
CREATE VIEW vw_transactions_with_conta AS
SELECT
  t.*,                        -- Todas as colunas de transactions
  c.tag1 as conta_tag1,       -- Tags da conta
  c.tag2 as conta_tag2,
  c.bp_dre as conta_bp_dre,   -- BP/DRE
  c.responsavel as conta_responsavel
FROM transactions t
LEFT JOIN conta_contabil c ON t.conta_contabil = c.cod_conta;
```

### JOIN Correto

```sql
-- ✅ CORRETO (nova abordagem)
transactions.conta_contabil = conta_contabil.cod_conta

-- ❌ ERRADO (abordagem antiga)
transactions.category = conta_contabil.cod_conta
```

---

## 🔍 Verificações Rápidas

### Estrutura OK?

```sql
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'conta_contabil';

-- Deve retornar: conta_contabil | text
```

### Sync funcionando?

```sql
SELECT
  COUNT(*) as total_contas,
  MAX(synced_at) as ultima_sync
FROM conta_contabil;

-- Deve retornar: > 0 contas, última sync recente
```

### JOIN funcionando?

```sql
SELECT
  t.date,
  t.conta_contabil,
  t.amount,
  c.tag1,
  c.bp_dre
FROM transactions t
INNER JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.scenario = 'Real'
LIMIT 10;

-- Deve retornar: 10 linhas com dados combinados
```

### Preenchimento OK?

```sql
SELECT
  COUNT(*) as total,
  COUNT(conta_contabil) as preenchidas,
  ROUND(COUNT(conta_contabil) * 100.0 / COUNT(*), 2) as percentual
FROM transactions
WHERE scenario = 'Real';

-- Ideal: percentual > 80%
```

---

## 🎯 Queries Úteis

### Análise por Tag1

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

### Análise por BP/DRE

```sql
SELECT
  c.bp_dre,
  SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as entradas,
  SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as saidas,
  SUM(t.amount) as saldo
FROM transactions t
INNER JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.scenario = 'Real'
GROUP BY c.bp_dre;
```

### Transações sem conta

```sql
SELECT
  id,
  date,
  description,
  category,
  amount
FROM transactions
WHERE conta_contabil IS NULL
  AND scenario = 'Real'
ORDER BY date DESC
LIMIT 50;
```

### Contas inválidas

```sql
SELECT DISTINCT
  t.conta_contabil,
  COUNT(*) as ocorrencias
FROM transactions t
LEFT JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
WHERE t.conta_contabil IS NOT NULL
  AND c.id IS NULL
  AND t.scenario = 'Real'
GROUP BY t.conta_contabil
ORDER BY ocorrencias DESC;
```

---

## 🎓 Conceitos Importantes

### 1. Diferença: category vs conta_contabil

| Campo | Propósito | Exemplo |
|-------|-----------|---------|
| `category` | Categoria **geral** | "Receita", "Despesa", "Ativo" |
| `conta_contabil` | Código **específico** da conta | "3.01.001", "4.02.003" |

**Por que não reutilizar category?**
- `category` é usado para filtros gerais na UI
- `conta_contabil` é para análises contábeis detalhadas
- Mantém flexibilidade para ambos os casos

---

### 2. Sincronização Unidirecional

```
Google Sheets → Supabase (conta_contabil)
      ↓
Transactions.conta_contabil → JOIN → conta_contabil.cod_conta
```

**Fluxo:**
1. Edita no Google Sheets (fonte da verdade)
2. Google Apps Script detecta mudança
3. Envia para Supabase via REST API
4. Supabase atualiza conta_contabil (upsert)
5. JOIN com transactions funciona automaticamente

---

### 3. Performance

**Índices criados:**
```sql
-- Em transactions
CREATE INDEX idx_transactions_conta_contabil ON transactions(conta_contabil);

-- Em conta_contabil
CREATE INDEX idx_conta_contabil_cod_conta ON conta_contabil(cod_conta);
CREATE INDEX idx_conta_contabil_tag1 ON conta_contabil(tag1);
CREATE INDEX idx_conta_contabil_bp_dre ON conta_contabil(bp_dre);
CREATE INDEX idx_conta_contabil_tags ON conta_contabil(tag1, tag2, bp_dre);
```

**Resultado:** JOINs rápidos mesmo com milhares de transactions

---

## ⚠️ Cuidados

### 1. Não delete manualmente do Supabase

- Google Sheets é a fonte da verdade
- Se precisar deletar, delete no Sheets
- Sincronização não remove automaticamente (apenas insert/update)

### 2. Backup antes de popular

```sql
-- Criar backup antes de UPDATE em massa
CREATE TABLE transactions_backup AS
SELECT * FROM transactions;
```

### 3. Não use category para JOIN

```sql
-- ❌ NUNCA faça isso
LEFT JOIN conta_contabil c ON t.category = c.cod_conta

-- ✅ SEMPRE use conta_contabil
LEFT JOIN conta_contabil c ON t.conta_contabil = c.cod_conta
```

---

## 🆘 Precisa de Ajuda?

### Erros Comuns

1. **Coluna não existe**
   - Causa: Migration não executada
   - Solução: Execute `add_conta_contabil_column.sql`

2. **JOIN sem resultados**
   - Causa: conta_contabil não populada nas transactions
   - Solução: Execute UPDATE para popular

3. **Sincronização não funciona**
   - Causa: Credenciais incorretas ou RLS bloqueando
   - Solução: Verifique INSTRUCOES_GOOGLE_APPS_SCRIPT.md

---

## ✅ Checklist Completo

### Banco de Dados
- [ ] Executar `add_conta_contabil_column.sql`
- [ ] Verificar coluna criada
- [ ] Verificar índices criados
- [ ] Verificar view criada

### Google Sheets
- [ ] Configurar Google Apps Script
- [ ] Colar código e configurar credenciais
- [ ] Testar sincronização manual
- [ ] Configurar triggers automáticos
- [ ] Verificar dados no Supabase

### Preenchimento
- [ ] Popular conta_contabil nas transactions
- [ ] Verificar percentual > 80%
- [ ] Corrigir contas inválidas
- [ ] Corrigir transactions sem conta

### Validação
- [ ] Executar `validate_conta_contabil.sql`
- [ ] Testar JOIN manualmente
- [ ] Testar queries de exemplo
- [ ] Testar view `vw_transactions_with_conta`

---

## 🎉 Resultado Final

Após completar todos os passos:

✅ Coluna `conta_contabil` em transactions
✅ Tabela `conta_contabil` sincronizada com Google Sheets
✅ Sincronização automática funcionando
✅ JOIN correto implementado
✅ View `vw_transactions_with_conta` pronta
✅ Queries de análise atualizadas
✅ Sistema de validação e monitoramento

**Agora você pode fazer análises financeiras completas usando o plano de contas do Google Sheets! 🚀**

---

**Data:** 31 de Janeiro de 2026
**Versão:** 2.0.0
**Status:** ✅ SISTEMA COMPLETO DOCUMENTADO

🔗 **Próximo passo:** Executar `EXECUTAR_MIGRACAO.bat` e seguir o guia!

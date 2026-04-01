# 📊 RELATÓRIO DE OTIMIZAÇÃO DO BANCO SUPABASE

**Data:** 04 de Fevereiro de 2026
**Projeto:** Ap proposta - Sistema DRE RAIZ
**Limite Atual:** 500 MB (quase no limite)
**Objetivo:** Identificar e remover dados desnecessários para otimizar o banco

---

## 🎯 RESUMO EXECUTIVO

Seu banco Supabase está utilizando 5 tabelas principais, mas provavelmente a tabela `dre_fabric` é a principal causadora do alto consumo de espaço, pois ela:
- **NÃO é usada pelo frontend da aplicação**
- Serve apenas como espelho temporário dos dados do Microsoft Fabric
- Contém dados brutos não processados que já foram migrados para `transactions`

### 💰 Economia Estimada de Espaço

| Item | Ação | Economia Estimada |
|------|------|-------------------|
| Arquivos de log/erro no projeto | Deletar | ~156 MB (no projeto, não no banco) |
| Tabela `dre_fabric` | Avaliar/Limpar | **50-80% do banco** |
| Registros antigos em `transactions` | Arquivar | 20-40% do banco |
| Índices não utilizados | Remover | 5-10% do banco |
| Tabelas de cruzamento/histórico | Limpar | 10-20% do banco |

---

## 📋 ANÁLISE DAS TABELAS

### 1. **TABELAS USADAS ATIVAMENTE PELO FRONTEND** ✅

#### 1.1 `transactions`
- **Uso:** CRÍTICO - Principal tabela da aplicação
- **Campos:** 25 colunas (id, date, description, amount, type, etc.)
- **Índices:** 9 índices criados
- **Ação:** ⚠️ **OTIMIZAR - Manter apenas dados necessários**

**Recomendações:**
```sql
-- 1. Verificar quantidade de registros e período
SELECT
    COUNT(*) as total_registros,
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente,
    pg_size_pretty(pg_total_relation_size('transactions')) as tamanho_total
FROM transactions;

-- 2. Analisar distribuição por data
SELECT
    DATE_TRUNC('month', date::date) as mes,
    COUNT(*) as quantidade,
    pg_size_pretty(SUM(pg_column_size(transactions.*))) as tamanho_estimado
FROM transactions
GROUP BY mes
ORDER BY mes DESC;

-- 3. Identificar registros antigos (mais de 2 anos)
SELECT COUNT(*) as registros_antigos
FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');
```

**Ações sugeridas:**
- [ ] Mover registros com mais de 2 anos para tabela de arquivo histórico
- [ ] Considerar compactação de dados antigos
- [ ] Implementar política de retenção de dados

---

#### 1.2 `manual_changes`
- **Uso:** Sistema de aprovações
- **Impacto:** Baixo (poucos registros esperados)
- **Ação:** ✅ **MANTER - Sem necessidade de limpeza**

**Query de verificação:**
```sql
SELECT
    status,
    COUNT(*) as quantidade,
    pg_size_pretty(pg_total_relation_size('manual_changes')) as tamanho
FROM manual_changes
GROUP BY status;
```

---

#### 1.3 `users` e `user_permissions`
- **Uso:** Autenticação e controle de acesso
- **Impacto:** Mínimo (poucos usuários)
- **Ação:** ✅ **MANTER - Essencial**

---

### 2. **TABELA NÃO USADA PELO FRONTEND** ❌

#### 2.1 `dre_fabric` - **PRINCIPAL CANDIDATA À LIMPEZA**

**Status:** ⚠️ **NÃO é usada pelo frontend**

**Função:**
- Espelho dos dados do Microsoft Fabric Data Warehouse
- Usada APENAS para sincronização batch via Python
- Dados já foram processados e movidos para `transactions`

**Análise de uso:**
```
✅ Referenciada em: Scripts Python de sincronização
✅ Referenciada em: Arquivos SQL de batch processing
❌ NÃO referenciada em: Nenhum arquivo TypeScript/React
❌ NÃO referenciada em: services/supabaseService.ts
❌ NÃO referenciada em: Componentes do frontend
```

**Estrutura da tabela:**
```sql
CREATE TABLE dre_fabric (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT,
    codlote TEXT,
    cia TEXT,
    filial TEXT,
    anomes TEXT,
    valor NUMERIC,
    complemento TEXT,
    recorrente TEXT,
    conta TEXT,
    tag1, tag2, tag3, tag4 TEXT,
    -- ... 39 colunas no total
);
```

**Queries de diagnóstico:**
```sql
-- 1. Verificar tamanho da tabela
SELECT
    pg_size_pretty(pg_total_relation_size('dre_fabric')) as tamanho_total,
    pg_size_pretty(pg_relation_size('dre_fabric')) as tamanho_dados,
    pg_size_pretty(pg_total_relation_size('dre_fabric') - pg_relation_size('dre_fabric')) as tamanho_indices
FROM pg_class
WHERE relname = 'dre_fabric';

-- 2. Contar registros
SELECT COUNT(*) as total_registros FROM dre_fabric;

-- 3. Verificar período dos dados
SELECT
    MIN(anomes) as mes_mais_antigo,
    MAX(anomes) as mes_mais_recente,
    COUNT(DISTINCT anomes) as quantidade_meses
FROM dre_fabric;

-- 4. Analisar distribuição por mês
SELECT
    anomes,
    COUNT(*) as quantidade,
    pg_size_pretty(SUM(pg_column_size(dre_fabric.*))) as tamanho_estimado
FROM dre_fabric
GROUP BY anomes
ORDER BY anomes DESC;
```

**RECOMENDAÇÕES CRÍTICAS:**

**Opção 1: REMOVER COMPLETAMENTE** (Recomendado se já sincronizou tudo)
```sql
-- ⚠️ CUIDADO: Fazer backup antes!
-- Se todos os dados já foram processados para 'transactions':
DROP TABLE IF EXISTS dre_fabric CASCADE;

-- Economia estimada: 50-80% do banco de dados
```

**Opção 2: MANTER APENAS ÚLTIMOS 3 MESES**
```sql
-- Deletar dados antigos (manter apenas últimos 3 meses)
DELETE FROM dre_fabric
WHERE anomes < TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM');

-- Depois, fazer VACUUM para recuperar espaço
VACUUM FULL dre_fabric;
```

**Opção 3: CRIAR TABELA PARTICIONADA**
```sql
-- Se precisar manter histórico, particionar por mês
-- (Requer migração - mais complexo)
```

---

### 3. **TABELAS DE SINCRONIZAÇÃO E HISTÓRICO** ⚠️

Estas tabelas foram mencionadas em arquivos SQL mas não estão no schema principal:

#### 3.1 `cruzamento_dados_banco_vs_DRE`
- **Função:** Histórico de comparações entre `dre_fabric` e `transactions`
- **Ação:** ❌ **DELETAR - Dados temporários de debug**

```sql
-- Verificar se existe
SELECT COUNT(*) FROM cruzamento_dados_banco_vs_DRE;

-- Se não for necessário, deletar
DROP TABLE IF EXISTS cruzamento_dados_banco_vs_DRE CASCADE;
```

#### 3.2 `cruzamento_resumo`
- **Função:** Resumo das comparações
- **Ação:** ❌ **DELETAR - Dados temporários**

```sql
DROP TABLE IF EXISTS cruzamento_resumo CASCADE;
```

#### 3.3 `cruzamento_controle`
- **Função:** Flag de sincronização em andamento
- **Ação:** ✅ **MANTER - Se ainda usa sincronização**

#### 3.4 `conta_contabil`
- **Função:** Lookup table para dados contábeis
- **Ação:** ✅ **MANTER - Usada via API**

---

## 🔍 ANÁLISE DE ÍNDICES

### Índices na tabela `transactions`:

```sql
-- Verificar uso dos índices
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as "Vezes Usado",
    idx_tup_read as "Tuplas Lidas",
    idx_tup_fetch as "Tuplas Retornadas",
    pg_size_pretty(pg_relation_size(indexrelid)) as "Tamanho"
FROM pg_stat_user_indexes
WHERE tablename = 'transactions'
ORDER BY idx_scan ASC;
```

**Índices criados:**
1. `idx_transactions_date` - ✅ Usado frequentemente
2. `idx_transactions_filial` - ✅ Usado em filtros
3. `idx_transactions_marca` - ✅ Usado em filtros
4. `idx_transactions_scenario` - ✅ Usado nas abas
5. `idx_transactions_status` - ⚠️ Verificar uso
6. `idx_transactions_vendor` - ⚠️ Verificar uso
7. `idx_transactions_ticket` - ⚠️ Verificar uso
8. `idx_transactions_nat_orc` - ⚠️ Verificar uso
9. `idx_transactions_chave_id` - ✅ Usado em joins

**Ação:**
```sql
-- Remover índices não utilizados (se idx_scan = 0)
-- Exemplo:
-- DROP INDEX IF EXISTS idx_transactions_vendor;
```

---

## 📁 ARQUIVOS DO PROJETO QUE OCUPAM ESPAÇO

### Arquivos para DELETAR IMEDIATAMENTE:

1. **`registros_com_erro_20260204_083748.json`** - 122 MB
   - Log de sincronização com erro
   - ❌ Não é necessário manter

2. **`registros_com_erro_20260204_083748.xlsx`** - 17 MB
   - Exportação do JSON anterior
   - ❌ Não é necessário manter

3. **`validacao_100_linhas_20260203_112359.xlsx`** - 33 KB
   - Arquivo de teste
   - ❌ Não é necessário manter

4. **`validacao_100_linhas_20260203_113017.xlsx`** - 33 KB
   - Arquivo de teste
   - ❌ Não é necessário manter

5. **`relatorio_erro_sincronizacao_20260204_083748.txt`** - 28 KB
   - Log de erro
   - ❌ Não é necessário manter

**Comando para deletar:**
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"

del registros_com_erro_20260204_083748.json
del registros_com_erro_20260204_083748.xlsx
del validacao_100_linhas_20260203_112359.xlsx
del validacao_100_linhas_20260203_113017.xlsx
del relatorio_erro_sincronizacao_20260204_083748.txt
del erros_sincronizacao_*.json
```

**Economia:** ~156 MB no projeto (não no banco)

---

### Arquivos para AVALIAR:

1. **`proposta de carga de dados.xlsx`** - 11 MB
   - ⚠️ Verificar se ainda é necessário
   - Se for apenas histórico ou staging, pode deletar

2. **`modelo ppt.pdf`** - 4.9 MB
   - ⚠️ Template de apresentação
   - Se estiver em outro local ou versionado, pode deletar

---

## 🎬 PLANO DE AÇÃO RECOMENDADO

### **FASE 1: DIAGNÓSTICO (10 minutos)**

Execute estas queries no SQL Editor do Supabase para entender o tamanho atual:

```sql
-- 1. Tamanho total do banco
SELECT
    pg_size_pretty(pg_database_size(current_database())) as tamanho_banco;

-- 2. Tamanho de cada tabela
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamanho_total,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS tamanho_dados,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS tamanho_indices
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Contar registros em cada tabela
SELECT
    'transactions' as tabela, COUNT(*) as registros FROM transactions
UNION ALL
SELECT 'dre_fabric', COUNT(*) FROM dre_fabric
UNION ALL
SELECT 'manual_changes', COUNT(*) FROM manual_changes
UNION ALL
SELECT 'users', COUNT(*) FROM users;
```

---

### **FASE 2: LIMPEZA DE ARQUIVOS (5 minutos)**

```bash
# Deletar arquivos grandes do projeto
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"

# Deletar logs de erro (156 MB)
del registros_com_erro_20260204_083748.json
del registros_com_erro_20260204_083748.xlsx
del validacao_*.xlsx
del erros_sincronizacao_*.json
del relatorio_erro_*.txt

# Verificar economia
dir *.json *.xlsx
```

---

### **FASE 3: BACKUP (OBRIGATÓRIO - 30 minutos)**

⚠️ **ANTES DE DELETAR QUALQUER DADO DO BANCO, FAÇA BACKUP!**

**Opção A: Backup via Supabase Dashboard**
1. Vá em: Database → Backups
2. Crie um backup manual
3. Aguarde conclusão

**Opção B: Backup via pg_dump (mais rápido)**
```bash
# Instalar PostgreSQL client tools
# Depois executar:

pg_dump "postgresql://[USER]:[PASSWORD]@[HOST]:5432/[DATABASE]" \
  --table=dre_fabric \
  --file=backup_dre_fabric_20260204.sql

pg_dump "postgresql://[USER]:[PASSWORD]@[HOST]:5432/[DATABASE]" \
  --table=transactions \
  --file=backup_transactions_20260204.sql
```

**Opção C: Export para CSV (recomendado para `dre_fabric`)**
```sql
-- No SQL Editor do Supabase:
COPY dre_fabric TO '/tmp/dre_fabric_backup.csv' WITH CSV HEADER;
-- Depois baixe o arquivo via dashboard
```

---

### **FASE 4: DECISÃO SOBRE `dre_fabric` (CRÍTICO)**

**Perguntas para responder:**

1. **Os dados de `dre_fabric` já foram todos processados e estão em `transactions`?**
   - ✅ SIM → Pode deletar `dre_fabric` completamente
   - ❌ NÃO → Manter apenas últimos 3 meses

2. **Você ainda precisa sincronizar dados novos do Fabric?**
   - ✅ SIM → Manter tabela vazia ou com últimos 3 meses
   - ❌ NÃO → Pode deletar completamente

3. **Há algum processo batch/scheduled que usa `dre_fabric`?**
   - ✅ SIM → Verificar frequência e ajustar retenção
   - ❌ NÃO → Pode deletar

---

### **FASE 5: LIMPEZA DO BANCO (30-60 minutos)**

#### **Cenário A: Se pode deletar `dre_fabric` completamente**

```sql
-- 1. Verificar tamanho antes
SELECT pg_size_pretty(pg_total_relation_size('dre_fabric')) as tamanho_antes;

-- 2. Deletar a tabela
DROP TABLE IF EXISTS dre_fabric CASCADE;

-- 3. Deletar tabelas relacionadas (se existirem)
DROP TABLE IF EXISTS cruzamento_dados_banco_vs_DRE CASCADE;
DROP TABLE IF EXISTS cruzamento_resumo CASCADE;
DROP TABLE IF EXISTS dre_fabric_agrupado CASCADE;

-- 4. Fazer VACUUM para recuperar espaço
VACUUM FULL;

-- 5. Verificar economia
SELECT pg_size_pretty(pg_database_size(current_database())) as tamanho_depois;
```

**Economia estimada:** 50-80% do banco

---

#### **Cenário B: Se precisa manter `dre_fabric` para sincronização futura**

```sql
-- 1. Verificar distribuição de dados
SELECT
    anomes,
    COUNT(*) as registros,
    pg_size_pretty(SUM(pg_column_size(dre_fabric.*))) as tamanho
FROM dre_fabric
GROUP BY anomes
ORDER BY anomes DESC;

-- 2. Deletar dados antigos (manter apenas últimos 3 meses)
DELETE FROM dre_fabric
WHERE anomes < TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM');

-- 3. Fazer VACUUM FULL para recuperar espaço
VACUUM FULL dre_fabric;

-- 4. Recriar índices otimizados
REINDEX TABLE dre_fabric;
```

**Economia estimada:** 40-60% do banco

---

#### **Cenário C: Limpar registros antigos de `transactions`**

```sql
-- 1. Verificar distribuição de dados
SELECT
    DATE_TRUNC('year', date::date) as ano,
    COUNT(*) as registros,
    pg_size_pretty(SUM(pg_column_size(transactions.*))) as tamanho
FROM transactions
GROUP BY ano
ORDER BY ano DESC;

-- 2. Criar tabela de arquivo histórico (opcional)
CREATE TABLE transactions_archive AS
SELECT * FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');

-- 3. Deletar registros antigos (mais de 2 anos)
DELETE FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');

-- 4. Fazer VACUUM
VACUUM FULL transactions;
```

**Economia estimada:** 20-40% do tamanho de `transactions`

---

### **FASE 6: OTIMIZAÇÃO PÓS-LIMPEZA (15 minutos)**

```sql
-- 1. Analisar estatísticas das tabelas
ANALYZE;

-- 2. Recriar índices
REINDEX DATABASE postgres;

-- 3. Verificar índices não utilizados
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. Deletar índices não utilizados (se houver)
-- DROP INDEX IF EXISTS nome_do_indice;
```

---

## 📊 RESULTADOS ESPERADOS

### **Antes da Otimização:**
- Banco Supabase: ~450-490 MB (perto do limite de 500 MB)
- Projeto local: ~340 MB (com logs e arquivos temporários)

### **Depois da Otimização (Cenário Completo):**
- Banco Supabase: ~100-150 MB (economia de 70-75%)
- Projeto local: ~180 MB (economia de ~160 MB)

### **Depois da Otimização (Cenário Conservador):**
- Banco Supabase: ~200-250 MB (economia de 50%)
- Projeto local: ~180 MB (economia de ~160 MB)

---

## ⚠️ AVISOS IMPORTANTES

### **ANTES DE EXECUTAR QUALQUER COMANDO:**

1. ✅ **Fazer backup completo do banco**
2. ✅ **Testar queries de diagnóstico primeiro**
3. ✅ **Validar que dados estão em `transactions`**
4. ✅ **Informar a equipe sobre a manutenção**
5. ✅ **Executar em horário de baixa utilização**

### **APÓS A LIMPEZA:**

1. ✅ **Testar aplicação completamente**
2. ✅ **Verificar se sincronizações ainda funcionam**
3. ✅ **Monitorar tamanho do banco**
4. ✅ **Documentar mudanças realizadas**

---

## 🔄 MANUTENÇÃO CONTÍNUA

### **Recomendações para evitar crescimento excessivo:**

1. **Política de retenção de dados:**
   ```sql
   -- Criar job agendado para deletar dados antigos
   -- (Supabase não suporta pg_cron no plano free, usar API/script externo)
   ```

2. **Monitoramento de tamanho:**
   ```sql
   -- Criar view para monitorar tamanho
   CREATE OR REPLACE VIEW v_tamanho_tabelas AS
   SELECT
       tablename,
       pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS tamanho
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size('public.'||tablename) DESC;
   ```

3. **Limpeza periódica:**
   - Executar `VACUUM FULL` mensalmente
   - Revisar e deletar tabelas temporárias
   - Arquivar dados antigos

4. **Otimização de queries:**
   - Usar `LIMIT` em queries grandes
   - Implementar paginação adequada
   - Carregar apenas últimos 3-6 meses por padrão

---

## 📞 PRÓXIMOS PASSOS

1. **Execute o diagnóstico (Fase 1)**
2. **Analise os resultados e decida sobre `dre_fabric`**
3. **Faça o backup (obrigatório)**
4. **Execute a limpeza em etapas**
5. **Monitore os resultados**

---

**Relatório gerado em:** 04/02/2026
**Analista:** Claude Code AI
**Versão:** 1.0

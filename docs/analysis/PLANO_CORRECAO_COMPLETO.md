# 🔧 PLANO DE CORREÇÃO COMPLETO - DRE Raiz

**Data:** 12/02/2026
**Status:** Pronto para executar

---

## 🎯 PROBLEMAS IDENTIFICADOS

### 1️⃣ DRE Gerencial NÃO CARREGA (CRÍTICO)
**Causa:** LEFT JOIN em `tag0_map` sem índice
**Impacto:** 30-60 segundos de espera, pode dar timeout
**Solução:** Criar índice funcional em `tag0_map`

### 2️⃣ Guia Lançamentos LENTA (CRÍTICO)
**Causa:** 10 requests paralelos sobrecarregam API
**Impacto:** "Buscar Tudo" trava o navegador
**Solução:** Reduzir para 3 requests paralelos

### 3️⃣ RLS Bloqueando Cenários (ALTA)
**Causa:** RLS habilitado em `transactions_orcado` e `transactions_ano_anterior`
**Impacto:** DRE não carrega abas "Orçado" e "Ano Anterior"
**Solução:** Desabilitar RLS nessas tabelas (controle via app)

---

## 📂 ARQUIVOS CRIADOS

| Arquivo | Descrição |
|---------|-----------|
| `FIX_TAG0_MAP_INDEX.sql` | Cria índices em tag0_map |
| `FIX_RLS_SCENARIO_TABLES.sql` | Desabilita RLS em tabelas de cenários |
| `VALIDAR_CORRECOES.sql` | Testa todas as correções |
| `PLANO_CORRECAO_COMPLETO.md` | Este documento |

---

## ⚡ PASSOS PARA EXECUTAR

### PASSO 1: Executar correção de índices (SQL)

1. Abrir **Supabase Dashboard** → SQL Editor
2. Copiar e colar o conteúdo de **`FIX_TAG0_MAP_INDEX.sql`**
3. Executar (Run)
4. Verificar output: deve mostrar 3 índices criados

**Tempo estimado:** 5 segundos

---

### PASSO 2: Executar correção de RLS (SQL)

1. Abrir **Supabase Dashboard** → SQL Editor
2. Copiar e colar o conteúdo de **`FIX_RLS_SCENARIO_TABLES.sql`**
3. Executar (Run)
4. Verificar output:
   - `transactions` → RLS HABILITADO ✅
   - `transactions_orcado` → RLS DESABILITADO ✅
   - `transactions_ano_anterior` → RLS DESABILITADO ✅

**Tempo estimado:** 10 segundos

---

### PASSO 3: Validar correções (SQL)

1. Abrir **Supabase Dashboard** → SQL Editor
2. Copiar e colar o conteúdo de **`VALIDAR_CORRECOES.sql`**
3. Executar (Run)
4. Verificar todos os testes:
   - ✅ Índices criados
   - ✅ RLS correto
   - ✅ UNION funciona
   - ✅ Query DRE < 5 segundos

**Tempo estimado:** 30 segundos

---

### PASSO 4: Testar no navegador (FRONT-END)

1. **Hard Refresh** no navegador (Ctrl+Shift+R)
2. **Abrir DRE Gerencial:**
   - Selecionar período: 2026-01 a 2026-12
   - Aguardar carregamento
   - ✅ Deve carregar em < 10 segundos
   - ✅ Deve mostrar dados em todas as abas (Real, Orçado, Ano Anterior)

3. **Abrir Guia Lançamentos:**
   - Definir período: 2026-01 a 2026-12
   - Clicar "Buscar Dados" (paginação)
   - ✅ Deve carregar página 1 em < 3 segundos
   - (OPCIONAL) Clicar "Buscar Tudo"
   - ✅ Deve carregar progressivamente (3-10 segundos)

4. **Testar com Admin:**
   - Login como admin
   - Repetir testes acima
   - ✅ Admin deve ter mesma performance (não mais 2 minutos)

**Tempo estimado:** 2 minutos de testes

---

## 🔍 VALIDAÇÃO DE SUCESSO

### ✅ DRE Gerencial
- Carrega em < 10 segundos
- Mostra dados em todas as abas (Real, Orçado, Ano Anterior)
- Não fica "eternamente carregando"

### ✅ Guia Lançamentos
- "Buscar Dados" retorna página 1 em < 3 segundos
- "Buscar Tudo" carrega progressivamente (não trava)
- Filtros funcionam normalmente

### ✅ Admin
- Mesma performance que usuário comum
- Não fica 2 minutos carregando

---

## 🚨 SE ALGO AINDA NÃO FUNCIONAR

### Se DRE ainda estiver lenta:

1. Verificar no SQL Editor:
```sql
EXPLAIN ANALYZE
SELECT * FROM get_dre_summary('2026-01', '2026-12') LIMIT 10;
```

2. Se aparecer "Seq Scan on tag0_map" → índice NÃO foi criado
   - Executar novamente `FIX_TAG0_MAP_INDEX.sql`

3. Se aparecer "Execution Time > 10000 ms" → muitos dados
   - Considerar implementar cache materializado (próximo passo)

### Se Lançamentos ainda estiver lenta:

1. Verificar no código `services/supabaseService.ts` linha 670:
   - Deve estar: `const PARALLEL_BATCHES = 3;`
   - Se não, editar manualmente

2. Considerar remover "Buscar Tudo" completamente
   - Forçar uso de paginação (mais eficiente)

### Se RLS ainda bloquear:

1. Verificar no SQL Editor:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'transactions%';
```

2. Se `transactions_orcado` ou `transactions_ano_anterior` estiver `true`:
   - Executar novamente `FIX_RLS_SCENARIO_TABLES.sql`

---

## 📊 RESULTADOS ESPERADOS

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| DRE Gerencial (Admin) | 120s (timeout) | < 10s | **12x mais rápido** |
| DRE Gerencial (Usuário) | 30-60s | < 10s | **6x mais rápido** |
| Lançamentos "Buscar Dados" | < 3s | < 3s | Mantém |
| Lançamentos "Buscar Tudo" | Trava | 3-10s | **Não trava mais** |

---

## 🔄 PRÓXIMOS PASSOS (SE AINDA FOR LENTO)

Se após essas correções o Admin ainda demorar > 20 segundos:

### Opção A: Cache Materializado (< 2 segundos)
- Criar view materializada com dados pré-agregados
- Atualizar 1x/dia (cron job)
- Arquivo: `USAR_CACHE_MATERIALIZADO.sql` (já criado)

### Opção B: Limitar período padrão
- Admin carrega apenas último trimestre por padrão
- Botão "Carregar Tudo" para quem precisa

### Opção C: Processamento em background
- Query executada no backend (Node.js worker)
- Notificação quando terminar
- Evita timeout no navegador

---

## 📝 ALTERAÇÕES FEITAS NO CÓDIGO

### `services/supabaseService.ts` (Linha 670)
```typescript
// ANTES:
const PARALLEL_BATCHES = 10; // 10 requests simultâneos

// DEPOIS:
const PARALLEL_BATCHES = 3; // REDUZIDO: 3 requests simultâneos
```

**Motivo:** 10 requests paralelos sobrecarregavam a API Supabase, causando rate limiting e lentidão.

---

## ✅ CHECKLIST FINAL

Execute na ordem:

- [ ] **SQL:** Executar `FIX_TAG0_MAP_INDEX.sql`
- [ ] **SQL:** Executar `FIX_RLS_SCENARIO_TABLES.sql`
- [ ] **SQL:** Executar `VALIDAR_CORRECOES.sql` (verificar output)
- [ ] **Navegador:** Hard Refresh (Ctrl+Shift+R)
- [ ] **Teste:** DRE Gerencial carrega < 10s
- [ ] **Teste:** Guia Lançamentos funciona normalmente
- [ ] **Teste:** Admin tem mesma performance

---

**Última atualização:** 12/02/2026
**Versão:** 1.0
**Status:** Pronto para executar 🚀

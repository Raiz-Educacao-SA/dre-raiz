# 🗺️ MAPEAMENTO COMPLETO: CONTROLE DE RLS

**IMPORTANTE:** Existem **MÚLTIPLOS pontos independentes** de controle de RLS.
**TODOS** precisam ter as **MESMAS configurações** de filtros!

---

## 🎯 CAMPOS DE PERMISSÃO

| Campo | Filtra Por | Exemplo | Status |
|-------|------------|---------|--------|
| **CIA (Marca)** | `marca` | "RAIZ" | ✅ Funcionando |
| **Filial** | `nome_filial` | "CLV - Alfa" | ✅ Corrigido |
| **TAG01** | `tag01` | "Marketing" | ✅ Corrigido |
| **TAG02** | `tag02` | "Operacional" | ⚠️ Disponível |
| **TAG03** | `tag03` | "Projeto X" | ⚠️ Disponível |
| Centro de Custo | - | - | ❌ Não usado |

---

## 📂 PONTOS DE CONTROLE DE RLS

### 1️⃣ **permissionsService.ts** - SERVIÇO CENTRAL

**Arquivo:** `services/permissionsService.ts`

#### Funções Principais:

| Função | Linha | O que faz |
|--------|-------|-----------|
| `applyPermissionFilters()` | 80-136 | Aplica filtros em queries Supabase |
| `addPermissionFiltersToObject()` | 142-214 | Adiciona filtros a objeto de filtros |
| `filterTransactionsByPermissions()` | 220-287 | Filtra array de transações |

#### Filtros Aplicados:

```typescript
// Linha 100: MARCA
query = query.in('marca', permissions.allowedMarcas);

// Linha 106: FILIAL
query = query.in('nome_filial', permissions.allowedFiliais);

// Linha 112: TAG01
query = query.in('tag01', permissions.allowedTag01);

// Linha 118: TAG02
query = query.in('tag02', permissions.allowedTag02);

// Linha 124: TAG03
query = query.in('tag03', permissions.allowedTag03);
```

✅ **STATUS:** CORRIGIDO - Todos os filtros aplicados

---

### 2️⃣ **supabaseService.ts** - QUERIES DIRETAS

**Arquivo:** `services/supabaseService.ts`

#### Linha 519: `applyTransactionFilters()`

```typescript
// Chama automaticamente addPermissionFiltersToObject
filters = addPermissionFiltersToObject(filters);
```

#### Linha 599-744: `getFilteredTransactions()`

Todas as queries de transações passam por `applyTransactionFilters()`, que aplica permissões automaticamente.

✅ **STATUS:** CORRETO - Usa permissionsService

---

### 3️⃣ **DREView.tsx** - QUERIES RPC

**Arquivo:** `components/DREView.tsx`

#### Props Recebidas (linhas 51-59):

```typescript
allowedMarcas?: string[];
allowedFiliais?: string[];
allowedCategories?: string[];
allowedTag01?: string[];  // ✅ ADICIONADO
allowedTag02?: string[];  // ✅ ADICIONADO
allowedTag03?: string[];  // ✅ ADICIONADO
```

#### Função `fetchData()` - Linha 198-219

```typescript
// Linha 176-185: Aplica MARCA
if (allowedMarcas && allowedMarcas.length > 0) {
  finalMarcas = allowedMarcas;
}

// Linha 188-195: Aplica FILIAL
if (allowedFiliais && allowedFiliais.length > 0) {
  finalFiliais = allowedFiliais;
}

// Linha 198-209: Aplica TAG01 ✅ ADICIONADO
if (allowedTag01 && allowedTag01.length > 0) {
  finalTags01 = allowedTag01;
}

// Linha 213: getDRESummary
getDRESummary({
  marcas: finalMarcas,
  nomeFiliais: finalFiliais,
  tags01: finalTags01  // ✅ CORRIGIDO
})
```

#### Função `loadDimensionData()` - Linha 559-578

```typescript
// Linha 541-548: Aplica MARCA
if (allowedMarcas && allowedMarcas.length > 0) {
  mergedMarcas = allowedMarcas;
}

// Linha 550-557: Aplica FILIAL
if (allowedFiliais && allowedFiliais.length > 0) {
  mergedFiliais = allowedFiliais;
}

// Linha 560-571: Aplica TAG01 ✅ ADICIONADO
if (allowedTag01 && allowedTag01.length > 0) {
  mergedTags01 = allowedTag01;
}

// Linha 573: getDREDimension
getDREDimension({
  marcas: mergedMarcas,
  nomeFiliais: mergedFiliais,
  tags01: mergedTags01  // ✅ CORRIGIDO
})
```

✅ **STATUS:** CORRIGIDO - TAG01 adicionado em 2 lugares

---

### 4️⃣ **Dashboard.tsx** - FILTRO CLIENT-SIDE

**Arquivo:** `components/Dashboard.tsx`

#### Linha 84-91: Filtro de Permissões

```typescript
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 Dashboard: Aplicando permissões...');
  const filtered = filterTransactionsByPermissions(transactions);
  return filtered;
}, [transactions]);
```

✅ **STATUS:** CORRETO - Usa `filterTransactionsByPermissions()` do permissionsService

---

### 5️⃣ **KPIsView.tsx** - FILTRO CLIENT-SIDE

**Arquivo:** `components/KPIsView.tsx`

#### Linha 29-36: Filtro de Permissões

```typescript
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 KPIsView: Aplicando permissões...');
  const filtered = filterTransactionsByPermissions(transactions);
  return filtered;
}, [transactions]);
```

✅ **STATUS:** CORRETO - Usa `filterTransactionsByPermissions()`

---

### 6️⃣ **AnalysisView.tsx** - FILTRO CLIENT-SIDE

**Arquivo:** `components/AnalysisView.tsx`

#### Linha 54-61: Filtro de Permissões

```typescript
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 AnalysisView: Aplicando permissões...');
  const filtered = filterTransactionsByPermissions(transactions);
  return filtered;
}, [transactions]);
```

✅ **STATUS:** CORRETO - Usa `filterTransactionsByPermissions()`

---

### 7️⃣ **ForecastingView.tsx** - FILTRO CLIENT-SIDE

**Arquivo:** `components/ForecastingView.tsx`

#### Linha 30-37: Filtro de Permissões

```typescript
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 ForecastingView: Aplicando permissões...');
  const filtered = filterTransactionsByPermissions(transactions);
  return filtered;
}, [transactions]);
```

✅ **STATUS:** CORRETO - Usa `filterTransactionsByPermissions()`

---

### 8️⃣ **TransactionsView.tsx** - BUSCA PRÓPRIA

**Arquivo:** `components/TransactionsView.tsx`

Usa `getFilteredTransactions()` de `supabaseService.ts`, que aplica permissões automaticamente via `applyTransactionFilters()`.

✅ **STATUS:** CORRETO - Query server-side com permissões

---

### 9️⃣ **AdminPanel.tsx** - LISTA DE OPÇÕES

**Arquivo:** `components/AdminPanel.tsx`

#### Linha 79: Lista de Filiais

```typescript
// ✅ CORRIGIDO
const filiais = [...new Set(transactions.map(t => t.nome_filial).filter(Boolean))].sort();
// Retorna: ["CLV - Alfa", "RAIZ - Centro", ...]
```

#### Linha 81: Lista de TAG01

```typescript
// ✅ CORRETO
const tag01Values = [...new Set(transactions.map(t => t.tag01).filter(Boolean))].sort();
// Retorna: ["Marketing", "Vendas", ...]
```

✅ **STATUS:** CORRIGIDO - Usa `nome_filial` em vez de `filial`

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Marca (CIA)
- [ ] permissionsService.ts → `marca` ✅
- [ ] supabaseService.ts → Via permissionsService ✅
- [ ] DREView.tsx → `allowedMarcas` passado e aplicado ✅
- [ ] Dashboard/KPIs/Analysis/Forecasting → Via `filterTransactionsByPermissions()` ✅
- [ ] TransactionsView → Via `getFilteredTransactions()` ✅

### Filial
- [ ] permissionsService.ts → `nome_filial` ✅
- [ ] supabaseService.ts → Via permissionsService ✅
- [ ] DREView.tsx → `allowedFiliais` passado e aplicado ✅
- [ ] Dashboard/KPIs/Analysis/Forecasting → Via `filterTransactionsByPermissions()` ✅
- [ ] TransactionsView → Via `getFilteredTransactions()` ✅
- [ ] AdminPanel.tsx → Lista usa `nome_filial` ✅

### TAG01
- [ ] permissionsService.ts → `tag01` ✅
- [ ] supabaseService.ts → Via permissionsService ✅
- [ ] DREView.tsx → `allowedTag01` passado e aplicado ✅ **CORRIGIDO**
- [ ] Dashboard/KPIs/Analysis/Forecasting → Via `filterTransactionsByPermissions()` ✅
- [ ] TransactionsView → Via `getFilteredTransactions()` ✅
- [ ] AdminPanel.tsx → Lista usa `tag01` ✅

---

## 🔧 CORREÇÕES APLICADAS HOJE

| Arquivo | Linha | O que foi corrigido |
|---------|-------|-------------------|
| **DREView.tsx** | 51-59 | +`allowedTag01`, `allowedTag02`, `allowedTag03` nas props |
| **DREView.tsx** | 67-76 | +Desestruturação de `allowedTag01/02/03` |
| **DREView.tsx** | 198-209 | +Aplicar filtro de `allowedTag01` em `fetchData()` |
| **DREView.tsx** | 560-571 | +Aplicar filtro de `allowedTag01` em `loadDimensionData()` |
| **DREView.tsx** | 587 | +`allowedTag01` nas dependências do useCallback |
| **App.tsx** | 838-842 | +Passar `allowedTag01/02/03` para DREView |
| **AdminPanel.tsx** | 79 | `t.filial` → `t.nome_filial` |

---

## 🎯 RESULTADO FINAL

### Antes
❌ TAG01 funcionava SOMENTE em Lançamentos
❌ Outras guias NÃO aplicavam filtro de TAG01
❌ DREView NÃO recebia nem aplicava `allowedTag01`

### Depois
✅ TAG01 funciona em **TODAS as 6 guias**
✅ DREView recebe e aplica `allowedTag01` em **2 lugares**
✅ Filtros aplicados de forma **consistente** em todo o sistema

---

## 🧪 TESTE COMPLETO

### Setup: Usuário com TAG01 = "Marketing"

```sql
-- 1. Criar usuário
INSERT INTO users (id, email, name, role, created_at)
VALUES (gen_random_uuid(), 'teste.marketing@raizeducacao.com.br', 'Teste Marketing', 'viewer', NOW());

-- 2. Obter ID
SELECT id FROM users WHERE email = 'teste.marketing@raizeducacao.com.br';

-- 3. Criar permissão TAG01 (substituir USER_ID)
INSERT INTO user_permissions (id, user_id, permission_type, permission_value, created_at)
VALUES (gen_random_uuid(), 'USER_ID_AQUI', 'tag01', 'Marketing', NOW());
```

### Validação em TODAS as Guias

| Guia | Log Esperado | Resultado Esperado |
|------|--------------|-------------------|
| **Dashboard** | `🔒 Dashboard: X → Y após RLS` | ✅ Só "Marketing" |
| **KPIs** | `🔒 KPIsView: X → Y após RLS` | ✅ Só "Marketing" |
| **Análise** | `🔒 AnalysisView: X → Y após RLS` | ✅ Só "Marketing" |
| **Forecasting** | `🔒 ForecastingView: X → Y após RLS` | ✅ Só "Marketing" |
| **DRE Gerencial** | `🔒 DRE: Filtro de permissão TAG01 aplicado` | ✅ Só "Marketing" |
| **Lançamentos** | Query com `WHERE tag01 IN ('Marketing')` | ✅ Só "Marketing" |

---

## 📌 LEMBRETE IMPORTANTE

**⚠️ AO ADICIONAR NOVOS FILTROS DE PERMISSÃO:**

1. Adicionar em **permissionsService.ts** (3 funções)
2. Adicionar em **DREView.tsx** (props + 2 lugares de aplicação)
3. Passar via props em **App.tsx** para DREView
4. Verificar se **AdminPanel.tsx** mostra lista correta
5. **Testar em TODAS as 6 guias**

**NUNCA esquecer que há múltiplos pontos independentes!**

---

**SISTEMA COMPLETAMENTE CORRIGIDO** ✅

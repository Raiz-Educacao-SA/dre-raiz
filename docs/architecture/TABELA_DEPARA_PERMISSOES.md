# 🔍 TABELA DE-PARA: PERMISSÕES

## 📋 COLUNAS DISPONÍVEIS NO ADMIN PANEL

As colunas que você pode configurar no Admin Panel são:

| # | Coluna na UI | Código no Banco (`permission_type`) |
|---|--------------|-------------------------------------|
| 1 | Centro de Custo | `centro_custo` |
| 2 | CIA (Marca) | `cia` |
| 3 | Filial | `filial` |
| 4 | TAG01 | `tag01` |

---

## 🔄 MAPEAMENTO COMPLETO: UI → BANCO → FILTRO

| Coluna Admin | `permission_type` | Campo Filtrado no Supabase | Valor Salvo | Status |
|--------------|-------------------|----------------------------|-------------|--------|
| **CIA (Marca)** | `cia` | `marca` | Nome da marca (ex: "RAIZ") | ✅ **FUNCIONA** |
| **TAG01** | `tag01` | `tag01` | Valor da tag01 (ex: "Marketing") | ✅ **FUNCIONA** |
| **Centro de Custo** | `centro_custo` | ❌ **NÃO FILTRA** | Valor do centro de custo | ⚠️ **NÃO USADO** |
| **Filial** | `filial` | `nome_filial` | ⚠️ **CÓDIGO** (ex: "01") | ❌ **PROBLEMA!** |

---

## 🚨 PROBLEMA IDENTIFICADO: FILIAL

### O Conflito

**AdminPanel salva:**
```
permission_type = 'filial'
permission_value = '01'  ← CÓDIGO da filial
```

**permissionsService.ts filtra por:**
```typescript
query = query.in('nome_filial', permissions.allowedFiliais);
```
Busca valores como: `"RAIZ - Unidade Centro"`

### Por que não funciona?

1. **Você configura:** `filial = "01"`
2. **Sistema busca por:** `nome_filial = "01"`
3. **Mas no banco:** `nome_filial = "RAIZ - Unidade Centro"`
4. **Resultado:** ❌ Nada encontrado → Nenhuma transação aparece

---

## 📊 DETALHAMENTO POR CAMPO

### 1. CIA (MARCA) ✅ FUNCIONANDO

**AdminPanel:**
- `permission_type = 'cia'`
- `permission_value = 'RAIZ'` (nome da marca)

**usePermissions.ts (linha 66):**
```typescript
const allowedMarcas = permissions
  .filter(p => p.permission_type === 'cia')
  .map(p => p.permission_value);
// Resultado: ['RAIZ']
```

**permissionsService.ts (linha 100):**
```typescript
query = query.in('marca', permissions.allowedMarcas);
```

**Supabase:**
- Campo: `transactions.marca`
- Valores: "RAIZ", "SABER", etc.

✅ **MATCH PERFEITO!**

---

### 2. TAG01 ✅ FUNCIONANDO

**AdminPanel:**
- `permission_type = 'tag01'`
- `permission_value = 'Marketing'`

**usePermissions.ts (linha 87):**
```typescript
const allowedTag01 = permissions
  .filter(p => p.permission_type === 'tag01')
  .map(p => p.permission_value);
// Resultado: ['Marketing']
```

**permissionsService.ts (linha 112):**
```typescript
query = query.in('tag01', permissions.allowedTag01);
```

**Supabase:**
- Campo: `transactions.tag01`
- Valores: "Marketing", "Vendas", etc.

✅ **MATCH PERFEITO!**

---

### 3. CENTRO DE CUSTO ⚠️ NÃO USADO

**AdminPanel:**
- `permission_type = 'centro_custo'`
- `permission_value = 'Centro X'`

**usePermissions.ts (linha 80):**
```typescript
const allowedCentroCusto = permissions
  .filter(p => p.permission_type === 'centro_custo')
  .map(p => p.permission_value);
// Resultado: ['Centro X']
```

**permissionsService.ts:**
```typescript
// ❌ NÃO EXISTE FILTRO PARA CENTRO DE CUSTO!
// O valor é carregado mas nunca usado
```

**Supabase:**
- Campo: Não existe `centro_custo` na tabela `transactions`
- (Pode existir em outra tabela, mas não é usado para filtrar transações)

⚠️ **CONFIGURADO MAS NÃO FILTRA NADA**

---

### 4. FILIAL ❌ PROBLEMA!

**AdminPanel:**
- `permission_type = 'filial'`
- `permission_value = '01'` ← **CÓDIGO numérico**

**usePermissions.ts (linha 73):**
```typescript
const allowedFiliais = permissions
  .filter(p => p.permission_type === 'filial')
  .map(p => p.permission_value);
// Resultado: ['01']
```

**permissionsService.ts (linha 106):**
```typescript
query = query.in('nome_filial', permissions.allowedFiliais);
// Busca: WHERE nome_filial IN ('01')
```

**Supabase:**
- Campo usado: `transactions.nome_filial`
- Valores reais: `"RAIZ - Unidade Centro"`, `"RAIZ - Unidade Sul"`, etc.
- ❌ **NUNCA vai encontrar "01" em nome_filial**

**Campos disponíveis na tabela:**
- `filial` → Código numérico ("01", "02", "03")
- `nome_filial` → Nome completo ("RAIZ - Unidade Centro")

❌ **MISMATCH: Salva código, busca por nome!**

---

## 🔧 SOLUÇÃO NECESSÁRIA

Existem 3 opções para corrigir:

### Opção 1: Mudar permissionsService para usar `filial` em vez de `nome_filial`

**Mudar linha 106 em `permissionsService.ts`:**
```typescript
// ANTES (ERRADO):
query = query.in('nome_filial', permissions.allowedFiliais);

// DEPOIS (CORRETO):
query = query.in('filial', permissions.allowedFiliais);
```

**Mudar linha 165 em `permissionsService.ts`:**
```typescript
// ANTES (ERRADO):
if (filters.nome_filial && filters.nome_filial.length > 0) {
  filters.nome_filial = filters.nome_filial.filter((f: string) => permissions.allowedFiliais.includes(f));
} else {
  filters.nome_filial = permissions.allowedFiliais;
}

// DEPOIS (CORRETO):
if (filters.filial && filters.filial.length > 0) {
  filters.filial = filters.filial.filter((f: string) => permissions.allowedFiliais.includes(f));
} else {
  filters.filial = permissions.allowedFiliais;
}
```

**Mudar linha 248 em `permissionsService.ts`:**
```typescript
// ANTES (ERRADO):
const filial = t.nome_filial || t.filial;

// DEPOIS (CORRETO):
const filial = t.filial || t.nome_filial;
```

✅ **MAIS SIMPLES E DIRETO**

---

### Opção 2: Mudar AdminPanel para salvar nome_filial completo

Mudar o AdminPanel para salvar `"RAIZ - Unidade Centro"` em vez de `"01"`.

❌ **MAIS COMPLEXO** (precisa buscar de lookup table)

---

### Opção 3: Criar mapeamento de código → nome

Criar função que converte `"01"` → `"RAIZ - Unidade Centro"` antes de filtrar.

❌ **MAIS OVERHEAD** (lookup em toda busca)

---

## 📝 RESUMO DO PROBLEMA

| Tipo | Configurado como | Filtra por | Valor Admin | Valor Banco | Match? |
|------|------------------|------------|-------------|-------------|--------|
| CIA | `cia` | `marca` | RAIZ | RAIZ | ✅ |
| TAG01 | `tag01` | `tag01` | Marketing | Marketing | ✅ |
| FILIAL | `filial` | ~~`nome_filial`~~ | 01 | ~~RAIZ - Unidade Centro~~ | ❌ |
| Centro Custo | `centro_custo` | ❌ nada | Centro X | - | ⚠️ |

---

## ✅ RECOMENDAÇÃO

**CORRIGIR:** permissionsService.ts para filtrar por `filial` (código) em vez de `nome_filial` (nome).

**MOTIVO:**
- AdminPanel já salva códigos ("01", "02")
- Campo `filial` existe na tabela transactions
- Solução mais simples e direta
- Não quebra configurações existentes

---

**Quer que eu aplique a correção agora?** 🔧

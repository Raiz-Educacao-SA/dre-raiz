# 🔐 IMPLEMENTAR PERMISSÕES CORRETAMENTE

**Data:** 12/02/2026
**Status:** Pronto para implementar

---

## 🎯 OBJETIVO

Criar sistema de permissões que:
1. ✅ **Admin:** Vê TUDO sem filtros (performance)
2. ✅ **Usuário com permissões:** Vê SÓ suas permissões
3. ✅ **Usuário sem permissões:** Vê TUDO (acesso total)

---

## 📊 SITUAÇÃO ATUAL

### ✅ O QUE FUNCIONA:
- Banco de dados: RLS removido (sem bloqueios)
- Código: Permissões desabilitadas (teste)
- Performance: Admin carrega rápido
- Todos veem todos os dados

### ⚠️ O QUE FALTA:
- Reativar permissões APENAS para usuários normais
- Admin continuar sem filtros
- Garantir que permissões funcionem corretamente

---

## 🔧 ARQUIVOS A MODIFICAR

### 1️⃣ `hooks/usePermissions.ts`

**Linha 107:** Remover early return de teste

**Lógica correta:**
```typescript
// 1. Se é Admin → SEMPRE retorna sem filtros
if (isAdmin) {
  return {
    permissions: [],
    hasPermissions: false, // Admin NÃO tem restrições
    allowedMarcas: [],
    allowedFiliais: [],
    // ... arrays vazias
    canAccess: () => true,
    filterTransactions: (t) => t // Retorna tudo
  };
}

// 2. Se NÃO tem permissões configuradas → Acesso total
if (!hasPermissions) {
  return { ... }; // Mesmo retorno do Admin
}

// 3. Se TEM permissões → Aplica filtros
return {
  permissions,
  hasPermissions: true,
  allowedMarcas,
  allowedFiliais,
  allowedTag01,
  allowedTag02,
  allowedTag03,
  canAccess: (t) => { /* verificações */ },
  filterTransactions: (ts) => ts.filter(canAccess)
};
```

---

### 2️⃣ `services/permissionsService.ts`

**Função: `applyPermissionFilters()` - Linha 88**

Remover early return de teste, manter lógica original:
```typescript
export const applyPermissionFilters = (query: any, options?) => {
  const permissions = getUserPermissions();

  // 1. Admin → SEM FILTROS (performance)
  if (permissions.isAdmin) {
    console.log('🔓 Admin: Query sem filtros');
    return query;
  }

  // 2. Sem permissões configuradas → SEM FILTROS
  if (!permissions.hasPermissions) {
    console.log('🔓 Acesso total: Query sem filtros');
    return query;
  }

  // 3. Com permissões → APLICAR FILTROS
  console.log('🔒 Aplicando filtros de permissão...');

  if (permissions.allowedMarcas.length > 0) {
    query = query.in('marca', permissions.allowedMarcas);
  }

  if (permissions.allowedFiliais.length > 0) {
    query = query.in('nome_filial', permissions.allowedFiliais);
  }

  // ... demais filtros

  return query;
};
```

**Função: `addPermissionFiltersToObject()` - Linha 147**

Mesma lógica:
```typescript
export const addPermissionFiltersToObject = (filters: any) => {
  const permissions = getUserPermissions();

  // Admin ou sem permissões → NÃO modifica
  if (permissions.isAdmin || !permissions.hasPermissions) {
    return filters;
  }

  // Com permissões → Adiciona ao objeto
  if (permissions.allowedMarcas.length > 0) {
    // Intersecção se já tem filtro, senão usa allowed
    filters.marca = filters.marca?.length > 0
      ? filters.marca.filter(m => permissions.allowedMarcas.includes(m))
      : permissions.allowedMarcas;
  }

  // ... demais filtros

  return filters;
};
```

**Função: `filterTransactionsByPermissions()` - Linha 237**

Mesma lógica (já estava correta):
```typescript
export const filterTransactionsByPermissions = (transactions) => {
  const permissions = getUserPermissions();

  // Admin ou sem permissões → Retorna tudo
  if (permissions.isAdmin || !permissions.hasPermissions) {
    return transactions;
  }

  // Com permissões → Filtra linha por linha
  return transactions.filter(t => {
    // Verifica marca
    if (permissions.allowedMarcas.length > 0) {
      if (!t.marca || !permissions.allowedMarcas.includes(t.marca)) {
        return false;
      }
    }

    // ... demais verificações

    return true;
  });
};
```

---

### 3️⃣ `App.tsx`

**Linha 606:** Reverter para usar filterTransactions

```typescript
const filteredTransactions = useMemo(() => {
  // Aplicar filtros de permissão
  const permissionFiltered = filterTransactions(transactions);

  // Depois, aplicar filtros de UI (marca/filial selecionados)
  if (currentView === 'movements' || currentView === 'dre') {
    return permissionFiltered;
  }

  return permissionFiltered.filter(t => {
    const matchesMarca = selectedMarca.length === 0 || selectedMarca.includes(t.marca || '');
    const matchesFilial = selectedFilial.length === 0 || selectedFilial.includes(t.filial || '');
    return matchesMarca && matchesFilial;
  });
}, [transactions, selectedMarca, selectedFilial, currentView, filterTransactions]);
```

---

### 4️⃣ `components/DREView.tsx`

**Linha 237-247:** Reverter para usar filtros de permissão

```typescript
getDRESummary({
  monthFrom: adjustedMonthFrom,
  monthTo: adjustedMonthTo,
  marcas: finalMarcas,      // ✅ VOLTA A USAR
  nomeFiliais: finalFiliais, // ✅ VOLTA A USAR
  tags01: finalTags01,      // ✅ VOLTA A USAR
}),
```

---

### 5️⃣ `components/TransactionsView.tsx`

**Linha 390-407 e 517-533:** Descomentar filtros

```typescript
// ✅ DESCOMENTAR ISSO:
if (allowedMarcas && allowedMarcas.length > 0) {
  if (filters.marca && filters.marca.length > 0) {
    filters.marca = filters.marca.filter(m => allowedMarcas.includes(m));
  } else {
    filters.marca = allowedMarcas;
  }
}

if (allowedFiliais && allowedFiliais.length > 0) {
  if (filters.nome_filial && filters.nome_filial.length > 0) {
    filters.nome_filial = filters.nome_filial.filter(f => allowedFiliais.includes(f));
  } else {
    filters.nome_filial = allowedFiliais;
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### PASSO 1: Reverter mudanças de teste
- [ ] `hooks/usePermissions.ts` → Remover early return (linha 107)
- [ ] `services/permissionsService.ts` → Remover 3 early returns
- [ ] `App.tsx` → Voltar a usar filterTransactions
- [ ] `components/DREView.tsx` → Voltar a passar filtros
- [ ] `components/TransactionsView.tsx` → Descomentar filtros

### PASSO 2: Garantir lógica correta
- [ ] Admin sempre retorna `hasPermissions: false`
- [ ] Admin sempre retorna arrays vazias
- [ ] Funções verificam `isAdmin` ANTES de aplicar filtros

### PASSO 3: Testar
- [ ] **Admin:** Vê tudo, carrega rápido
- [ ] **Usuário sem permissões:** Vê tudo
- [ ] **Usuário COM permissões:** Vê SÓ as dele

---

## 🧪 CASOS DE TESTE

### Teste 1: Admin
```
Login: admin@raiz.com
Resultado esperado:
- hasPermissions: false
- allowedMarcas: []
- Vê TODOS os dados
- Carrega em < 5 segundos
```

### Teste 2: Usuário SEM permissões
```
Login: usuario@raiz.com (sem registro em permissions)
Resultado esperado:
- hasPermissions: false
- allowedMarcas: []
- Vê TODOS os dados
```

### Teste 3: Usuário COM permissões
```
Login: usuario@raiz.com
Permissões: marca='RAIZ', filial='SP'
Resultado esperado:
- hasPermissions: true
- allowedMarcas: ['RAIZ']
- allowedFiliais: ['SP']
- Vê SOMENTE marca RAIZ E filial SP
```

---

## 🚨 IMPORTANTE

**NÃO** reativar RLS no banco!
- RLS fica desabilitado
- Controle é 100% no código frontend
- Performance melhor
- Mais flexível

---

## 📝 RESUMO

**O que muda:**
- ✅ Admin: Sem filtros (arrays vazias)
- ✅ Usuário: Com filtros (se tiver permissões)
- ✅ Performance: Admin rápido, usuário OK

**O que NÃO muda:**
- ❌ Banco: RLS continua desabilitado
- ❌ Tabelas: Sem políticas RLS
- ❌ Funções SQL: Deletadas permanentemente

---

**Última atualização:** 12/02/2026
**Próximo passo:** Implementar mudanças acima

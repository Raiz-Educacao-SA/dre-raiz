# 🔧 PLANO DE CORREÇÃO: RLS (Row Level Security)

**Baseado em:** `DIAGNOSTICO_RLS_COMPLETO.md`
**Prioridade:** CRÍTICA
**Tempo estimado:** 30-45 minutos

---

## 📦 ARQUIVOS A MODIFICAR

1. ✅ **App.tsx** (1 mudança pequena)
2. ✅ **Dashboard.tsx** (adicionar filtro)
3. ✅ **KPIsView.tsx** (adicionar filtro)
4. ✅ **AnalysisView.tsx** (adicionar filtro)
5. ✅ **ForecastingView.tsx** (adicionar filtro)

---

## 🔨 CORREÇÃO 1: App.tsx

### Localização
**Arquivo:** `App.tsx`
**Linhas:** 104-127

### Mudança
Adicionar tag01, tag02, tag03 nos filtros iniciais

### Código Atual (INCORRETO)
```typescript
const filters: any = {
  monthFrom: `${year}-${String(month).padStart(2, '0')}`,
  monthTo: `${year}-${String(month).padStart(2, '0')}`
};

// ✅ Aplicar filtros de permissão IMEDIATAMENTE (se existirem)
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;
  console.log('🔒 Filtro de marca aplicado:', allowedMarcas);
}

if (allowedFiliais.length > 0) {
  filters.filial = allowedFiliais;
  console.log('🔒 Filtro de filial aplicado:', allowedFiliais);
}

if (allowedCategories.length > 0) {
  filters.category = allowedCategories;
  console.log('🔒 Filtro de categoria aplicado:', allowedCategories);
}
```

### Código Correto (NOVO)
```typescript
const filters: any = {
  monthFrom: `${year}-${String(month).padStart(2, '0')}`,
  monthTo: `${year}-${String(month).padStart(2, '0')}`
};

// ✅ Aplicar filtros de permissão IMEDIATAMENTE (se existirem)
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;
  console.log('🔒 Filtro de marca aplicado:', allowedMarcas);
}

if (allowedFiliais.length > 0) {
  filters.filial = allowedFiliais;
  console.log('🔒 Filtro de filial aplicado:', allowedFiliais);
}

if (allowedCategories.length > 0) {
  filters.category = allowedCategories;
  console.log('🔒 Filtro de categoria aplicado:', allowedCategories);
}

// 🔥 ADICIONAR TAGS (CORREÇÃO)
if (allowedTag01.length > 0) {
  filters.tag01 = allowedTag01;
  console.log('🔒 Filtro de tag01 aplicado:', allowedTag01);
}

if (allowedTag02.length > 0) {
  filters.tag02 = allowedTag02;
  console.log('🔒 Filtro de tag02 aplicado:', allowedTag02);
}

if (allowedTag03.length > 0) {
  filters.tag03 = allowedTag03;
  console.log('🔒 Filtro de tag03 aplicado:', allowedTag03);
}
```

### Validação
- Após correção, recarregar página e verificar logs:
  ```
  🔒 Filtro de tag01 aplicado: ["Marketing"]
  ```

---

## 🔨 CORREÇÃO 2: Dashboard.tsx

### Localização
**Arquivo:** `components/Dashboard.tsx`
**Linhas:** Após imports (linha 7) e no início do componente (linha 45)

### Mudança 1: Adicionar import
```typescript
import { filterTransactionsByPermissions } from '../services/permissionsService';
```

### Mudança 2: Adicionar filtro no início do componente

**Localização:** Após linha 44, ANTES de qualquer useMemo

**Código a ADICIONAR:**
```typescript
// 🔒 APLICAR PERMISSÕES: Filtrar transações recebidas por permissões do usuário
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 Dashboard: Aplicando permissões RLS nas transações...');
  const filtered = filterTransactionsByPermissions(transactions);
  console.log(`🔒 Dashboard: ${transactions.length} → ${filtered.length} transações após RLS`);
  return filtered;
}, [transactions]);
```

### Mudança 3: Trocar todas as referências

**BUSCAR E SUBSTITUIR no arquivo Dashboard.tsx:**

❌ **Trocar:** `transactions.filter(`
✅ **Por:** `permissionFilteredTransactions.filter(`

❌ **Trocar:** `useMemo(() => { return transactions`
✅ **Por:** `useMemo(() => { return permissionFilteredTransactions`

**Exemplo - linha 237 (filteredByMonth):**
```typescript
// ANTES
const filteredByMonth = useMemo(() => {
  return transactions.filter(t => {
    const month = parseInt(t.date.substring(5, 7), 10) - 1;
    return month >= selectedMonthStart && month <= selectedMonthEnd;
  });
}, [transactions, selectedMonthStart, selectedMonthEnd]);

// DEPOIS
const filteredByMonth = useMemo(() => {
  return permissionFilteredTransactions.filter(t => {
    const month = parseInt(t.date.substring(5, 7), 10) - 1;
    return month >= selectedMonthStart && month <= selectedMonthEnd;
  });
}, [permissionFilteredTransactions, selectedMonthStart, selectedMonthEnd]);
```

---

## 🔨 CORREÇÃO 3: KPIsView.tsx

### Localização
**Arquivo:** `components/KPIsView.tsx`
**Mesma lógica do Dashboard**

### Mudança 1: Adicionar import (linha 6)
```typescript
import { filterTransactionsByPermissions } from '../services/permissionsService';
```

### Mudança 2: Adicionar filtro (após linha 28)
```typescript
// 🔒 APLICAR PERMISSÕES: Filtrar transações recebidas por permissões do usuário
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 KPIsView: Aplicando permissões RLS nas transações...');
  const filtered = filterTransactionsByPermissions(transactions);
  console.log(`🔒 KPIsView: ${transactions.length} → ${filtered.length} transações após RLS`);
  return filtered;
}, [transactions]);
```

### Mudança 3: Trocar referências

**BUSCAR E SUBSTITUIR no arquivo KPIsView.tsx:**

❌ **Trocar:** `transactions.filter(`
✅ **Por:** `permissionFilteredTransactions.filter(`

**Exemplo - linha 31 (filteredByMonth):**
```typescript
// ANTES
const filteredByMonth = useMemo(() => {
  return transactions.filter(t => {
    const month = parseInt(t.date.substring(5, 7), 10) - 1;
    return month >= selectedMonthStart && month <= selectedMonthEnd;
  });
}, [transactions, selectedMonthStart, selectedMonthEnd]);

// DEPOIS
const filteredByMonth = useMemo(() => {
  return permissionFilteredTransactions.filter(t => {
    const month = parseInt(t.date.substring(5, 7), 10) - 1;
    return month >= selectedMonthStart && month <= selectedMonthEnd;
  });
}, [permissionFilteredTransactions, selectedMonthStart, selectedMonthEnd]);
```

---

## 🔨 CORREÇÃO 4: AnalysisView.tsx

### Localização
**Arquivo:** `components/AnalysisView.tsx`

### Mudança 1: Adicionar import (linha 17)
```typescript
import { filterTransactionsByPermissions } from '../services/permissionsService';
```

### Mudança 2: Adicionar filtro (após linha 52)
```typescript
// 🔒 APLICAR PERMISSÕES: Filtrar transações recebidas por permissões do usuário
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 AnalysisView: Aplicando permissões RLS nas transações...');
  const filtered = filterTransactionsByPermissions(transactions);
  console.log(`🔒 AnalysisView: ${transactions.length} → ${filtered.length} transações após RLS`);
  return filtered;
}, [transactions]);
```

### Mudança 3: Trocar referências

**BUSCAR E SUBSTITUIR no arquivo AnalysisView.tsx:**

❌ **Trocar:** `transactions.map(`
✅ **Por:** `permissionFilteredTransactions.map(`

❌ **Trocar:** `transactions.filter(`
✅ **Por:** `permissionFilteredTransactions.filter(`

**Exemplos:**

```typescript
// ANTES - linha 56
const uniqueBrands = useMemo(() => {
  const brands = new Set(transactions.map(t => t.marca).filter(Boolean));
  return Array.from(brands).sort();
}, [transactions]);

// DEPOIS
const uniqueBrands = useMemo(() => {
  const brands = new Set(permissionFilteredTransactions.map(t => t.marca).filter(Boolean));
  return Array.from(brands).sort();
}, [permissionFilteredTransactions]);
```

**E passar transações filtradas para componentes filhos:**

```typescript
// ANTES - linha 502
<AIFinancialView
  transactions={transactions}
  kpis={kpis}
/>

// DEPOIS
<AIFinancialView
  transactions={permissionFilteredTransactions}
  kpis={kpis}
/>
```

---

## 🔨 CORREÇÃO 5: ForecastingView.tsx

### Localização
**Arquivo:** `components/ForecastingView.tsx`

### Mudança 1: Adicionar import (linha 4)
```typescript
import { filterTransactionsByPermissions } from '../services/permissionsService';
```

### Mudança 2: Adicionar filtro (após linha 27)
```typescript
// 🔒 APLICAR PERMISSÕES: Filtrar transações recebidas por permissões do usuário
const permissionFilteredTransactions = useMemo(() => {
  console.log('🔒 ForecastingView: Aplicando permissões RLS nas transações...');
  const filtered = filterTransactionsByPermissions(transactions);
  console.log(`🔒 ForecastingView: ${transactions.length} → ${filtered.length} transações após RLS`);
  return filtered;
}, [transactions]);
```

### Mudança 3: Trocar referências

**BUSCAR E SUBSTITUIR no arquivo ForecastingView.tsx:**

❌ **Trocar:** `transactions\n      .filter(`
✅ **Por:** `permissionFilteredTransactions\n      .filter(`

❌ **Trocar:** `transactions.filter(`
✅ **Por:** `permissionFilteredTransactions.filter(`

**Exemplo - linha 40 (historicalData):**
```typescript
// ANTES
transactions
  .filter(t => t.scenario === 'Real')
  .forEach(t => {
    // ...
  });

// DEPOIS
permissionFilteredTransactions
  .filter(t => t.scenario === 'Real')
  .forEach(t => {
    // ...
  });
```

---

## ✅ TESTE DE VALIDAÇÃO PÓS-CORREÇÃO

### Setup
1. Criar usuário de teste no Supabase:
   - Email: `teste.tag01@raizeducacao.com.br`
   - Criar entrada na tabela `users`

2. Criar permissão para o usuário:
   ```sql
   -- Obter ID do usuário
   SELECT id FROM users WHERE email = 'teste.tag01@raizeducacao.com.br';

   -- Criar permissão (substituir USER_ID pelo ID obtido acima)
   INSERT INTO user_permissions (user_id, permission_type, permission_value)
   VALUES ('USER_ID', 'tag01', 'Marketing');
   ```

### Teste Passo a Passo

1. **Login**
   - Fazer login com `teste.tag01@raizeducacao.com.br`
   - Verificar console: `🔐 Permissões definidas globalmente`
   - Verificar: `allowedTag01: ["Marketing"]`

2. **Dashboard**
   - Navegar para Dashboard
   - Verificar console:
     ```
     🔒 Dashboard: Aplicando permissões RLS nas transações...
     🔒 Dashboard: 10000 → 2500 transações após RLS
     ```
   - ✅ Verificar que gráficos mostram SOMENTE dados de "Marketing"

3. **KPIs**
   - Navegar para KPIs
   - Verificar console similar
   - ✅ Verificar que KPIs calculados consideram SOMENTE "Marketing"

4. **Análise**
   - Navegar para Análise
   - Verificar console similar
   - ✅ Verificar que análises consideram SOMENTE "Marketing"

5. **Forecasting**
   - Navegar para Forecasting
   - Verificar console similar
   - ✅ Verificar que previsões consideram SOMENTE "Marketing"

6. **DRE Gerencial**
   - Navegar para DRE Gerencial
   - ✅ Já funciona (não precisa testar)

7. **Lançamentos**
   - Navegar para Lançamentos
   - ✅ Já funciona (não precisa testar)

### Validação de Segurança

**Teste com F12 (DevTools):**

1. Abrir Console
2. Executar: `localStorage.clear(); sessionStorage.clear();`
3. Recarregar página
4. Fazer login novamente
5. ✅ Verificar que permissões são reaplicadas

**Teste de troca de mês:**

1. No Dashboard, trocar período (Ex: Janeiro → Fevereiro)
2. ✅ Verificar console: Filtragem continua aplicada
3. ✅ Verificar que apenas transações permitidas aparecem

---

## 📊 RESUMO DAS MUDANÇAS

| Arquivo | Linhas Alteradas | Complexidade | Risco |
|---------|------------------|--------------|-------|
| App.tsx | +15 linhas | ⭐ Baixa | 🟢 Baixo |
| Dashboard.tsx | +6 linhas + substituições | ⭐⭐ Média | 🟡 Médio |
| KPIsView.tsx | +6 linhas + substituições | ⭐⭐ Média | 🟡 Médio |
| AnalysisView.tsx | +6 linhas + substituições | ⭐⭐ Média | 🟡 Médio |
| ForecastingView.tsx | +6 linhas + substituições | ⭐⭐ Média | 🟡 Médio |

**Total:** ~45 linhas adicionadas, ~20 substituições

---

## 🚀 ORDEM DE EXECUÇÃO

1. ✅ **App.tsx** (mais importante - aplica filtro na origem)
2. ✅ **Dashboard.tsx** (guia principal)
3. ✅ **KPIsView.tsx** (guia de indicadores)
4. ✅ **ForecastingView.tsx** (guia de previsões)
5. ✅ **AnalysisView.tsx** (guia de análises)

**Tempo estimado por arquivo:** 5-8 minutos
**Tempo total:** 30-45 minutos

---

## 🎯 CRITÉRIO DE SUCESSO

✅ Usuário com permissão de tag01="Marketing" vê SOMENTE transações de Marketing
✅ Todas as 6 guias principais respeitam permissões
✅ Logs do console mostram filtragem aplicada
✅ Trocar período/filtros mantém permissões aplicadas
✅ Performance não é afetada (useMemo evita re-cálculos)

---

**FIM DO PLANO DE CORREÇÃO**

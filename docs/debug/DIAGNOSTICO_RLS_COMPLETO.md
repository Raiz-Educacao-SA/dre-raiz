# 🔒 DIAGNÓSTICO COMPLETO: PROBLEMA RLS (Row Level Security)

**Data:** 11/02/2026
**Status:** CRÍTICO - Permissões de TAG01/TAG02/TAG03 NÃO estão sendo aplicadas

---

## 🎯 PROBLEMA IDENTIFICADO

### Sintomas Reportados pelo Usuário
1. ✅ CIA (marca) funcionando corretamente → OK em DRE Gerencial e Lançamentos
2. ❌ TAG01 NÃO está travando → Deixando passar tudo
3. ❌ Outras guias (Dashboard, KPIs, Analysis, Forecasting) NÃO respeitam permissões

### Causa Raiz
**DUPLO PROBLEMA:**

#### Problema 1: Carregamento Inicial Incompleto (App.tsx)
**Arquivo:** `App.tsx` linhas 104-127

```typescript
// ⚠️ APENAS marca, filial e category são aplicadas
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;  // ✅ APLICADO
}
if (allowedFiliais.length > 0) {
  filters.filial = allowedFiliais;  // ✅ APLICADO
}
if (allowedCategories.length > 0) {
  filters.category = allowedCategories;  // ✅ APLICADO
}

// ❌ FALTANDO: tag01, tag02, tag03 NÃO são aplicados!
```

#### Problema 2: Componentes Não Filtram os Dados
**Arquivos afetados:**
- `components/Dashboard.tsx` (linha 24)
- `components/KPIsView.tsx` (linha 24)
- `components/AnalysisView.tsx` (linha 32)
- `components/ForecastingView.tsx` (linha 16)

**Comportamento atual:**
```typescript
// ❌ Recebem transactions via props SEM aplicar filtro adicional
const Dashboard: React.FC<DashboardProps> = ({ transactions, ... }) => {
  // Usa transactions diretamente, sem filtrar por permissões
  const filteredByMonth = useMemo(() => {
    return transactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return month >= selectedMonthStart && month <= selectedMonthEnd;
    });
  }, [transactions, selectedMonthStart, selectedMonthEnd]);
}
```

---

## ✅ O QUE ESTÁ FUNCIONANDO

### 1. Sistema de Permissões (permissionsService.ts)
- ✅ Função `applyPermissionFilters()` funciona
- ✅ Função `addPermissionFiltersToObject()` funciona
- ✅ Função `filterTransactionsByPermissions()` funciona
- ✅ Permissões carregadas no login (AuthContext.tsx linha 85)

### 2. Queries no Servidor (supabaseService.ts)
- ✅ Função `applyTransactionFilters()` linha 519 aplica permissões automaticamente:
  ```typescript
  filters = addPermissionFiltersToObject(filters);
  ```
- ✅ TODAS as queries passam por essa função

### 3. Componentes que Funcionam
- ✅ **DREView.tsx**: Usa RPC direto no servidor com filtros
- ✅ **TransactionsView.tsx**: Tem busca própria com filtros aplicados

---

## ❌ FLUXO DO PROBLEMA

### Cenário: Usuário com permissão APENAS tag01 = ["Marketing"]

1. **Login** → AuthContext carrega permissões:
   ```
   allowedTag01: ["Marketing"]
   allowedMarcas: []
   allowedFiliais: []
   ```

2. **Carregamento Inicial (App.tsx linha 104)**:
   ```typescript
   const filters = {
     monthFrom: "2026-01",
     monthTo: "2026-01",
     // ❌ tag01 NÃO é adicionado aqui!
   };
   ```

3. **Query no Servidor (supabaseService.ts linha 519)**:
   ```typescript
   filters = addPermissionFiltersToObject(filters);
   // Resultado:
   // {
   //   monthFrom: "2026-01",
   //   monthTo: "2026-01",
   //   tag01: ["Marketing"]  // ✅ Adicionado pela função!
   // }
   ```
   **✅ Query retorna SOMENTE transações de tag01="Marketing"**

4. **Problema: Filtro no Cliente**
   - TransactionsContext salva essas transações filtradas
   - Componentes recebem essas transações VIA PROPS
   - ❌ **MAS:** Se o usuário trocar de mês no Dashboard, o filtro é perdido!
   - ❌ **E:** Quando o Dashboard faz seus próprios cálculos, não reaplica o filtro de tag01

---

## 🔧 SOLUÇÃO DETALHADA

### Correção 1: App.tsx - Adicionar tags nos filtros iniciais

**Arquivo:** `App.tsx` linha 104

```typescript
// ANTES (incompleto):
const filters: any = {
  monthFrom: `${year}-${String(month).padStart(2, '0')}`,
  monthTo: `${year}-${String(month).padStart(2, '0')}`
};

if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;
}
if (allowedFiliais.length > 0) {
  filters.filial = allowedFiliais;
}
if (allowedCategories.length > 0) {
  filters.category = allowedCategories;
}

// DEPOIS (completo):
const filters: any = {
  monthFrom: `${year}-${String(month).padStart(2, '0')}`,
  monthTo: `${year}-${String(month).padStart(2, '0')}`
};

// ✅ APLICAR TODAS AS PERMISSÕES
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;
}
if (allowedFiliais.length > 0) {
  filters.filial = allowedFiliais;
}
if (allowedCategories.length > 0) {
  filters.category = allowedCategories;
}
// 🔥 ADICIONAR TAGS (FALTAVA!)
if (allowedTag01.length > 0) {
  filters.tag01 = allowedTag01;
}
if (allowedTag02.length > 0) {
  filters.tag02 = allowedTag02;
}
if (allowedTag03.length > 0) {
  filters.tag03 = allowedTag03;
}
```

### Correção 2: Componentes - Filtrar dados recebidos

**Opção A: Usar filterTransactionsByPermissions no useMemo**

Para cada componente (Dashboard, KPIs, Analysis, Forecasting):

```typescript
import { filterTransactionsByPermissions } from '../services/permissionsService';

// No início do componente, filtrar as transactions recebidas
const filteredTransactions = useMemo(() => {
  return filterTransactionsByPermissions(transactions);
}, [transactions]);

// Depois usar filteredTransactions em vez de transactions
const filteredByMonth = useMemo(() => {
  return filteredTransactions.filter(t => {
    const month = parseInt(t.date.substring(5, 7), 10) - 1;
    return month >= selectedMonthStart && month <= selectedMonthEnd;
  });
}, [filteredTransactions, selectedMonthStart, selectedMonthEnd]);
```

**Opção B: Passar `filterTransactions` via props**

Já está disponível em `usePermissions`, mas os componentes não estão usando:

```typescript
// Dashboard.tsx linha 9 (props)
interface DashboardProps {
  transactions: Transaction[];
  filterTransactions: (transactions: Transaction[]) => Transaction[];  // ✅ Adicionar
  // ...
}

// No componente:
const filteredTransactions = useMemo(() => {
  return filterTransactions(transactions);
}, [transactions, filterTransactions]);
```

---

## 📋 CHECKLIST DE CORREÇÃO

### 1. App.tsx
- [ ] Adicionar `allowedTag01` aos filtros iniciais (linha 120)
- [ ] Adicionar `allowedTag02` aos filtros iniciais (linha 122)
- [ ] Adicionar `allowedTag03` aos filtros iniciais (linha 124)
- [ ] Passar `filterTransactions` do hook como prop para os componentes

### 2. Dashboard.tsx
- [ ] Importar `filterTransactionsByPermissions` ou receber `filterTransactions` via props
- [ ] Adicionar `useMemo` para filtrar transactions no início
- [ ] Usar `filteredTransactions` em todos os cálculos

### 3. KPIsView.tsx
- [ ] Importar `filterTransactionsByPermissions` ou receber `filterTransactions` via props
- [ ] Adicionar `useMemo` para filtrar transactions no início
- [ ] Usar `filteredTransactions` em todos os cálculos

### 4. AnalysisView.tsx
- [ ] Importar `filterTransactionsByPermissions` ou receber `filterTransactions` via props
- [ ] Adicionar `useMemo` para filtrar transactions no início
- [ ] Passar `filteredTransactions` para os componentes internos

### 5. ForecastingView.tsx
- [ ] Importar `filterTransactionsByPermissions` ou receber `filterTransactions` via props
- [ ] Adicionar `useMemo` para filtrar transactions no início
- [ ] Usar `filteredTransactions` em todos os cálculos

---

## 🧪 TESTE DE VALIDAÇÃO

### Setup do Teste
1. Criar usuário de teste: `serafim.teste@raizeducacao.com.br`
2. Configurar permissão: **APENAS tag01 = "Marketing"**
3. Banco deve ter transações com:
   - tag01 = "Marketing" (deve aparecer)
   - tag01 = "Vendas" (NÃO deve aparecer)
   - tag01 = "Operações" (NÃO deve aparecer)

### Teste Passo a Passo
1. ✅ Login com usuário teste
2. ✅ Ir para **Dashboard** → Verificar que SÓ aparecem transações de "Marketing"
3. ✅ Ir para **KPIs** → Verificar que SÓ aparecem transações de "Marketing"
4. ✅ Ir para **Análise** → Verificar que SÓ aparecem transações de "Marketing"
5. ✅ Ir para **Forecasting** → Verificar que SÓ aparecem transações de "Marketing"
6. ✅ Ir para **DRE Gerencial** → Verificar que SÓ aparecem transações de "Marketing"
7. ✅ Ir para **Lançamentos** → Verificar que SÓ aparecem transações de "Marketing"
8. ✅ Trocar filtro de mês → Verificar que permissão continua aplicada

### Validação de Logs
Verificar no console do navegador:
```
🔐 Permissões definidas globalmente: {
  allowedTag01: ["Marketing"],
  ...
}
🔒 Filtrando array de transações por permissões...
🔒 Filtragem concluída: 10000 → 2500 registros
```

---

## 📊 IMPACTO DA CORREÇÃO

### Antes
- ❌ Usuários com permissão de tag01 viam TODAS as transações
- ❌ Dashboard mostrava dados de TODAS as tags
- ❌ KPIs mostrava dados de TODAS as tags
- ❌ Segurança comprometida

### Depois
- ✅ Usuários veem SOMENTE transações permitidas
- ✅ Dashboard respeita permissões em todos os cálculos
- ✅ KPIs respeita permissões em todos os cálculos
- ✅ Segurança garantida em TODAS as guias

---

## 🚀 PRIORIDADE

**CRÍTICA - RESOLVER IMEDIATAMENTE**

- Segurança de dados comprometida
- Usuários vendo informações confidenciais
- Sistema de permissões ineficaz em 4 de 6 guias principais

---

## 📝 OBSERVAÇÕES ADICIONAIS

### Por que DRE e Lançamentos funcionam?

1. **DREView.tsx**: Usa RPC direto (`get_dre_summary`) que aplica filtros no servidor
2. **TransactionsView.tsx**: Tem busca própria via `getFilteredTransactions` que passa por `applyTransactionFilters`

### Por que Dashboard/KPIs/Analysis/Forecasting NÃO funcionam?

- Recebem transações do Context via props
- Não reaplicam filtro de permissões nos dados recebidos
- Assumem que os dados já vieram filtrados (o que é verdade para marca/filial, mas não para tag01/02/03)

---

**FIM DO DIAGNÓSTICO**

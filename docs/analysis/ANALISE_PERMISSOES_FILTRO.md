# Análise do Sistema de Permissões - Filtro de Marca não Funcional

**Data:** 11/02/2026
**Status:** 🔴 PROBLEMA IDENTIFICADO

---

## 1. Problema Raiz Identificado

O filtro de marca **NÃO está sendo aplicado automaticamente** quando o usuário tem permissões restritas por marca. Embora o sistema de permissões esteja funcionando corretamente e identificando as marcas permitidas (`allowedMarcas`), esses valores **não estão sendo passados** para a busca inicial de transações no `TransactionsContext`.

---

## 2. Fluxo Atual (com Falha)

### 2.1. App.tsx - Carregamento Inicial (Linhas 86-106)

```typescript
// ⚡ OTIMIZAÇÃO: Carregar apenas JANEIRO 2026 (menos dados, mais rápido)
const year = 2026;
const month = 1; // Janeiro

// Aplicar filtro de marca se usuário tiver permissões restritas
const filters: any = {
  monthFrom: `${year}-${String(month).padStart(2, '0')}`,
  monthTo: `${year}-${String(month).padStart(2, '0')}`
};

// Se tem permissão de marca específica, filtrar no servidor
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;  // ✅ MARCA ADICIONADA AOS FILTROS
}

applyFilters(filters);  // ❌ MAS A FUNÇÃO applyFilters NÃO USA MARCA
```

**PROBLEMA:** O código adiciona `marca` aos filtros, mas a função `applyFilters` no `TransactionsContext` **ignora esse campo**.

---

### 2.2. TransactionsContext.tsx - Função applyFilters (Linhas 89-112)

```typescript
const applyFilters = useCallback(async (filters: TransactionFilters) => {
  setIsLoading(true);
  setError(null);
  setCurrentFilters(filters);

  try {
    console.log('🔍 TransactionsContext: Aplicando filtros', filters);
    const response = await supabaseService.getFilteredTransactions(filters);
    // ❌ O filtro de 'marca' está no objeto filters, MAS...

    const results = response.data || [];
    console.log(`✅ TransactionsContext: ${results.length} transações carregadas`);

    setTransactions(results);
    setServerTransactions([...results]);
  } catch (err) {
    // ...
  }
}, []);
```

**ANÁLISE:**
- ✅ A função recebe os filtros corretamente (incluindo `marca`)
- ✅ Passa os filtros para `supabaseService.getFilteredTransactions(filters)`
- ✅ A função do Supabase **suporta** o filtro de marca

---

### 2.3. supabaseService.ts - applyTransactionFilters (Linhas 512-581)

```typescript
const applyTransactionFilters = (query: any, filters: TransactionFilters) => {
  // Filtros de data (período)
  if (filters.monthFrom) {
    const startDate = `${filters.monthFrom}-01`;
    query = query.gte('date', startDate);
  }

  if (filters.monthTo) {
    const [year, month] = filters.monthTo.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${filters.monthTo}-${lastDay}`;
    query = query.lte('date', endDate);
  }

  // Filtros de array (marca, filial, tags, category, etc)
  if (filters.marca && filters.marca.length > 0) {
    query = query.in('marca', filters.marca);  // ✅ MARCA É FILTRADA
  }
  // ...
}
```

**CONCLUSÃO:**
- ✅ O Supabase **ACEITA** e **APLICA** o filtro de marca corretamente
- ✅ A query SQL é gerada com `.in('marca', filters.marca)`

---

## 3. Onde o Código Está Falhando?

### 3.1. Problema de Timing

O código em `App.tsx` (linhas 100-102) adiciona `marca` aos filtros:

```typescript
if (allowedMarcas.length > 0) {
  filters.marca = allowedMarcas;
}
```

**MAS** há um problema de timing:
- `allowedMarcas` vem do hook `usePermissions()`
- `usePermissions()` tem estado `loading: permissionsLoading`
- O `useEffect` verifica `permissionsLoading` antes de buscar:

```typescript
useEffect(() => {
  if (!currentFilters && !initialLoadRef.current && !permissionsLoading) {
    // Buscar transações...
    if (allowedMarcas.length > 0) {
      filters.marca = allowedMarcas;
    }
  }
}, [applyFilters, currentFilters, permissionsLoading, allowedMarcas]);
```

**RACE CONDITION IDENTIFICADA:**
1. Componente monta
2. `permissionsLoading = true` (carregando permissões)
3. `useEffect` **NÃO executa** porque `permissionsLoading === true`
4. Permissões carregam: `permissionsLoading = false`, `allowedMarcas = ['CLV']`
5. `useEffect` executa **NOVAMENTE**
6. `allowedMarcas` agora tem valor, mas `currentFilters` **JÁ FOI DEFINIDO** na primeira execução
7. A condição `!currentFilters` falha e a busca **NÃO É REFEITA**

---

### 3.2. usePermissions Hook - Linhas 84-96

```typescript
// Extrair valores permitidos
const allowedMarcas = permissions
  .filter(p => p.permission_type === 'cia')
  .map(p => p.permission_value);

const allowedFiliais = permissions
  .filter(p => p.permission_type === 'filial')
  .map(p => p.permission_value);

const allowedCentroCusto = permissions
  .filter(p => p.permission_type === 'centro_custo')
  .map(p => p.permission_value);
```

✅ As permissões são extraídas corretamente.

---

## 4. Evidências do Problema

### 4.1. Console Logs Esperados vs. Reais

**Esperado (com marca filtrada):**
```
🔍 TransactionsContext: Aplicando filtros {
  monthFrom: '2026-01',
  monthTo: '2026-01',
  marca: ['CLV']  // ✅ Marca aplicada
}
```

**Real (marca não filtrada):**
```
🔍 TransactionsContext: Aplicando filtros {
  monthFrom: '2026-01',
  monthTo: '2026-01'
  // ❌ Marca ausente
}
```

---

## 5. Solução Específica

### 5.1. Opção A - Adicionar allowedMarcas às dependências do useEffect

**Arquivo:** `App.tsx` (linhas 86-106)

```typescript
// Carregar transações iniciais ao montar (via Context)
const initialLoadRef = React.useRef(false);
useEffect(() => {
  // ✅ CORREÇÃO: Remover verificação de currentFilters para permitir re-execução
  if (!initialLoadRef.current && !permissionsLoading) {
    initialLoadRef.current = true;

    const year = 2026;
    const month = 1;

    const filters: any = {
      monthFrom: `${year}-${String(month).padStart(2, '0')}`,
      monthTo: `${year}-${String(month).padStart(2, '0')}`
    };

    // ✅ Filtrar por marca se usuário tiver permissões restritas
    if (allowedMarcas.length > 0) {
      filters.marca = allowedMarcas;
      console.log('🔒 Aplicando filtro de marca por permissão:', allowedMarcas);
    }

    // ✅ Filtrar por filial se usuário tiver permissões restritas
    if (allowedFiliais.length > 0) {
      filters.filial = allowedFiliais;
      console.log('🔒 Aplicando filtro de filial por permissão:', allowedFiliais);
    }

    // ✅ Filtrar por categoria (centro de custo) se usuário tiver permissões restritas
    if (allowedCategories.length > 0) {
      filters.category = allowedCategories;
      console.log('🔒 Aplicando filtro de categoria por permissão:', allowedCategories);
    }

    applyFilters(filters);
  }
}, [applyFilters, permissionsLoading, allowedMarcas, allowedFiliais, allowedCategories]);
// ☝️ Adicionar allowedMarcas, allowedFiliais e allowedCategories às dependências
```

**Problema com essa solução:**
- O `useEffect` vai executar **múltiplas vezes** enquanto as permissões carregam
- Pode causar múltiplas chamadas à API

---

### 5.2. Opção B - Usar useEffect separado para monitorar permissões (RECOMENDADO)

**Arquivo:** `App.tsx`

```typescript
// useEffect original - carregamento inicial SEM filtros de permissão
const initialLoadRef = React.useRef(false);
useEffect(() => {
  if (!currentFilters && !initialLoadRef.current && !permissionsLoading) {
    initialLoadRef.current = true;

    const year = 2026;
    const month = 1;

    const filters: any = {
      monthFrom: `${year}-${String(month).padStart(2, '0')}`,
      monthTo: `${year}-${String(month).padStart(2, '0')}`
    };

    // NÃO adicionar marca/filial aqui - deixar para o useEffect de permissões
    applyFilters(filters);
  }
}, [applyFilters, currentFilters, permissionsLoading]);

// ✅ NOVO useEffect - Aplicar filtros de permissão quando carregarem
const permissionsAppliedRef = React.useRef(false);
useEffect(() => {
  // Só executar se:
  // 1. Permissões terminaram de carregar
  // 2. Usuário tem permissões restritas
  // 3. Já existe uma busca inicial (currentFilters definido)
  // 4. Ainda não aplicamos as permissões
  if (
    !permissionsLoading &&
    hasPermissions &&
    currentFilters &&
    !permissionsAppliedRef.current
  ) {
    permissionsAppliedRef.current = true;

    console.log('🔒 Aplicando filtros de permissão:', {
      allowedMarcas,
      allowedFiliais,
      allowedCategories
    });

    // Re-aplicar filtros com permissões
    const updatedFilters = { ...currentFilters };

    if (allowedMarcas.length > 0) {
      updatedFilters.marca = allowedMarcas;
    }

    if (allowedFiliais.length > 0) {
      updatedFilters.filial = allowedFiliais;
    }

    if (allowedCategories.length > 0) {
      updatedFilters.category = allowedCategories;
    }

    applyFilters(updatedFilters);
  }
}, [
  permissionsLoading,
  hasPermissions,
  allowedMarcas,
  allowedFiliais,
  allowedCategories,
  currentFilters,
  applyFilters
]);
```

---

### 5.3. Opção C - Filtro Client-Side (Temporária, não recomendada)

**Arquivo:** `App.tsx` (linha 540-551)

```typescript
const filteredTransactions = useMemo(() => {
  // ✅ Aplicar filtros de permissão no cliente (temporário)
  let result = transactions;

  // Filtrar por marca se usuário tiver permissões restritas
  if (allowedMarcas.length > 0) {
    result = result.filter(t =>
      t.marca && allowedMarcas.includes(t.marca)
    );
  }

  // Filtrar por filial se usuário tiver permissões restritas
  if (allowedFiliais.length > 0) {
    result = result.filter(t =>
      t.filial && allowedFiliais.includes(t.filial)
    );
  }

  // Filtrar por categoria (centro de custo)
  if (allowedCategories.length > 0) {
    result = result.filter(t =>
      t.category && allowedCategories.includes(t.category)
    );
  }

  // Aplicar filtros de marca/filial selecionados na UI
  if (currentView === 'movements' || currentView === 'dre') {
    return result;
  }

  return result.filter(t => {
    const matchesMarca = selectedMarca.length === 0 ||
                         selectedMarca.includes(t.marca || '');
    const matchesFilial = selectedFilial.length === 0 ||
                          selectedFilial.includes(t.filial || '');
    return matchesMarca && matchesFilial;
  });
}, [
  transactions,
  allowedMarcas,
  allowedFiliais,
  allowedCategories,
  selectedMarca,
  selectedFilial,
  currentView
]);
```

**Problema:**
- Ainda carrega **TODOS** os dados do servidor
- Filtragem é feita no cliente
- Ineficiente para grandes volumes
- **NÃO resolve** o problema real (server-side)

---

## 6. Verificação da Solução

### 6.1. Teste Manual

1. Criar um usuário com permissão de marca específica (ex: `CLV`)
2. Fazer login com esse usuário
3. Verificar console:
   ```
   🔒 Aplicando filtro de marca por permissão: ['CLV']
   🔍 TransactionsContext: Aplicando filtros { monthFrom: '2026-01', monthTo: '2026-01', marca: ['CLV'] }
   📊 Total de registros filtrados: 5000  // Apenas CLV
   ```
4. Verificar que APENAS transações da marca `CLV` são carregadas

### 6.2. Teste de Permissões

```sql
-- Verificar permissões do usuário no banco
SELECT * FROM user_permissions WHERE user_id = '<user_id>';

-- Verificar transações por marca
SELECT marca, COUNT(*)
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-01-31'
GROUP BY marca;
```

---

## 7. Recomendação Final

✅ **Implementar Opção B** - useEffect separado para monitorar permissões

**Vantagens:**
- Separa responsabilidades (carregamento inicial vs. aplicação de permissões)
- Evita múltiplas chamadas à API
- Código mais legível e manutenível
- Suporta mudanças futuras no sistema de permissões

**Desvantagens:**
- Adiciona complexidade (2 useEffects em vez de 1)
- Requer ref adicional para controlar execução única

---

## 8. Arquivos a Modificar

| Arquivo | Modificação | Prioridade |
|---------|-------------|-----------|
| `App.tsx` | Adicionar useEffect de permissões (Opção B) | 🔴 Alta |
| `src/contexts/TransactionsContext.tsx` | ✅ Nenhuma (já funciona) | - |
| `services/supabaseService.ts` | ✅ Nenhuma (já funciona) | - |
| `hooks/usePermissions.ts` | ✅ Nenhuma (já funciona) | - |

---

## 9. Sumário Executivo

### Problema
O filtro de marca não é aplicado quando usuário tem permissões restritas, causando carregamento de **TODAS** as transações em vez de apenas as permitidas.

### Causa Raiz
**Race condition** no carregamento inicial: a busca de transações executa ANTES das permissões serem carregadas, e não há re-execução após as permissões estarem disponíveis.

### Impacto
- ⚠️ **Segurança:** Usuários com acesso restrito veem dados que não deveriam
- ⚠️ **Performance:** Carrega mais dados do que necessário do servidor
- ⚠️ **UX:** Indicador de "Acesso Restrito" aparece, mas dados não são filtrados

### Solução
Adicionar `useEffect` separado que monitora `permissionsLoading` e re-aplica filtros com `allowedMarcas`, `allowedFiliais` e `allowedCategories` assim que as permissões carregam.

### Esforço Estimado
- 🕐 **Desenvolvimento:** 30 minutos
- 🕐 **Testes:** 15 minutos
- 🕐 **Total:** 45 minutos

---

**Gerado por:** Claude Sonnet 4.5
**Versão do Sistema:** DRE RAIZ v6 (com Realtime e Paginação)

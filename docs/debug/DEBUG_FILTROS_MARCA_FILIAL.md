# 🐛 DEBUG - Filtros de Marca e Filial Vazios

## Problema
- Filtros de Marca e Filial aparecem no app
- Ao selecionar Marca, o dropdown de Filial não mostra opções
- Dados no banco estão corretos (SQL confirmado)
- Problema está no fluxo de dados do frontend

---

## 🔍 Logs Adicionados para Debug

### 1. `supabaseService.ts` - Função `getMarcasEFiliais`
✅ Logs adicionados para rastrear:
- Quantas linhas a query retornou
- Se há erros
- Quantas filiais únicas foram encontradas
- Primeiras 5 marcas e filiais

### 2. `DREViewV2.tsx` - Quando dados são recebidos
✅ Logs adicionados para rastrear:
- Dados recebidos de `getMarcasEFiliais()`
- Estados ANTES de serem atualizados
- Estados DEPOIS de serem atualizados (timeout de 1s)

### 3. `DREViewV2.tsx` - useMemo `availableBrands` e `availableBranches`
✅ Logs adicionados para rastrear:
- Conteúdo dos estados `marcasDisponiveis` e `filiaisDisponiveis`
- Tipo e tamanho dos arrays
- Lógica de filtro em cascata

---

## 🧪 Como Testar

### Passo 1: Abrir Console do Browser
1. Pressione `F12` (Chrome/Edge) ou `Cmd+Option+I` (Mac)
2. Clique na aba **Console**
3. Limpar console: clicar no ícone 🚫 ou `Ctrl+L`

### Passo 2: Recarregar a Página
1. Pressione `Ctrl+R` ou `F5`
2. Aguardar carregar completamente

### Passo 3: Buscar Logs Específicos
No console, procurar por:

#### 🏢 Logs da API (getMarcasEFiliais)
```
🏢 [getMarcasEFiliais] INÍCIO - Buscando Marcas e Filiais...
🏢 [getMarcasEFiliais] Query retornou: {dataLength: 119000, ...}
🏢 [getMarcasEFiliais] Processando 119000 linhas...
🏢 [getMarcasEFiliais] Após deduplicação: XX filiais únicas
✅ [getMarcasEFiliais] RETORNANDO: {marcas: [...], marcasLength: X, ...}
```

**O QUE VERIFICAR:**
- [ ] `dataLength` > 0? (deve ter ~119k linhas)
- [ ] `marcasLength` > 0? (deve ter 4-5 marcas: GT, QI, NE, BS)
- [ ] `filiaisLength` > 0? (deve ter várias filiais)
- [ ] `primeirasMarcas` mostra marcas? (ex: ['BS', 'GT', 'NE', 'QI'])
- [ ] `primeirasFiliais` mostra filiais? (ex: [{marca: 'GT', label: 'GT - Alfa'}, ...])

#### 🚨 Logs do Componente (setStates)
```
🚨 [ANTES DE SET] marcasEFiliais: {marcas: [...], filiais: [...]}
🚨 [ANTES DE SET] marcasEFiliais.marcas.length: X
🚨 [ANTES DE SET] marcasEFiliais.filiais.length: Y
🚨 [DEPOIS DE SET] Estados atualizados!
```

**O QUE VERIFICAR:**
- [ ] `marcasEFiliais.marcas` é um array com itens?
- [ ] `marcasEFiliais.filiais` é um array com itens?
- [ ] Aparecem os logs "ANTES" e "DEPOIS" de SET?

#### 🚨 Logs do Timeout (1s depois)
```
🚨 [TIMEOUT] Verificando estados após 1 segundo...
🚨 [TIMEOUT] marcasDisponiveis deve ter: X
🚨 [TIMEOUT] filiaisDisponiveis deve ter: Y
```

#### 🏷️ Logs do useMemo (availableBrands)
```
🏷️ [DEBUG MARCAS] marcasDisponiveis: ['GT', 'QI', ...]
🏷️ [DEBUG MARCAS] length: 4
🏷️ [DEBUG MARCAS] tipo: object true
```

**O QUE VERIFICAR:**
- [ ] `marcasDisponiveis` é um array com marcas?
- [ ] `length` > 0?
- [ ] `Array.isArray` retorna `true`?

#### 🏢 Logs do useMemo (availableBranches)
```
🏢 [DEBUG FILIAIS] filiaisDisponiveis: [{marca: 'GT', label: 'GT - Alfa'}, ...]
🏢 [DEBUG FILIAIS] length: 50
🏢 [DEBUG FILIAIS] selectedMarcas: []
🏢 [DEBUG FILIAIS] tipo: object true
🏢 [DEBUG FILIAIS] TODAS as filiais: 50
🏢 [DEBUG FILIAIS] Primeiras 10: ['BS - ...', 'GT - Alfa', ...]
```

**O QUE VERIFICAR:**
- [ ] `filiaisDisponiveis` é um array com objetos?
- [ ] `length` > 0?
- [ ] `Array.isArray` retorna `true`?
- [ ] "Primeiras 10" mostra filiais?

### Passo 4: Testar Seleção de Marca
1. Clicar no dropdown **Marca**
2. Selecionar uma marca (ex: GT)
3. Verificar novos logs no console

**LOGS ESPERADOS:**
```
🎯 [MARCA CLICK] Marca clicada: GT
🎯 [MARCA CLICK] selectedMarcas ANTES: []
🎯 [MARCA CLICK] Limpando selectedFiliais
🏢 [DEBUG FILIAIS] selectedMarcas: ['GT']
🏢 [DEBUG FILIAIS] Filiais FILTRADAS por marca: ['GT'] → X filiais
🏢 [DEBUG FILIAIS] Primeiras 10 filtradas: ['GT - Alfa', 'GT - Bosque', ...]
```

**O QUE VERIFICAR:**
- [ ] `selectedMarcas` muda de `[]` para `['GT']`?
- [ ] Aparece log "Filiais FILTRADAS por marca"?
- [ ] "Primeiras 10 filtradas" mostra apenas filiais da GT?

### Passo 5: Tentar Abrir Dropdown de Filial
1. Após selecionar Marca, clicar no dropdown **Filial**
2. Verificar se aparecem opções

**SE ESTIVER VAZIO:**
- Copiar TODOS os logs do console
- Enviar para análise

---

## 📋 Checklist de Diagnóstico

### Cenário 1: getMarcasEFiliais retorna vazio
**Sintomas:**
- `dataLength: 0` ou `undefined`
- `marcasLength: 0`
- `filiaisLength: 0`

**Causa:**
- Query não está retornando dados
- Possível problema de permissões RLS no Supabase

**Solução:**
- Verificar RLS (Row Level Security) na tabela transactions
- Verificar se usuário tem permissão de SELECT

### Cenário 2: getMarcasEFiliais retorna dados, mas estados ficam vazios
**Sintomas:**
- `[getMarcasEFiliais] RETORNANDO` mostra dados
- `[ANTES DE SET]` mostra dados
- `[DEBUG MARCAS] marcasDisponiveis: []` (vazio)

**Causa:**
- Estados não estão sendo atualizados corretamente
- Race condition no useEffect

**Solução:**
- Verificar se há múltiplos renders
- Verificar se fetchIdRef está cancelando a atualização

### Cenário 3: Estados têm dados, mas availableBranches retorna vazio
**Sintomas:**
- `[DEBUG MARCAS]` mostra marcas corretamente
- `[DEBUG FILIAIS] filiaisDisponiveis` mostra dados
- `[DEBUG FILIAIS] TODAS as filiais: 0` (vazio)

**Causa:**
- Problema no map/filter do useMemo
- filiaisDisponiveis não tem estrutura correta

**Solução:**
- Verificar estrutura de `filiaisDisponiveis`
- Verificar se `.map(f => f.label)` funciona

### Cenário 4: Cascata não funciona após selecionar marca
**Sintomas:**
- `selectedMarcas: ['GT']` está correto
- `Filiais FILTRADAS por marca: 0` (vazio)

**Causa:**
- Filter não está encontrando matches
- Campo `marca` em `filiaisDisponiveis` não bate com `selectedMarcas`

**Solução:**
- Verificar se marcas têm formato exato (case-sensitive)
- Comparar `f.marca` vs `selectedMarcas[0]`

---

## 🎯 O Que Enviar para Análise

1. **Copiar TODOS os logs** que começam com:
   - 🏢 [getMarcasEFiliais]
   - 🚨 [ANTES DE SET]
   - 🚨 [TIMEOUT]
   - 🏷️ [DEBUG MARCAS]
   - 🏢 [DEBUG FILIAIS]
   - 🎯 [MARCA CLICK]

2. **Screenshot** do console completo

3. **Descrever** exatamente o que acontece:
   - Dropdown de Marca abre?
   - Mostra opções?
   - Ao selecionar Marca, dropdown de Filial abre?
   - Filial está vazio ou tem opções?

---

## ⚡ Teste Rápido Alternativo

Se quiser testar diretamente no console do browser:

```javascript
// Abrir console (F12) e colar:

// 1. Verificar estados
console.log('Estados:', {
  marcasDisponiveis: window.marcasDisponiveis,
  filiaisDisponiveis: window.filiaisDisponiveis
});

// 2. Buscar dados diretamente
import { getMarcasEFiliais } from './services/supabaseService';
getMarcasEFiliais().then(data => {
  console.log('Dados diretos da API:', data);
});
```

---

**Data:** 14/02/2026
**Status:** Aguardando logs do teste para diagnóstico

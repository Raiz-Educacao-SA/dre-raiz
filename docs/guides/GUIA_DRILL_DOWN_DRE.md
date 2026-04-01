# 🎯 GUIA COMPLETO: DRILL-DOWN PROFUNDO DRE GERENCIAL

## 📋 VISÃO GERAL

O **Drill-down Profundo** permite analisar a DRE em até **8 níveis hierárquicos**, combinando a estrutura DRE (níveis 1-3) com dimensões personalizáveis (níveis 4-8).

---

## 🏗️ ESTRUTURA HIERÁRQUICA COMPLETA

```
📊 DRE GERENCIAL (8 Níveis Possíveis)

Níveis FIXOS (sempre presentes):
├── Nível 1: TAG0 (ex: Receita Líquida, Custos Variáveis)
├── Nível 2: TAG01 (ex: Tributos, Receita De Mensalidade)
└── Nível 3: CONTA_CONTABIL (ex: 3.1.1.01.001)

Níveis DINÂMICOS (você escolhe quais adicionar e em qual ordem):
├── Nível 4: [Dimensão escolhida 1]
├── Nível 5: [Dimensão escolhida 2]
├── Nível 6: [Dimensão escolhida 3]
├── Nível 7: [Dimensão escolhida 4]
└── Nível 8: [Dimensão escolhida 5]
```

---

## 🎨 DIMENSÕES DISPONÍVEIS (Drill-down Profundo)

Localizadas na seção: **"Drill-down Profundo - Níveis 4 a 8"**

### DE-PARA: Visual → Sistema → Banco

| Botão no Visual | ID no Sistema | Campo no Banco | Descrição | Exemplo de Valores |
|-----------------|---------------|----------------|-----------|-------------------|
| **tag02** | `tag02` | `tag02` | Classificação secundária (Segmento) | "Educação Infantil", "Fundamental I", "Integral" |
| **tag03** | `tag03` | `tag03` | Classificação terciária (Projeto) | "Operação Regular", "Reforma Predial", "Evento Pedagógico" |
| **Marca** | `marca` | `marca` | CIA/Marca da escola | "QI", "GT", "AP", "CLV", "MT" |
| **Unidade** | `nome_filial` | `nome_filial` | Filial/Unidade específica | "QI - Botafogo", "GT - Barra", "AP - Central" |
| **Fornecedor** | `vendor` | `vendor` | Fornecedor/Prestador | "GOOGLE LLC", "EDITORA XYZ", "CONSTRUTORA ABC" |
| **Ticket** | `ticket` | `ticket` | Número do documento/nota | "300001", "NF-12345", "PED-67890" |

---

## 🔄 FLUXO COMPLETO DE DADOS

### 1️⃣ NÍVEIS FIXOS (1-3): Dados do Summary

**O que aparece no visual:**
- Linha expandível com ícone ▶
- Label: "01. RECEITA LÍQUIDA"
- Valores: agregados de 12 meses + YTD

**Como o sistema prepara:**
```typescript
// Busca agregação do servidor
const summaryRows = await getDRESummary({
  monthFrom: '2025-01',
  monthTo: '2025-12',
  marcas: ['QI', 'GT'],      // Filtros selecionados
  nomeFiliais: ['QI - Botafogo'],
  tags01: ['Tributos']
});

// Constrói hierarquia em memória
dreStructure = {
  '01': {
    label: '01. RECEITA LÍQUIDA',
    items: [
      {
        nivel_2_label: 'Tributos',
        items: ['3.1.1.01.001', '3.1.1.01.002'] // contas
      }
    ]
  }
}
```

**Como filtra no banco (RPC `get_dre_summary`):**
```sql
SELECT
  tag0,
  tag01,
  conta_contabil,
  scenario,
  DATE_TRUNC('month', date) as month_date,
  SUM(amount) as total_amount
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND marca = ANY('{QI,GT}')           -- ← Filtro MARCA
  AND nome_filial = ANY('{QI - Botafogo}')  -- ← Filtro FILIAL
  AND tag01 = ANY('{Tributos}')        -- ← Filtro TAG01
GROUP BY tag0, tag01, conta_contabil, scenario, month_date
ORDER BY tag0, tag01, conta_contabil, month_date
```

---

### 2️⃣ NÍVEIS DINÂMICOS (4-8): Drill-down sob demanda

**Exemplo: Usuário clica em 3 botões nesta ordem:**
1. **Marca** (1º)
2. **Unidade** (2º)
3. **tag02** (3º)

**O que aparece no visual:**

```
📊 DRE
└── 01. RECEITA LÍQUIDA (Nível 1)
    └── Tributos (Nível 2)
        └── 3.1.1.01.001 (Nível 3)
            └── 🔸 QI (Nível 4 - Marca) ← DINÂMICO
                └── 🔸 QI - Botafogo (Nível 5 - Unidade) ← DINÂMICO
                    └── 🔸 Educação Infantil (Nível 6 - tag02) ← DINÂMICO
```

**Como o sistema prepara:**

```typescript
// Estado: dynamicPath = ['marca', 'nome_filial', 'tag02']

// 1. Usuário expande "3.1.1.01.001" → carrega Nível 4 (marca)
const level4Data = await getDREDimension({
  monthFrom: '2025-01',
  monthTo: '2025-12',
  contaContabils: ['3.1.1.01.001'],
  scenario: 'Real',
  dimension: 'marca',              // ← Primeira dimensão
  marcas: undefined,               // Não filtra marca (é o que queremos ver)
  nomeFiliais: ['QI - Botafogo'],
  tags01: ['Tributos']
});
// Retorna: [{ dimension_value: 'QI', month_date: ..., total_amount: ... }]

// 2. Usuário expande "QI" → carrega Nível 5 (nome_filial)
const level5Data = await getDREDimension({
  monthFrom: '2025-01',
  monthTo: '2025-12',
  contaContabils: ['3.1.1.01.001'],
  scenario: 'Real',
  dimension: 'nome_filial',        // ← Segunda dimensão
  marcas: ['QI'],                  // ← Filtro acumulado do nível anterior
  nomeFiliais: undefined,          // Não filtra (é o que queremos ver)
  tags01: ['Tributos']
});
// Retorna: [{ dimension_value: 'QI - Botafogo', month_date: ..., total_amount: ... }]

// 3. Usuário expande "QI - Botafogo" → carrega Nível 6 (tag02)
const level6Data = await getDREDimension({
  monthFrom: '2025-01',
  monthTo: '2025-12',
  contaContabils: ['3.1.1.01.001'],
  scenario: 'Real',
  dimension: 'tag02',              // ← Terceira dimensão
  marcas: ['QI'],                  // ← Filtros acumulados
  nomeFiliais: ['QI - Botafogo'],  // ← Filtros acumulados
  tags01: ['Tributos']
});
// Retorna: [{ dimension_value: 'Educação Infantil', month_date: ..., total_amount: ... }]
```

**Como filtra no banco (RPC `get_dre_dimension`):**

```sql
-- NÍVEL 4 (marca):
SELECT
  marca as dimension_value,
  DATE_TRUNC('month', date) as month_date,
  SUM(amount) as total_amount
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND scenario = 'Real'
  AND conta_contabil = ANY('{3.1.1.01.001}')
  AND nome_filial = ANY('{QI - Botafogo}')  -- ← Filtro de cima
  AND tag01 = ANY('{Tributos}')             -- ← Filtro de cima
GROUP BY marca, month_date
ORDER BY marca, month_date;

-- NÍVEL 5 (nome_filial):
SELECT
  nome_filial as dimension_value,
  DATE_TRUNC('month', date) as month_date,
  SUM(amount) as total_amount
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND scenario = 'Real'
  AND conta_contabil = ANY('{3.1.1.01.001}')
  AND marca = ANY('{QI}')                   -- ← Filtro acumulado nível 4
  AND tag01 = ANY('{Tributos}')
GROUP BY nome_filial, month_date
ORDER BY nome_filial, month_date;

-- NÍVEL 6 (tag02):
SELECT
  tag02 as dimension_value,
  DATE_TRUNC('month', date) as month_date,
  SUM(amount) as total_amount
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND scenario = 'Real'
  AND conta_contabil = ANY('{3.1.1.01.001}')
  AND marca = ANY('{QI}')                   -- ← Filtros acumulados
  AND nome_filial = ANY('{QI - Botafogo}')  -- ← Filtros acumulados
  AND tag01 = ANY('{Tributos}')
GROUP BY tag02, month_date
ORDER BY tag02, month_date;
```

---

## 🎯 CACHE INTELIGENTE

O sistema usa cache para evitar re-queries:

```typescript
// Chave do cache inclui:
// 1. Cenário (Real/Orçado/A-1)
// 2. Contas (quais linhas da DRE)
// 3. Dimensão atual (marca/filial/tag02/etc)
// 4. Filtros acumulados dos níveis anteriores

const cacheKey = `Real|3.1.1.01.001|marca|nome_filial=QI - Botafogo&tag01=Tributos`;

// Verifica cache antes de buscar
if (!dimensionCache[cacheKey]) {
  await loadDimensionData(...); // Busca do servidor
}
```

**Benefício:** Se você expandir "QI" novamente, não faz nova query!

---

## 📊 ORDENAÇÃO DE DIMENSÕES

Você pode ordenar os valores de cada dimensão:

| Botão | Ordenação | Descrição |
|-------|-----------|-----------|
| **Maior→Menor** | `desc` | Ordena por valor absoluto (maior primeiro) |
| **Menor→Maior** | `asc` | Ordena por valor absoluto (menor primeiro) |
| **A-Z** | `alpha` | Ordem alfabética |

**Exemplo:**
- **Marca** ordenado por **Maior→Menor**: QI (R$ 5M) → GT (R$ 3M) → AP (R$ 1M)
- **Marca** ordenado por **A-Z**: AP → CLV → GT → MT → QI

---

## 🔄 FLUXO DE INTERAÇÃO COMPLETO

### Passo a Passo:

1. **Usuário acessa DRE Gerencial**
   - Sistema carrega `getDRESummary()` → Níveis 1-3

2. **Usuário seleciona filtros de topo:**
   - Período: Jan-Dez 2025
   - Marca: QI, GT
   - Unidade: QI - Botafogo
   - Tag01: Tributos

3. **Usuário clica nos botões de Drill-down:**
   - Clica **"Marca"** → adiciona ao `dynamicPath[0]`
   - Clica **"Unidade"** → adiciona ao `dynamicPath[1]`
   - Clica **"tag02"** → adiciona ao `dynamicPath[2]`

4. **Usuário expande linha "01. RECEITA LÍQUIDA":**
   - Sistema mostra Nível 2 (TAG01) do cache summary

5. **Usuário expande linha "Tributos":**
   - Sistema mostra Nível 3 (CONTA_CONTABIL) do cache summary

6. **Usuário expande linha "3.1.1.01.001":**
   - Sistema detecta `dynamicPath[0] = 'marca'`
   - Busca `getDREDimension(dimension='marca')`
   - Mostra: QI, GT (valores únicos de marca)

7. **Usuário expande linha "QI":**
   - Sistema detecta `dynamicPath[1] = 'nome_filial'`
   - Busca `getDREDimension(dimension='nome_filial', marcas=['QI'])`
   - Mostra: QI - Botafogo, QI - Recreio, QI - Tijuca

8. **Usuário expande "QI - Botafogo":**
   - Sistema detecta `dynamicPath[2] = 'tag02'`
   - Busca `getDREDimension(dimension='tag02', marcas=['QI'], nomeFiliais=['QI - Botafogo'])`
   - Mostra: Educação Infantil, Fundamental I, Ensino Médio

---

## 🎯 FILTROS ACUMULADOS

**Importante:** Cada nível acumula os filtros dos níveis anteriores!

```
Nível 1: Receita Líquida
  └─ Filtros: [tag0='Receita Líquida']

Nível 2: Tributos
  └─ Filtros: [tag0='Receita Líquida', tag01='Tributos']

Nível 3: 3.1.1.01.001
  └─ Filtros: [tag0='Receita Líquida', tag01='Tributos', conta_contabil='3.1.1.01.001']

Nível 4: QI (marca)
  └─ Filtros: [...anteriores..., marca='QI']

Nível 5: QI - Botafogo (filial)
  └─ Filtros: [...anteriores..., nome_filial='QI - Botafogo']

Nível 6: Educação Infantil (tag02)
  └─ Filtros: [...anteriores..., tag02='Educação Infantil']
```

**Na query final (Nível 6):**
```sql
WHERE tag0 = 'Receita Líquida'
  AND tag01 = 'Tributos'
  AND conta_contabil = '3.1.1.01.001'
  AND marca = 'QI'
  AND nome_filial = 'QI - Botafogo'
  AND tag02 = 'Educação Infantil'
```

---

## 💡 CASOS DE USO

### Caso 1: Analisar Receita por Unidade
**Objetivo:** Ver qual unidade gera mais receita de mensalidades

**Passos:**
1. Clique em **"Unidade"** (Drill-down Profundo)
2. Expanda: **01. RECEITA LÍQUIDA** → **Receita De Mensalidade**
3. Veja as filiais ordenadas por valor (Maior→Menor)

### Caso 2: Investigar Custos por Fornecedor
**Objetivo:** Ver quais fornecedores têm maior impacto nos custos

**Passos:**
1. Clique em **"Fornecedor"** (Drill-down Profundo)
2. Expanda: **02. CUSTOS VARIÁVEIS** → **Material De Consumo & Operações**
3. Veja os fornecedores ordenados

### Caso 3: Analisar Despesas por Marca e Segmento
**Objetivo:** Ver gastos de marketing por marca e público-alvo

**Passos:**
1. Clique em **"Marca"** (1º) e **"tag02"** (2º)
2. Expanda: **04. DESPESAS ADM** → **Vendas & Marketing**
3. Expanda a marca desejada (ex: QI)
4. Veja os segmentos (Educação Infantil, Fundamental, etc.)

---

## 🚀 PERFORMANCE

### Otimizações implementadas:

1. **Agregação no servidor:** Dados pré-agregados via RPC PostgreSQL
2. **Cache multinível:** Summary + dimensões
3. **Busca sob demanda:** Só carrega quando usuário expande
4. **Índices no banco:** `(date, scenario, marca, nome_filial, tag01)`

### Estimativas:

- **Summary (Níveis 1-3):** 1 query, ~2000 linhas, ~100KB
- **Dimensão (Níveis 4-8):** 1 query por expansão, ~100 linhas, ~5KB
- **Total máximo:** 1 summary + 5 dimensões = 6 queries, ~125KB

**Vs alternativa (sem agregação):**
- 119k transações brutas × 120 queries = 50MB 🔴
- Com agregação: 6 queries × 125KB = ~750KB ✅

---

## 📝 RESUMO DE-PARA

| O que vejo no Visual | O que é no Código | Como busca no Banco |
|---------------------|-------------------|---------------------|
| Botão "Marca" | `dimension: 'marca'` | `SELECT marca as dimension_value FROM transactions WHERE ...` |
| Botão "Unidade" | `dimension: 'nome_filial'` | `SELECT nome_filial as dimension_value FROM transactions WHERE ...` |
| Botão "tag02" | `dimension: 'tag02'` | `SELECT tag02 as dimension_value FROM transactions WHERE ...` |
| Botão "tag03" | `dimension: 'tag03'` | `SELECT tag03 as dimension_value FROM transactions WHERE ...` |
| Botão "Fornecedor" | `dimension: 'vendor'` | `SELECT vendor as dimension_value FROM transactions WHERE ...` |
| Botão "Ticket" | `dimension: 'ticket'` | `SELECT ticket as dimension_value FROM transactions WHERE ...` |
| Valor "QI" expandido | Linha renderizada com `level+1` | Próxima query COM filtro `marca='QI'` |
| Ordenação "Maior→Menor" | `dimensionSort='desc'` | `ORDER BY SUM(amount) DESC` (no código JS) |
| Cache de dimensão | `dimensionCache[cacheKey]` | Armazenado em memória, não refaz query |

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Use este checklist para entender o comportamento:

- [ ] Filtros de topo (Marca, Filial, Tag01) aplicam em TODOS os níveis?
  - ✅ SIM - Passados para `getDRESummary()` e `getDREDimension()`

- [ ] Posso adicionar mais de 5 dimensões?
  - ❌ NÃO - Limite: 5 dimensões (Níveis 4-8)

- [ ] A ordem dos botões importa?
  - ✅ SIM - Define a hierarquia (1º botão = Nível 4, 2º = Nível 5, etc.)

- [ ] Se desmarcar um botão, perde os dados?
  - ✅ SIM - Remove a dimensão e todos os níveis abaixo dela

- [ ] O cache persiste ao trocar de aba?
  - ❌ NÃO - Cache é em memória, perdido ao desmontar componente

- [ ] Permissões aplicam no drill-down?
  - ✅ SIM - Sempre aplicadas (allowedMarcas, allowedFiliais, allowedTag01)

---

**📌 Este documento explica TODA a mecânica do Drill-down Profundo na DRE Gerencial!**

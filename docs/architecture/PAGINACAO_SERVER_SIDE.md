# Paginação Server-Side com Navegação por Página

## Data: 06/02/2026

---

## Contexto

A guia Lançamentos utilizava **scroll infinito** para carregar dados paginados do servidor. Esse mecanismo apresentava dois problemas críticos:

1. **Duplicatas:** Ao rolar a tabela, registros já exibidos apareciam novamente (ex: `03071b2e-8352-4c43-88c6-23d79c7d032d` aparecia 2x mesmo existindo apenas 1 no banco).
2. **Filtros de texto não enviados ao servidor:** Ao clicar "Buscar Dados", apenas período e cenário eram enviados ao servidor. Filtros como Fornecedor, Descrição, Ticket e Valor eram aplicados apenas client-side sobre os 1000 registros da página atual, ignorando registros de outras páginas.

---

## Causa Raiz das Duplicatas

### Race Condition no React State

O scroll infinito usava `currentPageNumber` (useState) para calcular a próxima página. Porém, `useState` no React é **assíncrono** — o valor não atualiza imediatamente após `setCurrentPageNumber()`.

**Fluxo do bug:**

```
1. Página 1 carregada → currentPageNumber = 1
2. Scroll dispara loadNextPage() → chama handleSearchData(currentPageNumber + 1) = página 2
3. Resposta volta → setCurrentPageNumber(2) é ENFILEIRADO (não imediato)
4. isLoadingMore = false
5. Scroll dispara novamente → currentPageNumber AINDA É 1 (state não atualizou)
6. Chama handleSearchData(1 + 1) = página 2 NOVAMENTE → DUPLICATA!
```

### Ordenação Instável (problema secundário)

A query ordenava apenas por `date DESC`. Com muitos registros na mesma data, o PostgreSQL não garantia ordem determinística entre chamadas `.range()`, causando registros "pulando" entre páginas.

---

## Solução Implementada

### Substituição: Scroll Infinito → Paginação por Navegação

Em vez de tentar corrigir o scroll infinito (que tem complexidade inerente com closures e race conditions), a solução foi substituí-lo por **paginação tradicional com botões de navegação**.

### Mudanças Realizadas

#### 1. `components/TransactionsView.tsx`

**Removido:**
- Scroll infinito (`loadNextPage`, `handleScroll`, `useEffect` de detecção de scroll)
- States: `hasMore`, `isLoadingMore`, `currentPageRef`
- Lógica de append (`setSearchedTransactions(prev => [...prev, ...response.data])`)
- Paginação client-side legada (`currentPage`, `RECORDS_PER_PAGE`, `paginatedData`, `totalPages` calculado)
- Indicador "Carregando mais registros..."
- Controles de paginação client-side (botões numerados)

**Adicionado:**
- `PAGE_SIZE = 1000` (antes era 500)
- State `totalPages` (vindo do servidor)
- Funções `goToNextPage()` e `goToPrevPage()` — simples e sem race condition
- `handleSearchData` sempre **substitui** dados (nunca acumula)
- **Barra de paginação acima da tabela** com:
  - ITENS (quantidade na página atual)
  - TOTAL (soma dos valores)
  - TOTAL BD (total de registros no banco com os filtros aplicados)
  - Botões ANTERIOR / PRÓXIMA
  - Indicador "Pg X de Y"

**Filtros enviados ao servidor (Buscar Dados):**
Antes, `handleSearchData` enviava apenas 3 filtros. Agora envia **todos os 14**:

| # | Filtro | Tipo | Busca no servidor |
|---|--------|------|-------------------|
| 1 | monthFrom | período | `>= mês` |
| 2 | monthTo | período | `<= mês` |
| 3 | scenario | cenário | `= 'Real'` ou `= 'Orçamento'` |
| 4 | marca | array | `IN (...)` |
| 5 | filial | array | `IN (...)` |
| 6 | tag01 | array | `IN (...)` |
| 7 | tag02 | array | `IN (...)` |
| 8 | tag03 | array | `IN (...)` |
| 9 | category | array | `IN (...)` |
| 10 | chave_id | array | `IN (...)` |
| 11 | recurring | array | `IN (...)` |
| 12 | ticket | texto | `ilike('%...%')` |
| 13 | vendor | texto | `ilike('%...%')` |
| 14 | description | texto | `ilike('%...%')` |

#### 2. `services/supabaseService.ts`

**Modificado:**
- Ordenação: `date DESC` → `date DESC, id ASC` (desempate por coluna única para paginação estável)

---

## Arquitetura Final

### Fluxo "Buscar Dados"

```
Usuário aplica filtros → Clica "Buscar Dados"
  → Envia TODOS os 14 filtros ao servidor
  → Servidor aplica filtros + ORDER BY date DESC, id ASC
  → Retorna página 1 (1000 registros) + totalCount + totalPages
  → UI substitui dados e exibe barra de paginação

Usuário clica "PRÓXIMA"
  → Busca página 2 (registros 1001-2000)
  → UI substitui dados (não acumula)
  → Scroll volta ao topo da tabela
```

### Fluxo "Buscar Tudo"

```
Usuário clica "Buscar Tudo"
  → Modal de confirmação
  → Loop paginado: busca todas as páginas (1000 registros cada)
  → Barra de progresso com cancelamento
  → Todos os registros ficam em memória
  → totalPages = 1 (tudo já carregado)
  → Botões de paginação não aparecem
```

### Layout da Tabela

```
┌─────────────────────────────────────────────────────────────────────┐
│ ITENS: 1000 │ TOTAL: R$ ... │ TOTAL BD: 114.000 │ ← ANT │ Pg 1/114 │ PRÓ → │  ← BARRA SUPERIOR
├─────────────────────────────────────────────────────────────────────┤
│ Cen │ Data │ Tag01 │ Tag02 │ ... │ Valor │ Status │ Ações │          ← CABEÇALHO
├─────────────────────────────────────────────────────────────────────┤
│ ... 1000 linhas de dados ...                                        │
├─────────────────────────────────────────────────────────────────────┤
│ ITENS: 1000 │ TOTAL: R$ ...                                        │  ← RODAPÉ (simplificado)
└─────────────────────────────────────────────────────────────────────┘
```

---

## Por que Paginação por Navegação é Melhor que Scroll Infinito

| Aspecto | Scroll Infinito | Paginação por Navegação |
|---------|----------------|------------------------|
| **Duplicatas** | Possíveis (race condition) | Impossíveis (substitui dados) |
| **Memória** | Acumula (pode chegar a 114k registros) | Sempre 1000 registros |
| **Complexidade** | Alta (refs, closures, scroll events) | Baixa (goToNext/goToPrev) |
| **Performance** | Degrada com acúmulo | Constante |
| **Análise de dados** | Confusa (dados misturados) | Clara (página X de Y) |

---

## Verificação

- [x] Digitar "EDMILSON" no Fornecedor + Buscar Dados → retorna apenas registros com "EDMILSON"
- [x] Navegar entre páginas → sem duplicatas
- [x] Buscar Tudo → continua funcionando com progress bar
- [x] Rodapé mostra ITENS e TOTAL corretamente
- [x] Barra superior mostra paginação apenas quando há mais de 1 página
- [x] `npm run build` sem erros (3153 módulos, ~19s)

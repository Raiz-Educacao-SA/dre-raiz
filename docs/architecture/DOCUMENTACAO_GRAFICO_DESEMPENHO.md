# 📊 DOCUMENTAÇÃO - GRÁFICO DE DESEMPENHO POR CIA/FILIAL

**Arquivo:** `components/DashboardEnhanced.tsx`
**Linhas:** 115-430
**Data:** 12/02/2026

---

## 🎯 VISÃO GERAL

Gráfico de barras interativo que mostra o desempenho financeiro por **CIA (Marca)** ou **Filial**, com drill-down automático e comparação com orçado/ano anterior.

---

## 📦 FONTE DE DADOS

### Origem
```typescript
props.transactions: Transaction[]
```
- Array de transações recebido do componente pai (`Dashboard.tsx`)
- Vem do **Supabase** via `TransactionsContext`
- Cada transação contém: date, scenario, marca, filial, tag01, amount, etc.

### Tabela no Supabase
```
transactions
├── id
├── date (formato: 'YYYY-MM-DD')
├── scenario ('Real', 'Orçado', 'A-1')
├── marca (ex: 'RAIZ', 'LUMINOVA')
├── filial (ex: 'São Paulo', 'Rio de Janeiro')
├── tag01 (categoria DRE)
├── amount (valor em R$)
└── ... outros campos
```

---

## 🔄 FLUXO DE PROCESSAMENTO

### 1️⃣ **FILTRAGEM INICIAL** (Linhas 124-155)

```typescript
// PASSO 1: Filtrar por cenário Real + mês
let filteredTrans = transactions.filter(t => {
  const month = parseInt(t.date.substring(5, 7), 10) - 1; // Extrai mês (0-11)
  const passMonth = month >= monthRange.start && month <= monthRange.end;
  return t.scenario === 'Real' && passMonth;
});
```

**O que faz:**
- ✅ Pega apenas transações com `scenario = 'Real'`
- ✅ Filtra pelo período selecionado (`monthRange`)
- ✅ Converte mês do formato MM para índice 0-11 (Jan=0, Dez=11)

```typescript
// PASSO 2: Aplicar filtro de Marca (se selecionado)
if (selectedMarca.length > 0) {
  filteredTrans = filteredTrans.filter(t =>
    selectedMarca.includes(t.marca || '')
  );
}

// PASSO 3: Aplicar filtro de Filial (se selecionado)
if (selectedFilial.length > 0) {
  filteredTrans = filteredTrans.filter(t =>
    selectedFilial.includes(t.filial || '')
  );
}
```

**O que faz:**
- ✅ Se usuário selecionou marca(s), mostra só essas
- ✅ Se usuário selecionou filial(is), mostra só essas
- ✅ Arrays vazios = mostra tudo (sem filtro)

---

### 2️⃣ **TRANSAÇÕES DE COMPARAÇÃO** (Linhas 157-172)

```typescript
const comparisonScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';
let comparisonTrans = transactions.filter(t => {
  const month = parseInt(t.date.substring(5, 7), 10) - 1;
  return t.scenario === comparisonScenario &&
         month >= monthRange.start &&
         month <= monthRange.end;
});

// Aplicar mesmos filtros de marca/filial
if (selectedMarca.length > 0) {
  comparisonTrans = comparisonTrans.filter(t =>
    selectedMarca.includes(t.marca || '')
  );
}
if (selectedFilial.length > 0) {
  comparisonTrans = comparisonTrans.filter(t =>
    selectedFilial.includes(t.filial || '')
  );
}
```

**O que faz:**
- ✅ Busca transações do cenário de comparação (Orçado ou A-1)
- ✅ Aplica os MESMOS filtros (mês, marca, filial)
- ✅ Usado para calcular variações (% vs orçado/ano anterior)

---

### 3️⃣ **DRILL-DOWN: CIA vs FILIAL** (Linhas 174-192)

```typescript
let dimensionsToShow: string[];

if (drillLevel === 'cia') {
  // MODO CIA: Agrupa por MARCA
  const ciasInData = new Set(filteredTrans.map(t => t.marca).filter(Boolean));
  dimensionsToShow = Array.from(ciasInData).sort();

} else {
  // MODO FILIAL: Agrupa por FILIAL
  if (selectedFilial.length > 0) {
    // Se tem filtro de filial, usa só as selecionadas
    dimensionsToShow = selectedFilial;
  } else {
    // Senão, pega todas as filiais que têm dados
    const filiaisInData = new Set(filteredTrans.map(t => t.filial).filter(Boolean));
    dimensionsToShow = Array.from(filiaisInData).sort();
  }
}
```

**Lógica do Drill-Down:**

| Situação | drillLevel | Mostra |
|----------|-----------|--------|
| Nenhuma marca selecionada | `'cia'` | Todas as marcas (RAIZ, LUMINOVA, etc.) |
| 1 marca selecionada | `'filial'` (auto) | Todas as filiais dessa marca |
| Clique manual no botão | Toggle | Alterna entre CIA ↔ Filial |

**Gatilho automático** (Linhas 104-111):
```typescript
React.useEffect(() => {
  if (selectedMarca.length > 0) {
    setDrillLevel('filial'); // Auto drill-down quando filtra marca
  } else {
    setDrillLevel('cia'); // Volta pra CIA quando limpa
  }
}, [selectedMarca]);
```

---

### 4️⃣ **CÁLCULO DE MÉTRICAS** (Linhas 194-247)

Para cada dimensão (CIA ou Filial):

```typescript
// Filtrar transações dessa dimensão
const dimensionTrans = drillLevel === 'cia'
  ? filteredTrans.filter(t => t.marca === dimension)
  : filteredTrans.filter(t => t.filial === dimension);
```

#### 📊 **RECEITA LÍQUIDA**
```typescript
const RECEITA_LIQUIDA_TAGS = [
  'Tributos',
  'Devoluções & Cancelamentos',
  'Integral',
  'Material Didático',
  'Receita De Mensalidade',
  'Receitas Não Operacionais',
  'Receitas Extras'
];

const revenue = dimensionTrans
  .filter(t => t.tag01 && RECEITA_LIQUIDA_TAGS.includes(t.tag01))
  .reduce((acc, t) => acc + t.amount, 0);
```

**O que faz:**
- ✅ Soma apenas transações com `tag01` nas categorias de receita
- ✅ Segue lógica do DRE (Receita Líquida = apenas essas tags)

#### 💰 **CUSTOS**
```typescript
const costs = dimensionTrans
  .filter(t => !(t.tag01 && RECEITA_LIQUIDA_TAGS.includes(t.tag01)))
  .reduce((acc, t) => acc + t.amount, 0);
```

**O que faz:**
- ✅ Soma TUDO que NÃO é receita líquida
- ✅ Inclui: custos operacionais, despesas, etc.

#### 📈 **EBITDA e MARGEM**
```typescript
const ebitda = revenue - costs; // EBITDA = Receita - Custos
const margin = revenue > 0 ? (ebitda / revenue) * 100 : 0; // Margem %
```

#### 📊 **COMPARAÇÃO (Orçado ou A-1)**
```typescript
// Mesmos cálculos para transações de comparação
const compRevenue = compDimensionTrans
  .filter(t => t.tag01 && RECEITA_LIQUIDA_TAGS.includes(t.tag01))
  .reduce((acc, t) => acc + t.amount, 0);

const compCosts = compDimensionTrans
  .filter(t => !(t.tag01 && RECEITA_LIQUIDA_TAGS.includes(t.tag01)))
  .reduce((acc, t) => acc + t.amount, 0);

const compEbitda = compRevenue - compCosts;
const compMargin = compRevenue > 0 ? (compEbitda / compRevenue) * 100 : 0;
```

#### 📉 **VARIAÇÕES (%)**
```typescript
// % de variação da Receita vs comparação
const revenueVariation = compRevenue !== 0
  ? ((revenue - compRevenue) / compRevenue) * 100
  : 0;

// % de variação do EBITDA vs comparação
const ebitdaVariation = compEbitda !== 0
  ? ((ebitda - compEbitda) / Math.abs(compEbitda)) * 100
  : 0;

// Variação absoluta da Margem (diferença de pontos percentuais)
const marginVariation = margin - compMargin;
```

#### 👥 **ALUNOS (Estimativa Proporcional)**
```typescript
// Total de receita no período
const totalRevenue = filteredTrans
  .filter(t => t.tag01 && RECEITA_LIQUIDA_TAGS.includes(t.tag01))
  .reduce((acc, t) => acc + t.amount, 0);

// Alunos dessa dimensão = proporcional à receita
const branchStudents = totalRevenue > 0
  ? Math.round(kpis.activeStudents * (revenue / totalRevenue))
  : 0;
```

**Lógica:**
- Se a filial tem 30% da receita total → tem ~30% dos alunos
- `kpis.activeStudents` vem dos KPIs gerais do dashboard

---

### 5️⃣ **OBJETO FINAL** (Linha 236-247)
```typescript
return {
  branch: dimension,           // Nome da CIA/Filial
  revenue,                     // Receita Líquida (R$)
  costs,                       // Custos totais (R$)
  ebitda,                      // EBITDA (R$)
  margin,                      // Margem (%)
  students: branchStudents,    // Alunos estimados
  revenueVariation,            // % vs comparação
  ebitdaVariation,             // % vs comparação
  marginVariation              // pontos % vs comparação
};
```

**Ordenação:**
```typescript
.sort((a, b) => b.revenue - a.revenue); // Do MAIOR para o MENOR
```

---

## 🎨 VISUALIZAÇÃO DO GRÁFICO

### 3 Abas de Métricas

| Aba | Mostra | Formato |
|-----|--------|---------|
| **Receita** | `revenue` | R$ XXXk |
| **Margem %** | `margin` | XX.X% |
| **EBITDA** | `ebitda` | R$ XXXk |

### 🎨 **CORES DAS BARRAS** (baseadas na Margem)

```typescript
color: d.margin >= 25 ? '#10B981' :  // 🟢 VERDE: ≥25% (meta atingida)
       d.margin >= 20 ? '#F59E0B' :  // 🟡 AMARELO: 20-25% (atenção)
                        '#EF4444'    // 🔴 VERMELHO: <20% (abaixo meta)
```

**Regra:**
- ✅ **Verde:** Margem ≥ 25% (excelente)
- ⚠️ **Amarelo:** Margem entre 20-25% (ok)
- ❌ **Vermelho:** Margem < 20% (problema)

### 📊 **LABELS NO TOPO DAS BARRAS**

```
R$ 1.234k      ← Valor principal
↗ +15.3%       ← Variação vs comparação
```

**Cores da variação:**
- 🟢 Verde: variação positiva (↗ +X%)
- 🔴 Vermelho: variação negativa (↘ -X%)

### 🖱️ **TOOLTIP (ao passar mouse)**

```
São Paulo
Receita: R$ 1.234.567
vs Orçado: +15.3%  ← em verde/vermelho
```

---

## 🔧 CONFIGURAÇÃO DO GRÁFICO (ECharts)

### Grid e Espaçamento
```typescript
grid: {
  left: '3%',      // Margem esquerda (reduzida para aproveitar espaço)
  right: '3%',     // Margem direita
  top: 60,         // Espaço para o header
  bottom: 80       // Espaço para labels do eixo X
}
```

### Eixo X (Horizontal)
```typescript
xAxis: {
  type: 'category',
  data: branchData.map(d => d.branch), // Nomes das CIAs/Filiais
  axisLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    rotate: 20  // Rotação para caber nomes longos
  }
}
```

### Eixo Y (Vertical)
```typescript
yAxis: {
  type: 'value',
  axisLabel: {
    fontSize: 11,
    formatter: metricData.formatter  // R$ XXXk ou XX.X%
  }
}
```

### Barras
```typescript
series: [{
  type: 'bar',
  barWidth: '60%',  // Largura da barra
  itemStyle: {
    borderRadius: [8, 8, 0, 0]  // Cantos arredondados em cima
  }
}]
```

---

## 🔄 ESTADOS (React State)

### 1. **monthRange** (Período)
```typescript
const [monthRange, setMonthRange] = React.useState({ start: 0, end: 11 });
```
- Controla meses exibidos (0=Jan, 11=Dez)
- Atualizado via evento do Dashboard filho
- **Padrão:** Ano todo (0-11)

### 2. **comparisonMode** (Comparação)
```typescript
const [comparisonMode, setComparisonMode] = React.useState<'budget' | 'prevYear'>('budget');
```
- `'budget'` → Compara com `scenario='Orçado'`
- `'prevYear'` → Compara com `scenario='A-1'`

### 3. **branchMetric** (Métrica Exibida)
```typescript
const [branchMetric, setBranchMetric] = React.useState<'revenue' | 'margin' | 'ebitda'>('revenue');
```
- Controla qual aba está ativa
- **Padrão:** Receita

### 4. **drillLevel** (Nível de Drill)
```typescript
const [drillLevel, setDrillLevel] = React.useState<'cia' | 'filial'>('cia');
```
- `'cia'` → Agrupa por Marca
- `'filial'` → Agrupa por Filial
- **Auto:** Muda para `'filial'` quando `selectedMarca.length > 0`

---

## 🔍 DEPENDÊNCIAS (useMemo)

```typescript
const branchData = useMemo(() => {
  // ... cálculos ...
}, [
  transactions,      // Array de transações
  kpis,             // KPIs gerais (para calcular alunos)
  selectedMarca,    // Filtro de marca
  selectedFilial,   // Filtro de filial
  monthRange,       // Período selecionado
  comparisonMode,   // Modo de comparação
  drillLevel        // Nível de drill
]);
```

**Recalcula quando:**
- ✅ Transações mudam (novo fetch)
- ✅ Filtros de marca/filial mudam
- ✅ Período muda
- ✅ Modo de comparação muda
- ✅ Drill level muda

---

## 🚨 PROBLEMAS CONHECIDOS

### ❌ **Problema 1: Dados faltantes**
```
📊 TRANSAÇÕES POR MÊS:
  Jan: 5581 transações
```
- **Causa:** Banco só tem dados de Janeiro
- **Sintoma:** Gráfico não muda ao filtrar Jan-Fev ou Jan-Mar
- **Solução:** Importar dados de Fev/Mar no Supabase

### ⚠️ **Problema 2: MonthRange dessincrono**
```typescript
// Badge mostra: Range=0-1
// Mas logs mostram: monthRange: {start: 0, end: 11}
```
- **Causa:** Evento `monthRangeChange` não está sendo disparado/recebido
- **Sintoma:** Filtro visual não reflete no cálculo
- **Debug:** Logs adicionados nas linhas 93-104 (Dashboard) e 83-92 (DashboardEnhanced)

---

## 📋 CHECKLIST DE VALIDAÇÃO

Para confirmar se o gráfico está funcionando:

- [ ] **Dados carregam:** Console mostra `📦 Total transactions: X`
- [ ] **Filtro de mês funciona:** Logs mostram meses corretos em `📊 TRANSAÇÕES POR MÊS`
- [ ] **Filtro de marca funciona:** Ao selecionar marca, gráfico mostra só aquela marca
- [ ] **Drill-down automático:** Ao filtrar marca, botão muda para "⬆ Voltar CIA"
- [ ] **Cores corretas:** Barras com margem >25% são VERDES
- [ ] **Comparação funciona:** Tooltip mostra "vs Orçado" ou "vs A-1"
- [ ] **Variações corretas:** Labels mostram % positivo/negativo

---

## 🛠️ COMO DEBUGAR

### 1. **Abrir Console do Navegador** (F12)

### 2. **Procurar por logs:**
```
═══════════════════════════════════════
📊 INICIANDO CÁLCULO DO branchData
📅 monthRange: {start: X, end: Y}
📦 Total transactions: XXXX
✅ Após filtro cenário Real + mês: XXXX
📊 TRANSAÇÕES POR MÊS:
  Jan: XXXX transações
  Fev: XXXX transações
═══════════════════════════════════════
```

### 3. **Verificar:**
- `monthRange` está correto?
- `Total transactions` > 0?
- Tem transações em todos os meses esperados?
- Filtros de marca/filial estão sendo aplicados?

---

## 📝 RESUMO EXECUTIVO

| Aspecto | Detalhes |
|---------|----------|
| **Fonte** | `props.transactions` do Supabase via TransactionsContext |
| **Filtros** | Cenário Real + Período + Marca + Filial |
| **Drill-Down** | CIA (marca) ↔ Filial (automático ou manual) |
| **Métricas** | Receita Líquida, EBITDA, Margem % |
| **Comparação** | vs Orçado OU vs Ano Anterior (A-1) |
| **Cores** | Verde (≥25%), Amarelo (20-25%), Vermelho (<20%) |
| **Ordenação** | Do maior para o menor (por receita) |
| **Performance** | useMemo com 7 dependências |

---

**Última atualização:** 12/02/2026
**Autor:** Claude Code
**Arquivo:** `DOCUMENTACAO_GRAFICO_DESEMPENHO.md`

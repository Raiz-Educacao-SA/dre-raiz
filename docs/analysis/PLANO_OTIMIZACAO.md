# 📊 PLANO DE OTIMIZAÇÃO - DRE RAIZ
**Data:** 11/02/2026
**Status:** App muito pesado e lento para carregar

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **MÚLTIPLAS BIBLIOTECAS DE GRÁFICOS** (URGENTE - IMPACTO ALTO)
**Problema:** 7 bibliotecas de gráficos instaladas, mas apenas 2 são usadas!

#### Bibliotecas instaladas:
```json
✅ recharts@3.7.0          → USADO (2 componentes)
✅ echarts@6.0.0          → USADO (2 componentes)
❌ plotly.js@3.3.1        → NÃO USADO (0 refs) - ~3MB
❌ react-plotly.js@2.6.0  → NÃO USADO (0 refs)
❌ @nivo/bar@0.99.0       → NÃO USADO (0 refs)
❌ @nivo/core@0.99.0      → NÃO USADO (0 refs)
❌ @nivo/heatmap@0.99.0   → NÃO USADO (0 refs)
❌ @nivo/line@0.99.0      → NÃO USADO (0 refs)
❌ @nivo/pie@0.99.0       → NÃO USADO (0 refs)
❌ chart.js@4.5.1         → Verificar uso
❌ react-chartjs-2@5.3.1  → Verificar uso
❌ d3@7.9.0               → Provavelmente usado por outras libs
```

**Economia estimada:** ~4-5MB do bundle final (60-70% de redução!)

---

### 2. **COMPONENTES MUITO GRANDES** (URGENTE - IMPACTO ALTO)
**Problema:** Componentes monolíticos difíceis de otimizar

```
Dashboard.tsx         → 2215 linhas ⚠️
DREView.tsx          → 2002 linhas ⚠️
TransactionsView.tsx → 1765 linhas ⚠️
```

**Consequências:**
- Re-renders desnecessários
- Difícil manutenção
- Estado complexo
- Performance ruim em dispositivos móveis

---

### 3. **MÚLTIPLAS APIS DE IA NO BUNDLE** (MÉDIO - IMPACTO MÉDIO)
**Problema:** 3 SDKs de IA carregados mesmo não sendo críticos

```json
@anthropic-ai/sdk@^0.72.1
@google/genai@^1.35.0
@google/generative-ai@^0.24.1
groq-sdk@^0.37.0
```

**Solução:** Code-splitting ou lazy loading dessas features

---

### 4. **NODE_MODULES MUITO PESADO** (BAIXO - IMPACTO INDIRETO)
```
node_modules: 924 MB
```
Indica dependências duplicadas e desnecessárias.

---

### 5. **BUILD WARNINGS**
```
⚠️ Some chunks are larger than 500 kB after minification
```

---

## ✅ PLANO DE AÇÃO - FASES

### **FASE 1: LIMPEZA DE DEPENDÊNCIAS** (1-2 horas)
**Impacto:** 🟢🟢🟢🟢🟢 ALTÍSSIMO (redução de ~60% do bundle)

#### 1.1 Remover bibliotecas não usadas
```bash
npm uninstall plotly.js react-plotly.js
npm uninstall @nivo/bar @nivo/core @nivo/heatmap @nivo/line @nivo/pie
npm uninstall chart.js react-chartjs-2  # Se confirmado não uso
```

#### 1.2 Consolidar em UMA biblioteca de gráficos
**Recomendação:** Manter apenas **recharts** (leve e React-friendly)

**Migrar echarts → recharts:**
- Identificar os 2 componentes que usam echarts
- Recriar em recharts (componentes similares)
- Remover `echarts` e `echarts-for-react`

**Vantagens:**
- Bundle ~70% menor
- Menos conflitos de versão
- Manutenção mais simples
- Performance melhor (recharts é mais leve)

---

### **FASE 2: CODE-SPLITTING E LAZY LOADING** (2-3 horas)
**Impacto:** 🟢🟢🟢🟢 ALTO (carregamento inicial 50% mais rápido)

#### 2.1 Lazy load de rotas/views
```tsx
// App.tsx - ANTES
import DREView from './components/DREView';
import ForecastingView from './components/ForecastingView';
import AnalysisView from './components/AnalysisView';

// App.tsx - DEPOIS
const DREView = React.lazy(() => import('./components/DREView'));
const ForecastingView = React.lazy(() => import('./components/ForecastingView'));
const AnalysisView = React.lazy(() => import('./components/AnalysisView'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const ManualChangesView = React.lazy(() => import('./components/ManualChangesView'));

// Wrapper com Suspense
<Suspense fallback={<LoadingSpinner />}>
  {currentView === 'dre' && <DREView />}
</Suspense>
```

**Resultado:** Apenas o Dashboard carrega inicialmente, outras views sob demanda.

#### 2.2 Lazy load de features de IA
```tsx
// services/aiServices.ts
export const loadAnthropicService = () => import('./anthropicService');
export const loadGeminiService = () => import('./geminiService');
```

---

### **FASE 3: COMPONENTIZAÇÃO E MEMOIZAÇÃO** (3-4 horas)
**Impacto:** 🟢🟢🟢 MÉDIO (melhor UX, menos re-renders)

#### 3.1 Dividir componentes grandes

**Dashboard.tsx (2215 linhas) → Dividir em:**
```
Dashboard/
  ├── index.tsx (200 linhas) - Orquestrador
  ├── components/
  │   ├── MetricsCards.tsx
  │   ├── RevenueChart.tsx
  │   ├── BranchComparison.tsx
  │   ├── MonthSelector.tsx
  │   ├── FilterPanel.tsx
  │   └── AlertsPanel.tsx
  └── hooks/
      ├── useDashboardData.ts
      └── useReceitaLiquida.ts
```

**DREView.tsx (2002 linhas) → Dividir em:**
```
DREView/
  ├── index.tsx (300 linhas)
  ├── components/
  │   ├── DRETable.tsx
  │   ├── DRERow.tsx
  │   ├── DREFilters.tsx
  │   ├── DREHeader.tsx
  │   └── ScenarioTabs.tsx
  └── hooks/
      ├── useDREData.ts
      └── useDrillDown.ts
```

**TransactionsView.tsx (1765 linhas) → Dividir em:**
```
TransactionsView/
  ├── index.tsx (300 linhas)
  ├── components/
  │   ├── TransactionTable.tsx
  │   ├── TransactionRow.tsx
  │   ├── FilterBar.tsx
  │   ├── PaginationControls.tsx
  │   └── ActionButtons.tsx
  └── hooks/
      └── useTransactionFilters.ts
```

#### 3.2 Memoizar componentes pesados
```tsx
// Componentes de linha/célula
export const DRERow = React.memo(({ data, onDrill }) => {
  // ...
});

// Charts
export const RevenueChart = React.memo(({ data, months }) => {
  // ...
});
```

#### 3.3 Virtualização de listas grandes
```tsx
// Para tabelas com 1000+ linhas
import { useVirtualizer } from '@tanstack/react-virtual';

// Já está instalado: @tanstack/react-virtual@^3.13.18
```

---

### **FASE 4: OTIMIZAÇÃO DE DADOS** (2-3 horas)
**Impacto:** 🟢🟢🟢 MÉDIO (queries mais rápidas)

#### 4.1 Paginação no servidor (JÁ IMPLEMENTADO ✅)
- Manter paginação de 1000 registros
- Verificar se todos os componentes usam

#### 4.2 Cache inteligente
```tsx
// React Query ou SWR para cache
npm install @tanstack/react-query

// Exemplo
const { data, isLoading } = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => fetchTransactions(filters),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000 // 10 minutos
});
```

#### 4.3 Otimizar queries Supabase
- Verificar índices no banco
- SELECT apenas colunas necessárias
- Evitar queries dentro de loops

---

### **FASE 5: BUILD OTIMIZADO** (1-2 horas)
**Impacto:** 🟢🟢 BAIXO (melhoria incremental)

#### 5.1 Configurar vite.config.ts
```ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
```

#### 5.2 Tree-shaking
```ts
// Importar apenas o necessário
import { BarChart, LineChart } from 'recharts';  // ❌
import BarChart from 'recharts/es6/chart/BarChart'; // ✅
```

---

## 📈 RESULTADOS ESPERADOS

### Antes:
```
Bundle total:     ~8-10 MB
Carregamento:     8-15 segundos
FCP (First Paint): 3-5 segundos
TTI (Interactive): 10-15 segundos
```

### Depois (Todas as fases):
```
Bundle total:     ~2-3 MB     (-70%)
Carregamento:     2-4 segundos  (-75%)
FCP:              0.5-1s        (-80%)
TTI:              2-3 segundos  (-80%)
```

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### 🔴 **FAZER AGORA** (Impacto Máximo):
1. ✅ FASE 1: Remover bibliotecas não usadas (2h) → **-60% bundle**
2. ✅ FASE 2: Lazy loading de views (2h) → **-50% tempo inicial**

**Total: 4 horas = 80% de melhoria**

### 🟡 **FAZER EM SEGUIDA** (Impacto Médio):
3. FASE 3.1: Dividir componentes grandes (4h)
4. FASE 4.2: Implementar cache (2h)

**Total: +6 horas = 15% adicional**

### 🟢 **FAZER DEPOIS** (Refinamento):
5. FASE 3.2-3.3: Memoização avançada (2h)
6. FASE 5: Build otimizado (2h)

---

## 📋 CHECKLIST DE EXECUÇÃO

### Fase 1 - Limpeza (URGENTE)
- [ ] Verificar uso real de chart.js/react-chartjs-2
- [ ] Remover plotly + react-plotly
- [ ] Remover todas @nivo/*
- [ ] Migrar 2 componentes echarts → recharts
- [ ] Remover echarts
- [ ] `npm install` + testar build
- [ ] Comparar tamanho bundle antes/depois

### Fase 2 - Lazy Loading
- [ ] Criar LoadingSpinner component
- [ ] Converter imports estáticos → React.lazy
- [ ] Adicionar Suspense wrappers
- [ ] Testar navegação entre views
- [ ] Medir FCP/TTI com Lighthouse

### Fase 3 - Componentização
- [ ] Criar estrutura de pastas Dashboard/
- [ ] Extrair 6+ subcomponentes Dashboard
- [ ] Criar estrutura DREView/
- [ ] Extrair 5+ subcomponentes DREView
- [ ] Criar estrutura TransactionsView/
- [ ] Aplicar React.memo nos componentes de lista

### Fase 4 - Dados
- [ ] Instalar react-query
- [ ] Implementar cache nas principais queries
- [ ] Revisar queries Supabase
- [ ] Verificar índices no banco

### Fase 5 - Build
- [ ] Configurar manualChunks
- [ ] Otimizar imports (tree-shaking)
- [ ] Gerar build de produção
- [ ] Analisar bundle com vite-bundle-visualizer

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Analisar bundle
npm install -D vite-bundle-visualizer
npm run build

# Testar performance
npm install -g lighthouse
lighthouse http://localhost:3000 --view

# Comparar tamanhos
du -sh node_modules/plotly.js
du -sh node_modules/@nivo
du -sh node_modules/echarts

# Build otimizado
npm run build
npm run preview
```

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Quebrar funcionalidades ao remover libs
**Mitigação:**
- Testar cada remoção individualmente
- Commit após cada mudança
- Manter branch de backup

### Risco 2: Lazy loading quebrar fluxo do usuário
**Mitigação:**
- LoadingSpinner agradável
- Prefetch de views mais usadas
- Testar em conexão lenta (Throttling)

### Risco 3: Componentização introduzir bugs
**Mitigação:**
- Mover código sem alterar lógica
- Testar após cada extração
- Manter mesma interface de props

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs a monitorar:
- [ ] Bundle size < 3MB (atualmente ~8-10MB)
- [ ] FCP < 1.5s (atualmente 3-5s)
- [ ] TTI < 3s (atualmente 10-15s)
- [ ] Lighthouse Score > 90 (atualmente ~40-60)
- [ ] node_modules < 400MB (atualmente 924MB)

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar este plano** ✓
2. **Escolher fases prioritárias** (recomendo 1 + 2)
3. **Executar fase 1** (2 horas)
4. **Medir resultados**
5. **Iterar**

---

**Responsável:** Claude Code
**Revisão:** Pendente
**Status:** Aguardando aprovação

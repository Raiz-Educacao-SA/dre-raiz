# ChartExecutivePanel — Painel Executivo Standalone

> Componente standalone para exibicao de graficos executivos do CEO_GRAFICO.
> Codigo fonte completo: `_reference-code/components/ChartExecutivePanel.tsx`

---

## Quando Usar

Este componente e o panel **standalone** para graficos executivos.
O ChartPanel unificado incorpora esta funcionalidade internamente.
Este componente existe para uso independente fora do chat (ex: Content Studio).

---

## Props

```typescript
interface ChartExecutivePanelProps {
  config: ChartExecutiveConfig | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onChangeType?: (type: string) => void;
  onRegenerate?: () => void;
}
```

---

## Estados Visuais

### Loading
- Spinner animado (border-b-2 rotate)
- Texto: "Gerando grafico executivo..."
- Subtexto: "Analisando dados e aplicando compliance visual"

### Erro
- Borda vermelha
- Icone AlertCircle
- Mensagem de erro
- Botao "Tentar novamente" (se onRegenerate fornecido)

### Sucesso
- Header com tipo + badges (tipo + compliance)
- Area do grafico (SVG ou PNG ou URL)
- Insights colapsaveis
- Compliance warnings (se houver)

---

## Download (com fallback)

### PNG
```
1. Prefere downloadUrl (binary store) → fetch → blob → download
2. Fallback para png_base64 → <a href=base64>.click()
```

### SVG
```
1. Se nao tem svg local, tenta downloadUrl → fetch → blob → download
2. Se tem svg → Blob SVG → URL.createObjectURL → download
```

---

## Mapeamento de Icones por Tipo

```typescript
const CHART_TYPE_ICONS = {
  bar: <BarChart2 />,
  bar_chart: <BarChart2 />,
  line: <LineChart />,
  pie: <PieChart />,
  area: <TrendingUp />,
  grouped_bar: <BarChart2 />,
  waterfall: <BarChart2 />,
  scatter: <TrendingUp />,
  heatmap: <BarChart2 />,
};
```

## Labels por Tipo

```typescript
const CHART_TYPE_LABELS = {
  bar: 'Barras',
  line: 'Linhas',
  pie: 'Pizza',
  area: 'Area',
  grouped_bar: 'Barras Agrupadas',
  waterfall: 'Cascata',
  scatter: 'Dispersao',
  heatmap: 'Mapa de Calor',
  stacked_bar: 'Barras Empilhadas',
  stacked100_bar: 'Barras 100%',
};
```

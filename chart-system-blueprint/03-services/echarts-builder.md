# ECharts Config Builder — Fallback Client-side

> Builder que converte InterpretationResult em config ECharts.
> Usado quando Python nao esta disponivel (fallback) ou no Content Studio.
> Codigo fonte completo: `_reference-code/services/echarts-config.builder.ts`

---

## Funcao Principal

```typescript
function buildEChartsOption(
  interpretation: InterpretationData,
  chartType: string,
  overrides?: Partial<ChartOverrides>
): InteractiveChartConfig
```

---

## Tipos Suportados (9)

| Tipo | Builder | Descricao |
|------|---------|-----------|
| bar | buildBarOption | Barras verticais com rounded top |
| line | buildLineOption | Linhas suaves com pontos |
| pie | buildPieOption | Donut (40%-70% radius) com labels |
| area | buildLineOption(withArea=true) | Linhas com preenchimento 15% opacity |
| waterfall | buildWaterfallOption | Cascata com cores positivo/negativo |
| scatter | buildScatterOption | Dispersao com symbolSize 12 |
| grouped_bar | buildBarOption (reutiliza) | Barras agrupadas por serie |
| stacked_bar | buildStackedBarOption | Barras empilhadas com stack="total" |
| heatmap | buildHeatmapOption | Mapa de calor com visualMap |

---

## Features Comuns

### Tooltip (BR locale)
```typescript
formatter: (params) => {
  // Formata numeros com pt-BR: 1.234,56
  val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
```

### Toolbox
```
- dataZoom: Zoom/restaurar
- restore: Restaurar estado original
- saveAsImage: Salvar como PNG (2x pixelRatio)
```

### Animacao
```typescript
animationDuration: 600
animationEasing: 'cubicOut'
```

### Grid padrao
```typescript
grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true }
```

---

## Cores Padrao (QI_COLORS)

```typescript
const QI_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];
```

---

## Funcoes de Atualizacao (sem rebuild completo)

### changeChartType(config, newType)
Reconstroi config completa com novo tipo.

### updateTitle(title)
Retorna partial option para merge: `{ title: { text: title } }`

### updateAxisLabels(xLabel, yLabel)
Retorna partial option para merge: `{ xAxis: { name: xLabel }, yAxis: { name: yLabel } }`

### updateColors(config, newColors)
Requer rebuild completo (cores sao per-series).

---

## Detalhes por Tipo

### Bar
- borderRadius: [4, 4, 0, 0] (cantos arredondados no topo)
- Label: position 'top', fontSize 11

### Waterfall
- Stack com barra invisivel (base) + barra visivel
- Primeira barra: cor principal
- Positivos: cor verde (#10b981)
- Negativos: cor vermelha (#ef4444)
- Total (se nome contem "total"): cor principal

### Pie
- Donut: radius ['40%', '70%']
- Center: ['50%', '55%']
- Label com nome + percentual
- Tooltip com valor absoluto + percentual

### Heatmap
- visualMap: gradiente de cor transparente → solida
- Label em cada celula com valor formatado
- Eixos categoricos em ambas direcoes

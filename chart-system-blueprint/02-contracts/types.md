# Tipos e Interfaces Completas

> Todas as interfaces TypeScript do sistema de graficos.
> Para reimplementar em outra linguagem, converta estas interfaces.

---

## Tier 1 — Interativo (Recharts)

### ChartType
```typescript
type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'composed';
```

### ChartDataPoint
```typescript
// Ponto de dados generico — 'name' e obrigatorio, demais sao valores numericos
interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

// Exemplos:
// { name: "Jan", value: 100 }
// { name: "Jan", receita: 500, custo: 200 }
```

### ChartSeries
```typescript
interface ChartSeries {
  dataKey: string;    // Key no ChartDataPoint (ex: "value", "receita")
  name: string;       // Nome para exibicao na legenda
  color: string;      // Cor hex (ex: "#3b82f6")
  type?: 'bar' | 'line' | 'area';  // Apenas para 'composed'
}
```

### ChartConfig
```typescript
interface ChartConfig {
  type: ChartType;
  title: string;
  data: ChartDataPoint[];
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;   // true se series.length > 1
  showGrid?: boolean;      // default: true
}
```

### ChartGenerationRequest
```typescript
interface ChartGenerationRequest {
  rawData: string;           // CSV, JSON, ou texto formatado
  chartType?: ChartType;     // Auto-detecta se omitido
  title?: string;
}
```

### ChartGenerationResult
```typescript
interface ChartGenerationResult {
  success: boolean;
  config?: ChartConfig;
  error?: string;
}
```

---

## Interpretacao IA

### InterpretationResult
```typescript
interface InterpretationResult {
  chartType: ChartType;
  title: string;
  extractedData: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  insights?: string;
  _validation?: {
    totalExtracted: number;
    validated: number;
    removed: number;
    warnings: string[];
  };
  _completeness?: {
    score: number;          // 0-1, percentual de numeros extraidos
    numbersInText: number;
    numbersExtracted: number;
    complete: boolean;      // score >= 0.6 ou extracted >= 2
    retried: boolean;
  };
}
```

### ChartInterpretation (formato do JSON que a IA retorna)
```typescript
interface ChartInterpretation {
  chartType: ChartType;
  title: string;
  _analysis: {
    numericValuesFound: number;
    categories: string[];
    valuesListed: number[];
  };
  extractedData: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  insights?: string;
}
```

---

## Tier 2 — Executivo (CEO_GRAFICO)

### SupportedChartType (Python)
```typescript
type SupportedChartType =
  | 'bar' | 'bar_chart' | 'line' | 'pie'
  | 'waterfall' | 'scatter' | 'area'
  | 'grouped_bar' | 'heatmap' | 'stacked_bar'
  | 'stacked100_bar' | 'combo' | 'bullet'
  | 'infographic';
```

### ChartOptions (para Python)
```typescript
interface ChartOptions {
  figsize?: [number, number];     // [largura, altura] em polegadas
  show_values?: boolean;
  donut?: boolean;                // Para pie charts
  small_threshold_pct?: number;
  max_slices?: number;
  x_col?: string;
  y_col?: string;
  size_col?: string;
  bar_width?: number;
  colors?: string[];
  font_family?: string;
  dpi?: number;                   // 72-300
  background_color?: string;
  show_grid?: boolean;
}
```

### ChartGenerationRequest (para Python)
```typescript
interface ChartGenerationRequest {
  action: 'generate' | 'profile' | 'insights';
  data: ChartDataPoint[];
  chart_type?: string;
  title?: string;
  options?: ChartOptions;
}
```

### ChartGenerationResult (do Python)
```typescript
interface ChartGenerationResult {
  success: boolean;
  chart_type?: string;
  svg?: string;                    // SVG markup completo
  png_base64?: string;             // "data:image/png;base64,..."
  insights?: ChartInsight[];
  phrases?: string[];              // Frases narrativas sobre os dados
  profile?: Record<string, unknown>;
  compliance?: ComplianceResult;
  recommendations?: ChartRecommendation[];
  error?: string;
  traceback?: string;
}
```

### ChartInsight
```typescript
interface ChartInsight {
  type: string;        // "trend", "outlier", "comparison"
  category: string;    // "growth", "decline", "stable"
  indicator: string;   // "increasing", "decreasing"
  score: number;       // 0-1
  [key: string]: unknown;
}
```

### ChartRecommendation
```typescript
interface ChartRecommendation {
  type: string;        // tipo de grafico recomendado
  score: number;       // 0-1 (relevancia)
  rule_id: string;     // ID da regra que gerou a recomendacao
  rationale: string;   // Explicacao
}
```

### ComplianceResult
```typescript
interface ComplianceResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  warnings: string[];
  errors: string[];
}
```

---

## Executivo Panel Config

### ChartExecutiveConfig
```typescript
interface ChartExecutiveConfig {
  success: boolean;
  chart_type?: string;
  svg?: string;
  png_base64?: string;
  insights?: ChartInsight[];
  phrases?: string[];
  recommendations?: ChartRecommendation[];
  compliance?: ComplianceResult;
  error?: string;
  downloadUrl?: string;
}
```

---

## Plus Menu

### PlusMenuToggleStates (apenas chart-related)
```typescript
interface PlusMenuToggleStates {
  chartEnabled: boolean;
  // ... outros toggles
}
```

---

## Chart Panel

### ChartPanelMode
```typescript
type ChartPanelMode = 'interactive' | 'executive';
```

### ChartPanelProps
```typescript
interface ChartPanelProps {
  interactiveConfig: ChartConfig | null;
  executiveConfig: ChartExecutiveConfig | null;
  mode: ChartPanelMode;
  isGeneratingInteractive: boolean;
  isGeneratingExecutive: boolean;
  error: string | null;
  onClose: () => void;
  onChangeType?: (type: ChartType) => void;
  onRequestExecutive?: () => void;
  onChangeExecutiveType?: (type: string) => void;
}
```

---

## Content Studio (Chart Agent)

### ChartAgentInput
```typescript
interface ChartAgentInput {
  sourceContext: string;
  communicativeIntent?: string;
  chartType?: string;
  title?: string;
  styleGuide?: StyleGuide;
  options?: {
    show_values?: boolean;
    show_grid?: boolean;
    figsize?: [number, number];
    dpi?: number;
    colors?: string[];
  };
}
```

### ChartAgentResult
```typescript
interface ChartAgentResult {
  success: boolean;
  chartType?: string;
  title?: string;
  svg?: string;
  pngBase64?: string;
  insights?: Array<{
    type: string;
    category: string;
    indicator: string;
    score?: number;
  }>;
  recommendations?: ChartRecommendation[];
  interpretation?: InterpretationResult;
  error?: string;
  latencyMs?: number;
}
```

---

## ECharts Builder

### InteractiveChartConfig (ECharts)
```typescript
interface InteractiveChartConfig {
  option: EChartsOption;      // Config completa do ECharts
  chartType: string;
  dataPoints: ChartDataPoint[];
  seriesKeys: string[];
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  colors: string[];
}
```

### ChartOverrides
```typescript
interface ChartOverrides {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  colors: string[];
  showValues: boolean;
  showGrid: boolean;
}
```

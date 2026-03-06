# API Routes — Contratos Completos

---

## POST /api/charts/interpret

**Proposito**: Interpretacao de dados via IA (sem renderizacao)

### Request
```json
{
  "content": "string (min: 1, max: 10000) — texto com dados para interpretar"
}
```

### Response (sucesso)
```json
{
  "success": true,
  "data": {
    "chartType": "bar",
    "title": "Vendas por Mes",
    "extractedData": [
      { "name": "Jan", "value": 100 },
      { "name": "Fev", "value": 150 }
    ],
    "xAxisLabel": "Mes",
    "yAxisLabel": "Vendas",
    "insights": "Crescimento de 50%"
  },
  "validation": {
    "totalExtracted": 2,
    "validated": 2,
    "removed": 0,
    "warnings": []
  },
  "completeness": {
    "score": 1.0,
    "numbersInText": 2,
    "numbersExtracted": 2,
    "complete": true,
    "retried": false
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Response (erro)
```json
{
  "success": false,
  "error": {
    "code": "INTERPRETATION_FAILED",
    "message": "Nao foi possivel interpretar o pedido."
  }
}
```

### Validacao Zod
```typescript
z.object({
  content: z.string().min(1).max(10000),
})
```

### Auth: Requerida
### Metodo: POST
### Status codes: 200, 400, 422, 500

---

## POST /api/charts/generate

**Proposito**: Gera grafico executivo via CEO_GRAFICO (Python)

### Request
```json
{
  "data": [
    { "name": "Jan", "value": 100 },
    { "name": "Fev", "value": 150 }
  ],
  "chartType": "bar",
  "title": "Vendas por Mes",
  "options": {
    "figsize": [10, 6],
    "show_values": true,
    "dpi": 150,
    "colors": ["#3b82f6", "#10b981"],
    "show_grid": true
  }
}
```

**Nota**: `data` pode ser array de objetos OU string (CSV/JSON) — sera normalizado pelo service.

### Response (sucesso)
```json
{
  "success": true,
  "chart_type": "bar",
  "svg": "<svg xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "png_base64": "data:image/png;base64,iVBOR...",
  "insights": [
    {
      "type": "trend",
      "category": "growth",
      "indicator": "increasing",
      "score": 0.85
    }
  ],
  "phrases": ["Crescimento consistente de 50% entre Jan e Fev"],
  "recommendations": [
    {
      "type": "bar",
      "score": 0.92,
      "rule_id": "R_COMPARISON",
      "rationale": "Dados categorizados ideais para comparacao"
    }
  ],
  "compliance": {
    "passed": true,
    "checks": [
      { "name": "min_data_points", "passed": true, "message": "OK" },
      { "name": "axis_labels", "passed": true, "message": "OK" }
    ],
    "warnings": [],
    "errors": []
  }
}
```

### Auth: Requerida
### Timeout: 120s (maxDuration)
### Status codes: 200, 400, 500

---

## POST /api/charts/profile

**Proposito**: Analisa dados e recomenda tipos de grafico

### Request
```json
{
  "data": [
    { "name": "Jan", "value": 100 },
    { "name": "Fev", "value": 150 }
  ]
}
```

### Response
```json
{
  "success": true,
  "profile": {
    "row_count": 2,
    "numeric_columns": ["value"],
    "categorical_columns": ["name"],
    "has_time_series": false
  },
  "recommendations": [
    { "type": "bar", "score": 0.92, "rule_id": "R1", "rationale": "..." },
    { "type": "pie", "score": 0.78, "rule_id": "R2", "rationale": "..." }
  ]
}
```

### Auth: Requerida
### Status codes: 200, 400, 500

---

## POST /api/content-studio/chart

**Proposito**: Geracao completa (IA + Python + fallback ECharts)

### Request
```json
{
  "sourceContext": "Em janeiro vendemos 500 mil, fevereiro 600 mil, marco 750 mil",
  "communicativeIntent": "Mostrar crescimento de vendas",
  "chartType": "bar",
  "title": "Evolucao de Vendas Q1",
  "options": {
    "show_values": true,
    "show_grid": true,
    "figsize": [10, 6],
    "dpi": 150,
    "colors": ["#3b82f6"]
  },
  "workspaceId": "uuid-optional",
  "saveArtifact": true
}
```

### Validacao Zod
```typescript
z.object({
  sourceContext: z.string().min(10),
  communicativeIntent: z.string().max(500).optional(),
  chartType: z.enum([
    'bar', 'line', 'pie', 'area', 'waterfall',
    'scatter', 'grouped_bar', 'heatmap', 'stacked_bar'
  ]).optional(),
  title: z.string().max(200).optional(),
  options: z.object({
    show_values: z.boolean().optional(),
    show_grid: z.boolean().optional(),
    figsize: z.tuple([z.number(), z.number()]).optional(),
    dpi: z.number().min(72).max(300).optional(),
    colors: z.array(z.string()).optional(),
  }).optional(),
  workspaceId: z.string().uuid().optional(),
  saveArtifact: z.boolean().optional().default(true),
})
```

### Response (completa - Python disponivel)
```json
{
  "success": true,
  "data": {
    "chart_type": "bar",
    "title": "Evolucao de Vendas Q1",
    "svg": "<svg>...</svg>",
    "png_base64": "data:image/png;base64,...",
    "insights": [...],
    "artifactId": "uuid",
    "latencyMs": 8500,
    "interpretation": {
      "extractedData": [...],
      "chartType": "bar",
      "title": "Evolucao de Vendas Q1",
      "xAxisLabel": "Mes",
      "yAxisLabel": "Vendas (mil)"
    }
  }
}
```

### Response (parcial - Python indisponivel, fallback client-side)
```json
{
  "success": true,
  "data": {
    "chart_type": "bar",
    "title": "Evolucao de Vendas Q1",
    "interpretation": {
      "extractedData": [
        { "name": "Janeiro", "value": 500 },
        { "name": "Fevereiro", "value": 600 },
        { "name": "Marco", "value": 750 }
      ],
      "chartType": "bar",
      "title": "Evolucao de Vendas Q1",
      "xAxisLabel": "Mes",
      "yAxisLabel": "Vendas (mil)"
    },
    "latencyMs": 2100
  }
}
```

### GET /api/content-studio/chart

**Proposito**: Lista tipos disponiveis e status do ambiente

### Response
```json
{
  "success": true,
  "data": {
    "chartTypes": [
      { "id": "auto", "name": "Automatico", "description": "A IA escolhe o melhor tipo" },
      { "id": "bar", "name": "Barras", "description": "Comparacao entre categorias" },
      { "id": "line", "name": "Linhas", "description": "Tendencias e series temporais" },
      { "id": "pie", "name": "Pizza", "description": "Proporcoes e distribuicoes" },
      { "id": "area", "name": "Area", "description": "Volume acumulado" },
      { "id": "waterfall", "name": "Waterfall", "description": "Variacao entre valores" },
      { "id": "scatter", "name": "Dispersao", "description": "Correlacao entre variaveis" },
      { "id": "grouped_bar", "name": "Barras Agrupadas", "description": "Multiplas series" },
      { "id": "heatmap", "name": "Mapa de Calor", "description": "Densidade de valores" },
      { "id": "stacked_bar", "name": "Barras Empilhadas", "description": "Composicao" }
    ],
    "pythonEnvironment": {
      "available": true,
      "pythonVersion": "Python 3.11.5"
    },
    "supportedFormats": ["svg", "png"],
    "defaultOptions": {
      "show_values": true,
      "show_grid": true,
      "dpi": 150
    }
  }
}
```

### Auth: POST requerida, GET publica
### Timeout: 60s (maxDuration)
### Status codes: 200, 400, 503, 500

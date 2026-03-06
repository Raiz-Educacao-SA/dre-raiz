# Protocolo CEO_GRAFICO — stdin/stdout JSON

> O backend Python comunica via stdin/stdout com objetos JSON.
> Este protocolo e stack-agnostic — qualquer linguagem pode implementar.

---

## Visao Geral

```
Processo pai (Node.js, Go, etc.)
  │
  ├── Inicia: spawn('python3', ['main.py'], { cwd: 'ceo_grafico/' })
  │
  ├── Envia: stdin.write(JSON.stringify(request)) + stdin.end()
  │
  ├── Recebe: stdout (JSON string completa)
  │
  ├── Erro: stderr (traceback Python)
  │
  └── Exit code: 0 = sucesso, != 0 = erro
```

---

## Request Format

```json
{
  "action": "generate | profile | insights",
  "data": [
    { "name": "Jan", "value": 100 },
    { "name": "Fev", "value": 150 },
    { "name": "Mar", "value": 200 }
  ],
  "chart_type": "bar",
  "title": "Vendas por Mes",
  "options": {
    "figsize": [10, 6],
    "show_values": true,
    "donut": false,
    "small_threshold_pct": 3,
    "max_slices": 10,
    "x_col": null,
    "y_col": null,
    "size_col": null,
    "bar_width": 0.8,
    "colors": ["#3b82f6", "#10b981", "#f59e0b"],
    "font_family": "Arial",
    "dpi": 150,
    "background_color": "#ffffff",
    "show_grid": true
  }
}
```

---

## Response Format

### action: "generate"
```json
{
  "success": true,
  "chart_type": "bar",
  "svg": "<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='600'>...</svg>",
  "png_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "insights": [
    {
      "type": "trend",
      "category": "growth",
      "indicator": "increasing",
      "score": 0.85,
      "text": "Crescimento consistente"
    }
  ],
  "phrases": [
    "Crescimento de 50% entre Janeiro e Fevereiro",
    "Marco representa o pico com 200 unidades"
  ],
  "recommendations": [
    {
      "type": "bar",
      "score": 0.92,
      "rule_id": "R_COMPARISON",
      "rationale": "Dados com categorias distintas ideais para comparacao"
    },
    {
      "type": "line",
      "score": 0.75,
      "rule_id": "R_TIME_SERIES",
      "rationale": "Dados parecem ter componente temporal"
    }
  ],
  "compliance": {
    "passed": true,
    "checks": [
      { "name": "min_data_points", "passed": true, "message": "3 pontos >= minimo (2)" },
      { "name": "axis_labels", "passed": true, "message": "Eixos rotulados" },
      { "name": "color_contrast", "passed": true, "message": "Cores com contraste adequado" }
    ],
    "warnings": [],
    "errors": []
  }
}
```

### action: "profile"
```json
{
  "success": true,
  "profile": {
    "row_count": 3,
    "column_count": 2,
    "numeric_columns": ["value"],
    "categorical_columns": ["name"],
    "has_time_series": false,
    "has_negative_values": false,
    "max_value": 200,
    "min_value": 100,
    "unique_categories": 3
  },
  "recommendations": [
    { "type": "bar", "score": 0.92, "rule_id": "R1", "rationale": "..." },
    { "type": "pie", "score": 0.78, "rule_id": "R2", "rationale": "..." },
    { "type": "line", "score": 0.65, "rule_id": "R3", "rationale": "..." }
  ]
}
```

### action: "insights"
```json
{
  "success": true,
  "insights": [
    { "type": "trend", "category": "growth", "indicator": "increasing", "score": 0.85 },
    { "type": "outlier", "category": "peak", "indicator": "Mar", "score": 0.7 }
  ],
  "phrases": [
    "Crescimento medio de 41% entre meses consecutivos",
    "Marco foi o mes com melhor performance"
  ]
}
```

### Erro
```json
{
  "success": false,
  "error": "Mensagem descritiva do erro",
  "traceback": "Traceback (most recent call last):\n  File..."
}
```

---

## Tipos de Grafico (chart_type)

```
bar, bar_chart, line, pie, waterfall, scatter, area,
grouped_bar, heatmap, stacked_bar, stacked100_bar,
combo, bullet, infographic
```

---

## Timeout

Default: **30 segundos**. Se o processo exceder, e terminado.

---

## Python Environment Check

Para verificar se o ambiente esta pronto:

```bash
# Verificar Python
python3 --version

# Verificar dependencias
python3 -c "import matplotlib, pandas, numpy, yaml"
```

Dependencias obrigatorias:
- matplotlib >= 3.x
- pandas >= 2.x
- numpy >= 1.x
- pyyaml >= 6.x

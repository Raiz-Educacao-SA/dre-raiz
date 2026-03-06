# Tool Definitions — LLM-Callable

> Estas sao as definicoes de tools que o LLM pode chamar durante uma conversa.
> O sistema de chat registra esses tools e o LLM decide quando usa-los.

---

## GenerateChart (Interativo)

```json
{
  "name": "GenerateChart",
  "description": "Gera configuracoes de graficos interativos (bar, line, pie, area, composed) a partir de dados brutos. Retorna configuracao JSON para renderizacao no frontend. Auto-detecta tipo de grafico se nao especificado.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "rawData": {
        "type": "string",
        "description": "Dados brutos em CSV, JSON (array de objetos), ou texto formatado com chave:valor"
      },
      "chartType": {
        "type": "string",
        "enum": ["bar", "line", "pie", "area", "composed"],
        "description": "Tipo de grafico preferido (auto-detecta se omitido)"
      },
      "title": {
        "type": "string",
        "description": "Titulo do grafico"
      }
    },
    "required": ["rawData"]
  }
}
```

### Fluxo de Execucao
```
1. Valida rawData nao vazio
2. interpretChartData(rawData) → IA extrai dados
3. Valida minimo 2 data points
4. ChartGeneratorService.generateChart(dados da IA)
5. Aplica labels da interpretacao
6. Retorna ChartConfig como JSON
```

### Output Format
```markdown
## Grafico Gerado
- Tipo: bar
- Titulo: Vendas por Mes
- Pontos de dados: 3
- Series: Value

### Configuracao JSON
```json
{ "type": "bar", "title": "...", "data": [...], "series": [...] }
```

### Interpretacao
- Crescimento de 50% ao longo do periodo
```

---

## ExecutiveChart (Python/CEO_GRAFICO)

```json
{
  "name": "ExecutiveChart",
  "description": "Gera graficos executivos de alta qualidade via Python (matplotlib). Produz SVG e PNG. Suporta: bar, line, pie, waterfall, scatter, area, grouped_bar, heatmap, stacked_bar, combo, bullet, infographic. Requer Python3 com matplotlib/pandas/numpy instalados.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["generate", "profile", "insights"],
        "description": "Acao: generate (gerar grafico), profile (analisar dados e recomendar tipo), insights (extrair insights sem grafico)"
      },
      "data": {
        "type": "array",
        "items": { "type": "object" },
        "description": "Array de objetos com os dados. Ex: [{\"mes\": \"Jan\", \"valor\": 100}]"
      },
      "chartType": {
        "type": "string",
        "enum": [
          "bar", "line", "pie", "waterfall", "scatter", "area",
          "grouped_bar", "heatmap", "stacked_bar", "stacked100_bar",
          "combo", "bullet", "infographic"
        ],
        "description": "Tipo de grafico (auto-seleciona se omitido)"
      },
      "title": {
        "type": "string",
        "description": "Titulo do grafico"
      },
      "options": {
        "type": "object",
        "description": "Opcoes avancadas de renderizacao",
        "properties": {
          "figsize": {
            "type": "array",
            "items": { "type": "number" },
            "description": "Dimensoes [largura, altura] em polegadas"
          },
          "show_values": {
            "type": "boolean",
            "description": "Mostrar valores nas barras/pontos"
          },
          "donut": {
            "type": "boolean",
            "description": "Formato donut para pie charts"
          },
          "x_col": {
            "type": "string",
            "description": "Coluna para eixo X"
          },
          "y_col": {
            "type": "string",
            "description": "Coluna para eixo Y"
          },
          "color_palette": {
            "type": "string",
            "description": "Paleta de cores"
          }
        }
      }
    },
    "required": ["action", "data"]
  }
}
```

### Fluxo de Execucao (action: "generate")
```
1. Valida action e data
2. checkPythonEnvironment() → verifica Python3 + deps
3. Se dados sem valores numericos → interpretChartData(JSON.stringify(data))
4. generateChart(data, { chartType, title, options })
5. Python gera SVG + PNG + insights
6. Retorna resultado formatado com [SVG_CHART] e [PNG_BASE64] tags
```

### Fluxo de Execucao (action: "profile")
```
1. profileData(data) → Python analisa e recomenda tipos
2. Retorna perfil dos dados + graficos recomendados
```

### Fluxo de Execucao (action: "insights")
```
1. generateInsights(data) → Python extrai insights
2. Retorna insights estruturados + frases narrativas
```

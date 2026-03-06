# Fluxo de Dados Completo

## 1. Entrada do Usuario

O usuario interage com o sistema de 3 formas:

### Via Chat (Plus Menu)
```
1. Usuario abre Plus Menu no chat input
2. Ativa toggle "Grafico" (chartEnabled = true)
3. Envia mensagem com dados:
   - Texto natural: "Faca um grafico: Jan 100, Fev 150, Mar 200"
   - CSV: "mes,valor\nJan,100\nFev,150"
   - JSON: [{"name":"Jan","value":100}]
   - Key-value: "Jan: 100\nFev: 150"
```

### Via LLM Tool Call
```
1. LLM identifica necessidade de grafico na conversa
2. Chama tool GenerateChart ou ExecutiveChart
3. Passa dados extraidos como rawData
```

### Via Content Studio API
```
1. POST /api/content-studio/chart
2. Body com sourceContext (texto), chartType, options
```

## 2. Interpretacao via IA

**TODAS as entradas passam por este passo**

```
Texto bruto do usuario
  │
  ▼
interpretChartData(content, apiKey?)
  │
  ├── Envia para Claude AI com system prompt especializado
  │   - Prompt com 4 etapas obrigatorias:
  │     1. IDENTIFICACAO: encontra TODOS os numeros
  │     2. ASSOCIACAO: mapeia numero → categoria
  │     3. ESTRUTURACAO: monta JSON
  │     4. VERIFICACAO: confere completude
  │
  ├── Recebe JSON estruturado:
  │   {
  │     chartType: "bar",
  │     title: "Vendas por Mes",
  │     _analysis: { numericValuesFound: 3, categories: [...], valuesListed: [...] },
  │     extractedData: [{ name: "Jan", value: 100 }, ...],
  │     xAxisLabel: "Mes",
  │     yAxisLabel: "Vendas"
  │   }
  │
  ├── Valida completude (validateCompleteness)
  │   - Se score < 0.6 e > 2 numeros no texto → RETRY com prompt explicito
  │
  ├── Valida dados contra texto original (validateExtractedData)
  │   - Cada valor numerico deve existir no texto original
  │   - Remove data points com valores inventados
  │
  └── Retorna InterpretationResult
      {
        chartType, title, extractedData,
        xAxisLabel, yAxisLabel, insights,
        _validation: { totalExtracted, validated, removed, warnings },
        _completeness: { score, numbersInText, numbersExtracted, complete, retried }
      }
```

## 3a. Tier 1 - Grafico Interativo

```
InterpretationResult
  │
  ▼
ChartGeneratorService.generateChart({
  rawData: JSON.stringify(extractedData),
  chartType: interpretation.chartType,
  title: interpretation.title
})
  │
  ├── parseData(rawData)
  │   ├── Tenta JSON (startsWith '[' ou '{')
  │   ├── Tenta CSV (contem ',', '\t', ';')
  │   ├── Tenta key-value (contem ':' ou '=')
  │   └── Tenta lista simples (numero por linha)
  │
  ├── detectSeries(data)
  │   - Identifica todas as keys numericas no primeiro data point
  │   - Gera ChartSeries[] com dataKey, name, color
  │
  ├── detectChartType(data, series)
  │   - 1 serie + ≤8 items → pie
  │   - >10 items → line
  │   - 1 serie ou ≤6 items → bar
  │   - >2 series → composed
  │   - default → bar
  │
  └── Retorna ChartConfig
      {
        type: "bar",
        title: "Vendas por Mes",
        data: [{ name: "Jan", value: 100 }, ...],
        series: [{ dataKey: "value", name: "Value", color: "#3b82f6" }],
        showLegend: false,
        showGrid: true
      }

ChartConfig
  │
  ▼
ChartPanel.tsx (Recharts)
  │
  ├── renderChart(config, type)
  │   ├── 'bar' → <BarChart> + <Bar>
  │   ├── 'line' → <LineChart> + <Line>
  │   ├── 'area' → <AreaChart> + <Area>
  │   ├── 'pie' → <PieChart> + <Pie> + <Cell>
  │   └── 'composed' → <ComposedChart> + mix de Bar/Line/Area
  │
  └── Renderiza no <ResponsiveContainer> com 100% width
```

## 3b. Tier 2 - Grafico Executivo

```
Usuario clica "Analise Executiva" no ChartPanel
  │
  ▼
useChatPanels.handleRequestExecutiveChart()
  │
  ├── Pega chartConfig.data (dados estruturados)
  ├── POST /api/charts/generate
  │   Body: { data, chartType, title }
  │
  ▼
API Route: /api/charts/generate
  │
  ├── normalizeChartData(body.data) → ChartDataPoint[]
  ├── generateChart(data, { chartType, title, chartOptions })
  │
  ▼
ceo-grafico.service.ts → executePython(request)
  │
  ├── spawn('python3', ['main.py'], { cwd: 'ceo_grafico/', timeout: 30000 })
  ├── stdin.write(JSON.stringify({
  │     action: 'generate',
  │     data: [...],
  │     chart_type: 'bar',
  │     title: 'Vendas por Mes',
  │     options: { figsize: [10,6], show_values: true, dpi: 150 }
  │   }))
  ├── stdin.end()
  │
  ├── stdout → JSON response
  │   {
  │     success: true,
  │     chart_type: "bar",
  │     svg: "<svg>...</svg>",
  │     png_base64: "data:image/png;base64,...",
  │     insights: [{ type: "trend", category: "growth", indicator: "increasing", score: 0.8 }],
  │     phrases: ["Crescimento de 50% entre Jan e Mar"],
  │     recommendations: [{ type: "bar", score: 0.9, rule_id: "R1", rationale: "..." }],
  │     compliance: { passed: true, checks: [...], warnings: [], errors: [] }
  │   }
  │
  ▼
ChartPanel modo "executive"
  ├── Exibe SVG (sanitizado com DOMPurify)
  ├── Mostra insights numerados
  ├── Badge "Compliance OK" se compliance.passed
  ├── Botoes download PNG/SVG
  └── Seletor de tipo alternativo (com scores)
```

## 4. Content Studio Flow (alternativo)

```
POST /api/content-studio/chart
  │
  ├── Valida com Zod (generateChartSchema)
  │   { sourceContext, communicativeIntent?, chartType?, title?, options?, workspaceId?, saveArtifact? }
  │
  ├── ChartAgentService.generate(input)
  │   ├── Step 1: interpretChartData(sourceContext)
  │   ├── Step 2: Determina chartType
  │   ├── Step 3: Aplica styleGuide (cores, fonte)
  │   ├── Step 4: ceoGenerateChart(data, options)
  │   └── Retorna ChartAgentResult
  │
  ├── Se Python falhar mas IA interpretou OK:
  │   → Retorna interpretation para rendering client-side (ECharts)
  │
  ├── Se saveArtifact=true e PNG disponivel:
  │   → Salva no repositorio de artefatos (DB)
  │
  └── Retorna:
      {
        chart_type, title, svg, png_base64,
        insights, artifactId, latencyMs,
        interpretation: { extractedData, chartType, title, xAxisLabel, yAxisLabel }
      }
```

## 5. Download Flow

### PNG (modo interativo)
```
1. Captura <svg> do Recharts via chartRef
2. XMLSerializer().serializeToString(svg)
3. Cria Blob SVG → URL.createObjectURL
4. Carrega em Image, desenha em Canvas (2x scale para retina)
5. canvas.toDataURL('image/png') → download
```

### PNG (modo executivo)
```
1. Usa png_base64 direto do CEO_GRAFICO
2. Cria <a> com href=base64, download=filename
3. Simula click → download
```

### SVG (modo executivo)
```
1. Usa svg string do CEO_GRAFICO
2. Cria Blob SVG → URL.createObjectURL
3. Cria <a> com href=url, download=filename
4. Simula click → download
5. URL.revokeObjectURL(url) — cleanup
```

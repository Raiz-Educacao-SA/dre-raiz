# Step-by-Step — Ordem de Implementacao

---

## Fase 1: Fundacao (Dias 1-2)

### 1.1 Tipos e interfaces
- Defina todos os tipos de `02-contracts/types.md`
- Comece com ChartDataPoint, ChartConfig, ChartType, ChartSeries

### 1.2 Paleta de cores
- Copie CHART_COLORS_HEX de `05-styling/colors.md`
- Use como constante global

### 1.3 ChartGeneratorService
- Implemente parseData() com 4 formatos (JSON, CSV, key-value, lista)
- Implemente detectSeries()
- Implemente detectChartType()
- Implemente generateChart()
- Referencia: `03-services/chart-generator.md`

### 1.4 Testes do parser
- Teste cada formato de parsing
- Teste deteccao de tipo
- Teste com dados vazios/invalidos

---

## Fase 2: Interpretacao IA (Dias 3-4)

### 2.1 System prompt
- Copie o system prompt COMPLETO de `03-services/chart-interpret.md`
- Adapte a chamada para sua API de LLM

### 2.2 interpretChartData()
- Implemente chamada ao LLM com temperature 0.1
- Implemente parseClaudeResponse() — extrai JSON do response
- Implemente validateExtractedData() — verifica contra texto original
- Implemente validateCompleteness() — score de completude
- Implemente retry automatico se incompleto

### 2.3 Testes de interpretacao
- Teste com texto simples: "Jan 100, Fev 150"
- Teste com texto natural: "Em janeiro vendemos 500 mil..."
- Teste com CSV inline
- Teste com dados insuficientes
- Teste deteccao de tipo (pie vs bar vs line)

---

## Fase 3: Componente de Grafico Interativo (Dias 5-6)

### 3.1 ChartPanel (modo interativo)
- Instale Recharts (ou ECharts)
- Implemente renderChart() para 5 tipos: bar, line, area, pie, composed
- ResponsiveContainer com altura responsiva
- Seletor de tipo (dropdown/select)

### 3.2 Download PNG
- SVG → Canvas → PNG (2x para retina)
- Botao de download

### 3.3 Fullscreen
- Toggle entre inline e overlay fullscreen

### 3.4 Header do panel
- Titulo, icone, loading indicator
- Seletor de tipo
- Botoes de acao (download, fullscreen, fechar)

---

## Fase 4: Integracao no Chat (Dias 7-8)

### 4.1 Feature Toggle (Plus Menu)
- Crie toggle chartEnabled
- Verifique permissoes do usuario

### 4.2 Hook de State Management
- Implemente useChatPanels (ou equivalente) com:
  - chartConfig, isGeneratingChart, chartError
  - setGeneratingChart, onChartGenerated, handleChangeChartType, handleCloseChart

### 4.3 Fluxo no ChatView
- Detecte chartEnabled + mensagem com dados
- Chame interpretChartData → ChartGeneratorService
- Atualize estado via hook
- Renderize ChartPanel

---

## Fase 5: Backend Python — CEO_GRAFICO (Dias 9-12)

### 5.1 Setup Python
- Crie diretorio ceo_grafico/
- Instale matplotlib, pandas, numpy
- Implemente main.py com protocolo stdin/stdout
- Referencia: `06-python-backend/setup.md`

### 5.2 Renderers
- Implemente renderer para cada tipo
- Comece com bar → line → pie
- Depois: waterfall, scatter, heatmap, stacked

### 5.3 Insights engine
- Analise estatistica basica (tendencia, outliers, media)
- Geracao de frases narrativas

### 5.4 Compliance checker
- Validacao de min data points
- Validacao de labels
- Validacao de contraste de cores

### 5.5 Bridge Node↔Python
- Implemente ceo-grafico.service.ts
- spawn + stdin/stdout + timeout
- normalizeChartData()
- checkPythonEnvironment()

---

## Fase 6: Modo Executivo no Frontend (Dias 13-14)

### 6.1 Botao "Analise Executiva"
- Adicione ao ChartPanel
- Chama API /api/charts/generate

### 6.2 Modo executivo do ChartPanel
- Exibe SVG sanitizado (DOMPurify)
- Exibe PNG base64
- Download SVG/PNG
- Seletor de tipo com scores
- Insights numerados
- Compliance badges/warnings

### 6.3 API Routes
- POST /api/charts/generate
- POST /api/charts/interpret
- POST /api/charts/profile

---

## Fase 7: Content Studio (Dias 15-16)

### 7.1 ChartAgentService
- Orquestra IA + CEO_GRAFICO
- Aplica style guide
- Fallback para client-side se Python indisponivel

### 7.2 ECharts Builder (fallback)
- buildEChartsOption() para 9 tipos
- changeChartType(), updateTitle(), updateColors()

### 7.3 API /api/content-studio/chart
- POST com Zod validation
- GET para listar tipos + status Python

---

## Fase 8: LLM Tools (Dias 17-18)

### 8.1 GenerateChart tool
- Tool definition com schema
- Funcao de execucao
- Integracao com sistema de tools do chat

### 8.2 ExecutiveChart tool
- Tool definition com schema
- Funcao de execucao
- Verificacao de ambiente Python

---

## Fase 9: Polish (Dias 19-20)

### 9.1 Sanitizacao
- DOMPurify para SVG (config especifica)
- Sanitizacao de highlights nos insights

### 9.2 Performance
- Lazy loading do ChartPanel (dynamic import)
- Memoizacao do hook

### 9.3 Error handling
- Mensagens amigaveis para cada tipo de erro
- Fallback gracioso (Python → ECharts → Recharts)

### 9.4 Testes E2E
- Fluxo completo: toggle → mensagem → grafico
- Mudanca de tipo
- Download
- Modo executivo

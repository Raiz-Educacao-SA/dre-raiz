# useChatPanels — State Management

> Hook central que gerencia o estado de todos os paineis do chat, incluindo graficos.
> Codigo fonte completo: `_reference-code/hooks/useChatPanels.ts`

---

## Estado de Graficos

```typescript
// Chart state (unified)
chartConfig: ChartConfig | null              // Config interativo (Recharts)
isGeneratingChart: boolean                   // Loading interativo
chartError: string | null                    // Erro
chartPanelMode: ChartPanelMode              // 'interactive' | 'executive'
executiveChartConfig: ChartExecutiveConfig | null  // Config executivo
isGeneratingExecutiveChart: boolean          // Loading executivo
executiveChartError: string | null           // Erro executivo
lastChartContent: string                     // Ultimo conteudo processado
```

---

## Actions de Graficos

### setGeneratingChart(flag: boolean)
Inicia/para loading do grafico interativo.
Se `flag=true`: reseta config, error e modo para 'interactive'.

### onChartGenerated(data, isExecutive?)
Recebe dados gerados e atualiza estado.

```typescript
// Se executivo (tem svg ou png_base64):
setExecutiveChartConfig({ success: true, chart_type, svg, png_base64 })
setChartPanelMode('executive')

// Se interativo:
setChartConfig(data as ChartConfig)
```

### handleChangeChartType(type: ChartType)
Altera tipo do grafico interativo: `setChartConfig({ ...chartConfig, type })`

### handleRequestExecutiveChart()
Solicita geracao de grafico executivo:
```
1. Pega chartConfig.data (dados estruturados do interativo)
2. POST /api/charts/generate { data, chartType, title }
3. Se sucesso: setExecutiveChartConfig(result), setChartPanelMode('executive')
4. Se erro: setExecutiveChartError(message)
```

### handleChangeExecutiveChartType(type: string)
Re-gera grafico executivo com novo tipo:
```
1. POST /api/charts/generate { data: executiveChartConfig, chartType: type, title }
2. Se sucesso: setExecutiveChartConfig(result)
```

### handleCloseChart()
Reseta todo o estado de graficos:
```
chartConfig = null
chartError = null
isGeneratingChart = false
executiveChartConfig = null
executiveChartError = null
isGeneratingExecutiveChart = false
chartPanelMode = 'interactive'
lastChartContent = ''
```

---

## Integracao com ChatView

O ChatView consome o hook e conecta os actions ao fluxo de mensagens:

```typescript
const panels = useChatPanels({ threadId, threadTitle, isAdmin, workspaceId });

// Quando usuario envia mensagem com chartEnabled=true:
// 1. panels.setGeneratingChart(true)
// 2. Processa mensagem (stream ou tool call)
// 3. Quando IA retorna ChartConfig:
//    panels.onChartGenerated(chartData)
// 4. Se erro:
//    panels.setChartError(errorMessage)

// No JSX:
<ChartPanel
  interactiveConfig={panels.chartConfig}
  executiveConfig={panels.executiveChartConfig}
  mode={panels.chartPanelMode}
  isGeneratingInteractive={panels.isGeneratingChart}
  isGeneratingExecutive={panels.isGeneratingExecutiveChart}
  error={panels.chartError}
  onClose={panels.handleCloseChart}
  onChangeType={panels.handleChangeChartType}
  onRequestExecutive={panels.handleRequestExecutiveChart}
  onChangeExecutiveType={panels.handleChangeExecutiveChartType}
/>
```

---

## Performance: useMemo

O hook retorna um objeto memoizado para evitar re-renders desnecessarios.
Todas as dependencias sao listadas explicitamente no array do useMemo.

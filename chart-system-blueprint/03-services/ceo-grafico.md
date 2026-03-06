# CEO_GRAFICO Service — Bridge Node↔Python

> Servico que conecta o Node.js ao backend Python via child_process.
> Codigo fonte completo: `_reference-code/services/ceo-grafico.service.ts`

---

## Arquitetura

```
Node.js (TypeScript)          Python (main.py)
  │                              │
  ├── spawn('python3', ['main.py'], { cwd: 'ceo_grafico/', timeout: 30s })
  ├── stdin.write(JSON.stringify(request))
  ├── stdin.end()
  │                              ├── sys.stdin → json.loads()
  │                              ├── Processa request
  │                              ├── Gera matplotlib figure
  │                              ├── Converte para SVG + PNG base64
  │                              └── sys.stdout → json.dumps(response)
  ├── stdout.on('data') → acumula
  ├── python.on('close', code)
  │   ├── code 0: JSON.parse(stdout) → resolve
  │   └── code != 0: { success: false, error, traceback: stderr }
  └── resolve Promise<ChartGenerationResult>
```

---

## Funcoes Exportadas

### generateChart(data, options?)
Gera grafico completo (SVG + PNG + insights + compliance)

```typescript
async function generateChart(
  data: ChartDataPoint[],
  options?: {
    chartType?: string;
    title?: string;
    chartOptions?: ChartOptions;
  }
): Promise<ChartGenerationResult>
```

Request enviado ao Python:
```json
{
  "action": "generate",
  "data": [{"name": "Jan", "value": 100}, ...],
  "chart_type": "bar",
  "title": "Grafico",
  "options": {
    "figsize": [10, 6],
    "show_values": true,
    "colors": ["#3b82f6"],
    "font_family": "Arial",
    "dpi": 150,
    "show_grid": true
  }
}
```

### profileData(data)
Analisa dados e recomenda tipos de grafico (sem gerar imagem)

```typescript
async function profileData(data: ChartDataPoint[]): Promise<ProfileResult>
```

### generateInsights(data)
Gera apenas insights (sem grafico)

```typescript
async function generateInsights(data: ChartDataPoint[]): Promise<{
  success: boolean;
  insights?: ChartInsight[];
  phrases?: string[];
  error?: string;
}>
```

### generateInfographic(infographicData)
Gera infografico visual

### generatePresentation(spec)
Gera PPTX a partir de SlideSpec JSON

### checkPythonEnvironment()
Verifica se Python3 esta instalado com dependencias

```typescript
async function checkPythonEnvironment(): Promise<{
  available: boolean;
  pythonVersion?: string;
  missingDependencies?: string[];
  error?: string;
}>
```

Verifica:
1. `python3 --version` → version string
2. `python3 -c "import matplotlib, pandas, numpy, yaml"` → deps OK

### normalizeChartData(input)
Converte string/objeto/array para ChartDataPoint[]

```typescript
function normalizeChartData(
  input: string | Record<string, unknown>[] | Record<string, unknown>
): ChartDataPoint[]
```

Aceita:
- Array de objetos → retorna direto
- Objeto unico → [objeto]
- String JSON → parse
- String CSV → parseCSV

---

## Configuracao

```typescript
const PYTHON_CMD = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
const CEO_GRAFICO_PATH = path.join(process.cwd(), 'ceo_grafico');
const MAIN_SCRIPT = path.join(CEO_GRAFICO_PATH, 'main.py');
const DEFAULT_TIMEOUT = 30000; // 30 segundos
```

---

## Tipos de Grafico Suportados pelo Python

```typescript
const SUPPORTED_CHART_TYPES = [
  'bar', 'bar_chart', 'line', 'pie',
  'waterfall', 'scatter', 'area',
  'grouped_bar', 'heatmap', 'stacked_bar',
  'stacked100_bar', 'combo', 'bullet',
  'infographic',
] as const;
```

---

## Tratamento de Erros

```
Python exit code 0 + JSON valido → sucesso
Python exit code 0 + JSON invalido → { success: false, error: "parse error" }
Python exit code != 0 → { success: false, error: "exit code N", traceback: stderr }
Python spawn error → { success: false, error: "spawn error" }
Timeout (30s) → processo morto, reject
```

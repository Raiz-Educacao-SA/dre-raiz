# Arquitetura do Sistema de Graficos

## Visao Geral

O sistema usa uma **arquitetura de 2 camadas (tiers)** para geracao de graficos:

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
│  Abre Plus Menu → Ativa "Grafico" → Envia mensagem com dados│
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     CHAT VIEW                                │
│  Detecta chartEnabled=true → Extrai dados da mensagem        │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐   ┌──────────────────────────┐
│   TIER 1: INTERATIVO │   │   TIER 2: EXECUTIVO       │
│   (Client-side)      │   │   (Server-side)           │
│                      │   │                           │
│  1. IA interpreta    │   │  1. IA interpreta         │
│     texto → JSON     │   │     texto → JSON          │
│  2. ChartGenerator   │   │  2. CEO_GRAFICO (Python)  │
│     gera config      │   │     gera SVG/PNG          │
│  3. Recharts         │   │  3. Insights + Compliance │
│     renderiza        │   │  4. Panel exibe           │
│                      │   │                           │
│  Latencia: ~1-3s     │   │  Latencia: ~5-15s         │
│  Tipos: 5            │   │  Tipos: 13                │
│  Output: Canvas/SVG  │   │  Output: SVG + PNG base64 │
└──────────────────────┘   └──────────────────────────┘
```

## Fluxo Principal

```
1. Plus Menu Toggle
   PlusMenu.tsx → chartEnabled = true

2. Usuario envia mensagem
   ChatView.tsx → detecta chartEnabled + dados

3. Interpretacao IA (compartilhada entre tiers)
   chart-interpret.service.ts → Claude AI → JSON estruturado

4a. Tier 1 - Interativo (padrao)
    chart-generator.service.ts → parseData() → detectChartType() → ChartConfig
    ChartPanel.tsx → Recharts → grafico interativo no browser

4b. Tier 2 - Executivo (sob demanda)
    Usuario clica "Analise Executiva" no ChartPanel
    API /api/charts/generate → ceo-grafico.service.ts → Python subprocess
    ChartPanel modo "executive" → exibe SVG/PNG + insights + compliance
```

## Componentes do Sistema

### Frontend (React/Next.js)

| Componente | Arquivo | Responsabilidade |
|-----------|---------|-----------------|
| PlusMenu | `PlusMenu.tsx` | Feature toggle (ativa/desativa grafico) |
| ChartPanel | `ChartPanel.tsx` | Componente unificado: interativo + executivo |
| ChartExecutivePanel | `ChartExecutivePanel.tsx` | Panel standalone para modo executivo |
| useChatPanels | `useChatPanels.ts` | Hook de state management |
| ChatView | `ChatView.tsx` | Orquestrador do fluxo no chat |

### Services (TypeScript)

| Service | Arquivo | Responsabilidade |
|---------|---------|-----------------|
| ChartGeneratorService | `chart-generator.service.ts` | Parse de dados + geracao de config Recharts |
| interpretChartData | `chart-interpret.service.ts` | IA extrai dados estruturados de texto |
| ceoGraficoService | `ceo-grafico.service.ts` | Bridge Node↔Python via child_process |
| ChartAgentService | `chart-agent.service.ts` | Orquestrador para Content Studio |
| buildEChartsOption | `echarts-config.builder.ts` | Builder de config ECharts (fallback) |

### API Routes (Next.js)

| Rota | Metodo | Responsabilidade |
|------|--------|-----------------|
| `/api/charts/generate` | POST | Gera grafico executivo (CEO_GRAFICO) |
| `/api/charts/interpret` | POST | Interpretacao de dados via IA |
| `/api/charts/profile` | POST | Recomendacao de tipo de grafico |
| `/api/content-studio/chart` | POST/GET | Geracao completa + listagem de tipos |

### LLM Tools

| Tool | Arquivo | Responsabilidade |
|------|---------|-----------------|
| GenerateChart | `generate-chart.tool.ts` | Grafico interativo via LLM |
| ExecutiveChart | `executive-chart.tool.ts` | Grafico executivo via LLM |

### Python Backend (CEO_GRAFICO)

| Componente | Responsabilidade |
|-----------|-----------------|
| main.py | Entry point - recebe JSON via stdin, retorna via stdout |
| Renderers | matplotlib renderers para cada tipo de grafico |
| Profiler | Analisa dados e recomenda tipos |
| Insights Engine | Gera insights narrativos |
| Compliance Checker | Valida regras visuais |

## Padrao de Comunicacao

```
Frontend ←→ API Routes ←→ Services ←→ Python (child_process)
   │                          │
   │  JSON over HTTP          │  JSON over stdin/stdout
   │                          │
   ▼                          ▼
Recharts (browser)      matplotlib (server)
```

### Protocolo com Python

```
Node.js                        Python
  │                              │
  ├── spawn('python3', ['main.py'])
  │                              │
  ├── stdin.write(JSON.stringify(request))
  ├── stdin.end()               │
  │                              │
  │   ← stdout (JSON response) ←┤
  │                              │
  ├── parse JSON result          │
  └── resolve Promise            │
```

## Padrao de Fallback

```
Requisicao de grafico
  │
  ├── Tenta CEO_GRAFICO (Python) → Se disponivel → SVG/PNG
  │
  └── Se Python indisponivel → Retorna dados interpretados
                                → Frontend renderiza com ECharts/Recharts
```

Este fallback garante que o sistema sempre funciona, mesmo sem Python instalado.

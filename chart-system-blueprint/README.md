# Chart System Blueprint

> Blueprint completo do sistema de geracao de graficos do rAIz Platform.
> Projetado para que outro sistema possa aprender e reimplementar toda a funcionalidade.

---

## O Que Este Blueprint Contem

Este pacote documenta com **maximo detalhe** o sistema de graficos de 2 camadas:

| Camada | Tecnologia | Proposito |
|--------|-----------|-----------|
| **Tier 1 - Interativo** | Recharts (React) | Graficos rapidos no browser, feedback instantaneo |
| **Tier 2 - Executivo** | Python/matplotlib (CEO_GRAFICO) | Graficos de alta qualidade SVG/PNG com insights e compliance |

Ambas as camadas sao ativadas via **Plus Menu** no chat e orquestradas pelo hook `useChatPanels`.

---

## Estrutura do Blueprint

```
chart-system-blueprint/
├── README.md                          # Este arquivo
├── 01-architecture/
│   ├── overview.md                    # Arquitetura completa, diagrama de fluxo
│   ├── data-flow.md                   # Fluxo de dados ponta-a-ponta
│   └── decisions.md                   # Decisoes arquiteturais e trade-offs
├── 02-contracts/
│   ├── types.md                       # Todas as interfaces TypeScript
│   ├── api-routes.md                  # Endpoints REST com schemas completos
│   └── tool-definitions.md            # Tools LLM-callable (schemas JSON)
├── 03-services/
│   ├── chart-generator.md             # Service de parsing e geracao (client-side)
│   ├── chart-interpret.md             # Service de interpretacao via IA
│   ├── ceo-grafico.md                 # Bridge Node<>Python
│   ├── chart-agent.md                 # Orquestrador Content Studio
│   └── echarts-builder.md             # Builder ECharts (fallback client-side)
├── 04-components/
│   ├── plus-menu.md                   # Sistema de feature toggles
│   ├── chart-panel.md                 # Componente unificado (Recharts)
│   ├── executive-panel.md             # Componente executivo (SVG/PNG)
│   └── hooks.md                       # useChatPanels - state management
├── 05-styling/
│   ├── colors.md                      # Paleta de cores completa
│   └── chart-types.md                 # Tipos suportados com descricao
├── 06-python-backend/
│   ├── protocol.md                    # Protocolo stdin/stdout JSON
│   └── setup.md                       # Dependencias e configuracao
├── 07-implementation-guide/
│   ├── quickstart.md                  # Minimo viavel
│   ├── step-by-step.md               # Ordem de implementacao
│   └── checklist.md                   # Checklist de completude
└── _reference-code/                   # Codigo fonte completo (referencia)
    ├── services/
    │   ├── chart-generator.service.ts
    │   ├── chart-interpret.service.ts
    │   ├── ceo-grafico.service.ts
    │   ├── chart-agent.service.ts
    │   └── echarts-config.builder.ts
    ├── components/
    │   ├── PlusMenu.tsx
    │   ├── ChartPanel.tsx
    │   └── ChartExecutivePanel.tsx
    ├── api-routes/
    │   ├── charts-generate.route.ts
    │   ├── charts-interpret.route.ts
    │   ├── charts-profile.route.ts
    │   └── content-studio-chart.route.ts
    ├── tools/
    │   ├── generate-chart.tool.ts
    │   └── executive-chart.tool.ts
    ├── hooks/
    │   └── useChatPanels.ts
    └── utils/
        ├── chart-colors.ts
        └── sanitize.ts
```

---

## Como Usar Este Blueprint

### Para entender o sistema
1. Leia `01-architecture/overview.md` - visao geral
2. Leia `01-architecture/data-flow.md` - como os dados fluem
3. Leia `02-contracts/types.md` - interfaces e schemas

### Para reimplementar
1. Siga `07-implementation-guide/step-by-step.md`
2. Use `02-contracts/` como especificacao dos contratos
3. Consulte `_reference-code/` para detalhes de implementacao
4. Valide com `07-implementation-guide/checklist.md`

### Para adaptar a outra stack
- Os contratos em `02-contracts/` sao stack-agnostic
- O protocolo Python em `06-python-backend/protocol.md` funciona com qualquer linguagem
- Os tipos em `02-contracts/types.md` podem ser convertidos para qualquer linguagem tipada

---

## Dependencias do Sistema Original

| Dependencia | Versao | Uso |
|------------|--------|-----|
| React | 18+ | UI components |
| Recharts | 2.x | Graficos interativos (Tier 1) |
| ECharts | 5.x | Graficos interativos alternativo (fallback) |
| Python 3 | 3.9+ | CEO_GRAFICO backend (Tier 2) |
| matplotlib | 3.x | Renderizacao de graficos Python |
| pandas | 2.x | Manipulacao de dados Python |
| numpy | 1.x | Calculos numericos Python |
| Claude API | - | Interpretacao de dados via IA |
| DOMPurify | 3.x | Sanitizacao de SVG/HTML |
| Next.js | 14.x | Framework web (API routes) |
| Zod | 3.x | Validacao de schemas |
| lucide-react | - | Icones |

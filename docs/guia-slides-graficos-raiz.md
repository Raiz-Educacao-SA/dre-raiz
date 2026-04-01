# Guia Tecnico Completo: Sistema de Slides, Graficos e Exportacao - rAIz Platform

> **Versao**: 1.0 | **Data**: Fevereiro 2025
> **Objetivo**: Documentar com detalhes suficientes para replicar a mesma qualidade de slides, graficos e exportacoes em outra plataforma.

---

## Sumario

1. [Visao Geral do Sistema](#1-visao-geral-do-sistema)
2. [Sistema de Slides (PPTX)](#2-sistema-de-slides-pptx)
3. [Sistema de Graficos](#3-sistema-de-graficos)
4. [Integracao Slides + Graficos](#4-integracao-slides--graficos)
5. [Design System & Branding](#5-design-system--branding)
6. [Exportacao de Documentos](#6-exportacao-de-documentos)
7. [Armazenamento e Entrega](#7-armazenamento-e-entrega)
8. [Tratamento de Erros](#8-tratamento-de-erros)
9. [Guia de Replicacao](#9-guia-de-replicacao)

---

## 1. Visao Geral do Sistema

### 1.1 Arquitetura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (Chat)                           │
│         "Crie uma apresentacao sobre vendas Q4"                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT SERVICE (LLM)                           │
│  Decide qual tool chamar com base no pedido do usuario          │
│  - GenerateSlides (PPTX)                                        │
│  - GenerateChart (interativo/Recharts)                          │
│  - ExecutiveChart (estatico/matplotlib)                          │
│  - ExportDocument (PDF/DOCX/XLSX)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────┐
│  SLIDES PIPELINE │ │  CHARTS  │ │   EXPORTS    │
│                  │ │          │ │              │
│ 1. Preparacao IA │ │ Recharts │ │ PDF (pdfmake)│
│ 2. Estruturacao  │ │ (JSON)   │ │ DOCX (docx)  │
│ 3. Render Charts │ │    ou    │ │ XLSX (xlsx)  │
│ 4. Gerar PPTX   │ │ Python   │ │              │
│    (python-pptx) │ │ (matplot)│ │              │
└──────────────────┘ └──────────┘ └──────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CEO_GRAFICO (Python)                          │
│  Bridge Node.js ↔ Python via child_process spawn                │
│  stdin/stdout JSON | Timeout 30s                                │
│                                                                 │
│  Renderers: bar, line, pie, waterfall, scatter, area,           │
│  grouped_bar, heatmap, stacked_bar, combo, bullet, infographic  │
│  + presentation (python-pptx)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Dois Modos de Grafico

| Aspecto | Interativo (Recharts) | Executivo (CEO_GRAFICO) |
|---------|----------------------|------------------------|
| **Biblioteca** | Recharts (React) | matplotlib (Python) |
| **Formato** | JSON config p/ frontend | SVG + PNG |
| **Uso** | Chat inline, tempo real | Slides, relatorios |
| **Tool** | `GenerateChart` | `ExecutiveChart` |
| **Tipos** | bar, line, pie, area, composed | 13 tipos incluindo waterfall, heatmap, infographic |
| **Rendering** | Client-side (browser) | Server-side (subprocess) |

### 1.3 Pipeline Completo de Slides

```
Input do usuario (texto/pedido)
  │
  ├── Content < 500 chars? → prepareContent() [IA elabora]
  ├── Content < 1500 chars + contexto? → prepareContent() [IA enriquece]
  └── Content >= 1500 chars → passa direto
  │
  ▼
structureContentWithAI() [IA estrutura em slides JSON]
  │
  ▼
enforceLayoutDiversity() [garante variedade visual]
  │
  ▼
renderCharts() [CEO_GRAFICO gera PNGs em paralelo]
  │
  ▼
createPptx() [convertToSlideSpec() → Python python-pptx]
  │
  ▼
Base64 PPTX retornado ao chat
```

---

## 2. Sistema de Slides (PPTX)

### 2.1 Arquivos Fonte

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `src/lib/tools/generate-slides.tool.ts` | 145 | Interface LLM (tool definition) |
| `src/lib/services/slides-generator.service.ts` | 2712 | Orquestrador central |
| `src/lib/services/slides-themes.ts` | 444 | Temas e posicionamento |
| `src/lib/services/ceo-grafico.service.ts` | 754 | Bridge Node.js ↔ Python |

### 2.2 Tool Definition (LLM Interface)

O LLM chama a tool `GenerateSlides` com o seguinte schema:

```typescript
export const generateSlidesToolDefinition = {
  name: 'GenerateSlides',
  description: 'Gera apresentacoes PowerPoint (PPTX) executivas de alta qualidade. IMPORTANTE: O campo "content" deve conter conteudo RICO e DETALHADO - nao passe apenas o pedido do usuario. Sintetize conhecimento relevante, elabore argumentos, dados, insights e estrutura narrativa antes de chamar.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Conteudo DETALHADO e ESTRUTURADO para slides. Inclua: contexto, dados/metricas, argumentos, insights, conclusoes e recomendacoes. Use markdown (# secoes, - bullets) para organizar. NAO passe apenas o pedido bruto do usuario - elabore com base na conversa.',
      },
      title: { type: 'string', description: 'Titulo da apresentacao' },
      author: { type: 'string', description: 'Nome do autor' },
      theme: {
        type: 'object',
        description: 'Tema customizado (cores em hex sem #)',
        properties: {
          primaryColor: { type: 'string', description: 'Cor primaria (ex: 204C8D)' },
          secondaryColor: { type: 'string', description: 'Cor secundaria' },
          backgroundColor: { type: 'string', description: 'Cor de fundo' },
          textColor: { type: 'string', description: 'Cor do texto' },
          fontFamily: { type: 'string', description: 'Familia de fonte' },
        },
      },
      themeName: {
        type: 'string',
        enum: ['corporate', 'modern-dark', 'warm-earth', 'tech-gradient', 'minimal-clean'],
        description: 'Tema visual da apresentacao (default: corporate)',
      },
      useAI: {
        type: 'boolean',
        description: 'Usar IA para estruturar conteudo em slides (default: true)',
      },
    },
    required: ['content'],
  },
};
```

**Ponto critico**: A `description` do campo `content` instrui o LLM a NAO passar o pedido bruto, mas sim elaborar o conteudo primeiro. Isso e fundamental para qualidade.

### 2.3 Fase 1: Preparacao de Conteudo (`prepareContent`)

**Quando e chamada:**
- Se `content.length < 500` caracteres (input fino)
- Se `content.length < 1500` e ha `conversationContext` disponivel

**Prompt de sistema COMPLETO:**

```
Voce e um consultor estrategico senior. Sua tarefa e ELABORAR e ENRIQUECER o conteudo fornecido para criar uma apresentacao executiva de alta qualidade.

TAREFA: Transforme o input do usuario em conteudo RICO, DETALHADO e ESTRUTURADO em markdown.

REGRAS:
- Desenvolva cada ponto com profundidade (dados, metricas, insights, causas, consequencias)
- Se o usuario pediu algo generico (ex: "slides sobre vendas"), crie conteudo substantivo com dados ilustrativos REALISTAS
- Se ha contexto da conversa, EXTRAIA e USE todos os dados, numeros e insights relevantes
- Organize em secoes claras com headers markdown (#)
- Inclua metricas concretas (numeros, percentuais, valores monetarios)
- Adicione insights analiticos (causas, correlacoes, tendencias)
- Termine com conclusoes e recomendacoes acionaveis
- Minimo 800 caracteres de output
- Maximo 3000 caracteres de output
- NAO formate como slides - formate como CONTEUDO RICO em markdown

ESTRUTURA DO OUTPUT:
# [Titulo/Tema Principal]

## Contexto e Situacao Atual
[Descricao do cenario, problema ou oportunidade com dados]

## Dados e Metricas Principais
[KPIs, numeros, comparacoes, benchmarks]

## Analise e Insights
[Causas, correlacoes, tendencias, pontos de atencao]

## Resultados / Impacto
[O que foi alcancado ou o que se espera alcancer]

## Conclusoes e Proximos Passos
[Sintese + recomendacoes acionaveis com prioridade]

IMPORTANTE: Gere conteudo ESPECIFICO e PROFUNDO, nunca generico. Se o tema e "vendas", inclua numeros de receita, canais, conversao, ticket medio, etc. Se e "marketing", inclua CAC, ROI, canais, campanhas.
```

**Parametros da chamada IA:**
- `temperature`: 0.4
- `maxTokens`: 4096
- Sistema tambem injeta `designRules` do quality config (admin-configuravel)

**User prompt template:**
```
{title ? `Tema: "${title}"\n` : ''}Pedido do usuario: {rawInput}{contextSection}

Elabore o conteudo acima em formato markdown rico e detalhado. Responda APENAS com o conteudo em markdown.
```

Se `conversationContext` existir, ele e adicionado como:
```
CONTEXTO DA CONVERSA (use dados relevantes daqui):
{conversationContext}
```

### 2.4 Fase 2: Estruturacao IA em Slides (`structureContentWithAI`)

Esta e a fase mais critica. O prompt de sistema e extenso e embarca regras de consultoria McKinsey/BCG.

**Prompt de sistema COMPLETO:**

```
Voce e um consultor estrategico senior especializado em criar apresentacoes executivas de alta qualidade (estilo McKinsey/BCG).

ANALISE O INPUT DO USUARIO:

1. Se o usuario fizer um PEDIDO (ex: "crie slides sobre vendas", "faca uma apresentacao sobre marketing"):
   → CRIE conteudo estrategico, insight-driven, com dados e visualizacoes relevantes.
   → Gere dados ilustrativos realistas quando o tema pedir graficos. Marque com isIllustrative: true.

2. Se o usuario fornecer CONTEUDO REAL (dados, numeros, tabelas, CSV):
   → ESTRUTURE o conteudo em slides visuais e impactantes.
   → Use os dados reais fornecidos em chartSpec. Marque com isIllustrative: false.

QUALIDADE DO CONTEUDO:
- Se o input for RICO (500+ chars, multiplas secoes, dados concretos):
  → Maximize uso dos dados reais fornecidos.
  → Cada slide deve conter informacao ESPECIFICA do input, nunca generica.
  → Extraia metricas exatas e use em KPI cards e graficos.
  → Priorize dados reais sobre dados ilustrativos.

- Se o input for CURTO/VAGO (pedido generico como "slides sobre vendas"):
  → Crie conteudo substantivo e profundo, nao superficial.
  → Gere dados ilustrativos REALISTAS e contextualizados.
  → Cada bullet deve ter insight especifico, nunca obviedades ("vendas sao importantes").
  → Profundidade > Amplitude: prefira 8 slides profundos a 12 rasos.
  → Inclua perspectivas analiticas: causas, correlacoes, benchmarks, tendencias.

ANTI-PATTERNS (NUNCA faca):
- Bullets genericos como "Melhorar a comunicacao", "Investir em tecnologia"
- Titulos descritivos como "Resultados", "Analise" (use insight: "Receita cresceu 23%")
- Slides so com texto quando dados seriam mais impactantes
- Repetir a mesma informacao em slides diferentes
- KPI cards sem valor numerico concreto
- Conteudo que poderia se aplicar a qualquer empresa/contexto

LIMITES DE CARACTERES (respeitar RIGOROSAMENTE):
- title: max 60 caracteres
- subtitle: max 80 caracteres
- Cada bullet: max 80 caracteres (regra 6x6: max 6 bullets, max 6 palavras por bullet)
- content: max 200 caracteres
- KPI value: max 15 chars | KPI label: max 25 chars
- Timeline title: max 40 chars
- quoteText: max 200 chars
- Comparison items: max 60 chars por item

PRINCIPIOS DE DESIGN CONSULTORIA:
- Cada slide deve ter UMA mensagem principal clara (insight, nao descricao)
- Titulos devem ser conclusoes/insights, nao topicos (ex: "Receita cresceu 23% vs meta" e nao "Resultados Financeiros")
- Use dados quantitativos sempre que possivel
- Preferencia por visualizacao (graficos, KPIs, timelines) sobre texto puro

[QUALITY CONFIG DESIGN RULES INJETADAS AQUI - ver secao 2.8]

DIVERSIDADE DE LAYOUTS (OBRIGATORIO):
- NUNCA repita o mesmo layout 2x consecutivas (exceto bullets se absolutamente necessario)
- Minimo 3 layouts distintos por apresentacao
- Minimo 2 slides visuais (chart/kpiCards/comparison/timeline) se tema envolve dados
- Estrutura ideal: title → (kpiCards/chart) → variado → (sectionDivider se >8 slides) → conclusao
- Layout fullImage: use para slides visuais impactantes (com chartSpec)
- Fluxo: titulo → contexto/KPIs → analise com graficos → comparacoes → conclusao/proximos passos

REGRAS:
- Crie entre 6 e 15 slides dependendo da complexidade
- Primeiro slide: layout "title"
- Use pelo menos 3 layouts diferentes na apresentacao
- Inclua pelo menos 1 slide de KPI e 1 slide de grafico quando o tema envolver dados
- Ultimo slide: conclusao ou proximos passos
- Linguagem executiva, concisa, orientada a acao

LAYOUTS DISPONIVEIS:

1. "title" - Slide de abertura
   Campos: title, subtitle

2. "bullets" - Pontos-chave com bullets
   Campos: title, bullets (array de strings, max 5)

3. "titleContent" - Titulo + paragrafo explicativo
   Campos: title, content (texto corrido, max 300 chars)

4. "twoColumn" - Duas colunas comparativas
   Campos: title, leftColumn (array), rightColumn (array)

5. "chart" - Slide com grafico de dados
   Campos: title, chartSpec (objeto com chartType, data, isIllustrative)
   chartType: "bar" | "line" | "pie" | "area" | "grouped_bar" | "waterfall"
   data: array de objetos com campos dimensao + metricas numericas
   Se nao houver dados reais, gere dados ilustrativos realistas e marque isIllustrative: true

6. "kpiCards" - Cards de KPI/metricas (3-4 cards)
   Campos: title, kpiCards (array de {value, label, trend, change})
   trend: "up" | "down" | "neutral"
   value: numero formatado (ex: "R$ 2.4M", "87%", "42")
   change: variacao (ex: "+15%", "-3pts")

7. "comparison" - Comparacao lado a lado (Antes/Depois, Atual/Meta, etc)
   Campos: title, comparison (array de 2 objetos {header, items, highlight})
   highlight: true no lado positivo/desejado

8. "timeline" - Timeline/roadmap
   Campos: title, timelineItems (array de {date, title, description, status})
   status: "completed" | "current" | "upcoming"

9. "quote" - Citacao/destaque importante
   Campos: title, quoteText, quoteAuthor

10. "sectionDivider" - Divisor de secao (transicao visual)
    Campos: title, subtitle

11. "imageContent" - Grafico + texto lado a lado
    Campos: title, bullets (texto lateral), chartSpec (grafico do lado)

12. "fullImage" - Slide visual com imagem full-bleed + overlay
    Campos: title, subtitle, chartSpec (imagem de fundo gerada por grafico)

FORMATO JSON (responda APENAS JSON valido, sem texto):
{
  "slides": [
    {
      "layout": "title",
      "title": "Estrategia de Crescimento 2024",
      "subtitle": "Planejamento Trimestral - Analise Executiva"
    },
    {
      "layout": "kpiCards",
      "title": "Resultados superaram meta em 3 dos 4 indicadores",
      "kpiCards": [
        {"value": "R$ 2.4M", "label": "Receita", "trend": "up", "change": "+15%"},
        {"value": "87", "label": "NPS", "trend": "up", "change": "+5pts"},
        {"value": "92%", "label": "Retencao", "trend": "neutral", "change": "0%"},
        {"value": "42", "label": "Novas Unidades", "trend": "up", "change": "+8"}
      ]
    },
    {
      "layout": "chart",
      "title": "Receita mensal cresceu consistentemente nos ultimos 6 meses",
      "chartSpec": {
        "chartType": "bar",
        "data": [
          {"mes": "Jul", "receita": 1800000},
          {"mes": "Ago", "receita": 1950000},
          {"mes": "Set", "receita": 2100000},
          {"mes": "Out", "receita": 2250000},
          {"mes": "Nov", "receita": 2400000},
          {"mes": "Dez", "receita": 2600000}
        ],
        "isIllustrative": true
      },
      "disclaimer": "Dados ilustrativos"
    },
    {
      "layout": "comparison",
      "title": "Transformacao digital reduziu ciclo operacional em 77%",
      "comparison": [
        {"header": "Antes", "items": ["Processos manuais", "Ciclo de 30 dias", "5 aprovadores"]},
        {"header": "Depois", "items": ["Automacao completa", "Ciclo de 7 dias", "2 aprovadores"], "highlight": true}
      ]
    }
  ]
}
```

**Parametros da chamada IA:**
- `temperature`: 0.3
- `maxTokens`: 12288

**User prompt template:**
```
{title ? `Titulo sugerido: "${title}"\n\n` : ''}Input do usuario:

{content}

{qualityGuidance}

Crie uma apresentacao executiva premium. Requisitos:
- Layouts variados (minimo 3 tipos diferentes)
- Titulos que sao INSIGHTS (conclusoes), nao descricoes
- Graficos/KPIs quando dados disponiveis
- Bullets especificos e acionaveis (nunca genericos)
- Fluxo narrativo logico: contexto → analise → conclusao → acao

Responda APENAS com JSON valido.
```

Onde `qualityGuidance` depende do tamanho do input:
- **Input rico** (> 400 chars): `"O input contem conteudo detalhado ({length} chars). MAXIMIZE o uso dos dados fornecidos - extraia cada metrica, insight e argumento. Nao invente dados quando ja existem dados reais. Cada slide deve refletir informacao ESPECIFICA do input."`
- **Input breve** (<= 400 chars): `"O input e breve ({length} chars). Desenvolva o tema com PROFUNDIDADE: gere insights especificos, dados ilustrativos realistas, analises causais, e recomendacoes acionaveis. Evite conteudo generico ou obvio."`

### 2.5 Validacao e Sanitizacao do JSON

Apos receber o JSON da IA, o servico aplica limites rigorosos:

```typescript
// Limites aplicados programaticamente:
config.title = slide.title?.substring(0, 60);          // max 60 chars
config.subtitle = slide.subtitle?.substring(0, 80);    // max 80 chars
config.bullets = slide.bullets
  .slice(0, 6)                                          // max 6 bullets
  .map(b => String(b).substring(0, 80));                // max 80 chars cada
config.content = slide.content?.substring(0, 200);      // max 200 chars

// KPI Cards
kpiCards = slide.kpiCards.slice(0, 4).map(card => ({
  value: String(card.value).substring(0, 15),           // max 15 chars
  label: String(card.label).substring(0, 25),           // max 25 chars
  trend: card.trend,                                    // up | down | neutral
  change: card.change?.substring(0, 15),                // max 15 chars
}));

// Timeline
timelineItems = slide.timelineItems.slice(0, 6).map(item => ({
  date: String(item.date).substring(0, 20),
  title: String(item.title).substring(0, 40),
  description: item.description?.substring(0, 80),
  status: item.status,                                  // completed | current | upcoming
}));

// Comparison
comparison = slide.comparison.slice(0, 3).map(col => ({
  header: String(col.header).substring(0, 30),
  items: col.items.slice(0, 6).map(i => String(i).substring(0, 60)),
  highlight: col.highlight === true,
}));

// Chart data
chartSpec.data = slide.chartSpec.data.slice(0, 20);     // max 20 data points
```

### 2.6 Diversidade de Layout (`enforceLayoutDiversity`)

Pos-processamento que impede 2 layouts iguais consecutivos:

```typescript
private enforceLayoutDiversity(slides: SlideConfig[]): SlideConfig[] {
  for (let i = 1; i < slides.length; i++) {
    if (slides[i].layout === slides[i - 1].layout && slides[i].layout !== 'title') {
      if (slides[i].layout === 'bullets') {
        slides[i].layout = 'titleContent';
        if (!slides[i].content && slides[i].bullets) {
          slides[i].content = slides[i].bullets!.join('. ').substring(0, 200);
        }
      } else {
        slides[i].layout = 'bullets';
        if (!slides[i].bullets && slides[i].content) {
          slides[i].bullets = slides[i].content!.split('. ').slice(0, 5);
        }
      }
    }
  }
  return slides;
}
```

### 2.7 Fase 3: Renderizacao de Graficos (`renderCharts`)

Para cada slide que tem `chartSpec` mas nao tem `chartPngBase64`:

1. Extrai dados do `chartSpec.data`
2. Chama `generateChart()` do CEO_GRAFICO (Python)
3. Passa opcoes de estilo do quality config (cores, fonte, DPI, figsize)
4. Recebe PNG base64 e SVG
5. Execucao em paralelo (`Promise.all`)

```typescript
const result = await generateChart(chartData, {
  chartType: slide.chartSpec!.chartType,
  title: slide.chartSpec!.title || slide.title,
  chartOptions: {
    colors: qualityConfig.chartStyle.colors,
    font_family: qualityConfig.chartStyle.fontFamily,
    dpi: qualityConfig.chartStyle.dpi,
    figsize: qualityConfig.chartStyle.figsize,
    show_grid: qualityConfig.chartStyle.showGrid,
    background_color: qualityConfig.chartStyle.backgroundColor,
  },
});

if (result.success) {
  slide.chartPngBase64 = result.png_base64;
  slide.chartSvg = result.svg;
}
```

**Se o chart falhar**, o slide continua sem grafico (fallback gracioso). No PPTX, aparece um placeholder cinza com texto `[Grafico: {chartType}]`.

### 2.8 Quality Config (Admin-Configuravel)

A qualidade e controlada pela interface `SlidesQualityConfig`:

```typescript
interface SlidesQualityConfig {
  designRules: string;          // Texto injetado no prompt da IA
  chartStyle: {
    colors: string[];           // Paleta de cores dos graficos
    fontFamily: string;         // Fonte dos graficos
    dpi: number;                // Resolucao (150 default)
    figsize: [number, number];  // Dimensoes [largura, altura] em polegadas
    showGrid: boolean;          // Mostrar grid
    backgroundColor: string;    // Cor de fundo
  };
  fonts: {
    heading: string;            // Fonte de titulos
    body: string;               // Fonte do corpo
  };
  brandColors: {
    primary: string;            // Cor principal (sem #)
    secondary: string;          // Cor secundaria
    accent: string;             // Cor de destaque
  };
}
```

**Config padrao:**

```typescript
const DEFAULT_SLIDES_QUALITY_CONFIG: SlidesQualityConfig = {
  designRules: `DIRETRIZES DE DESIGN EXECUTIVO (McKinsey/BCG):

PRINCIPIOS FUNDAMENTAIS:
1. PIRAMIDE INVERTIDA: Conclusao primeiro, depois evidencias
2. REGRA SO-WHAT: Todo slide deve responder "E dai?" - qual o insight acionavel?
3. MECE: Mutuamente Exclusivo, Coletivamente Exaustivo na organizacao
4. UMA MENSAGEM POR SLIDE: Cada slide = 1 insight claro expresso no titulo
5. EVIDENCE-BASED: Dados quantitativos suportam cada afirmacao

TITULOS (estilo insight - OBRIGATORIO):
- BOM: "Receita cresceu 23% superando meta de 15%"
- RUIM: "Resultados Financeiros"
- BOM: "3 dos 4 mercados atingiram breakeven em 6 meses"
- RUIM: "Analise de Mercados"
- O titulo DEVE ser a CONCLUSAO/INSIGHT, nunca o TOPICO

BULLETS (regra 6x6):
- Max 6 bullets por slide
- Max 6 palavras por bullet
- Cada bullet = 1 fato especifico e mensuravel
- Iniciar com verbo de acao ou dado numerico
- PROIBIDO: bullets genericos como "Melhorar processos", "Investir em pessoas"

VISUALIZACAO DE DADOS:
- Preferir graficos a tabelas sempre que possivel
- Barras: comparacao entre categorias
- Linhas: tendencias ao longo do tempo
- Pizza/donut: composicao de um total (max 5 fatias)
- Usar cor primaria para destaque, cinza para contexto/baseline
- Titulo do grafico = insight ("Receita cresceu 23%"), nao descricao ("Receita Mensal")
- Labels claros, unidades explicitas, sem ruido visual
- KPI cards: numeros grandes e proeminentes, label secundario

NARRATIVA (SCR Framework):
- Situacao: contexto e baseline (slides 2-3)
- Complicacao: o que mudou, desafio ou oportunidade (slides 4-5)
- Resolucao: solucao, resultados, proximos passos (slides 6+)
- Ultimo slide: call-to-action claro, mensuravel, com responsavel e prazo

ESTILO VISUAL:
- Whitespace generoso - nunca sobrecarregar o slide
- Hierarquia visual clara (tamanhos de fonte decrescentes)
- Cores com proposito semantico (verde=positivo, vermelho=alerta, azul=neutro)
- Consistencia absoluta entre slides
- Contraste alto entre texto e fundo para legibilidade`,

  chartStyle: {
    colors: ['#204C8D', '#3B82F6', '#10B981', '#6B7280', '#24477F', '#177B57', '#F59E0B', '#EF4444'],
    fontFamily: 'Montserrat',
    dpi: 150,
    figsize: [12, 5],
    showGrid: false,
    backgroundColor: '#FFFFFF',
  },
  fonts: { heading: 'Montserrat', body: 'Montserrat' },
  brandColors: { primary: '204C8D', secondary: '3B82F6', accent: '10B981' },
};
```

Este config pode ser sobrescrito via tabela `external_api_configs` no Supabase com `api_type = 'slides_quality_config'`. Cache de 60 segundos.

### 2.9 Fase 4: Geracao PPTX

O PPTX e gerado exclusivamente via Python (python-pptx) atraves do CEO_GRAFICO:

1. `convertToSlideSpec()` converte `SlideConfig[]` → formato `SlideSpec` JSON
2. `generatePresentation(slideSpec)` envia para Python via subprocess
3. Python gera o .pptx e retorna como base64

#### 2.9.1 Formato SlideSpec

O `SlideSpec` e o contrato JSON entre TypeScript e Python:

```typescript
interface SlideSpec {
  spec_version: '1.0';
  render_target: 'python-pptx';
  deck: {
    title: string;
    style: string;                    // 'mckinsey' por padrao
    slide_size: {
      format: 'widescreen';
      width_in: 13.333;              // ~33.867 cm
      height_in: 7.5;               // ~19.05 cm
    };
    grid: {
      columns: 12;
      margin_in: { left: 0.75, right: 0.75, top: 0.55, bottom: 0.45 };
      gutter_in: 0.2;
      baseline_grid_pt: 6;
    };
    theme: {
      font_family: string;           // 'Calibri' para Python
      colors: {
        structure_blue: string;       // '#395EA6'
        highlight_orange: string;     // '#EE8C13'
        aqua: string;                 // '#C2E4E2'
        text: string;                 // '#333333'
        light_bg: string;             // '#F8FAFC'
      };
    };
    ui_rules: {
      headline_max_lines: 2;
      body_max_bullets: 5;
      bullet_max_lines_each: 2;
      one_visual_per_slide: true;
      no_decorative_icons: true;
      whitespace_priority: 'high';
      color_constraints: {
        max_blue_elements_per_slide: 3;
        max_orange_elements_per_slide: 1;
        forbid_orange_in: ['bullets', 'paragraphs', 'tables'];
      };
    };
  };
  slides: SlideSpecSlide[];
}

interface SlideSpecSlide {
  slide_id: string;
  type: string;                       // 'body' | 'title_slide' | 'section_divider'
  question: string;
  headline: string;
  layout: {
    name: 'consulting_standard';
    zones: Record<string, unknown>;
  };
  elements: SlideSpecElement[];
  speaker_notes: string;
  quality_checks: {
    so_what_clear: boolean;
    mece_ok: boolean;
    numbers_contextualized: boolean;
    standalone_readable: boolean;
    color_rules_ok: boolean;
  };
}

interface SlideSpecElement {
  id: string;
  kind: 'textbox' | 'image' | 'shape' | 'line';
  x: number;                          // posicao em polegadas
  y: number;
  w: number;
  h: number;
  z?: number;                         // z-order
  style?: {
    text?: {
      font_family: string;
      font_pt: number;
      bold?: boolean;
      italic?: boolean;
      color: string;
      align: 'left' | 'center' | 'right';
    };
  };
  content?: {
    text_runs?: Array<{ text: string }>;
    paragraphs?: Array<{
      runs: Array<{ text: string }>;
      bullet?: { level: number };
      space_after_pt?: number;
    }>;
    image_base64?: string;
    shape_type?: string;
    fill?: { color: string };
    line?: { color: string; width_pt: number };
  };
}
```

#### 2.9.2 Tema Python (RaizTalks)

O tema padrao para renderizacao Python:

```typescript
const RAIZTALKS_THEME = {
  font_family: 'Calibri',
  colors: {
    structure_blue: '#395EA6',
    highlight_orange: '#EE8C13',
    aqua: '#C2E4E2',
    text: '#333333',
    light_bg: '#F8FAFC',
  },
};
```

#### 2.9.3 Posicionamento por Tipo de Elemento

Cada tipo de slide usa coordenadas fixas em polegadas (grid 13.333" x 7.5"):

| Elemento | x | y | w | h |
|----------|---|---|---|---|
| **Brand line (topo)** | 0 | 0 | 13.333 | 0.06 |
| **Titulo** | 0.75 | 0.35 | 11.833 | 0.8 |
| **Subtitulo** | 0.75 | 1.1 | 11.833 | 0.4 |
| **Bullets** | 0.75 | 1.6 | 10.5 | 4.5 |
| **KPI card** | calculado | 1.6 | calculado | 2.5 |
| **Chart (imagem)** | 0.8 | 1.6 | 10.5 | 4.2 |
| **Two-column (left)** | 0.75 | 1.6 | 5.3 | 4.5 |
| **Two-column (right)** | 6.3 | 1.6 | 5.3 | 4.5 |
| **Timeline (linha)** | 0.75 | 3.0 | 10.5 | 0 |
| **Quote text** | 1.5 | 1.8 | 10.0 | 2.0 |
| **Section divider bg** | 0 | 0 | 13.333 | 7.5 |
| **Section title** | 1.0 | 2.5 | 11.333 | 1.2 |
| **Footer (pagina)** | 11.5 | 7.05 | 1.0 | 0.3 |

### 2.10 Sistema de Temas (pptxgenjs)

Para o caminho JavaScript alternativo (pptxgenjs), o sistema suporta 9 temas pre-definidos:

**Dimensoes do slide**: 10" x 5.625" (16:9)

**Funcao de posicionamento fracional**: `pos(xFrac, yFrac, wFrac, hFrac)` → SlidePosition em polegadas

```typescript
const SLIDE_W = 10;
const SLIDE_H = 5.625;

function pos(xFrac: number, yFrac: number, wFrac: number, hFrac: number): SlidePosition {
  return {
    x: +(xFrac * SLIDE_W).toFixed(2),
    y: +(yFrac * SLIDE_H).toFixed(2),
    w: +(wFrac * SLIDE_W).toFixed(2),
    h: +(hFrac * SLIDE_H).toFixed(2),
  };
}
```

#### Temas Padrao (5 universais)

| Tema | primaryColor | secondaryColor | accentColor | textColor | bgColor |
|------|-------------|----------------|-------------|-----------|---------|
| **corporate** | 204C8D | 3B82F6 | 10B981 | 1F2937 | FFFFFF |
| **modern-dark** | 6366F1 | 818CF8 | 34D399 | FFFFFF | 0F172A |
| **warm-earth** | 92400E | D97706 | 65A30D | 1C1917 | FFFBEB |
| **tech-gradient** | 7C3AED | A78BFA | 2DD4BF | 1E1B4B | FAF5FF |
| **minimal-clean** | 374151 | 6B7280 | 3B82F6 | 111827 | FFFFFF |

#### Temas Verticais (4 setoriais)

| Tema | primaryColor | secondaryColor | accentColor | Uso |
|------|-------------|----------------|-------------|-----|
| **educacao** | 1E40AF | 3B82F6 | 10B981 | Conteudo educacional |
| **financeiro** | 166534 | 22C55E | 0EA5E9 | Relatorios financeiros |
| **rh** | 9333EA | A855F7 | F472B6 | Recursos Humanos |
| **marketing** | DC2626 | F97316 | FBBF24 | Marketing/Comunicacao |

Cada tema tem a seguinte interface:
```typescript
interface SlideThemeDefinition {
  name: string;
  label: string;
  colors: {
    primary: string;       // cor principal
    secondary: string;     // cor secundaria
    accent: string;        // cor de destaque
    background: string;    // fundo do slide
    text: string;          // texto principal
    subtitle: string;      // texto secundario
    cardBg: string;        // fundo de cards KPI
    cardBorder: string;    // borda de cards
    divider: string;       // linhas divisoras
    sectionBg: string;     // fundo de section dividers
    quoteBg: string;       // fundo de slides de citacao
  };
  fonts: {
    heading: string;       // fonte de titulos
    body: string;          // fonte do corpo
  };
}
```

**Resolucao de tema** (`resolveTheme`): combina tema nomeado + overrides customizados do usuario.

### 2.11 Regioes de Layout (REGIONS)

Cada layout tem regioes pre-definidas com posicionamento em polegadas:

```typescript
const REGIONS = {
  // --- Elementos compartilhados ---
  header: {
    accent: { x: 0, y: 0, w: 10, h: 0.06 },           // linha fina 100% largura no topo
    title: { x: 0.6, y: 0.25, w: 8.8, h: 0.6 },
    line: { x: 0.6, y: 0.9, w: 8.8, h: 0 },
  },
  footer: {
    line: { x: 0.5, y: 5.2, w: 9, h: 0 },
    text: { x: 0.5, y: 5.3, w: 5, h: 0.3 },
    slideNum: { x: 9, y: 5.3, w: 0.5, h: 0.3 },
  },
  disclaimer: { x: 6.5, y: 5.0, w: 3, h: 0.2 },

  // --- Layout: title ---
  title: {
    accentBar: { x: 0, y: 0, w: 0.15, h: 5.625 },     // barra lateral esquerda
    bottomBar: { x: 0, y: 5.2, w: 10, h: 0.06 },       // linha no rodape
    title: { x: 0.8, y: 1.8, w: 8.5, h: 1.2 },
    subtitle: { x: 0.8, y: 3.1, w: 8.5, h: 0.6 },
  },

  // --- Layout: bullets ---
  bullets: {
    accent: { x: 0.6, y: 1.1, w: 0.04, h: 3.8 },      // barra vertical decorativa
    text: { x: 0.9, y: 1.1, w: 8.5, h: 3.8 },
  },

  // --- Layout: titleContent ---
  titleContent: {
    content: { x: 0.6, y: 1.1, w: 8.8, h: 3.8 },
    bullets: { x: 0.9, y: 1.1, w: 8.5, h: 3.8 },
  },

  // --- Layout: twoColumn ---
  twoColumn: {
    divider: { x: 5, y: 1.2, w: 0, h: 3.5 },          // linha vertical central
    left: { x: 0.6, y: 1.1, w: 4.2, h: 3.8 },
    right: { x: 5.2, y: 1.1, w: 4.2, h: 3.8 },
  },

  // --- Layout: chart ---
  chart: {
    image: { x: 0.8, y: 1.1, w: 8.4, h: 3.7 },
    fallbackBox: { x: 1.5, y: 1.5, w: 7, h: 3 },
    fallbackText: { x: 1.5, y: 2.5, w: 7, h: 1 },
  },

  // --- Layout: kpiCards ---
  kpiCards: {
    startX: 0.6,
    startY: 1.5,
    totalWidth: 8.8,
    gap: 0.2,
    cardHeight: 2.2,
  },

  // --- Layout: comparison ---
  comparison: {
    panelWidth: 4.2,
    panelHeight: 3.5,
    startY: 1.2,
    leftX: 0.6,
    rightX: 5.2,
  },

  // --- Layout: timeline ---
  timeline: {
    startX: 0.8,
    lineY: 2.8,
    totalWidth: 8.4,
  },

  // --- Layout: quote ---
  quote: {
    background: { x: 0, y: 0, w: 10, h: 5.625 },
    accent: { x: 1.2, y: 1.5, w: 0.06, h: 2.5 },
    mark: { x: 1.0, y: 1.0, w: 1, h: 1 },
    text: { x: 1.5, y: 1.8, w: 7, h: 2 },
    author: { x: 1.5, y: 4.0, w: 7, h: 0.5 },
    title: { x: 0.6, y: 0.3, w: 8.8, h: 0.4 },
  },

  // --- Layout: imageContent ---
  imageContent: {
    image: { x: 0.5, y: 1.1, w: 4.5, h: 3.6 },
    placeholder: { x: 0.5, y: 1.3, w: 4.5, h: 3.2 },
    bullets: { x: 5.3, y: 1.3, w: 4.1, h: 3.6 },
  },

  // --- Layout: sectionDivider ---
  sectionDivider: {
    background: { x: 0, y: 0, w: 10, h: 5.625 },
    title: { x: 1, y: 2, w: 8, h: 1.2 },
    subtitle: { x: 1, y: 3.3, w: 8, h: 0.6 },
  },

  // --- Layout: fullImage ---
  fullImage: {
    image: { x: 0, y: 0, w: 10, h: 5.625 },
    overlay: { x: 0, y: 3.8, w: 10, h: 1.825 },
    overlayTitle: { x: 0.5, y: 4.0, w: 9, h: 0.8 },
    overlaySubtitle: { x: 0.5, y: 4.8, w: 9, h: 0.5 },
  },
};
```

> **Nota**: Todas as coordenadas acima sao em **polegadas** para o grid de 10" x 5.625" (pptxgenjs). Para o caminho Python (python-pptx), o grid e 13.333" x 7.5" e as coordenadas sao recalculadas no `convertToSlideSpec()` (ver secao 2.9.3).

### 2.12 Fallback: Parsing Simples (`parseContentToSlides`)

Quando a IA falha, o sistema usa parsing baseado em regex:

1. Detecta headers (markdown `#`, numeros, ALL CAPS)
2. Agrupa bullets sob cada header
3. Primeiro header → slide de titulo
4. Demais headers → slides de bullets/titleContent
5. Se slide unico com 6+ bullets → divide em multiplos
6. Se nenhum header → cria a partir de paragrafos

---

## 3. Sistema de Graficos

### 3.1 Graficos Interativos (Recharts)

#### 3.1.1 Tool Definition

```typescript
export const generateChartToolDefinition = {
  name: 'GenerateChart',
  description: 'Gera configuracoes de graficos interativos (bar, line, pie, area, composed) a partir de dados brutos. Retorna configuracao JSON para renderizacao no frontend. Auto-detecta tipo de grafico se nao especificado.',
  inputSchema: {
    type: 'object',
    properties: {
      rawData: {
        type: 'string',
        description: 'Dados brutos em CSV, JSON (array de objetos), ou texto formatado',
      },
      chartType: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'area', 'composed'],
      },
      title: { type: 'string' },
    },
    required: ['rawData'],
  },
};
```

#### 3.1.2 Pipeline de 2 Passos

```
rawData (texto) → interpretChartData() → structured JSON → generateChart() → ChartConfig JSON
```

**Passo 1**: `ChartInterpretService` (IA) extrai dados numericos do texto
**Passo 2**: `ChartGeneratorService` gera config Recharts

#### 3.1.3 Servico de Interpretacao (`chart-interpret.service.ts`)

**Prompt de sistema COMPLETO:**

```
Voce e um especialista em visualizacao de dados e graficos.
Sua tarefa e analisar o pedido do usuario e extrair TODOS os dados numericos para gerar um grafico.

SIGA ESTAS ETAPAS OBRIGATORIAMENTE:

ETAPA 1 - IDENTIFICACAO: Leia o texto inteiro e identifique TODOS os valores numericos presentes.
  - Conte quantos numeros existem no texto.
  - Liste cada numero e a categoria/label a que ele pertence.

ETAPA 2 - ASSOCIACAO: Para cada valor numerico, determine:
  - Qual e a categoria (nome/label) associada
  - Se ha multiplas series (ex: receita E custo para cada mes)
  - Se o valor e percentual, monetario ou unidade

ETAPA 3 - ESTRUTURACAO: Monte o JSON com extractedData contendo TODOS os valores encontrados na Etapa 1.
  - A quantidade de entries no extractedData DEVE ser igual a quantidade de categorias identificadas.
  - TODOS os numeros do texto devem estar representados.

ETAPA 4 - VERIFICACAO: Antes de retornar, confirme:
  - Quantidade de data points == quantidade de categorias da Etapa 1
  - Cada valor numerico do texto original esta presente no extractedData
  - Nenhum valor foi inventado ou estimado

RETORNE APENAS JSON VALIDO, sem markdown, sem explicacoes.

O JSON deve ter a seguinte estrutura:
{
  "chartType": "bar" | "line" | "pie" | "area" | "composed",
  "title": "string - titulo descritivo do grafico",
  "_analysis": {
    "numericValuesFound": number,
    "categories": ["lista de categorias"],
    "valuesListed": [lista de todos os numeros encontrados]
  },
  "extractedData": [
    { "name": "categoria/label", "value": number },
    ...
  ],
  "xAxisLabel": "string opcional",
  "yAxisLabel": "string opcional",
  "insights": "string opcional"
}

REGRAS PARA ESCOLHA DO TIPO DE GRAFICO:
1. "pie" - Proporcoes, percentuais, distribuicao (max 8 itens)
2. "bar" - Comparacoes entre categorias, rankings
3. "line" - Series temporais, tendencias, evolucao
4. "area" - Volume acumulado ao longo do tempo
5. "composed" - Multiplas series com escalas diferentes

REGRAS PARA EXTRACAO:
1. Identifique TODOS os valores numericos - nao pule nenhum
2. Associe cada valor a sua categoria/label correspondente
3. Multiplas series: use campos adicionais (ex: "receita", "custo", "meta")
4. Converta percentuais para numeros (30% -> 30)
5. Mantenha a ordem original dos dados
6. NUNCA invente, estime ou arredonde valores
7. Se nao ha numeros no texto: retorne { "error": "INSUFFICIENT_DATA" }
8. Se ha pelo menos 2 valores: SEMPRE extraia e gere JSON
9. NUNCA extrapole ou interpole valores ausentes
10. Precisao exata dos numeros (1234.56 permanece 1234.56)
11. Quantidade de entries == quantidade de categorias distintas
12. Sem categorias claras: use "Item 1", "Item 2", etc.

VALIDACAO CRITICA:
- _analysis.numericValuesFound DEVE = quantidade de numeros no texto
- _analysis.valuesListed DEVE conter TODOS os numeros
- extractedData DEVE ter entries para TODAS as categorias
- Cada value DEVE corresponder a um numero de _analysis.valuesListed
- INSUFFICIENT_DATA SOMENTE se zero numeros no texto
```

**Parametros**: `temperature: 0.1`, `maxTokens: 2048`

**Mecanismo de retry**: Se extraction score < 0.6 e ha mais de 2 numeros no texto, faz retry com prompt explicito listando os numeros encontrados: `temperature: 0`, `maxTokens: 2048`

**Validacao pos-extracao**:
1. `validateExtractedData()`: verifica se cada valor numerico extraido existe no texto original (normaliza formato BR: 1.234,56)
2. `validateCompleteness()`: score de completude (numbersExtracted / expectedCount)
3. Se nenhum valor passa validacao, usa dados nao-validados como fallback

#### 3.1.4 Servico de Geracao (`chart-generator.service.ts`)

**Paleta padrao de 8 cores:**
```typescript
const DEFAULT_COLORS = [
  '#3b82f6',  // Blue
  '#10b981',  // Green
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#8b5cf6',  // Purple
  '#ec4899',  // Pink
  '#06b6d4',  // Cyan
  '#84cc16',  // Lime
];
```

**Formatos de entrada suportados** (em ordem de tentativa):
1. JSON (começa com `[` ou `{`)
2. CSV (contem `,`, `\t` ou `;` + `\n`)
3. Key-value pairs (contem `:` ou `=`)
4. Lista simples (um item por linha com numero)

**Auto-deteccao de tipo de grafico:**
- 1 serie + <= 8 itens → `pie`
- > 10 data points → `line`
- 1 serie ou <= 6 itens → `bar`
- > 2 series → `composed`
- Default → `bar`

**Config de saida (ChartConfig):**
```typescript
interface ChartConfig {
  type: ChartType;
  title: string;
  data: ChartDataPoint[];           // [{name: "Jan", value: 100}, ...]
  series: ChartSeries[];            // [{dataKey: "value", name: "Valor", color: "#3b82f6"}]
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;             // true se > 1 serie
  showGrid?: boolean;               // true
}
```

### 3.2 Graficos Executivos (CEO_GRAFICO/Python)

#### 3.2.1 Tool Definition

```typescript
export const executiveChartToolDefinition = {
  name: 'ExecutiveChart',
  description: 'Gera graficos executivos de alta qualidade via Python (matplotlib). Produz SVG e PNG. Suporta: bar, line, pie, waterfall, scatter, area, grouped_bar, heatmap, stacked_bar, combo, bullet, infographic.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'profile', 'insights'],
      },
      data: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array de objetos. Ex: [{"mes": "Jan", "valor": 100}]',
      },
      chartType: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'waterfall', 'scatter', 'area', 'grouped_bar', 'heatmap', 'stacked_bar', 'stacked100_bar', 'combo', 'bullet', 'infographic'],
      },
      title: { type: 'string' },
      options: { type: 'object' },
    },
    required: ['action', 'data'],
  },
};
```

#### 3.2.2 3 Acoes

| Acao | Funcao | Retorno |
|------|--------|---------|
| `generate` | Gera grafico PNG + SVG | SVG em `[SVG_CHART]...[/SVG_CHART]`, PNG em `[PNG_BASE64]...[/PNG_BASE64]` |
| `profile` | Analisa dados e recomenda tipo | JSON com perfil + lista de graficos recomendados |
| `insights` | Extrai insights sem grafico | Texto com insights + frases narrativas |

#### 3.2.3 Bridge Node.js ↔ Python (`executePython`)

```typescript
// Caminho do modulo Python
const CEO_GRAFICO_PATH = path.join(process.cwd(), 'ceo_grafico');

// Comunicacao via stdin/stdout JSON
function executePython(request: ChartGenerationRequest): Promise<ChartGenerationResult> {
  return new Promise((resolve) => {
    const python = spawn('python3', ['main.py'], {
      cwd: CEO_GRAFICO_PATH,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    // Timeout de 30 segundos
    const timeout = setTimeout(() => {
      python.kill('SIGTERM');
      resolve({ success: false, error: 'Timeout: grafico demorou mais de 30s' });
    }, 30000);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    python.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    python.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        resolve({ success: false, error: stderr || 'Python process failed' });
        return;
      }
      const result = JSON.parse(stdout);
      resolve(result);
    });

    // Envia request como JSON via stdin
    python.stdin.write(JSON.stringify(request));
    python.stdin.end();
  });
}
```

**Formato do request JSON enviado ao Python:**
```json
{
  "action": "generate",
  "data": [{"mes": "Jan", "valor": 100}, ...],
  "chart_type": "bar",
  "title": "Titulo do Grafico",
  "options": {
    "colors": ["#204C8D", "#3B82F6", ...],
    "font_family": "Montserrat",
    "dpi": 150,
    "figsize": [12, 5],
    "show_grid": false,
    "background_color": "#FFFFFF"
  }
}
```

#### 3.2.4 Tipos de Grafico Suportados (Python)

```typescript
const SUPPORTED_CHART_TYPES = [
  'bar', 'line', 'pie', 'waterfall', 'scatter', 'area',
  'grouped_bar', 'heatmap', 'stacked_bar', 'stacked100_bar',
  'combo', 'bullet', 'infographic', 'presentation'
];
```

#### 3.2.5 Renderers Python (BaseRenderer)

Configuracao base de todos os renderers:

```python
# ceo_grafico/renderers/base.py

COLORS = {
    'primary': '#1E40AF',
    'secondary': '#3B82F6',
    'success': '#10B981',
    'warning': '#F59E0B',
    'danger': '#EF4444',
    'info': '#06B6D4',
    'series': [
        '#1E40AF', '#3B82F6', '#10B981', '#F59E0B',
        '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ]
}

FONT = {
    'family': 'DejaVu Sans',
    'title': 18,
    'label': 14,
    'tick': 12,
}

LAYOUT = {
    'figsize': (12, 5),
    'dpi': 150,
}
```

#### 3.2.6 Temas Python (5 temas)

```python
# ceo_grafico/themes/__init__.py

THEMES = {
    'corporate': {
        'header_bg': '#1E3A5F',
        'header_fg': '#FFFFFF',
        'metric_bg': '#F0F4F8',
        'metric_border': '#C5D3E0',
        'metric_value': '#1E3A5F',
        'section_bg': '#FFFFFF',
        'section_border': '#E2E8F0',
        'section_title': '#1E3A5F',
        'trend_up': '#10B981',
        'trend_down': '#EF4444',
        'trend_neutral': '#6B7280',
        'chart_series': ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', ...],
        'canvas_bg': '#FFFFFF',
    },
    'dark': { ... },
    'minimal': { ... },
    'vibrant': { ... },
    'warm': { ... },
}
```

#### 3.2.7 Normalizacao de Dados

O servico aceita dados em multiplos formatos e normaliza:

```typescript
function normalizeChartData(input: string | Record[] | Record): ChartDataPoint[] {
  // Array de objetos → retorna direto
  // Objeto unico → wrappa em array
  // String JSON → JSON.parse
  // String CSV → parseCSV (detecta delimitador: ; \t ,)
}
```

### 3.3 Sistema de Insights

O CEO_GRAFICO Python inclui 4 componentes analiticos:

| Componente | Funcao |
|-----------|--------|
| **DataProfiler** | Analise estatistica, outliers, cardinalidade |
| **InsightGenerator** | Padroes, anomalias, correlacoes |
| **ComplianceChecker** | Contraste, legibilidade, data-ink ratio |
| **PhraseGenerator** | Narrativas em linguagem natural |

### 3.4 Infograficos

Gerados via `generateInfographic()`:

```typescript
interface InfographicData {
  title: string;
  subtitle?: string;
  footer?: string;
  layout: 'dashboard' | 'highlight' | 'timeline' | 'comparison' | 'process';
  style: 'corporate' | 'dark' | 'minimal' | 'vibrant' | 'warm';
  sections: InfographicSection[];
}

interface InfographicSection {
  type: 'metrics' | 'hero_metric' | 'milestones' | 'steps' | 'comparison' | 'chart_data' | 'text';
  title?: string;
  items?: Array<{ label: string; value: number; trend?: string }>;
  data?: Record<string, unknown>[];
  text?: string;
}
```

Renderiza SVG + PNG via Python. Enviado como `chart_type: 'infographic'` com sections nas options.

---

## 4. Integracao Slides + Graficos

### 4.1 Fluxo de Embedding

```
SlideConfig com chartSpec
  │
  ├── chartSpec.data + chartSpec.chartType
  │
  ▼
generateChart() via CEO_GRAFICO (Python/matplotlib)
  │
  ├── Retorna png_base64 + svg
  │
  ▼
slide.chartPngBase64 = result.png_base64
slide.chartSvg = result.svg
  │
  ▼
convertToSlideSpec() → cria elemento kind: 'image' com image_base64
  │
  ▼
Python python-pptx renderiza imagem PNG dentro do slide
```

### 4.2 Mapeamento chartSpec → Elemento PPTX

No `convertToSlideSpec()`, quando um slide tem `chartPngBase64`:

```typescript
// Para layout 'chart':
{
  id: `${slideId}_chart`,
  kind: 'image',
  x: 0.8,                    // margem esquerda
  y: 1.6,                    // abaixo do titulo
  w: 10.5,                   // quase full-width
  h: 4.2,                    // area principal
  content: {
    image_base64: slide.chartPngBase64,
  },
}

// Para layout 'imageContent' (chart + bullets lado a lado):
// Chart no lado esquerdo:
{ kind: 'image', x: 0.5, y: 1.6, w: 5.5, h: 4.2 }
// Bullets no lado direito:
{ kind: 'textbox', x: 6.2, y: 1.6, w: 5.0, h: 4.2 }
```

### 4.3 Opcoes de Qualidade dos Charts

Os graficos embarcados em slides usam configuracao especifica:

```typescript
const chartOptions = {
  colors: qualityConfig.chartStyle.colors,      // ['#204C8D', '#3B82F6', ...]
  font_family: qualityConfig.chartStyle.fontFamily, // 'Montserrat'
  dpi: qualityConfig.chartStyle.dpi,            // 150
  figsize: qualityConfig.chartStyle.figsize,    // [12, 5]
  show_grid: qualityConfig.chartStyle.showGrid, // false
  background_color: qualityConfig.chartStyle.backgroundColor, // '#FFFFFF'
};
```

### 4.4 Fallback quando Chart Falha

No caminho pptxgenjs:
```typescript
// Retangulo cinza + texto placeholder
slide.addShape('roundRect', {
  ...r.fallbackBox,
  fill: { color: themeDef.colors.cardBg },
  line: { color: themeDef.colors.cardBorder, width: 1 },
  rectRadius: 0.05,
});
slide.addText(`[Grafico: ${config.chartSpec?.chartType || 'chart'}]`, {
  fontSize: 14, color: '9CA3AF', italic: true, align: 'center',
});
```

No caminho Python (SlideSpec), o slide simplesmente nao tem elemento `image`, mantendo apenas titulo e outros elementos.

---

## 5. Design System & Branding

### 5.1 Cores da Marca rAIz

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **primary** | `#204C8D` | 32, 76, 141 | Titulos, destaques, brand principal |
| **secondary** | `#3B82F6` | 59, 130, 246 | Elementos secundarios, links |
| **accent** | `#10B981` | 16, 185, 129 | Positivo, sucesso, trend up |
| **text** | `#1F2937` / `#333333` | - | Texto principal |
| **subtitleColor** | `#6B7280` | - | Subtitulos, texto secundario |
| **warning** | `#F59E0B` | - | Alertas |
| **error** | `#EF4444` | - | Negativo, trend down |

### 5.2 Tipografia

| Contexto | Fonte | Fallback |
|----------|-------|----------|
| **Slides (pptxgenjs)** | Montserrat | Calibri |
| **Slides (python-pptx)** | Calibri | DejaVu Sans |
| **UI/Frontend** | Inter | SF Pro Text, system-ui |
| **Graficos (Python)** | DejaVu Sans | sans-serif |
| **PDF** | Helvetica | - |
| **DOCX** | Default (docx lib) | - |

### 5.3 Hierarquia de Fontes em Slides

| Elemento | Tamanho (pt) | Peso | Alinhamento |
|----------|-------------|------|-------------|
| Titulo abertura | 38 | Bold | Left |
| Subtitulo abertura | 16 | Normal | Left |
| Titulo slide | 22 | Bold | Left |
| Section divider | 34 | Bold | Center |
| Bullets | 15 | Normal | Left |
| KPI value | 28 | Bold | Center |
| KPI label | 11 | Normal | Center |
| KPI trend | 11 | Bold | Center |
| Quote text | 20 | Italic | Left |
| Quote author | 12 | Normal | Left |
| Timeline date | 9 | Bold | Center |
| Timeline title | 10 | Bold | Center |
| Timeline desc | 8 | Normal | Center |
| Footer (pagina) | 8 | Normal | Right |

### 5.4 Quiet Intelligence UI Tokens

O design system do frontend segue principios "Quiet Intelligence":

```
Principios: no_gradients, no_glassmorphism, no_heavy_shadows, no_uppercase_ui
Accent: #6366F1 (indigo)
Typography: Inter, SF Pro Text, system-ui
Sizes: qi-title-lg (20px), qi-body-md (14px), qi-caption (12px)
Spacing: 8-point grid (qi-xxs 4px a qi-xxl 48px)
Motion: qi-fast (120ms), qi-normal (180ms), qi-ease (ease-out)
```

---

## 6. Exportacao de Documentos

### 6.1 PDF Generator

**Arquivo**: `src/lib/export/pdf-generator.ts` (313 linhas)
**Biblioteca**: `pdfmake`

**Configuracao:**
- Pagina: A4
- Margens: 40pt (top, right, bottom, left) com 60pt para header/footer
- Fonte: Helvetica (padrao pdfmake)
- Cor da marca: `#204C8D`

**Estilos:**
```typescript
const PDF_STYLES = {
  title: { fontSize: 18, bold: true, color: '#204C8D', margin: [0, 0, 0, 10] },
  subtitle: { fontSize: 12, color: '#666666', margin: [0, 0, 0, 20] },
  messageHeader: { fontSize: 10, bold: true, margin: [0, 10, 0, 4] },
  messageContent: { fontSize: 11, margin: [0, 0, 0, 4], lineHeight: 1.3 },
  timestamp: { fontSize: 9, color: '#999999', margin: [0, 0, 0, 8] },
  thinking: { fontSize: 10, italics: true, color: '#666666', background: '#FAFAFA' },
  footer: { fontSize: 8, color: '#999999', alignment: 'center' },
};
```

**Estilo de mensagens:**
- Usuario: fundo `#E3F2FD` (azul claro), header azul `#204C8D`
- Assistente: fundo `#F5F5F5` (cinza claro), header `#333333`

**Footer**: `Pagina {n} de {total} | Plataforma rAIz`

**Opcoes de exportacao:**
```typescript
interface ExportOptions {
  includeThinking?: boolean;     // Mostrar raciocinio do AI
  includeAttachments?: boolean;  // Listar anexos
  includeTimestamps?: boolean;   // Mostrar timestamps
}
```

### 6.2 DOCX Generator

**Arquivo**: `src/lib/export/docx-generator.ts` (323 linhas)
**Biblioteca**: `docx`

**Configuracao:**
- Margens: 1440 twips (1 polegada) em todos os lados
- Cor da marca: `204C8D` (sem #)

**Estilos de documento:**
```typescript
{
  paragraphStyles: [{
    id: 'Title',
    run: { size: 36, bold: true, color: '204C8D' },  // 18pt
  }],
}
```

**Estilo de mensagens:**
- Usuario: shading `E3F2FD`, borda `E0E0E0`, header bold azul
- Assistente: shading `F5F5F5`, borda `E0E0E0`, header bold cinza

**Footer**: `Pagina {n} de {total} | Plataforma rAIz`

**Metadados:**
```typescript
{
  creator: 'Plataforma rAIz',
  title: data.thread.title || 'Conversa',
  description: 'Exportacao de Conversa',
}
```

### 6.3 XLSX Generator

**Arquivo**: `src/lib/export/xlsx-generator.ts` (245 linhas)
**Biblioteca**: `xlsx`

**3 Temas:**
```typescript
const THEMES = {
  corporate: {
    headerBg: '204C8D',      // Azul rAIz
    headerFg: 'FFFFFF',
    alternatingBg: 'F5F5F5',
    borderColor: 'E0E0E0',
  },
  modern: {
    headerBg: '1F2937',      // Cinza escuro
    headerFg: 'FFFFFF',
    alternatingBg: 'F9FAFB',
    borderColor: 'E5E7EB',
  },
  minimal: {
    headerBg: 'FFFFFF',       // Branco
    headerFg: '333333',
    alternatingBg: 'FFFFFF',
    borderColor: 'E0E0E0',
  },
};
```

**Features:**
- Auto-largura de colunas (min 10, max 50 chars)
- Frozen header (panes congelados)
- Auto-filter nos cabecalhos
- Multi-sheet workbooks
- Auto-deteccao CSV/JSON
- Compressao habilitada

**Formatos de entrada:**
```typescript
function parseContent(content: string): Record<string, unknown>[] {
  // 1. Tenta JSON
  // 2. Tenta CSV (com virgula + newline)
  // 3. Fallback: tenta JSON mesmo assim
}
```

---

## 7. Armazenamento e Entrega

### 7.1 PPTX

O PPTX e retornado como string base64 diretamente no response do tool:

```
[PPTX_BASE64]{base64_data}[/PPTX_BASE64]
```

O frontend detecta esta tag e oferece download automatico.

**Estrutura do retorno da tool:**
```typescript
{
  success: true,
  content: "## Apresentacao Gerada\n- Titulo: ...\n- Slides: 8\n- Arquivo: apresentacao-123.pptx\n\n[PPTX_BASE64]...[/PPTX_BASE64]",
  slidesData: {
    slides: [...],              // Config de cada slide
    slideCount: 8,
    pptxBase64: "...",          // Dados binarios
    filename: "apresentacao-123.pptx",
    chartSvgs: { 2: "<svg>...", 5: "<svg>..." },  // SVGs por indice
  },
}
```

### 7.2 Graficos

- **SVG**: retornado inline em `[SVG_CHART]...[/SVG_CHART]`
- **PNG**: retornado inline em `[PNG_BASE64]...[/PNG_BASE64]`
- **Recharts**: retornado como JSON config, renderizado no frontend

### 7.3 Supabase Storage

Para persistencia de arquivos, o sistema usa Supabase Storage:
- Bucket dedicado para uploads
- Signed URLs com 1h de expiracao
- File service para upload, download e gerenciamento

### 7.4 Filename

Gerado automaticamente:
```typescript
const sanitizedTitle = (title || 'apresentacao')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .substring(0, 50);
const filename = `${sanitizedTitle}-${Date.now()}.pptx`;
```

---

## 8. Tratamento de Erros

### 8.1 Camadas de Fallback

```
1. IA estrutura slides
   ├── Sucesso → continua
   └── Falha → parseContentToSlides() (regex-based)

2. Chart rendering (por slide)
   ├── Sucesso → PNG embarcado
   └── Falha → slide continua sem chart (placeholder)

3. Python subprocess
   ├── Sucesso → resultado JSON
   ├── Timeout (30s) → erro retornado
   └── Crash → stderr capturado como erro

4. Interpretacao de dados (charts)
   ├── Primeira tentativa → temperature 0.1
   ├── Incompleto (< 60% score) → retry com temperature 0
   └── Validacao → remove valores inventados, mantem originais
```

### 8.2 Erros Comuns e Mensagens

| Cenario | Erro | Mensagem |
|---------|------|----------|
| Sem conteudo | 400 | "Nenhum conteudo fornecido para gerar slides" |
| IA falha | Fallback | Warning log + parsing simples |
| JSON invalido da IA | Throw | "AI response did not contain valid JSON" |
| Sem slides gerados | 500 | "Nao foi possivel extrair slides do conteudo" |
| Python indisponivel | 500 | "Python nao disponivel: Python3 com matplotlib/pandas/numpy nao encontrado" |
| Chart timeout | Warning | "Timeout: grafico demorou mais de 30s" |
| Dados insuficientes | 400 | "Dados insuficientes para gerar grafico. Minimo de 2 pontos" |

### 8.3 Logs de Diagnostico

```
[SlidesGenerator] Content is thin, preparing with AI first...
[SlidesGenerator] Content prepared: 1250 chars
[SlidesGenerator] Using AI to structure content...
[SlidesGenerator] AI generated 9 slides
[SlidesGenerator] Rendering 3 charts via CEO_GRAFICO...
[SlidesGenerator] Chart rendered: bar
[SlidesGenerator] Chart rendered: line
[SlidesGenerator] Chart render failed: {error}
[Chart Interpret] Completeness: {score: 0.83, numbersInText: 6, ...}
[Chart Interpret] Incomplete extraction, retrying with explicit prompt
[Chart Interpret] Validation warnings: [...]
```

---

## 9. Guia de Replicacao

### 9.1 Requisitos Tecnicos

| Componente | Tecnologia | Versao |
|-----------|-----------|--------|
| Runtime | Node.js | >= 18 |
| Runtime | Python | >= 3.8 |
| Framework | Next.js | 14.x |
| LLM | Claude (Anthropic) | Sonnet/Opus |
| PPTX (Python) | python-pptx | >= 0.6 |
| PPTX (JS) | pptxgenjs | >= 3.12 |
| Charts (Python) | matplotlib | >= 3.7 |
| Charts (Python) | pandas | >= 2.0 |
| Charts (Python) | numpy | >= 1.24 |
| Charts (Python) | PyYAML | >= 6.0 |
| Charts (JS) | recharts | >= 2.0 |
| PDF | pdfmake | >= 0.2 |
| DOCX | docx | >= 8.0 |
| XLSX | xlsx | >= 0.18 |
| Storage | Supabase | - |

### 9.2 Ordem de Implementacao Sugerida

```
Fase 1: Fundacao
├── 1.1 Setup Python environment (matplotlib, pandas, numpy)
├── 1.2 Implementar bridge Node.js ↔ Python (stdin/stdout JSON)
├── 1.3 Implementar BaseRenderer Python (graficos basicos)
└── 1.4 Implementar ChartGeneratorService (Recharts)

Fase 2: Graficos
├── 2.1 Implementar ChartInterpretService (prompt IA)
├── 2.2 Implementar renderers especificos (bar, line, pie, etc.)
├── 2.3 Implementar sistema de temas Python
└── 2.4 Implementar insights/profiling

Fase 3: Slides
├── 3.1 Implementar SlidesGeneratorService (orquestrador)
├── 3.2 Implementar prepareContent (prompt IA)
├── 3.3 Implementar structureContentWithAI (prompt IA principal)
├── 3.4 Implementar convertToSlideSpec (SlideSpec JSON)
├── 3.5 Implementar renderer Python (python-pptx)
├── 3.6 Implementar sistema de temas
└── 3.7 Implementar renderCharts (integracao)

Fase 4: Exportacao
├── 4.1 Implementar PDF generator (pdfmake)
├── 4.2 Implementar DOCX generator (docx)
└── 4.3 Implementar XLSX generator (xlsx)

Fase 5: Polish
├── 5.1 Quality config admin-configuravel
├── 5.2 Fallbacks e error handling
├── 5.3 Temas adicionais
└── 5.4 Infograficos
```

### 9.3 Pontos Criticos e Armadilhas

1. **Python subprocess**: Use `spawn` (nao `exec`), com timeout explicitio de 30s. O stdin/stdout deve ser JSON one-shot (envia tudo de uma vez, le tudo de uma vez).

2. **Prompts de IA**: Os prompts sao extensos propositalmente. Prompts curtos geram slides genericos. Inclua SEMPRE:
   - Exemplos concretos de bom vs ruim
   - Anti-patterns explicitos
   - Limites de caracteres rigorosos
   - Regras de diversidade de layout

3. **Limites de caracteres**: Devem ser aplicados TANTO no prompt (instrucao) QUANTO no codigo (substring/truncamento). A IA nem sempre respeita.

4. **Diversidade de layout**: Sem pos-processamento, a IA tende a gerar slides repetitivos (muitos bullets).

5. **Dados ilustrativos vs reais**: Marcar com `isIllustrative: true/false` e crucial. Dados reais nunca devem ser substituidos.

6. **Chart rendering em paralelo**: Use `Promise.all` mas com tratamento individual de erros. Um chart que falha nao deve derrubar os outros.

7. **Validacao de dados de grafico**: O `validateExtractedData` e essencial - impede que a IA invente numeros. Normalizar formato brasileiro (1.234,56).

8. **Coordenadas em polegadas**: O grid do PPTX usa polegadas (13.333" x 7.5" para widescreen). Todas as coordenadas devem ser neste sistema.

9. **Base64**: Remover prefixo `data:image/png;base64,` antes de embedding. Tambem remover prefixo de PPTX se presente.

10. **Temperature das chamadas IA**:
    - Preparacao de conteudo: `0.4` (alguma criatividade)
    - Estruturacao em slides: `0.3` (consistente mas nao rigido)
    - Interpretacao de dados: `0.1` (maxima precisao numerica)
    - Retry de dados: `0.0` (zero criatividade)

### 9.4 Checklist de Qualidade

- [ ] Titulos sao insights/conclusoes, nunca topicos descritivos
- [ ] Bullets tem no maximo 80 caracteres cada
- [ ] Nenhum slide repete o layout do anterior
- [ ] Minimo 3 layouts distintos por apresentacao
- [ ] KPI cards tem valores numericos concretos (nao "N/A")
- [ ] Charts renderizam sem erro (ou fallback funciona)
- [ ] Dados ilustrativos marcados com disclaimer
- [ ] Footer com paginacao presente
- [ ] Cores consistentes com o tema escolhido
- [ ] Fonte legivel em todos os elementos
- [ ] Slide de abertura com layout "title"
- [ ] Ultimo slide com conclusao/proximos passos
- [ ] Dados do usuario nunca alterados ou inventados
- [ ] Timeout Python respeitado (30s max)

### 9.5 Tabela de Bibliotecas

| Biblioteca | Linguagem | Uso | Install |
|-----------|-----------|-----|---------|
| pptxgenjs | JavaScript | PPTX (alternativo) | `npm install pptxgenjs` |
| python-pptx | Python | PPTX (principal) | `pip install python-pptx` |
| matplotlib | Python | Graficos estaticos | `pip install matplotlib` |
| pandas | Python | Manipulacao de dados | `pip install pandas` |
| numpy | Python | Computacao numerica | `pip install numpy` |
| PyYAML | Python | Config YAML | `pip install pyyaml` |
| recharts | JavaScript | Graficos interativos | `npm install recharts` |
| pdfmake | JavaScript | Geracao PDF | `npm install pdfmake` |
| docx | JavaScript | Geracao DOCX | `npm install docx` |
| xlsx | JavaScript | Geracao XLSX | `npm install xlsx` |

---

## Apendice A: Tipos TypeScript Completos

### SlideConfig

```typescript
type SlideLayout =
  | 'title' | 'titleContent' | 'bullets' | 'twoColumn' | 'blank'
  | 'chart' | 'kpiCards' | 'comparison' | 'timeline' | 'quote'
  | 'imageContent' | 'sectionDivider' | 'fullImage';

interface SlideConfig {
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  leftColumn?: string[];
  rightColumn?: string[];
  chartSpec?: SlideChartSpec;
  chartPngBase64?: string;
  chartSvg?: string;
  imageBase64?: string;
  kpiCards?: KpiCardSpec[];
  timelineItems?: TimelineItem[];
  comparison?: ComparisonColumn[];
  quoteText?: string;
  quoteAuthor?: string;
  overlayText?: string;
  disclaimer?: string;
}

interface SlideChartSpec {
  chartType: string;
  data: Record<string, unknown>[];
  title?: string;
  options?: Record<string, unknown>;
  isIllustrative?: boolean;
}

interface KpiCardSpec {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
}

interface TimelineItem {
  date: string;
  title: string;
  description?: string;
  status?: 'completed' | 'current' | 'upcoming';
}

interface ComparisonColumn {
  header: string;
  items: string[];
  highlight?: boolean;
}
```

### PresentationTheme

```typescript
interface PresentationTheme {
  primaryColor: string;        // ex: '204C8D'
  secondaryColor: string;      // ex: '3B82F6'
  accentColor: string;         // ex: '10B981'
  backgroundColor: string;     // ex: 'FFFFFF'
  textColor: string;           // ex: '1F2937'
  subtitleColor: string;       // ex: '6B7280'
  headingFontFamily: string;   // ex: 'Montserrat'
  fontFamily: string;          // ex: 'Montserrat'
}
```

### ChartConfig (Recharts)

```typescript
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'composed';
  title: string;
  data: ChartDataPoint[];
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
  type?: 'bar' | 'line' | 'area';
}
```

---

## Apendice B: Exemplos de Saida JSON da IA

### Exemplo 1: Apresentacao de Vendas (input curto)

**Input**: "Crie slides sobre resultados de vendas Q4"

**Output da IA (structureContentWithAI):**
```json
{
  "slides": [
    {
      "layout": "title",
      "title": "Resultados de Vendas Q4 2024",
      "subtitle": "Analise Trimestral - Performance Comercial"
    },
    {
      "layout": "kpiCards",
      "title": "Q4 superou meta em 3 indicadores-chave",
      "kpiCards": [
        {"value": "R$ 4.2M", "label": "Receita Total", "trend": "up", "change": "+18%"},
        {"value": "847", "label": "Novos Clientes", "trend": "up", "change": "+23%"},
        {"value": "R$ 4.960", "label": "Ticket Medio", "trend": "up", "change": "+7%"},
        {"value": "32%", "label": "Conversao", "trend": "down", "change": "-2pts"}
      ]
    },
    {
      "layout": "chart",
      "title": "Receita mensal acelerou em Nov/Dez puxada por vendas enterprise",
      "chartSpec": {
        "chartType": "bar",
        "data": [
          {"mes": "Out", "receita": 1200000, "meta": 1100000},
          {"mes": "Nov", "receita": 1450000, "meta": 1200000},
          {"mes": "Dez", "receita": 1550000, "meta": 1300000}
        ],
        "isIllustrative": true
      },
      "disclaimer": "Dados ilustrativos"
    },
    {
      "layout": "comparison",
      "title": "Canal digital cresceu 45% vs queda de 8% no presencial",
      "comparison": [
        {"header": "Digital", "items": ["45% crescimento YoY", "62% da receita total", "CAC 40% menor", "NPS 87"], "highlight": true},
        {"header": "Presencial", "items": ["-8% queda YoY", "38% da receita total", "Custo fixo alto", "NPS 72"]}
      ]
    },
    {
      "layout": "timeline",
      "title": "Roadmap comercial Q1 2025 foca em expansao digital",
      "timelineItems": [
        {"date": "Jan/25", "title": "Nova plataforma e-commerce", "status": "current"},
        {"date": "Fev/25", "title": "Programa de indicacao", "status": "upcoming"},
        {"date": "Mar/25", "title": "Expansao para 3 novos estados", "status": "upcoming"}
      ]
    },
    {
      "layout": "bullets",
      "title": "3 acoes prioritarias para manter momentum em Q1",
      "bullets": [
        "Dobrar investimento em digital (ROI 3.2x vs 1.4x presencial)",
        "Lancar programa de indicacao com bonus progressivo",
        "Treinar equipe presencial em vendas consultivas",
        "Revisar pricing para segmento enterprise (+15% margem)",
        "Implementar CRM preditivo para lead scoring"
      ]
    }
  ]
}
```

### Exemplo 2: Interpretacao de Dados para Grafico

**Input**: "Em janeiro nossa receita foi de 500 mil e o custo foi 200 mil. Em fevereiro a receita subiu para 600 mil com custo de 250 mil. Marco fechou com receita de 750 mil e custo de 300 mil."

**Output da IA (interpretChartData):**
```json
{
  "chartType": "composed",
  "title": "Receita vs Custo por Mes",
  "_analysis": {
    "numericValuesFound": 6,
    "categories": ["Janeiro", "Fevereiro", "Marco"],
    "valuesListed": [500, 200, 600, 250, 750, 300]
  },
  "extractedData": [
    {"name": "Janeiro", "receita": 500, "custo": 200},
    {"name": "Fevereiro", "receita": 600, "custo": 250},
    {"name": "Marco", "receita": 750, "custo": 300}
  ],
  "xAxisLabel": "Mes",
  "yAxisLabel": "Valor (mil)",
  "insights": "Receita crescente com margem estavel"
}
```

---

*Documento gerado automaticamente a partir do codebase rAIz Platform. Para detalhes de implementacao, consultar os arquivos fonte listados em cada secao.*

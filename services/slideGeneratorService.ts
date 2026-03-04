/**
 * Slide Generator Service
 * Pipeline completo de geração de slides com IA
 *
 * Pipeline: prepareContent → structureContentWithAI → enforceLayoutDiversity → generatePresentation
 */

import {
  SlideConfig,
  PresentationOptions,
  DEFAULT_QUALITY_CONFIG,
  enforceLayoutDiversity,
  sanitizeSlideConfig,
} from './slideTypes';
import { generatePresentation } from './slidePptxService';

// API URL (mesmo padrão do anthropicService)
const ANTHROPIC_API_URL = import.meta.env.DEV
  ? 'http://localhost:3021/api/llm-proxy?action=anthropic'
  : '/api/llm-proxy?action=anthropic';

// ============================================
// INTERFACES
// ============================================

export interface SlideGenerationInput {
  content: string;
  title?: string;
  author?: string;
  theme?: PresentationOptions['theme'];
  useAI?: boolean;
  conversationContext?: string;
}

export interface SlideGenerationResult {
  success: boolean;
  slides?: SlideConfig[];
  slideCount?: number;
  filename?: string;
  error?: string;
}

// ============================================
// PIPELINE PRINCIPAL
// ============================================

export async function generateSlidesFromContent(
  input: SlideGenerationInput
): Promise<SlideGenerationResult> {
  try {
    let content = input.content;

    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Nenhum conteúdo fornecido para gerar slides' };
    }

    // Fase 1: Preparar conteúdo se for curto
    if (content.length < 500 || (content.length < 1500 && input.conversationContext)) {
      try {
        content = await prepareContent(content, input.title, input.conversationContext);
      } catch (err) {
        console.warn('[SlideGenerator] Falha na preparação, usando conteúdo original');
      }
    }

    // Fase 2: Estruturar em slides via IA
    let slides: SlideConfig[];
    if (input.useAI !== false) {
      try {
        slides = await structureContentWithAI(content, input.title);
      } catch (err) {
        console.warn('[SlideGenerator] IA falhou, usando parsing simples');
        slides = parseContentToSlides(content, input.title);
      }
    } else {
      slides = parseContentToSlides(content, input.title);
    }

    if (!slides || slides.length === 0) {
      return { success: false, error: 'Não foi possível extrair slides do conteúdo' };
    }

    // Fase 3: Sanitizar e diversificar layouts
    slides = slides.map(sanitizeSlideConfig);
    slides = enforceLayoutDiversity(slides);

    // Fase 4: Gerar PPTX
    const options: PresentationOptions = {
      title: input.title,
      author: input.author,
      theme: input.theme,
    };

    await generatePresentation(slides, options);

    return {
      success: true,
      slides,
      slideCount: slides.length,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, error: errorMsg };
  }
}

// ============================================
// FASE 1: PREPARAÇÃO DE CONTEÚDO
// ============================================

async function prepareContent(
  rawInput: string,
  title?: string,
  conversationContext?: string
): Promise<string> {
  const systemPrompt = `Você é um consultor estratégico senior. Sua tarefa é ELABORAR e ENRIQUECER o conteúdo fornecido para criar uma apresentação executiva de alta qualidade.

TAREFA: Transforme o input do usuário em conteúdo RICO, DETALHADO e ESTRUTURADO em markdown.

REGRAS:
- Desenvolva cada ponto com profundidade (dados, métricas, insights, causas, consequências)
- Se o usuário pediu algo genérico (ex: "slides sobre vendas"), crie conteúdo substantivo com dados ilustrativos REALISTAS
- Se há contexto da conversa, EXTRAIA e USE todos os dados, números e insights relevantes
- Organize em seções claras com headers markdown (#)
- Inclua métricas concretas (números, percentuais, valores monetários)
- Adicione insights analíticos (causas, correlações, tendências)
- Termine com conclusões e recomendações acionáveis
- Mínimo 800 caracteres de output
- Máximo 3000 caracteres de output
- NÃO formate como slides - formate como CONTEÚDO RICO em markdown

ESTRUTURA DO OUTPUT:
# [Título/Tema Principal]

## Contexto e Situação Atual
[Descrição do cenário com dados]

## Dados e Métricas Principais
[KPIs, números, comparações]

## Análise e Insights
[Causas, correlações, tendências]

## Resultados / Impacto
[O que foi alcançado]

## Conclusões e Próximos Passos
[Síntese + recomendações acionáveis]

IMPORTANTE: Gere conteúdo ESPECÍFICO e PROFUNDO, nunca genérico.`;

  let userPrompt = '';
  if (title) userPrompt += `Tema: "${title}"\n`;
  userPrompt += `Pedido do usuário: ${rawInput}`;
  if (conversationContext) {
    userPrompt += `\n\nCONTEXTO DA CONVERSA (use dados relevantes daqui):\n${conversationContext}`;
  }
  userPrompt += '\n\nElabore o conteúdo acima em formato markdown rico e detalhado. Responda APENAS com o conteúdo em markdown.';

  const response = await callAI(systemPrompt, userPrompt, 0.4, 4096);
  return response || rawInput;
}

// ============================================
// FASE 2: ESTRUTURAÇÃO IA EM SLIDES
// ============================================

async function structureContentWithAI(
  content: string,
  title?: string
): Promise<SlideConfig[]> {
  const qualityConfig = DEFAULT_QUALITY_CONFIG;

  const systemPrompt = `Você é um consultor estratégico senior especializado em criar apresentações executivas de alta qualidade (estilo McKinsey/BCG).

ANALISE O INPUT DO USUÁRIO:

1. Se o usuário fizer um PEDIDO → CRIE conteúdo estratégico com dados e visualizações.
2. Se o usuário fornecer CONTEÚDO REAL → ESTRUTURE em slides visuais e impactantes.

LIMITES DE CARACTERES (respeitar RIGOROSAMENTE):
- title: max 60 caracteres
- subtitle: max 80 caracteres
- Cada bullet: max 80 caracteres (regra 6x6: max 6 bullets)
- content: max 200 caracteres
- KPI value: max 15 chars | KPI label: max 25 chars
- quoteText: max 200 chars

${qualityConfig.designRules}

DIVERSIDADE DE LAYOUTS (OBRIGATÓRIO):
- NUNCA repita o mesmo layout 2x consecutivas
- Mínimo 3 layouts distintos por apresentação
- Mínimo 2 slides visuais (chart/kpiCards/comparison/timeline) se tema envolve dados

LAYOUTS DISPONÍVEIS:

1. "title" - Slide de abertura: title, subtitle
2. "bullets" - Pontos-chave: title, bullets (array, max 5)
3. "titleContent" - Título + parágrafo: title, content (max 300 chars)
4. "twoColumn" - Duas colunas: title, leftColumn (array), rightColumn (array)
5. "chart" - Gráfico: title, chartSpec ({chartType, data, isIllustrative})
   chartType: "bar" | "line" | "pie" | "area" | "grouped_bar" | "waterfall"
6. "kpiCards" - Cards KPI (3-4): title, kpiCards ([{value, label, trend, change}])
   trend: "up" | "down" | "neutral"
7. "comparison" - Comparação: title, comparison ([{header, items, highlight}])
8. "timeline" - Timeline: title, timelineItems ([{date, title, description, status}])
   status: "completed" | "current" | "upcoming"
9. "quote" - Citação: title, quoteText, quoteAuthor
10. "sectionDivider" - Divisor: title, subtitle
11. "imageContent" - Gráfico + texto: title, bullets, chartSpec
12. "fullImage" - Visual impactante: title, subtitle, chartSpec

FORMATO JSON (responda APENAS JSON válido, sem texto):
{
  "slides": [
    { "layout": "title", "title": "...", "subtitle": "..." },
    { "layout": "kpiCards", "title": "...", "kpiCards": [...] },
    ...
  ]
}`;

  const qualityGuidance = content.length > 400
    ? `O input contém conteúdo detalhado (${content.length} chars). MAXIMIZE o uso dos dados fornecidos.`
    : `O input é breve (${content.length} chars). Desenvolva o tema com PROFUNDIDADE.`;

  let userPrompt = '';
  if (title) userPrompt += `Título sugerido: "${title}"\n\n`;
  userPrompt += `Input do usuário:\n\n${content}\n\n${qualityGuidance}\n\nCrie uma apresentação executiva premium. Requisitos:
- Layouts variados (mínimo 3 tipos diferentes)
- Títulos que são INSIGHTS (conclusões), não descrições
- Gráficos/KPIs quando dados disponíveis
- Bullets específicos e acionáveis
- Fluxo narrativo lógico: contexto → análise → conclusão → ação

Responda APENAS com JSON válido.`;

  const response = await callAI(systemPrompt, userPrompt, 0.3, 12288);

  if (!response) {
    throw new Error('AI response empty');
  }

  // Parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('AI response missing slides array');
  }

  return parsed.slides as SlideConfig[];
}

// ============================================
// FALLBACK: PARSING SIMPLES
// ============================================

function parseContentToSlides(content: string, title?: string): SlideConfig[] {
  const slides: SlideConfig[] = [];

  // Slide de título
  slides.push({
    layout: 'title',
    title: title || 'Apresentação',
    subtitle: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  });

  // Detectar seções (headers markdown, números, ALL CAPS)
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  let currentTitle = '';
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // É um header?
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/) ||
      trimmed.match(/^\d+\.\s+(.+)/) ||
      (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && trimmed.length < 60 ? [trimmed, trimmed] : null);

    if (headerMatch) {
      // Salvar slide anterior
      if (currentTitle && currentBullets.length > 0) {
        slides.push({
          layout: currentBullets.length > 3 ? 'bullets' : 'titleContent',
          title: currentTitle.substring(0, 60),
          bullets: currentBullets.length > 3 ? currentBullets.slice(0, 6) : undefined,
          content: currentBullets.length <= 3 ? currentBullets.join('. ').substring(0, 200) : undefined,
        });
      }

      currentTitle = (headerMatch[1] || headerMatch[0]).substring(0, 60);
      currentBullets = [];
    } else {
      // É um bullet/conteúdo
      const bulletText = trimmed
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+\)\s*/, '')
        .substring(0, 80);

      if (bulletText.length > 3) {
        currentBullets.push(bulletText);
      }
    }
  }

  // Último grupo
  if (currentTitle && currentBullets.length > 0) {
    slides.push({
      layout: currentBullets.length > 3 ? 'bullets' : 'titleContent',
      title: currentTitle.substring(0, 60),
      bullets: currentBullets.length > 3 ? currentBullets.slice(0, 6) : undefined,
      content: currentBullets.length <= 3 ? currentBullets.join('. ').substring(0, 200) : undefined,
    });
  }

  // Se nenhuma seção encontrada, criar slides de parágrafos
  if (slides.length <= 1) {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 10);
    paragraphs.forEach((para, idx) => {
      const bullets = para.split('\n').filter(l => l.trim().length > 3).map(l =>
        l.trim().replace(/^[-•*]\s*/, '').substring(0, 80)
      );

      if (bullets.length > 0) {
        slides.push({
          layout: idx % 2 === 0 ? 'bullets' : 'titleContent',
          title: bullets[0].substring(0, 60),
          bullets: bullets.length > 1 ? bullets.slice(1, 7) : undefined,
          content: bullets.length === 1 ? bullets[0].substring(0, 200) : undefined,
        });
      }
    });
  }

  // Garantir que tem pelo menos 2 slides
  if (slides.length < 2) {
    slides.push({
      layout: 'titleContent',
      title: 'Conteúdo',
      content: content.substring(0, 200),
    });
  }

  return slides;
}

// ============================================
// HELPER: CHAMAR IA
// ============================================

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ============================================
// CONVENIENCE: Gerar slides DRE a partir de dados
// ============================================

export async function generateDREPresentation(
  kpis: {
    totalRevenue: number;
    ebitda: number;
    netMargin: number;
    activeStudents: number;
    revenuePerStudent: number;
  },
  transactions: Array<{
    date: string;
    amount: number;
    type: string;
    filial: string;
    scenario?: string;
  }>,
  options?: {
    title?: string;
    useAI?: boolean;
    theme?: PresentationOptions['theme'];
  }
): Promise<SlideGenerationResult> {
  const fmt = (v: number) => `R$ ${(v / 1000000).toFixed(1)}M`;

  // Montar conteúdo rico a partir dos dados
  const content = `
# Relatório Executivo DRE - Raiz Educação

## Indicadores Principais
- Receita Líquida: ${fmt(kpis.totalRevenue)}
- EBITDA: ${fmt(kpis.ebitda)}
- Margem EBITDA: ${kpis.netMargin.toFixed(1)}%
- Alunos Ativos: ${kpis.activeStudents}
- Receita por Aluno: R$ ${kpis.revenuePerStudent.toLocaleString('pt-BR')}

## Análise por Filial
${Array.from(new Set(transactions.filter(t => t.scenario === 'Real').map(t => t.filial)))
  .map(filial => {
    const filialTrans = transactions.filter(t => t.filial === filial && t.scenario === 'Real');
    const rev = filialTrans.filter(t => t.type === 'REVENUE').reduce((s, t) => s + t.amount, 0);
    const cost = filialTrans.filter(t => t.type !== 'REVENUE').reduce((s, t) => s + t.amount, 0);
    const ebitda = rev - cost;
    const margin = rev > 0 ? (ebitda / rev * 100).toFixed(1) : '0.0';
    return `- ${filial}: Receita ${fmt(rev)}, EBITDA ${fmt(ebitda)}, Margem ${margin}%`;
  }).join('\n')}

## Status da Meta
A meta de margem EBITDA de 25% ${kpis.netMargin >= 25 ? 'foi atingida' : 'não foi atingida'}.
${kpis.netMargin >= 25
    ? 'O grupo apresenta operação saudável com margem acima do benchmark.'
    : 'É necessário revisar a estrutura de custos para atingir a meta.'}
`;

  return generateSlidesFromContent({
    content,
    title: options?.title || 'Relatório Executivo DRE',
    theme: options?.theme,
    useAI: options?.useAI,
  });
}

// ─── Variance PPT — AI Enrichment Service ─────────────────────────
// Enrich variance data with AI-generated insights before rendering PPT

import type {
  VariancePptData,
  VariancePptSection,
  VarianceAiInsights,
} from './variancePptTypes';

// ── Formatting ────────────────────────────────────────────────────

function fmtK(v: number): string {
  return `${Math.round(v / 1000)}k`;
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return 'N/D';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

// ── Context builder ───────────────────────────────────────────────

function buildSectionContext(section: VariancePptSection): string {
  const { node, tag01Nodes, invertDelta } = section;
  const lines: string[] = [];

  lines.push(`## ${section.tag0}`);
  lines.push(`Real: ${fmtK(node.real)} | Orçado: ${fmtK(node.orcCompare)} (Δ ${fmtPct(node.orcVarPct)}) | A-1: ${fmtK(node.a1Compare)} (Δ ${fmtPct(node.a1VarPct)})`);
  lines.push(`Custo invertido: ${invertDelta ? 'sim' : 'não'}`);
  lines.push('');

  for (const t01 of tag01Nodes) {
    lines.push(`  - ${t01.label}: Real ${fmtK(t01.real)} | Orç ${fmtK(t01.orcCompare)} (Δ ${fmtPct(t01.orcVarPct)}) | A-1 ${fmtK(t01.a1Compare)} (Δ ${fmtPct(t01.a1VarPct)})`);

    if (t01.orcAiSummary) {
      lines.push(`    Síntese: ${t01.orcAiSummary.slice(0, 120)}`);
    }

    for (const t02 of t01.children) {
      lines.push(`    - ${t02.label}: Real ${fmtK(t02.real)} | Orç ${fmtK(t02.orcCompare)} (Δ ${fmtPct(t02.orcVarPct)})`);
    }
  }

  return lines.join('\n');
}

function buildVarianceContext(data: VariancePptData): string {
  const parts: string[] = [];

  parts.push(`# DRE Gerencial — ${data.monthLabel}`);
  parts.push(`Entidade: ${data.marca || 'Consolidado'} | Ano: ${data.year} | Comparativo: ${data.a1Year}`);
  parts.push(`Cobertura justificativas: ${data.stats.coveragePct}% (${data.stats.justified + data.stats.approved}/${data.stats.totalLeaves})`);
  parts.push('');

  // Calc rows
  for (const calc of data.calcRows) {
    parts.push(`**${calc.label}**: Real ${fmtK(calc.real)} | Orç ${fmtK(calc.orcado)} (Δ ${fmtPct(calc.deltaOrcPct)}) | A-1 ${fmtK(calc.a1)} (Δ ${fmtPct(calc.deltaA1Pct)})`);
  }
  parts.push('');

  // Sections
  for (const section of data.sections) {
    parts.push(buildSectionContext(section));
    parts.push('');
  }

  return parts.join('\n');
}

// ── Prompts ───────────────────────────────────────────────────────

function buildSystemPromptVariance(): string {
  return `Você é um analista sênior de FP&A em uma empresa de educação (Raiz Educação S.A.).
Sua tarefa é analisar dados de DRE (Demonstração de Resultado do Exercício) e produzir insights executivos concisos para uma apresentação PowerPoint.

Regras:
- Escreva em português brasileiro, tom profissional e objetivo
- Valores em milhares (k) de reais
- Para custos (02., 03., 04.), desvio negativo (gastar menos) é FAVORÁVEL
- Para receita (01.), desvio positivo é FAVORÁVEL
- Foque nos desvios mais relevantes (>5% de variação)
- Cada insight deve ter 2-3 frases no máximo
- key_drivers: máximo 3 itens, formato curto (ex: "Receita editorial +12% vs orçado")
- risk_flag: null se não há risco relevante, senão 1 frase
- Responda APENAS com JSON válido, sem markdown ou texto extra`;
}

function buildUserPromptVariance(data: VariancePptData): string {
  const context = buildVarianceContext(data);

  // Build expected JSON structure dynamically — one entry per section
  const sectionsExample = data.sections
    .map(s => `    "${s.tag0}": {\n      "insight": "2-3 frases sobre esta seção",\n      "key_drivers": ["driver principal 1", "driver principal 2"],\n      "risk_flag": null\n    }`)
    .join(',\n');

  return `Analise os dados abaixo e retorne um JSON com a seguinte estrutura EXATA (uma entrada por seção):

{
  "executive_summary": "1-2 frases resumindo o resultado geral do mês",
  "sections": {
${sectionsExample}
  },
  "closing_summary": "1-2 frases de conclusão e próximos passos"
}

REGRAS:
- Mantenha EXATAMENTE as chaves mostradas acima em "sections" (sem alterar nomes)
- insight: 2-3 frases sobre a seção
- key_drivers: máximo 3 itens curtos (ex: "Receita editorial +12% vs orçado")
- risk_flag: null se sem risco relevante, senão 1 frase curta
- Responda APENAS com JSON válido, sem markdown

DADOS:
${context}`;
}

// ── API call ──────────────────────────────────────────────────────

export async function enrichVarianceWithAi(
  data: VariancePptData,
): Promise<VarianceAiInsights | null> {
  try {
    const system = buildSystemPromptVariance();
    const user = buildUserPromptVariance(data);

    const response = await fetch('/api/llm-proxy?action=enrich-variance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user }),
    });

    if (!response.ok) {
      console.warn('enrich-variance API error:', response.status);
      return null;
    }

    const result = await response.json() as VarianceAiInsights;

    // Basic validation
    if (!result.executive_summary || !result.sections || !result.closing_summary) {
      console.warn('enrich-variance: resposta incompleta', result);
      return null;
    }

    return result;
  } catch (error) {
    console.warn('enrich-variance falhou (fallback silencioso):', error);
    return null;
  }
}

// ── Injection ─────────────────────────────────────────────────────

export function injectAiInsights(
  data: VariancePptData,
  insights: VarianceAiInsights,
): void {
  // Inject executive/closing summaries
  data.executiveSummary = insights.executive_summary;
  data.closingSummary = insights.closing_summary;

  // Inject per-section insights into tag0 nodes
  for (const section of data.sections) {
    const sectionInsight = insights.sections[section.tag0];
    if (sectionInsight) {
      section.node.enrichedInsight = sectionInsight.insight;
      section.node.enrichedDrivers = sectionInsight.key_drivers || null;
    }
  }
}

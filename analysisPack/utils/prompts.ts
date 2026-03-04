import type { AnalysisContext } from "../../types";

export function buildSystemPrompt() {
  return `
Você é um analista FP&A sênior (estilo CFO). Seu trabalho:
- Explicar performance (Real vs Orçado e vs Prior quando houver)
- Priorizar por Pareto 80/20
- Ser objetivo, acionável, sem floreio
- NÃO recalcular números: use apenas os dados fornecidos
- Evite jargão excessivo; use linguagem corporativa clara
- Sempre incluir: headline, principais drivers, riscos, oportunidades e ações recomendadas.

Gere uma estrutura de slides (como uma apresentação pronta) + definições de gráficos.

IMPORTANTE: Retorne APENAS um JSON válido no formato AnalysisPack sem texto adicional.
`;
}

export function buildUserPrompt(ctx: AnalysisContext) {
  // Compact dataset summary for the AI — full data, not just keys
  const ds = ctx.datasets as Record<string, any>;
  const datasetSummary: Record<string, any> = {};
  for (const [key, val] of Object.entries(ds)) {
    if (key === 'r12' && val?.series) {
      // Summarise R12: only last 3 months to save tokens
      const x = val.x as string[];
      datasetSummary.r12 = {
        months: x.slice(-3),
        series: (val.series as any[]).map(s => ({
          key: s.key,
          name: s.name,
          last3: (s.data as number[]).slice(-3),
        })),
      };
    } else {
      datasetSummary[key] = val;
    }
  }

  return `
Crie um pacote de análise e slides para:
- Organização: ${ctx.org_name}
- Escopo: ${ctx.scope_label}
- Período: ${ctx.period_label}
- Moeda: ${ctx.currency}

KPIs (já calculados):
${JSON.stringify(ctx.kpis, null, 2)}

Datasets (dados reais — use estes números na análise):
${JSON.stringify(datasetSummary, null, 2)}

Regras:
${JSON.stringify(ctx.analysis_rules ?? {}, null, 2)}
${datasetSummary.justifications?.length > 0 ? `
Justificativas dos responsáveis (já preenchidas pelos gestores — incorpore na análise):
${JSON.stringify(datasetSummary.justifications, null, 2)}
` : ''}
Instruções:
1) Gere de 5 a 12 slides.
2) Use pelo menos: 1 waterfall/bridge, 1 linha R12 e 1 pareto.
3) Escreva bullets curtos (1 linha) com números quando fizer sentido.
4) Traga ações recomendadas (com dono/ETA/impacto).

Schema JSON esperado:
{
  "meta": {
    "org_name": "${ctx.org_name}",
    "period_label": "${ctx.period_label}",
    "scope_label": "${ctx.scope_label}",
    "currency": "${ctx.currency}",
    "generated_at_iso": "ISO_DATE_STRING"
  },
  "executive_summary": {
    "headline": "string (frase principal resumindo performance)",
    "bullets": ["3-8 bullets destacando principais achados"],
    "risks": ["1-6 riscos identificados"],
    "opportunities": ["1-6 oportunidades"]
  },
  "actions": [
    {
      "owner": "string (responsável)",
      "action": "string (o que fazer)",
      "eta": "DD/MM/YYYY",
      "expected_impact": "string (impacto esperado)"
    }
  ],
  "charts": [
    {
      "id": "string (unique)",
      "kind": "line" | "waterfall" | "pareto" | "heatmap",
      "dataset_key": "r12" | "ebitda_bridge_vs_plan_ytd" | "pareto_cost_variance_ytd" | "heatmap_variance",
      "title": "string",
      "series_keys": ["array de keys"] // apenas para line charts
      // ou "top_n": number // apenas para pareto
    }
  ],
  "slides": [
    {
      "title": "string",
      "subtitle": "string (opcional)",
      "blocks": [
        {
          "type": "text" | "callout" | "kpi_grid" | "chart" | "table",
          // campos específicos por tipo:
          // text: { title?, bullets: [] }
          // callout: { intent: "positive"|"negative"|"neutral", title, bullets: [] }
          // kpi_grid: { title?, kpi_codes: [] }
          // chart: { chart_id, height: "sm"|"md"|"lg", note? }
          // table: { title?, dataset_key: "drivers_table" }
        }
      ]
    }
  ]
}

Retorne APENAS o JSON válido, sem markdown ou texto adicional.
`;
}

/**
 * Extrai JSON de resposta de IA que pode conter markdown ou texto adicional
 */
export function extractJSON(text: string): string {
  // Remover markdown code blocks se existir
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Procurar por JSON puro
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

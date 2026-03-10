import type { FinancialSummary } from '../../../types/agentTeam';

// --------------------------------------------
// Tipos internos
// --------------------------------------------

interface PromptPair {
  system: string;
  user: string;
}

interface PrevStepOutput {
  agent_code: string;
  step_type: string;
  output_data: Record<string, unknown>;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function formatFilterContext(filterContext?: Record<string, unknown> | null): string {
  if (!filterContext) return '';
  const parts: string[] = ['', '## Filtros Aplicados'];
  if (filterContext.marcas) parts.push(`- Marcas: ${(filterContext.marcas as string[]).join(', ')}`);
  if (filterContext.filiais) parts.push(`- Filiais: ${(filterContext.filiais as string[]).join(', ')}`);
  if (filterContext.tags01) parts.push(`- Tags01: ${(filterContext.tags01 as string[]).join(', ')}`);
  if (filterContext.months_range) parts.push(`- Período: ${filterContext.months_range}`);
  if (filterContext.year) parts.push(`- Ano: ${filterContext.year}`);
  parts.push('');
  return parts.join('\n');
}

function formatSummaryCompact(summary: FinancialSummary): string {
  return '## Dados Financeiros\n```json\n' + JSON.stringify(summary) + '\n```';
}

function formatPrevOutputs(prevOutputs: PrevStepOutput[]): string {
  if (prevOutputs.length === 0) return '';
  const blocks = prevOutputs.map((p) => {
    return `### ${p.agent_code} (${p.step_type})\n\`\`\`json\n${JSON.stringify(p.output_data)}\n\`\`\``;
  });
  return '\n\n## Outputs Anteriores\n\n' + blocks.join('\n\n');
}

// ============================================
// ALEX — Plan (Step 1)
// ============================================

function buildSupervisorPlanPrompt(
  objective: string,
  summary: FinancialSummary,
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Alex, Strategic Supervisor da Equipe Alpha — análise financeira DRE de escolas brasileiras (Raiz Educação).',
    '',
    '## Sua Missão (Plan)',
    'Interpretar o objetivo do usuário à luz dos dados financeiros e direcionar 5 agentes especialistas.',
    '',
    '## Como Analisar',
    '1. Percorra a DRE linha a linha:',
    '   - 01. Receita Líquida — gap vs Orçado e vs A-1',
    '   - 02. Custos Variáveis — aderência e tendência',
    '   - 03. Custos Fixos — compressão ou expansão',
    '   - 04. SG&A — eficiência administrativa',
    '   - 06. Rateio Raiz — alocação corporativa',
    '   - Margem de Contribuição — saúde operacional',
    '   - EBITDA — resultado final e % margem',
    '2. Identifique os top 5 desvios materiais (por tag01)',
    '3. Formule hipóteses sobre causas raiz',
    '4. Direcione cada agente com foco diferenciado:',
    '   - Bruna (bruna) → onde a base pode estar inconsistente',
    '   - Carlos (carlos) → quais variações aprofundar, drivers de EBITDA',
    '   - Denilson (denilson) → onde há espaço de otimização de margem',
    '   - Edmundo (edmundo) → premissas para projeção do ano, gap vs target',
    '   - Falcão (falcao) → riscos específicos a investigar por marca',
    '',
    '## Formato Obrigatório',
    'Sempre use números: "gap de R$ X | R$ Y vs Orçado (Z%)".',
    'Nunca escreva análise sem variação numérica.',
    '',
    '## Output JSON — 3 campos obrigatórios:',
    '1. executive_summary: 2-3 frases interpretando o problema com números concretos',
    '2. priority_areas[max 5]: strings com as frentes prioritárias identificadas na DRE',
    '3. assignments[5]: { agent_code, focus(1 frase) } — um para cada agente',
    '',
    'Português brasileiro. CONCISO.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    '',
    'Produza: executive_summary, priority_areas e assignments.',
  ].join('\n');

  return { system, user };
}

// ============================================
// BRUNA — Data Quality (Step 2)
// ============================================

function buildDataQualityPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Bruna, especialista em qualidade de dados. Avalie consistência da base DRE.',
    'NÃO bloqueie — sinalize cautela.',
    '',
    'JSON com 3 campos:',
    '1. quality_score: número 0-100',
    '2. issues[max 5]: description(1 frase), severity(low/medium/high/critical), affected_area',
    '3. caution_level: "high_confidence" | "moderate_reservations" | "critical_reservations"',
    '',
    'Português brasileiro. CONCISO — max 1 frase por campo.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Avalie qualidade e produza: quality_score, issues e caution_level.',
  ].join('\n');

  return { system, user };
}

// ============================================
// CARLOS — Performance (Step 3)
// ============================================

function buildPerformancePrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Carlos, analista de performance. Compare Real vs Orçado vs A-1 na DRE.',
    '',
    'JSON com 3 campos:',
    '1. summary: 2-3 frases com principais drivers e números',
    '2. top_variations[max 6]: dre_line, tag01, real, budget, gap_pct, cause(1 frase), nature(operacional|temporal|estrutural|nao_recorrente|erro_orcamento)',
    '3. ebitda_impact: pressures[max 3 strings], reliefs[max 3 strings], reading(1 frase)',
    '',
    'Formato obrigatório: "R$ X vs Orçado (Z%)". Português brasileiro. CONCISO.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise performance e produza: summary, top_variations e ebitda_impact.',
  ].join('\n');

  return { system, user };
}

// ============================================
// DENILSON — Optimization (Step 4)
// ============================================

function buildOptimizationPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Denilson, arquiteto de otimização. Proponha ações para melhorar EBITDA/margem.',
    'Trabalhe por marca. Separe ganho real de enquadramento analítico.',
    '',
    'JSON com 3 campos:',
    '1. actions[max 6]: action(1 frase), brand, target_line, expected_impact_brl, priority(high/medium/low), is_real_gain(bool)',
    '2. total_expected_impact: ebitda_impact_brl, margin_impact_pct',
    '3. constraints[max 3]: description(1 frase)',
    '',
    'Português brasileiro. CONCISO — max 1 frase por campo.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Proponha otimizações: actions, total_expected_impact e constraints.',
  ].join('\n');

  return { system, user };
}

// ============================================
// EDMUNDO — Forecast (Step 5)
// ============================================

function buildForecastPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Edmundo, especialista em forecast. Projete trajetória até fim do ano por marca.',
    '',
    'JSON com 3 campos:',
    '1. projections[max 4]: brand, base_case_ebitda, target_case_ebitda, stress_case_ebitda, confidence(high/medium/low), narrative(1 frase)',
    '2. gap_to_target: total_gap_brl, main_drivers[max 3 strings], feasibility(1 frase)',
    '3. risks[max 3]: description(1 frase), probability(high/medium/low)',
    '',
    'Português brasileiro. CONCISO — max 1 frase por campo.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Projete fechamento do ano: projections, gap_to_target e risks.',
  ].join('\n');

  return { system, user };
}

// ============================================
// FALCÃO — Risk (Step 6)
// ============================================

function buildRiskPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Falcão, avaliador de riscos. Negócio é educação — risco a escolas/famílias é crítico.',
    '',
    'JSON com 3 campos:',
    '1. risk_exposure_by_brand[max 4]: brand_name, overall_risk_level(low/medium/high/critical), risk_summary(1 frase), key_risk_drivers[max 3]',
    '2. critical_alerts[max 5]: alert_title, severity(critical/high/medium/low), brand, rationale(1 frase), mitigation(1 frase)',
    '3. executive_risk_summary: top_risks[max 3], non_negotiable_risks[max 2], suggested_caution_tone(1 frase)',
    '',
    'Português brasileiro. CONCISO — max 1 frase por campo.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Avalie riscos: risk_exposure_by_brand, critical_alerts e executive_risk_summary.',
  ].join('\n');

  return { system, user };
}

// ============================================
// ALEX — Consolidation (Step 7)
// ============================================

function buildConsolidationPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Alex, Executive Consolidator da Equipe Alpha — último passo analítico antes da revisão executiva.',
    '',
    '## Sua Missão (Consolidate)',
    'Integrar os outputs de 5 agentes especialistas em uma narrativa executiva única, coerente e acionável para a diretoria.',
    '',
    '## O que você recebe',
    '- Bruna → quality_score, issues de dados, nível de cautela',
    '- Carlos → top variações Real vs Orçado, drivers de EBITDA, pressões e alívios',
    '- Denilson → ações de otimização por marca, impacto esperado em R$, restrições',
    '- Edmundo → projeções por marca (base/target/stress), gap vs target, riscos',
    '- Falcão → exposição de risco por marca, alertas críticos, tom de cautela',
    '',
    '## Como Consolidar',
    '1. Resolva conflitos entre agentes (ex: Denilson otimista vs Falcão cauteloso → pondere)',
    '2. Percorra a DRE consolidada:',
    '   - Receita → performance realizada + forecast + riscos identificados',
    '   - Custos → otimizações viáveis de Denilson + restrições + qualidade de Bruna',
    '   - EBITDA → cenário base vs target vs stress de Edmundo',
    '   - Por marca quando filtro aplicado',
    '3. Priorize recomendações com owner concreto e impacto em R$',
    '4. Monte 6 slides executivos (3-4 bullets cada, com números)',
    '',
    '## Formato Obrigatório',
    'Bullets: "R$ X vs Orçado (Z%) | vs A-1 (K%)".',
    'Cada recomendação: ação + owner + impacto esperado.',
    'Nunca escreva bullet sem variação numérica.',
    '',
    '## Output JSON — 3 campos obrigatórios:',
    '1. consolidated_summary: texto corrido 3-4 parágrafos com números concretos',
    '2. recommendations[max 5]: { action, priority(high/medium/low), expected_impact, owner }',
    '3. board_slides[6]: { title, bullets[3-4 strings] }',
    '   Slides: Visão Geral | Performance | Riscos | Forecast | Ações | Recomendação',
    '',
    'Português brasileiro. Tom executivo direto. Arbitre conflitos entre agentes.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Consolide: consolidated_summary, recommendations e board_slides.',
  ].join('\n');

  return { system, user };
}

// ============================================
// DIRETOR/EXECUTIVO — Review (Step 8)
// ============================================

function buildDirectorReviewPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é o revisor executivo. Último filtro antes da reunião da diretoria.',
    'Teste clareza, cobre ownership/prazos, desafie robustez.',
    '',
    'JSON com 3 campos:',
    '1. key_questions[max 8]: question, expected_answer(1-2 frases), priority(critical/high/medium)',
    '2. weaknesses[max 5]: point(1 frase), fix_needed(1 frase)',
    '3. readiness: level(ready/needs_adjustments/not_ready), rationale(1-2 frases), mandatory_fixes[max 3 strings]',
    '',
    'Português brasileiro. Tom executivo direto.',
  ].join('\n');

  const user = [
    `# Objetivo: ${objective}`,
    formatFilterContext(filterContext),
    formatSummaryCompact(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Revise: key_questions, weaknesses e readiness.',
  ].join('\n');

  return { system, user };
}

// ============================================
// Lookup público
// ============================================

export function buildPrompt(
  agentCode: string,
  stepType: string,
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  if (stepType === 'plan') {
    return buildSupervisorPlanPrompt(objective, summary, filterContext);
  }
  if (stepType === 'consolidate') {
    return buildConsolidationPrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'execute' && agentCode === 'bruna') {
    return buildDataQualityPrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'execute' && agentCode === 'carlos') {
    return buildPerformancePrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'execute' && agentCode === 'denilson') {
    return buildOptimizationPrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'execute' && agentCode === 'edmundo') {
    return buildForecastPrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'execute' && agentCode === 'falcao') {
    return buildRiskPrompt(objective, summary, prevOutputs, filterContext);
  }
  if (stepType === 'review' && (agentCode === 'executivo' || agentCode === 'diretor')) {
    return buildDirectorReviewPrompt(objective, summary, prevOutputs, filterContext);
  }

  throw new Error(`Prompt não encontrado para agent_code=${agentCode}, step_type=${stepType}`);
}

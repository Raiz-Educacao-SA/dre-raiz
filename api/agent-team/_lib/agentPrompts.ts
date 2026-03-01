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
  const parts: string[] = ['', '## Contexto de Filtros Aplicados'];
  parts.push('> Os dados abaixo já estão filtrados. Avalie a qualidade considerando apenas o escopo selecionado.');
  if (filterContext.marcas) parts.push(`- **Marcas**: ${(filterContext.marcas as string[]).join(', ')}`);
  if (filterContext.filiais) parts.push(`- **Filiais**: ${(filterContext.filiais as string[]).join(', ')}`);
  if (filterContext.tags01) parts.push(`- **Tags01 (Centro de Custo)**: ${(filterContext.tags01 as string[]).join(', ')}`);
  if (filterContext.months_range) parts.push(`- **Período**: ${filterContext.months_range}`);
  if (filterContext.year) parts.push(`- **Ano**: ${filterContext.year}`);
  parts.push('');
  return parts.join('\n');
}

function formatSummaryBlock(summary: FinancialSummary): string {
  return [
    `## Resumo Financeiro (${summary.periodo})`,
    '',
    `### Receita`,
    `- Real: R$ ${summary.receita.real.toLocaleString('pt-BR')}`,
    `- Orçado: R$ ${summary.receita.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.receita.a1.toLocaleString('pt-BR')}`,
    `- Gap Real vs Orçado: ${summary.receita.gap_pct}%`,
    '',
    `### Custos Variáveis`,
    `- Real: R$ ${summary.custos_variaveis.real.toLocaleString('pt-BR')}`,
    `- Orçado: R$ ${summary.custos_variaveis.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.custos_variaveis.a1.toLocaleString('pt-BR')}`,
    '',
    `### Custos Fixos`,
    `- Real: R$ ${summary.custos_fixos.real.toLocaleString('pt-BR')}`,
    `- Orçado: R$ ${summary.custos_fixos.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.custos_fixos.a1.toLocaleString('pt-BR')}`,
    '',
    `### SG&A`,
    `- Real: R$ ${summary.sga.real.toLocaleString('pt-BR')}`,
    `- Orçado: R$ ${summary.sga.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.sga.a1.toLocaleString('pt-BR')}`,
    '',
    `### Rateio`,
    `- Real: R$ ${summary.rateio.real.toLocaleString('pt-BR')}`,
    `- Orçado: R$ ${summary.rateio.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.rateio.a1.toLocaleString('pt-BR')}`,
    '',
    `### Margem de Contribuição`,
    `- Real: R$ ${summary.margem_contribuicao.real.toLocaleString('pt-BR')} (${summary.margem_contribuicao.pct_real}%)`,
    `- Orçado: R$ ${summary.margem_contribuicao.orcado.toLocaleString('pt-BR')}`,
    '',
    `### EBITDA`,
    `- Real: R$ ${summary.ebitda.real.toLocaleString('pt-BR')} (${summary.ebitda.pct_real}%)`,
    `- Orçado: R$ ${summary.ebitda.orcado.toLocaleString('pt-BR')}`,
    `- Ano Anterior: R$ ${summary.ebitda.a1.toLocaleString('pt-BR')}`,
    '',
    `### Top 5 Variações (|Real - Orçado|)`,
    ...summary.top5_variacoes.map(
      (v, i) => `${i + 1}. ${v.tag01}: Real R$ ${v.real.toLocaleString('pt-BR')}, Orçado R$ ${v.orcado.toLocaleString('pt-BR')}, Δ ${v.delta_pct}%`
    ),
    '',
    `### Top 5 Receitas (Real)`,
    ...summary.top5_tags01_receita.map(
      (t, i) => `${i + 1}. ${t.tag01}: R$ ${t.total.toLocaleString('pt-BR')}`
    ),
    '',
    `### Top 5 Custos (Real, |valor|)`,
    ...summary.top5_tags01_custo.map(
      (t, i) => `${i + 1}. ${t.tag01}: R$ ${t.total.toLocaleString('pt-BR')}`
    ),
    '',
    `### Tendência Mensal`,
    ...summary.tendencia_mensal.map(
      (m) => `- ${m.mes}: Receita R$ ${m.receita.toLocaleString('pt-BR')}, EBITDA R$ ${m.ebitda.toLocaleString('pt-BR')}`
    ),
  ].join('\n');
}

function formatPrevOutputs(prevOutputs: PrevStepOutput[]): string {
  if (prevOutputs.length === 0) return '';

  const blocks = prevOutputs.map((p) => {
    return [
      `### Output de ${p.agent_code} (${p.step_type})`,
      '```json',
      JSON.stringify(p.output_data, null, 2),
      '```',
    ].join('\n');
  });

  return '\n\n## Outputs Anteriores do Pipeline\n\n' + blocks.join('\n\n');
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
    'Você é Alex, Supervisor Estratégico e Consolidador Executivo de uma equipe de análise financeira (DRE) de uma rede de escolas brasileiras.',
    'Seu papel é analisar os dados financeiros pré-agregados, identificar pontos críticos e criar um plano estratégico para a equipe.',
    '',
    'Você coordena 5 agentes especialistas:',
    '- Bruna: Qualidade de Dados — verifica integridade e confiabilidade',
    '- Carlos: Performance — analisa margens, tendências e indicadores',
    '- Denilson: Otimização — encontra plano ótimo de ações respeitando restrições',
    '- Edmundo: Forecast — projeta tendências futuras e mede confiança',
    '- Falcão: Risco — monitora riscos estruturais e macro, pressiona prudência',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- Seja específico nos findings — cite valores, percentuais e tags01',
    '- Priorize desvios significativos (>5% do orçado)',
    '- O campo assignments deve conter exatamente 5 entries: bruna, carlos, denilson, edmundo, falcao',
    '- focus_areas deve ser específico ao que cada agente deve investigar',
    '- Distribua foco de forma inteligente — não todos olhando a mesma coisa',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    '',
    'Analise os dados acima e produza seu plano de supervisão estratégica.',
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
  const hasFilters = filterContext && (filterContext.marcas || filterContext.filiais || filterContext.tags01);

  const system = [
    'Você é Bruna, especialista em Qualidade de Dados financeiros de uma rede de escolas brasileiras.',
    'Seu papel é verificar a integridade, consistência e completude dos dados do DRE.',
    '',
    'O que verificar:',
    '- Meses com receita zerada ou valores atípicos (outliers)',
    '- Tags01 com variações extremas entre Real e Orçado (>30%)',
    '- Tendências mensais com quebras abruptas (variação >50% mês a mês)',
    '- Categorias de custo desproporcionais ao histórico (A-1)',
    '- Campos ou mapeamentos ausentes na estrutura do DRE',
    '',
    'IMPORTANTE — Poder de Bloqueio:',
    '- Se quality_score < 40, o pipeline será BLOQUEADO automaticamente',
    '- Use blocking_issues para listar problemas que impedem qualquer análise confiável',
    '- recommendation_to_proceed deve ser false se a base for inviável',
    '- data_risk_summary deve explicar o risco geral da base',
    '',
    ...(hasFilters ? [
      'IMPORTANTE — Dados Filtrados:',
      '- Os dados foram FILTRADOS pelo usuário (marca, filial, tag01 ou período específico).',
      '- É NORMAL que dados filtrados tenham menos meses, menos tags01 e valores menores que o consolidado total.',
      '- NÃO penalize a qualidade por escopo reduzido — avalie apenas a consistência DENTRO do recorte selecionado.',
      '- Meses zerados FORA do período selecionado não são problemas de qualidade.',
      '- Receita menor que o esperado pode ser natural de uma marca/filial específica.',
      '',
    ] : []),
    'Regras:',
    '- Responda em português brasileiro',
    '- quality_score de 0 a 100 — quanto maior, mais confiáveis os dados',
    '- Cada inconsistência deve ter: type, area, description, severity, affected_value, suggested_fix',
    '- Classifique severidade: low (informativo), medium (requer atenção), high (urgente)',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise a qualidade dos dados e produza seu relatório.',
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
    'Você é Carlos, especialista em Performance Financeira de uma rede de escolas brasileiras.',
    'Seu papel é analisar margens, tendências e indicadores do DRE para identificar drivers e desvios relevantes.',
    '',
    'O que analisar:',
    '- Receita: evolução mês a mês, gap vs orçado, comparação com A-1',
    '- Custos variáveis: proporção sobre receita, desvios do orçado',
    '- Custos fixos e SG&A: eficiência operacional',
    '- Margem de contribuição: % real vs orçado, tendência',
    '- EBITDA: evolução, margem %, comparação multi-cenário',
    '- Top desvios: quais tags01 estão mais desalinhadas e por quê',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- executive_performance_summary: visão executiva em 2-3 parágrafos',
    '- ebitda_analysis: análise detalhada do EBITDA',
    '- key_deviations: cada item deve ter area, tag01, valores real/budget/a1, gaps, materialidade e driver provável',
    '- key_positive_drivers e key_negative_drivers: listas separadas e claras',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise a performance financeira e produza seu relatório.',
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
    'Você é Denilson, Arquiteto de Otimização de uma rede de escolas brasileiras.',
    'Seu papel é encontrar a melhor combinação de ações para maximizar resultado financeiro respeitando restrições.',
    '',
    'O que fazer:',
    '- Analisar os desvios identificados pelo Carlos (performance)',
    '- Propor ações concretas priorizadas por impacto em EBITDA, margem e score',
    '- Respeitar restrições operacionais: não cortar receita, não eliminar operações essenciais',
    '- Calcular impacto estimado de cada ação proposta',
    '- Separar ações viáveis das inviáveis com justificativa',
    '',
    'Restrições padrão a considerar:',
    '- Receita não pode ser reduzida artificialmente',
    '- Cortes em custos fixos têm limite de 15% por categoria',
    '- Rateio não é controlável pelo gestor local',
    '- Ações devem ser implementáveis em até 90 dias',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- optimization_objective: descreva o que está sendo otimizado',
    '- constraints_considered: liste todas as restrições consideradas',
    '- proposed_actions: ações viáveis com impacto quantificado',
    '- infeasible_actions: ações descartadas com motivo',
    '- feasibility_status: feasible (todas viáveis), partial (algumas inviáveis), infeasible (nenhuma viável)',
    '- optimization_rationale: racional completo da otimização',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise os dados e outputs anteriores para produzir seu plano de otimização.',
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
    'Você é Edmundo, especialista em Forecast e Inteligência Adaptativa de uma rede de escolas brasileiras.',
    'Seu papel é projetar tendências futuras, medir confiança e estabilidade das projeções.',
    '',
    'O que fazer:',
    '- Usar a tendência mensal disponível para projetar 3 períodos à frente',
    '- Criar 3 cenários: base (tendência linear), downside (-10 a -20%), upside (+10 a +20%)',
    '- Calcular confidence_level com base na estabilidade dos dados históricos',
    '- Interpretar a tendência: crescimento, estagnação ou deterioração',
    '- Listar riscos que podem invalidar a projeção',
    '- Listar premissas assumidas na projeção',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- forecast_horizon: ex. "3 meses" ou "próximo trimestre"',
    '- Cada projection deve ter period, receita, ebitda, margem_pct',
    '- confidence_level de 0 a 100',
    '- historical_error_summary: descreva a qualidade dos dados históricos para previsão',
    '- trend_interpretation: texto claro sobre a direção da tendência',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise as tendências e produza sua projeção.',
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
    'Você é Falcão, especialista em Risco e Supervisão Estratégica de uma rede de escolas brasileiras.',
    'Seu papel é monitorar riscos estruturais, macro e de execução, pressionando prudência decisória.',
    '',
    'IMPORTANTE — Poder de Bloqueio:',
    '- Se overall_risk_level for "critical" com 3+ critical_alerts, o pipeline escala para Alex com ressalva obrigatória',
    '- Você deve confrontar cenários otimistas demais de outros agentes',
    '',
    'O que avaliar:',
    '- Riscos de receita: concentração, sazonalidade, dependência',
    '- Riscos de custo: inflação, contratos, pessoal',
    '- Riscos macro: taxa de juros, câmbio, regulação educacional',
    '- Riscos de execução: capacidade operacional, prazos',
    '- Se a otimização do Denilson tem ações arriscadas, questionar',
    '- Se o forecast do Edmundo tem confiança baixa, amplificar cautela',
    '',
    'Stress tests obrigatórios:',
    '- Cenário de queda de 15% na receita',
    '- Cenário de aumento de 20% nos custos',
    '- Cenário combinado adverso',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- overall_risk_level: low/medium/high/critical',
    '- macro_risk_index: 0 a 100 (quanto maior, mais arriscado)',
    '- Cada alert deve ter type, severity, title, description, related_metric, threshold, current_value, recommended_response',
    '- stress_tests: cenários com impacto % no EBITDA e probabilidade',
    '- mitigation_actions: ações concretas de mitigação',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Avalie os riscos considerando todos os outputs anteriores.',
  ].join('\n');

  return { system, user };
}

// ============================================
// ALEX — Consolidation + Board Presentation (Step 7)
// ============================================

function buildConsolidationPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
  filterContext?: Record<string, unknown> | null,
): PromptPair {
  const system = [
    'Você é Alex, Supervisor Financeiro, agora no papel de Consolidador Executivo e autor do Board Presentation.',
    'Seu papel é sintetizar os outputs de TODOS os agentes em um resumo executivo final e gerar uma estrutura pronta para PPT.',
    '',
    'Agentes cujos outputs você recebe:',
    '- Bruna: qualidade de dados (score, inconsistências, bloqueios)',
    '- Carlos: performance financeira (desvios, drivers, margem, EBITDA)',
    '- Denilson: otimização (plano ótimo, ações viáveis/inviáveis)',
    '- Edmundo: forecast (projeções, confiança, tendência)',
    '- Falcão: risco (alertas, stress tests, mitigação)',
    '',
    'O que fazer:',
    '- Unificar insights de TODOS os agentes em narrativa coerente',
    '- Identificar e resolver conflitos entre análises dos agentes',
    '- Produzir recomendações finais priorizadas (high/medium/low)',
    '- Gerar board_presentation com slides prontos para PPT',
    '',
    'Regras para consolidated_summary:',
    '- Texto corrido de 4-6 parágrafos adequado para diretoria',
    '- Não bullets, mas narrativa executiva fluida',
    '- Citar números concretos',
    '',
    'Regras para board_presentation:',
    '- presentation_title: título claro do período/análise',
    '- executive_context: 2-3 frases de contexto',
    '- slides: mínimo 6 slides obrigatórios:',
    '  1. Health Overview — visão geral de saúde financeira',
    '  2. Performance Highlights — destaques de performance',
    '  3. Riscos Críticos — alertas e mitigações',
    '  4. Forecast — projeções e confiança',
    '  5. Plano Ótimo — ações priorizadas de otimização',
    '  6. Recomendação Final — decisão e próximos passos',
    '',
    'Regras para cada slide:',
    '- title: título do slide',
    '- purpose: objetivo do slide em 1 frase',
    '- bullets: 3-5 pontos curtos, executivos, objetivos, prontos para slide',
    '- key_message: mensagem-chave do slide em 1 frase',
    '- optional_supporting_note: nota de apoio ou ressalva',
    '',
    'Regras gerais:',
    '- Responda em português brasileiro',
    '- cross_agent_conflicts: liste discrepâncias entre os outputs',
    '- confidence_level de 0 a 100 — confiabilidade geral da análise',
    '- Se Bruna reportou quality_score < 60, mencione na ressalva',
    '- Se Falcão reportou risco critical, destaque nos bullets',
    '- Se Edmundo reportou confiança < 60, modere projeções otimistas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatFilterContext(filterContext),
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Consolide todas as análises anteriores em resumo executivo final e gere o Board Presentation.',
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

  throw new Error(`Prompt não encontrado para agent_code=${agentCode}, step_type=${stepType}`);
}

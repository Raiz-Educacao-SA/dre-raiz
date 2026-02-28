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

// --------------------------------------------
// Prompts por agente + step_type
// --------------------------------------------

function buildSupervisorPlanPrompt(
  objective: string,
  summary: FinancialSummary,
): PromptPair {
  const system = [
    'Você é Alex, Supervisor Financeiro de uma equipe de análise do DRE (Demonstração de Resultado do Exercício) de uma rede de escolas brasileiras.',
    'Seu papel é analisar os dados financeiros pre-agregados, identificar pontos críticos e criar um plano de ação para a equipe.',
    'Você deve distribuir tarefas entre Bruna (qualidade de dados) e Carlos (performance financeira).',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- Seja específico nos findings — cite valores, percentuais e tags01',
    '- Priorize desvios significativos (>5% do orçado)',
    '- O campo assignments deve conter exatamente os agents que farão execute: bruna e carlos',
    '- focus_areas deve ser específico ao que cada agente deve investigar',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatSummaryBlock(summary),
    '',
    'Analise os dados acima e produza seu plano de supervisão.',
  ].join('\n');

  return { system, user };
}

function buildDataQualityPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
): PromptPair {
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
    'Regras:',
    '- Responda em português brasileiro',
    '- quality_score de 0 a 100 — quanto maior, mais confiáveis os dados',
    '- Classifique severidade: low (informativo), medium (requer atenção), high (urgente)',
    '- affected_value deve conter o valor numérico ou tag envolvido',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise a qualidade dos dados e produza seu relatório.',
  ].join('\n');

  return { system, user };
}

function buildPerformancePrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
): PromptPair {
  const system = [
    'Você é Carlos, especialista em Performance Financeira de uma rede de escolas brasileiras.',
    'Seu papel é analisar margens, tendências e indicadores do DRE para identificar oportunidades e riscos.',
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
    '- Calcule margin_analysis com os percentuais corretos baseados nos dados',
    '- deviations: liste as tags01 com maior impacto em R$, com direction (positive/negative)',
    '- impact_brl: valor absoluto do desvio em reais',
    '- Se o plano do supervisor indicar focus_areas para você, priorize essas áreas',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Analise a performance financeira e produza seu relatório.',
  ].join('\n');

  return { system, user };
}

function buildConsolidationPrompt(
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
): PromptPair {
  const system = [
    'Você é Alex, Supervisor Financeiro, agora no papel de consolidador.',
    'Seu papel é sintetizar os outputs de todos os agentes anteriores em um resumo executivo final.',
    '',
    'O que fazer:',
    '- Unificar insights de qualidade de dados e performance em uma narrativa coerente',
    '- Identificar conflitos entre as análises dos agentes',
    '- Produzir recomendações finais priorizadas (high/medium/low)',
    '- Gerar um consolidated_summary de 3-5 parágrafos adequado para apresentação a diretoria',
    '',
    'Regras:',
    '- Responda em português brasileiro',
    '- consolidated_summary deve ser um texto corrido, não bullets',
    '- cross_agent_conflicts: liste discrepâncias entre os outputs dos agentes',
    '- confidence_level de 0 a 100 — reflete a confiabilidade geral da análise',
    '- expected_impact deve ser uma frase concreta sobre resultado esperado',
  ].join('\n');

  const user = [
    `# Objetivo do Administrador`,
    objective,
    '',
    formatSummaryBlock(summary),
    formatPrevOutputs(prevOutputs),
    '',
    'Consolide todas as análises anteriores em um resumo executivo final.',
  ].join('\n');

  return { system, user };
}

// --------------------------------------------
// Lookup público
// --------------------------------------------

export function buildPrompt(
  agentCode: string,
  stepType: string,
  objective: string,
  summary: FinancialSummary,
  prevOutputs: PrevStepOutput[],
): PromptPair {
  if (stepType === 'plan') {
    return buildSupervisorPlanPrompt(objective, summary);
  }
  if (stepType === 'consolidate') {
    return buildConsolidationPrompt(objective, summary, prevOutputs);
  }
  if (stepType === 'execute' && agentCode === 'bruna') {
    return buildDataQualityPrompt(objective, summary, prevOutputs);
  }
  if (stepType === 'execute' && agentCode === 'carlos') {
    return buildPerformancePrompt(objective, summary, prevOutputs);
  }

  throw new Error(`Prompt não encontrado para agent_code=${agentCode}, step_type=${stepType}`);
}

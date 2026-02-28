// ============================================
// Decision Policy — Política Oficial de Uso
// Define o que pode/não pode ser alterado,
// quando recalibrar, quando plano ótimo é obrigatório,
// e nível de risco aceitável
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface PolicyRule {
  id: string;
  category: 'alterable' | 'immutable' | 'conditional';
  description: string;
  rationale: string;
  enforcement: 'database' | 'api' | 'process';
}

export interface RecalibrationTrigger {
  id: string;
  condition: string;
  threshold: string;
  action: string;
  urgency: 'imediata' | 'proxima_revisao' | 'anual';
}

export interface RiskToleranceLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score_range: string;
  classification: string;
  acceptable: boolean;
  required_action: string;
  max_duration_without_action: string;
}

export interface DecisionPolicy {
  version: string;
  effective_date: string;
  approved_by: string;
  alterable_elements: PolicyRule[];
  immutable_elements: PolicyRule[];
  recalibration_triggers: RecalibrationTrigger[];
  optimization_plan_rules: OptimizationPlanRules;
  risk_tolerance: RiskToleranceLevel[];
  human_judgment_balance: HumanJudgmentPolicy;
}

export interface OptimizationPlanRules {
  when_mandatory: string[];
  when_optional: string[];
  when_can_be_ignored: string[];
  override_conditions: string[];
}

export interface HumanJudgmentPolicy {
  principle: string;
  model_role: string;
  human_role: string;
  conflict_resolution: string;
}

// --------------------------------------------
// Default Policy
// --------------------------------------------

/**
 * Retorna a política oficial de uso do Decision Intelligence Platform.
 * Função pura — zero I/O.
 */
export function getDefaultDecisionPolicy(): DecisionPolicy {
  return {
    version: '1.0',
    effective_date: '2026-03-01',
    approved_by: 'Diretoria Executiva — Raiz Educação S.A.',

    // ================================================
    // O QUE PODE SER ALTERADO
    // ================================================
    alterable_elements: [
      {
        id: 'ALT-01',
        category: 'alterable',
        description: 'Pesos e thresholds do Health Score',
        rationale: 'O modelo deve refletir a realidade do negócio. Se a operação muda, os pesos devem acompanhar. Exemplo: threshold de classificação "Saudável" pode ser ajustado de 85 para 80 se o setor enfrentar pressão generalizada.',
        enforcement: 'database',
      },
      {
        id: 'ALT-02',
        category: 'alterable',
        description: 'Thresholds de alertas',
        rationale: 'Regras de alerta (ex: margem gap > 2pp, score < 70) podem ser ajustadas para reduzir ruído ou aumentar sensibilidade conforme contexto.',
        enforcement: 'database',
      },
      {
        id: 'ALT-03',
        category: 'alterable',
        description: 'Frações de otimização e limite de corte',
        rationale: 'Os cenários de corte (60%, 70%, 80%, 90%, 100%) e o limite máximo de corte por área (10%) podem ser ajustados conforme apetite de risco.',
        enforcement: 'database',
      },
      {
        id: 'ALT-04',
        category: 'alterable',
        description: 'Frequência de agendamentos automáticos',
        rationale: 'Agendamentos podem ser criados, modificados ou desativados conforme necessidade operacional, desde que justificativa seja registrada.',
        enforcement: 'api',
      },
      {
        id: 'ALT-05',
        category: 'alterable',
        description: 'Composição de agentes no pipeline',
        rationale: 'Novos agentes podem ser adicionados, existentes podem ser desativados. A ordem de execução pode ser alterada.',
        enforcement: 'database',
      },
      {
        id: 'ALT-06',
        category: 'alterable',
        description: 'Objetivo textual dos runs',
        rationale: 'O objetivo passado ao pipeline é livre, permitindo que cada execução foque em uma análise específica.',
        enforcement: 'api',
      },
    ],

    // ================================================
    // O QUE NÃO PODE SER ALTERADO
    // ================================================
    immutable_elements: [
      {
        id: 'IMM-01',
        category: 'immutable',
        description: 'Fórmula base do Health Score',
        rationale: 'O score é sempre: Base 100 - Penalidades. A estrutura (base, 5 categorias de penalidade, clamp 0-100) é fixa. O que varia são os pesos dentro dessa estrutura.',
        enforcement: 'process',
      },
      {
        id: 'IMM-02',
        category: 'immutable',
        description: 'Imutabilidade de registros de auditoria',
        rationale: 'Registros em decision_audit_trail são write-once. Não podem ser editados ou deletados. Correções geram novo registro referenciando o anterior.',
        enforcement: 'database',
      },
      {
        id: 'IMM-03',
        category: 'immutable',
        description: 'Obrigatoriedade de justificativa em decisões formais',
        rationale: 'Toda rejeição, override ou alteração de modelo exige justificativa escrita com mínimo de 30 caracteres. Sem exceção.',
        enforcement: 'database',
      },
      {
        id: 'IMM-04',
        category: 'immutable',
        description: 'Separação core/endpoint/UI',
        rationale: 'O core (scoreModel, forecastModel, optimizationEngine) permanece puro — sem I/O, sem Supabase, sem side effects. Endpoints são adaptadores. UI não contém regras de negócio. Esta separação é arquitetural e não deve ser comprometida.',
        enforcement: 'process',
      },
      {
        id: 'IMM-05',
        category: 'immutable',
        description: 'Determinismo do motor de decisão',
        rationale: 'Dado o mesmo input (FinancialSummary + ScoreInputs), o score, forecast e otimização devem produzir o mesmo resultado. O motor não usa random, timestamps ou estado externo.',
        enforcement: 'process',
      },
      {
        id: 'IMM-06',
        category: 'immutable',
        description: 'Estrutura do DRE (tag0 hierarchy)',
        rationale: 'A hierarquia tag0→tag01→tag02→tag03 e os prefixos (01. RECEITA, 02. CV, 03. CF, 04. SGA, 06. RATEIO) são fixos. Alterar quebraria todas as agregações.',
        enforcement: 'database',
      },
    ],

    // ================================================
    // QUANDO RECALIBRAR
    // ================================================
    recalibration_triggers: [
      {
        id: 'RECAL-01',
        condition: 'Divergência consistente do Health Score',
        threshold: 'Score diverge > 15 pontos da percepção real por 2 ou mais ciclos consecutivos.',
        action: 'Revisão extraordinária do modelo. Backtesting com 6+ ciclos. Proposta de novos pesos.',
        urgency: 'imediata',
      },
      {
        id: 'RECAL-02',
        condition: 'Mudança estrutural no negócio',
        threshold: 'Aquisição, fusão, novo segmento, mudança regulatória que altere fundamentalmente a estrutura de custos ou receitas.',
        action: 'Recalibração completa incluindo revisão de categorias (tag0), thresholds de classificação e regras de alerta.',
        urgency: 'imediata',
      },
      {
        id: 'RECAL-03',
        condition: 'Score estático em cenário de mudança',
        threshold: 'Score permanece na mesma faixa (± 3 pontos) por 4+ ciclos apesar de mudanças visíveis na operação.',
        action: 'Investigar se pesos capturam adequadamente as variáveis relevantes. Considerar adicionar novas métricas.',
        urgency: 'proxima_revisao',
      },
      {
        id: 'RECAL-04',
        condition: 'Excesso de falsos positivos em alertas',
        threshold: '> 50% dos alertas gerados nos últimos 3 ciclos foram considerados irrelevantes pela diretoria.',
        action: 'Ajustar thresholds de alerta para reduzir ruído. Documentar quais alertas foram ignorados e por quê.',
        urgency: 'proxima_revisao',
      },
      {
        id: 'RECAL-05',
        condition: 'Revisão anual ordinária',
        threshold: 'Janeiro de cada ano.',
        action: 'Backtesting completo contra dados do ano anterior. Validar ou ajustar todos os pesos e thresholds.',
        urgency: 'anual',
      },
    ],

    // ================================================
    // QUANDO PLANO ÓTIMO É OBRIGATÓRIO / OPCIONAL / IGNORÁVEL
    // ================================================
    optimization_plan_rules: {
      when_mandatory: [
        'Health Score < 70 (classificação "Crítico"). O plano deve ser gerado, revisado e aprovado/rejeitado formalmente.',
        'EBITDA real negativo por 2 ou mais meses consecutivos. Intervenção é obrigatória.',
        'Margem de contribuição real abaixo de 15%. Risco operacional exige plano de ação.',
      ],
      when_optional: [
        'Health Score entre 70 e 84 (classificação "Atenção"). Plano é gerado automaticamente mas aprovação pode ser adiada para próxima reunião.',
        'EBITDA real positivo mas abaixo do orçado em mais de 10%. Plano recomendado.',
      ],
      when_can_be_ignored: [
        'Health Score >= 85 (classificação "Saudável") E todas as ações são de prioridade "low" E corte total < 2% da receita. Plano pode ser registrado como "informativo" sem aprovação formal.',
        'Projeção (forecast) indica melhoria nos próximos 3 ciclos E alertas atuais são todos de severidade "low". Situação em recuperação não requer intervenção.',
      ],
      override_conditions: [
        'Override do plano ótimo é permitido APENAS com justificativa formal registrada em decision_audit_trail.',
        'O override deve especificar: qual ação foi rejeitada, por que, e qual ação alternativa será tomada.',
        'Override de plano obrigatório (Score < 70) requer aprovação do CEO, não apenas do CFO.',
      ],
    },

    // ================================================
    // NÍVEL DE RISCO ACEITÁVEL
    // ================================================
    risk_tolerance: [
      {
        level: 'low',
        score_range: '85 — 100',
        classification: 'Saudável',
        acceptable: true,
        required_action: 'Monitoramento contínuo. Nenhuma ação corretiva necessária.',
        max_duration_without_action: 'Indefinido — operação saudável.',
      },
      {
        level: 'medium',
        score_range: '70 — 84',
        classification: 'Atenção',
        acceptable: true,
        required_action: 'Plano de otimização gerado automaticamente. Revisão no próximo rito mensal. Ações preventivas recomendadas.',
        max_duration_without_action: '2 ciclos (meses). Se persistir por 3+ meses, escalona para "alto".',
      },
      {
        level: 'high',
        score_range: '50 — 69',
        classification: 'Crítico',
        acceptable: false,
        required_action: 'Plano de ação obrigatório. Aprovação executiva em até 5 dias úteis. Monitoramento semanal até recuperação.',
        max_duration_without_action: '1 ciclo (mês). Se não houver melhoria, reunião extraordinária.',
      },
      {
        level: 'critical',
        score_range: '0 — 49',
        classification: 'Crítico Severo',
        acceptable: false,
        required_action: 'Reunião extraordinária imediata. Plano de contingência obrigatório com prazo de 48 horas. CEO notificado automaticamente. Monitoramento diário.',
        max_duration_without_action: '0 ciclos. Ação imediata obrigatória.',
      },
    ],

    // ================================================
    // EQUILÍBRIO MODELO vs JULGAMENTO HUMANO
    // ================================================
    human_judgment_balance: {
      principle: 'O modelo informa, o ser humano decide. O Decision Intelligence Platform é uma ferramenta de apoio à decisão, não um sistema autônomo de gestão. Toda recomendação do sistema é sugestão qualificada, não ordem.',
      model_role: 'O modelo tem como papel: calcular métricas objetivas, identificar padrões, projetar tendências, propor otimizações e gerar alertas. O modelo é determinístico, consistente e não emocional. Sua força está na objetividade e na capacidade de processar dados em escala.',
      human_role: 'O ser humano tem como papel: interpretar contexto que o modelo não captura (relações comerciais, reputação, momentum de mercado, fatores culturais), tomar decisões finais com responsabilidade pessoal, e validar se as recomendações fazem sentido no mundo real.',
      conflict_resolution: 'Quando modelo e julgamento humano divergem, prevalece o julgamento humano — desde que a divergência seja registrada formalmente (override com justificativa). O registro garante que a decisão é intencional e rastreável, não informal. Se divergências se repetem sistematicamente (3+ vezes no mesmo tipo de decisão), é sinal de que o modelo precisa ser recalibrado (ver RECAL-01).',
    },
  };
}

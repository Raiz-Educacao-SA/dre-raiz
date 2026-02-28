// ============================================
// Commercial Roadmap — Roadmap Comercial 6 Meses
// Plano de go-to-market e escala comercial
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface CommercialRoadmap {
  title: string;
  horizon: string;
  generated_at: string;
  current_state: CurrentState;
  phases: RoadmapPhase[];
  pricing_strategy: PricingStrategy;
  sales_process: SalesProcess;
  success_metrics: SuccessMetrics;
  risks_and_mitigations: RiskMitigation[];
  budget_estimate: BudgetEstimate;
}

export interface CurrentState {
  product_maturity: string;
  validation_status: string;
  current_client: string;
  revenue_current: string;
  team_size: string;
  key_assets: string[];
  gaps_to_close: string[];
}

export interface RoadmapPhase {
  phase: number;
  name: string;
  duration: string;
  months: string;
  objective: string;
  key_results: KeyResult[];
  activities: Activity[];
  deliverables: string[];
  exit_criteria: string[];
  investment_focus: string;
}

export interface KeyResult {
  metric: string;
  target: string;
  measurement: string;
}

export interface Activity {
  area: 'product' | 'sales' | 'marketing' | 'ops' | 'hiring';
  description: string;
  owner: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface PricingStrategy {
  philosophy: string;
  launch_approach: string;
  plans: PlanDetails[];
  discounts: DiscountPolicy[];
  negotiation_guidelines: string[];
}

export interface PlanDetails {
  name: string;
  price_monthly_brl: number;
  annual_price_monthly_brl: number;
  target_segment: string;
  deal_size_annual_brl: string;
  expected_mix_pct: number;
  margin_profile: string;
}

export interface DiscountPolicy {
  type: string;
  max_discount_pct: number;
  approval_required: string;
  conditions: string;
}

export interface SalesProcess {
  model: string;
  cycle_days: string;
  stages: SalesStage[];
  qualification_criteria: QualificationCriteria;
  team_structure_v1: TeamRole[];
  tools: string[];
}

export interface SalesStage {
  stage: string;
  duration: string;
  activities: string[];
  conversion_target_pct: number;
  exit_criteria: string;
}

export interface QualificationCriteria {
  framework: string;
  must_have: string[];
  nice_to_have: string[];
  disqualifiers: string[];
}

export interface TeamRole {
  role: string;
  count: number;
  responsibility: string;
  hire_month: number;
  cost_monthly_brl: string;
}

export interface SuccessMetrics {
  north_star: string;
  monthly_metrics: MonthlyMetric[];
  quarterly_goals: QuarterlyGoal[];
}

export interface MonthlyMetric {
  metric: string;
  month_1: string;
  month_3: string;
  month_6: string;
}

export interface QuarterlyGoal {
  quarter: string;
  revenue_target_brl: string;
  clients_target: number;
  arr_target_brl: string;
  key_milestone: string;
}

export interface RiskMitigation {
  risk: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
  contingency: string;
}

export interface BudgetEstimate {
  total_6_months_brl: string;
  breakdown: BudgetLine[];
  expected_revenue_6_months_brl: string;
  breakeven_month: string;
  funding_source: string;
}

export interface BudgetLine {
  category: string;
  monthly_brl: string;
  total_6_months_brl: string;
  notes: string;
}

// --------------------------------------------
// Commercial Roadmap Generator
// --------------------------------------------

/**
 * Gera o roadmap comercial de 6 meses.
 * Função pura — zero I/O.
 */
export function generateCommercialRoadmap(): CommercialRoadmap {
  return {
    title: 'Roadmap Comercial — Financ.IA',
    horizon: '6 meses',
    generated_at: new Date().toISOString(),

    // ================================================
    // ESTADO ATUAL
    // ================================================
    current_state: {
      product_maturity: 'MVP validado (Enterprise Ready Level 4)',
      validation_status:
        'Produto em produção em 1 cliente (Raiz Educação S.A.) — ' +
        '10+ filiais, R$300M+ receita, uso diário pela equipe financeira',
      current_client: 'Raiz Educação S.A. (beachhead — grupo educacional)',
      revenue_current: 'R$0 (produto interno em processo de spin-off)',
      team_size: '1 desenvolvedor full-stack + 1 product owner (parcial)',
      key_assets: [
        'Motor de cálculo determinístico com 171 testes automatizados',
        'Score de saúde 0-100 por filial com breakdown de penalidades',
        'Otimização automática de planos de ação com restrições',
        'Projeção de tendências com detecção de deterioração',
        'Equipe de IA (3 agentes) para análise narrativa automática',
        'Audit trail imutável para compliance',
        'Infraestrutura cloud já operacional (Vercel + Supabase)',
        'Case real validado com dados de produção',
      ],
      gaps_to_close: [
        'Multi-tenant: isolamento por organização (arquitetura definida, implementação pendente)',
        'Self-service onboarding: mapeamento de colunas guiado',
        'Billing/subscription: integração com gateway de pagamento',
        'Landing page e material de marketing',
        'Equipe comercial (mínimo SDR + AE)',
        'Suporte: SLA definido, mas sem equipe dedicada',
        'Contratos e termos de uso jurídicos',
      ],
    },

    // ================================================
    // FASES DO ROADMAP
    // ================================================
    phases: [
      // ------------------------------------------------
      // FASE 1 — FUNDAÇÃO COMERCIAL (Meses 1-2)
      // ------------------------------------------------
      {
        phase: 1,
        name: 'Fundação Comercial',
        duration: '2 meses',
        months: 'Meses 1-2',
        objective:
          'Preparar o produto para venda externa e iniciar prospecção ativa ' +
          'dos primeiros 3 clientes piloto no setor educacional.',
        key_results: [
          {
            metric: 'Pipeline qualificado',
            target: '10 leads qualificados (BANT)',
            measurement: 'CRM — leads com orçamento, autoridade, necessidade e timeline confirmados',
          },
          {
            metric: 'Pilotos iniciados',
            target: '2-3 pilotos gratuitos (30 dias)',
            measurement: 'Contratos de piloto assinados com dados importados',
          },
          {
            metric: 'Multi-tenant MVP',
            target: 'Isolamento por org_id operacional',
            measurement: 'Segundo cliente com dados isolados em produção',
          },
        ],
        activities: [
          {
            area: 'product',
            description:
              'Implementar multi-tenant mínimo: org_id em tabelas principais, ' +
              'RLS por organização, tela de onboarding guiado',
            owner: 'Dev lead',
            priority: 'critical',
          },
          {
            area: 'product',
            description:
              'Onboarding assistido (concierge): founder/dev faz o primeiro import com o cliente. ' +
              'Coleta edge cases de formato para alimentar auto-import futuro. ' +
              'Self-service onboarding fica para Fase 3',
            owner: 'Dev lead + Founder',
            priority: 'high',
          },
          {
            area: 'sales',
            description:
              'Mapear 30-50 grupos educacionais brasileiros com 5+ unidades. ' +
              'Fontes: LinkedIn, MEC/INEP, associações (SEMESP, ANEC, ABED)',
            owner: 'Founder/CEO',
            priority: 'critical',
          },
          {
            area: 'sales',
            description:
              'Criar deck de apresentação (10 slides), demo script e case study Raiz Educação',
            owner: 'Founder/CEO',
            priority: 'high',
          },
          {
            area: 'marketing',
            description:
              'Landing page mínima: proposta de valor, features, case study, formulário de contato. ' +
              'Domínio: financ.ia ou financia.com.br',
            owner: 'Dev lead + Freelancer',
            priority: 'high',
          },
          {
            area: 'ops',
            description:
              'Contrato de piloto, termos de uso, LGPD compliance (DPA), NDA — ' +
              'revisão jurídica mínima',
            owner: 'Founder + Advogado',
            priority: 'high',
          },
          {
            area: 'sales',
            description:
              'Iniciar outreach direto: 5 abordagens/semana via LinkedIn + e-mail personalizado. ' +
              'Target: CFOs e controllers de grupos educacionais',
            owner: 'Founder/CEO',
            priority: 'high',
          },
        ],
        deliverables: [
          'Multi-tenant operacional (org_id + RLS + onboarding)',
          'Landing page publicada',
          'Deck de vendas + demo script',
          'Case study Raiz Educação (1 página)',
          'Contrato de piloto + termos de uso',
          'Lista de 50 prospects qualificados',
          'CRM configurado (Pipedrive ou HubSpot free)',
        ],
        exit_criteria: [
          'Segundo cliente consegue importar dados e ver DRE isolado',
          'Pelo menos 2 pilotos assinados ou em negociação avançada',
          'Landing page com pelo menos 10 leads orgânicos',
        ],
        investment_focus: 'Produto (60%) + Vendas (30%) + Jurídico (10%)',
      },

      // ------------------------------------------------
      // FASE 2 — PILOTOS E VALIDAÇÃO DE PREÇO (Meses 3-4)
      // ------------------------------------------------
      {
        phase: 2,
        name: 'Pilotos e Validação de Preço',
        duration: '2 meses',
        months: 'Meses 3-4',
        objective:
          'Converter pilotos em clientes pagantes, validar pricing e ' +
          'coletar dados de uso para refinar o produto.',
        key_results: [
          {
            metric: 'Clientes pagantes',
            target: '2-3 clientes pagantes (Starter ou Pro)',
            measurement: 'Contratos assinados + primeiro pagamento recebido',
          },
          {
            metric: 'MRR (Monthly Recurring Revenue)',
            target: 'R$3.000-8.000',
            measurement: 'Receita recorrente mensal confirmada',
          },
          {
            metric: 'NPS dos pilotos',
            target: 'NPS ≥ 40',
            measurement: 'Pesquisa NPS ao final do piloto (30 dias)',
          },
          {
            metric: 'Time-to-value real',
            target: '<2 horas (upload → primeiro insight acionável)',
            measurement: 'Medição em cada piloto — timestamp upload vs. primeiro relatório',
          },
        ],
        activities: [
          {
            area: 'sales',
            description:
              'Acompanhamento semanal de pilotos: call de 30min para garantir sucesso. ' +
              'Identificar campeão interno (controller ou analista que usa diariamente)',
            owner: 'Founder/CEO',
            priority: 'critical',
          },
          {
            area: 'sales',
            description:
              'Negociação de conversão piloto → pago. Oferecer desconto de early-adopter: ' +
              '30% por 6 meses (lock-in de case study + referência)',
            owner: 'Founder/CEO',
            priority: 'critical',
          },
          {
            area: 'product',
            description:
              'Integração com gateway de pagamento (Stripe ou Asaas). ' +
              'Fluxo: contrato assinado → cobrança recorrente automática. ' +
              'Trial self-service (14 dias) será implementado na Fase 3',
            owner: 'Dev lead',
            priority: 'high',
          },
          {
            area: 'product',
            description:
              'Implementar métricas de uso: login frequency, features usadas, ' +
              'tempo na plataforma, relatórios gerados. Dados para product-led growth',
            owner: 'Dev lead',
            priority: 'high',
          },
          {
            area: 'marketing',
            description:
              'Criar conteúdo: 2 artigos LinkedIn sobre FP&A para educação, ' +
              '1 webinar "Como grupos educacionais podem reduzir tempo de consolidação de DRE"',
            owner: 'Founder + Freelancer',
            priority: 'medium',
          },
          {
            area: 'hiring',
            description:
              'Contratar SDR (mês 3): prospecção outbound, qualificação, agendamento de demos. ' +
              'Perfil: 1-2 anos experiência, conhecimento básico de finanças. ' +
              'Treinamento com gravações de demos e calls do founder',
            owner: 'Founder/CEO',
            priority: 'critical',
          },
          {
            area: 'sales',
            description:
              'Expandir prospecção para 10 abordagens/semana. ' +
              'Testar canal: parceria com associações educacionais (SEMESP, ANEC)',
            owner: 'Founder/CEO',
            priority: 'high',
          },
          {
            area: 'product',
            description:
              'Self-service onboarding: upload → mapeamento guiado → micro-DRE → DRE completo. ' +
              'Baseado nos edge cases coletados nos pilotos da Fase 1',
            owner: 'Dev lead',
            priority: 'high',
          },
          {
            area: 'ops',
            description:
              'Definir processo de suporte: SLA por plano, canais (e-mail/WhatsApp/call), ' +
              'base de conhecimento mínima (10 artigos)',
            owner: 'Founder + Dev',
            priority: 'medium',
          },
        ],
        deliverables: [
          '2-3 contratos de cliente pagante',
          'Gateway de pagamento integrado',
          'Dashboard de métricas de uso (interno)',
          '2 artigos LinkedIn publicados',
          'Processo de suporte documentado',
          'Base de conhecimento (10 artigos)',
          'Relatório de aprendizados dos pilotos',
        ],
        exit_criteria: [
          'Pelo menos 2 clientes pagando recorrentemente',
          'Pricing validado (clientes aceitaram sem resistência extrema)',
          'NPS dos pilotos ≥ 40',
          'Nenhum churn nos primeiros 30 dias',
        ],
        investment_focus: 'Vendas (50%) + Produto (30%) + Marketing (20%)',
      },

      // ------------------------------------------------
      // FASE 3 — ESCALA INICIAL (Meses 5-6)
      // ------------------------------------------------
      {
        phase: 3,
        name: 'Escala Inicial',
        duration: '2 meses',
        months: 'Meses 5-6',
        objective:
          'Estruturar operação comercial repetível, expandir para 5-8 clientes ' +
          'e preparar para rodada de investimento seed ou receita sustentável.',
        key_results: [
          {
            metric: 'Clientes pagantes totais',
            target: '4-6 clientes (mid); 6-8 clientes (high)',
            measurement: 'Contratos ativos com pagamento recorrente',
          },
          {
            metric: 'MRR',
            target: 'R$8.000-15.000 (cenário mid); R$15.000-25.000 (cenário high)',
            measurement: 'Receita recorrente mensal confirmada',
          },
          {
            metric: 'ARR (Annual Recurring Revenue)',
            target: 'R$96.000-180.000 (mid); R$180.000-300.000 (high)',
            measurement: 'MRR × 12 (projeção anualizada)',
          },
          {
            metric: 'Sales cycle',
            target: '<60 dias (primeiro contato → contrato)',
            measurement: 'Medição no CRM por deal',
          },
          {
            metric: 'Churn mensal',
            target: '<5%',
            measurement: 'Clientes que cancelaram / base ativa',
          },
        ],
        activities: [
          {
            area: 'hiring',
            description:
              'SDR (contratado mês 3) já em ramp-up — agora operando autonomamente: ' +
              'prospecção outbound, qualificação BANT, agendamento de demos. ' +
              'Meta: 40 abordagens/semana, 10 calls de discovery/mês',
            owner: 'SDR (supervisionado por Founder)',
            priority: 'critical',
          },
          {
            area: 'sales',
            description:
              'Playbook de vendas documentado: scripts de abordagem, ' +
              'qualificação BANT, demo roteirizada, objeções mapeadas, ' +
              'battle cards impressos, fluxo pós-venda',
            owner: 'Founder/CEO',
            priority: 'critical',
          },
          {
            area: 'sales',
            description:
              'Validação de verticais adjacentes ANTES de prospectar: ' +
              '(1) entrevistar 2-3 CFOs de saúde e varejo, ' +
              '(2) mapear se estrutura de DRE é compatível com modelo tag0/tag01 atual, ' +
              '(3) identificar customizações necessárias. ' +
              'Só prospectar ativamente após confirmar fit produto-mercado na vertical',
            owner: 'Founder',
            priority: 'high',
          },
          {
            area: 'sales',
            description:
              'Se vertical validada: testar 5 abordagens em saúde ' +
              '(hospitais/clínicas com 5+ unidades) e/ou varejo (redes com 10+ lojas)',
            owner: 'SDR + Founder',
            priority: 'high',
          },
          {
            area: 'marketing',
            description:
              'Case studies detalhados dos primeiros clientes (com métricas reais). ' +
              'Vídeo depoimento de 2-3 minutos com CFO/controller do cliente',
            owner: 'Founder + Freelancer',
            priority: 'high',
          },
          {
            area: 'product',
            description:
              'Features baseadas em feedback dos primeiros clientes. ' +
              'Priorizar pelo impacto em conversão e retenção. ' +
              'Estimativa: 2-3 melhorias por mês',
            owner: 'Dev lead',
            priority: 'high',
          },
          {
            area: 'product',
            description:
              'Implementar trial self-service: signup → upload → micro-DRE em 10 min ' +
              'sem intervenção humana. Conversão target: 15-25% trial→pago',
            owner: 'Dev lead',
            priority: 'high',
          },
          {
            area: 'ops',
            description:
              'Definir métricas de unit economics reais: CAC medido, LTV projetado, ' +
              'payback observado. Preparar data room para potencial investidor',
            owner: 'Founder/CEO',
            priority: 'medium',
          },
          {
            area: 'marketing',
            description:
              'SEO básico: 5 artigos de blog sobre FP&A, DRE gerencial, ' +
              'consolidação financeira. Captura de e-mail para newsletter',
            owner: 'Freelancer',
            priority: 'medium',
          },
        ],
        deliverables: [
          '5-8 clientes pagantes ativos',
          'SDR contratado e treinado',
          'Playbook de vendas documentado',
          '2-3 case studies com métricas reais',
          'Trial self-service operacional',
          'Unit economics medidos (CAC, LTV, payback reais)',
          'Pipeline de 20+ leads qualificados para mês 7+',
          'Data room para investidores (se aplicável)',
        ],
        exit_criteria: [
          'MRR ≥ R$8.000 (cenário mid) ou R$15.000 (cenário high)',
          'SDR qualifica leads e agenda demos autonomamente; founder ainda fecha',
          'Pelo menos 1 cliente fora do setor educacional',
          'Churn < 5% mensal nos primeiros 3 meses de cada cliente',
        ],
        investment_focus: 'Vendas (40%) + Marketing (25%) + Produto (25%) + Ops (10%)',
      },
    ],

    // ================================================
    // ESTRATÉGIA DE PRICING
    // ================================================
    pricing_strategy: {
      philosophy:
        'Pricing baseado em valor, não em custo. O valor entregue (economia de 10-15 dias/mês ' +
        'de trabalho manual + decisões melhores) justifica o investimento. ' +
        'Barreira de entrada baixa para conquistar mercado; expansão via upsell.',

      launch_approach:
        'Dois mecanismos de aquisição distintos por fase: ' +
        'PILOTO (meses 1-4): engajamento high-touch de 30 dias, founder-led, ' +
        'para primeiros clientes com onboarding assistido. ' +
        'TRIAL SELF-SERVICE (meses 5+): signup autônomo de 14 dias, product-led, ' +
        'para escala após onboarding automatizado estar pronto. ' +
        'Primeiros 5 clientes: desconto de early-adopter (30% por 6 meses) ' +
        'em troca de case study + referência ativa. ' +
        'A partir do cliente 6: preço de tabela com desconto anual padrão (20%).',

      plans: [
        {
          name: 'Starter',
          price_monthly_brl: 1490,
          annual_price_monthly_brl: 1192,
          target_segment: 'Empresa única, 1-5 filiais, CFO hands-on',
          deal_size_annual_brl: 'R$14.304 - R$17.880',
          expected_mix_pct: 40,
          margin_profile:
            'Alta margem (85%+) — baixo custo de suporte, ' +
            'features limitadas, consumo de IA baixo',
        },
        {
          name: 'Pro',
          price_monthly_brl: 3990,
          annual_price_monthly_brl: 3192,
          target_segment: 'Grupo com múltiplas marcas, 5-20 filiais',
          deal_size_annual_brl: 'R$38.304 - R$47.880',
          expected_mix_pct: 45,
          margin_profile:
            'Boa margem (75%) — features avançadas habilitadas, ' +
            'consumo de IA moderado, suporte prioritário',
        },
        {
          name: 'Enterprise',
          price_monthly_brl: 9990,
          annual_price_monthly_brl: 7992,
          target_segment: 'Grupo grande, 20+ filiais, compliance',
          deal_size_annual_brl: 'R$95.904 - R$119.880',
          expected_mix_pct: 15,
          margin_profile:
            'Margem moderada (65-70%) — account manager dedicado, ' +
            'SSO, customização de scoring, suporte SLA',
        },
      ],

      discounts: [
        {
          type: 'Early-adopter (primeiros 5 clientes)',
          max_discount_pct: 30,
          approval_required: 'Founder — decisão direta',
          conditions:
            'Cliente aceita ser case study público (com aprovação do texto) ' +
            'e fornece referência ativa para 2 prospects. Lock-in: 6 meses. ' +
            'PÓS-DESCONTO (mês 7): cliente migra para preço cheio. ' +
            'No mês 4, apresentar opção de contrato anual com 20% de desconto como alternativa. ' +
            'Se renovar anual: mantém loyalty discount de 15%. Comunicar preço pós-desconto desde a assinatura.',
        },
        {
          type: 'Contrato anual (pagamento antecipado)',
          max_discount_pct: 20,
          approval_required: 'Automático — sistema aplica',
          conditions:
            'Pagamento integral antecipado por 12 meses. ' +
            'Sem reembolso proporcional. Cancelamento ao final do período.',
        },
        {
          type: 'Desconto por volume (3+ contratos do mesmo grupo)',
          max_discount_pct: 15,
          approval_required: 'Founder — caso a caso',
          conditions:
            'Grupo com 3+ entidades jurídicas contratando simultaneamente. ' +
            'Desconto adicional sobre preço anual.',
        },
        {
          type: 'Negociação Enterprise',
          max_discount_pct: 10,
          approval_required: 'Founder — com justificativa documentada',
          conditions:
            'Apenas para Enterprise. Desconto máximo 10% sobre tabela. ' +
            'Contrapartida obrigatória: contrato de 24 meses ou cláusula de referência.',
        },
      ],

      negotiation_guidelines: [
        'NUNCA conceder desconto sem contrapartida (prazo maior, case study, referência)',
        'Piloto gratuito: máximo 30 dias. Extensão só com aprovação do founder',
        'Starter: preço fixo, sem negociação. Desconto só via anual ou early-adopter',
        'Pro: até 10% de desconto com contrato anual + referência',
        'Enterprise: negociação caso a caso, sempre com contrapartida documentada',
        'Se o cliente pedir features do Pro no Starter → upsell, não desconto',
        'Âncora de preço: sempre mostrar o preço mensal cheio primeiro, depois o anual',
        'Nunca competir por preço com Excel (gratuito). Competir por valor e tempo economizado',
      ],
    },

    // ================================================
    // PROCESSO DE VENDAS
    // ================================================
    sales_process: {
      model:
        'Venda consultiva (founder-led nos meses 1-2, SDR+Founder nos meses 3-6). ' +
        'Demo personalizada com dados reais do prospect quando possível. ' +
        'NOTA: 100% outbound nos primeiros 6 meses. Canais inbound (SEO, content) ' +
        'são investimento de médio prazo — não esperar leads orgânicos antes do mês 8-10.',

      cycle_days:
        '60-120 dias (primeiro contato → contrato assinado). ' +
        'Mínimo 8-10 semanas considerando: discovery + demo + piloto 30d + negociação 2 semanas. ' +
        'ATENÇÃO: empresas brasileiras mid-market frequentemente congelam orçamento em Nov-Fev ' +
        '(fechamento fiscal + férias) — meses nesse período podem ter conversão mais lenta',

      stages: [
        {
          stage: '1. Prospecção',
          duration: 'Contínuo',
          activities: [
            'Identificar grupos educacionais/saúde/varejo com 5+ filiais',
            'Pesquisar CFO/Controller no LinkedIn',
            'Enviar mensagem personalizada (dor específica do setor)',
            'Follow-up por e-mail após 3 dias se sem resposta',
          ],
          conversion_target_pct: 100,
          exit_criteria: 'Prospect respondeu e aceitou call de discovery',
        },
        {
          stage: '2. Discovery (BANT)',
          duration: '1 call de 30 min',
          activities: [
            'Perguntas de diagnóstico: "Como vocês consolidam o DRE hoje?"',
            'Validar Budget, Authority, Need, Timeline',
            'Identificar dor principal e urgência',
            'Confirmar que é multi-filial e consolida DRE',
          ],
          conversion_target_pct: 50,
          exit_criteria: 'BANT confirmado — prospect qualificado',
        },
        {
          stage: '3. Demo personalizada',
          duration: '1 call de 45 min',
          activities: [
            'Mostrar DRE consolidado com dados similares ao prospect',
            'Health Score + alertas automáticos (momento wow)',
            'Plano de ação otimizado (diferencial vs. BI e Excel)',
            'Relatório de IA — mostrar output real',
            'Responder objeções com battle cards preparados',
          ],
          conversion_target_pct: 60,
          exit_criteria: 'Prospect solicita piloto ou proposta comercial',
        },
        {
          stage: '4. Piloto (30 dias)',
          duration: '30 dias',
          activities: [
            'Onboarding guiado: upload → mapeamento → DRE (dia 1)',
            'Check-in semanal de 15 min (dias 7, 14, 21)',
            'Apresentar primeiro relatório de IA ao prospect (dia 7)',
            'Identificar campeão interno (quem usa diariamente)',
            'Coletar feedback estruturado (NPS + entrevista)',
          ],
          conversion_target_pct: 70,
          exit_criteria: 'Prospect usa a plataforma pelo menos 3x/semana e quer continuar',
        },
        {
          stage: '5. Negociação e fechamento',
          duration: '1-2 semanas',
          activities: [
            'Apresentar proposta formal (plano recomendado + preço)',
            'Negociar termos (anual vs. mensal, desconto vs. contrapartida)',
            'Enviar contrato para assinatura digital (DocuSign/Clicksign)',
            'Configurar billing (Stripe/Asaas)',
            'Kickoff de onboarding definitivo',
          ],
          conversion_target_pct: 80,
          exit_criteria: 'Contrato assinado + primeiro pagamento processado',
        },
      ],

      qualification_criteria: {
        framework: 'BANT (Budget, Authority, Need, Timeline)',
        must_have: [
          'Empresa com 5+ filiais/unidades que consolida DRE',
          'CFO ou Controller como sponsor (autoridade decisória)',
          'Orçamento compatível (mínimo R$1.490/mês aprovável)',
          'Dor real: gasta 5+ dias/mês em consolidação manual',
        ],
        nice_to_have: [
          'Processo de aprovação rápido (<30 dias)',
          'Iniciativa de transformação digital em andamento',
          'ERP estruturado (facilita import de dados)',
          'Disposição para ser case study (early-adopter)',
        ],
        disqualifiers: [
          'Empresa com 1-2 filiais (valor percebido muito baixo)',
          'Sem orçamento aprovado para ferramentas de FP&A',
          'Decisor inacessível (só analista operacional como contato)',
          'Exige on-premise ou customização radical',
          'Ciclo de compra >6 meses (procurement enterprise pesado)',
        ],
      },

      team_structure_v1: [
        {
          role: 'Founder/CEO (sales + product)',
          count: 1,
          responsibility:
            'Discovery, demos, negociação, fechamento. ' +
            'Visão de produto e priorização de roadmap.',
          hire_month: 0,
          cost_monthly_brl: 'Pro-labore existente',
        },
        {
          role: 'SDR (Sales Development Representative)',
          count: 1,
          responsibility:
            'Prospecção outbound, qualificação BANT, agendamento de demos. ' +
            'Meta: 40 abordagens/semana, 10 calls de discovery/mês.',
          hire_month: 3,
          cost_monthly_brl: 'R$3.500-5.000 (fixo + variável)',
        },
        {
          role: 'Dev Lead (full-stack)',
          count: 1,
          responsibility:
            'Produto, multi-tenant, onboarding, billing, suporte técnico level 2.',
          hire_month: 0,
          cost_monthly_brl: 'Custo existente',
        },
        {
          role: 'Freelancer marketing (parcial)',
          count: 1,
          responsibility:
            'Landing page, conteúdo LinkedIn, SEO, case studies, design.',
          hire_month: 1,
          cost_monthly_brl: 'R$2.000-3.000 (parcial)',
        },
      ],

      tools: [
        'CRM: HubSpot Free ou Pipedrive Essencial (R$59/mês)',
        'Assinatura digital: Clicksign (R$99/mês) ou DocuSign',
        'Billing: Stripe ou Asaas (gateway brasileiro, R$0 fixo + taxa)',
        'E-mail outreach: Instantly ou Apollo.io (R$99/mês)',
        'Analytics: Mixpanel free (métricas de uso do produto)',
        'Suporte: Intercom ou Crisp free (chat + base de conhecimento)',
      ],
    },

    // ================================================
    // MÉTRICAS DE SUCESSO
    // ================================================
    success_metrics: {
      north_star:
        'Número de clientes que usam a plataforma pelo menos 3x/semana ' +
        'e têm NPS ≥ 40. Uso recorrente é o melhor preditor de retenção.',

      monthly_metrics: [
        {
          metric: 'MRR (Monthly Recurring Revenue)',
          month_1: 'R$0',
          month_3: 'R$3.000-5.000',
          month_6: 'R$8.000-15.000 (mid); R$15.000-25.000 (high)',
        },
        {
          metric: 'Clientes pagantes',
          month_1: '0',
          month_3: '2-3',
          month_6: '4-6 (mid); 6-8 (high)',
        },
        {
          metric: 'Pipeline qualificado (acumulado)',
          month_1: '5',
          month_3: '15',
          month_6: '30+ (acumulado). ~48 leads necessários para 8 deals a 17% conversão end-to-end',
        },
        {
          metric: 'Pilotos ativos',
          month_1: '1-2',
          month_3: '3-4',
          month_6: '2-3 (rotação contínua)',
        },
        {
          metric: 'Conversion rate (piloto → pago)',
          month_1: 'N/A',
          month_3: '50-70%',
          month_6: '60-70%',
        },
        {
          metric: 'Churn mensal',
          month_1: 'N/A',
          month_3: '<10%',
          month_6: '<5%',
        },
        {
          metric: 'NPS',
          month_1: 'N/A',
          month_3: '≥ 40',
          month_6: '≥ 50',
        },
        {
          metric: 'CAC real',
          month_1: 'N/A',
          month_3: 'Medir',
          month_6: '<R$15.000',
        },
      ],

      quarterly_goals: [
        {
          quarter: 'Q1 (Meses 1-3)',
          revenue_target_brl: 'R$3.000-5.000 MRR',
          clients_target: 3,
          arr_target_brl: 'R$36.000-60.000',
          key_milestone:
            'Primeiro cliente pagante fora da Raiz Educação. ' +
            'Validação de pricing no mercado real.',
        },
        {
          quarter: 'Q2 (Meses 4-6)',
          revenue_target_brl: 'R$8.000-15.000 MRR (mid); R$15.000-25.000 MRR (high)',
          clients_target: 6,
          arr_target_brl: 'R$96.000-180.000 (mid); R$180.000-300.000 (high)',
          key_milestone:
            'SDR qualifica e agenda demos autonomamente (founder ainda fecha). ' +
            'Pelo menos 1 vertical adicional validada (saúde ou varejo).',
        },
      ],
    },

    // ================================================
    // RISCOS E MITIGAÇÕES
    // ================================================
    risks_and_mitigations: [
      {
        risk: 'Ciclo de venda mais longo que o esperado (>90 dias)',
        probability: 'high',
        impact: 'high',
        mitigation:
          'Focar em empresas com dor aguda (resultado trimestral ruim, troca de CFO). ' +
          'Piloto gratuito reduz risco percebido e acelera decisão.',
        contingency:
          'Se ciclo >90 dias consistente: reduzir preço do Starter para R$990/mês ' +
          'e criar plano "Essencial" mais barato para entry point.',
      },
      {
        risk: 'Prospect não consegue fazer upload de dados (formato incompatível)',
        probability: 'high',
        impact: 'medium',
        mitigation:
          'Mapeamento de colunas flexível (aceita qualquer CSV/XLSX). ' +
          'Onboarding assistido nos primeiros clientes para entender edge cases.',
        contingency:
          'Criar "import concierge": equipe faz o primeiro import para o cliente ' +
          '(custo baixo, alto valor percebido, dados para melhorar auto-import).',
      },
      {
        risk: 'Churn alto nos primeiros 3 meses (>10%)',
        probability: 'medium',
        impact: 'high',
        mitigation:
          'Check-ins semanais nos primeiros 30 dias. ' +
          'Identificar campeão interno que use diariamente. ' +
          'Health Score do próprio cliente como demonstração contínua de valor.',
        contingency:
          'Se churn >10%: entrevista de saída detalhada, ' +
          'priorizar features de retenção (alertas por e-mail, relatórios automáticos).',
      },
      {
        risk: 'Founder bottleneck — todas as vendas dependem de 1 pessoa',
        probability: 'high',
        impact: 'high',
        mitigation:
          'Documentar playbook de vendas desde o dia 1. ' +
          'Gravar todas as demos e calls de discovery para treinamento. ' +
          'SDR no mês 3 para desafogar prospecção e rampar antes do mês 5.',
        contingency:
          'Se founder saturado antes do mês 3: usar agência de geração de leads B2B ' +
          '(R$3-5k/mês) como ponte até SDR estar contratado.',
      },
      {
        risk: 'Concorrente estabelecido (Accountfy, LeverPro) lança feature similar',
        probability: 'medium',
        impact: 'medium',
        mitigation:
          'Moat técnico: motor de cálculo determinístico + otimização + audit trail ' +
          'não são triviais de replicar. Velocidade de execução é vantagem de startup.',
        contingency:
          'Se concorrente replica: acelerar diferenciação em IA narrativa e ' +
          'scoring customizável por vertical (features mais difíceis de copiar).',
      },
      {
        risk: 'Custo de IA (Claude) escala mais rápido que receita',
        probability: 'medium',
        impact: 'medium',
        mitigation:
          'Pre-aggregation (financialSummary ~2KB) limita tokens por call. ' +
          'Limites por plano (Starter: 2 relatórios IA/semana). ' +
          'Monitoramento de custo por cliente.',
        contingency:
          'Se custo >15% da receita: migrar análises não-críticas para modelo mais barato ' +
          '(Haiku), cache de análises similares, aumentar preço dos planos em 10-15%.',
      },
      {
        risk: 'Dev Lead single point of failure — se o desenvolvedor adoecer, sair ou sobrecarregar, roadmap técnico para completamente',
        probability: 'high',
        impact: 'high',
        mitigation:
          'Documentação técnica mínima (CLAUDE.md + architecture docs já existentes). ' +
          'Code review com AI assistido. Plano de contratação de dev #2 ao atingir R$10k MRR.',
        contingency:
          'Freelancer sênior React/Supabase como backup (R$15-20k/mês spot). ' +
          'Priorizar: manter produto estável > adicionar features.',
      },
      {
        risk: 'Regulação LGPD exige investimento jurídico significativo',
        probability: 'low',
        impact: 'medium',
        mitigation:
          'DPA (Data Processing Agreement) padrão desde o dia 1. ' +
          'Dados isolados por org_id com RLS. Sem dados pessoais no core (apenas financeiros).',
        contingency:
          'Se exigência específica: contratar DPO as-a-service (R$2-4k/mês).',
      },
    ],

    // ================================================
    // ESTIMATIVA DE ORÇAMENTO (6 MESES)
    // ================================================
    budget_estimate: {
      total_6_months_brl:
        'R$90.000-130.000 (investimento incremental, excluindo equipe existente). ' +
        'Custo total carregado com equipe: R$270.000-400.000 ' +
        '(inclui Founder R$15-25k/mês + Dev Lead R$15-20k/mês).',

      breakdown: [
        {
          category: 'Founder/CEO (pro-labore — custo existente)',
          monthly_brl: 'R$15.000-25.000',
          total_6_months_brl: 'R$90.000-150.000',
          notes: 'Custo existente, não incremental. Incluído para transparência com investidores',
        },
        {
          category: 'Dev Lead (salário — custo existente)',
          monthly_brl: 'R$15.000-20.000',
          total_6_months_brl: 'R$90.000-120.000',
          notes: 'Custo existente, não incremental. Incluído para transparência com investidores',
        },
        {
          category: 'Infraestrutura (Vercel Pro + Supabase Pro)',
          monthly_brl: 'R$400-800',
          total_6_months_brl: 'R$2.400-4.800',
          notes: 'Escala com uso. Vercel Pro R$20/mês + Supabase Pro R$25/mês + excedentes',
        },
        {
          category: 'IA (Anthropic Claude API)',
          monthly_brl: 'R$500-2.000',
          total_6_months_brl: 'R$3.000-12.000',
          notes: 'Varia com número de clientes e relatórios gerados. ~R$50-100/cliente/mês',
        },
        {
          category: 'Ferramentas SaaS (CRM, email, billing, suporte)',
          monthly_brl: 'R$500-1.000',
          total_6_months_brl: 'R$3.000-6.000',
          notes: 'HubSpot free + Stripe (taxa) + Instantly + Crisp',
        },
        {
          category: 'Freelancer marketing (parcial)',
          monthly_brl: 'R$2.000-3.000',
          total_6_months_brl: 'R$12.000-18.000',
          notes: 'Landing page, conteúdo, design, case studies. Meses 1-6',
        },
        {
          category: 'SDR (contratação mês 3)',
          monthly_brl: 'R$4.000-5.000',
          total_6_months_brl: 'R$16.000-20.000',
          notes: 'Fixo + variável. 4 meses no período (meses 3-6)',
        },
        {
          category: 'Jurídico (contratos, LGPD, termos)',
          monthly_brl: 'R$1.500-3.000',
          total_6_months_brl: 'R$3.000-6.000',
          notes: 'Concentrado nos meses 1-2. Revisão de contrato + DPA + termos',
        },
        {
          category: 'Eventos e networking (associações, meetups)',
          monthly_brl: 'R$500-1.000',
          total_6_months_brl: 'R$3.000-6.000',
          notes: 'Participação em eventos SEMESP, ANEC, fintechs. Networking com CFOs',
        },
        {
          category: 'Reserva operacional (imprevistos)',
          monthly_brl: 'R$2.000-3.000',
          total_6_months_brl: 'R$12.000-18.000',
          notes: 'Buffer para despesas não previstas, viagens, demos presenciais',
        },
      ],

      expected_revenue_6_months_brl:
        'Projeção mês a mês (MRR acumulado por cenário): ' +
        'LOW:  M1=R$0, M2=R$0, M3=R$3k, M4=R$4k, M5=R$6k, M6=R$8k → Total acumulado: R$21k. ' +
        'MID:  M1=R$0, M2=R$0, M3=R$4k, M4=R$6k, M5=R$10k, M6=R$15k → Total acumulado: R$35k. ' +
        'HIGH: M1=R$0, M2=R$0, M3=R$5k, M4=R$8k, M5=R$15k, M6=R$25k → Total acumulado: R$53k. ' +
        'Faixa declarada R$21-53k corresponde aos cenários low-high.',

      breakeven_month:
        'Breakeven incremental (excluindo equipe existente): mês 7-9, ~10 clientes ' +
        'com mix 40/45/15 (ticket médio ponderado ~R$3.5k/mês → R$35k MRR vs R$18-22k custos incrementais). ' +
        'Breakeven total carregado (incluindo equipe): mês 12-14, ~15-17 clientes ' +
        '(R$52-60k MRR vs R$50-65k custos totais). ' +
        'Nota: early-adopters com 30% de desconto reduzem ticket médio para ~R$2.8k nos primeiros 6 meses.',

      funding_source:
        'Opções: (1) Bootstrap com receita do produto + reservas do founder. ' +
        '(2) Investimento anjo R$200-500k para acelerar contratações e marketing. ' +
        '(3) Revenue-based financing após atingir R$15k MRR. ' +
        'Recomendação: bootstrap até R$15k MRR, então avaliar seed round se quiser acelerar.',
    },
  };
}

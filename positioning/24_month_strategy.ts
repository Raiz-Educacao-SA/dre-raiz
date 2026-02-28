// ============================================
// 24-Month Strategy — Plano de 24 Meses
// Posicionamento estratégico pessoal
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface TwentyFourMonthStrategy {
  title: string;
  version: string;
  generated_at: string;
  vision: StrategyVision;
  phases: StrategyPhase[];
  milestones: Milestone[];
  risk_matrix: RiskEntry[];
  success_metrics: SuccessMetrics;
  decision_framework: DecisionFramework;
}

export interface StrategyVision {
  north_star: string;
  end_state_24_months: string;
  guiding_principles: string[];
}

export interface StrategyPhase {
  phase_number: number;
  name: string;
  duration: string;
  months: string;
  objective: string;
  actions: PhaseAction[];
  deliverables: string[];
  success_criteria: string[];
  risks: string[];
}

export interface PhaseAction {
  action: string;
  priority: 'critical' | 'high' | 'medium';
  effort: string;
  expected_outcome: string;
}

export interface Milestone {
  month: number;
  milestone: string;
  validation: string;
  dependency: string;
}

export interface RiskEntry {
  risk: string;
  probability: 'alta' | 'media' | 'baixa';
  impact: 'alto' | 'medio' | 'baixo';
  mitigation: string;
  trigger_to_act: string;
}

export interface SuccessMetrics {
  overview: string;
  by_quarter: QuarterMetrics[];
}

export interface QuarterMetrics {
  quarter: string;
  months: string;
  metrics: MetricEntry[];
}

export interface MetricEntry {
  metric: string;
  target: string;
  measurement: string;
}

export interface DecisionFramework {
  overview: string;
  scenarios: StrategicScenario[];
  pivot_triggers: PivotTrigger[];
}

export interface StrategicScenario {
  scenario: string;
  description: string;
  strategy: string;
  timeline_impact: string;
}

export interface PivotTrigger {
  trigger: string;
  action: string;
  deadline: string;
}

// --------------------------------------------
// 24-Month Strategy Generator
// --------------------------------------------

/**
 * Gera o plano estratégico de 24 meses para posicionamento de carreira.
 * Define fases, marcos, riscos e métricas de sucesso.
 * Função pura — zero I/O.
 */
export function generateTwentyFourMonthStrategy(): TwentyFourMonthStrategy {
  return {
    title: 'Plano Estratégico de 24 Meses — Carreira em Decision Intelligence',
    version: '1.0',
    generated_at: new Date().toISOString(),

    // ================================================
    // VISÃO ESTRATÉGICA
    // ================================================
    vision: {
      north_star:
        'Ser referência reconhecida na interseção de FP&A e tecnologia no Brasil — ' +
        'seja como líder em empresa, fundador de produto ou consultor de transformação digital financeira.',

      end_state_24_months:
        'Em 24 meses, ter: (1) posição profissional que combine finanças e tecnologia, ' +
        '(2) presença digital estabelecida como especialista em Decision Intelligence para FP&A, ' +
        '(3) rede de contatos ativa no ecossistema fintech/FP&A brasileiro, ' +
        'e (4) pelo menos uma forma concreta em que o ativo tecnológico gerou valor ' +
        'profissional ou financeiro (diferencial em contratação, receita de consultoria ou MRR de produto).',

      guiding_principles: [
        'Credibilidade antes de visibilidade — construir reputação com resultados demonstráveis, não promessas',
        'Produção como prova — o ativo em produção é o diferencial, não apenas discurso',
        'Honestidade de maturidade — sempre distinguir o que está em produção, construído e planejado',
        'Optionalidade — manter múltiplos caminhos abertos (emprego, consultoria, produto) sem comprometer nenhum',
        'Execução incremental — passos menores com validação constante, não apostas grandes',
      ],
    },

    // ================================================
    // FASES (4 fases de ~6 meses)
    // ================================================
    phases: [
      // ------------------------------------------------
      // FASE 1: FUNDAÇÃO (Meses 1-6)
      // ------------------------------------------------
      {
        phase_number: 1,
        name: 'Fundação — Presença e Posicionamento',
        duration: '6 meses',
        months: 'M1-M6',
        objective:
          'Estabelecer presença digital profissional, começar a construir rede ' +
          'e validar posicionamento com o mercado.',

        actions: [
          {
            action: 'Otimizar perfil LinkedIn com posicionamento Decision Intelligence + FP&A',
            priority: 'critical',
            effort: '1 semana',
            expected_outcome: 'Perfil otimizado com headline, about e featured post estratégicos',
          },
          {
            action: 'Publicar featured post no LinkedIn (case da plataforma)',
            priority: 'critical',
            effort: '1-2 semanas (inclui anonimização de dados e alinhamento com empregador sobre divulgação)',
            expected_outcome: 'Post de referência que ancora todo o posicionamento',
          },
          {
            action: 'Iniciar cadência de conteúdo LinkedIn (4-6 posts/mês nos 4 pilares)',
            priority: 'high',
            effort: '2-3 horas/semana',
            expected_outcome: 'Visibilidade crescente, primeiros seguidores do nicho',
          },
          {
            action: 'Preparar repositório GitHub público com módulos core (open source parcial)',
            priority: 'high',
            effort: '2 semanas',
            expected_outcome: 'Demonstração técnica acessível — código limpo, README explicativo',
          },
          {
            action: 'Conectar ativamente com 50+ profissionais do ecossistema FP&A (controllers, analistas sênior, consultores e, quando possível, CFOs/diretores financeiros)',
            priority: 'high',
            effort: '30 min/dia',
            expected_outcome: 'Rede de 50+ contatos relevantes, primeiras conversas de valor',
          },
          {
            action: 'Identificar e participar de 2-3 eventos/meetups de fintech ou FP&A',
            priority: 'medium',
            effort: '1 evento/mês',
            expected_outcome: 'Contatos presenciais, validação de posicionamento com o mercado',
          },
        ],

        deliverables: [
          'Perfil LinkedIn otimizado e ativo',
          'Featured post publicado com engajamento inicial',
          '12-18 posts publicados nos 4 pilares de conteúdo',
          'Repositório GitHub público com core modules',
          '50+ conexões relevantes no ecossistema FP&A/fintech',
        ],

        success_criteria: [
          'Pelo menos 3 mensagens/convites orgânicos de contatos profissionais interessados no perfil',
          'Engajamento médio de 20+ interações por post LinkedIn',
          'Pelo menos 1 convite para conversa profissional (emprego, consultoria ou parceria)',
        ],

        risks: [
          'Conteúdo não ressoa com audiência — mitigar testando diferentes pilares e ajustando',
          'Falta de tempo para manter cadência — mitigar com batch writing (preparar 4 posts de uma vez)',
          'Posicionamento percebido como técnico demais — mitigar liderando com impacto de negócio',
        ],
      },

      // ------------------------------------------------
      // FASE 2: ACELERAÇÃO (Meses 7-12)
      // ------------------------------------------------
      {
        phase_number: 2,
        name: 'Aceleração — Oportunidades e Validação',
        duration: '6 meses',
        months: 'M7-M12',
        objective:
          'Converter presença digital em oportunidades concretas ' +
          '(emprego, consultoria ou primeiro cliente) e validar demand-side.',

        actions: [
          {
            action: 'Iniciar candidaturas ativas para roles de Head de FP&A ou PM/CPO em fintech',
            priority: 'critical',
            effort: '5-8 horas/semana',
            expected_outcome: 'Pipeline de 5-10 oportunidades qualificadas',
          },
          {
            action: 'Oferecer 1-2 projetos piloto de consultoria (diagnóstico + automação FP&A)',
            priority: 'critical',
            effort: '10-15 horas/projeto',
            expected_outcome: 'Primeiro case externo, validação de modelo de consultoria',
          },
          {
            action: 'Submeter palestra para 2-3 eventos de fintech ou FP&A',
            priority: 'high',
            effort: '2 semanas preparação por palestra',
            expected_outcome: 'Autoridade reconhecida no nicho, novos contatos qualificados',
          },
          {
            action: 'Escalar cadência de conteúdo para incluir artigos longos (1x/mês)',
            priority: 'high',
            effort: '3-4 horas/artigo',
            expected_outcome: 'SEO, autoridade de conteúdo, material evergreen',
          },
          {
            action: 'Explorar parcerias com consultorias que atendam mid-market (Big 4, boutique)',
            priority: 'medium',
            effort: '2-3 conversas/mês',
            expected_outcome: 'Canal de consultoria com acesso a clientes qualificados',
          },
          {
            action: 'Avaliar viabilidade de produto SaaS: conversar com 10+ potenciais clientes',
            priority: 'medium',
            effort: '5 conversas exploratórias/mês',
            expected_outcome: 'Validação (ou invalidação) de demand-side para SaaS',
          },
        ],

        deliverables: [
          'Pipeline de oportunidades profissionais ativo (emprego ou consultoria)',
          'Pelo menos 1 projeto de consultoria concluído (mesmo que pro-bono ou com desconto)',
          'Pelo menos 1 palestra realizada em evento do nicho',
          '6+ artigos longos publicados',
          'Relatório de validação de mercado: 10+ entrevistas com potenciais clientes',
        ],

        success_criteria: [
          'Pelo menos 1 proposta de emprego ou contrato de consultoria recebida',
          'Pelo menos 5 potenciais clientes expressaram interesse em solução de Decision Intelligence',
          'Perfil LinkedIn com 300+ conexões no ecossistema financeiro/tecnológico',
          'Pelo menos 2 convites orgânicos para palestras ou podcasts',
        ],

        risks: [
          'Mercado de trabalho aquecido para perfil puro de FP&A mas não para híbrido — ' +
            'mitigar posicionando o técnico como diferencial, não pré-requisito',
          'Consultoria toma tempo demais e não gera escala — ' +
            'mitigar com escopo fixo (diagnóstico de 2 semanas) e pricing value-based',
          'Validação SaaS mostra demand fraco — ' +
            'pivotar para consultoria + emprego como caminhos primários',
        ],
      },

      // ------------------------------------------------
      // FASE 3: CONSOLIDAÇÃO (Meses 13-18)
      // ------------------------------------------------
      {
        phase_number: 3,
        name: 'Consolidação — Decisão de Caminho Principal',
        duration: '6 meses',
        months: 'M13-M18',
        objective:
          'Com dados dos primeiros 12 meses, decidir caminho principal ' +
          '(crescimento interno, emprego externo, consultoria ou produto) e investir com foco.',

        actions: [
          {
            action: 'Avaliar resultados dos 4 caminhos e decidir prioridade (framework de decisão abaixo)',
            priority: 'critical',
            effort: '1 semana de análise',
            expected_outcome: 'Decisão informada de caminho principal com dados reais',
          },
          {
            action: 'Se emprego: negociar posição que combine FP&A e tecnologia (Head FP&A, PM, CTO)',
            priority: 'critical',
            effort: 'Contínuo',
            expected_outcome: 'Posição que alavanca o ativo tecnológico construído',
          },
          {
            action: 'Se consultoria: estruturar oferta formal (3 pacotes: diagnóstico, implementação, transformação)',
            priority: 'critical',
            effort: '2 semanas para estruturar + contínuo',
            expected_outcome: 'Pipeline de consultoria previsível com 2-3 clientes ativos',
          },
          {
            action: 'Se produto: iniciar implementação multi-tenant e buscar primeiro piloto',
            priority: 'critical',
            effort: '6 meses full-time ou 9-12 meses part-time. Requer decisão de dedicação exclusiva ou contratação de co-fundador técnico.',
            expected_outcome: 'MVP funcional com 1 piloto em uso (pode ser gratuito). Primeiro pagante é meta de M21-24.',
          },
          {
            action: 'Manter presença digital (cadência reduzida se necessário: 2-3 posts/mês)',
            priority: 'high',
            effort: '1-2 horas/semana',
            expected_outcome: 'Não perder momentum de autoridade construída',
          },
          {
            action: 'Consolidar rede com 3-5 mentores/advisors ativos no ecossistema',
            priority: 'medium',
            effort: '1 conversa/mês com cada',
            expected_outcome: 'Aconselhamento estratégico de profissionais experientes',
          },
        ],

        deliverables: [
          'Decisão documentada de caminho principal (emprego, consultoria ou produto)',
          'Se emprego: carta proposta ou contrato assinado',
          'Se consultoria: 2-3 clientes ativos ou pipeline sólido',
          'Se produto: MVP multi-tenant com pelo menos 1 piloto pagante',
          'Rede de 3-5 mentores/advisors ativos',
        ],

        success_criteria: [
          'Caminho principal definido com base em dados (não intuição)',
          'Valor financeiro mensal do ativo: se emprego, salário R$3.000+/mês acima de posição FP&A pura equivalente; se consultoria, R$5.000+/mês em faturamento; se produto, R$2.000+ MRR',
          'Reconhecimento de pelo menos 2 líderes do setor como referência no nicho',
        ],

        risks: [
          'Nenhum caminho mostra tração clara até mês 12 — ' +
            'reduzir ambição: aceitar posição FP&A tradicional como base enquanto constrói os outros',
          'Produto exige investimento maior que o disponível — ' +
            'buscar co-fundador técnico ou aplicar em aceleradoras focadas em fintech',
          'Consultoria gera receita mas não escala — ' +
            'usar como ponte enquanto desenvolve produto ou busca posição ideal',
        ],
      },

      // ------------------------------------------------
      // FASE 4: ESCALA (Meses 19-24)
      // ------------------------------------------------
      {
        phase_number: 4,
        name: 'Escala — Multiplicação no Caminho Escolhido',
        duration: '6 meses',
        months: 'M19-M24',
        objective:
          'Escalar no caminho escolhido, consolidar posição de referência ' +
          'e definir visão de 5 anos.',

        actions: [
          {
            action: 'Escalar resultados no caminho principal (promoção, novos clientes ou MRR)',
            priority: 'critical',
            effort: 'Contínuo',
            expected_outcome: 'Crescimento demonstrável: receita, impacto ou senioridade',
          },
          {
            action: 'Publicar case study completo: "Do Excel ao Decision Intelligence"',
            priority: 'high',
            effort: '2-3 semanas',
            expected_outcome: 'Material de referência que ancora autoridade a longo prazo',
          },
          {
            action: 'Avaliar oportunidade de segundo caminho (se emprego, explorar consultoria lateral; se produto, explorar contratação)',
            priority: 'medium',
            effort: '2-3 horas/semana',
            expected_outcome: 'Diversificação de fontes de valor profissional',
          },
          {
            action: 'Definir visão de 5 anos e próximo plano estratégico',
            priority: 'medium',
            effort: '1 semana de reflexão estratégica',
            expected_outcome: 'Direção clara para os próximos anos com base nos aprendizados',
          },
        ],

        deliverables: [
          'Crescimento documentado no caminho principal',
          'Case study publicado e amplamente compartilhado',
          'Plano estratégico de 5 anos definido',
          'Avaliação de diversificação de caminhos',
        ],

        success_criteria: [
          'Compensação total mensal 30%+ acima do salário CLT registrado no mês 0 (baseline definido em M1)',
          'Reconhecimento público como especialista em Decision Intelligence para FP&A',
          'Pelo menos 3 menções/referências orgânicas de terceiros sobre o trabalho',
          'Visão de 5 anos definida com próximos passos claros',
        ],

        risks: [
          'Mercado de Decision Intelligence não amadurece no Brasil — ' +
            'posicionar como "transformação digital de FP&A" (conceito mais estabelecido)',
          'Burnout por operar em múltiplos caminhos — ' +
            'disciplina de foco: escolher 1 caminho principal e manter outros como opcionais',
          'Tecnologia que construí fica obsoleta — ' +
            'manter stack moderna e modular, atualizar React/TypeScript conforme necessário',
        ],
      },
    ],

    // ================================================
    // MARCOS (MILESTONES)
    // ================================================
    milestones: [
      {
        month: 1,
        milestone: 'Perfil LinkedIn otimizado e featured post publicado',
        validation: 'Post tem 50+ interações na primeira semana',
        dependency: 'Narrativa executiva e portfolio finalizados (Fases 1-2 deste projeto)',
      },
      {
        month: 3,
        milestone: 'Cadência de conteúdo estabelecida (12+ posts publicados)',
        validation: 'Engajamento médio 20+ por post, 3+ DMs de profissionais do nicho',
        dependency: 'Tempo dedicado (2-3h/semana) confirmado',
      },
      {
        month: 6,
        milestone: 'Repositório GitHub público + 50 conexões relevantes no LinkedIn',
        validation: 'README visualizado 100+ vezes (GitHub traffic) e referenciado em pelo menos 1 post LinkedIn com 20+ interações',
        dependency: 'Código core refatorado para open source parcial',
      },
      {
        month: 9,
        milestone: 'Primeiro projeto de consultoria concluído ou entrevista para posição sênior',
        validation: 'Feedback positivo do cliente/recrutador, referência obtida',
        dependency: 'Rede construída nos meses 1-6 gera oportunidades',
      },
      {
        month: 12,
        milestone: 'Palestra realizada + relatório de validação de mercado com 10+ entrevistas',
        validation: 'Convite para segundo evento, dados claros de demand-side',
        dependency: 'Reputação de conteúdo + rede geram convites',
      },
      {
        month: 15,
        milestone: 'Decisão de caminho principal tomada e comunicada',
        validation: 'Decisão documentada com critérios objetivos (framework abaixo)',
        dependency: 'Dados suficientes dos 3 caminhos coletados em M1-12',
      },
      {
        month: 18,
        milestone: 'Receita mensal de R$5.000+ proveniente do ativo tecnológico',
        validation: 'Comprovante de pagamento (salário, contrato ou fatura)',
        dependency: 'Caminho principal definido e em execução há 3+ meses',
      },
      {
        month: 24,
        milestone: 'Posição consolidada + case study publicado + visão de 5 anos definida',
        validation: 'Reconhecimento público, crescimento financeiro 30%+, próximo plano claro',
        dependency: 'Execução consistente ao longo dos 24 meses',
      },
    ],

    // ================================================
    // MATRIZ DE RISCOS
    // ================================================
    risk_matrix: [
      {
        risk: 'Mercado brasileiro não reconhece "Decision Intelligence" como categoria',
        probability: 'media',
        impact: 'medio',
        mitigation:
          'Usar "transformação digital de FP&A" como framing alternativo. ' +
          'Decision Intelligence é o conceito, FP&A automatizado é a dor.',
        trigger_to_act: 'Se até mês 6 nenhum engajamento de conteúdo sobre DI, pivotar framing',
      },
      {
        risk: 'Perfil híbrido (finanças+tech) confunde recrutadores — não se encaixa em boxes',
        probability: 'alta',
        impact: 'medio',
        mitigation:
          'Candidatar-se a posições que explicitamente peçam perfil híbrido (fintech, startups). ' +
          'Para corporações tradicionais, liderar com o lado financeiro e posicionar o técnico como bônus.',
        trigger_to_act: 'Se até mês 9 não houver entrevistas, ajustar CV para enfatizar FP&A puro + diferencial tech',
      },
      {
        risk: 'Plataforma construída perde relevância técnica (stack desatualizada)',
        probability: 'baixa',
        impact: 'alto',
        mitigation:
          'Manter React e TypeScript atualizados (versionamento semestral). ' +
          'Supabase é mantido pela comunidade. Core puro (zero I/O) não envelhece.',
        trigger_to_act: 'Se React 20+ ou alternativa dominante surgir, avaliar migração gradual',
      },
      {
        risk: 'Concorrente lança produto similar de Decision Intelligence para FP&A no Brasil',
        probability: 'media',
        impact: 'alto',
        mitigation:
          'Vantagem de first-mover com sistema em produção e dados reais. ' +
          'Caso apareça concorrente, pivotar para consultoria/implementação ' +
          'ou buscar parceria/aquisição.',
        trigger_to_act: 'Se concorrente direto surgir, avaliar em 30 dias: competir, colaborar ou pivotar',
      },
      {
        risk: 'Falta de tempo para manter cadência de conteúdo e networking',
        probability: 'alta',
        impact: 'medio',
        mitigation:
          'Batch writing: preparar 4 posts em 1 sessão. ' +
          'Priorizar qualidade sobre quantidade (2 posts bons > 6 mediocres). ' +
          'Networking ativo 30 min/dia é suficiente.',
        trigger_to_act: 'Se 2 semanas sem publicar, ativar modo batch no próximo fim de semana',
      },
      {
        risk: 'Validação SaaS mostra que clientes mid-market não pagam por FP&A vertical',
        probability: 'media',
        impact: 'alto',
        mitigation:
          'Consultoria como alternativa: mesmo conhecimento, modelo de entrega diferente. ' +
          'Emprego em fintech: levar o ativo como diferencial para posição de produto.',
        trigger_to_act: 'Se até mês 12 menos de 3 empresas expressarem willingness-to-pay, deprioritizar SaaS',
      },
    ],

    // ================================================
    // MÉTRICAS DE SUCESSO
    // ================================================
    success_metrics: {
      overview:
        'Métricas organizadas por trimestre, cobrindo presença digital, ' +
        'rede profissional, oportunidades e receita. ' +
        'Cada métrica tem target e forma de medição objetiva.',

      by_quarter: [
        {
          quarter: 'Q1',
          months: 'M1-M3',
          metrics: [
            { metric: 'Posts LinkedIn publicados', target: '12-18', measurement: 'Contagem direta no perfil' },
            { metric: 'Conexões relevantes novas', target: '30+', measurement: 'LinkedIn connections no setor FP&A/fintech' },
            { metric: 'Engajamento médio por post', target: '15+', measurement: 'Média de likes+comments por post' },
            { metric: 'DMs profissionais recebidas', target: '3+', measurement: 'Mensagens de interesse genuíno (não spam)' },
          ],
        },
        {
          quarter: 'Q2',
          months: 'M4-M6',
          metrics: [
            { metric: 'Conexões relevantes acumuladas', target: '50+', measurement: 'LinkedIn connections qualificadas' },
            { metric: 'GitHub README views no repositório core', target: '100+', measurement: 'GitHub traffic analytics (views)' },
            { metric: 'Eventos participados', target: '2-3', measurement: 'Presença em eventos/meetups do setor' },
            { metric: 'Convites para conversas profissionais', target: '3+', measurement: 'Convites orgânicos (emprego, consultoria, parceria)' },
          ],
        },
        {
          quarter: 'Q3',
          months: 'M7-M9',
          metrics: [
            { metric: 'Oportunidades no pipeline', target: '5+', measurement: 'Vagas ou projetos em negociação' },
            { metric: 'Projetos de consultoria em andamento', target: '1+', measurement: 'Contratos ou pilotos ativos' },
            { metric: 'Artigos longos publicados', target: '3+', measurement: 'Posts ou artigos com 800+ palavras' },
            { metric: 'Conexões relevantes acumuladas', target: '200+', measurement: 'Rede LinkedIn qualificada' },
          ],
        },
        {
          quarter: 'Q4',
          months: 'M10-M12',
          metrics: [
            { metric: 'Proposta de emprego ou contrato recebida', target: '1+', measurement: 'Proposta formal (escrita)' },
            { metric: 'Palestras realizadas', target: '1+', measurement: 'Evento com público 20+ pessoas' },
            { metric: 'Entrevistas de validação de mercado', target: '10+', measurement: 'Conversas com potenciais clientes de Decision Intelligence' },
            { metric: 'Receita gerada pelo ativo', target: 'Qualquer', measurement: 'Primeiro R$ de consultoria ou piloto' },
          ],
        },
        {
          quarter: 'Q5',
          months: 'M13-M15',
          metrics: [
            { metric: 'Caminho principal definido', target: 'Decisão documentada', measurement: 'Framework de decisão aplicado e resultado registrado' },
            { metric: 'Modelo de receita validado', target: 'Pipeline ativo', measurement: 'Pricing definido, pipeline em negociação, ou salário negociado com diferencial tech' },
            { metric: 'Mentores/advisors ativos', target: '3+', measurement: 'Conversas regulares (1x/mês)' },
          ],
        },
        {
          quarter: 'Q6',
          months: 'M16-M18',
          metrics: [
            { metric: 'Receita mensal do ativo', target: 'R$5.000+', measurement: 'Comprovação financeira' },
            { metric: 'Clientes ativos (se consultoria/produto)', target: '2-3', measurement: 'Contratos ou assinaturas' },
            { metric: 'Reconhecimento público', target: '2+ referências', measurement: 'Menções de terceiros sobre o trabalho' },
          ],
        },
        {
          quarter: 'Q7',
          months: 'M19-M21',
          metrics: [
            { metric: 'Crescimento de compensação', target: '20%+ vs baseline M0', measurement: 'Comparação com salário CLT registrado no mês 0' },
            { metric: 'Case study publicado', target: '1', measurement: 'Artigo completo publicado e compartilhado' },
            { metric: 'Convites orgânicos para eventos', target: '2+', measurement: 'Convites sem candidatura' },
          ],
        },
        {
          quarter: 'Q8',
          months: 'M22-M24',
          metrics: [
            { metric: 'Crescimento de compensação', target: '30%+ vs baseline M0', measurement: 'Comparação com salário CLT registrado no mês 0' },
            { metric: 'Visão de 5 anos definida', target: 'Documento escrito', measurement: 'Plano registrado com próximos passos' },
            { metric: 'Menções de terceiros', target: '3+', measurement: 'Referências orgânicas ao trabalho' },
            { metric: 'Escolheria este caminho de novo?', target: 'Sim (documentado)', measurement: 'Resposta binária com raciocínio registrado por escrito' },
          ],
        },
      ],
    },

    // ================================================
    // FRAMEWORK DE DECISÃO (para mês 12-15)
    // ================================================
    decision_framework: {
      overview:
        'No mês 12-15, será necessário decidir o caminho principal. ' +
        'A decisão deve ser baseada em dados coletados nos primeiros 12 meses, ' +
        'não em aspiração. Quatro cenários possíveis com critérios objetivos.',

      scenarios: [
        {
          scenario: 'Cenário A: Emprego como caminho principal',
          description:
            'Posição de liderança (Head FP&A, PM/CPO, CTO startup) ' +
            'que combine finanças e tecnologia.',
          strategy:
            'Aceitar posição que valorize perfil híbrido. ' +
            'Negociar tempo para manter presença digital e consultoria lateral. ' +
            'Usar salário como base financeira para construção de longo prazo.',
          timeline_impact:
            'Receita previsível em M13-15. ' +
            'Consultoria e produto ficam como opções de longo prazo.',
        },
        {
          scenario: 'Cenário B: Consultoria como caminho principal',
          description:
            'Oferta estruturada de transformação digital de FP&A ' +
            'para médias empresas (diagnóstico + implementação).',
          strategy:
            'Estruturar 3 pacotes de consultoria. ' +
            'Usar rede construída nos meses 1-12 para primeiro pipeline. ' +
            'Parceria com consultorias como canal de distribuição.',
          timeline_impact:
            'Receita variável a partir de M13. ' +
            'Precisa de 2-3 clientes simultâneos para sustentabilidade.',
        },
        {
          scenario: 'Cenário C: Produto SaaS como caminho principal',
          description:
            'Comercializar a plataforma como SaaS vertical para FP&A mid-market.',
          strategy:
            'Implementar multi-tenant (6+ meses full-time). Primeiro piloto em M18-21. ' +
            'Buscar aceleradora ou investimento anjo para go-to-market. ' +
            'Manter emprego part-time ou consultoria como ponte financeira.',
          timeline_impact:
            'Investimento alto em M13-21. Receita recorrente a partir de M21-24. ' +
            'Risco maior, retorno potencialmente maior.',
        },
        {
          scenario: 'Cenário D: Crescimento interno na Raiz Educação',
          description:
            'Promoção ou criação de role que combine FP&A e tecnologia ' +
            'dentro da empresa atual (Head FP&A, líder de transformação digital financeira).',
          strategy:
            'Negociar mandato expandido, equipe e compensação. ' +
            'Usar plataforma construída como prova de capacidade. ' +
            'Expandir escopo para outras áreas do grupo que precisam de automação financeira.',
          timeline_impact:
            'Caminho mais conservador e de menor risco. ' +
            'Receita (salário) imediata. ' +
            'Mantém os outros caminhos como opções de longo prazo.',
        },
      ],

      pivot_triggers: [
        {
          trigger: 'Até M6, zero engajamento relevante no LinkedIn',
          action: 'Contratar mentor de personal branding ou revisar posicionamento completamente',
          deadline: 'M6',
        },
        {
          trigger: 'Até M9, nenhuma oportunidade profissional (emprego, consultoria, parceria)',
          action: 'Ampliar escopo: aceitar posições FP&A tradicionais como entry point e posicionar diferencial tech internamente',
          deadline: 'M9',
        },
        {
          trigger: 'Até M12, validação SaaS negativa (<3 empresas com willingness-to-pay)',
          action: 'Deprioritizar caminho de produto. Focar em emprego ou consultoria. Reavaliar em M24.',
          deadline: 'M12',
        },
        {
          trigger: 'Em qualquer momento: burnout ou insatisfação com a estratégia',
          action: 'Pausar ações de aceleração, manter apenas manutenção mínima (1 post/mês). Reavaliar em 30 dias.',
          deadline: 'Qualquer momento',
        },
        {
          trigger: 'Até M15, nenhum caminho mostra tração financeira',
          action: 'Aceitar melhor posição disponível de FP&A como base. Manter os outros caminhos como side projects de longo prazo.',
          deadline: 'M15',
        },
      ],
    },
  };
}

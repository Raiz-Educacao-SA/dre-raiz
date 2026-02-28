// ============================================
// Decision Intelligence Platform — Product Definition
// Documento de definição de produto SaaS
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface ProductDefinition {
  product: ProductIdentity;
  problem: ProblemStatement;
  target_audience: TargetAudience;
  value_proposition: ValueProposition;
  competitive_edge: CompetitiveEdge;
  tech_stack: TechStack;
  monetization: MonetizationModel;
}

export interface ProductIdentity {
  name: string;
  tagline: string;
  category: string;
  version: string;
}

export interface ProblemStatement {
  headline: string;
  pain_points: PainPoint[];
  cost_of_inaction: string;
}

export interface PainPoint {
  persona: string;
  problem: string;
  current_workaround: string;
  consequence: string;
}

export interface TargetAudience {
  primary: AudienceSegment;
  secondary: AudienceSegment;
  ideal_customer_profile: IdealCustomerProfile;
}

export interface AudienceSegment {
  title: string;
  description: string;
  company_size: string;
  revenue_range: string;
  roles: string[];
}

export interface IdealCustomerProfile {
  industry: string[];
  employees: string;
  annual_revenue: string;
  pain_intensity: string;
  decision_maker: string;
  buying_trigger: string;
}

export interface ValueProposition {
  one_liner: string;
  key_benefits: Benefit[];
  before_after: BeforeAfter[];
}

export interface Benefit {
  title: string;
  description: string;
  quantified_impact: string;
}

export interface BeforeAfter {
  dimension: string;
  before: string;
  after: string;
}

export interface CompetitiveEdge {
  positioning_statement: string;
  differentiators: Differentiator[];
  moat: string;
}

export interface Differentiator {
  feature: string;
  us: string;
  competitors: string;
  why_it_matters: string;
}

export interface TechStack {
  architecture_type: string;
  core_engine: string;
  frontend: string;
  backend: string;
  database: string;
  ai_layer: string;
  deployment: string;
  key_properties: string[];
}

export interface MonetizationModel {
  model_type: string;
  pricing_philosophy: string;
  plans: PricingPlan[];
  unit_economics: UnitEconomics;
}

export interface PricingPlan {
  name: string;
  price_monthly_brl: number;
  target: string;
  features: string[];
  limits: Record<string, number | string>;
}

export interface UnitEconomics {
  estimated_cac: string;
  estimated_ltv: string;
  target_ltv_cac_ratio: string;
  gross_margin_target: string;
  payback_months: string;
}

// --------------------------------------------
// Product Definition Generator
// --------------------------------------------

export function generateProductDefinition(): ProductDefinition {
  return {
    // ================================================
    // 1. IDENTIDADE DO PRODUTO
    // ================================================
    product: {
      name: 'Financ.IA',
      tagline: 'Seu DRE consolida sozinho. A IA diz o que fazer.',
      category: 'Plataforma de Inteligência Financeira (FP&A)',
      version: '1.0',
    },

    // ================================================
    // 2. PROBLEMA QUE RESOLVE
    // ================================================
    problem: {
      headline:
        'Empresas de médio porte gastam 15-20 dias por mês consolidando DRE em planilhas, ' +
        'tomando decisões financeiras com dados desatualizados, sem simulação de cenários ' +
        'e sem visibilidade de impacto antes de agir.',

      pain_points: [
        {
          persona: 'CFO / Diretor Financeiro',
          problem:
            'Precisa decidir onde cortar custos ou realocar receita, ' +
            'mas não tem visibilidade do impacto antes de agir',
          current_workaround:
            'Planilhas Excel manuais, reuniões longas, análise intuitiva',
          consequence:
            'Decisões demoram semanas, frequentemente baseadas em "achismo", ' +
            'com impacto financeiro negativo descoberto só no mês seguinte',
        },
        {
          persona: 'Controller / Gerente de FP&A',
          problem:
            'Consolidar dados de múltiplas filiais/marcas em DRE gerencial ' +
            'é um processo manual, demorado e propenso a erros',
          current_workaround:
            'Exporta dados do ERP, manipula em Excel, cruza manualmente',
          consequence:
            'Dados inconsistentes entre áreas, ' +
            'versões conflitantes de "verdade", retrabalho mensal',
        },
        {
          persona: 'CEO / Conselho',
          problem:
            'Quer visão consolidada e acionável da saúde financeira do grupo, ' +
            'com tendências e alertas automáticos',
          current_workaround:
            'Recebe relatórios estáticos via PowerPoint/e-mail',
          consequence:
            'Visibilidade atrasada em 2-3 semanas, ' +
            'sem capacidade de reagir a tempo a tendências negativas',
        },
        {
          persona: 'Gestor de Unidade / Filial',
          problem:
            'Não entende como seu DRE impacta o score geral da filial ' +
            'nem quais alavancas são mais efetivas',
          current_workaround:
            'Depende de análises solicitadas ao financeiro central',
          consequence:
            'Operação desconectada dos objetivos financeiros do grupo',
        },
      ],

      cost_of_inaction:
        'Empresas que tomam decisões financeiras com dados de 15-30 dias atrás ' +
        'e sem simulação perdem em média 3-8% de margem por decisões tardias ou equivocadas. ' +
        'Para uma empresa de R$100M de receita, isso equivale a R$3-8M/ano em valor destruído.',
    },

    // ================================================
    // 3. PÚBLICO-ALVO
    // ================================================
    target_audience: {
      primary: {
        title: 'Grupos educacionais (beachhead market)',
        description:
          'Redes educacionais com múltiplas escolas/faculdades/marcas que consolidam DRE gerencial ' +
          'mensalmente. Mercado de entrada — produto já validado neste setor. ' +
          'Expansão futura: saúde (hospitais), varejo (multi-loja), franquias.',
        company_size: '200-5.000 funcionários',
        revenue_range: 'R$50M - R$500M/ano',
        roles: [
          'CFO',
          'VP Financeiro',
          'Controller',
          'Gerente de FP&A',
          'CEO',
        ],
      },
      secondary: {
        title: 'Consultorias financeiras e assessorias de gestão',
        description:
          'Consultorias que atendem múltiplos clientes e precisam ' +
          'de uma plataforma para padronizar análise financeira',
        company_size: '10-100 funcionários',
        revenue_range: 'R$5M - R$50M/ano',
        roles: [
          'Sócio-diretor',
          'Consultor sênior',
          'Analista financeiro',
        ],
      },
      ideal_customer_profile: {
        industry: [
          'Educação (redes/grupos)',
          'Saúde (hospitais/clínicas)',
          'Varejo (multi-loja)',
          'Serviços profissionais (multi-unidade)',
          'Franquias',
        ],
        employees: '300-3.000',
        annual_revenue: 'R$80M - R$300M',
        pain_intensity:
          'Consolidam DRE de 5+ unidades mensalmente em Excel',
        decision_maker: 'CFO ou VP Financeiro',
        buying_trigger:
          'Resultado trimestral abaixo do orçado, ' +
          'erro de consolidação com impacto material, ' +
          'ou chegada de novo CFO buscando transformação digital',
      },
    },

    // ================================================
    // 4. PROPOSTA DE VALOR
    // ================================================
    value_proposition: {
      one_liner:
        'Financ.IA consolida o DRE de todas as suas filiais automaticamente ' +
        'e usa inteligência artificial para recomendar onde cortar, realocar e investir.',

      key_benefits: [
        {
          title: 'Consolidação automática de DRE',
          description:
            'Importa dados de qualquer ERP, consolida por filial/marca/centro de custo ' +
            'e gera DRE gerencial padronizado automaticamente',
          quantified_impact:
            'De 15 dias manuais para <1 hora de setup inicial. Atualização contínua.',
        },
        {
          title: 'Health Score inteligente',
          description:
            'Calcula score de saúde financeira de 0-100 por filial com breakdown de penalidades, ' +
            'classificação automática (Saudável/Atenção/Crítico) e alertas proativos',
          quantified_impact:
            'Identifica filiais em deterioração 30-60 dias antes de impactar resultado do grupo.',
        },
        {
          title: 'Simulação e otimização',
          description:
            'Simula cenários (e se cortarmos 10% aqui? e se receita crescer 5%?) ' +
            'e gera planos de ação otimizados com priorização automática',
          quantified_impact:
            'Reduz tempo de planejamento de ações corretivas de semanas para minutos.',
        },
        {
          title: 'Projeção de tendências',
          description:
            'Projeta score, margem e EBITDA para os próximos 3 meses ' +
            'com detecção automática de tendências de deterioração',
          quantified_impact:
            'Antecipar tendências permite ação corretiva antes do impacto no resultado.',
        },
        {
          title: 'Equipe de IA financeira',
          description:
            'Agentes de IA especializados analisam seu DRE automaticamente: ' +
            'supervisor planeja, analistas executam, consolidador resume',
          quantified_impact:
            'Análise que levaria 2 dias de um analista sênior pronta em 2 minutos.',
        },
      ],

      before_after: [
        {
          dimension: 'Consolidação de DRE',
          before: '15-20 dias em Excel, sujeito a erros humanos',
          after: 'Automática, tempo real, rastreável',
        },
        {
          dimension: 'Visibilidade de saúde',
          before: 'Relatórios estáticos mensais, percepção intuitiva',
          after: 'Health Score 0-100 por filial, atualizado continuamente',
        },
        {
          dimension: 'Planejamento de ações',
          before: 'Reuniões de horas, slides, decisões baseadas em feeling',
          after: 'Plano otimizado automaticamente com impacto projetado',
        },
        {
          dimension: 'Detecção de problemas',
          before: 'Descoberto no fechamento do mês seguinte',
          after: 'Alertas automáticos com tendência preditiva',
        },
        {
          dimension: 'Visão do CEO',
          before: 'PowerPoint consolidado com 3 semanas de atraso',
          after: 'Dashboard CEO com ranking de filiais e ações recomendadas',
        },
      ],
    },

    // ================================================
    // 5. DIFERENCIAL COMPETITIVO
    // ================================================
    competitive_edge: {
      positioning_statement:
        'Financ.IA é como ter um FP&A sênior trabalhando 24/7 para cada filial. ' +
        'Consolida seu DRE automaticamente, calcula a saúde financeira de cada unidade, ' +
        'projeta tendências e recomenda ações concretas — ' +
        'diferente de BI que mostra gráficos ou planilhas que só calculam.',

      differentiators: [
        {
          feature: 'Resultados reproduzíveis e auditáveis',
          us:
            'Cada cálculo gera sempre o mesmo resultado para os mesmos dados. ' +
            'Ideal para auditoria e compliance — nenhuma "caixa preta"',
          competitors:
            'Power BI e Tableau mostram dados mas não recomendam ações. ' +
            'ChatGPT/Copilot geram respostas diferentes a cada vez, impossíveis de auditar',
          why_it_matters:
            'Decisões financeiras exigem rastreabilidade. ' +
            'Auditorias precisam reproduzir cálculos — IA generativa sozinha não entrega isso',
        },
        {
          feature: 'Plano de ação calculado automaticamente',
          us:
            'Calcula o melhor plano de corte de custos respeitando suas restrições ' +
            '(áreas protegidas, margem mínima, teto por centro de custo) e prioriza automaticamente',
          competitors:
            'Totvs/Protheus e SAP não oferecem otimização de cortes. ' +
            'Accountfy consolida DRE mas não recomenda ações. ' +
            'Nenhum concorrente de FP&A gera planos de ação automáticos',
          why_it_matters:
            'Transforma "o que fazer para bater a meta" de pergunta difícil em resposta calculada',
        },
        {
          feature: 'Análise narrativa por IA especializada',
          us:
            'Uma equipe de IA analisa cada aspecto do seu DRE e entrega um relatório executivo pronto: ' +
            'diagnóstico, recomendações e resumo para o board',
          competitors:
            'Power BI + Copilot gera insights genéricos sem contexto de DRE. ' +
            'Accountfy não tem camada de IA. ' +
            'Consultorias financeiras fazem manualmente a R$50-100k por projeto',
          why_it_matters:
            'O gestor precisa de narrativa e recomendação, não de gráficos para interpretar sozinho',
        },
        {
          feature: 'Governança completa de decisões',
          us:
            'Cada decisão, simulação e análise fica registrada com dados de entrada/saída, ' +
            'data, responsável e justificativa — registro imutável',
          competitors:
            'Excel não tem histórico de decisões. ' +
            'Power BI registra views mas não decisões. ' +
            'ERPs registram transações mas não o raciocínio por trás',
          why_it_matters:
            'Empresas de médio/grande porte precisam de governança ' +
            'para conselhos, auditorias e compliance',
        },
        {
          feature: 'Valor percebido em minutos, não em meses',
          us:
            'Upload de DRE → mapeamento guiado → primeira análise completa ' +
            'em menos de 1 hora após integração de dados',
          competitors:
            'Totvs/SAP levam 3-12 meses para implantar. ' +
            'Power BI precisa de semanas de construção de dashboards. ' +
            'Accountfy exige configuração de plano de contas',
          why_it_matters:
            'Quanto mais rápido o valor percebido, maior conversão trial→pago e menor churn',
        },
      ],

      moat:
        'Motor de cálculo proprietário, impossível de replicar apenas com IA generativa. ' +
        'Quanto mais dados o cliente acumula, melhor a calibração dos modelos por vertical ' +
        'e mais difícil a troca. Integração com o workflow decisório do cliente ' +
        '(alertas, planos, aprovações, audit trail) cria dependência operacional.',
    },

    // ================================================
    // 6. STACK TECNOLÓGICA
    // ================================================
    tech_stack: {
      architecture_type: 'SaaS Multi-Tenant — Cloud nativo',
      core_engine:
        'Motor de cálculo proprietário — resultados reproduzíveis e auditáveis, ' +
        'separado da camada de IA e da interface',
      frontend: 'Aplicação web moderna (React) — acesso via navegador, sem instalação',
      backend: 'Serverless — escala automaticamente com a demanda do cliente',
      database: 'PostgreSQL gerenciado com isolamento de dados por cliente e atualizações em tempo real',
      ai_layer: 'IA Anthropic Claude — análise narrativa e recomendações contextualizadas',
      deployment: 'Infraestrutura cloud (Vercel + Supabase) — SLA 99.9%, backups automáticos',
      key_properties: [
        'Resultados determinísticos: mesmos dados sempre geram mesmas conclusões',
        'Dados isolados por organização — zero compartilhamento entre clientes',
        'Histórico completo de decisões para auditoria e compliance',
        'Escala para centenas de filiais sem degradação de performance',
        'Acesso via navegador — sem instalação, atualização automática',
        'Integração via API REST — conecta com qualquer ERP ou sistema financeiro',
      ],
    },

    // ================================================
    // 7. MODELO DE MONETIZAÇÃO
    // ================================================
    monetization: {
      model_type: 'SaaS — Assinatura mensal recorrente',
      pricing_philosophy:
        'Pricing baseado em valor entregue, não em volume de dados. ' +
        'Planos escalonados por capacidade e features avançadas. ' +
        'Barreira de entrada baixa (starter acessível), valor crescente com uso. ' +
        'Desconto de 20% para contrato anual (pagamento antecipado).',

      plans: [
        {
          name: 'Starter',
          price_monthly_brl: 1490,
          target: 'Empresa única, 1-5 filiais, CFO hands-on',
          features: [
            'DRE Gerencial consolidado',
            'Health Score por filial',
            'Alertas automáticos',
            'Exportação Excel/PDF',
            '5 usuários',
            'Suporte por e-mail',
          ],
          limits: {
            filiais: 5,
            usuarios: 5,
            relatorios_ia_semana: 2,
            historico_meses: 12,
            desconto_anual_pct: 20,
          },
        },
        {
          name: 'Pro',
          price_monthly_brl: 3990,
          target: 'Grupo com múltiplas marcas, 5-20 filiais, FP&A dedicado',
          features: [
            'Tudo do Starter',
            'Simulação de cenários',
            'Otimização automática de planos de ação',
            'Projeção de tendências (forecast)',
            'Equipe de IA financeira (relatórios diários)',
            'Dashboard CEO',
            'Análise por marca/filial/centro de custo',
            '15 usuários',
            'Suporte prioritário',
          ],
          limits: {
            filiais: 20,
            usuarios: 15,
            relatorios_ia_semana: 'ilimitados',
            historico_meses: 24,
            desconto_anual_pct: 20,
          },
        },
        {
          name: 'Enterprise',
          price_monthly_brl: 9990,
          target: 'Grupo grande, 20+ filiais, auditoria e compliance',
          features: [
            'Tudo do Pro',
            'Otimização com restrições avançadas',
            'Audit trail completo para compliance',
            'Agendamento automático de análises',
            'Relatório executivo automático para board',
            'Modelo de scoring customizável por vertical',
            'SSO / SAML',
            'SLA de uptime 99.9%',
            'Até 50 usuários',
            'Suporte dedicado (account manager)',
            'API de integração com ERP',
          ],
          limits: {
            filiais: 'ilimitadas',
            usuarios: 50,
            relatorios_ia_semana: 'ilimitados',
            historico_meses: 60,
            desconto_anual_pct: 20,
          },
        },
      ],

      unit_economics: {
        estimated_cac:
          'R$8.000-15.000 (venda consultiva 60-90 dias, ' +
          'SDR + AE + demo + piloto gratuito de 14 dias + procurement). ' +
          'Métricas serão recalibradas após primeiros 20 clientes.',
        estimated_ltv:
          'R$96.000 conservador (ticket médio R$4.000 × 24 meses de retenção para v1). ' +
          'Potencial R$150.000+ com expansão de plano e retenção superior a 30 meses.',
        target_ltv_cac_ratio: '6-10:1 (saudável para SaaS B2B mid-market)',
        gross_margin_target:
          '70-75% (infra R$300-800/cliente + suporte alocado R$400-600/cliente). ' +
          'Meta de 80% com escala e automação de suporte.',
        payback_months: '3-4 meses',
      },
    },
  };
}

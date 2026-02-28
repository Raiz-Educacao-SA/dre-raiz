// ============================================
// Market Profile — Perfil de Mercado Pessoal
// Posicionamento estratégico pessoal
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface MarketProfile {
  title: string;
  version: string;
  generated_at: string;
  professional_positioning: ProfessionalPositioning;
  target_roles: TargetRole[];
  value_propositions: ValuePropositions;
  competitive_landscape: ProfessionalCompetitiveLandscape;
  networking_strategy: NetworkingStrategy;
  personal_brand: PersonalBrand;
}

export interface ProfessionalPositioning {
  primary_identity: string;
  tagline: string;
  unique_value: string;
  market_gap_filled: string;
  proof_of_work: string[];
}

export interface TargetRole {
  role_title: string;
  industry_fit: string[];
  why_qualified: string;
  value_delivered: string;
  salary_range_context: string;
  ideal_company_profile: string;
}

export interface ValuePropositions {
  for_cfo: ValueProp;
  for_ceo: ValueProp;
  for_cto: ValueProp;
  for_investor: ValueProp;
  for_board: ValueProp;
}

export interface ValueProp {
  audience: string;
  headline: string;
  body: string;
  proof_point: string;
}

export interface ProfessionalCompetitiveLandscape {
  overview: string;
  archetype_comparison: ArchetypeComparison[];
  differentiation_summary: string;
}

export interface ArchetypeComparison {
  archetype: string;
  description: string;
  strengths: string[];
  limitations: string[];
  how_i_differ: string;
}

export interface NetworkingStrategy {
  overview: string;
  target_communities: TargetCommunity[];
  content_pillars: ContentPillar[];
  speaking_topics: SpeakingTopic[];
}

export interface TargetCommunity {
  community: string;
  relevance: string;
  approach: string;
}

export interface ContentPillar {
  pillar: string;
  description: string;
  format: string;
  frequency: string;
}

export interface SpeakingTopic {
  topic: string;
  angle: string;
  audience: string;
}

export interface PersonalBrand {
  core_message: string;
  brand_attributes: string[];
  visual_identity_notes: string;
  online_presence: OnlinePresence;
}

export interface OnlinePresence {
  linkedin_strategy: string;
  github_strategy: string;
  content_strategy: string;
}

// --------------------------------------------
// Market Profile Generator
// --------------------------------------------

/**
 * Gera o perfil de mercado para posicionamento profissional.
 * Define onde o profissional se posiciona, para quem, e com que diferencial.
 * Função pura — zero I/O.
 */
export function generateMarketProfile(): MarketProfile {
  return {
    title: 'Perfil de Mercado — Posicionamento Profissional',
    version: '1.0',
    generated_at: new Date().toISOString(),

    // ================================================
    // POSICIONAMENTO PROFISSIONAL
    // ================================================
    professional_positioning: {
      primary_identity:
        'Profissional de finanças com capacidade de execução técnica. ' +
        'Constrói sistemas de decisão financeira — não apenas os utiliza.',

      tagline:
        'De dados financeiros a decisões quantificadas — ' +
        'construo a infraestrutura que transforma FP&A.',

      unique_value:
        'A interseção rara entre domínio financeiro profundo (FP&A, DRE, rateio, cenários) ' +
        'e capacidade técnica enterprise (TypeScript, PostgreSQL, IA, arquitetura de software). ' +
        'Não é generalista em nenhum dos dois — é especialista nos dois.',

      market_gap_filled:
        'O mercado tem profissionais financeiros que dependem de ferramentas prontas ' +
        'e desenvolvedores que não entendem finanças. ' +
        'O gap é o profissional que identifica o problema financeiro, ' +
        'arquiteta a solução e implementa com qualidade enterprise. ' +
        'Esse profissional é quem pode liderar a transformação digital de FP&A.',

      proof_of_work: [
        'Plataforma de Decision Intelligence construída do zero e em produção — dados reais de R$300M+',
        '9 módulos core de lógica pura (2.750 LOC), 185 testes automatizados',
        'Consolidação de DRE de 10+ filiais reduzida de 15 dias para minutos',
        'IA integrada para narrativas financeiras (Claude + Groq + Gemini)',
        'Arquitetura enterprise: RLS, audit trail de aprovações, RBAC, materialized views, pg_cron',
        'Documentação de produto completa: pricing, roadmap, governança, multi-tenant design',
      ],
    },

    // ================================================
    // ROLES-ALVO
    // ================================================
    target_roles: [
      {
        role_title: 'Head de FP&A / Controller Sênior',
        industry_fit: ['Educação', 'Saúde', 'Varejo', 'Serviços multi-unidade'],
        why_qualified:
          'Experiência direta gerenciando FP&A de grupo com 10+ filiais e R$300M+ de receita. ' +
          'Capacidade adicional de construir e automatizar a infraestrutura de análise — ' +
          'reduzindo dependência de consultorias e ferramentas externas.',
        value_delivered:
          'Elimina gap de 15 dias na consolidação financeira, ' +
          'implementa scoring de saúde por filial, ' +
          'e constrói relatórios executivos automatizados com IA.',
        salary_range_context:
          'Posição de liderança em FP&A com skill técnico diferenciado. ' +
          'Valor adicional: não precisa de equipe de TI separada para automação financeira.',
        ideal_company_profile:
          'Grupo com 5+ unidades, receita R$100M+, em processo de profissionalização financeira. ' +
          'Pode ser empresa familiar em transição para governança corporativa.',
      },
      {
        role_title: 'Product Manager / CPO — Fintech Vertical',
        industry_fit: ['Fintech', 'SaaS B2B', 'RegTech'],
        why_qualified:
          'Construiu produto completo de FP&A do zero: definição, pricing, roadmap comercial, ' +
          'arquitetura multi-tenant desenhada. ' +
          'Validou com dados reais em produção — não é teoria.',
        value_delivered:
          'Traz validação em produção com dados reais e visão técnica profunda. ' +
          'Pode liderar roadmap de produto financeiro ' +
          'com entendimento real do problema do cliente.',
        salary_range_context:
          'PM/CPO com background duplo (finanças + engenharia) é raro. ' +
          'Diferencial: pode falar a língua do CFO E do dev lead.',
        ideal_company_profile:
          'Fintech ou SaaS B2B em estágio seed-to-Series A, ' +
          'atacando mid-market brasileiro com produto de gestão financeira.',
      },
      {
        role_title: 'CTO / Tech Lead — Startup de FP&A',
        industry_fit: ['Fintech', 'SaaS B2B', 'Consulting Tech'],
        why_qualified:
          'Implementou arquitetura completa: React 19 + TypeScript + Supabase + IA multi-provider. ' +
          '185 testes, 5 camadas de separação, pipeline assíncrono step-based. ' +
          'Stack moderna, padrões enterprise, com componentes-chave em produção ' +
          'e motor de cálculo validado com 185 testes.',
        value_delivered:
          'Arquitetura pronta para escalar. Motor determinístico testado. ' +
          'Reduz time-to-market para produto de FP&A — boa parte da fundação já existe.',
        salary_range_context:
          'CTO/Tech Lead com domínio financeiro é extremamente raro no Brasil. ' +
          'O background de negócio é o diferencial sobre desenvolvedores puros.',
        ideal_company_profile:
          'Startup early-stage com tese em FP&A, Decision Intelligence, ' +
          'ou analytics financeiro para mid-market.',
      },
      {
        role_title: 'Consultor Estratégico — Transformação Digital Financeira',
        industry_fit: ['Consultoria', 'Big 4', 'Advisory independente'],
        why_qualified:
          'Executou transformação digital de FP&A end-to-end: diagnóstico do problema, ' +
          'design da solução, implementação técnica e adoção. ' +
          'Não é consultor teórico — tem implementação em produção como prova.',
        value_delivered:
          'Pode replicar o framework de transformação em outros clientes. ' +
          'Combina diagnóstico estratégico com capacidade de implementação.',
        salary_range_context:
          'Consultor com capacidade de delivery técnico tem taxa premium. ' +
          'Diferencial: entrega resultado, não só relatório.',
        ideal_company_profile:
          'Consultoria que atenda mid-market e busque diferenciar-se ' +
          'com delivery técnico próprio (não só advisory).',
      },
    ],

    // ================================================
    // PROPOSTAS DE VALOR POR AUDIÊNCIA
    // ================================================
    value_propositions: {
      for_cfo: {
        audience: 'CFO / VP de Finanças',
        headline:
          'Transformo sua área de FP&A de compiladora de dados em centro de inteligência de decisão.',
        body:
          'Sua equipe gasta semanas consolidando DRE e produzindo relatórios estáticos. ' +
          'Eu automatizo esse processo: consolidação automática, relatórios com IA, ' +
          'fila de aprovação com audit trail — tudo em produção com dados reais de R$300M+. ' +
          'Além disso, módulos de score de saúde por filial, projeção de tendências ' +
          'e planos de ação calculados estão construídos e validados com 185 testes. ' +
          'Resultado: controller liberado para análise estratégica, decisões com dados atualizados.',
        proof_point:
          'Consolidação de DRE de 15 dias → minutos. ' +
          'Plataforma em produção com 185 testes automatizados.',
      },
      for_ceo: {
        audience: 'CEO / Presidente',
        headline:
          'Dou visibilidade financeira que habilita decisões rápidas e fundamentadas.',
        body:
          'Você precisa comparar Real vs. Orçado sem esperar 3 semanas. ' +
          'Precisa de relatório para o board em horas, não dias. ' +
          'A consolidação e comparação de cenários estão validadas em produção. ' +
          'Módulos de score por filial e projeção de tendências estão construídos e testados, ' +
          'prontos para ativação.',
        proof_point:
          'Score de saúde por filial (0-100) com projeção de 3 meses. ' +
          'Relatório executivo gerado por IA em minutos.',
      },
      for_cto: {
        audience: 'CTO / VP de Tecnologia',
        headline:
          'Entrego sistema financeiro enterprise-grade que sua equipe de produto gostaria de ter construído.',
        body:
          'Arquitetura em 5 camadas com core puro (zero I/O), 185 testes, ' +
          'RLS no PostgreSQL, pipeline de IA assíncrono, exportação multi-formato. ' +
          'Tudo em TypeScript strict mode, React 19, Supabase. ' +
          'Não é código de analista financeiro — é engenharia de software aplicada a finanças.',
        proof_point:
          '2.750 LOC de lógica pura testável isoladamente. ' +
          '1.000 cálculos de score em <50ms. Determinístico e auditável.',
      },
      for_investor: {
        audience: 'Investidor / VC',
        headline:
          'Tenho um produto validado em produção, com pricing modelado e arquitetura de escala.',
        body:
          'A plataforma roda com dados reais de grupo de R$300M+. ' +
          'Há validação em produção com dados reais — o problema existe em milhares de empresas mid-market. ' +
          'Pricing definido (3 tiers), unit economics projetados, roadmap comercial de 6 meses. ' +
          'O que falta é capital para go-to-market, equipe e evolução para multi-tenant. ' +
          'O ativo técnico e o conhecimento de domínio já existem.',
        proof_point:
          'Plataforma em produção. 185 testes. Roadmap comercial documentado. ' +
          'Arquitetura multi-tenant desenhada como roadmap de escala.',
      },
      for_board: {
        audience: 'Conselho / Board',
        headline:
          'Trago governança financeira com rastreabilidade total — cada decisão é auditável.',
        body:
          'Cada alteração financeira passa por fila de aprovação com RBAC. ' +
          'Dados protegidos por Row Level Security no nível do banco. ' +
          'Audit trail imutável de decisões com input, output e justificativa. ' +
          'Framework de governança formal documentado. ' +
          'O sistema foi construído pensando em compliance desde o dia zero.',
        proof_point:
          '5 roles (admin/manager/approver/viewer/pending). ' +
          'RLS PostgreSQL. Fila de aprovação com 7 tipos de alteração.',
      },
    },

    // ================================================
    // LANDSCAPE COMPETITIVO PROFISSIONAL
    // ================================================
    competitive_landscape: {
      overview:
        'No mercado de trabalho, profissionais com perfil financeiro+técnico são raros. ' +
        'A maioria se encaixa em um de quatro arquétipos — ' +
        'cada um com forças e limitações específicas. ' +
        'O posicionamento ideal é na interseção, onde nenhum arquétipo puro atua.',

      archetype_comparison: [
        {
          archetype: 'Analista de FP&A Tradicional',
          description:
            'Domínio financeiro sólido, opera com Excel/ERP/Power BI. ' +
            'Consumidor de ferramentas — não as constrói.',
          strengths: [
            'Profundo conhecimento contábil e regulatório',
            'Experiência com processos financeiros corporativos',
            'Rede de contatos no meio financeiro',
          ],
          limitations: [
            'Dependente de ferramentas prontas — não customiza',
            'Ciclos de consolidação manuais (15+ dias)',
            'Automação limitada a macros ou scripts pontuais — não constrói plataformas completas',
          ],
          how_i_differ:
            'Tenho o mesmo domínio financeiro, mas posso construir a ferramenta que ele precisa usar. ' +
            'Automatizo o que ele faz manualmente.',
        },
        {
          archetype: 'Desenvolvedor Full-Stack',
          description:
            'Capacidade técnica forte, constrói sistemas robustos. ' +
            'Não entende o domínio financeiro em profundidade.',
          strengths: [
            'Engenharia de software de alta qualidade',
            'Arquitetura escalável e testável',
            'Experiência com stacks modernas',
          ],
          limitations: [
            'Precisa de product manager para definir o que construir',
            'Entende finanças no nível de features (CRUD, dashboards) — não no nível de decisão (margem de contribuição, rateio, cenário)',
            'Constrói features sem entender o impacto financeiro',
          ],
          how_i_differ:
            'Tenho capacidade técnica equivalente, mas defino o produto sozinho ' +
            'porque entendo o problema do cliente (CFO/Controller) na raiz.',
        },
        {
          archetype: 'Consultor de Gestão (Big 4 / Estratégia)',
          description:
            'Visão estratégica, frameworks sofisticados, credibilidade institucional. ' +
            'Entrega diagnóstico e recomendação — não implementação.',
          strengths: [
            'Frameworks de diagnóstico estruturados',
            'Acesso a C-level e boards',
            'Credibilidade da marca da consultoria',
          ],
          limitations: [
            'Não implementa — entrega relatório e vai embora',
            'Custo alto para resultado incerto',
            'Recomendações genéricas que precisam de adaptação',
          ],
          how_i_differ:
            'Entrego o diagnóstico E a implementação. ' +
            'O resultado não é um relatório — é um sistema funcionando em produção.',
        },
        {
          archetype: 'Product Manager de Fintech',
          description:
            'Visão de produto e mercado, define roadmaps, ' +
            'mas depende de equipe de engenharia para executar.',
          strengths: [
            'Pensamento de produto e mercado',
            'Skill de priorização e trade-offs',
            'Entende métricas de SaaS (MRR, churn, CAC)',
          ],
          limitations: [
            'Não consegue prototipar sozinho',
            'Gap entre visão e execução — depende de devs',
            'Pode definir produto sem experiência de uso real',
          ],
          how_i_differ:
            'Defino O produto E construo. A plataforma que desenhei é a mesma que implementei ' +
            'e validei em produção. Não há gap entre visão e execução.',
        },
      ],

      differentiation_summary:
        'O diferencial não está em ser o melhor financeiro ou o melhor desenvolvedor. ' +
        'Está em ser o profissional que opera na interseção — ' +
        'com profundidade suficiente nos dois lados para fazer o que nenhum arquétipo puro consegue: ' +
        'identificar o problema financeiro, arquitetar a solução técnica, implementar do zero, ' +
        'e validar em produção com dados reais.',
    },

    // ================================================
    // ESTRATÉGIA DE NETWORKING
    // ================================================
    networking_strategy: {
      overview:
        'Estratégia focada em visibilidade na interseção finanças + tecnologia. ' +
        'Prioriza comunidades onde o perfil híbrido é raro e valorizado, ' +
        'com conteúdo que demonstra capacidade (não apenas afirma).',

      target_communities: [
        {
          community: 'CFOs e Controllers de grupos educacionais',
          relevance: 'Público que vive o problema que resolvi. Maior credibilidade.',
          approach: 'Cases reais de transformação, sem jargão técnico. ' +
            'Foco em antes/depois: 15 dias → minutos.',
        },
        {
          community: 'Fintech e SaaS B2B Brasil',
          relevance: 'Ecossistema de produto financeiro. Oportunidades de co-fundação ou role de produto.',
          approach: 'Demonstrar que tenho produto validado em produção. ' +
            'Participar de eventos de ecossistema (Fintouch, SaaStr Latino).',
        },
        {
          community: 'Decision Intelligence / Analytics',
          relevance: 'Comunidade emergente onde o conceito ainda precisa de exemplos práticos.',
          approach: 'Posicionar o case como implementação real de Decision Intelligence — ' +
            'não é teoria, é sistema em produção.',
        },
        {
          community: 'Desenvolvedores TypeScript / React',
          relevance: 'Validação técnica e visibilidade para oportunidades tech.',
          approach: 'Compartilhar decisões de arquitetura: por que motor determinístico, ' +
            'como pipeline assíncrono step-based resolve timeout.',
        },
      ],

      content_pillars: [
        {
          pillar: 'Transformação de FP&A',
          description: 'Como migrar de Excel para plataforma de decisão — com exemplos reais.',
          format: 'Posts LinkedIn longos (800-1200 palavras)',
          frequency: '2x/mês',
        },
        {
          pillar: 'Decision Intelligence na prática',
          description: 'O que é Decision Intelligence e como apliquei em FP&A — ' +
            'desmistificando o conceito com caso real.',
          format: 'Artigos no LinkedIn ou Medium',
          frequency: '1x/mês',
        },
        {
          pillar: 'Arquitetura de sistemas financeiros',
          description: 'Decisões técnicas por trás da plataforma — ' +
            'motor determinístico, RLS, pipeline de IA.',
          format: 'Posts técnicos no LinkedIn ou dev.to',
          frequency: '1x/mês',
        },
        {
          pillar: 'Antes/Depois operacional',
          description: 'Comparações visuais do processo antes e depois da plataforma — ' +
            'impacto tangível.',
          format: 'Posts curtos LinkedIn com visual (mockup ou screenshot anonimizado)',
          frequency: '2x/mês',
        },
      ],

      speaking_topics: [
        {
          topic: 'Do Excel ao Decision Intelligence: como automatizei FP&A de R$300M+',
          angle: 'Case prático com números reais — não é teoria de consultoria.',
          audience: 'CFOs, Controllers, diretores financeiros de grupos multi-unidade',
        },
        {
          topic: 'Motor determinístico vs. IA generativa: quando cada um faz sentido em finanças',
          angle: 'Por que construí um motor de cálculo puro ao lado de IA narrativa — ' +
            'e como eles se complementam.',
          audience: 'CTOs, tech leads, PMs de fintech',
        },
        {
          topic: 'FP&A 2.0: de compilador de relatórios para analista estratégico',
          angle: 'A mudança de papel do profissional financeiro quando a tecnologia assume ' +
            'a compilação.',
          audience: 'Profissionais de FP&A, estudantes de finanças, RH de empresas financeiras',
        },
      ],
    },

    // ================================================
    // MARCA PESSOAL
    // ================================================
    personal_brand: {
      core_message:
        'Não sou o financeiro que pede ferramentas. ' +
        'Sou o financeiro que constrói a ferramenta que o mercado precisa.',

      brand_attributes: [
        'Construtor: não consome ferramentas — cria as que faltam',
        'Quantitativo: tudo tem número, simulação e evidência',
        'Pragmático: sistema em produção com dados reais, não protótipo acadêmico',
        'Híbrido: finanças + tecnologia com profundidade nos dois lados',
        'Transparente: distingue o que está em produção do que está construído',
      ],

      visual_identity_notes:
        'Tom profissional sóbrio, sem hipérbole. ' +
        'Paleta que remete a finanças (azul escuro, cinza) com toque de tecnologia (verde/teal). ' +
        'Gráficos e dados como elemento visual principal — ' +
        'a marca é de profissional que opera com evidências, não promessas.',

      online_presence: {
        linkedin_strategy:
          'Perfil otimizado com headline de Decision Intelligence + FP&A. ' +
          'About section conta a história (problema → solução → resultado). ' +
          'Featured post demonstra o case. Conteúdo regular (4-6 posts/mês) ' +
          'nos 4 pilares: transformação FP&A, Decision Intelligence, ' +
          'arquitetura técnica, antes/depois operacional. ' +
          'Engajamento ativo em posts de CFOs e fintech.',

        github_strategy:
          'Repositório público com os módulos core (motor determinístico) — ' +
          'demonstra qualidade de código e arquitetura sem expor dados proprietários. ' +
          'README bem estruturado explicando o problema, a solução e a arquitetura. ' +
          'Contribuições consistentes mostram continuidade.',

        content_strategy:
          'LinkedIn como plataforma primária (público-alvo está lá). ' +
          'Posts longos para profundidade, posts curtos para visibilidade. ' +
          'Artigos ocasionais no Medium para SEO e alcance técnico. ' +
          'Evitar Twitter/X para foco — audiência financeira concentra no LinkedIn.',
      },
    },
  };
}

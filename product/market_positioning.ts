// ============================================
// Market Positioning — Posicionamento de Mercado
// Análise competitiva e narrativa de diferenciação
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface MarketPositioning {
  narrative: MarketNarrative;
  competitive_analysis: CompetitiveAnalysis[];
  positioning_matrix: PositioningMatrix;
  battle_cards: BattleCard[];
  messaging_framework: MessagingFramework;
}

export interface MarketNarrative {
  category: string;
  headline: string;
  elevator_pitch_30s: string;
  elevator_pitch_60s: string;
  key_message: string;
  proof_points: string[];
}

export interface CompetitiveAnalysis {
  competitor: string;
  category: string;
  what_they_do: string;
  their_strengths: string[];
  their_weaknesses: string[];
  our_advantage: string;
  when_we_lose: string;
  battle_cry: string;
}

export interface PositioningMatrix {
  axes: { x: string; y: string };
  our_position: { x_value: string; y_value: string };
  quadrants: Quadrant[];
}

export interface Quadrant {
  name: string;
  x_range: string;
  y_range: string;
  competitors: string[];
  description: string;
}

export interface BattleCard {
  scenario: string;
  competitor: string;
  their_pitch: string;
  our_counter: string;
  killer_question: string;
  proof_point: string;
}

export interface MessagingFramework {
  for_cfo: PersonaMessage;
  for_controller: PersonaMessage;
  for_ceo: PersonaMessage;
  for_consultant: PersonaMessage;
}

export interface PersonaMessage {
  persona: string;
  pain: string;
  promise: string;
  proof: string;
  cta: string;
}

// --------------------------------------------
// Market Positioning Generator
// --------------------------------------------

export function generateMarketPositioning(): MarketPositioning {
  return {
    // ================================================
    // 1. NARRATIVA CENTRAL
    // ================================================
    narrative: {
      category: 'Plataforma de Inteligência Financeira (FP&A)',

      headline:
        'Motor de decisão financeira com otimização automática',

      elevator_pitch_30s:
        'Financ.IA consolida o DRE de todas as suas filiais automaticamente ' +
        'e usa inteligência artificial para dizer exatamente onde cortar custos, ' +
        'realocar recursos e investir. ' +
        'É como ter um FP&A sênior trabalhando 24/7 para cada filial.',

      elevator_pitch_60s:
        'Empresas com múltiplas filiais gastam 15-20 dias por mês consolidando DRE em Excel, ' +
        'tomando decisões com dados desatualizados e sem simulação de impacto. ' +
        'Financ.IA resolve isso em três camadas: ' +
        'primeiro, consolida seu DRE automaticamente de qualquer ERP. ' +
        'Segundo, calcula um score de saúde financeira de 0-100 para cada filial, ' +
        'com alertas automáticos e projeção de tendências. ' +
        'Terceiro, gera planos de ação otimizados — o sistema calcula ' +
        'exatamente onde cortar e quanto, respeitando suas restrições. ' +
        'Clientes passam de 15 dias de consolidação manual para análise disponível ' +
        'em minutos após upload, com primeira análise pronta em menos de 1 hora. ' +
        'Isso é Financ.IA.',

      key_message:
        'Financ.IA não mostra gráficos para você interpretar. ' +
        'Calcula, projeta, simula e recomenda ações concretas — ' +
        'com resultados reproduzíveis e auditáveis.',

      proof_points: [
        'Motor de cálculo determinístico com 171 testes automatizados — resultados reproduzíveis',
        'Plano de ação otimizado automaticamente com restrições (áreas protegidas, margem mínima)',
        'Projeção de tendências com detecção automática de deterioração',
        'Equipe de IA especializada analisa e gera relatório executivo em 2 minutos',
        'Audit trail imutável — cada decisão registrada para compliance',
        'Primeira análise completa em <1 hora (upload → mapeamento → DRE → relatório IA)',
        'Produto validado em grupo educacional com 10+ filiais e R$300M+ de receita',
      ],
    },

    // ================================================
    // 2. ANÁLISE COMPETITIVA
    // ================================================
    competitive_analysis: [
      // --- vs. Excel ---
      {
        competitor: 'Excel / Google Sheets',
        category: 'Planilha manual',
        what_they_do:
          'Ferramenta genérica usada para consolidação manual de DRE, ' +
          'criação de relatórios ad-hoc e simulações básicas via fórmulas.',
        their_strengths: [
          'Gratuito ou custo marginal (já está instalado)',
          'Flexibilidade total (faz qualquer coisa)',
          'Curva de aprendizado zero (todo mundo sabe usar)',
          'Controle total do usuário (sem dependência de vendor)',
        ],
        their_weaknesses: [
          'Consolidação manual: 15-20 dias por mês de trabalho repetitivo',
          'Sem versionamento: "DRE_final_v3_revisado_FINAL.xlsx"',
          'Propenso a erros: fórmula quebrada → decisão errada',
          'Sem audit trail: quem mudou o quê e quando?',
          'Sem projeção de tendências ou alertas automáticos',
          'Sem otimização: planos de ação são feeling, não cálculo',
          'Dados ficam na máquina de uma pessoa → risco operacional',
        ],
        our_advantage:
          'Financ.IA faz em segundos o que Excel faz em semanas. ' +
          'Consolida automaticamente, calcula score, projeta tendências ' +
          'e gera planos de ação — impossível de replicar em planilha.',
        when_we_lose:
          'Empresa muito pequena (1-2 filiais) onde o CFO "gosta de mexer no Excel" ' +
          'e não vê valor em automação. Ou quando o orçamento é literalmente zero.',
        battle_cry:
          'Seu tempo vale mais do que 15 dias por mês copiando dados entre planilhas.',
      },

      // --- vs. BI (Power BI, Tableau, Looker) ---
      {
        competitor: 'Power BI / Tableau / Looker',
        category: 'Business Intelligence tradicional',
        what_they_do:
          'Plataformas de visualização de dados que conectam a fontes, ' +
          'criam dashboards e permitem exploração ad-hoc.',
        their_strengths: [
          'Visualizações sofisticadas e personalizáveis',
          'Conectores para centenas de fontes de dados',
          'Ecosistema maduro (Microsoft 365 para Power BI)',
          'Self-service analytics (usuário monta seus próprios dashboards)',
          'Power BI + Copilot traz IA generativa para insights',
        ],
        their_weaknesses: [
          'Mostra dados, não toma decisões — gráfico não diz "corte 8% aqui"',
          'Precisa de especialista para construir dashboards (semanas/meses)',
          'Insights genéricos: Copilot responde perguntas, não gera planos de ação',
          'Sem scoring de saúde financeira nativo',
          'Sem otimização automática de cortes ou alocações',
          'Sem audit trail de decisões (registra views, não ações)',
          'Custo real: licença + especialista BI + manutenção = R$10-30k/mês',
        ],
        our_advantage:
          'BI mostra o problema. Financ.IA resolve o problema. ' +
          'Enquanto Power BI precisa que alguém interprete gráficos e crie planos manualmente, ' +
          'Financ.IA calcula o plano ótimo e entrega pronto.',
        when_we_lose:
          'Empresa que já tem um time de BI maduro (3+ analistas) e acredita que ' +
          'Copilot resolve a camada de insights. Também perdemos quando a necessidade é ' +
          'analytics amplo (vendas, operações, marketing) — Power BI é horizontal; ' +
          'Financ.IA é vertical em FP&A.',
        battle_cry:
          'Você quer mais dashboards para interpretar ou respostas prontas para agir?',
      },

      // --- vs. Consultorias ---
      {
        competitor: 'Consultorias financeiras (Falconi, McKinsey, boutiques)',
        category: 'Consultoria de gestão',
        what_they_do:
          'Projetos de diagnóstico financeiro, turnaround, ' +
          'reestruturação de custos e melhoria de margem. ' +
          'Entrega: relatório + recomendações + acompanhamento temporário.',
        their_strengths: [
          'Expertise humana profunda — senioridade e contexto de mercado',
          'Capacidade de influenciar cultura e processos',
          'Credibilidade com boards e investidores',
          'Visão de benchmark entre empresas do setor',
        ],
        their_weaknesses: [
          'Custo: R$50-500k por projeto (inacessível para muitas médias empresas)',
          'Tempo: 2-6 meses para entrega do diagnóstico',
          'Snapshot: análise é foto de um momento, não monitoramento contínuo',
          'Saída: quando a consultoria vai embora, o processo para',
          'Subjetividade: dois consultores podem dar recomendações opostas',
          'Sem rastreabilidade: recomendações ficam em slides PowerPoint',
        ],
        our_advantage:
          'Financ.IA entrega diagnóstico contínuo (não snapshot) ' +
          'com custo 10-50x menor que consultoria. ' +
          'O plano de ação é calculado matematicamente, não baseado em opinião. ' +
          'E funciona 24/7 — não vai embora após 3 meses.',
        when_we_lose:
          'Quando a empresa precisa de transformação cultural ou organizacional, ' +
          'não apenas análise financeira. Consultoria traz mudança de gestão; ' +
          'Financ.IA traz visibilidade e decisão — são complementares.',
        battle_cry:
          'Consultoria te diz o que fazer uma vez por trimestre. ' +
          'Financ.IA te diz o que fazer todos os dias.',
      },

      // --- vs. ERPs (Totvs, SAP, Oracle) ---
      {
        competitor: 'Totvs Protheus / SAP / Oracle ERP',
        category: 'ERP com módulo financeiro',
        what_they_do:
          'Sistemas transacionais que registram movimentação financeira, ' +
          'contabilidade, fiscal e geram relatórios operacionais. ' +
          'Alguns têm módulos de FP&A como add-on.',
        their_strengths: [
          'Sistema de registro transacional completo (contabilidade, fiscal, etc.)',
          'Base instalada enorme (Totvs domina PMEs no Brasil)',
          'Integração nativa com folha, compras, vendas',
          'Compliance fiscal brasileiro nativo (SPED, NF-e)',
        ],
        their_weaknesses: [
          'Foco transacional, não analítico — registra, não analisa',
          'DRE gerencial precisa de customização cara (R$50-200k)',
          'Implementação de 3-12 meses (mesmo módulos financeiros)',
          'Rigidez: mudar relatório = projeto de consultoria',
          'Sem IA, sem scoring, sem otimização',
          'Relatórios engessados: não projetam tendências',
          'Consolidação multi-filial é configuração complexa',
        ],
        our_advantage:
          'ERP registra transações. Financ.IA transforma esses registros em decisões. ' +
          'Não substitui o ERP — se conecta a ele e entrega a camada analítica ' +
          'que o ERP não tem: scoring, projeção, otimização, IA narrativa.',
        when_we_lose:
          'Quando a empresa quer consolidar TUDO (financeiro + operacional + fiscal) ' +
          'em um único sistema. ERP faz sentido como backbone transacional. ' +
          'Financ.IA é a camada de inteligência sobre o ERP.',
        battle_cry:
          'Seu ERP registra o passado. Financ.IA projeta o futuro e diz como chegar lá.',
      },

      // --- vs. FP&A SaaS (Accountfy, Treasy, Adaptive) ---
      {
        competitor: 'Accountfy / Treasy / Adaptive Planning / Anaplan',
        category: 'SaaS de FP&A — Planejamento',
        what_they_do:
          'Plataformas SaaS especializadas em FP&A: consolidação de DRE, ' +
          'orçamento, planejamento financeiro e relatórios.',
        their_strengths: [
          'Especializadas em FP&A — funcionalidade profunda em planejamento',
          'Integração com ERPs populares (Totvs, SAP)',
          'Interface moderna vs. ERP legado',
          'Accountfy: forte em consolidação contábil e orçamento',
          'Adaptive/Anaplan: fortes em cenários e forecasting enterprise',
        ],
        their_weaknesses: [
          'Não têm scoring de saúde financeira por filial',
          'Não geram planos de ação otimizados automaticamente',
          'Não têm IA narrativa — relatórios são manuais',
          'Não detectam tendências de deterioração proativamente',
          'Foco em planejamento orçamentário, não em decisão operacional',
          'Sem audit trail de decisões (só de dados)',
          'Implementação ainda leva semanas (configuração de plano de contas)',
        ],
        our_advantage:
          'FP&A SaaS consolida e planeja. Financ.IA consolida, analisa, projeta ' +
          'e recomenda ações — a camada de decisão que falta no FP&A tradicional. ' +
          'Score + otimização + IA narrativa + audit trail = diferencial impossível de copiar rapidamente.',
        when_we_lose:
          'Empresa que precisa de orçamento colaborativo sofisticado ' +
          '(múltiplos departamentos fazendo bottom-up budget). ' +
          'Accountfy e Adaptive são fortes nisso; Financ.IA foca em análise e ação, não em planejamento detalhado.',
        battle_cry:
          'Planejar é importante. Decidir é urgente. ' +
          'Financ.IA está onde o plano encontra a realidade.',
      },

      // --- vs. LeverPro (concorrente direto mid-market BR) ---
      {
        competitor: 'LeverPro',
        category: 'SaaS de FP&A — Mid-market Brasil',
        what_they_do:
          'Plataforma brasileira de FP&A focada em consolidação, ' +
          'orçamento e relatórios gerenciais para médias empresas. ' +
          'Integra com ERPs brasileiros e oferece workflows de aprovação.',
        their_strengths: [
          'Focada no mercado brasileiro mid-market (mesmo target)',
          'Integração nativa com Totvs, SAP B1, Omie',
          'Consolidação contábil e gerencial',
          'Interface em português com suporte local',
          'Workflows de aprovação e colaboração',
        ],
        their_weaknesses: [
          'Sem scoring de saúde financeira por filial (0-100)',
          'Sem motor de otimização automática de cortes',
          'Sem IA narrativa para geração de relatórios executivos',
          'Sem projeção de tendências com detecção de deterioração',
          'Foco em planejamento e reporting, não em ação prescritiva',
          'Sem audit trail de decisões de negócio',
        ],
        our_advantage:
          'LeverPro faz o "antes" (consolidar e planejar). ' +
          'Financ.IA faz o "depois" (analisar, projetar, recomendar ação). ' +
          'Score + otimização + IA narrativa são camadas que LeverPro não oferece.',
        when_we_lose:
          'Quando a empresa precisa de orçamento bottom-up com múltiplos centros de custo ' +
          'e workflows de aprovação orçamentária. LeverPro é mais maduro nesse fluxo específico.',
        battle_cry:
          'LeverPro mostra onde você está. Financ.IA mostra para onde ir ' +
          'e calcula o caminho ótimo.',
      },
    ],

    // ================================================
    // 3. MATRIZ DE POSICIONAMENTO
    // ================================================
    positioning_matrix: {
      axes: {
        x: 'Profundidade analítica (dashboards → decisão automatizada)',
        y: 'Velocidade de implementação (meses → minutos)',
      },
      our_position: {
        x_value: 'Decisão automatizada (máxima)',
        y_value: 'Implementação em <1 hora (máxima)',
      },
      quadrants: [
        {
          name: 'Ferramentas lentas e superficiais',
          x_range: 'Baixa profundidade',
          y_range: 'Implementação lenta',
          competitors: ['SAP FP&A', 'Oracle EPM'],
          description:
            'ERPs que levam meses para implementar e entregam relatórios estáticos. ' +
            'Empresas grandes aceitam o trade-off; médias não podem.',
        },
        {
          name: 'Ferramentas rápidas mas superficiais',
          x_range: 'Baixa profundidade',
          y_range: 'Implementação rápida',
          competitors: ['Excel', 'Google Sheets', 'Omie/Conta Azul'],
          description:
            'Começam rápido mas não passam de consolidação e visualização. ' +
            'Sem inteligência, sem automação, sem ação.',
        },
        {
          name: 'Ferramentas profundas mas lentas',
          x_range: 'Alta profundidade',
          y_range: 'Implementação lenta',
          competitors: ['Adaptive Planning', 'Accountfy', 'LeverPro', 'Power BI + consultoria'],
          description:
            'Entregam análise sofisticada após semanas/meses de setup. ' +
            'Bom para enterprise com equipe dedicada.',
        },
        {
          name: 'Profundo E rápido (nosso quadrante)',
          x_range: 'Alta profundidade',
          y_range: 'Implementação rápida',
          competitors: ['Financ.IA'],
          description:
            'Análise profunda (scoring + otimização + IA) com implementação em <1 hora. ' +
            'Único player neste quadrante para FP&A de médias empresas no Brasil.',
        },
      ],
    },

    // ================================================
    // 4. BATTLE CARDS (cenários de venda)
    // ================================================
    battle_cards: [
      {
        scenario: 'Cliente usa Excel e está satisfeito',
        competitor: 'Excel',
        their_pitch: '"Excel faz tudo que preciso e é gratuito"',
        our_counter:
          'Excel faz tudo — inclusive consumir 15 dias do seu mês. ' +
          'Quanto vale o tempo do seu controller? ' +
          'E a última vez que uma fórmula quebrada levou a uma decisão errada?',
        killer_question:
          'Quantos dias por mês sua equipe financeira gasta consolidando dados ' +
          'antes de começar a analisar? E se esse tempo caísse para zero?',
        proof_point:
          'No caso validado (grupo educacional, 10+ filiais), consolidação passou de ~15 dias para <1 hora. ' +
          'Projeção linear de 3 meses permite detecção antecipada de tendências de deterioração — ' +
          'janela de reação significativamente maior vs. relatórios mensais retrospectivos.',
      },
      {
        scenario: 'Cliente já tem Power BI implantado',
        competitor: 'Power BI',
        their_pitch: '"Já temos Power BI e vemos tudo no dashboard"',
        our_counter:
          'Power BI mostra que o EBITDA caiu 8% na Filial X. ' +
          'Financ.IA mostra que o EBITDA caiu 8%, projeta que cairá mais 12% ' +
          'nos próximos 3 meses, e recomenda cortar R$50k em custos fixos ' +
          'na categoria Y — com impacto projetado de +6 pontos no score.',
        killer_question:
          'Seu Power BI diz o que aconteceu. ' +
          'Ele diz o que vai acontecer e o que fazer?',
        proof_point:
          'Financ.IA não substitui Power BI — complementa. ' +
          'Funciona como a camada de decisão que senta em cima dos dashboards.',
      },
      {
        scenario: 'Cliente contratou consultoria recentemente',
        competitor: 'Consultoria',
        their_pitch: '"Contratamos a Falconi e eles estão fazendo o diagnóstico"',
        our_counter:
          'A Falconi vai entregar um diagnóstico excelente — daqui a 3 meses. ' +
          'E quando forem embora, quem vai continuar monitorando? ' +
          'Financ.IA é o diagnóstico contínuo, todos os dias, sem depender de consultor.',
        killer_question:
          'O que acontece quando a consultoria termina o projeto?',
        proof_point:
          'Financ.IA e consultoria são complementares. ' +
          'A consultoria define a estratégia; Financ.IA monitora a execução 24/7.',
      },
      {
        scenario: 'Cliente avaliando ERP novo (Totvs/SAP)',
        competitor: 'Totvs / SAP',
        their_pitch: '"Vamos trocar o ERP e o módulo financeiro resolve tudo"',
        our_counter:
          'Trocar ERP é projeto de 6-12 meses e R$500k+. ' +
          'O módulo financeiro do ERP registra transações — não analisa, não projeta, não otimiza. ' +
          'Financ.IA conecta com qualquer ERP (inclusive o atual) ' +
          'e entrega a camada de inteligência que o ERP não tem.',
        killer_question:
          'Vocês precisam de um sistema transacional melhor ' +
          'ou de inteligência para tomar decisões com os dados que já têm?',
        proof_point:
          'Financ.IA funciona com qualquer ERP via upload de DRE. ' +
          'Primeira análise em <1 hora, sem projeto de implantação.',
      },
      {
        scenario: 'Cliente pergunta sobre preço',
        competitor: 'Objeção de custo',
        their_pitch: '"Quanto custa? Parece caro para uma ferramenta financeira"',
        our_counter:
          'Starter a partir de R$1.490/mês — menos que o custo de 2 dias ' +
          'do controller em Excel. ROI no primeiro mês se economizar 3 dias ' +
          'de trabalho manual. Consultoria equivalente custa R$50-500k por projeto.',
        killer_question:
          'Quanto custa hoje o tempo que sua equipe gasta consolidando dados manualmente? ' +
          'E quanto custa uma decisão tomada com dados atrasados?',
        proof_point:
          'A partir de R$1.490/mês (Starter, 5 filiais). Pro R$3.990 para operações maiores. ' +
          'Fração do custo de um analista FP&A junior (R$5-8k/mês). ' +
          'Desconto de 20% no plano anual.',
      },
      {
        scenario: 'Cliente avaliando Accountfy ou similar',
        competitor: 'Accountfy',
        their_pitch: '"Accountfy faz consolidação e orçamento"',
        our_counter:
          'Accountfy é excelente para consolidação contábil e orçamento colaborativo. ' +
          'Mas não calcula score de saúde por filial, não gera plano de ação otimizado, ' +
          'não projeta tendências e não tem IA narrativa. ' +
          'Financ.IA é a camada de decisão que falta.',
        killer_question:
          'Além de consolidar e orçar, você precisa saber ' +
          'quais filiais estão em risco e o que fazer a respeito?',
        proof_point:
          'Score de saúde 0-100 por filial com breakdown de penalidades. ' +
          'Plano de corte otimizado com restrições. ' +
          'Relatório executivo gerado por IA em 2 minutos.',
      },
    ],

    // ================================================
    // 5. FRAMEWORK DE MENSAGENS POR PERSONA
    // ================================================
    messaging_framework: {
      for_cfo: {
        persona: 'CFO / Diretor Financeiro',
        pain:
          'Precisa tomar decisões de corte e alocação, ' +
          'mas não tem visibilidade do impacto antes de agir. ' +
          'Dados chegam com 2-3 semanas de atraso.',
        promise:
          'Score de saúde por filial atualizado continuamente, ' +
          'projeção de tendências e plano de ação calculado automaticamente. ' +
          'Saiba exatamente onde cortar e quanto — antes de decidir.',
        proof:
          'Motor de otimização calcula plano ótimo respeitando suas restrições. ' +
          '171 testes automatizados garantem resultados reproduzíveis. ' +
          'A partir de R$1.490/mês — fração do custo de um analista FP&A junior.',
        cta:
          'Agende uma demo de 30 minutos e veja o score real da sua operação — sem compromisso.',
      },
      for_controller: {
        persona: 'Controller / Gerente de FP&A',
        pain:
          'Passa 15-20 dias por mês consolidando DRE em Excel. ' +
          'Dados inconsistentes entre áreas. ' +
          'Não sobra tempo para análise — só para compilação.',
        promise:
          'DRE consolidado automaticamente de qualquer ERP. ' +
          'Libere 15 dias por mês para análise de verdade, não para copiar dados.',
        proof:
          'Upload → mapeamento guiado → DRE completo em <1 hora. ' +
          'Health Score, alertas e relatório de IA automáticos.',
        cta:
          'Envie seu DRE e receba a consolidação automática com score de saúde — ' +
          'sem compromisso, sem cartão de crédito.',
      },
      for_ceo: {
        persona: 'CEO / Conselheiro',
        pain:
          'Recebe relatórios estáticos via PowerPoint com semanas de atraso. ' +
          'Não consegue comparar filiais nem detectar deterioração a tempo.',
        promise:
          'Dashboard CEO com ranking de filiais por saúde financeira, ' +
          'tendências preditivas e ações recomendadas. ' +
          'Visão consolidada atualizada continuamente.',
        proof:
          'Projeção de score, margem e EBITDA para os próximos 3 meses. ' +
          'Alertas automáticos quando uma filial entra em zona de risco.',
        cta:
          'Peça ao seu CFO um piloto de 30 dias — em 1 hora vocês terão ' +
          'o ranking de saúde de todas as filiais.',
      },
      for_consultant: {
        persona: 'Consultor / Assessor Financeiro',
        pain:
          'Atende múltiplos clientes com Excel personalizado para cada um. ' +
          'Não escala. Diagnósticos demoram semanas. ' +
          'Difícil demonstrar valor contínuo após o projeto inicial.',
        promise:
          'Diagnóstico automatizado que acelera suas análises de semanas para minutos. ' +
          'Valor contínuo: monitoramento permanente, não snapshot trimestral. ' +
          'Roadmap: plataforma multi-tenant para consultores atenderem múltiplos clientes.',
        proof:
          'Hoje: motor analítico completo (score, otimização, IA) que o consultor usa internamente. ' +
          'Relatório executivo gerado por IA — pronto para apresentar ao board do cliente. ' +
          'Em desenvolvimento: isolamento multi-tenant para gestão independente por cliente.',
        cta:
          'Use Financ.IA como seu motor analítico e escale seu negócio de consultoria.',
      },
    },
  };
}

// ============================================
// Executive Narrative — Narrativa Executiva
// Posicionamento estratégico pessoal
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface ExecutiveNarrative {
  title: string;
  version: string;
  generated_at: string;
  strategic_questions: StrategicQuestions;
  versions: NarrativeVersions;
}

export interface StrategicQuestions {
  problem_solved: StrategicAnswer;
  business_transformation: StrategicAnswer;
  competitive_advantage: StrategicAnswer;
  economic_impact: StrategicAnswer;
  innovation_case: StrategicAnswer;
}

export interface StrategicAnswer {
  question: string;
  headline: string;
  narrative: string;
  proof_points: string[];
}

export interface NarrativeVersions {
  three_minute_pitch: ThreeMinutePitch;
  linkedin_version: LinkedInVersion;
  executive_interview: ExecutiveInterview;
}

export interface ThreeMinutePitch {
  duration: string;
  opening_hook: string;
  problem_block: string;
  solution_block: string;
  results_block: string;
  closing_statement: string;
}

export interface LinkedInVersion {
  headline: string;
  about_section: string;
  featured_post: FeaturedPost;
}

export interface FeaturedPost {
  title: string;
  body: string;
  hashtags: string[];
}

export interface ExecutiveInterview {
  positioning_statement: string;
  key_questions_and_answers: InterviewQA[];
  closing_pitch: string;
}

export interface InterviewQA {
  question: string;
  answer: string;
  subtext: string;
}

// --------------------------------------------
// Executive Narrative Generator
// --------------------------------------------

/**
 * Gera a narrativa executiva para posicionamento pessoal.
 * Função pura — zero I/O.
 */
export function generateExecutiveNarrative(): ExecutiveNarrative {
  return {
    title: 'Narrativa Executiva — Posicionamento Estratégico',
    version: '1.0',
    generated_at: new Date().toISOString(),

    // ================================================
    // 5 PERGUNTAS ESTRATÉGICAS
    // ================================================
    strategic_questions: {

      // ------------------------------------------------
      // 1. QUAL PROBLEMA ESTRATÉGICO FOI RESOLVIDO?
      // ------------------------------------------------
      problem_solved: {
        question: 'Qual problema estratégico foi resolvido?',

        headline:
          'Transformei a gestão financeira de um grupo educacional de R$300M+ ' +
          'de um processo manual de 15 dias para uma plataforma de decisão automatizada em tempo real.',

        narrative:
          'Grupos educacionais com múltiplas unidades enfrentam um problema estrutural: ' +
          'consolidam o DRE de 10+ filiais manualmente em planilhas, gastando 15-20 dias por mês ' +
          'apenas compilando dados antes de poder analisar qualquer coisa. ' +
          'Quando a análise chega, os dados já têm 2-3 semanas de atraso. ' +
          'Decisões de corte de custo, realocação de receita e intervenção em filiais problemáticas ' +
          'são tomadas no escuro — baseadas em intuição e planilhas desatualizadas, ' +
          'sem simulação de impacto e sem rastreabilidade. ' +
          'Eu não resolvi um problema de TI. Resolvi um problema de governança financeira. ' +
          'A empresa não tinha visibilidade do presente, não conseguia projetar o futuro ' +
          'e não sabia quantificar o impacto das decisões antes de tomá-las.',

        proof_points: [
          'Consolidação de DRE de 10+ filiais automatizada — de 15 dias para minutos',
          'Antes: decisões financeiras baseadas em dados com 2-3 semanas de atraso',
          'Depois: score de saúde por filial disponível com alertas automáticos',
          'Problema recorrente em médias empresas multi-filial no Brasil (educação, saúde, varejo) — consolidação manual é a norma, não a exceção',
        ],
      },

      // ------------------------------------------------
      // 2. O QUE MUDOU NA EMPRESA APÓS IMPLEMENTAÇÃO?
      // ------------------------------------------------
      business_transformation: {
        question: 'O que mudou na empresa após implementação?',

        headline:
          'A empresa passou de gestão financeira reativa para preditiva — ' +
          'com cada filial tendo um score de saúde, projeção de tendências ' +
          'e plano de ação calculado automaticamente.',

        narrative:
          'Antes da plataforma, o processo era: controller exporta dados do ERP, ' +
          'consolida em Excel por filial e marca, cria relatórios estáticos, ' +
          'envia por e-mail para diretoria, que agenda reunião para discutir. ' +
          'Semanas depois, decide-se algo — sem simulação de impacto. ' +
          'A plataforma inclui um módulo de Health Score por filial (0 a 100) ' +
          'com breakdown de penalidades e alertas automáticos de deterioração. ' +
          'Um motor de otimização calcula onde cortar e quanto, ' +
          'respeitando restrições reais do negócio (áreas protegidas, margem mínima). ' +
          'Uma equipe de IA especializada analisa o DRE e gera relatório executivo ' +
          'pronto para board em 2 minutos. ' +
          'A transformação não foi técnica — foi organizacional. ' +
          'O financeiro passou de compilador de dados para analista estratégico. ' +
          'A diretoria passou de leitora de PowerPoints atrasados para decisora com dados atualizados.',

        proof_points: [
          'Módulo de Health Score 0-100 por filial com classificação automática (Saudável/Atenção/Crítico)',
          'Motor de projeção de tendências para 3 meses com detecção de deterioração',
          'Otimização automática com restrições — calcula onde cortar e quanto',
          'Relatório executivo gerado por IA especializada em 2 minutos',
          'Audit trail imutável — cada decisão registrada com input/output e justificativa',
          'Controller liberou ~10 dias/mês de trabalho manual para análise estratégica',
        ],
      },

      // ------------------------------------------------
      // 3. QUAL DIFERENCIAL COMPETITIVO ISSO CRIOU?
      // ------------------------------------------------
      competitive_advantage: {
        question: 'Qual diferencial competitivo isso criou?',

        headline:
          'Criei um ativo tecnológico proprietário que posiciona a empresa em um quadrante ' +
          'vazio do mercado: análise profunda com implementação rápida — ' +
          'onde nenhum concorrente brasileiro atua.',

        narrative:
          'O mercado de FP&A no Brasil se divide em dois extremos. ' +
          'De um lado, ferramentas rápidas mas superficiais (Excel, planilhas) — ' +
          'começam em minutos mas não passam de consolidação. ' +
          'Do outro, ferramentas profundas mas lentas (SAP, Totvs, Adaptive Planning) — ' +
          'entregam análise sofisticada após meses de implementação. ' +
          'O que construí ocupa o quadrante "profundo E rápido": ' +
          'scoring de saúde, otimização automática, projeção de tendências ' +
          'e IA narrativa — com primeira análise em menos de 1 hora. ' +
          'O motor de cálculo é determinístico: mesmos dados sempre geram o mesmo resultado. ' +
          'Isso é impossível com IA generativa pura (ChatGPT, Copilot) e inexistente ' +
          'em ferramentas de BI (Power BI, Tableau). ' +
          'Este ativo é um moat técnico: 185 testes automatizados no core, ' +
          'arquitetura limpa (lógica pura separada de infraestrutura), ' +
          'e governança formal — não se replica em semanas.',

        proof_points: [
          'Motor determinístico: 185 testes automatizados, resultados reproduzíveis e auditáveis',
          'Performance: 1000 cálculos de score em <50ms — resposta instantânea',
          '8 suites de testes (modelo financeiro, score, forecast, otimização, schedule, logger, performance, segurança)',
          'Posicionamento único: nenhum concorrente brasileiro combina scoring + otimização + IA + audit trail',
          'Validado em produção com dados financeiros reais (não é protótipo)',
          'Arquitetura multi-tenant desenhada como roadmap de escala (schema de 19 tabelas com RLS projetado)',
        ],
      },

      // ------------------------------------------------
      // 4. QUAL ECONOMIA/GANHO FOI GERADO?
      // ------------------------------------------------
      economic_impact: {
        question: 'Qual economia/ganho foi gerado?',

        headline:
          'O impacto econômico opera em 3 camadas: economia direta de tempo, ' +
          'melhoria de decisão e criação de ativo comercializável.',

        narrative:
          'Camada 1 — Economia de tempo: o controller gastava 15-20 dias por mês ' +
          'consolidando dados. Agora esse tempo caiu para menos de 1 hora. ' +
          'Isso libera ~10 dias úteis/mês de trabalho qualificado ' +
          'para análise estratégica em vez de compilação manual. ' +
          'Em custo de profissional FP&A (R$15-25k/mês), ' +
          'são R$7-12k/mês de capacidade redirecionada para atividades de maior valor. ' +
          'Camada 2 — Melhoria de decisão: com score por filial, projeção de tendências ' +
          'e plano de ação otimizado, decisões de corte e alocação são tomadas ' +
          'com base quantitativa, não em intuição. ' +
          'O gap de informação de 2-3 semanas comprovadamente atrasa decisões de corte e alocação, ' +
          'gerando perda de margem por inação. ' +
          'Com dados atualizados, a capacidade de intervenção rápida ' +
          'se torna um diferencial direto na preservação de resultado. ' +
          'Camada 3 — Ativo comercializável: o que foi construído não é uma ferramenta interna. ' +
          'É uma plataforma SaaS pronta para comercialização. ' +
          'Ativo com potencial de comercialização — pricing modelado, ' +
          'unit economics projetados, arquitetura de escala desenhada.',

        proof_points: [
          'Economia de tempo: ~10 dias/mês de controller liberados para análise estratégica',
          'Custo redirecionado: R$7-12k/mês de capacidade profissional',
          'Decisões com dados atualizados: eliminação do gap de 15 dias',
          'Ativo comercializável: pricing definido (R$1.490-9.990/mês), unit economics modelados',
          'Mercado endereçável: ~5.000 médias empresas multi-filial no Brasil',
          'Potencial ARR: R$2.4-6M/ano com 50 clientes (Starter+Pro+Enterprise)',
        ],
      },

      // ------------------------------------------------
      // 5. POR QUE ISSO É INOVAÇÃO?
      // ------------------------------------------------
      innovation_case: {
        question: 'Por que isso é inovação?',

        headline:
          'É inovação porque combina três capacidades que não existem juntas ' +
          'em nenhum produto brasileiro de FP&A: determinismo quantitativo, ' +
          'otimização automática e inteligência artificial narrativa.',

        narrative:
          'A inovação não está em cada peça isolada — está na combinação. ' +
          'Existem ferramentas que consolidam DRE (Accountfy, LeverPro). ' +
          'Existem ferramentas que fazem dashboards (Power BI, Tableau). ' +
          'Existem IAs que geram texto (ChatGPT, Copilot). ' +
          'O que não existe é uma plataforma que: ' +
          '(1) consolida automaticamente, ' +
          '(2) calcula um score de saúde determinístico e auditável, ' +
          '(3) projeta tendências com detecção de deterioração, ' +
          '(4) gera plano de ação otimizado com restrições matemáticas, ' +
          '(5) produz relatório executivo por IA especializada, ' +
          'e (6) registra cada decisão em audit trail imutável. ' +
          'Tudo isso com motor puro — zero dependência de I/O no cálculo, ' +
          'resultados reproduzíveis, testados em 185 testes automatizados (8 suites). ' +
          'É Decision Intelligence aplicada a FP&A. ' +
          'O conceito existe na academia e em grandes consultorias (McKinsey, Gartner), ' +
          'mas não existe como produto acessível para o mid-market brasileiro. ' +
          'Até agora.',

        proof_points: [
          'Decision Intelligence: conceito Gartner Top Trend — aplicado como produto real',
          'Motor determinístico puro (zero I/O no core) — único no mercado brasileiro de FP&A',
          'Otimização com restrições: calcula plano ótimo respeitando limites reais do negócio',
          'IA narrativa com pipeline multi-etapa (planejamento → análise → consolidação), executada por agentes especializados via prompts dedicados',
          'Audit trail imutável: governance-ready para compliance e conselhos',
          '185 testes automatizados (8 suites): nível de maturidade enterprise em produto de 1 desenvolvedor',
          'Arquitetura limpa: core (cálculo puro) | api (adaptadores) | governance (docs) — separação total',
        ],
      },
    },

    // ================================================
    // VERSÕES DA NARRATIVA
    // ================================================
    versions: {

      // ------------------------------------------------
      // VERSÃO 1: PITCH DE 3 MINUTOS
      // ------------------------------------------------
      three_minute_pitch: {
        duration: '3 minutos (~400 palavras faladas)',

        opening_hook:
          'Imagine que você é CFO de um grupo com 10 escolas. ' +
          'Todo mês, seu controller gasta 15 dias copiando dados entre planilhas. ' +
          'Quando o relatório fica pronto, os dados já têm 3 semanas de atraso. ' +
          'Você toma decisões de milhões no escuro. ' +
          'Eu resolvi esse problema.',

        problem_block:
          'Empresas com múltiplas filiais vivem um paradoxo: ' +
          'têm dados financeiros demais e visibilidade de menos. ' +
          'Gastam semanas consolidando DRE para descobrir que uma filial ' +
          'já estava em deterioração há 2 meses — quando já é tarde. ' +
          'Planos de ação são baseados em feeling: ' +
          '"vamos cortar 10% aqui e ver o que acontece." ' +
          'Sem simulação, sem projeção, sem rastreabilidade.',

        solution_block:
          'Construí uma plataforma de inteligência financeira que resolve isso ' +
          'em três camadas. ' +
          'Primeira: consolida o DRE automaticamente de qualquer ERP. ' +
          'Segunda: calcula um score de saúde de 0 a 100 para cada filial, ' +
          'com alertas automáticos e projeção de tendências para 3 meses. ' +
          'Terceira: gera planos de ação otimizados — o sistema calcula exatamente ' +
          'onde cortar e quanto, respeitando as restrições do negócio. ' +
          'Tudo com motor determinístico — mesmos dados, mesmo resultado, sempre. ' +
          'Auditável, reproduzível, pronto para compliance.',

        results_block:
          'O resultado na prática: consolidação que levava 15 dias agora leva minutos. ' +
          'O controller saiu de compilador de dados para analista estratégico. ' +
          'O CEO vê ranking de filiais por saúde financeira em tempo real. ' +
          'E cada decisão fica registrada em audit trail imutável. ' +
          'A plataforma roda em produção com dados reais de um grupo de R$300M+ de receita. ' +
          'Não é protótipo — é ferramenta de trabalho diária.',

        closing_statement:
          'O que começou como solução interna virou um ativo comercializável. ' +
          'Pricing definido, unit economics modelados, arquitetura multi-tenant desenhada. ' +
          'É Decision Intelligence aplicada a FP&A — ' +
          'um conceito que Gartner classifica como top trend, ' +
          'mas que ninguém oferece como produto acessível no Brasil. Até agora.',
      },

      // ------------------------------------------------
      // VERSÃO 2: LINKEDIN
      // ------------------------------------------------
      linkedin_version: {
        headline:
          'Decision Intelligence | FP&A | Plataforma de inteligência financeira — dados → decisões quantificadas',

        about_section:
          'Profissional financeiro que une visão estratégica e execução técnica. ' +
          'Nos últimos anos, identifiquei um problema recorrente: ' +
          'empresas com múltiplas filiais gastam semanas consolidando dados financeiros ' +
          'e tomam decisões sem simulação de impacto. ' +
          '\n\n' +
          'Em vez de aceitar o status quo, construí a solução: ' +
          'uma plataforma de Decision Intelligence que consolida DRE automaticamente, ' +
          'calcula score de saúde por filial, projeta tendências, ' +
          'otimiza planos de ação e gera relatórios executivos com IA. ' +
          '\n\n' +
          'O motor de cálculo é determinístico — mesmos dados, mesmo resultado, sempre. ' +
          'Auditável, reproduzível, com 185 testes automatizados. ' +
          'Validado em produção com dados reais de grupo educacional de R$300M+. ' +
          '\n\n' +
          'O que me diferencia: não sou apenas o profissional que analisa números. ' +
          'Sou quem constrói o sistema que analisa, projeta e recomenda — ' +
          'transformando gestão financeira reativa em decisão preditiva e quantificada.',

        featured_post: {
          title: 'Por que construí uma plataforma de Decision Intelligence para FP&A',
          body:
            'Todo mês, a mesma cena se repete em médias empresas brasileiras:\n\n' +
            'O controller gasta 15 dias copiando dados entre planilhas.\n' +
            'O CFO recebe um relatório estático por e-mail.\n' +
            'A diretoria se reúne para decidir... com dados de 3 semanas atrás.\n\n' +
            'Eu vivia isso. E decidi resolver.\n\n' +
            'Construí um motor de cálculo que:\n\n' +
            '1. Consolida o DRE de todas as filiais automaticamente\n' +
            '2. Calcula um score de saúde financeira de 0-100 por unidade\n' +
            '3. Projeta tendências para os próximos 3 meses\n' +
            '4. Gera planos de ação otimizados (onde cortar e quanto)\n' +
            '5. Produz relatório executivo com IA especializada\n\n' +
            'O diferencial? O motor é determinístico.\n' +
            'Mesmos dados = mesmo resultado. Sempre. Auditável. Reproduzível.\n\n' +
            'Não é ChatGPT gerando opinião diferente a cada prompt.\n' +
            'É cálculo quantitativo com 185 testes automatizados.\n\n' +
            'Resultado na prática:\n' +
            '- 15 dias de consolidação → minutos\n' +
            '- Decisões com dados atualizados (não de 3 semanas atrás)\n' +
            '- Score por filial com alertas automáticos de deterioração\n' +
            '- Plano de ação calculado, não baseado em feeling\n\n' +
            'Validado em produção com grupo educacional de R$300M+ de receita.\n\n' +
            'Gartner chama isso de Decision Intelligence.\n' +
            'Eu chamo de "parar de tomar decisões de milhões no escuro."\n\n' +
            'Se você gasta mais de 5 dias por mês consolidando DRE,\n' +
            'vamos conversar.',
          hashtags: [
            '#DecisionIntelligence',
            '#FPA',
            '#FinançasCorporativas',
            '#TransformaçãoDigital',
            '#GestãoFinanceira',
            '#Inovação',
          ],
        },
      },

      // ------------------------------------------------
      // VERSÃO 3: ENTREVISTA EXECUTIVA
      // ------------------------------------------------
      executive_interview: {
        positioning_statement:
          'Sou um profissional que une visão financeira estratégica com capacidade ' +
          'de execução técnica. Identifiquei um gap crítico na gestão financeira ' +
          'de empresas multi-filial e construí a solução: uma plataforma de Decision Intelligence ' +
          'que transforma dados financeiros em decisões quantificadas, ' +
          'auditáveis e otimizadas. Validada em produção com grupo de R$300M+ de receita.',

        key_questions_and_answers: [
          {
            question: 'Qual foi seu maior projeto e qual resultado ele gerou?',
            answer:
              'Construí uma plataforma de inteligência financeira completa para um grupo educacional ' +
              'com 10+ unidades e R$300M+ de receita. ' +
              'O sistema consolida o DRE automaticamente, calcula score de saúde por filial, ' +
              'projeta tendências e gera planos de ação otimizados. ' +
              'O resultado direto: a equipe financeira recuperou 10 dias úteis por mês ' +
              'que antes eram gastos em consolidação manual. ' +
              'O resultado estratégico: a empresa passou de gestão reativa para preditiva — ' +
              'detectando deterioração em filiais com antecedência e agindo com dados, não intuição.',
            subtext:
              'Mostra: escala (R$300M+), impacto mensurável (10 dias/mês), ' +
              'sofisticação (scoring + forecast + otimização), resultado de negócio (reativo → preditivo)',
          },
          {
            question: 'O que te diferencia de outros profissionais financeiros?',
            answer:
              'A maioria dos profissionais financeiros é consumidora de ferramentas. ' +
              'Eu sou criador de ferramentas. ' +
              'Não uso Power BI para fazer dashboards — construí um motor de cálculo ' +
              'que calcula, projeta, simula e recomenda ações. ' +
              'Com 185 testes automatizados, arquitetura enterprise-grade ' +
              'e governança formal de decisões. ' +
              'Essa combinação — entender profundamente finanças e saber construir tecnologia — ' +
              'é o que me posiciona de forma única.',
            subtext:
              'Mostra: raro skill híbrido (finanças + tech), proatividade (criou vs. usou), ' +
              'maturidade técnica (testes, arquitetura, governança)',
          },
          {
            question: 'Como você aborda a tomada de decisão?',
            answer:
              'Com dados quantificados e cenários simulados. ' +
              'Construí um sistema onde cada decisão financeira tem: ' +
              'um score que quantifica o estado atual, ' +
              'uma projeção que mostra para onde estamos indo, ' +
              'um conjunto de opções otimizadas com impacto projetado, ' +
              'e um registro imutável de quem decidiu o quê e por quê. ' +
              'Decisão sem simulação de impacto não é decisão — é aposta.',
            subtext:
              'Mostra: pensamento estruturado, bias para dados, ' +
              'sofisticação (scoring, forecast, otimização, audit trail)',
          },
          {
            question: 'Onde você se vê agregando valor em uma nova posição?',
            answer:
              'Em qualquer organização que tenha múltiplas unidades e precise ' +
              'transformar dados financeiros em decisões de qualidade — ' +
              'com velocidade, precisão e rastreabilidade. ' +
              'Posso tanto liderar a operação financeira ' +
              'quanto construir a infraestrutura de decisão que a suporta. ' +
              'Meu diferencial é que não preciso escolher entre ser o executivo ' +
              'que define a estratégia e o arquiteto que constrói o sistema. Faço os dois.',
            subtext:
              'Mostra: versatilidade, clareza de proposta de valor, ' +
              'posicionamento como "força multiplicadora" (não só executa, constrói o sistema)',
          },
          {
            question: 'Qual é sua visão sobre o futuro de FP&A?',
            answer:
              'FP&A está migrando de "compilação de relatórios" para "inteligência de decisão". ' +
              'O controller do futuro não vai gastar 15 dias em Excel. ' +
              'Vai operar uma plataforma que consolida automaticamente, ' +
              'detecta problemas proativamente e recomenda ações quantificadas. ' +
              'Quem já construiu essa plataforma e sabe operá-la ' +
              'está posicionado para liderar essa transição. ' +
              'Eu já construí. Já opero. E já validei em produção.',
            subtext:
              'Mostra: visão de futuro, tendência de mercado (FP&A 2.0), ' +
              'credibilidade (já fez, não só fala)',
          },
        ],

        closing_pitch:
          'Em resumo: sou um profissional que identificou um problema real ' +
          'na gestão financeira de médias empresas, construiu a solução do zero, ' +
          'validou em produção com dados de R$300M+, ' +
          'e estruturou como produto comercializável. ' +
          'O sistema tem 185 testes automatizados, arquitetura enterprise-grade ' +
          'e posicionamento em um quadrante de mercado vazio no Brasil. ' +
          'Trago tanto a competência financeira para tomar as decisões certas ' +
          'quanto a capacidade técnica para construir os sistemas que suportam essas decisões.',
      },
    },
  };
}

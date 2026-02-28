// ============================================
// Executive Decision Intelligence Framework
// Documento institucional consolidado
// Raiz Educação S.A. — Versão 1.0
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Framework Types
// --------------------------------------------

export interface FrameworkSection {
  number: number;
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

export interface ExecutiveFramework {
  title: string;
  version: string;
  organization: string;
  effective_date: string;
  approved_by: string;
  classification: 'Confidencial — Uso Interno';
  sections: FrameworkSection[];
}

// --------------------------------------------
// Framework Generator
// --------------------------------------------

/**
 * Gera o Executive Decision Intelligence Framework completo.
 * Documento institucional de 7 seções para formalização da plataforma.
 * Função pura — zero I/O.
 */
export function generateExecutiveFramework(): ExecutiveFramework {
  return {
    title: 'Executive Decision Intelligence Framework',
    version: '1.0',
    organization: 'Raiz Educação S.A.',
    effective_date: '2026-03-01',
    approved_by: 'Diretoria Executiva',
    classification: 'Confidencial — Uso Interno',
    sections: [
      buildArchitectureSection(),
      buildMathEngineSection(),
      buildAlertsSection(),
      buildDashboardSection(),
      buildGovernanceSection(),
      buildRitualSection(),
      buildPolicySection(),
    ],
  };
}

// ============================================
// SEÇÃO 1 — ARQUITETURA
// ============================================

function buildArchitectureSection(): FrameworkSection {
  return {
    number: 1,
    title: 'Arquitetura da Plataforma',
    content:
      'O Decision Intelligence Platform é uma plataforma de apoio à decisão financeira composta por quatro camadas isoladas, cada uma com responsabilidade específica e sem acoplamento direto entre elas.',
    subsections: [
      {
        title: '1.1 Camada Core (Motor de Decisão)',
        content:
          'Funções puras — sem acesso a banco de dados, sem efeitos colaterais, sem dependências externas. ' +
          'Contém: scoreModel (cálculo do Health Score), forecastModel (projeção de tendências), ' +
          'optimizationEngine (motor de otimização por grid search), scheduleEngine (motor de agendamentos), ' +
          'financialModel (extração de métricas) e DecisionEngine (fachada de orquestração). ' +
          'Todo cálculo financeiro e matemático reside exclusivamente nesta camada. ' +
          'Testável unitariamente sem mocking. Determinístico: mesmo input sempre gera mesmo output.',
      },
      {
        title: '1.2 Camada Executive (Consolidação)',
        content:
          'Funções puras que consolidam os outputs do Core em formatos institucionais. ' +
          'Contém: executiveSummaryBuilder (consolida score, forecast, otimização e alertas em resumo executivo), ' +
          'ceoReportBuilder (relatório de 6 seções para board/diretoria), ' +
          'monthly_decision_ritual (estrutura do rito mensal e geração de deck de apresentação), ' +
          'kpi_definition (formalização do Health Score como KPI oficial). ' +
          'Nenhum cálculo novo — apenas composição e formatação de dados já processados pelo Core.',
      },
      {
        title: '1.3 Camada API (Adaptadores)',
        content:
          'Endpoints Vercel serverless que fazem a ponte entre o mundo externo (requisições HTTP, banco de dados) ' +
          'e as camadas puras. Responsabilidades: ler dados do Supabase, chamar funções do Core, persistir resultados, ' +
          'disparar pipeline de agentes IA. Toda operação de I/O acontece exclusivamente aqui. ' +
          'Padrão fire-and-forget para chain-calling entre steps do pipeline. ' +
          'Logging estruturado via core/logger.ts com sink Supabase para persistência.',
      },
      {
        title: '1.4 Camada UI (Visualização)',
        content:
          'Componentes React que consomem dados das APIs e os renderizam. ' +
          'Zero cálculo financeiro — todo número exibido vem pré-computado do backend. ' +
          'CEO Dashboard como view principal para diretoria (acesso restrito a administradores). ' +
          'Padrão de lazy loading para performance. Design system com tokens CSS consistentes.',
      },
      {
        title: '1.5 Princípio Arquitetural',
        content:
          'A separação em 4 camadas garante que: (a) a lógica de decisão é testável e auditável independentemente, ' +
          '(b) mudanças na UI não afetam cálculos, (c) mudanças nos pesos do modelo não requerem deploy de frontend, ' +
          '(d) o motor de decisão pode ser reutilizado em outros produtos sem alteração. ' +
          'Este princípio é classificado como IMUTÁVEL pela Política Oficial (IMM-04).',
      },
    ],
  };
}

// ============================================
// SEÇÃO 2 — MOTOR MATEMÁTICO
// ============================================

function buildMathEngineSection(): FrameworkSection {
  return {
    number: 2,
    title: 'Motor Matemático',
    content:
      'O motor matemático é composto por quatro módulos puros que, em conjunto, ' +
      'transformam dados financeiros brutos em métricas acionáveis, projeções e recomendações de otimização.',
    subsections: [
      {
        title: '2.1 Health Score (scoreModel)',
        content:
          'Métrica oficial da empresa: Decision Health Score (DHS-001). ' +
          'Fórmula: DHS = 100 - P_conf - P_marg - P_ebitda - P_prio - P_agentes. ' +
          'Cinco componentes de penalidade: ' +
          '(1) Confiança — se confidence < 80, penaliza (80 - confidence) × 0.5; ' +
          '(2) Margem — se margem real < orçado, penaliza diferença × 2; ' +
          '(3) EBITDA — se EBITDA real < ano anterior, penaliza 5 pontos fixos; ' +
          '(4) Prioridades — se recomendações high-priority > 3, penaliza 5 pontos fixos; ' +
          '(5) Conflitos — se há conflitos entre agentes, penaliza 3 pontos fixos. ' +
          'Classificação: >= 85 = Saudável, 70-84 = Atenção, < 70 = Crítico. ' +
          'Range: 0-100. Pesos configuráveis via tabela decision_models.',
      },
      {
        title: '2.2 Forecast (forecastModel)',
        content:
          'Projeção de score, EBITDA e margem para os próximos 3 ciclos via regressão linear. ' +
          'Calcula slope (inclinação) para detectar tendências de melhoria, estabilidade ou deterioração. ' +
          'Gera risk_assessment textual baseado na direção e magnitude da tendência. ' +
          'Requer mínimo de 3 pontos de dados históricos para produzir previsão confiável.',
      },
      {
        title: '2.3 Otimização (optimizationEngine)',
        content:
          'Motor de otimização por grid search determinístico. ' +
          'Recebe candidatos de corte (áreas com maior gap entre real e orçado) e testa combinações de frações ' +
          '(default: 60%, 70%, 80%, 90%, 100%) para encontrar o plano que maximiza a melhoria do score. ' +
          'Limite máximo de corte por área: 10% (configurável). ' +
          'Suporta single-objective (maximizar score) e multi-objective (score + EBITDA + margem). ' +
          'Cada ação proposta inclui: área, corte sugerido em R$, prioridade (high/medium/low).',
      },
      {
        title: '2.4 Métricas Financeiras (financialModel)',
        content:
          'Extrai e calcula métricas derivadas a partir dos inputs financeiros brutos: ' +
          'EBITDA (receita + custos variáveis + custos fixos + SGA + rateio, custos negativos), ' +
          'margem de contribuição em percentual e valor absoluto, gap vs. orçado. ' +
          'Função safePct para divisões seguras (evita NaN e Infinity). ' +
          'Todas as métricas usam arredondamento a 2 casas decimais.',
      },
    ],
  };
}

// ============================================
// SEÇÃO 3 — ALERTAS
// ============================================

function buildAlertsSection(): FrameworkSection {
  return {
    number: 3,
    title: 'Sistema de Alertas',
    content:
      'O sistema de alertas monitora continuamente a saúde financeira e gera notificações ' +
      'automatizadas quando indicadores ultrapassam thresholds definidos. Os alertas são classificados ' +
      'por severidade e tipo, permitindo priorização de ações corretivas.',
    subsections: [
      {
        title: '3.1 Alertas Instantâneos',
        content:
          'Avaliados ao final de cada pipeline run. Cinco regras: ' +
          '(1) HEALTH_SCORE_CRITICAL — score < 70, severidade alta; ' +
          '(2) LOW_MARGIN — margem real > 2pp abaixo do orçado, severidade média; ' +
          '(3) EBITDA_DROP — EBITDA real abaixo do ano anterior, severidade média; ' +
          '(4) TOO_MANY_HIGH_PRIORITY — > 3 recomendações high-priority, severidade média; ' +
          '(5) AGENT_CONFLICTS — > 2 conflitos entre agentes, severidade baixa. ' +
          'Thresholds configuráveis via decision_models.',
      },
      {
        title: '3.2 Alertas de Tendência',
        content:
          'Avaliados quando há 3+ runs históricos disponíveis. Detectam padrões de deterioração: ' +
          '(1) TREND_SCORE_DOWN — score em queda por 3 runs consecutivos, severidade alta; ' +
          '(2) TREND_MARGIN_DOWN — margem em queda por 3 runs, severidade média; ' +
          '(3) TREND_CONFIDENCE_DOWN — confiança em queda por 3 runs, severidade baixa; ' +
          '(4) TREND_RISK_INCREASING — recomendações high-priority em alta por 3 runs, severidade média. ' +
          'Baseados em funções isDecreasingTrend e isIncreasingTrend do forecastModel.',
      },
      {
        title: '3.3 Resposta a Alertas',
        content:
          'Alertas de severidade alta (HEALTH_SCORE_CRITICAL, TREND_SCORE_DOWN) exigem ação imediata: ' +
          'plano de otimização obrigatório com aprovação executiva em até 5 dias úteis. ' +
          'Alertas de severidade média geram recomendação de revisão no rito mensal. ' +
          'Alertas de severidade baixa são informativos e não exigem ação imediata. ' +
          'Todos os alertas são persistidos na tabela agent_alerts para rastreabilidade.',
      },
    ],
  };
}

// ============================================
// SEÇÃO 4 — DASHBOARD
// ============================================

function buildDashboardSection(): FrameworkSection {
  return {
    number: 4,
    title: 'CEO Dashboard',
    content:
      'O CEO Dashboard é a interface principal de visualização para a diretoria. ' +
      'Acesso restrito a administradores. Dados consumidos exclusivamente via API — zero cálculo na interface.',
    subsections: [
      {
        title: '4.1 Layout',
        content:
          'Organizado em 4 linhas hierárquicas: ' +
          'Linha 1 — Health Score (grande, visual), Nível de Risco (badge colorido), Confiança (percentual). ' +
          'Linha 2 — KPIs: EBITDA, Margem, Receita, Tendência (4 cards). ' +
          'Linha 3 — EBITDA Mensal (mini gráfico de barras), Plano Ótimo (resumo), Alertas Críticos. ' +
          'Linha 4 — Drivers (positivos e negativos), Riscos Principais, Ações Prioritárias. ' +
          'Seção adicional: Narrativa Executiva com parágrafos estruturados.',
      },
      {
        title: '4.2 Semântica de Cores',
        content:
          'Padrão visual consistente em toda a plataforma: ' +
          'Verde (#059669 / #ECFDF5) = Saudável, positivo, dentro do esperado. ' +
          'Âmbar (#D97706 / #FFFBEB) = Atenção, requer monitoramento. ' +
          'Vermelho (#DC2626 / #FEF2F2) = Crítico, requer ação. ' +
          'Cores determinadas pelo backend (campo health nos dados), não por thresholds na UI.',
      },
      {
        title: '4.3 Fonte de Dados',
        content:
          'Endpoint único: GET /api/agent-team/executive-dashboard. ' +
          'Retorna 7 campos pré-computados: summary (resumo executivo), financial_summary (métricas DRE), ' +
          'score (Health Score com breakdown), forecast (projeção 3 ciclos), ' +
          'optimization (plano ótimo se disponível), alerts (alertas ativos), ' +
          'trend_last_6_months (série temporal para gráfico). ' +
          'Refresh manual via botão na interface. Sem auto-refresh para evitar carga desnecessária.',
      },
    ],
  };
}

// ============================================
// SEÇÃO 5 — GOVERNANÇA
// ============================================

function buildGovernanceSection(): FrameworkSection {
  return {
    number: 5,
    title: 'Modelo de Governança',
    content:
      'O modelo de governança define responsabilidades, processos de alteração e rastreabilidade ' +
      'de todas as decisões tomadas pela plataforma e pelos seus operadores.',
    subsections: [
      {
        title: '5.1 Responsabilidades',
        content:
          'Três papéis formais: ' +
          'Model Owner (CTO) — integridade técnica do modelo, validação de fórmulas, aprovação de alterações. ' +
          'Executive Owner (CFO) — interpretação estratégica, decisão final sobre planos de ação. ' +
          'Operational Owner (Controller) — qualidade dos dados, execução do pipeline, monitoramento.',
      },
      {
        title: '5.2 Processo de Alteração de Pesos',
        content:
          'Cinco etapas obrigatórias: ' +
          '(1) Identificar necessidade com evidências quantitativas; ' +
          '(2) Propor novos valores com simulação retrospectiva (backtesting em 6+ ciclos); ' +
          '(3) Validar impacto — confirmar ausência de falsos positivos/negativos; ' +
          '(4) Aprovação formal pelo Executive Owner; ' +
          '(5) Implementar e registrar com justificativa obrigatória (mínimo 30 caracteres). ' +
          'Enforcement: constraint no banco de dados (justification NOT NULL, LENGTH >= 30).',
      },
      {
        title: '5.3 Rastreabilidade',
        content:
          'Toda decisão formal é registrada na tabela decision_audit_trail: ' +
          'aprovações, rejeições, overrides e alterações de modelo. ' +
          'Registros são imutáveis — não podem ser editados ou deletados. ' +
          'Correções geram novo registro referenciando o anterior. ' +
          'Retenção mínima: 5 anos. ' +
          'Logging estruturado (system_logs) para rastreabilidade técnica de operações.',
      },
      {
        title: '5.4 Override Manual',
        content:
          'Permitido quando: contexto estratégico não capturado pelo modelo, dados incompletos, ou evento externo extraordinário. ' +
          'Proibido: ignorar alertas críticos sem justificativa, alterar score manualmente, desativar pipeline sem aprovação. ' +
          'Todo override é registrado e obrigatoriamente revisado no próximo rito mensal.',
      },
    ],
  };
}

// ============================================
// SEÇÃO 6 — RITO EXECUTIVO
// ============================================

function buildRitualSection(): FrameworkSection {
  return {
    number: 6,
    title: 'Rito Mensal Executivo',
    content:
      'Reunião mensal de 60 minutos com agenda padronizada para revisão da saúde financeira, ' +
      'tomada de decisões formais e registro de deliberações.',
    subsections: [
      {
        title: '6.1 Agenda Padrão',
        content:
          'Seis itens em ordem fixa: ' +
          '(1) Health Score — visão geral (10 min, Controller); ' +
          '(2) Análise de Riscos — alertas e tendências (10 min, Controller); ' +
          '(3) Tendência e Projeção — forecast 3 ciclos (10 min, CTO); ' +
          '(4) Plano Ótimo de Ação — otimização e decisão formal (15 min, CFO); ' +
          '(5) Deliberação e Registro — decisões, responsáveis, prazos (10 min, CEO); ' +
          '(6) Revisão de Overrides — overrides pendentes do mês anterior (5 min, CFO).',
      },
      {
        title: '6.2 Deck de Apresentação',
        content:
          'Gerado automaticamente via generateMonthlyBoardDeck(). ' +
          'Sete slides padronizados: Capa, Health Score (com delta vs mês anterior), ' +
          'Riscos (com comparação), Tendência, Plano Ótimo (com decision box), ' +
          'Revisão de Overrides, Deliberação (template de registro). ' +
          'Dados consumidos do CEO Dashboard — zero preparação manual necessária.',
      },
      {
        title: '6.3 Registro de Deliberação',
        content:
          'Ata formal com: data, participantes, itens discutidos, preocupações levantadas, resoluções. ' +
          'Decisões formais com campos obrigatórios: tipo (aprovação/rejeição/override/adiamento), ' +
          'justificativa (mínimo 30 caracteres), responsável, prazo, ação de follow-up. ' +
          'Registrada em decision_audit_trail para rastreabilidade completa.',
      },
    ],
  };
}

// ============================================
// SEÇÃO 7 — POLÍTICA OFICIAL
// ============================================

function buildPolicySection(): FrameworkSection {
  return {
    number: 7,
    title: 'Política Oficial de Uso',
    content:
      'A política oficial define os limites de operação da plataforma, ' +
      'equilibrando a objetividade do modelo matemático com o julgamento humano da diretoria.',
    subsections: [
      {
        title: '7.1 Elementos Alteráveis',
        content:
          'Podem ser modificados conforme processo formal: ' +
          'pesos e thresholds do Health Score, thresholds de alertas, ' +
          'frações de otimização e limite de corte, frequência de agendamentos, ' +
          'composição de agentes no pipeline, objetivo textual dos runs.',
      },
      {
        title: '7.2 Elementos Imutáveis',
        content:
          'Não podem ser alterados sem redesign completo: ' +
          'fórmula base do Health Score (Base 100 - Penalidades), ' +
          'imutabilidade dos registros de auditoria, ' +
          'obrigatoriedade de justificativa em decisões formais, ' +
          'separação arquitetural core/endpoint/UI, ' +
          'determinismo do motor de decisão, ' +
          'estrutura hierárquica do DRE (tag0 → tag01 → tag02 → tag03).',
      },
      {
        title: '7.3 Nível de Risco Aceitável',
        content:
          'Quatro faixas: ' +
          'Baixo (85-100) — aceitável, monitoramento contínuo. ' +
          'Médio (70-84) — aceitável por até 2 ciclos, plano recomendado. ' +
          'Alto (50-69) — inaceitável, plano obrigatório em 5 dias úteis. ' +
          'Crítico Severo (0-49) — inaceitável, reunião extraordinária imediata, ação em 48 horas.',
      },
      {
        title: '7.4 Princípio Fundamental',
        content:
          'O modelo informa, o ser humano decide. ' +
          'O Decision Intelligence Platform é ferramenta de apoio, não sistema autônomo de gestão. ' +
          'Quando modelo e julgamento humano divergem, prevalece o julgamento humano — ' +
          'desde que a divergência seja registrada formalmente. ' +
          'Se divergências se repetem sistematicamente (3+ vezes), é sinal de que o modelo precisa ser recalibrado.',
      },
    ],
  };
}

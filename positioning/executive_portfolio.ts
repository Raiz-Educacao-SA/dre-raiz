// ============================================
// Executive Portfolio — Portfólio Executivo
// Posicionamento estratégico pessoal
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface ExecutivePortfolio {
  title: string;
  version: string;
  generated_at: string;
  executive_summary: ExecutiveSummary;
  technical_inventory: TechnicalInventory;
  capability_matrix: CapabilityMatrix;
  architecture_showcase: ArchitectureShowcase;
  impact_evidence: ImpactEvidence;
  skill_profile: SkillProfile;
}

export interface ExecutiveSummary {
  one_liner: string;
  elevator_pitch: string;
  key_metrics: KeyMetric[];
}

export interface KeyMetric {
  label: string;
  value: string;
  context: string;
}

export interface TechnicalInventory {
  overview: string;
  codebase_metrics: CodebaseMetrics;
  modules: ModuleEntry[];
  database_architecture: DatabaseArchitecture;
  test_suite: TestSuite;
}

export interface CodebaseMetrics {
  total_custom_loc: string;
  typescript_files: number;
  react_components: number;
  sql_files: number;
  api_endpoints: number;
  core_modules: number;
  services: number;
  governance_docs: number;
  product_docs: number;
}

export interface ModuleEntry {
  name: string;
  category: 'core' | 'api' | 'service' | 'component' | 'governance' | 'product';
  loc: number;
  purpose: string;
  technical_highlight: string;
}

export interface DatabaseArchitecture {
  engine: string;
  tables: number;
  materialized_views: number;
  rpc_functions: number;
  indexes: number;
  triggers: number;
  cron_jobs: number;
  key_patterns: string[];
}

export interface TestSuite {
  total_tests: number;
  test_files: number;
  categories: TestCategory[];
  methodology: string;
}

export interface TestCategory {
  name: string;
  file: string;
  purpose: string;
}

export interface CapabilityMatrix {
  overview: string;
  capabilities: Capability[];
}

export interface Capability {
  domain: string;
  capability: string;
  implementation: string;
  differentiator: string;
  maturity: 'production' | 'built' | 'designed';
}

export interface ArchitectureShowcase {
  overview: string;
  layers: ArchitectureLayer[];
  design_patterns: DesignPattern[];
  integration_points: IntegrationPoint[];
}

export interface ArchitectureLayer {
  name: string;
  purpose: string;
  key_files: string[];
  loc: number;
}

export interface DesignPattern {
  pattern: string;
  where_applied: string;
  business_value: string;
}

export interface IntegrationPoint {
  system: string;
  purpose: string;
  pattern: string;
}

export interface ImpactEvidence {
  overview: string;
  before_after: BeforeAfter[];
  business_outcomes: BusinessOutcome[];
  technical_achievements: TechnicalAchievement[];
}

export interface BeforeAfter {
  dimension: string;
  before: string;
  after: string;
}

export interface BusinessOutcome {
  outcome: string;
  evidence: string;
  category: 'efficiency' | 'quality' | 'capability' | 'governance';
}

export interface TechnicalAchievement {
  achievement: string;
  significance: string;
}

export interface SkillProfile {
  positioning: string;
  primary_skills: SkillEntry[];
  differentiating_combinations: string[];
  career_trajectory: string;
}

export interface SkillEntry {
  skill: string;
  evidence: string;
  depth: 'expert' | 'advanced' | 'proficient';
}

// --------------------------------------------
// Executive Portfolio Generator
// --------------------------------------------

/**
 * Gera o portfólio executivo para posicionamento profissional.
 * Inventário completo das realizações técnicas e impacto de negócio.
 * Função pura — zero I/O.
 */
export function generateExecutivePortfolio(): ExecutivePortfolio {
  return {
    title: 'Portfólio Executivo — Decision Intelligence Platform',
    version: '1.0',
    generated_at: new Date().toISOString(),

    // ================================================
    // SUMÁRIO EXECUTIVO
    // ================================================
    executive_summary: {
      one_liner:
        'Construí uma plataforma completa de inteligência financeira (Decision Intelligence) ' +
        'para um grupo educacional de R$300M+ de receita com 10+ unidades — ' +
        'do zero, sozinho, em produção.',

      elevator_pitch:
        'Identifiquei que empresas com múltiplas filiais gastam semanas ' +
        'consolidando dados financeiros e tomam decisões sem simulação de impacto. ' +
        'Construí a solução: uma plataforma que consolida DRE automaticamente, ' +
        'produz relatórios executivos com IA e gerencia aprovações com audit trail. ' +
        'O sistema de consolidação e análise roda em produção como ferramenta diária; ' +
        'módulos de scoring, forecast e otimização estão construídos e validados ' +
        'com 185 testes automatizados. Arquitetura enterprise-grade, ' +
        'dados financeiros reais — não é protótipo.',

      key_metrics: [
        {
          label: 'Receita sob gestão',
          value: 'R$300M+',
          context: 'Dados financeiros reais de grupo educacional com 10+ unidades',
        },
        {
          label: 'Código personalizado',
          value: '~67.000 linhas',
          context: 'Lógica ativa (TS + SQL), excluindo scripts de migração one-off e diagnósticos (~98K total)',
        },
        {
          label: 'Testes automatizados',
          value: '185',
          context: '8 suites cobrindo modelo financeiro, score, forecast, otimização, segurança',
        },
        {
          label: 'Módulos core',
          value: '9',
          context: 'Lógica pura sem I/O — determinístico e auditável',
        },
        {
          label: 'Endpoints API',
          value: '20',
          context: 'Pipeline de agentes IA, análise, forecast, otimização',
        },
        {
          label: 'Componentes React',
          value: '80+',
          context: 'Views analíticas, dashboards, admin, equipe IA',
        },
        {
          label: 'Formatos de exportação',
          value: '4',
          context: 'Excel (estilizado), PDF, PowerPoint (multi-slide), Word',
        },
        {
          label: 'Provedores de IA',
          value: '3',
          context: 'Claude (primário), Groq (fallback), Gemini (alternativo)',
        },
      ],
    },

    // ================================================
    // INVENTÁRIO TÉCNICO
    // ================================================
    technical_inventory: {
      overview:
        'A plataforma é composta por 9 módulos core de lógica pura (sem I/O), ' +
        '17 serviços de integração, 20 endpoints de API, 80+ componentes React, ' +
        'e 237 arquivos SQL de schema, migrações e funções RPC. ' +
        'Cada camada tem responsabilidade clara e pode ser testada isoladamente.',

      codebase_metrics: {
        total_custom_loc: '~67.000 (lógica ativa; ~98K total incluindo migrações)',
        typescript_files: 110,
        react_components: 80,
        sql_files: 237,
        api_endpoints: 20,
        core_modules: 9,
        services: 17,
        governance_docs: 4,
        product_docs: 6,
      },

      modules: [
        // CORE — Lógica pura
        {
          name: 'DecisionEngine',
          category: 'core',
          loc: 252,
          purpose: 'Fachada unificada para análise, simulação e forecast',
          technical_highlight: 'Compõe financialModel + scoreModel + forecastModel em API única',
        },
        {
          name: 'financialModel',
          category: 'core',
          loc: 128,
          purpose: 'Cálculos financeiros puros — EBITDA, margens, deltas',
          technical_highlight: 'Zero side-effects, 100% determinístico, mesmos inputs = mesmos outputs',
        },
        {
          name: 'scoreModel',
          category: 'core',
          loc: 447,
          purpose: 'Health Score 0-100 por filial com breakdown de penalidades',
          technical_highlight: 'Classificação automática (Saudável/Atenção/Crítico) com regras configuráveis',
        },
        {
          name: 'forecastModel',
          category: 'core',
          loc: 161,
          purpose: 'Projeção de tendências com detecção de deterioração',
          technical_highlight: 'Time-series com weighted moving average e trend detection',
        },
        {
          name: 'optimizationEngine',
          category: 'core',
          loc: 583,
          purpose: 'Otimização multi-objetivo com restrições',
          technical_highlight: 'Grid search respeitando áreas protegidas e margem mínima',
        },
        {
          name: 'scheduleEngine',
          category: 'core',
          loc: 248,
          purpose: 'Agendamento de rituais de decisão',
          technical_highlight: 'Automatiza ciclos de análise periódica',
        },
        {
          name: 'executiveReport',
          category: 'core',
          loc: 490,
          purpose: 'Geração de relatórios para C-suite',
          technical_highlight: 'Consolidação multi-filial com alertas priorizados',
        },
        {
          name: 'logger',
          category: 'core',
          loc: 137,
          purpose: 'Audit trail estruturado',
          technical_highlight: 'Log imutável de cada decisão com input/output/justificativa',
        },
        {
          name: 'decisionTypes',
          category: 'core',
          loc: 304,
          purpose: 'Sistema de tipos completo para modelos de decisão',
          technical_highlight: 'TypeScript strict mode — segurança de tipos end-to-end',
        },

        // SERVIÇOS — Camada de integração
        {
          name: 'supabaseService',
          category: 'service',
          loc: 2030,
          purpose: 'Camada central de dados — todas as chamadas RPC, CRUD, caching, filtros RLS',
          technical_highlight: 'Maior módulo do sistema: 66KB, 60+ funções, cache com TTL',
        },
        {
          name: 'anthropicService',
          category: 'service',
          loc: 740,
          purpose: 'Integração com Claude AI — insights, narrativas, gráficos',
          technical_highlight: 'Prompt engineering com contexto financeiro injetado',
        },
        {
          name: 'analysisService',
          category: 'service',
          loc: 695,
          purpose: 'Computação de KPIs e análise financeira',
          technical_highlight: 'Pré-agregação para dashboards em tempo real',
        },
        {
          name: 'permissionsService',
          category: 'service',
          loc: 288,
          purpose: 'Singleton global de permissões (marcas, filiais, tags)',
          technical_highlight: 'Carregado no login, filtro aplicado em todas as queries',
        },
        {
          name: 'slidePptxService',
          category: 'service',
          loc: 1288,
          purpose: 'Geração de apresentações PowerPoint estilizadas',
          technical_highlight: 'Multi-slide com gráficos, branding e layout automático',
        },
        {
          name: 'pdfExportService',
          category: 'service',
          loc: 525,
          purpose: 'Exportação PDF formatada',
          technical_highlight: 'Layout financeiro com headers, seções e tabelas',
        },
        {
          name: 'docxExportService',
          category: 'service',
          loc: 571,
          purpose: 'Geração de documentos Word',
          technical_highlight: 'Narrativas formatadas com estilos profissionais',
        },

        // COMPONENTES — UI principal
        {
          name: 'SomaTagsView',
          category: 'component',
          loc: 2408,
          purpose: 'DRE Gerencial — view principal de análise financeira',
          technical_highlight: '3 modos, 7 filtros cascata, drill-down 4 níveis, export Excel estilizado',
        },
        {
          name: 'TransactionsView',
          category: 'component',
          loc: 2433,
          purpose: 'Gestão de lançamentos com paginação server-side',
          technical_highlight: '14 filtros, edição em massa, 3 modos de densidade, export 24 colunas',
        },
        {
          name: 'DashboardEnhanced',
          category: 'component',
          loc: 764,
          purpose: 'Dashboard executivo com KPIs e tendências',
          technical_highlight: 'Sparklines 12 meses, indicadores de trend, cards de performance',
        },
        {
          name: 'AgentTeamView',
          category: 'component',
          loc: 341,
          purpose: 'Equipe de IA para análise financeira',
          technical_highlight: 'Pipeline multi-etapa com polling, revisão e re-execução',
        },
      ],

      database_architecture: {
        engine: 'PostgreSQL via Supabase',
        tables: 9,
        materialized_views: 1,
        rpc_functions: 8,
        indexes: 30,
        triggers: 8,
        cron_jobs: 1,
        key_patterns: [
          'Row Level Security (RLS) — políticas RBAC no nível do banco',
          'Materialized View (dre_agg) — pré-agregação para drill-down sub-segundo',
          'Triggers automáticos — tag0_map popula tag0 em todas as tabelas de transação',
          'pg_cron — rateio automatizado a cada 15 minutos',
          'RPCs parametrizados — 8 parâmetros com filtragem server-side',
          'Cenários separados — transactions (Real), transactions_orcado, transactions_ano_anterior',
        ],
      },

      test_suite: {
        total_tests: 185,
        test_files: 8,
        categories: [
          { name: 'Modelo Financeiro', file: 'financialModel.test.ts', purpose: 'EBITDA, margens, deltas, cenários edge-case' },
          { name: 'Score de Saúde', file: 'scoreModel.test.ts', purpose: 'Cálculo 0-100, classificação, breakdown de penalidades' },
          { name: 'Forecast', file: 'forecastModel.test.ts', purpose: 'Projeção de tendências, detecção de deterioração' },
          { name: 'Otimização', file: 'optimizationEngine.test.ts', purpose: 'Cenários de corte, restrições, convergência' },
          { name: 'Schedule', file: 'scheduleEngine.test.ts', purpose: 'Rituais de decisão, agendamento, periodicidade' },
          { name: 'Logger', file: 'logger.test.ts', purpose: 'Audit trail, imutabilidade, formato estruturado' },
          { name: 'Performance', file: 'performance.test.ts', purpose: '1000 scores em <50ms, benchmarks de throughput' },
          { name: 'Segurança', file: 'security.test.ts', purpose: 'Sanitização de dados sensíveis, validação de inputs' },
        ],
        methodology:
          'Vitest com cobertura de edge cases. Motor determinístico: mesmos inputs geram mesmos outputs. ' +
          'Testes de performance garantem SLAs de tempo de resposta. ' +
          'Testes de segurança validam sanitização de dados sensíveis em todas as chaves configuradas.',
      },
    },

    // ================================================
    // MATRIZ DE CAPACIDADES
    // ================================================
    capability_matrix: {
      overview:
        'A plataforma entrega 12 capacidades distintas, organizadas por domínio. ' +
        'Cada capacidade tem implementação concreta, diferenciador de mercado ' +
        'e nível de maturidade verificável.',

      capabilities: [
        // Consolidação Financeira
        {
          domain: 'Consolidação Financeira',
          capability: 'DRE multi-filial automatizado',
          implementation:
            'RPC get_soma_tags com 8 parâmetros, 3 cenários (Real/Orçado/Ano Anterior), ' +
            'hierarquia tag0→tag01→tag02→tag03, filtros cascata server-side',
          differentiator: 'Consolidação em minutos (vs. 15 dias manual) com drill-down 4 níveis',
          maturity: 'production',
        },
        {
          domain: 'Consolidação Financeira',
          capability: 'Rateio automático por filial',
          implementation:
            'pg_cron a cada 15min executa calcular_rateio_raiz_real — distribui custos ' +
            'corporativos proporcionalmente por filial via UPSERT',
          differentiator: 'Eliminação completa de alocação manual de custos corporativos',
          maturity: 'production',
        },
        // Análise & Intelligence
        {
          domain: 'Análise & Intelligence',
          capability: 'Health Score por filial (0-100)',
          implementation:
            'scoreModel.ts — cálculo determinístico com breakdown de penalidades ' +
            '(margem, tendência, variação vs. orçado). Classificação automática.',
          differentiator: 'Score quantitativo auditável (vs. dashboards qualitativos de BI)',
          maturity: 'built',
        },
        {
          domain: 'Análise & Intelligence',
          capability: 'Projeção de tendências com alertas',
          implementation:
            'forecastModel.ts — weighted moving average com trend detection. ' +
            'evaluateTrendAlerts identifica deterioração antes que se torne crítica.',
          differentiator: 'Detecção proativa de filiais em deterioração (vs. análise reativa)',
          maturity: 'built',
        },
        {
          domain: 'Análise & Intelligence',
          capability: 'Otimização de planos de corte',
          implementation:
            'optimizationEngine.ts — grid search multi-objetivo respeitando restrições ' +
            '(áreas protegidas, margem mínima, teto por categoria)',
          differentiator: 'Recomendação calculada de onde cortar e quanto (vs. feeling)',
          maturity: 'built',
        },
        // Inteligência Artificial
        {
          domain: 'Inteligência Artificial',
          capability: 'Narrativa financeira por IA',
          implementation:
            'Claude AI (claude-haiku-4-5-20251001) com contexto financeiro injetado. ' +
            'Hash determinístico para cache de análises idênticas.',
          differentiator: 'IA especializada em FP&A (vs. IA genérica sem contexto financeiro)',
          maturity: 'production',
        },
        {
          domain: 'Inteligência Artificial',
          capability: 'Pipeline multi-etapa de agentes',
          implementation:
            'Arquitetura step-based assíncrona: planejamento → análise → consolidação. ' +
            'Cada step é uma request isolada (~12s), evitando timeout.',
          differentiator: 'Análise especializada multi-perspectiva (vs. prompt único)',
          maturity: 'built',
        },
        {
          domain: 'Inteligência Artificial',
          capability: 'Multi-provider com fallback',
          implementation:
            'Claude (primário) com fallback para Groq em caso de crédito esgotado. ' +
            'Rate limit retorna análise básica com KPIs. Gemini disponível como provider alternativo.',
          differentiator: 'Resiliência — sistema nunca fica sem IA disponível',
          maturity: 'production',
        },
        // Governança & Compliance
        {
          domain: 'Governança & Compliance',
          capability: 'RBAC com RLS no banco',
          implementation:
            'Firebase Auth → Supabase token. 5 roles (admin/manager/approver/viewer/pending). ' +
            'RLS policies filtram dados no PostgreSQL.',
          differentiator: 'Segurança no nível do banco (vs. filtro apenas no frontend)',
          maturity: 'production',
        },
        {
          domain: 'Governança & Compliance',
          capability: 'Fila de aprovação com audit trail',
          implementation:
            'manual_changes com tipos (CONTA/DATA/FILIAL/MULTI/RATEIO/EXCLUSAO). ' +
            'Aprovação em massa via Promise.all. Histórico completo.',
          differentiator: 'Rastreabilidade de cada alteração financeira com aprovador',
          maturity: 'production',
        },
        // Exportação & Reporting
        {
          domain: 'Exportação & Reporting',
          capability: 'Exportação multi-formato fiel à tela',
          implementation:
            'ExcelJS (estilizado com freeze panes, cores por grupo), pdfmake, pptxgenjs, docx. ' +
            'Exportação replica filtros, drill-down e colunas ativas.',
          differentiator: 'Export que reproduz exatamente o que está na tela (vs. dump genérico)',
          maturity: 'production',
        },
        {
          domain: 'Exportação & Reporting',
          capability: 'Apresentações PowerPoint com IA',
          implementation:
            'slidePptxService (1.288 LOC) gera decks multi-slide com gráficos, ' +
            'branding e conteúdo narrativo gerado por IA.',
          differentiator: 'Deck pronto para board em minutos (vs. horas de preparação manual)',
          maturity: 'production',
        },
      ],
    },

    // ================================================
    // SHOWCASE DE ARQUITETURA
    // ================================================
    architecture_showcase: {
      overview:
        'Arquitetura em 5 camadas com separação estrita de responsabilidades. ' +
        'Core puro (sem I/O) no centro, serviços de integração na camada intermediária, ' +
        'API REST como interface externa, componentes React como interface visual, ' +
        'e PostgreSQL com RLS como camada de persistência.',

      layers: [
        {
          name: 'Core (Lógica Pura)',
          purpose: 'Cálculos financeiros, scoring, forecast, otimização — zero I/O, 100% testável',
          key_files: [
            'core/financialModel.ts', 'core/scoreModel.ts', 'core/forecastModel.ts',
            'core/optimizationEngine.ts', 'core/DecisionEngine.ts',
          ],
          loc: 2750,
        },
        {
          name: 'Services (Integração)',
          purpose: 'Supabase, IA (Claude/Groq/Gemini), exportação (Excel/PDF/PPT/Word), permissões',
          key_files: [
            'services/supabaseService.ts', 'services/anthropicService.ts',
            'services/analysisService.ts', 'services/permissionsService.ts',
          ],
          loc: 8602,
        },
        {
          name: 'API (Endpoints)',
          purpose: 'Pipeline de agentes, análise, forecast, health score, simulação, sync',
          key_files: [
            'api/agent-team/run-pipeline.ts', 'api/agent-team/process-next-step.ts',
            'api/agent-team/executive-dashboard.ts', 'api/generate-ai.ts',
          ],
          loc: 3859,
        },
        {
          name: 'Components (UI)',
          purpose: 'Views analíticas, dashboards, admin, equipe IA, exportação',
          key_files: [
            'components/SomaTagsView.tsx', 'components/TransactionsView.tsx',
            'components/DashboardEnhanced.tsx', 'components/AgentTeamView.tsx',
          ],
          loc: 31480,
        },
        {
          name: 'Database (PostgreSQL)',
          purpose: 'Schema, RLS, RPCs parametrizados, triggers, materialized views, pg_cron',
          key_files: [
            'database/', 'migrations/',
          ],
          loc: 33000,
        },
      ],

      design_patterns: [
        {
          pattern: 'Motor Determinístico (Pure Functions)',
          where_applied: 'Todos os 9 módulos core — zero side-effects, sem I/O',
          business_value: 'Resultados reproduzíveis e auditáveis — mesmos dados, mesmo resultado, sempre',
        },
        {
          pattern: 'Cache com validação por operador "in"',
          where_applied: 'Dimension cache em SomaTagsView, transactionCache com TTL',
          business_value: 'Evita re-fetch infinito para resultados vazios (edge case que quebra loops)',
        },
        {
          pattern: 'Materialized View com pré-agregação',
          where_applied: 'dre_agg — consolida 3 tabelas de transação em view indexada',
          business_value: 'Drill-down sub-segundo mesmo com milhões de registros',
        },
        {
          pattern: 'Row Level Security (RLS)',
          where_applied: 'Policies PostgreSQL em transactions, manual_changes, dre_analyses',
          business_value: 'Segurança no nível do banco — impossível acessar dados não autorizados',
        },
        {
          pattern: 'Fire-and-Forget Chain-Calling',
          where_applied: 'Pipeline de agentes IA — cada step dispara o próximo via fetch fire-and-forget',
          business_value: 'Pipeline de 4 steps sem timeout: cada request ~12s, nenhuma excede 60s',
        },
        {
          pattern: 'useRef para Stale Closures',
          where_applied: 'yearRef, recurringRef, filialCleanupRef em SomaTagsView',
          business_value: 'Previne bugs sutis de closures stale em useCallback com deps vazias',
        },
        {
          pattern: 'Lazy Loading com React.lazy',
          where_applied: 'Todas as views carregadas sob demanda — App.tsx importa dinamicamente',
          business_value: 'Bundle inicial leve, carrega módulos pesados só quando necessário',
        },
        {
          pattern: 'Trigger-Based Data Consistency',
          where_applied: 'trg_auto_tag0 popula tag0 via tag0_map em INSERT/UPDATE',
          business_value: 'Dados sempre consistentes sem depender do frontend para classificação',
        },
      ],

      integration_points: [
        {
          system: 'Supabase (PostgreSQL)',
          purpose: 'Persistência, RLS, RPCs, Realtime',
          pattern: 'Service layer com client anon (frontend) + service_role (backend)',
        },
        {
          system: 'Firebase Auth',
          purpose: 'SSO Google → token de identidade',
          pattern: 'signInWithPopup → ID token → Supabase signInWithIdToken(provider: "firebase")',
        },
        {
          system: 'Anthropic Claude',
          purpose: 'Narrativas financeiras, insights, análise de DRE',
          pattern: 'Proxy via Vercel serverless (produção) / Vite proxy (dev) — CORS-safe',
        },
        {
          system: 'Groq',
          purpose: 'Fallback de IA quando Claude está indisponível',
          pattern: 'Mesmo formato de prompt, troca de endpoint e model',
        },
        {
          system: 'Google Gemini',
          purpose: 'Provider alternativo de IA',
          pattern: 'geminiService.ts com adaptador de formato',
        },
        {
          system: 'Vercel',
          purpose: 'Deploy e serverless functions',
          pattern: 'API routes em api/, build Vite para estáticos',
        },
      ],
    },

    // ================================================
    // EVIDÊNCIAS DE IMPACTO
    // ================================================
    impact_evidence: {
      overview:
        'Impacto documentado em 4 dimensões: eficiência operacional, ' +
        'qualidade de decisão, novas capacidades e governança. ' +
        'Cada evidência é verificável no sistema em produção.',

      before_after: [
        {
          dimension: 'Consolidação DRE',
          before: '15-20 dias de trabalho manual por mês (Excel, e-mail, PowerPoint)',
          after: 'Minutos — consolidação automática com drill-down 4 níveis',
        },
        {
          dimension: 'Visibilidade financeira',
          before: 'Dados com 2-3 semanas de atraso, relatórios estáticos',
          after: 'Dados atualizados com rateio automático a cada 15 minutos',
        },
        {
          dimension: 'Tomada de decisão',
          before: 'Decisões baseadas em intuição e planilhas desatualizadas',
          after: 'Score quantitativo por filial, projeções e plano de ação calculado',
        },
        {
          dimension: 'Comparação de cenários',
          before: 'Comparar Real vs. Orçado exigia cruzamento manual',
          after: '3 cenários lado a lado (Real/Orçado/Ano Anterior) com deltas automáticos',
        },
        {
          dimension: 'Relatórios para board',
          before: 'Analista gastava dias preparando apresentação estática',
          after: 'IA gera relatório executivo em 2 minutos, exporta para PPT/PDF/Word',
        },
        {
          dimension: 'Rastreabilidade',
          before: 'Alterações financeiras sem registro — impossível auditar',
          after: 'Fila de aprovação RBAC com audit trail de cada alteração',
        },
        {
          dimension: 'Distribuição de custos',
          before: 'Rateio corporativo calculado manualmente, propenso a erros',
          after: 'Rateio automático por filial via pg_cron — zero intervenção humana',
        },
      ],

      business_outcomes: [
        {
          outcome: 'Controller liberou ~10 dias úteis/mês de compilação manual',
          evidence: 'Consolidação automatizada via get_soma_tags com 8 parâmetros de filtro',
          category: 'efficiency',
        },
        {
          outcome: 'Análise financeira com dados atualizados (vs. 2-3 semanas de atraso)',
          evidence: 'Rateio automático a cada 15min, DRE consolidado em tempo real',
          category: 'quality',
        },
        {
          outcome: 'Score de saúde por filial habilitado pela primeira vez',
          evidence: 'scoreModel.ts com cálculo 0-100, breakdown de penalidades, classificação automática',
          category: 'capability',
        },
        {
          outcome: 'Decisões financeiras agora são auditáveis',
          evidence: 'manual_changes com tipos, aprovador, timestamp, justificativa',
          category: 'governance',
        },
        {
          outcome: 'Relatório executivo gerado por IA em minutos',
          evidence: 'anthropicService + DreAnalysisSection com cache por hash de filtros',
          category: 'efficiency',
        },
        {
          outcome: 'Exportação fiel à tela em 4 formatos (Excel, PDF, PPT, Word)',
          evidence: 'ExcelJS com freeze panes, cores por grupo, drill-down expandido',
          category: 'capability',
        },
      ],

      technical_achievements: [
        {
          achievement: '185 testes automatizados passando — 8 suites',
          significance:
            'Nível de maturidade enterprise para produto construído por 1 desenvolvedor. ' +
            'Inclui testes de performance (1000 scores em <50ms) e segurança (sanitização de dados sensíveis).',
        },
        {
          achievement: 'Motor determinístico puro — zero I/O no core',
          significance:
            'Resultados 100% reproduzíveis e auditáveis. Impossível em ferramentas que dependem ' +
            'de IA generativa pura para cálculos. Mesmos dados sempre geram o mesmo resultado.',
        },
        {
          achievement: 'Arquitetura 5 camadas com separação estrita',
          significance:
            'Core testável isoladamente, serviços substituíveis, API stateless. ' +
            'Padrão enterprise: hexagonal/clean architecture adaptada para FP&A.',
        },
        {
          achievement: 'Pipeline de IA step-based assíncrono',
          significance:
            'Resolve o problema de timeout em serverless (Vercel 60s). ' +
            'Cada step é uma request isolada (~12s) encadeada via fire-and-forget.',
        },
        {
          achievement: 'RLS PostgreSQL com 5 roles e políticas granulares',
          significance:
            'Segurança no nível do banco — não depende do frontend para controle de acesso. ' +
            'Padrão exigido por compliance financeiro.',
        },
        {
          achievement: 'Materialized view com 30+ indexes para drill-down sub-segundo',
          significance:
            'Performance de BI enterprise em stack serverless. ' +
            'dre_agg consolida 3 tabelas para queries instantâneas.',
        },
      ],
    },

    // ================================================
    // PERFIL DE HABILIDADES
    // ================================================
    skill_profile: {
      positioning:
        'Profissional híbrido: visão financeira estratégica + capacidade de execução técnica. ' +
        'Não é apenas analista financeiro (consome ferramentas) nem apenas desenvolvedor ' +
        '(constrói sem entender o domínio). É quem identifica o problema financeiro, ' +
        'arquiteta a solução e implementa do zero — com qualidade enterprise.',

      primary_skills: [
        {
          skill: 'FP&A & Análise Financeira',
          evidence: 'Plataforma gerencia DRE de R$300M+ com consolidação multi-filial, rateio, cenários',
          depth: 'expert',
        },
        {
          skill: 'TypeScript / React',
          evidence: '80+ componentes, 110 arquivos TS, hooks avançados (useRef para stale closures)',
          depth: 'expert',
        },
        {
          skill: 'PostgreSQL / Supabase',
          evidence: 'RPCs parametrizados, RLS, materialized views, triggers, pg_cron, 237 arquivos SQL',
          depth: 'expert',
        },
        {
          skill: 'Arquitetura de Software',
          evidence: '5 camadas separadas, core puro, 185 testes, design patterns documentados',
          depth: 'advanced',
        },
        {
          skill: 'Integração de IA (LLMs)',
          evidence: '3 provedores (Claude/Groq/Gemini), prompt engineering especializado, pipeline multi-etapa',
          depth: 'advanced',
        },
        {
          skill: 'Data Visualization',
          evidence: 'Recharts + ECharts, 3 modos de visualização DRE, sparklines, drill-down interativo',
          depth: 'advanced',
        },
        {
          skill: 'Product Thinking',
          evidence: 'Pricing modelado, unit economics projetados, roadmap comercial, arquitetura multi-tenant desenhada',
          depth: 'proficient',
        },
        {
          skill: 'Governança & Compliance',
          evidence: 'Framework de decisão, políticas de governança, audit trail, RBAC com RLS',
          depth: 'proficient',
        },
      ],

      differentiating_combinations: [
        'FP&A + Engenharia de Software: entende o problema financeiro E constrói a solução técnica',
        'Motor Determinístico + IA: cálculos auditáveis com narrativa inteligente — o melhor dos dois mundos',
        'Produto + Execução: não só identifica a oportunidade SaaS, constrói a plataforma completa',
        'Visão Estratégica + Implementação: do diagnóstico de negócio ao código em produção',
        'PostgreSQL Avançado + Frontend React: full-stack real, não "conheço um pouco de cada"',
      ],

      career_trajectory:
        'A trajetória demonstra evolução de analista financeiro para construtor de sistemas de decisão. ' +
        'O próximo passo natural é liderar a interseção entre finanças e tecnologia — ' +
        'seja como Head de FP&A com capacidade técnica, ' +
        'como CTO/CPO de fintech vertical, ' +
        'ou como fundador de produto de Decision Intelligence. ' +
        'O ativo construído (plataforma em produção + arquitetura SaaS + roadmap comercial) ' +
        'é a evidência concreta dessa capacidade.',
    },
  };
}

// ============================================
// Multi-Tenant Architecture — Plano Completo
// Arquitetura de isolamento, planos e feature flags
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface MultiTenantArchitecture {
  current_state: CurrentStateAudit;
  target_architecture: TargetArchitecture;
  plans: SaaSPlan[];
  feature_matrix: FeatureMatrix;
  data_isolation: DataIsolationPlan;
  migration_plan: MigrationPlan;
}

export interface CurrentStateAudit {
  summary: string;
  readiness_pct: number;
  what_exists: AuditItem[];
  what_is_missing: AuditItem[];
  critical_fix: string;
}

export interface AuditItem {
  item: string;
  status: 'done' | 'partial' | 'missing';
  details: string;
}

export interface TargetArchitecture {
  principles: string[];
  layers: ArchitectureLayer[];
  tenant_lifecycle: TenantLifecycleStep[];
}

export interface ArchitectureLayer {
  name: string;
  responsibility: string;
  isolation_mechanism: string;
  current_status: 'ready' | 'partial' | 'missing';
  action_required: string;
}

export interface TenantLifecycleStep {
  step: number;
  name: string;
  description: string;
  automated: boolean;
}

export interface SaaSPlan {
  id: string;
  name: string;
  price_monthly_brl: number;
  price_annual_brl: number;
  target_segment: string;
  feature_flags: FeatureFlags;
  quotas: PlanQuotas;
  support_level: string;
}

/**
 * Contrato canônico de feature flags.
 * Unifica OrganizationFeatures (core/decisionTypes.ts) com flags do produto.
 * Fonte de verdade para ambas as camadas — core e produto.
 *
 * Mapeamento para core/decisionTypes.ts OrganizationFeatures:
 *   enable_forecast       → enable_forecast
 *   enable_optimization   → enable_optimization
 *   enable_alerts         → enable_alerts
 *   enable_trend_alerts   → enable_trend_alerts (core name)
 *   enable_brand_score    → enable_brand_score (core name)
 *   enable_ceo_view       → enable_ceo_view (core name, = enable_ceo_dashboard)
 */
export interface FeatureFlags {
  // --- Core (mapeiam 1:1 com OrganizationFeatures) ---
  enable_forecast: boolean;
  enable_optimization: boolean;
  enable_alerts: boolean;
  enable_trend_alerts: boolean;       // core: enable_trend_alerts
  enable_brand_score: boolean;        // core: enable_brand_score
  enable_ceo_view: boolean;           // core: enable_ceo_view (= CEO Dashboard)
  // --- Produto (extensões não presentes no core) ---
  enable_dre_gerencial: boolean;
  enable_health_score: boolean;
  enable_multi_objective: boolean;
  enable_ai_team: boolean;
  enable_audit_trail: boolean;
  enable_scheduling: boolean;
  enable_executive_report: boolean;
  enable_custom_scoring: boolean;
  enable_sso: boolean;
  enable_api_access: boolean;
}

export interface PlanQuotas {
  max_filiais: number | null;              // null = ilimitado
  max_usuarios: number;
  max_relatorios_ia_semana: number | null;
  max_historico_meses: number;
  max_runs_pipeline_dia: number;
  max_agents_per_team: number;
}

/**
 * Especificação de enforcement para cada quota.
 * Define: query de contagem, ponto de enforcement, comportamento no limite.
 */
export interface QuotaEnforcementSpec {
  quota: string;
  count_query: string;
  enforcement_point: 'api_middleware' | 'rpc_function' | 'frontend_check';
  on_limit_reached: 'hard_block' | 'warning_then_block' | 'soft_warning';
  grace_period: string;
  null_means: string;
}

/** Regras de enforcement de cada quota */
export const QUOTA_ENFORCEMENT: QuotaEnforcementSpec[] = [
  {
    quota: 'max_filiais',
    count_query: 'SELECT COUNT(DISTINCT nome_filial) FROM transactions WHERE organization_id = $org',
    enforcement_point: 'api_middleware',
    on_limit_reached: 'hard_block',
    grace_period: 'Nenhum — bloqueia importação de novas filiais',
    null_means: 'Ilimitado — skip check',
  },
  {
    quota: 'max_usuarios',
    count_query: 'SELECT COUNT(*) FROM users WHERE organization_id = $org AND is_active = true',
    enforcement_point: 'api_middleware',
    on_limit_reached: 'hard_block',
    grace_period: 'Nenhum — bloqueia convite de novos usuários',
    null_means: 'N/A — sempre tem limite numérico',
  },
  {
    quota: 'max_relatorios_ia_semana',
    count_query:
      'SELECT COUNT(*) FROM agent_runs WHERE organization_id = $org ' +
      'AND started_at > now() - interval \'7 days\'',
    enforcement_point: 'api_middleware',
    on_limit_reached: 'warning_then_block',
    grace_period: 'Aviso ao atingir 80% do limite. Bloqueia ao atingir 100%.',
    null_means: 'Ilimitado — skip check',
  },
  {
    quota: 'max_historico_meses',
    count_query:
      'SELECT EXTRACT(MONTH FROM age(MAX(data_competencia), MIN(data_competencia))) ' +
      'FROM transactions WHERE organization_id = $org',
    enforcement_point: 'rpc_function',
    on_limit_reached: 'soft_warning',
    grace_period: 'Dados antigos ficam acessíveis mas não são processados em análise',
    null_means: 'N/A — sempre tem limite numérico',
  },
  {
    quota: 'max_runs_pipeline_dia',
    count_query:
      'SELECT COUNT(*) FROM agent_runs WHERE organization_id = $org ' +
      'AND started_at > now() - interval \'24 hours\'',
    enforcement_point: 'api_middleware',
    on_limit_reached: 'hard_block',
    grace_period: 'Reseta automaticamente após 24h',
    null_means: 'N/A — sempre tem limite numérico',
  },
  {
    quota: 'max_agents_per_team',
    count_query: 'SELECT COUNT(*) FROM team_agents WHERE team_id = $team AND is_active = true',
    enforcement_point: 'frontend_check',
    on_limit_reached: 'hard_block',
    grace_period: 'Nenhum — bloqueia adição de novos agentes',
    null_means: 'N/A — sempre tem limite numérico',
  },
];

export interface FeatureMatrix {
  features: FeatureRow[];
}

export interface FeatureRow {
  feature: string;
  category: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

export interface DataIsolationPlan {
  strategy: string;
  rls_enforcement: RLSEnforcement[];
  api_isolation: APIIsolation;
  organizations_table: OrganizationsTableSpec;
}

export interface RLSEnforcement {
  table: string;
  current_status: 'isolated' | 'permissive' | 'admin_only' | 'none';
  target_status: 'isolated';
  policy_pattern: string;
}

export interface APIIsolation {
  strategy: string;
  steps: string[];
}

export interface OrganizationsTableSpec {
  columns: TableColumn[];
  rls: string;
  seed: string;
}

export interface TableColumn {
  name: string;
  type: string;
  description: string;
}

export interface MigrationPlan {
  phases: MigrationPhase[];
  rollback_strategy: string;
  zero_downtime: boolean;
}

export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  sql_changes: string[];
  code_changes: string[];
  reversible: boolean;
}

// --------------------------------------------
// Architecture Generator
// --------------------------------------------

export function generateMultiTenantArchitecture(): MultiTenantArchitecture {
  return {
    // ================================================
    // 1. ESTADO ATUAL — AUDITORIA
    // ================================================
    current_state: {
      summary:
        'Fundação multi-tenant 60% construída. Schema, indexes e RLS pattern existem. ' +
        'Falta a camada de serviço que carrega config por org, ' +
        'valida pertencimento em API calls e propaga contexto de tenant.',
      readiness_pct: 60,

      what_exists: [
        {
          item: 'organization_id em todas as tabelas de agentes',
          status: 'done',
          details:
            'teams, agent_runs, agent_steps, agent_alerts, agent_schedules, ' +
            'decision_models, system_logs, decision_audit_trail — todos têm coluna org',
        },
        {
          item: 'Indexes para queries por organização',
          status: 'done',
          details:
            '9 indexes criados: idx_teams_org, idx_agent_runs_org, idx_agent_steps_org, ' +
            'idx_agent_alerts_org, idx_agent_schedules_org, idx_decision_models_active, ' +
            'idx_decision_models_org, idx_system_logs_org_level, idx_audit_trail_org',
        },
        {
          item: 'RLS completo em agent_schedules',
          status: 'done',
          details:
            'SELECT, INSERT, UPDATE, DELETE filtrados por organization_id. ' +
            'Pattern pronto para replicar nas outras tabelas.',
        },
        {
          item: 'decision_models com versionamento por org',
          status: 'done',
          details:
            'Tabela funcional com UNIQUE(organization_id, version), ' +
            'trigger que garante apenas 1 modelo ativo por org, ' +
            'seed com defaults para org "default"',
        },
        {
          item: 'Types OrganizationConfig e OrganizationFeatures',
          status: 'done',
          details:
            'Contratos TypeScript definidos em core/decisionTypes.ts. ' +
            '8 feature flags + 2 quotas + defaults exportados.',
        },
        {
          item: 'logSink aceita organizationId',
          status: 'partial',
          details:
            'createSupabaseSink(organizationId?) aceita org como parâmetro opcional. ' +
            'Porém, nenhum endpoint passa o valor — sempre null.',
        },
      ],

      what_is_missing: [
        {
          item: 'Tabela organizations (master de tenants)',
          status: 'missing',
          details:
            'Não existe tabela central que armazena nome, plano, features e config por tenant. ' +
            'Sem isso, não há como gerenciar clientes.',
        },
        {
          item: 'Serviço de carregamento de config por org',
          status: 'missing',
          details:
            'Nenhum serviço carrega OrganizationConfig do banco. ' +
            'Feature flags e quotas existem como tipos mas nunca são verificados.',
        },
        {
          item: 'Middleware de tenant no API',
          status: 'missing',
          details:
            'API endpoints não extraem organization_id do contexto de auth. ' +
            'Queries não filtram por org. Isolamento inexistente na camada de serviço.',
        },
        {
          item: 'RLS em 6 de 8 tabelas',
          status: 'missing',
          details:
            'Apenas agent_schedules tem RLS por org. ' +
            'teams, agent_runs, agent_steps, agent_alerts, decision_models, ' +
            'system_logs e decision_audit_trail precisam do mesmo padrão.',
        },
        {
          item: 'Consistência de tipo (TEXT vs UUID)',
          status: 'missing',
          details:
            'organization_id é TEXT em teams, agent_runs, agent_steps, agent_alerts, decision_models. ' +
            'É UUID em agent_schedules, system_logs, decision_audit_trail. ' +
            'Deve ser padronizado para UUID.',
        },
        {
          item: 'Frontend org context',
          status: 'missing',
          details:
            'Nenhum TenantContext.tsx existe. ' +
            'Frontend não envia organization_id em nenhuma chamada.',
        },
      ],

      critical_fix:
        'Padronizar organization_id para UUID em todas as tabelas ' +
        'e criar tabela organizations como master de tenants.',
    },

    // ================================================
    // 2. ARQUITETURA ALVO
    // ================================================
    target_architecture: {
      principles: [
        'Isolamento absoluto: dados de um cliente nunca visíveis para outro',
        'RLS como última barreira: mesmo que API falhe, banco protege',
        'Config por tenant: cada cliente pode ter scoring, thresholds e features diferentes',
        'Quota enforcement: limites verificados antes de executar operações custosas',
        'Zero trust: toda API call deve resolver org do contexto de auth',
        'Backward compatible: org "default" funciona como single-tenant para migração gradual',
      ],

      layers: [
        {
          name: 'Database Layer',
          responsibility:
            'Isolamento via RLS — todas as tabelas filtram por organization_id. ' +
            'Tabela organizations é o master record de cada tenant.',
          isolation_mechanism:
            'RLS policies com auth.jwt() → organization_id claim. ' +
            'service_role bypass para operações internas.',
          current_status: 'partial',
          action_required:
            'Criar tabela organizations. Replicar RLS de agent_schedules para todas as tabelas. ' +
            'Padronizar organization_id para UUID.',
        },
        {
          name: 'API Layer',
          responsibility:
            'Extrair organization_id do JWT/session e passar para todas as queries. ' +
            'Verificar feature flags antes de executar operações.',
          isolation_mechanism:
            'Middleware tenantMiddleware.ts que resolve org do auth context ' +
            'e injeta em cada request handler.',
          current_status: 'missing',
          action_required:
            'Criar tenantMiddleware.ts. Modificar todos os endpoints para usar org context.',
        },
        {
          name: 'Core Layer',
          responsibility:
            'Recebe ModelConfig como parâmetro. Não sabe sobre tenants. ' +
            'Isolamento por parâmetro, não por estado global.',
          isolation_mechanism:
            'Funções puras — config é parâmetro, não import. ' +
            'runAnalysisWithConfig(inputs, financials, config) já suportado.',
          current_status: 'ready',
          action_required:
            'Nenhuma mudança. Core já aceita config dinâmico via parâmetro.',
        },
        {
          name: 'Frontend Layer',
          responsibility:
            'Resolver org do usuário logado e incluir em todas as chamadas API. ' +
            'Renderizar features condicionalmente baseado no plano.',
          isolation_mechanism:
            'TenantContext que carrega OrganizationConfig no mount e ' +
            'expõe features/quotas para componentes.',
          current_status: 'missing',
          action_required:
            'Criar TenantContext.tsx. Adicionar org_id nos headers das chamadas API. ' +
            'Condicionar Sidebar items por feature flag.',
        },
      ],

      tenant_lifecycle: [
        {
          step: 1,
          name: 'Cadastro da organização',
          description:
            'Admin cria registro em organizations com nome, plano e config inicial. ' +
            'Sistema gera UUID, cria decision_model default, e configura feature flags do plano.',
          automated: true,
        },
        {
          step: 2,
          name: 'Convite do primeiro admin',
          description:
            'Sistema envia convite por e-mail para o admin do cliente. ' +
            'Admin faz login via SSO/Google e é associado à org.',
          automated: true,
        },
        {
          step: 3,
          name: 'Onboarding (upload de DRE)',
          description:
            'Admin faz upload do DRE e mapeia plano de contas para tags. ' +
            'Sistema gera primeira análise e health score.',
          automated: true,
        },
        {
          step: 4,
          name: 'Ativação (primeira análise)',
          description:
            'Sistema executa pipeline de IA automaticamente. ' +
            'Cliente vê valor pela primeira vez.',
          automated: true,
        },
        {
          step: 5,
          name: 'Operação contínua',
          description:
            'Importações periódicas, agendamento de análises, ' +
            'gestão de equipe de IA, revisão de resultados.',
          automated: true,
        },
        {
          step: 6,
          name: 'Upgrade/Downgrade de plano',
          description:
            'Admin ou account manager altera plano. ' +
            'Feature flags e quotas atualizam imediatamente.',
          automated: true,
        },
      ],
    },

    // ================================================
    // 3. PLANOS
    // ================================================
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price_monthly_brl: 1490,
        price_annual_brl: 14304,   // 1490 * 12 * 0.80
        target_segment: 'Empresa única, 1-5 filiais, CFO hands-on',
        feature_flags: {
          enable_forecast: false,
          enable_optimization: false,
          enable_alerts: true,
          enable_trend_alerts: false,
          enable_brand_score: false,
          enable_ceo_view: false,
          enable_dre_gerencial: true,
          enable_health_score: true,
          enable_multi_objective: false,
          enable_ai_team: false,
          enable_audit_trail: false,
          enable_scheduling: false,
          enable_executive_report: false,
          enable_custom_scoring: false,
          enable_sso: false,
          enable_api_access: false,
        },
        quotas: {
          max_filiais: 5,
          max_usuarios: 5,
          max_relatorios_ia_semana: 2,
          max_historico_meses: 12,
          max_runs_pipeline_dia: 5,
          max_agents_per_team: 4,
        },
        support_level: 'E-mail (SLA 48h úteis)',
      },
      {
        id: 'pro',
        name: 'Pro',
        price_monthly_brl: 3990,
        price_annual_brl: 38304,   // 3990 * 12 * 0.80
        target_segment: 'Grupo com múltiplas marcas, 5-20 filiais, FP&A dedicado',
        feature_flags: {
          enable_forecast: true,
          enable_optimization: true,
          enable_alerts: true,
          enable_trend_alerts: true,
          enable_brand_score: true,
          enable_ceo_view: true,
          enable_dre_gerencial: true,
          enable_health_score: true,
          enable_multi_objective: false,
          enable_ai_team: true,
          enable_audit_trail: false,
          enable_scheduling: true,      // Correction 7: Pro needs scheduling for AI team
          enable_executive_report: false,
          enable_custom_scoring: false,
          enable_sso: false,
          enable_api_access: false,
        },
        quotas: {
          max_filiais: 20,
          max_usuarios: 15,
          max_relatorios_ia_semana: null,   // ilimitado
          max_historico_meses: 24,
          max_runs_pipeline_dia: 20,
          max_agents_per_team: 6,
        },
        support_level: 'Prioritário (SLA 24h úteis)',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price_monthly_brl: 9990,
        price_annual_brl: 95904,   // 9990 * 12 * 0.80
        target_segment: 'Grupo grande, 20+ filiais, auditoria e compliance',
        feature_flags: {
          enable_forecast: true,
          enable_optimization: true,
          enable_alerts: true,
          enable_trend_alerts: true,
          enable_brand_score: true,
          enable_ceo_view: true,
          enable_dre_gerencial: true,
          enable_health_score: true,
          enable_multi_objective: true,
          enable_ai_team: true,
          enable_audit_trail: true,
          enable_scheduling: true,
          enable_executive_report: true,
          enable_custom_scoring: true,
          enable_sso: true,
          enable_api_access: true,
        },
        quotas: {
          max_filiais: null,   // ilimitado
          max_usuarios: 50,
          max_relatorios_ia_semana: null,
          max_historico_meses: 60,
          max_runs_pipeline_dia: 100,
          max_agents_per_team: 10,
        },
        support_level: 'Dedicado (account manager, SLA 4h úteis)',
      },
    ],

    // ================================================
    // 4. MATRIZ DE FEATURES POR PLANO
    // ================================================
    feature_matrix: {
      features: [
        // --- Core ---
        { feature: 'DRE Gerencial consolidado', category: 'Core', starter: true, pro: true, enterprise: true },
        { feature: 'Health Score por filial', category: 'Core', starter: true, pro: true, enterprise: true },
        { feature: 'Alertas automáticos', category: 'Core', starter: true, pro: true, enterprise: true },
        { feature: 'Exportação Excel/PDF', category: 'Core', starter: true, pro: true, enterprise: true },
        // --- Análise ---
        { feature: 'Simulação de cenários', category: 'Análise', starter: false, pro: true, enterprise: true },
        { feature: 'Projeção de tendências', category: 'Análise', starter: false, pro: true, enterprise: true },
        { feature: 'Otimização de planos de ação', category: 'Análise', starter: false, pro: true, enterprise: true },
        { feature: 'Otimização multi-objetivo', category: 'Análise', starter: false, pro: false, enterprise: true },
        // --- IA ---
        { feature: 'Equipe de IA financeira', category: 'IA', starter: false, pro: true, enterprise: true },
        { feature: 'Relatório executivo automático', category: 'IA', starter: false, pro: false, enterprise: true },
        { feature: 'Agendamento de análises', category: 'IA', starter: false, pro: true, enterprise: true },
        // --- Governança ---
        { feature: 'Dashboard CEO', category: 'Governança', starter: false, pro: true, enterprise: true },
        { feature: 'Audit trail completo', category: 'Governança', starter: false, pro: false, enterprise: true },
        { feature: 'Modelo de scoring customizável', category: 'Governança', starter: false, pro: false, enterprise: true },
        // --- Enterprise ---
        { feature: 'SSO / SAML', category: 'Enterprise', starter: false, pro: false, enterprise: true },
        { feature: 'API de integração com ERP', category: 'Enterprise', starter: false, pro: false, enterprise: true },
        { feature: 'SLA de uptime 99.9%', category: 'Enterprise', starter: false, pro: false, enterprise: true },
        // --- Limites ---
        { feature: 'Filiais', category: 'Limites', starter: 'até 5', pro: 'até 20', enterprise: 'ilimitadas' },
        { feature: 'Usuários', category: 'Limites', starter: 'até 5', pro: 'até 15', enterprise: 'até 50' },
        { feature: 'Histórico', category: 'Limites', starter: '12 meses', pro: '24 meses', enterprise: '60 meses' },
        { feature: 'Relatórios IA', category: 'Limites', starter: '2/semana', pro: 'ilimitados', enterprise: 'ilimitados' },
      ],
    },

    // ================================================
    // 5. ISOLAMENTO DE DADOS
    // ================================================
    data_isolation: {
      strategy:
        'Row-Level Security (RLS) em todas as tabelas com organization_id. ' +
        'JWT claim "organization_id" como fonte de verdade. ' +
        'service_role bypass para operações internas (audit, logging, pipeline).',

      rls_enforcement: [
        { table: 'organizations', current_status: 'none', target_status: 'isolated', policy_pattern: 'SELECT own org, admin sees all. INSERT/UPDATE/DELETE admin only.' },
        { table: 'teams', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'Replicar pattern de agent_schedules: filter by org claim.' },
        { table: 'agents', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT all (config global). WRITE admin only.' },
        { table: 'agent_runs', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT/WRITE filtered by org. Admin sees all in own org.' },
        { table: 'agent_steps', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'Herda visibilidade do run pai via JOIN.' },
        { table: 'agent_alerts', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT/WRITE filtered by org.' },
        { table: 'agent_schedules', current_status: 'isolated', target_status: 'isolated', policy_pattern: 'JÁ IMPLEMENTADO — modelo para as demais.' },
        { table: 'decision_models', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT own org models. WRITE admin only.' },
        { table: 'system_logs', current_status: 'admin_only', target_status: 'isolated', policy_pattern: 'SELECT by org admin. INSERT service_role only.' },
        { table: 'decision_audit_trail', current_status: 'admin_only', target_status: 'isolated', policy_pattern: 'SELECT by org admin. INSERT service_role only. No UPDATE/DELETE.' },
        { table: 'transactions', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'WRITE filtered by org. Mais impactante — tabela principal do DRE.' },
        { table: 'manual_changes', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'WRITE filtered by org.' },
        { table: 'users', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT own org users. Admin sees all.' },
        { table: 'user_permissions', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'Herda org do user.' },
        { table: 'dre_analyses', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT/WRITE filtered by org. Análises IA vinculadas à org.' },
        { table: 'tag0_map', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT all (config compartilhada). WRITE admin only por org.' },
        { table: 'rateio_raiz_log', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'SELECT by org. INSERT service_role (pg_cron).' },
        { table: 'transactions_orcado', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'Mesmo padrão de transactions: WRITE filtered by org.' },
        { table: 'transactions_ano_anterior', current_status: 'permissive', target_status: 'isolated', policy_pattern: 'Mesmo padrão de transactions: WRITE filtered by org.' },
      ],

      api_isolation: {
        strategy:
          'Middleware tenantMiddleware.ts extrai organization_id do JWT claim. ' +
          'Todos os endpoints recebem org como parâmetro obrigatório. ' +
          'Queries adicionam WHERE organization_id = $org em todas as operações.',
        steps: [
          '1. JWT inclui claim organization_id (configurar no Supabase auth)',
          '2. tenantMiddleware.ts extrai org do auth context e valida existência',
          '3. Cada endpoint recebe orgId via middleware e passa para queries',
          '4. supabaseAdmin usa org para filtrar — RLS como segunda barreira',
          '5. Feature flag check: middleware verifica se feature está habilitada no plano',
          '6. Quota check: middleware verifica se cota não foi excedida antes de executar',
        ],
      },

      organizations_table: {
        columns: [
          { name: 'id', type: 'UUID PRIMARY KEY', description: 'Identificador único da organização' },
          { name: 'name', type: 'TEXT NOT NULL', description: 'Nome da empresa' },
          { name: 'slug', type: 'TEXT UNIQUE NOT NULL', description: 'Identificador curto (URL-friendly)' },
          { name: 'cnpj', type: 'TEXT', description: 'CNPJ da empresa (obrigatório para NF-e B2B no Brasil)' },
          { name: 'owner_user_id', type: 'UUID REFERENCES auth.users(id)', description: 'Admin principal da organização' },
          { name: 'plan_id', type: 'TEXT NOT NULL DEFAULT \'starter\'', description: 'Plano ativo: starter, pro, enterprise' },
          { name: 'plan_started_at', type: 'TIMESTAMPTZ DEFAULT now()', description: 'Início do plano atual' },
          { name: 'plan_expires_at', type: 'TIMESTAMPTZ', description: 'Expiração (null = sem expiração)' },
          { name: 'billing_cycle', type: 'TEXT DEFAULT \'monthly\'', description: 'monthly ou annual' },
          { name: 'feature_overrides', type: 'JSONB DEFAULT \'{}\'', description: 'Feature flags customizados (sobrepõe plano)' },
          { name: 'quota_overrides', type: 'JSONB DEFAULT \'{}\'', description: 'Quotas customizadas (sobrepõe plano)' },
          { name: 'settings', type: 'JSONB DEFAULT \'{}\'', description: 'Configurações gerais (logo, timezone, etc)' },
          { name: 'is_active', type: 'BOOLEAN DEFAULT true', description: 'Ativo/inativo (não deletar, só desativar)' },
          { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT now()', description: 'Data de criação' },
          { name: 'updated_at', type: 'TIMESTAMPTZ DEFAULT now()', description: 'Última atualização (trigger)' },
        ],
        rls:
          'SELECT: authenticated vê própria org. admin vê todas. ' +
          'INSERT/UPDATE/DELETE: superadmin only.',
        seed:
          'INSERT INTO organizations (id, name, slug, plan_id) ' +
          'VALUES (\'00000000-0000-0000-0000-000000000000\', \'Default (Raiz)\', \'raiz\', \'enterprise\');',
      },
    },

    // ================================================
    // 6. PLANO DE MIGRAÇÃO
    // ================================================
    migration_plan: {
      phases: [
        {
          phase: 1,
          name: 'Criar tabela organizations + padronizar org_id',
          description:
            'Criar tabela organizations com seed para org default. ' +
            'Alterar colunas TEXT organization_id para UUID com FK. ' +
            'Migrar dados existentes para org UUID default.',
          sql_changes: [
            'CREATE TABLE organizations (...)',
            'INSERT seed org (00000000-..., "Default (Raiz)", "raiz", "enterprise")',
            '-- IMPORTANTE: UPDATE antes de ALTER (TEXT "default" não converte para UUID)',
            'UPDATE teams SET organization_id = \'00000000-0000-0000-0000-000000000000\' WHERE organization_id = \'default\'',
            'UPDATE agent_runs SET organization_id = \'00000000-0000-0000-0000-000000000000\' WHERE organization_id = \'default\'',
            'UPDATE agent_steps SET organization_id = \'00000000-0000-0000-0000-000000000000\' WHERE organization_id = \'default\'',
            'UPDATE agent_alerts SET organization_id = \'00000000-0000-0000-0000-000000000000\' WHERE organization_id = \'default\'',
            'UPDATE decision_models SET organization_id = \'00000000-0000-0000-0000-000000000000\' WHERE organization_id = \'default\'',
            '-- Agora seguro converter tipo',
            'ALTER TABLE teams ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid',
            'ALTER TABLE agent_runs ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid',
            'ALTER TABLE agent_steps ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid',
            'ALTER TABLE agent_alerts ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid',
            'ALTER TABLE decision_models ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid',
            'ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) para todas',
            '-- VALIDAÇÃO: verificar que nenhum org_id ficou null',
            'SELECT COUNT(*) FROM teams WHERE organization_id IS NULL -- deve ser 0',
          ],
          code_changes: [
            'Atualizar seed scripts para usar UUID em vez de "default"',
          ],
          reversible: true,
        },
        {
          phase: 2,
          name: 'Replicar RLS para todas as tabelas',
          description:
            'Aplicar o mesmo padrão de RLS de agent_schedules para todas as tabelas com org_id. ' +
            'Adicionar organization_id nas tabelas core (transactions, users, manual_changes).',
          sql_changes: [
            'CREATE POLICY org isolation em teams, agent_runs, agent_steps, agent_alerts, decision_models',
            'ALTER TABLE transactions ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE transactions_orcado ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE transactions_ano_anterior ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE manual_changes ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE users ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE dre_analyses ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'ALTER TABLE rateio_raiz_log ADD COLUMN organization_id UUID DEFAULT \'00000000-0000-0000-0000-000000000000\'',
            'CREATE POLICY org isolation em transactions, transactions_orcado, transactions_ano_anterior, manual_changes, users, dre_analyses, rateio_raiz_log',
            'CREATE INDEX idx_transactions_org ON transactions(organization_id)',
            'CREATE INDEX idx_transactions_orcado_org ON transactions_orcado(organization_id)',
            'CREATE INDEX idx_transactions_ano_anterior_org ON transactions_ano_anterior(organization_id)',
            '-- CRITICAL: recriar dre_agg com organization_id',
            'SET statement_timeout = 0; -- OBRIGATÓRIO antes de DROP/CREATE dre_agg',
            'DROP MATERIALIZED VIEW IF EXISTS dre_agg',
            'CREATE MATERIALIZED VIEW dre_agg AS ... (incluir organization_id como coluna + GROUP BY)',
            '-- VALIDAÇÃO pós-fase',
            'SELECT COUNT(*) FROM transactions WHERE organization_id IS NULL -- deve ser 0',
            'SELECT COUNT(*) FROM dre_agg LIMIT 1 -- deve retornar > 0 (view recriada OK)',
          ],
          code_changes: [
            'Atualizar RPCs get_soma_tags, get_dre_dimension, get_dre_filter_options para filtrar por organization_id',
          ],
          reversible: true,
        },
        {
          phase: 3,
          name: 'API middleware + org context',
          description:
            'Criar tenantMiddleware.ts. Configurar JWT claim. ' +
            'Modificar endpoints para usar org context.',
          sql_changes: [],
          code_changes: [
            'Criar api/agent-team/_lib/tenantMiddleware.ts',
            'Configurar custom JWT claim organization_id no Supabase',
            'Modificar todos endpoints para extrair org do middleware',
            'Adicionar org_id em todas as queries de INSERT/SELECT',
          ],
          reversible: true,
        },
        {
          phase: 4,
          name: 'Frontend TenantContext + feature flags',
          description:
            'Criar TenantContext que carrega org config no mount. ' +
            'Condicionar features da Sidebar por plano. ' +
            'Verificar quotas antes de operações custosas.',
          sql_changes: [],
          code_changes: [
            'Criar contexts/TenantContext.tsx',
            'Criar services/organizationService.ts',
            'Modificar Sidebar.tsx para condicionar items por feature flag',
            'Modificar AgentTeamView para verificar quota antes de run',
            'Modificar ForecastingView para verificar enable_forecast',
          ],
          reversible: true,
        },
      ],

      rollback_strategy:
        'Cada fase é reversível. organization_id pode ser revertido para TEXT + "default". ' +
        'RLS policies novas podem ser dropadas sem afetar policies existentes. ' +
        'Middleware pode ser bypassed retornando org "default" fixo.',

      zero_downtime: true,
    },
  };
}

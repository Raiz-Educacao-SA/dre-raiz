// ============================================
// Onboarding Flow — Fluxo de Integração do Cliente
// Do cadastro à primeira análise em <1 hora
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface OnboardingFlow {
  overview: OnboardingOverview;
  steps: OnboardingStep[];
  time_to_value: TimeToValue;
  support_touchpoints: SupportTouchpoint[];
  success_criteria: SuccessCriterion[];
  failure_recovery: FailureRecovery[];
}

export interface OnboardingOverview {
  goal: string;
  total_steps: number;
  estimated_time_minutes: number;
  requires_technical_knowledge: boolean;
  self_service: boolean;
  fallback_to_human: string;
}

export interface OnboardingStep {
  step: number;
  name: string;
  description: string;
  user_action: string;
  system_action: string;
  estimated_minutes: number;
  can_skip: boolean;
  blocking: boolean;
  ui_component: string;
  validations: string[];
  success_indicator: string;
  help_content: string;
}

export interface TimeToValue {
  target_minutes: number;
  first_wow_moment: string;
  wow_moment_step: number;
  value_reinforcement: string[];
}

export interface SupportTouchpoint {
  trigger: string;
  channel: string;
  response_sla: string;
  automated: boolean;
}

export interface SuccessCriterion {
  criterion: string;
  measurement: string;
  target: string;
}

export interface FailureRecovery {
  failure_point: string;
  detection: string;
  recovery_action: string;
  fallback: string;
}

// --------------------------------------------
// Onboarding Flow Generator
// --------------------------------------------

export function generateOnboardingFlow(): OnboardingFlow {
  return {
    // ================================================
    // VISÃO GERAL
    // ================================================
    overview: {
      goal:
        'Levar o cliente do cadastro à primeira análise completa do DRE ' +
        'em menos de 1 hora, sem precisar de conhecimento técnico. ' +
        'O cliente deve perceber valor em <15 minutos (micro-DRE no upload).',
      total_steps: 7,
      estimated_time_minutes: 50,  // 3+5+3+15+7+5+2 = 40 + 10 min buffer
      requires_technical_knowledge: false,
      self_service: true,
      fallback_to_human:
        'Se o cliente não completar em 24h, sistema dispara alerta interno. ' +
        'Account manager (Enterprise) ou e-mail automatizado (Starter/Pro) ' +
        'oferece sessão guiada de 30 minutos via vídeo-chamada.',
    },

    // ================================================
    // 7 STEPS DO ONBOARDING
    // ================================================
    steps: [
      // ─────────────────────────────────────────
      // Step 1: Cadastro da Empresa
      // ─────────────────────────────────────────
      {
        step: 1,
        name: 'Cadastro da empresa',
        description:
          'Cliente cria conta e registra dados básicos da empresa. ' +
          'Sistema cria organização, configura plano e gera convite.',
        user_action:
          'Preenche formulário: nome da empresa, CNPJ (opcional no trial), ' +
          'nome do admin, e-mail corporativo. Escolhe plano ou inicia trial de 14 dias.',
        system_action:
          '1. Cria registro em organizations (UUID, slug automático, plano selecionado)\n' +
          '2. Cria usuário admin (owner_user_id) via Firebase + Supabase auth\n' +
          '3. Aplica feature flags e quotas do plano escolhido\n' +
          '4. Cria decision_model default para a org\n' +
          '5. Envia e-mail de boas-vindas com link de acesso',
        estimated_minutes: 3,
        can_skip: false,
        blocking: true,
        ui_component: 'OnboardingSignup.tsx',
        validations: [
          'E-mail corporativo válido (não aceitar @gmail, @hotmail, etc. em Enterprise)',
          'Nome da empresa com mínimo 3 caracteres',
          'CNPJ válido se preenchido (check digit)',
          'Aceite dos termos de uso',
        ],
        success_indicator: 'Usuário logado e redirecionado para o wizard de onboarding',
        help_content:
          'Dica: use seu e-mail corporativo. Você poderá convidar colegas depois. ' +
          'O trial de 14 dias é gratuito e não exige cartão de crédito.',
      },

      // ─────────────────────────────────────────
      // Step 2: Upload do DRE
      // ─────────────────────────────────────────
      {
        step: 2,
        name: 'Upload do DRE',
        description:
          'Cliente faz upload da planilha Excel com os dados financeiros. ' +
          'Sistema detecta estrutura automaticamente e mostra preview.',
        user_action:
          'Arrasta arquivo Excel (.xlsx/.xls/.csv) para a área de upload. ' +
          'Visualiza preview das primeiras 20 linhas para confirmar que é o arquivo correto.',
        system_action:
          '1. Valida formato do arquivo (Excel/CSV, max 50MB)\n' +
          '2. Detecta encoding (UTF-8, Latin-1) automaticamente\n' +
          '3. Parse das colunas: identifica candidatas para data, valor, descrição, conta\n' +
          '4. Mostra preview com as 20 primeiras linhas\n' +
          '5. Salva arquivo raw em storage (Supabase Storage) para auditoria\n' +
          '6. Contabiliza: total de linhas, período detectado, colunas encontradas\n' +
          '7. MICRO-DRE INSTANTÂNEO: com heurística rápida (valores positivos = receita, ' +
          'negativos = custos), exibe card com receita estimada, custos estimados e EBITDA estimado. ' +
          'Mesmo impreciso, dá ao cliente o primeiro "gostinho" do valor em ~8 minutos.',
        estimated_minutes: 5,
        can_skip: false,
        blocking: true,
        ui_component: 'OnboardingUpload.tsx',
        validations: [
          'Arquivo não vazio',
          'Formato válido (.xlsx, .xls, .csv)',
          'Tamanho máximo 50MB',
          'Mínimo de 3 colunas detectadas',
          'Pelo menos 10 linhas de dados',
          'Pelo menos 1 coluna numérica detectada (candidata a valor)',
        ],
        success_indicator:
          'Preview exibido com contagem de linhas e período. ' +
          'Micro-DRE estimado visível (receita, custos, EBITDA aproximados). ' +
          'Botão "Mapear colunas" habilitado.',
        help_content:
          'Aceitamos Excel (.xlsx) ou CSV. O arquivo deve ter colunas como: ' +
          'data, descrição, valor, conta contábil, filial. ' +
          'Não precisa estar no formato exato — nosso sistema identifica automaticamente.',
      },

      // ─────────────────────────────────────────
      // Step 3: Mapeamento de Colunas (rápido)
      // ─────────────────────────────────────────
      {
        step: 3,
        name: 'Mapeamento de colunas',
        description:
          'Sistema detecta automaticamente quais colunas do arquivo correspondem a ' +
          'data, valor, descrição, conta contábil, filial e marca. ' +
          'Cliente confirma ou ajusta em poucos cliques.',
        user_action:
          'Revisa mapeamento sugerido: qual coluna é valor, data, descrição, ' +
          'conta contábil, filial, marca. ' +
          'Se o sistema acertou (indicado por ícone verde), basta clicar "Confirmar". ' +
          'Se não, seleciona a coluna correta via dropdown.',
        system_action:
          '1. Auto-detecção de colunas por heurística:\n' +
          '   - Coluna com datas → data\n' +
          '   - Coluna numérica com maior variância → valor\n' +
          '   - Coluna texto com mais valores únicos → descrição\n' +
          '   - Coluna com padrão numérico estruturado → conta contábil\n' +
          '2. Exibe sugestão com indicador de confiança (verde/amarelo/vermelho)\n' +
          '3. Após confirmação, dispara classificação de contas (Step 4)',
        estimated_minutes: 3,
        can_skip: false,
        blocking: true,
        ui_component: 'OnboardingColumnMapping.tsx',
        validations: [
          'Coluna de valor mapeada (obrigatória)',
          'Coluna de data mapeada (obrigatória)',
          'Pelo menos 1 coluna de texto mapeada (descrição ou conta)',
        ],
        success_indicator:
          'Todas as colunas essenciais mapeadas com ícone verde. ' +
          'Loading spinner inicia auto-classificação das contas.',
        help_content:
          'Nosso sistema detectou automaticamente suas colunas. ' +
          'Colunas com ícone verde foram identificadas com confiança. ' +
          'Se algo estiver errado, basta selecionar a coluna correta no dropdown.',
      },

      // ─────────────────────────────────────────
      // Step 4: Classificação de Contas
      // ─────────────────────────────────────────
      {
        step: 4,
        name: 'Classificação de contas',
        description:
          'Sistema classifica automaticamente cada conta contábil em categorias do DRE ' +
          '(Receita, Custos Variáveis, Custos Fixos, Despesas SG&A, Rateio). ' +
          'Cliente revisa e ajusta arrastando contas entre categorias. ' +
          'Preview do DRE atualiza em tempo real.',
        user_action:
          'Revisa a classificação sugerida para cada conta contábil. ' +
          'Contas já classificadas aparecem agrupadas por categoria com somas. ' +
          'Para corrigir, arrasta a conta para a categoria correta. ' +
          'O preview do DRE atualiza automaticamente a cada mudança. ' +
          'Foca nas contas de maior valor primeiro (ordenadas por volume).',
        system_action:
          '1. Para cada conta contábil única, sugere categoria baseado em:\n' +
          '   - Padrão do plano de contas (ex: contas 3.x → custos)\n' +
          '   - Banco de mapeamentos de clientes anteriores do mesmo setor\n' +
          '   - Análise de keywords no nome da conta (receita, folha, aluguel, marketing)\n' +
          '2. Exibe agrupamento visual por categoria com somas para validação\n' +
          '3. Calcula DRE preview em tempo real a cada reclassificação\n' +
          '4. Destaca contas de alto impacto (>5% da receita) que precisam de atenção',
        estimated_minutes: 15,
        can_skip: false,
        blocking: true,
        ui_component: 'OnboardingAccountClassification.tsx',
        validations: [
          'Pelo menos 1 conta classificada como Receita',
          'Pelo menos 1 conta classificada como Custo (Variável, Fixo ou SG&A)',
          'Todas as contas com classificação definida (nenhuma sem categoria)',
          'Preview de DRE mostra valores coerentes (receita > 0)',
        ],
        success_indicator:
          'DRE preview completo exibido com receita, custos e EBITDA calculados. ' +
          'Cliente vê seus números reais organizados no formato DRE gerencial.',
        help_content:
          'Nosso sistema sugeriu a classificação de cada conta contábil. ' +
          'Revise as sugestões — basta arrastar uma conta para mudar de categoria. ' +
          'O preview do DRE atualiza em tempo real conforme você ajusta. ' +
          'Dica: foque nas contas de maior valor primeiro — elas estão no topo da lista.',
      },

      // ─────────────────────────────────────────
      // Step 5: Configuração e Importação
      // ─────────────────────────────────────────
      {
        step: 5,
        name: 'Configuração e importação',
        description:
          'Cliente configura filiais, marcas e preferências básicas. ' +
          'Sistema importa os dados e gera o DRE completo.',
        user_action:
          'Confirma lista de filiais detectadas no arquivo. ' +
          'Opcionalmente agrupa filiais por marca. ' +
          'Define mês de referência (orçado vs realizado). ' +
          'Clica "Importar dados" e aguarda processamento (barra de progresso visível). ' +
          'Pode sair e voltar — receberá notificação quando concluir.',
        system_action:
          '1. Valida dados contra mapeamento aprovado\n' +
          '2. INSERT em transactions com organization_id da org\n' +
          '3. Trigger trg_auto_tag0 popula tag0 via tag0_map\n' +
          '4. Calcula DRE real via get_soma_tags\n' +
          '5. REFRESH MATERIALIZED VIEW dre_agg (com statement_timeout=0)\n' +
          '6. Gera Health Score para cada filial\n' +
          '7. Detecta alertas automáticos\n' +
          '8. Exibe dashboard com resumo: filiais, período, receita total, EBITDA',
        estimated_minutes: 7,
        can_skip: false,
        blocking: true,
        ui_component: 'OnboardingConfig.tsx',
        validations: [
          'Pelo menos 1 filial confirmada',
          'Importação concluída sem erros (< 5% de registros rejeitados)',
          'DRE gerencial gerado com valores > 0 em receita',
          'Health Score calculado para pelo menos 1 filial',
        ],
        success_indicator:
          'Dashboard com DRE completo, Health Score e alertas. ' +
          'Cliente vê a saúde financeira de suas filiais pela primeira vez.',
        help_content:
          'Estamos importando seus dados. Isso leva menos de 1 minuto para até 50.000 linhas. ' +
          'Ao final, você verá seu DRE consolidado com score de saúde por filial. ' +
          'Pode sair desta página — enviaremos uma notificação quando estiver pronto.',
      },

      // ─────────────────────────────────────────
      // Step 6: Primeira Análise Automática
      // ─────────────────────────────────────────
      {
        step: 6,
        name: 'Primeira análise automática',
        description:
          'Sistema executa o pipeline de IA automaticamente e entrega ' +
          'a primeira análise narrativa do DRE do cliente.',
        user_action:
          'Assiste ao pipeline de IA executando em tempo real (polling visual). ' +
          'Lê o relatório gerado. ' +
          'Opcionalmente aprova ou solicita revisão dos insights.',
        system_action:
          '1. Dispara POST /api/agent-team/run-pipeline automaticamente\n' +
          '2. Pipeline executa 4 steps (~2 minutos):\n' +
          '   - Step 1: Supervisor planeja análise\n' +
          '   - Step 2: Analista de qualidade verifica dados\n' +
          '   - Step 3: Analista de performance avalia resultados\n' +
          '   - Step 4: Supervisor consolida relatório\n' +
          '3. Exibe progresso step-by-step com indicadores visuais\n' +
          '4. Entrega relatório final com: diagnóstico, alertas, recomendações\n' +
          '5. Registra audit trail da primeira análise',
        estimated_minutes: 5,
        can_skip: true,
        blocking: false,
        ui_component: 'OnboardingFirstAnalysis.tsx',
        validations: [
          'Pipeline completou com status "completed" (não "failed")',
          'Relatório final gerado com pelo menos 200 palavras',
          'Pelo menos 1 insight acionável no relatório',
        ],
        success_indicator:
          'Relatório narrativo exibido com diagnóstico e recomendações. ' +
          'Banner de "Parabéns! Seu primeiro relatório está pronto."',
        help_content:
          'Nossa equipe de IA está analisando seus dados financeiros. ' +
          'Cada especialista examina um aspecto: qualidade dos dados, performance financeira ' +
          'e recomendações de ação. O relatório completo fica pronto em cerca de 2 minutos.',
      },

      // ─────────────────────────────────────────
      // Step 7: Próximos Passos + Convite de Equipe
      // ─────────────────────────────────────────
      {
        step: 7,
        name: 'Próximos passos e convite de equipe',
        description:
          'Sistema sugere ações para o cliente começar a usar a plataforma no dia-a-dia. ' +
          'Oferece convite de colegas de equipe. Marca onboarding como concluído.',
        user_action:
          'Vê checklist de próximos passos sugeridos:\n' +
          '- Explorar o DRE completo (link direto)\n' +
          '- Convidar colegas (Controller, Gerente de FP&A, CEO)\n' +
          '- Configurar alertas automáticos\n' +
          '- Agendar análise semanal recorrente (se plano permitir)\n' +
          'Opcionalmente envia convites por e-mail para colegas.',
        system_action:
          '1. Exibe checklist de onboarding com progresso visual\n' +
          '2. Formulário de convite de equipe (nome + e-mail + papel)\n' +
          '3. Envia convites via Firebase + associa à mesma org\n' +
          '4. Marca onboarding como concluído\n' +
          '5. Redireciona para DRE Gerencial (tela principal)',
        estimated_minutes: 2,
        can_skip: true,
        blocking: false,
        ui_component: 'OnboardingNextSteps.tsx',
        validations: [],
        success_indicator:
          'Cliente redirecionado para DRE Gerencial. ' +
          'Badge de "Onboarding completo" visível no perfil.',
        help_content:
          'Parabéns! Seu ambiente está configurado. ' +
          'Convide colegas para que toda a equipe financeira tenha acesso. ' +
          'Quanto mais pessoas usarem, mais valor você extrai da plataforma.',
      },
    ],

    // ================================================
    // TIME-TO-VALUE
    // ================================================
    time_to_value: {
      target_minutes: 10,
      first_wow_moment:
        'Step 2 (Upload) — ~8 minutos após o cadastro. Quando o upload termina, ' +
        'o sistema exibe um micro-DRE instantâneo com receita, custos e EBITDA estimados. ' +
        'Mesmo impreciso, o cliente vê que o sistema "entendeu" seus dados. ' +
        'Segundo wow moment no Step 4 (classificação), quando o DRE preciso aparece (~25 min).',
      wow_moment_step: 2,
      value_reinforcement: [
        'Step 2: Micro-DRE instantâneo → "O sistema já entendeu meus dados!" (~8 min)',
        'Step 4: DRE preciso com classificação → "Meus dados organizados no formato certo!" (~25 min)',
        'Step 5: Health Score por filial → "Agora sei quais filiais estão em risco!" (~32 min)',
        'Step 6: Relatório de IA → "Recebi um relatório que meu analista levaria 2 dias!" (~37 min)',
        'Step 7: Convite de equipe → "Minha equipe toda pode acessar!" (~40 min)',
        'Dia 2: E-mail com "Seu DRE foi atualizado" → reforça hábito de uso',
        'Dia 7: E-mail com "Tendência detectada" → mostra valor preditivo',
        'Dia 14: E-mail com resumo semanal → consolida percepção de valor antes do fim do trial',
      ],
    },

    // ================================================
    // TOUCHPOINTS DE SUPORTE
    // ================================================
    support_touchpoints: [
      {
        trigger: 'Cliente parou no Step 2 (upload) por mais de 10 minutos',
        channel: 'Chat in-app com sugestão contextual',
        response_sla: 'Imediato (automático)',
        automated: true,
      },
      {
        trigger: 'Erro de importação (formato, encoding, estrutura)',
        channel: 'Modal de ajuda com exemplos de formato aceito + link para template',
        response_sla: 'Imediato (automático)',
        automated: true,
      },
      {
        trigger: 'Cliente não completou onboarding em 24h',
        channel: 'E-mail automatizado oferecendo sessão de setup guiado (30 min)',
        response_sla: '< 4h úteis para resposta humana se necessário',
        automated: true,
      },
      {
        trigger: 'Cliente Enterprise criou conta',
        channel: 'Ligação do account manager em até 2h úteis',
        response_sla: '2h úteis',
        automated: false,
      },
      {
        trigger: 'Mapeamento tem mais de 50% das contas sem classificação após auto-detecção',
        channel: 'Oferece opção "Preciso de ajuda" que agenda call de 15 min com suporte. Vídeo-tutorial interativo como bridge imediata.',
        response_sla: '< 4h úteis (humano), imediato (vídeo-tutorial)',
        automated: false,
      },
      {
        trigger: 'Pipeline de IA falhou na primeira análise',
        channel: 'Retry automático + notificação interna para eng on-call',
        response_sla: '< 1h (retry automático), < 4h (humano se retry falhar)',
        automated: true,
      },
      {
        trigger: 'Importação travou ou está demorando mais de 3 minutos (Step 5)',
        channel: 'Barra de progresso com mensagem "Processando dados grandes leva mais tempo" + opção de notificação',
        response_sla: 'Imediato (automático)',
        automated: true,
      },
    ],

    // ================================================
    // CRITÉRIOS DE SUCESSO
    // ================================================
    success_criteria: [
      {
        criterion: 'Taxa de conclusão do onboarding',
        measurement: '% de trials que completam os 7 steps em 48h',
        target: 'v1: > 50% | meta madura: > 70%',
      },
      {
        criterion: 'Time-to-first-wow',
        measurement: 'Minutos entre cadastro e micro-DRE exibido (step 2)',
        target: '< 10 minutos',
      },
      {
        criterion: 'Time-to-first-DRE',
        measurement: 'Minutos entre cadastro e DRE completo visível (step 5)',
        target: '< 45 minutos',
      },
      {
        criterion: 'Time-to-first-insight',
        measurement: 'Minutos entre cadastro e primeiro relatório de IA (step 6)',
        target: '< 60 minutos',
      },
      {
        criterion: 'Precisão do auto-mapeamento',
        measurement: '% de contas classificadas corretamente na sugestão automática',
        target: 'v1: > 65% | meta madura: > 80%',
      },
      {
        criterion: 'Satisfação pós-onboarding',
        measurement: 'NPS ou CSAT coletado no final do step 7',
        target: 'NPS > 40',
      },
      {
        criterion: 'Conversão trial → pago',
        measurement: '% de trials que viram assinantes pagos em 30 dias',
        target: '> 25%',
      },
    ],

    // ================================================
    // RECUPERAÇÃO DE FALHAS
    // ================================================
    failure_recovery: [
      {
        failure_point: 'Cadastro falha (Step 1)',
        detection: 'Erro retornado no signup — Firebase auth fail, e-mail duplicado, ou CNPJ já em uso',
        recovery_action:
          'Mensagem clara por tipo de erro:\n' +
          '- "Este e-mail já está cadastrado" → link para login\n' +
          '- "CNPJ já em uso por outra organização" → link para contatar suporte\n' +
          '- "Erro de autenticação" → retry com Google SSO ou e-mail/senha',
        fallback:
          'Se falhar 3x: formulário simplificado (só e-mail + nome) e suporte cria a org manualmente.',
      },
      {
        failure_point: 'Upload falha (arquivo corrompido ou formato inválido)',
        detection: 'Erro retornado no parse — sistema exibe mensagem clara',
        recovery_action:
          'Mostra mensagem com formato esperado + link para baixar template Excel. ' +
          'Oferece opção de upload CSV como alternativa.',
        fallback:
          'Se falhar 3x: oferece "Enviar arquivo por e-mail para nosso time configurar para você"',
      },
      {
        failure_point: 'Mapeamento automático falha (plano de contas muito diferente)',
        detection: '< 50% das contas classificadas automaticamente',
        recovery_action:
          'Exibe todas as contas sem classificação em lista. ' +
          'Oferece drag-and-drop para classificação manual. ' +
          'Mostra exemplos de cada categoria para orientar.',
        fallback:
          'Botão "Preciso de ajuda" agenda sessão de 15 minutos com suporte',
      },
      {
        failure_point: 'Importação falha (dados inconsistentes)',
        detection: 'INSERT com erro — registros rejeitados > 5%',
        recovery_action:
          'Exibe lista de registros rejeitados com motivo. ' +
          'Oferece opções: "Ignorar rejeitados e continuar" ou "Corrigir e reimportar".',
        fallback:
          'Exporta lista de erros em Excel para o cliente corrigir off-line',
      },
      {
        failure_point: 'Pipeline de IA falha na primeira análise',
        detection: 'agent_run.status = "failed" no polling',
        recovery_action:
          'Retry automático 1x. Se falhar novamente, exibe: ' +
          '"Sua análise está sendo processada. Você receberá um e-mail quando estiver pronta."',
        fallback:
          'Redireciona para o DRE já importado (step 4 concluído) — ' +
          'cliente pode explorar dados mesmo sem IA. ' +
          'Alerta interno para o time de engenharia.',
      },
      {
        failure_point: 'Cliente abandona o onboarding antes de completar',
        detection: 'Último step completado < 5, última atividade > 24h',
        recovery_action:
          'E-mail automatizado com deeplink para retomar de onde parou. ' +
          'Dados já enviados ficam preservados — não precisa recomeçar.',
        fallback:
          'Se não retomar em 7 dias: e-mail pessoal do fundador/account manager ' +
          'perguntando o que travou e oferecendo ajuda.',
      },
    ],
  };
}

import type {
  Team,
  Agent,
  TeamAgent,
  AgentRun,
  AgentStep,
  AgentSchedule,
  RunPipelineResponse,
  GetRunResponse,
  ListRunsResponse,
  FinancialSummary,
  VendorBreakdown,
} from '../types/agentTeam';
import {
  getZodSchemaForStep,
  getJsonSchemaForStep,
} from '../types/agentTeamSchemas';
import { buildPrompt } from '../api/agent-team/_lib/agentPrompts';
import { buildFinancialSummary } from '../api/agent-team/_lib/buildFinancialSummary';
import { supabase } from '../supabase';

// --------------------------------------------
// Leitura direta do Supabase (dados públicos via RLS)
// --------------------------------------------

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) {
    console.error('❌ getTeams:', error);
    return [];
  }
  return data as Team[];
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true)
    .order('code');
  if (error) {
    console.error('❌ getAgents:', error);
    return [];
  }
  return data as Agent[];
}

export async function getTeamAgents(teamId: string): Promise<(TeamAgent & { agent: Agent })[]> {
  const { data, error } = await supabase
    .from('team_agents')
    .select('*, agents!inner(*)')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('step_order');
  if (error) {
    console.error('❌ getTeamAgents:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    ...row,
    agent: row.agents,
    agents: undefined,
  }));
}

// --------------------------------------------
// Agent Schedules (Supabase direto — admin RLS)
// --------------------------------------------

export async function getSchedules(teamId?: string): Promise<AgentSchedule[]> {
  let query = supabase
    .from('agent_schedules')
    .select('*')
    .order('name');

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getSchedules:', error);
    return [];
  }
  return data as AgentSchedule[];
}

export async function createSchedule(schedule: Omit<AgentSchedule, 'id' | 'created_at' | 'updated_at' | 'next_run_at' | 'last_run_at' | 'organization_id'>): Promise<AgentSchedule | null> {
  const { data, error } = await supabase
    .from('agent_schedules')
    .insert(schedule)
    .select()
    .single();
  if (error) {
    console.error('createSchedule:', error);
    throw new Error(error.message);
  }
  return data as AgentSchedule;
}

export async function updateSchedule(id: string, updates: Partial<Pick<AgentSchedule, 'name' | 'objective_template' | 'frequency' | 'execution_time' | 'timezone' | 'day_of_week' | 'day_of_month' | 'is_active' | 'filter_context'>>): Promise<AgentSchedule | null> {
  const { data, error } = await supabase
    .from('agent_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateSchedule:', error);
    throw new Error(error.message);
  }
  return data as AgentSchedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('agent_schedules')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteSchedule:', error);
    throw new Error(error.message);
  }
}

// ============================================
// Pipeline operations — client-side
// ============================================

// --------------------------------------------
// getRun — Supabase direto
// --------------------------------------------

export async function getRun(runId: string): Promise<GetRunResponse> {
  const [runResult, stepsResult] = await Promise.all([
    supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single(),
    supabase
      .from('agent_steps')
      .select('*')
      .eq('run_id', runId)
      .order('step_order', { ascending: true }),
  ]);

  if (runResult.error) throw new Error(`Erro ao buscar run: ${runResult.error.message}`);
  if (stepsResult.error) throw new Error(`Erro ao buscar steps: ${stepsResult.error.message}`);

  return {
    run: runResult.data as AgentRun,
    steps: (stepsResult.data || []) as AgentStep[],
  };
}

// --------------------------------------------
// listRuns — Supabase direto
// --------------------------------------------

export async function listRuns(limit = 20): Promise<ListRunsResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, team_id, objective, status, started_by, started_by_name, started_at, completed_at, consolidated_summary')
    .order('started_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error('❌ listRuns:', error);
    throw new Error(`Erro ao listar runs: ${error.message}`);
  }

  return { runs: (data || []) as AgentRun[] };
}

// --------------------------------------------
// testSingleAgent — roda 1 agente isolado (sem gravar no banco)
// --------------------------------------------

export interface SingleAgentTestResult {
  agentCode: string;
  stepType: string;
  output: Record<string, unknown>;
  rawText: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
  durationMs: number;
  zodValid: boolean;
  zodErrors?: string[];
}

export async function testSingleAgent(
  agentCode: string,
  stepType: string,
  objective: string,
  dreSnapshot: Record<string, unknown>[],
  filterContext: Record<string, unknown>,
): Promise<SingleAgentTestResult> {
  const startTime = Date.now();

  // 1. Build financial summary
  const financialSummary = buildFinancialSummary(dreSnapshot as any[]);

  // 2. Build prompts
  const { system, user } = buildPrompt(
    agentCode,
    stepType,
    objective,
    financialSummary,
    [], // sem outputs anteriores no teste isolado
    filterContext,
  );

  console.log(`🧪 Teste ${agentCode}/${stepType} — system=${system.length}chars user=${user.length}chars`);

  // 3. Call Claude
  const isConsolidation = stepType === 'consolidate' || stepType === 'review';
  const claudeResult = await callClaudeViaProxy(system, user, isConsolidation, agentCode);

  // 4. Validate with Zod
  const zodSchema = getZodSchemaForStep(stepType, agentCode);
  const parseResult = zodSchema.safeParse(claudeResult.parsed);

  const durationMs = Date.now() - startTime;
  console.log(`🧪 Teste ${agentCode}/${stepType} concluído em ${durationMs}ms — zod=${parseResult.success ? '✅' : '⚠️'}`);

  return {
    agentCode,
    stepType,
    output: parseResult.success ? parseResult.data : claudeResult.parsed,
    rawText: claudeResult.rawText,
    tokensInput: claudeResult.tokensInput,
    tokensOutput: claudeResult.tokensOutput,
    model: claudeResult.model,
    durationMs,
    zodValid: parseResult.success,
    zodErrors: parseResult.success ? undefined : parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}

// --------------------------------------------
// testPipelineUpTo — roda pipeline sequencial até um agente-alvo (sem gravar no banco)
// --------------------------------------------

export interface PipelineTestResult {
  steps: SingleAgentTestResult[];
  totalDurationMs: number;
}

/** Define a ordem da pipeline de teste */
const TEST_PIPELINE_STEPS: { agentCode: string; stepType: string }[] = [
  { agentCode: 'alex', stepType: 'plan' },
  { agentCode: 'bruna', stepType: 'execute' },
  { agentCode: 'carlos', stepType: 'execute' },
  { agentCode: 'denilson', stepType: 'execute' },
  { agentCode: 'edmundo', stepType: 'execute' },
  { agentCode: 'falcao', stepType: 'execute' },
  { agentCode: 'alex', stepType: 'consolidate' },
  { agentCode: 'executivo', stepType: 'review' },
];

export async function testPipelineUpTo(
  targetAgentCode: string,
  objective: string,
  dreSnapshot: Record<string, unknown>[],
  filterContext: Record<string, unknown>,
  onStepComplete?: (result: SingleAgentTestResult, stepIndex: number, total: number) => void,
): Promise<PipelineTestResult> {
  const startTime = Date.now();
  const financialSummary = buildFinancialSummary(dreSnapshot as any[]);

  // Determinar até qual step rodar
  const targetIdx = TEST_PIPELINE_STEPS.findIndex(
    s => s.agentCode === targetAgentCode && (targetAgentCode !== 'alex' || s.stepType !== 'consolidate')
  );
  if (targetIdx === -1) throw new Error(`Agente "${targetAgentCode}" não encontrado na pipeline`);

  const stepsToRun = TEST_PIPELINE_STEPS.slice(0, targetIdx + 1);
  const results: SingleAgentTestResult[] = [];
  const prevOutputs: { agent_code: string; step_type: string; output_data: Record<string, unknown> }[] = [];

  for (let i = 0; i < stepsToRun.length; i++) {
    const step = stepsToRun[i];
    const stepStart = Date.now();

    console.log(`🧪 Pipeline [${i + 1}/${stepsToRun.length}] ${step.agentCode}/${step.stepType}...`);

    const { system, user } = buildPrompt(
      step.agentCode,
      step.stepType,
      objective,
      financialSummary,
      prevOutputs,
      filterContext,
    );

    const isConsolidation = step.stepType === 'consolidate' || step.stepType === 'review';
    const claudeResult = await callClaudeViaProxy(system, user, isConsolidation, step.agentCode);

    const zodSchema = getZodSchemaForStep(step.stepType, step.agentCode);
    const parseResult = zodSchema.safeParse(claudeResult.parsed);

    const durationMs = Date.now() - stepStart;
    console.log(`🧪 Pipeline [${i + 1}/${stepsToRun.length}] ${step.agentCode}/${step.stepType} — ${durationMs}ms — zod=${parseResult.success ? '✅' : '⚠️'}`);

    const result: SingleAgentTestResult = {
      agentCode: step.agentCode,
      stepType: step.stepType,
      output: parseResult.success ? parseResult.data : claudeResult.parsed,
      rawText: claudeResult.rawText,
      tokensInput: claudeResult.tokensInput,
      tokensOutput: claudeResult.tokensOutput,
      model: claudeResult.model,
      durationMs,
      zodValid: parseResult.success,
      zodErrors: parseResult.success ? undefined : parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    };

    results.push(result);
    prevOutputs.push({ agent_code: step.agentCode, step_type: step.stepType, output_data: result.output });

    if (onStepComplete) onStepComplete(result, i, stepsToRun.length);
  }

  return { steps: results, totalDurationMs: Date.now() - startTime };
}

// --------------------------------------------
// startPipeline — client-side (Supabase direto)
// --------------------------------------------

export async function startPipeline(
  teamId: string,
  objective: string,
  dreSnapshot: Record<string, unknown>[],
  filterContext: Record<string, unknown>,
  startedBy: string,
  startedByName: string
): Promise<RunPipelineResponse> {
  // 1. Buscar team_agents ativos
  const { data: teamAgents, error: taError } = await supabase
    .from('team_agents')
    .select('step_order, step_type, agents!inner(code, name)')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('step_order', { ascending: true });

  if (taError) throw new Error(`Erro ao buscar composição do time: ${taError.message}`);
  if (!teamAgents || teamAgents.length === 0) throw new Error('Time não possui agentes ativos configurados');

  // 2. buildFinancialSummary client-side
  const financialSummary = buildFinancialSummary(dreSnapshot as any[]);

  // 2b. Enriquecer com top fornecedores por tag01 (via get_dre_dimension existente)
  try {
    const topTag01s = [
      ...financialSummary.top5_tags01_receita.map(t => t.tag01),
      ...financialSummary.top5_tags01_custo.map(t => t.tag01),
    ];
    const uniqueTag01s = [...new Set(topTag01s)];

    if (uniqueTag01s.length > 0) {
      const fc = filterContext as Record<string, any> | null;
      const year = fc?.year || new Date().getFullYear();
      const monthFrom = fc?.months_range ? `${year}-01` : null;
      const monthTo = fc?.months_range ? `${year}-12` : null;

      const vendorPromises = uniqueTag01s.map(async (tag01): Promise<VendorBreakdown[]> => {
        const { data } = await supabase.rpc('get_dre_dimension', {
          p_month_from: monthFrom,
          p_month_to: monthTo,
          p_conta_contabils: null,
          p_scenario: 'Real',
          p_dimension: 'vendor',
          p_marcas: (fc?.marcas as string[]) || null,
          p_nome_filiais: (fc?.filiais as string[]) || null,
          p_tags01: [tag01],
          p_tags02: null,
          p_tags03: null,
          p_tag0: null,
          p_recurring: null,
        });

        if (!data || data.length === 0) return [];

        // Agregar por vendor (somando todos os meses) e pegar top 3
        const vendorTotals: Record<string, number> = {};
        for (const row of data as any[]) {
          const v = row.dimension_value || '';
          if (!v || v === 'N/A') continue;
          vendorTotals[v] = (vendorTotals[v] || 0) + Number(row.total_amount);
        }

        return Object.entries(vendorTotals)
          .filter(([v]) => v.trim() !== '')
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          .slice(0, 3)
          .map(([vendor, total]) => ({
            tag01,
            vendor,
            total_real: Math.round(total * 100) / 100,
          }));
      });

      const vendorResults = await Promise.all(vendorPromises);
      financialSummary.top_fornecedores_por_tag01 = vendorResults.flat();
      console.log(`✅ Vendor data: ${financialSummary.top_fornecedores_por_tag01.length} entries para ${uniqueTag01s.length} tag01s`);
    }
  } catch (err) {
    console.warn('⚠️ Falha ao buscar vendor data (pipeline continua sem):', err);
    financialSummary.top_fornecedores_por_tag01 = [];
  }

  // 3. Criar agent_run
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      team_id: teamId,
      objective,
      status: 'running',
      dre_data_snapshot: dreSnapshot,
      financial_summary: financialSummary,
      filter_context: filterContext || null,
      started_by: startedBy,
      started_by_name: startedByName || null,
    })
    .select('id')
    .single();

  if (runError || !run) throw new Error(`Erro ao criar run: ${runError?.message}`);

  // 4. Criar agent_steps
  const steps = teamAgents.map((ta: any) => ({
    run_id: run.id,
    agent_code: ta.agents.code,
    step_type: ta.step_type,
    step_order: ta.step_order,
    status: 'pending',
    review_status: 'pending',
  }));

  const { error: stepsError } = await supabase
    .from('agent_steps')
    .insert(steps);

  if (stepsError) {
    await supabase.from('agent_runs').delete().eq('id', run.id);
    throw new Error(`Erro ao criar steps: ${stepsError.message}`);
  }

  // 5. Disparar processamento do primeiro step (fire-and-forget)
  processNextStep(run.id).catch((err) => {
    console.error('❌ Auto-process first step failed:', err);
  });

  return { runId: run.id };
}

// --------------------------------------------
// processNextStep — client-side (Claude via proxy)
// --------------------------------------------

export async function processNextStep(runId: string): Promise<void> {
  const PIPELINE_STEP_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutos máximo por step

  // 1. Claim próximo step pending via RPC
  const { data: stepId, error: claimError } = await supabase
    .rpc('claim_next_pending_step', { p_run_id: runId });

  if (claimError) throw new Error(`Erro ao clamar step: ${claimError.message}`);
  if (!stepId) return; // Nenhum step pending

  // 2. Buscar step claimado
  const { data: step, error: stepError } = await supabase
    .from('agent_steps')
    .select('id, run_id, agent_code, step_type, step_order')
    .eq('id', stepId)
    .single();

  if (stepError || !step) throw new Error(`Step ${stepId} não encontrado`);

  const startTime = Date.now();

  // Safety net: timeout de 5 min para o step inteiro
  const stepTimeoutId = setTimeout(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`⏰ Step ${step.step_order} (${step.agent_code}) excedeu timeout de 8min (${elapsed}s)`);
    supabase
      .from('agent_steps')
      .update({
        status: 'failed',
        error_message: `Timeout: step excedeu limite de 8 minutos (${elapsed}s)`,
        duration_ms: Date.now() - startTime,
      })
      .eq('id', step.id)
      .then(() => {
        supabase
          .from('agent_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runId);
      });
  }, PIPELINE_STEP_TIMEOUT_MS);

  try {
    // 3. Buscar run (financial_summary + objective + filter_context)
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .select('id, objective, financial_summary, filter_context')
      .eq('id', step.run_id)
      .single();

    if (runError || !run) throw new Error(`Run ${step.run_id} não encontrado`);

    const summary = run.financial_summary as FinancialSummary;
    if (!summary) throw new Error(`Run ${step.run_id} sem financial_summary`);

    // 4. Buscar outputs anteriores
    const { data: prevSteps } = await supabase
      .from('agent_steps')
      .select('agent_code, step_type, output_data')
      .eq('run_id', step.run_id)
      .eq('status', 'completed')
      .lt('step_order', step.step_order)
      .order('step_order', { ascending: true });

    const prevOutputs = (prevSteps || [])
      .filter((s: any) => s.output_data)
      .map((s: any) => ({
        agent_code: s.agent_code,
        step_type: s.step_type,
        output_data: s.output_data,
      }));

    // 5. Montar prompts (com filter_context para contextualizar agentes)
    const filterContext = (run as any).filter_context as Record<string, unknown> | null;
    const { system, user } = buildPrompt(
      step.agent_code,
      step.step_type,
      run.objective,
      summary,
      prevOutputs,
      filterContext,
    );

    // 6. JSON Schema para structured output
    const jsonSchema = getJsonSchemaForStep(step.step_type, step.agent_code);

    // 7. Salvar input_data
    await supabase
      .from('agent_steps')
      .update({
        input_data: {
          system_prompt_length: system.length,
          user_prompt_length: user.length,
          prev_outputs_count: prevOutputs.length,
        },
      })
      .eq('id', step.id);

    // 8. Chamar Claude via proxy /api/anthropic
    console.log(`🚀 Step ${step.step_order} (${step.agent_code}) — chamando Claude... system=${system.length}chars user=${user.length}chars`);
    const isConsolidation = step.step_type === 'consolidate' || step.step_type === 'review';
    const claudeResult = await callClaudeViaProxy(system, user, isConsolidation, step.agent_code);
    console.log(`📦 Step ${step.step_order} (${step.agent_code}) — resposta: ${claudeResult.tokensOutput} tokens, stop_reason ok`);

    // 9. Validar com Zod (safeParse — não explode)
    const zodSchema = getZodSchemaForStep(step.step_type, step.agent_code);
    const parseResult = zodSchema.safeParse(claudeResult.parsed);
    const validated = parseResult.success ? parseResult.data : claudeResult.parsed;
    if (!parseResult.success) {
      console.warn(`⚠️ Zod parcial para ${step.agent_code}:`, parseResult.error.issues.slice(0, 3));
    }

    // 10. Salvar resultado
    const durationMs = Date.now() - startTime;
    await supabase
      .from('agent_steps')
      .update({
        status: 'completed',
        output_data: validated,
        raw_output: claudeResult.rawText,
        tokens_input: claudeResult.tokensInput,
        tokens_output: claudeResult.tokensOutput,
        model_used: claudeResult.model,
        duration_ms: durationMs,
        error_message: null,
      })
      .eq('id', step.id);

    clearTimeout(stepTimeoutId);
    console.log(`✅ Step ${step.step_order} (${step.agent_code}/${step.step_type}) concluído em ${durationMs}ms`);

    // 11. Verificar se pipeline terminou
    await markRunCompletedIfFinished(runId);

    // 12. Encadear próximo step (fire-and-forget)
    const { data: pending } = await supabase
      .from('agent_steps')
      .select('id')
      .eq('run_id', runId)
      .eq('status', 'pending')
      .limit(1);

    if (pending && pending.length > 0) {
      processNextStep(runId).catch((err) => {
        console.error('❌ Chain-call next step failed:', err);
      });
    }

  } catch (err: any) {
    clearTimeout(stepTimeoutId);
    const durationMs = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError'
      ? `Timeout: step excedeu limite de 7 minutos`
      : (err.message || 'Erro desconhecido');

    await supabase
      .from('agent_steps')
      .update({
        status: 'failed',
        error_message: errorMsg,
        duration_ms: durationMs,
      })
      .eq('id', step.id);

    // Marcar run como failed
    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    console.error(`❌ Step ${step.step_order} (${step.agent_code}) falhou em ${durationMs}ms:`, errorMsg);
    throw err;
  }
}

// --------------------------------------------
// reviewStep — Supabase direto
// --------------------------------------------

export async function reviewStep(
  stepId: string,
  action: 'approved' | 'revision_requested',
  comment: string,
  reviewedBy: string
): Promise<AgentStep> {
  // 1. Verificar step existe e está completed
  const { data: existing, error: findError } = await supabase
    .from('agent_steps')
    .select('id, run_id, status, agent_code, step_type')
    .eq('id', stepId)
    .single();

  if (findError || !existing) throw new Error('Step não encontrado');
  if (existing.status !== 'completed') {
    throw new Error(`Só é possível revisar steps com status "completed". Status atual: "${existing.status}"`);
  }

  // 2. Atualizar review
  const { data: updated, error: updateError } = await supabase
    .from('agent_steps')
    .update({
      review_status: action,
      review_comment: comment || null,
      reviewed_by: reviewedBy,
    })
    .eq('id', stepId)
    .select('*')
    .single();

  if (updateError || !updated) throw new Error(`Erro ao atualizar review: ${updateError?.message}`);

  return updated as AgentStep;
}

// --------------------------------------------
// rerunStep — Supabase direto
// --------------------------------------------

export async function rerunStep(
  stepId: string,
  revisionComment: string
): Promise<RunPipelineResponse> {
  // 1. Buscar step
  const { data: step, error: stepError } = await supabase
    .from('agent_steps')
    .select('id, run_id, step_order, agent_code, step_type, status')
    .eq('id', stepId)
    .single();

  if (stepError || !step) throw new Error('Step não encontrado');

  const runId: string = step.run_id;
  const targetOrder: number = step.step_order;

  // 2. Resetar step alvo + subsequentes
  const { error: resetError } = await supabase
    .from('agent_steps')
    .update({
      status: 'pending',
      output_data: null,
      raw_output: null,
      error_message: null,
      tokens_input: 0,
      tokens_output: 0,
      duration_ms: 0,
      review_status: 'pending',
      review_comment: revisionComment || null,
      reviewed_by: null,
    })
    .eq('run_id', runId)
    .gte('step_order', targetOrder);

  if (resetError) throw new Error(`Erro ao resetar steps: ${resetError.message}`);

  // 3. Atualizar run
  const { error: runError } = await supabase
    .from('agent_runs')
    .update({
      status: 'running',
      completed_at: null,
      admin_comment: revisionComment || null,
    })
    .eq('id', runId);

  if (runError) throw new Error(`Erro ao atualizar run: ${runError.message}`);

  // 4. Disparar processamento (fire-and-forget)
  processNextStep(runId).catch((err) => {
    console.error('❌ Rerun process-next-step failed:', err);
  });

  return { runId };
}

// --------------------------------------------
// cancelRun — Cancela run ativo e todos os steps pending/running
// --------------------------------------------

export async function cancelRun(runId: string): Promise<void> {
  // 1. Cancelar steps pending
  await supabase
    .from('agent_steps')
    .update({ status: 'cancelled', error_message: 'Cancelado pelo usuário' })
    .eq('run_id', runId)
    .eq('status', 'pending');

  // 2. Cancelar steps running
  await supabase
    .from('agent_steps')
    .update({ status: 'cancelled', error_message: 'Cancelado pelo usuário' })
    .eq('run_id', runId)
    .eq('status', 'running');

  // 3. Marcar run como cancelled
  const { error } = await supabase
    .from('agent_runs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', runId);

  if (error) throw new Error(`Erro ao cancelar run: ${error.message}`);
}

// --------------------------------------------
// deleteRun — Exclui run e steps (CASCADE)
// --------------------------------------------

export async function deleteRun(runId: string): Promise<void> {
  const { error } = await supabase.from('agent_runs').delete().eq('id', runId);
  if (error) throw new Error(`Erro ao excluir análise: ${error.message}`);
}

// ============================================
// Internal helpers
// ============================================

interface ClaudeResult {
  parsed: Record<string, unknown>;
  rawText: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

async function callClaudeViaProxy(
  system: string,
  user: string,
  isConsolidation: boolean = false,
  agentCode: string = '',
): Promise<ClaudeResult> {
  const defaultModel = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  // Alex (plan) define a análise base para todos — usa Opus para máxima precisão numérica
  // Bruna (data quality) precisa de precisão para avaliar consistência — usa Sonnet
  // Consolidação e review executivo usam Sonnet (boa qualidade)
  // Demais agentes usam Haiku (rápido + barato)
  const useOpus = agentCode === 'alex' && !isConsolidation;
  const useSonnet = isConsolidation || ['executivo', 'diretor', 'bruna'].includes(agentCode);
  const model = useOpus ? 'claude-opus-4-20250514' : useSonnet ? defaultModel : 'claude-haiku-4-5-20251001';
  const maxTokens = isConsolidation ? 16384 : 8192;

  // Forçar JSON via prompt (sem output_config)
  const fullSystem = system + '\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com um objeto JSON válido. Sem texto antes, sem texto depois, sem markdown, sem ```json. Apenas o JSON puro. Seja CONCISO — máximo 2 frases por campo string.';

  // Prompt caching: enviar system como array com cache_control para reutilização entre steps
  const systemPayload = [
    { type: 'text' as const, text: fullSystem, cache_control: { type: 'ephemeral' as const } },
  ];

  // Timeout de 7 minutos para qualquer chamada (margem para agentes tardios com contexto grande)
  const controller = new AbortController();
  const STEP_TIMEOUT_MS = 7 * 60 * 1000; // 7 minutos
  const timeout = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);

  const res = await fetch('/api/llm-proxy?action=anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPayload,
      messages: [
        { role: 'user', content: user },
        { role: 'assistant', content: '{' },
      ],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API erro ${res.status}: ${body.substring(0, 300)}`);
  }

  const data = await res.json();

  // Extrair texto — suporta content[0].text ou content[0].json
  let rawText = '';
  const firstBlock = data?.content?.[0];
  if (firstBlock?.type === 'text') rawText = firstBlock.text;
  else if (firstBlock?.type === 'json') rawText = JSON.stringify(firstBlock.json);
  else if (typeof firstBlock?.text === 'string') rawText = firstBlock.text;

  if (!rawText) throw new Error(`Resposta vazia do Claude (stop_reason: ${data?.stop_reason})`);

  // Prepend '{' do prefill (assistant message começou com '{', modelo continuou dali)
  const fullRaw = rawText.trimStart().startsWith('{') ? rawText : '{' + rawText;

  // Extrair JSON com reparo de truncamento
  const parsed = extractJsonFromText(fullRaw);

  return {
    parsed,
    rawText,
    tokensInput: data.usage?.input_tokens || 0,
    tokensOutput: data.usage?.output_tokens || 0,
    model: data.model || model,
  };
}

// Extrai JSON de texto — trata markdown, texto sujo e truncamento
function extractJsonFromText(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  // 1. Parse direto
  try { return JSON.parse(trimmed); } catch { /* continuar */ }

  // 2. Markdown code blocks (com fechamento completo)
  const codeBlock = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch { /* continuar */ }
  }

  // Determinar conteúdo JSON a trabalhar — limpar wrapper markdown
  let jsonCandidate = trimmed;

  // 2b. Code block sem fechamento (truncado por max_tokens)
  const openCodeBlock = trimmed.match(/```(?:json)?\s*\n?([\s\S]+)$/);
  if (openCodeBlock && !codeBlock) {
    jsonCandidate = openCodeBlock[1].trim();
    try { return JSON.parse(jsonCandidate); } catch { /* continuar com reparo */ }
  }

  // 2c. Limpar qualquer prefixo texto antes do JSON (ex: "Aqui está o JSON:\n{...")
  const prefixClean = jsonCandidate.replace(/^[^{]*/, '');
  if (prefixClean.length > 0 && prefixClean !== jsonCandidate) {
    jsonCandidate = prefixClean;
    try { return JSON.parse(jsonCandidate); } catch { /* continuar */ }
  }

  // 3. Extrair { ... } do candidato
  const first = jsonCandidate.indexOf('{');
  const last = jsonCandidate.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(jsonCandidate.substring(first, last + 1)); } catch { /* continuar */ }
  }

  // 4. Reparar JSON truncado — a partir do primeiro {
  if (first !== -1) {
    const jsonStart = jsonCandidate.substring(first);
    const repaired = repairJson(jsonStart);
    try {
      return JSON.parse(repaired);
    } catch (e) {
      console.error('⚠️ repairJson falhou. Últimos 200 chars do repaired:', repaired.slice(-200));
      console.error('⚠️ Erro:', (e as Error).message);
    }
  }

  throw new Error(`JSON inválido na resposta (${trimmed.substring(0, 80)}...)`);
}

function repairJson(text: string): string {
  let r = text;

  // 0. Remover trailing ``` de code block truncado
  r = r.replace(/`{1,3}\s*$/, '');

  // 1. Scan robusto para encontrar estado final (string aberta, brackets)
  let inStr = false, esc = false, lastOpenQuote = -1;
  for (let i = 0; i < r.length; i++) {
    const ch = r[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') {
      if (!inStr) lastOpenQuote = i;  // posição da " que abre
      inStr = !inStr;
    }
  }

  // 2. Se terminamos dentro de string aberta, truncar o conteúdo parcial e fechar
  if (inStr && lastOpenQuote >= 0) {
    // Manter tudo até a " de abertura + conteúdo parcial, fechar a string
    // Remover possível \ no final (escape incompleto) antes de fechar
    r = r.replace(/\\$/, '');
    r += '"';
  }

  // 3. Múltiplas passadas de limpeza de trailing incompleto
  for (let pass = 0; pass < 3; pass++) {
    const before = r;
    r = r.replace(/,?\s*"[^"]*$/g, '');           // key/value string ímpar
    r = r.replace(/,?\s*[a-zA-Z_]+$/g, '');       // valor incompleto: tru, nul, fals
    r = r.replace(/,?\s*-?\d+\.?\d*$/gm, '');     // número incompleto
    r = r.replace(/:\s*$/g, '');                   // key sem valor
    r = r.replace(/,\s*$/g, '');                   // trailing comma
    if (r === before) break;
  }

  // 4. Contar brackets/braces abertos (re-scan pós limpeza)
  let braces = 0, brackets = 0;
  inStr = false; esc = false;
  for (const ch of r) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // 5. Se ainda está em string aberta (edge case), fechar
  if (inStr) r += '"';

  // 6. Limpar trailing comma/colon final
  r = r.replace(/[,:\s]+$/, '');

  // 7. Fechar brackets/braces abertos
  while (brackets > 0) { r += ']'; brackets--; }
  while (braces > 0) { r += '}'; braces--; }

  return r;
}

async function markRunCompletedIfFinished(runId: string): Promise<void> {
  const { data: steps, error } = await supabase
    .from('agent_steps')
    .select('status')
    .eq('run_id', runId);

  if (error || !steps) return;

  const statuses = steps.map((s: any) => s.status);

  if (statuses.some((s: string) => s === 'failed')) {
    await supabase
      .from('agent_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId);
    return;
  }

  if (statuses.every((s: string) => s === 'completed')) {
    // Buscar consolidated_summary do último step consolidate
    const { data: lastStep } = await supabase
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', runId)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .order('step_order', { ascending: false })
      .limit(1)
      .single();

    const consolidatedSummary =
      (lastStep?.output_data as any)?.consolidated_summary || null;

    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        consolidated_summary: consolidatedSummary,
      })
      .eq('id', runId);

    console.log('✅ Pipeline concluído com sucesso', runId);
  }
}

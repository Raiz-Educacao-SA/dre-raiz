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
} from '../types/agentTeam';
import {
  getZodSchemaForStep,
  getJsonSchemaForStep,
} from '../types/agentTeamSchemas';
import { buildPrompt } from '../api/agent-team/_lib/agentPrompts';
import { buildFinancialSummary } from '../api/agent-team/_lib/buildFinancialSummary';
import { createClient } from '@supabase/supabase-js';

// --------------------------------------------
// Supabase client (frontend, anon key)
// --------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  const PIPELINE_STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos máximo por step

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
    console.error(`⏰ Step ${step.step_order} (${step.agent_code}) excedeu timeout de 5min (${elapsed}s)`);
    supabase
      .from('agent_steps')
      .update({
        status: 'failed',
        error_message: `Timeout: step excedeu limite de 5 minutos (${elapsed}s)`,
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
    const isConsolidation = step.step_type === 'consolidate';
    const claudeResult = await callClaudeViaProxy(system, user, isConsolidation);

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
      ? `Timeout: step excedeu limite de 5 minutos`
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
): Promise<ClaudeResult> {
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const maxTokens = isConsolidation ? 8192 : 6144;

  // Forçar JSON via prompt (sem output_config)
  const fullSystem = system + '\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com um objeto JSON válido. Sem texto antes, sem texto depois, sem markdown, sem ```json. Apenas o JSON puro. Seja CONCISO — máximo 2 frases por campo string.';

  // Timeout de 5 minutos para qualquer chamada
  const controller = new AbortController();
  const STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
  const timeout = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);

  const res = await fetch('/api/anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: fullSystem,
      messages: [{ role: 'user', content: user }],
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

  // Extrair JSON com reparo de truncamento
  const parsed = extractJsonFromText(rawText);

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

  // 2. Markdown code blocks
  const codeBlock = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch { /* continuar */ }
  }

  // 3. Extrair { ... }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(trimmed.substring(first, last + 1)); } catch { /* continuar */ }
  }

  // 4. Reparar JSON truncado
  const jsonStart = first !== -1 ? trimmed.substring(first) : trimmed;
  const repaired = repairJson(jsonStart);
  try { return JSON.parse(repaired); } catch { /* falhou */ }

  throw new Error(`JSON inválido na resposta (${trimmed.substring(0, 80)}...)`);
}

function repairJson(text: string): string {
  let r = text.replace(/,?\s*"[^"]*$/g, ''); // remover string incompleta
  let braces = 0, brackets = 0, inStr = false, esc = false;
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
  if (inStr) r += '"';
  r = r.replace(/,\s*$/, '');
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

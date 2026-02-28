import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentStep, FinancialSummary } from '../../../types/agentTeam';
import { getZodSchemaForStep, getJsonSchemaForStep } from '../../../types/agentTeamSchemas';
import { buildPrompt } from './agentPrompts';
import { logInfo, logWarning, logError } from '../../../core/logger';
import { recordAuditEntryAsync } from './auditTrail';

const CTX = 'pipeline';

// --------------------------------------------
// Tipos internos
// --------------------------------------------

interface ClaimedStep {
  id: string;
  run_id: string;
  agent_code: string;
  step_type: string;
  step_order: number;
}

interface PrevStepOutput {
  agent_code: string;
  step_type: string;
  output_data: Record<string, unknown>;
}

interface ClaudeUsageResult {
  parsed: Record<string, unknown>;
  rawText: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

// --------------------------------------------
// 1. getNextPendingStep
//    Chama RPC claim_next_pending_step (FOR UPDATE SKIP LOCKED)
//    Retorna step claimado ou null
// --------------------------------------------

export async function getNextPendingStep(
  sb: SupabaseClient,
  runId: string,
): Promise<ClaimedStep | null> {
  const { data, error } = await sb.rpc('claim_next_pending_step', {
    p_run_id: runId,
  });

  if (error) {
    logError(CTX, 'claim_next_pending_step RPC error', { runId, error: error.message });
    throw new Error(`Erro ao clamar próximo step: ${error.message}`);
  }

  const stepId: string | null = data;
  if (!stepId) return null;

  const { data: step, error: stepError } = await sb
    .from('agent_steps')
    .select('id, run_id, agent_code, step_type, step_order')
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    logError(CTX, 'Step claimado não encontrado', { stepId, error: stepError?.message });
    throw new Error(`Step ${stepId} não encontrado após claim`);
  }

  return step as ClaimedStep;
}

// --------------------------------------------
// 2. executeStep
//    Lê run (financial_summary + objective),
//    busca outputs anteriores,
//    monta prompt, chama Claude, valida Zod, salva
// --------------------------------------------

export async function executeStep(
  sb: SupabaseClient,
  step: ClaimedStep,
): Promise<void> {
  const startTime = Date.now();

  try {
    // 2a. Ler run para financial_summary e objective
    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, objective, financial_summary')
      .eq('id', step.run_id)
      .single();

    if (runError || !run) {
      throw new Error(`Run ${step.run_id} não encontrado: ${runError?.message}`);
    }

    const summary = run.financial_summary as FinancialSummary;
    if (!summary) {
      throw new Error(`Run ${step.run_id} sem financial_summary`);
    }

    // 2b. Buscar outputs dos steps anteriores (completed, step_order < current)
    const { data: prevSteps, error: prevError } = await sb
      .from('agent_steps')
      .select('agent_code, step_type, output_data')
      .eq('run_id', step.run_id)
      .eq('status', 'completed')
      .lt('step_order', step.step_order)
      .order('step_order', { ascending: true });

    if (prevError) {
      logWarning(CTX, 'Erro ao buscar steps anteriores', {
        runId: step.run_id,
        stepId: step.id,
        error: prevError.message,
      });
    }

    const prevOutputs: PrevStepOutput[] = (prevSteps || [])
      .filter((s: any) => s.output_data)
      .map((s: any) => ({
        agent_code: s.agent_code,
        step_type: s.step_type,
        output_data: s.output_data,
      }));

    // 2c. Montar prompts
    const { system, user } = buildPrompt(
      step.agent_code,
      step.step_type,
      run.objective,
      summary,
      prevOutputs,
    );

    // 2d. Obter JSON Schema para structured output
    const jsonSchema = getJsonSchemaForStep(step.step_type, step.agent_code);

    // 2e. Salvar input_data para auditoria
    await sb
      .from('agent_steps')
      .update({
        input_data: {
          system_prompt_length: system.length,
          user_prompt_length: user.length,
          prev_outputs_count: prevOutputs.length,
        },
      })
      .eq('id', step.id);

    // 2f. Chamar Claude com retry
    const result = await callClaudeWithRetry(system, user, jsonSchema, step);

    // 2g. Validar com Zod
    const zodSchema = getZodSchemaForStep(step.step_type, step.agent_code);
    const validated = zodSchema.parse(result.parsed);

    // 2h. Salvar resultado
    const durationMs = Date.now() - startTime;
    await sb
      .from('agent_steps')
      .update({
        status: 'completed',
        output_data: validated,
        raw_output: result.rawText,
        tokens_input: result.tokensInput,
        tokens_output: result.tokensOutput,
        model_used: result.model,
        duration_ms: durationMs,
        error_message: null,
      })
      .eq('id', step.id);

    logInfo(CTX, 'Step executado com sucesso', {
      stepOrder: step.step_order,
      agentCode: step.agent_code,
      stepType: step.step_type,
      durationMs,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      model: result.model,
    });

  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err.message || 'Erro desconhecido';

    await sb
      .from('agent_steps')
      .update({
        status: 'failed',
        error_message: errorMsg,
        duration_ms: durationMs,
      })
      .eq('id', step.id);

    logError(CTX, 'Step falhou', {
      stepOrder: step.step_order,
      agentCode: step.agent_code,
      stepType: step.step_type,
      durationMs,
      error: errorMsg,
    });

    throw err;
  }
}

// --------------------------------------------
// 3. markRunCompletedIfFinished
// --------------------------------------------

export async function markRunCompletedIfFinished(
  sb: SupabaseClient,
  runId: string,
): Promise<'completed' | 'failed' | 'running'> {
  const { data: steps, error } = await sb
    .from('agent_steps')
    .select('status')
    .eq('run_id', runId);

  if (error || !steps) {
    logError(CTX, 'Erro ao verificar steps do run', { runId, error: error?.message });
    return 'running';
  }

  const statuses = steps.map((s: any) => s.status);

  if (statuses.some((s: string) => s === 'failed')) {
    await sb
      .from('agent_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId);

    logWarning(CTX, 'Run marcado como failed', { runId });
    return 'failed';
  }

  if (statuses.every((s: string) => s === 'completed')) {
    const { data: lastStep } = await sb
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

    await sb
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        consolidated_summary: consolidatedSummary,
      })
      .eq('id', runId);

    logInfo(CTX, 'Run concluído com sucesso', { runId });

    // Registrar audit trail (forecast — run completion com dados consolidados)
    const { data: runData } = await sb
      .from('agent_runs')
      .select('started_by, objective')
      .eq('id', runId)
      .single();

    recordAuditEntryAsync({
      run_id: runId,
      action_type: 'forecast',
      input_snapshot: {
        total_steps: statuses.length,
        all_completed: true,
      },
      output_snapshot: {
        consolidated_summary: consolidatedSummary
          ? (typeof consolidatedSummary === 'string'
            ? consolidatedSummary.substring(0, 500)
            : 'structured')
          : null,
        status: 'completed',
      },
      performed_by: runData?.started_by || 'system',
      justification: runData?.objective || 'Pipeline completo',
    });

    // Fire-and-forget: enviar email de conclusão
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.API_BASE_URL || 'http://localhost:3002';

    fetch(`${baseUrl}/api/agent-team/send-completion-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    }).catch((err) => {
      logWarning(CTX, 'Fire-and-forget email falhou', { runId, error: err.message });
    });

    return 'completed';
  }

  return 'running';
}

// --------------------------------------------
// Internal: callClaudeWithRetry
// --------------------------------------------

async function callClaudeWithRetry(
  system: string,
  user: string,
  jsonSchema: any,
  step: ClaimedStep,
  maxRetries: number = 1,
): Promise<ClaudeUsageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: attempt === 0 ? 4096 : 3072,
          system,
          messages: [{ role: 'user', content: user }],
          output_config: {
            format: { type: 'json_schema', schema: jsonSchema },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const statusCode = res.status;
        const body = await res.text();

        if ((statusCode === 429 || statusCode >= 500) && attempt < maxRetries) {
          logWarning(CTX, 'Claude API retryable error', {
            statusCode,
            attempt: attempt + 1,
            maxRetries,
            stepOrder: step.step_order,
            agentCode: step.agent_code,
          });
          lastError = new Error(`Claude API erro ${statusCode}: ${body}`);
          await sleep(2000);
          continue;
        }

        throw new Error(`Claude API erro ${statusCode}: ${body}`);
      }

      const data = await res.json();
      const text = data?.content?.[0]?.text;
      if (!text) throw new Error('Resposta vazia do Claude');

      return {
        parsed: JSON.parse(text),
        rawText: text,
        tokensInput: data.usage?.input_tokens || 0,
        tokensOutput: data.usage?.output_tokens || 0,
        model: data.model || model,
      };

    } catch (err: any) {
      if (err.name === 'AbortError' && attempt < maxRetries) {
        logWarning(CTX, 'Claude API timeout, retrying', {
          attempt: attempt + 1,
          maxRetries,
          stepOrder: step.step_order,
          agentCode: step.agent_code,
        });
        lastError = new Error('Claude API timeout (50s)');
        await sleep(2000);
        continue;
      }

      if (attempt >= maxRetries) {
        throw lastError || err;
      }

      lastError = err;
      await sleep(2000);
    }
  }

  throw lastError || new Error('Falha após todas as tentativas');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

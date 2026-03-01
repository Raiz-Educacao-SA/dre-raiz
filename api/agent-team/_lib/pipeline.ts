import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialSummary } from '../../../types/agentTeam';
import { getZodSchemaForStep, getJsonSchemaForStep } from '../../../types/agentTeamSchemas';
import { buildPrompt } from './agentPrompts';
import { shouldHaltPipeline } from '../../../core/agents/alpha/approvalRules';
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
    // 2a. Ler run para financial_summary, objective e filter_context
    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, objective, financial_summary, filter_context')
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

    // 2c. Montar prompts (com filter_context para contextualizar agentes)
    const filterContext = run.filter_context as Record<string, unknown> | null;
    const { system, user } = buildPrompt(
      step.agent_code,
      step.step_type,
      run.objective,
      summary,
      prevOutputs,
      filterContext,
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

    // 2g. Validar com Zod (safeParse para não explodir)
    const zodSchema = getZodSchemaForStep(step.step_type, step.agent_code);
    const parseResult = zodSchema.safeParse(result.parsed);

    if (!parseResult.success) {
      logWarning(CTX, 'Zod validation parcial — usando dados brutos', {
        stepOrder: step.step_order,
        agentCode: step.agent_code,
        zodErrors: parseResult.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const validated = parseResult.success ? parseResult.data : result.parsed;

    // 2g-bis. Verificar halt conditions (Bruna e Falcão podem bloquear)
    const haltCheck = shouldHaltPipeline(
      step.agent_code as 'alex' | 'bruna' | 'carlos' | 'denilson' | 'edmundo' | 'falcao',
      validated as Record<string, unknown>,
    );
    if (haltCheck.halt) {
      logWarning(CTX, 'Pipeline halt triggered', {
        agentCode: step.agent_code,
        stepOrder: step.step_order,
        reason: haltCheck.reason,
      });

      recordAuditEntryAsync({
        run_id: step.run_id,
        action_type: 'decision',
        input_snapshot: { agent_code: step.agent_code, step_order: step.step_order },
        output_snapshot: { halt: true, reason: haltCheck.reason },
        performed_by: 'system',
        justification: `Pipeline halt: ${haltCheck.reason}`,
      });
    }

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
// Usa prompt engineering para forçar JSON (sem output_config)
// --------------------------------------------

async function callClaudeWithRetry(
  system: string,
  user: string,
  _jsonSchema: any,
  step: ClaimedStep,
  maxRetries: number = 1,
): Promise<ClaudeUsageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const isConsolidation = step.step_type === 'consolidate';

  // Forçar JSON via system prompt
  const jsonSystemSuffix = '\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com um objeto JSON válido. Sem texto antes, sem texto depois, sem markdown, sem ```json. Apenas o JSON puro. Seja CONCISO nos textos — máximo 2 frases por campo string. Priorize dados numéricos sobre narrativa.';
  const fullSystem = system + jsonSystemSuffix;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = isConsolidation ? 120000 : 90000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const maxTokens = isConsolidation ? 8192 : 6144;

      logInfo(CTX, 'Chamando Claude API', {
        attempt: attempt + 1,
        agentCode: step.agent_code,
        stepOrder: step.step_order,
        model,
        maxTokens,
        timeoutMs,
      });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: fullSystem,
          messages: [{ role: 'user', content: user }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const statusCode = res.status;
        const body = await res.text();

        logError(CTX, 'Claude API HTTP error', {
          statusCode,
          body: body.substring(0, 500),
          attempt: attempt + 1,
          agentCode: step.agent_code,
        });

        if ((statusCode === 429 || statusCode >= 500) && attempt < maxRetries) {
          lastError = new Error(`Claude API erro ${statusCode}: ${body.substring(0, 200)}`);
          await sleep(3000);
          continue;
        }

        throw new Error(`Claude API erro ${statusCode}: ${body.substring(0, 500)}`);
      }

      const data = await res.json();

      // Extrair texto da resposta — suporta content[0].text ou content[0].json
      let rawText = '';
      const firstBlock = data?.content?.[0];
      if (firstBlock?.type === 'text') {
        rawText = firstBlock.text;
      } else if (firstBlock?.type === 'json') {
        rawText = JSON.stringify(firstBlock.json);
      } else if (typeof firstBlock?.text === 'string') {
        rawText = firstBlock.text;
      }

      if (!rawText) {
        logError(CTX, 'Resposta vazia do Claude', {
          contentTypes: data?.content?.map((c: any) => c.type),
          agentCode: step.agent_code,
          stopReason: data?.stop_reason,
        });
        throw new Error(`Resposta vazia do Claude (stop_reason: ${data?.stop_reason})`);
      }

      // Extrair JSON — remover markdown code blocks se existirem
      const parsed = extractJson(rawText);

      logInfo(CTX, 'Claude respondeu com sucesso', {
        agentCode: step.agent_code,
        tokensIn: data.usage?.input_tokens,
        tokensOut: data.usage?.output_tokens,
        rawLength: rawText.length,
      });

      return {
        parsed,
        rawText,
        tokensInput: data.usage?.input_tokens || 0,
        tokensOutput: data.usage?.output_tokens || 0,
        model: data.model || model,
      };

    } catch (err: any) {
      logWarning(CTX, `Tentativa ${attempt + 1} falhou`, {
        agentCode: step.agent_code,
        errorName: err.name,
        errorMessage: err.message?.substring(0, 200),
      });

      if (err.name === 'AbortError') {
        lastError = new Error(`Claude API timeout (${isConsolidation ? '120s' : '90s'}) para ${step.agent_code}`);
        if (attempt < maxRetries) {
          await sleep(3000);
          continue;
        }
        throw lastError;
      }

      if (attempt >= maxRetries) {
        throw lastError || err;
      }

      lastError = err;
      await sleep(3000);
    }
  }

  throw lastError || new Error('Falha após todas as tentativas');
}

// Extrai JSON de texto — trata markdown code blocks, texto sujo e JSON truncado
function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  // 1. Parse direto
  try { return JSON.parse(trimmed); } catch { /* continuar */ }

  // 2. Remover markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continuar */ }
  }

  // 3. Extrair { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)); } catch { /* continuar */ }
  }

  // 4. JSON truncado — tentar reparar
  const jsonStart = firstBrace !== -1 ? trimmed.substring(firstBrace) : trimmed;
  const repaired = repairTruncatedJson(jsonStart);
  if (repaired) {
    try { return JSON.parse(repaired); } catch { /* continuar */ }
  }

  throw new Error(`Não foi possível extrair JSON da resposta (${trimmed.substring(0, 100)}...)`);
}

// Repara JSON truncado (cortado por max_tokens)
function repairTruncatedJson(text: string): string | null {
  let result = text;

  // Remover trailing incomplete string: ..."texto incompleto
  result = result.replace(/,?\s*"[^"]*$/g, '');

  // Contar brackets abertos
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of result) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // Se estamos dentro de uma string, fechar
  if (inString) result += '"';

  // Remover trailing comma
  result = result.replace(/,\s*$/, '');

  // Fechar brackets/braces abertos
  while (openBrackets > 0) { result += ']'; openBrackets--; }
  while (openBraces > 0) { result += '}'; openBraces--; }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

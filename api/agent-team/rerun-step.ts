import { supabaseAdmin } from './_lib/supabaseAdmin';
import { logInfo, logError, logWarning, addLogSink, clearLogSinks } from '../../core/logger';
import { createSupabaseSink } from './_lib/logSink';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import type { RerunStepRequest, RunPipelineResponse } from '../../types/agentTeam';

const CTX = 'rerun-step';

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as RerunStepRequest;

    // 1. Validar stepId
    if (!body.stepId) {
      return res.status(400).json({ error: 'Campo obrigatório: stepId' });
    }

    // 2. Criar supabaseAdmin client
    const sb = supabaseAdmin();

    // 3. Buscar step pelo id (com dados para audit)
    const { data: step, error: stepError } = await sb
      .from('agent_steps')
      .select('id, run_id, step_order, agent_code, step_type, status, output_data')
      .eq('id', body.stepId)
      .single();

    if (stepError || !step) {
      return res.status(404).json({ error: 'Step não encontrado' });
    }

    // 4. Obter runId e targetOrder
    const runId: string = step.run_id;
    const targetOrder: number = step.step_order;

    // 5. Registrar audit trail (override) ANTES do reset
    const performedBy = (body as any).performedBy || 'admin';
    recordAuditEntryAsync({
      run_id: runId,
      action_type: 'override',
      input_snapshot: {
        step_id: body.stepId,
        agent_code: step.agent_code,
        step_type: step.step_type,
        step_order: step.step_order,
        original_status: step.status,
      },
      output_snapshot: {
        action: 'rerun',
        revision_comment: body.revisionComment || null,
        reset_from_step_order: targetOrder,
      },
      performed_by: performedBy,
      justification: body.revisionComment || `Re-execução do step ${step.agent_code}/${step.step_type}`,
    });

    // 6. Resetar step alvo + subsequentes
    const { error: resetError } = await sb
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
        review_comment: body.revisionComment || null,
        reviewed_by: null,
      })
      .eq('run_id', runId)
      .gte('step_order', targetOrder);

    if (resetError) {
      logError(CTX, 'Erro ao resetar steps', { stepId: body.stepId, runId, error: resetError.message });
      return res.status(500).json({ error: 'Erro ao resetar steps' });
    }

    // 7. Atualizar run
    const { error: runError } = await sb
      .from('agent_runs')
      .update({
        status: 'running',
        completed_at: null,
        admin_comment: body.revisionComment || null,
      })
      .eq('id', runId);

    if (runError) {
      logError(CTX, 'Erro ao atualizar run', { runId, error: runError.message });
      return res.status(500).json({ error: 'Erro ao atualizar run' });
    }

    // 8. Disparar process-next-step (fire-and-forget)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3002';

    fetch(`${baseUrl}/api/agent-team/process-next-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    }).catch((err) => {
      logWarning(CTX, 'Fire-and-forget para process-next-step falhou', { runId, error: err.message });
    });

    logInfo(CTX, 'Step re-executado', {
      stepId: body.stepId,
      agentCode: step.agent_code,
      runId,
      performedBy,
    });

    // 9. Retornar imediatamente
    const response: RunPipelineResponse = { runId };
    return res.status(200).json(response);

  } catch (error: any) {
    logError(CTX, 'Erro interno', { error: error.message });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

export default handler;

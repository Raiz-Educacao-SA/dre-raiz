import { supabaseAdmin } from './_lib/supabaseAdmin';
import { getNextPendingStep, executeStep, markRunCompletedIfFinished } from './_lib/pipeline';
import { logInfo, logError, logWarning, addLogSink, clearLogSinks } from '../../core/logger';
import { createSupabaseSink } from './_lib/logSink';
import type { ProcessNextStepRequest } from '../../types/agentTeam';

const CTX = 'process-next-step';

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  const body = req.body as ProcessNextStepRequest;

  if (!body.runId) {
    return res.status(400).json({ error: 'Campo obrigatório: runId' });
  }

  const sb = supabaseAdmin();

  // 1. Clamar próximo step pending (FOR UPDATE SKIP LOCKED)
  let step;
  try {
    step = await getNextPendingStep(sb, body.runId);
  } catch (err: any) {
    logError(CTX, 'Erro ao buscar próximo step', { runId: body.runId, error: err.message });
    return res.status(500).json({ error: 'Erro ao buscar próximo step', message: err.message });
  }

  // Nenhum step pending — pipeline já terminou ou está em andamento
  if (!step) {
    return res.status(200).json({ ok: true, message: 'No pending step' });
  }

  logInfo(CTX, 'Step iniciado', {
    runId: body.runId,
    stepId: step.id,
    stepOrder: step.step_order,
    agentCode: step.agent_code,
    stepType: step.step_type,
  });

  // 2. Executar step + verificar conclusão
  try {
    await executeStep(sb, step);

    const runStatus = await markRunCompletedIfFinished(sb, body.runId);

    logInfo(CTX, 'Step concluído', {
      runId: body.runId,
      stepId: step.id,
      stepOrder: step.step_order,
      runStatus,
    });

    // 3. Verificar se ainda há steps pending para encadear
    const { data: pending } = await sb
      .from('agent_steps')
      .select('id')
      .eq('run_id', body.runId)
      .eq('status', 'pending')
      .limit(1);

    if (pending && pending.length > 0) {
      // Fire-and-forget: encadear próximo step
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.API_BASE_URL || 'http://localhost:3002';

      fetch(`${baseUrl}/api/agent-team/process-next-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: body.runId }),
      }).catch((err) => {
        logWarning(CTX, 'Chain-call para next step falhou', {
          runId: body.runId,
          error: err.message,
        });
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    logError(CTX, 'Step falhou', {
      runId: body.runId,
      stepId: step.id,
      stepOrder: step.step_order,
      agentCode: step.agent_code,
      error: err.message,
    });

    // Verificar se run deve ser marcado como failed via markRunCompletedIfFinished
    // (que checa se algum step falhou)
    await markRunCompletedIfFinished(sb, body.runId);

    return res.status(500).json({ error: 'Step falhou', message: err.message });
  }
}

export default handler;

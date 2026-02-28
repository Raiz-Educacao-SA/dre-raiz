import { supabaseAdmin } from './_lib/supabaseAdmin';
import { logInfo, logError, addLogSink, clearLogSinks } from '../../core/logger';
import { createSupabaseSink } from './_lib/logSink';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import type { ReviewStepRequest } from '../../types/agentTeam';

const CTX = 'review-step';
const VALID_ACTIONS = ['approved', 'revision_requested'] as const;

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as ReviewStepRequest;

    // 1. Validar campos obrigatórios
    if (!body.stepId) {
      return res.status(400).json({ error: 'Campo obrigatório: stepId' });
    }

    if (!body.action || !VALID_ACTIONS.includes(body.action as any)) {
      return res.status(400).json({
        error: 'action deve ser "approved" ou "revision_requested"',
      });
    }

    if (!body.reviewedBy) {
      return res.status(400).json({ error: 'Campo obrigatório: reviewedBy' });
    }

    // 2. Criar supabaseAdmin client
    const sb = supabaseAdmin();

    // 3. Buscar step por id (com dados para audit)
    const { data: existing, error: findError } = await sb
      .from('agent_steps')
      .select('id, run_id, status, agent_code, step_type, step_order, output_data')
      .eq('id', body.stepId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Step não encontrado' });
    }

    // 3b. Só permite review de steps completed
    if (existing.status !== 'completed') {
      return res.status(400).json({
        error: `Só é possível revisar steps com status "completed". Status atual: "${existing.status}"`,
      });
    }

    // 4. Atualizar review
    const { data: updated, error: updateError } = await sb
      .from('agent_steps')
      .update({
        review_status: body.action,
        review_comment: body.comment || null,
        reviewed_by: body.reviewedBy,
      })
      .eq('id', body.stepId)
      .select('*')
      .single();

    if (updateError || !updated) {
      logError(CTX, 'Erro ao atualizar review', { stepId: body.stepId, error: updateError?.message });
      return res.status(500).json({ error: 'Erro ao atualizar review' });
    }

    // 5. Registrar audit trail (approval ou rejection)
    const auditAction = body.action === 'approved' ? 'approval' : 'rejection';
    recordAuditEntryAsync({
      run_id: existing.run_id,
      action_type: auditAction,
      input_snapshot: {
        step_id: body.stepId,
        agent_code: existing.agent_code,
        step_type: existing.step_type,
        step_order: existing.step_order,
      },
      output_snapshot: {
        review_status: body.action,
        review_comment: body.comment || null,
      },
      performed_by: body.reviewedBy,
      justification: body.comment || `Step ${existing.agent_code}/${existing.step_type} ${auditAction}`,
    });

    logInfo(CTX, `Step ${auditAction}`, {
      stepId: body.stepId,
      agentCode: existing.agent_code,
      reviewedBy: body.reviewedBy,
    });

    // 6. Retornar step atualizado
    return res.status(200).json(updated);

  } catch (error: any) {
    logError(CTX, 'Erro interno', { error: error.message });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

export default handler;

import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import { logInfo, logError, addLogSink, clearLogSinks } from '../../core/logger';
import { createSupabaseSink } from './_lib/logSink';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import type { RunPipelineRequest, RunPipelineResponse } from '../../types/agentTeam';

const CTX = 'run-pipeline';

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Configurar sink para esta invocação
  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as RunPipelineRequest;

    // 1. Validar campos obrigatórios
    if (!body.teamId || !body.objective) {
      return res.status(400).json({
        error: 'Campos obrigatórios: teamId, objective',
      });
    }

    if (!Array.isArray(body.dreSnapshot) || body.dreSnapshot.length === 0) {
      return res.status(400).json({
        error: 'dreSnapshot deve ser um array não vazio',
      });
    }

    logInfo(CTX, 'Pipeline iniciado', {
      teamId: body.teamId,
      objective: body.objective,
      snapshotRows: body.dreSnapshot.length,
      startedBy: body.startedBy,
    });

    // 2. Criar supabaseAdmin client
    const sb = supabaseAdmin();

    // 3. Buscar team_agents ativos (JOIN agents)
    const { data: teamAgents, error: taError } = await sb
      .from('team_agents')
      .select('step_order, step_type, agents!inner(code, name)')
      .eq('team_id', body.teamId)
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (taError) {
      logError(CTX, 'Erro ao buscar team_agents', { error: taError.message });
      return res.status(500).json({ error: 'Erro ao buscar composição do time' });
    }

    if (!teamAgents || teamAgents.length === 0) {
      return res.status(400).json({ error: 'Time não possui agentes ativos configurados' });
    }

    // 4. Criar agent_run
    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .insert({
        team_id: body.teamId,
        objective: body.objective,
        status: 'running',
        dre_data_snapshot: body.dreSnapshot,
        filter_context: body.filterContext || null,
        started_by: body.startedBy,
        started_by_name: body.startedByName || null,
      })
      .select('id')
      .single();

    if (runError || !run) {
      logError(CTX, 'Erro ao criar agent_run', { error: runError?.message });
      return res.status(500).json({ error: 'Erro ao criar run' });
    }

    // 5. Criar agent_steps dinamicamente a partir de team_agents
    const steps = teamAgents.map((ta: any) => ({
      run_id: run.id,
      agent_code: ta.agents.code,
      step_type: ta.step_type,
      step_order: ta.step_order,
      status: 'pending',
      review_status: 'pending',
    }));

    const { error: stepsError } = await sb
      .from('agent_steps')
      .insert(steps);

    if (stepsError) {
      logError(CTX, 'Erro ao criar agent_steps', { runId: run.id, error: stepsError.message });
      await sb.from('agent_runs').delete().eq('id', run.id);
      return res.status(500).json({ error: 'Erro ao criar steps do pipeline' });
    }

    // 6. buildFinancialSummary
    const financialSummary = buildFinancialSummary(body.dreSnapshot as any[]);

    // 7. Atualizar run com financial_summary
    const { error: updateError } = await sb
      .from('agent_runs')
      .update({ financial_summary: financialSummary })
      .eq('id', run.id);

    if (updateError) {
      logError(CTX, 'Erro ao salvar financial_summary', { runId: run.id, error: updateError.message });
      return res.status(500).json({ error: 'Erro ao salvar financial_summary' });
    }

    // 8. Disparar process-next-step via fire-and-forget
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3002';

    fetch(`${baseUrl}/api/agent-team/process-next-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: run.id }),
    }).catch((err) => {
      logError(CTX, 'Fire-and-forget para process-next-step falhou', {
        runId: run.id,
        error: err.message,
      });
    });

    // 9. Registrar audit trail (analysis)
    recordAuditEntryAsync({
      run_id: run.id,
      action_type: 'analysis',
      input_snapshot: {
        objective: body.objective,
        filter_context: body.filterContext || null,
        snapshot_rows: body.dreSnapshot.length,
        team_id: body.teamId,
        steps_count: steps.length,
      },
      output_snapshot: {
        run_id: run.id,
        financial_summary_keys: Object.keys(financialSummary),
        status: 'started',
      },
      performed_by: body.startedBy || 'unknown',
      justification: body.objective,
    });

    logInfo(CTX, 'Pipeline criado com sucesso', {
      runId: run.id,
      stepsCount: steps.length,
    });

    // 10. Retornar imediatamente
    const response: RunPipelineResponse = { runId: run.id };
    return res.status(200).json(response);

  } catch (error: any) {
    logError(CTX, 'Erro interno', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

export default handler;

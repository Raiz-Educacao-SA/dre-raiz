import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import { getNextPendingStep, executeStep, markRunCompletedIfFinished } from './_lib/pipeline';
import { logInfo, logError, logWarning, addLogSink, clearLogSinks } from '../../core/logger';
import { createSupabaseSink } from './_lib/logSink';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import {
  shouldRunNow,
  calculateNextRun,
  buildObjectiveFromTemplate,
  buildDateContext,
} from '../../core/scheduleEngine';
import type { ScheduleConfig } from '../../core/scheduleEngine';
import type {
  RunPipelineRequest,
  RunPipelineResponse,
  ProcessNextStepRequest,
  RerunStepRequest,
  ReviewStepRequest,
} from '../../types/agentTeam';

// ════════════════════════════════════════════════
// Shared: resolve base URL for fire-and-forget calls
// ════════════════════════════════════════════════

function getBaseUrl(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.API_BASE_URL || 'http://localhost:3002';
}

function fireProcessNextStep(runId: string, context: string) {
  const baseUrl = getBaseUrl();
  fetch(`${baseUrl}/api/agent-team/pipeline-router?action=process-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  }).catch((err) => {
    logWarning(context, 'Fire-and-forget para process-next-step falhou', {
      runId,
      error: err.message,
    });
  });
}

// ════════════════════════════════════════════════
// ACTION: run-pipeline
// ════════════════════════════════════════════════

const RUN_PIPELINE_CTX = 'run-pipeline';

async function handleRunPipeline(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as RunPipelineRequest;

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

    logInfo(RUN_PIPELINE_CTX, 'Pipeline iniciado', {
      teamId: body.teamId,
      objective: body.objective,
      snapshotRows: body.dreSnapshot.length,
      startedBy: body.startedBy,
    });

    const sb = supabaseAdmin();

    const { data: teamAgents, error: taError } = await sb
      .from('team_agents')
      .select('step_order, step_type, agents!inner(code, name)')
      .eq('team_id', body.teamId)
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (taError) {
      logError(RUN_PIPELINE_CTX, 'Erro ao buscar team_agents', { error: taError.message });
      return res.status(500).json({ error: 'Erro ao buscar composição do time' });
    }

    if (!teamAgents || teamAgents.length === 0) {
      return res.status(400).json({ error: 'Time não possui agentes ativos configurados' });
    }

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
      logError(RUN_PIPELINE_CTX, 'Erro ao criar agent_run', { error: runError?.message });
      return res.status(500).json({ error: 'Erro ao criar run' });
    }

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
      logError(RUN_PIPELINE_CTX, 'Erro ao criar agent_steps', { runId: run.id, error: stepsError.message });
      await sb.from('agent_runs').delete().eq('id', run.id);
      return res.status(500).json({ error: 'Erro ao criar steps do pipeline' });
    }

    const financialSummary = buildFinancialSummary(body.dreSnapshot as any[]);

    const { error: updateError } = await sb
      .from('agent_runs')
      .update({ financial_summary: financialSummary })
      .eq('id', run.id);

    if (updateError) {
      logError(RUN_PIPELINE_CTX, 'Erro ao salvar financial_summary', { runId: run.id, error: updateError.message });
      return res.status(500).json({ error: 'Erro ao salvar financial_summary' });
    }

    fireProcessNextStep(run.id, RUN_PIPELINE_CTX);

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

    logInfo(RUN_PIPELINE_CTX, 'Pipeline criado com sucesso', {
      runId: run.id,
      stepsCount: steps.length,
    });

    const response: RunPipelineResponse = { runId: run.id };
    return res.status(200).json(response);

  } catch (error: any) {
    logError(RUN_PIPELINE_CTX, 'Erro interno', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

// ════════════════════════════════════════════════
// ACTION: process-next-step
// ════════════════════════════════════════════════

const PROCESS_CTX = 'process-next-step';

async function handleProcessNextStep(req: VercelRequest, res: VercelResponse) {
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

  let step;
  try {
    step = await getNextPendingStep(sb, body.runId);
  } catch (err: any) {
    logError(PROCESS_CTX, 'Erro ao buscar próximo step', { runId: body.runId, error: err.message });
    return res.status(500).json({ error: 'Erro ao buscar próximo step', message: err.message });
  }

  if (!step) {
    return res.status(200).json({ ok: true, message: 'No pending step' });
  }

  logInfo(PROCESS_CTX, 'Step iniciado', {
    runId: body.runId,
    stepId: step.id,
    stepOrder: step.step_order,
    agentCode: step.agent_code,
    stepType: step.step_type,
  });

  try {
    await executeStep(sb, step);

    const runStatus = await markRunCompletedIfFinished(sb, body.runId);

    logInfo(PROCESS_CTX, 'Step concluído', {
      runId: body.runId,
      stepId: step.id,
      stepOrder: step.step_order,
      runStatus,
    });

    const { data: pending } = await sb
      .from('agent_steps')
      .select('id')
      .eq('run_id', body.runId)
      .eq('status', 'pending')
      .limit(1);

    if (pending && pending.length > 0) {
      fireProcessNextStep(body.runId, PROCESS_CTX);
    }

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    logError(PROCESS_CTX, 'Step falhou', {
      runId: body.runId,
      stepId: step.id,
      stepOrder: step.step_order,
      agentCode: step.agent_code,
      error: err.message,
    });

    await markRunCompletedIfFinished(sb, body.runId);

    return res.status(500).json({ error: 'Step falhou', message: err.message });
  }
}

// ════════════════════════════════════════════════
// ACTION: rerun-step
// ════════════════════════════════════════════════

const RERUN_CTX = 'rerun-step';

async function handleRerunStep(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as RerunStepRequest;

    if (!body.stepId) {
      return res.status(400).json({ error: 'Campo obrigatório: stepId' });
    }

    const sb = supabaseAdmin();

    const { data: step, error: stepError } = await sb
      .from('agent_steps')
      .select('id, run_id, step_order, agent_code, step_type, status, output_data')
      .eq('id', body.stepId)
      .single();

    if (stepError || !step) {
      return res.status(404).json({ error: 'Step não encontrado' });
    }

    const runId: string = step.run_id;
    const targetOrder: number = step.step_order;

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
      logError(RERUN_CTX, 'Erro ao resetar steps', { stepId: body.stepId, runId, error: resetError.message });
      return res.status(500).json({ error: 'Erro ao resetar steps' });
    }

    const { error: runError } = await sb
      .from('agent_runs')
      .update({
        status: 'running',
        completed_at: null,
        admin_comment: body.revisionComment || null,
      })
      .eq('id', runId);

    if (runError) {
      logError(RERUN_CTX, 'Erro ao atualizar run', { runId, error: runError.message });
      return res.status(500).json({ error: 'Erro ao atualizar run' });
    }

    fireProcessNextStep(runId, RERUN_CTX);

    logInfo(RERUN_CTX, 'Step re-executado', {
      stepId: body.stepId,
      agentCode: step.agent_code,
      runId,
      performedBy,
    });

    const response: RunPipelineResponse = { runId };
    return res.status(200).json(response);

  } catch (error: any) {
    logError(RERUN_CTX, 'Erro interno', { error: error.message });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

// ════════════════════════════════════════════════
// ACTION: review-step
// ════════════════════════════════════════════════

const REVIEW_CTX = 'review-step';
const VALID_ACTIONS = ['approved', 'revision_requested'] as const;

async function handleReviewStep(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  try {
    const body = req.body as ReviewStepRequest;

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

    const sb = supabaseAdmin();

    const { data: existing, error: findError } = await sb
      .from('agent_steps')
      .select('id, run_id, status, agent_code, step_type, step_order, output_data')
      .eq('id', body.stepId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Step não encontrado' });
    }

    if (existing.status !== 'completed') {
      return res.status(400).json({
        error: `Só é possível revisar steps com status "completed". Status atual: "${existing.status}"`,
      });
    }

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
      logError(REVIEW_CTX, 'Erro ao atualizar review', { stepId: body.stepId, error: updateError?.message });
      return res.status(500).json({ error: 'Erro ao atualizar review' });
    }

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

    logInfo(REVIEW_CTX, `Step ${auditAction}`, {
      stepId: body.stepId,
      agentCode: existing.agent_code,
      reviewedBy: body.reviewedBy,
    });

    return res.status(200).json(updated);

  } catch (error: any) {
    logError(REVIEW_CTX, 'Erro interno', { error: error.message });
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

// ════════════════════════════════════════════════
// ACTION: run-scheduled
// ════════════════════════════════════════════════

const SCHED_CTX = 'run-scheduled';

interface ScheduleRow {
  id: string;
  team_id: string;
  name: string;
  objective_template: string;
  frequency: string;
  execution_time: string;
  timezone: string;
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  filter_context: Record<string, unknown> | null;
  created_by: string | null;
}

interface TeamAgentRow {
  step_order: number;
  step_type: string;
  agents: { code: string };
}

async function handleRunScheduled(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearLogSinks();
  addLogSink(createSupabaseSink());

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logError(SCHED_CTX, 'CRON_SECRET não configurado');
    return res.status(500).json({ error: 'CRON_SECRET não configurado' });
  }

  const authHeader = req.headers['authorization'] as string | undefined;
  const headerSecret = req.headers['x-cron-secret'] as string | undefined;
  const token = authHeader?.replace('Bearer ', '') ?? headerSecret;

  if (token !== cronSecret) {
    logWarning(SCHED_CTX, 'Tentativa de acesso não autorizado ao cron');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  let executed = 0;
  const errors: string[] = [];
  const skipped: string[] = [];

  try {
    const { data: schedules, error: schedError } = await sb
      .from('agent_schedules')
      .select('id, team_id, name, objective_template, frequency, execution_time, timezone, day_of_week, day_of_month, is_active, next_run_at, last_run_at, filter_context, created_by')
      .eq('is_active', true);

    if (schedError) {
      logError(SCHED_CTX, 'Erro ao buscar schedules', { error: schedError.message });
      return res.status(500).json({ error: 'Erro ao buscar schedules' });
    }

    if (!schedules || schedules.length === 0) {
      logInfo(SCHED_CTX, 'Nenhum schedule ativo encontrado');
      return res.status(200).json({ executed: 0, message: 'Nenhum schedule ativo' });
    }

    logInfo(SCHED_CTX, 'Cron executado', { schedulesCount: schedules.length });

    for (const row of schedules as ScheduleRow[]) {
      const config: ScheduleConfig = {
        frequency: row.frequency as ScheduleConfig['frequency'],
        execution_time: row.execution_time,
        timezone: row.timezone,
        day_of_week: row.day_of_week ?? undefined,
        day_of_month: row.day_of_month ?? undefined,
        is_active: row.is_active,
        next_run_at: row.next_run_at,
        last_run_at: row.last_run_at,
      };

      if (!shouldRunNow(config, now)) {
        skipped.push(row.name);
        continue;
      }

      try {
        const dateContext = buildDateContext(now);
        const objective = buildObjectiveFromTemplate(row.objective_template, dateContext);

        const { data: dreSnapshot, error: dreError } = await sb.rpc('get_soma_tags', {
          p_month_from: dateContext.month_from,
          p_month_to: dateContext.month_to,
          p_marcas: null,
          p_nome_filiais: null,
          p_tags02: null,
          p_tags01: null,
          p_recurring: null,
          p_tags03: null,
        });

        if (dreError || !dreSnapshot || dreSnapshot.length === 0) {
          logWarning(SCHED_CTX, 'DRE snapshot vazio para schedule', {
            scheduleName: row.name,
            scheduleId: row.id,
            error: dreError?.message,
          });
          errors.push(`${row.name}: DRE snapshot vazio`);
          continue;
        }

        const { data: teamAgents, error: taError } = await sb
          .from('team_agents')
          .select('step_order, step_type, agents!inner(code)')
          .eq('team_id', row.team_id)
          .eq('is_active', true)
          .order('step_order', { ascending: true });

        if (taError || !teamAgents || teamAgents.length === 0) {
          logWarning(SCHED_CTX, 'Time sem agentes ativos', {
            scheduleName: row.name,
            teamId: row.team_id,
          });
          errors.push(`${row.name}: time sem agentes ativos`);
          continue;
        }

        const { data: run, error: runError } = await sb
          .from('agent_runs')
          .insert({
            team_id: row.team_id,
            objective,
            status: 'running',
            dre_data_snapshot: dreSnapshot,
            filter_context: row.filter_context || { year: dateContext.year },
            started_by: row.created_by || 'cron',
            started_by_name: `Cron: ${row.name}`,
          })
          .select('id')
          .single();

        if (runError || !run) {
          logError(SCHED_CTX, 'Erro ao criar run para schedule', {
            scheduleName: row.name,
            error: runError?.message,
          });
          errors.push(`${row.name}: erro ao criar run`);
          continue;
        }

        const steps = (teamAgents as TeamAgentRow[]).map((ta) => ({
          run_id: run.id,
          agent_code: ta.agents.code,
          step_type: ta.step_type,
          step_order: ta.step_order,
          status: 'pending',
          review_status: 'pending',
        }));

        const { error: stepsError } = await sb.from('agent_steps').insert(steps);

        if (stepsError) {
          await sb.from('agent_runs').delete().eq('id', run.id);
          logError(SCHED_CTX, 'Erro ao criar steps para schedule', {
            scheduleName: row.name,
            runId: run.id,
            error: stepsError.message,
          });
          errors.push(`${row.name}: erro ao criar steps`);
          continue;
        }

        const financialSummary = buildFinancialSummary(dreSnapshot);
        await sb.from('agent_runs').update({ financial_summary: financialSummary }).eq('id', run.id);

        fireProcessNextStep(run.id, SCHED_CTX);

        const nextRun = calculateNextRun(config, now);

        await sb
          .from('agent_schedules')
          .update({
            last_run_at: now,
            next_run_at: nextRun,
          })
          .eq('id', row.id);

        recordAuditEntryAsync({
          run_id: run.id,
          action_type: 'schedule',
          input_snapshot: {
            schedule_id: row.id,
            schedule_name: row.name,
            frequency: row.frequency,
            objective_template: row.objective_template,
            snapshot_rows: dreSnapshot.length,
          },
          output_snapshot: {
            run_id: run.id,
            objective,
            next_run_at: nextRun,
            steps_count: steps.length,
          },
          performed_by: row.created_by || 'cron',
          justification: `Execução automática: ${row.name}`,
        });

        logInfo(SCHED_CTX, 'Schedule executado com sucesso', {
          scheduleName: row.name,
          runId: run.id,
          nextRun,
        });

        executed++;

      } catch (scheduleErr: unknown) {
        const msg = scheduleErr instanceof Error ? scheduleErr.message : 'Erro desconhecido';
        logError(SCHED_CTX, 'Erro ao executar schedule', {
          scheduleName: row.name,
          error: msg,
        });
        errors.push(`${row.name}: ${msg}`);
      }
    }

    logInfo(SCHED_CTX, 'Cron finalizado', {
      executed,
      total: schedules.length,
      skipped: skipped.length,
      errorsCount: errors.length,
    });

    return res.status(200).json({
      executed,
      total: schedules.length,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    logError(SCHED_CTX, 'Erro interno no cron', { error: msg });
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// Router
// ════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'run-pipeline': return handleRunPipeline(req, res);
    case 'process-next-step': return handleProcessNextStep(req, res);
    case 'rerun-step': return handleRerunStep(req, res);
    case 'review-step': return handleReviewStep(req, res);
    case 'run-scheduled': return handleRunScheduled(req, res);
    default: return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}

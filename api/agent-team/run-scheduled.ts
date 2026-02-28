import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
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

const CTX = 'run-scheduled';

// --------------------------------------------
// Types
// --------------------------------------------

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

// --------------------------------------------
// Handler
// --------------------------------------------

export async function handler(req: { method: string; headers: Record<string, string | undefined> }, res: {
  status: (code: number) => { json: (data: unknown) => void };
}) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Configurar sink para esta invocação
  clearLogSinks();
  addLogSink(createSupabaseSink());

  // 1. Validar CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logError(CTX, 'CRON_SECRET não configurado');
    return res.status(500).json({ error: 'CRON_SECRET não configurado' });
  }

  const authHeader = req.headers['authorization'];
  const headerSecret = req.headers['x-cron-secret'];
  const token = authHeader?.replace('Bearer ', '') ?? headerSecret;

  if (token !== cronSecret) {
    logWarning(CTX, 'Tentativa de acesso não autorizado ao cron');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  let executed = 0;
  const errors: string[] = [];
  const skipped: string[] = [];

  try {
    // 2. Buscar schedules ativos
    const { data: schedules, error: schedError } = await sb
      .from('agent_schedules')
      .select('id, team_id, name, objective_template, frequency, execution_time, timezone, day_of_week, day_of_month, is_active, next_run_at, last_run_at, filter_context, created_by')
      .eq('is_active', true);

    if (schedError) {
      logError(CTX, 'Erro ao buscar schedules', { error: schedError.message });
      return res.status(500).json({ error: 'Erro ao buscar schedules' });
    }

    if (!schedules || schedules.length === 0) {
      logInfo(CTX, 'Nenhum schedule ativo encontrado');
      return res.status(200).json({ executed: 0, message: 'Nenhum schedule ativo' });
    }

    logInfo(CTX, 'Cron executado', { schedulesCount: schedules.length });

    // 3. Filtrar via core shouldRunNow()
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
        // 4. Build date context e objective via core
        const dateContext = buildDateContext(now);
        const objective = buildObjectiveFromTemplate(row.objective_template, dateContext);

        // 5. Buscar DRE snapshot
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
          logWarning(CTX, 'DRE snapshot vazio para schedule', {
            scheduleName: row.name,
            scheduleId: row.id,
            error: dreError?.message,
          });
          errors.push(`${row.name}: DRE snapshot vazio`);
          continue;
        }

        // 6. Verificar team_agents
        const { data: teamAgents, error: taError } = await sb
          .from('team_agents')
          .select('step_order, step_type, agents!inner(code)')
          .eq('team_id', row.team_id)
          .eq('is_active', true)
          .order('step_order', { ascending: true });

        if (taError || !teamAgents || teamAgents.length === 0) {
          logWarning(CTX, 'Time sem agentes ativos', {
            scheduleName: row.name,
            teamId: row.team_id,
          });
          errors.push(`${row.name}: time sem agentes ativos`);
          continue;
        }

        // 7. Criar run
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
          logError(CTX, 'Erro ao criar run para schedule', {
            scheduleName: row.name,
            error: runError?.message,
          });
          errors.push(`${row.name}: erro ao criar run`);
          continue;
        }

        // 8. Criar steps
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
          logError(CTX, 'Erro ao criar steps para schedule', {
            scheduleName: row.name,
            runId: run.id,
            error: stepsError.message,
          });
          errors.push(`${row.name}: erro ao criar steps`);
          continue;
        }

        // 9. Financial summary
        const financialSummary = buildFinancialSummary(dreSnapshot);
        await sb.from('agent_runs').update({ financial_summary: financialSummary }).eq('id', run.id);

        // 10. Disparar process-next-step fire-and-forget
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3002';

        fetch(`${baseUrl}/api/agent-team/process-next-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: run.id }),
        }).catch((err) => {
          logError(CTX, 'Fire-and-forget para process-next-step falhou', {
            scheduleName: row.name,
            runId: run.id,
            error: err.message,
          });
        });

        // 11. Atualizar last_run_at e next_run_at via core
        const nextRun = calculateNextRun(config, now);

        await sb
          .from('agent_schedules')
          .update({
            last_run_at: now,
            next_run_at: nextRun,
          })
          .eq('id', row.id);

        // Registrar audit trail (schedule)
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

        logInfo(CTX, 'Schedule executado com sucesso', {
          scheduleName: row.name,
          runId: run.id,
          nextRun,
        });

        executed++;

      } catch (scheduleErr: unknown) {
        const msg = scheduleErr instanceof Error ? scheduleErr.message : 'Erro desconhecido';
        logError(CTX, 'Erro ao executar schedule', {
          scheduleName: row.name,
          error: msg,
        });
        errors.push(`${row.name}: ${msg}`);
      }
    }

    logInfo(CTX, 'Cron finalizado', {
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
    logError(CTX, 'Erro interno no cron', { error: msg });
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

export default handler;

import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';

// --------------------------------------------
// Tipos internos
// --------------------------------------------

interface ScheduleRow {
  id: string;
  team_id: string;
  name: string;
  objective_template: string;
  filter_context: Record<string, unknown> | null;
  created_by: string | null;
}

// --------------------------------------------
// Handler
// --------------------------------------------

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validar cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('⚠️ CRON_SECRET não configurado');
    return res.status(500).json({ error: 'CRON_SECRET não configurado' });
  }

  const headerSecret = req.headers['x-cron-secret'];
  if (headerSecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = supabaseAdmin();
  let executed = 0;
  const errors: string[] = [];

  try {
    // 2. Buscar schedules ativos
    const { data: schedules, error: schedError } = await sb
      .from('agent_schedules')
      .select('id, team_id, name, objective_template, filter_context, created_by')
      .eq('is_active', true);

    if (schedError) {
      console.error('❌ Erro ao buscar schedules:', schedError);
      return res.status(500).json({ error: 'Erro ao buscar schedules' });
    }

    if (!schedules || schedules.length === 0) {
      return res.status(200).json({ executed: 0, message: 'Nenhum schedule ativo' });
    }

    // 3. Processar cada schedule
    for (const schedule of schedules as ScheduleRow[]) {
      try {
        // 3a. Montar período (ano corrente, Jan-Dez)
        const year = new Date().getFullYear().toString();
        const monthFrom = `${year}-01`;
        const monthTo = `${year}-12`;

        // 3b. Buscar DRE snapshot via RPC (service_role bypassa RLS)
        const { data: dreSnapshot, error: dreError } = await sb.rpc('get_soma_tags', {
          p_month_from: monthFrom,
          p_month_to: monthTo,
          p_marcas: null,
          p_nome_filiais: null,
          p_tags02: null,
          p_tags01: null,
          p_recurring: null,
          p_tags03: null,
        });

        if (dreError || !dreSnapshot || dreSnapshot.length === 0) {
          const msg = `Schedule "${schedule.name}": DRE snapshot vazio ou erro — ${dreError?.message || 'sem dados'}`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        // 3c. Montar objetivo com template
        const objective = schedule.objective_template
          .replace('{{year}}', year)
          .replace('{{month_from}}', monthFrom)
          .replace('{{month_to}}', monthTo);

        // 3d. Verificar team_agents existem
        const { data: teamAgents, error: taError } = await sb
          .from('team_agents')
          .select('step_order, step_type, agents!inner(code)')
          .eq('team_id', schedule.team_id)
          .eq('is_active', true)
          .order('step_order', { ascending: true });

        if (taError || !teamAgents || teamAgents.length === 0) {
          const msg = `Schedule "${schedule.name}": time sem agentes ativos`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        // 3e. Criar run
        const { data: run, error: runError } = await sb
          .from('agent_runs')
          .insert({
            team_id: schedule.team_id,
            objective,
            status: 'running',
            dre_data_snapshot: dreSnapshot,
            filter_context: schedule.filter_context || { year, months_range: `Jan-Dez ${year}` },
            started_by: schedule.created_by || 'cron',
            started_by_name: `Cron: ${schedule.name}`,
          })
          .select('id')
          .single();

        if (runError || !run) {
          const msg = `Schedule "${schedule.name}": erro ao criar run — ${runError?.message}`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        // 3f. Criar steps
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
          const msg = `Schedule "${schedule.name}": erro ao criar steps — ${stepsError.message}`;
          console.error('⚠️', msg);
          await sb.from('agent_runs').delete().eq('id', run.id);
          errors.push(msg);
          continue;
        }

        // 3g. buildFinancialSummary + salvar
        const financialSummary = buildFinancialSummary(dreSnapshot);

        await sb
          .from('agent_runs')
          .update({ financial_summary: financialSummary })
          .eq('id', run.id);

        // 3h. Disparar process-next-step fire-and-forget
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3002';

        fetch(`${baseUrl}/api/agent-team/process-next-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: run.id }),
        }).catch((err) => {
          console.error(`⚠️ Fire-and-forget para schedule "${schedule.name}" falhou:`, err.message);
        });

        executed++;
        console.log(`✅ Cron schedule "${schedule.name}" → runId=${run.id}`);

      } catch (scheduleErr: unknown) {
        const msg = scheduleErr instanceof Error ? scheduleErr.message : 'Erro desconhecido';
        console.error(`⚠️ Schedule "${schedule.name}" falhou:`, msg);
        errors.push(`${schedule.name}: ${msg}`);
      }
    }

    return res.status(200).json({
      executed,
      total: schedules.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ cron-run erro:', msg);
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

export default handler;

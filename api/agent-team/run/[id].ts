import { supabaseAdmin } from '../_lib/supabaseAdmin';
import type { GetRunResponse } from '../../../types/agentTeam';

export async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Extrair id dos params
    const id = req.query?.id as string | undefined;

    // 2. Validar
    if (!id) {
      return res.status(400).json({ error: 'Parâmetro obrigatório: id' });
    }

    // 3. Criar supabaseAdmin client
    const sb = supabaseAdmin();

    // 4. Buscar run
    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run não encontrado' });
    }

    // 5. Buscar steps ordenados
    const { data: steps, error: stepsError } = await sb
      .from('agent_steps')
      .select('*')
      .eq('run_id', id)
      .order('step_order', { ascending: true });

    if (stepsError) {
      console.error('❌ Erro ao buscar steps:', stepsError);
      return res.status(500).json({ error: 'Erro ao buscar steps' });
    }

    // 6. Retornar
    const response: GetRunResponse = { run, steps: steps || [] };
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ run/[id] erro:', error);
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

export default handler;

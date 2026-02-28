import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { ListRunsResponse } from '../../types/agentTeam';

export async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Criar supabaseAdmin client
    const sb = supabaseAdmin();

    // 2. Ler e sanitizar limit
    const rawLimit = parseInt(req.query?.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 20;

    // 3. Buscar runs (sem snapshot e sem financial_summary)
    const { data: runs, error } = await sb
      .from('agent_runs')
      .select('id, team_id, objective, status, started_by, started_by_name, started_at, completed_at, consolidated_summary')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao listar runs:', error);
      return res.status(500).json({ error: 'Erro ao listar runs' });
    }

    // 4. Retornar
    const response: ListRunsResponse = { runs: runs || [] };
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ runs erro:', error);
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

export default handler;

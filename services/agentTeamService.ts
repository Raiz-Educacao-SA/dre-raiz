import type {
  Team,
  Agent,
  TeamAgent,
  AgentRun,
  AgentStep,
  AgentSchedule,
  RunPipelineResponse,
  GetRunResponse,
  ListRunsResponse,
} from '../types/agentTeam';
import { createClient } from '@supabase/supabase-js';

// --------------------------------------------
// Supabase client (frontend, anon key)
// --------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --------------------------------------------
// Leitura direta do Supabase (dados públicos via RLS)
// --------------------------------------------

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) {
    console.error('❌ getTeams:', error);
    return [];
  }
  return data as Team[];
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true)
    .order('code');
  if (error) {
    console.error('❌ getAgents:', error);
    return [];
  }
  return data as Agent[];
}

export async function getTeamAgents(teamId: string): Promise<(TeamAgent & { agent: Agent })[]> {
  const { data, error } = await supabase
    .from('team_agents')
    .select('*, agents!inner(*)')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('step_order');
  if (error) {
    console.error('❌ getTeamAgents:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    ...row,
    agent: row.agents,
    agents: undefined,
  }));
}

// --------------------------------------------
// Agent Schedules (Supabase direto — admin RLS)
// --------------------------------------------

export async function getSchedules(teamId?: string): Promise<AgentSchedule[]> {
  let query = supabase
    .from('agent_schedules')
    .select('*')
    .order('name');

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getSchedules:', error);
    return [];
  }
  return data as AgentSchedule[];
}

export async function createSchedule(schedule: Omit<AgentSchedule, 'id' | 'created_at' | 'updated_at' | 'next_run_at' | 'last_run_at' | 'organization_id'>): Promise<AgentSchedule | null> {
  const { data, error } = await supabase
    .from('agent_schedules')
    .insert(schedule)
    .select()
    .single();
  if (error) {
    console.error('createSchedule:', error);
    throw new Error(error.message);
  }
  return data as AgentSchedule;
}

export async function updateSchedule(id: string, updates: Partial<Pick<AgentSchedule, 'name' | 'objective_template' | 'frequency' | 'execution_time' | 'timezone' | 'day_of_week' | 'day_of_month' | 'is_active' | 'filter_context'>>): Promise<AgentSchedule | null> {
  const { data, error } = await supabase
    .from('agent_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateSchedule:', error);
    throw new Error(error.message);
  }
  return data as AgentSchedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('agent_schedules')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteSchedule:', error);
    throw new Error(error.message);
  }
}

// --------------------------------------------
// API calls (endpoints backend)
// --------------------------------------------

const API_BASE = '/api/agent-team';

export async function startPipeline(
  teamId: string,
  objective: string,
  dreSnapshot: Record<string, unknown>[],
  filterContext: Record<string, unknown>,
  startedBy: string,
  startedByName: string
): Promise<RunPipelineResponse> {
  const res = await fetch(`${API_BASE}/run-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId,
      objective,
      dreSnapshot,
      filterContext,
      startedBy,
      startedByName,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getRun(runId: string): Promise<GetRunResponse> {
  const res = await fetch(`${API_BASE}/run/${runId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listRuns(limit = 20): Promise<ListRunsResponse> {
  const res = await fetch(`${API_BASE}/runs?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function reviewStep(
  stepId: string,
  action: 'approve' | 'revision_requested',
  comment: string,
  reviewedBy: string
): Promise<AgentStep> {
  const res = await fetch(`${API_BASE}/review-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepId, action, comment, reviewedBy }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function rerunStep(
  stepId: string,
  revisionComment: string
): Promise<RunPipelineResponse> {
  const res = await fetch(`${API_BASE}/rerun-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepId, revisionComment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function processNextStep(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/process-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

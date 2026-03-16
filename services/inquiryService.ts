import { supabase } from '../supabase';
import type { DreInquiry, DreInquiryMessage, InquirySlaConfig, InquiryStatus, InquiryStats, DreInquiryFilterContext } from '../types';

// ── CRUD Inquiries ──

export const createInquiry = async (data: {
  subject: string;
  question: string;
  priority: 'normal' | 'urgent';
  requester_email: string;
  requester_name: string;
  assignee_email: string;
  assignee_name: string;
  filter_hash: string;
  filter_context: DreInquiryFilterContext;
  dre_snapshot?: Record<string, number> | null;
}): Promise<DreInquiry | null> => {
  // Buscar SLA config para calcular deadline
  const slaConfig = await getSlaConfig();
  const slaCfg = slaConfig.find(s => s.priority === data.priority && s.active);
  const deadlineHours = slaCfg?.deadline_hours || (data.priority === 'urgent' ? 24 : 48);
  const sla_deadline_at = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString();

  const { data: inquiry, error } = await supabase
    .from('dre_inquiries')
    .insert({
      ...data,
      dre_snapshot: data.dre_snapshot || null,
      sla_deadline_at,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar solicitação:', error);
    return null;
  }

  // Criar mensagem inicial (question)
  if (inquiry) {
    await addMessage(inquiry.id, {
      author_email: data.requester_email,
      author_name: data.requester_name,
      message: data.question,
      message_type: 'question',
    });
  }

  return inquiry as DreInquiry;
};

export const getMyInquiries = async (email: string): Promise<DreInquiry[]> => {
  const { data, error } = await supabase
    .from('dre_inquiries')
    .select('*')
    .or(`requester_email.eq.${email},assignee_email.eq.${email}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar solicitações:', error);
    return [];
  }
  return (data || []) as DreInquiry[];
};

export const getInquiriesByFilterHash = async (filterHash: string): Promise<DreInquiry[]> => {
  const { data, error } = await supabase
    .from('dre_inquiries')
    .select('*')
    .eq('filter_hash', filterHash)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar solicitações por filtro:', error);
    return [];
  }
  return (data || []) as DreInquiry[];
};

export const getInquiryById = async (id: number): Promise<DreInquiry | null> => {
  const { data, error } = await supabase
    .from('dre_inquiries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar solicitação:', error);
    return null;
  }
  return data as DreInquiry;
};

export const getAllInquiries = async (filters?: {
  status?: InquiryStatus;
  requester_email?: string;
  assignee_email?: string;
  priority?: string;
}): Promise<DreInquiry[]> => {
  let query = supabase
    .from('dre_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.requester_email) query = query.eq('requester_email', filters.requester_email);
  if (filters?.assignee_email) query = query.eq('assignee_email', filters.assignee_email);
  if (filters?.priority) query = query.eq('priority', filters.priority);

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar todas as solicitações:', error);
    return [];
  }
  return (data || []) as DreInquiry[];
};

export const updateInquiryStatus = async (
  id: number,
  status: InquiryStatus,
  closedAt?: string
): Promise<boolean> => {
  const update: Record<string, unknown> = { status };
  if (closedAt) update.closed_at = closedAt;
  if (status === 'approved' || status === 'closed') update.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from('dre_inquiries')
    .update(update)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    return false;
  }
  return true;
};

export const reassignInquiry = async (
  id: number,
  newAssigneeEmail: string,
  newAssigneeName: string,
  reassignedBy: string
): Promise<boolean> => {
  // Buscar assignee atual para guardar em original
  const inquiry = await getInquiryById(id);
  if (!inquiry) return false;

  const { error } = await supabase
    .from('dre_inquiries')
    .update({
      assignee_email: newAssigneeEmail,
      assignee_name: newAssigneeName,
      original_assignee_email: inquiry.original_assignee_email || inquiry.assignee_email,
      reassigned_by: reassignedBy,
      reassigned_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao reatribuir:', error);
    return false;
  }

  // Mensagem de sistema
  await addMessage(id, {
    author_email: reassignedBy,
    author_name: reassignedBy,
    message: `Solicitação reatribuída de ${inquiry.assignee_name} para ${newAssigneeName}.`,
    message_type: 'system',
  });

  return true;
};

// ── Messages ──

export const getInquiryMessages = async (inquiryId: number): Promise<DreInquiryMessage[]> => {
  const { data, error } = await supabase
    .from('dre_inquiry_messages')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar mensagens:', error);
    return [];
  }
  return (data || []) as DreInquiryMessage[];
};

export const addMessage = async (inquiryId: number, data: {
  author_email: string;
  author_name: string;
  message: string;
  message_type: string;
}): Promise<DreInquiryMessage | null> => {
  const { data: msg, error } = await supabase
    .from('dre_inquiry_messages')
    .insert({ inquiry_id: inquiryId, ...data })
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar mensagem:', error);
    return null;
  }
  return msg as DreInquiryMessage;
};

// ── Approval Flow ──

export const approveInquiry = async (
  id: number, note: string, authorEmail: string, authorName: string
): Promise<boolean> => {
  const ok = await updateInquiryStatus(id, 'approved');
  if (!ok) return false;
  if (note.trim()) {
    await addMessage(id, {
      author_email: authorEmail,
      author_name: authorName,
      message: note,
      message_type: 'approval',
    });
  }
  return true;
};

export const rejectInquiry = async (
  id: number, note: string, authorEmail: string, authorName: string
): Promise<boolean> => {
  const ok = await updateInquiryStatus(id, 'rejected');
  if (!ok) return false;
  await addMessage(id, {
    author_email: authorEmail,
    author_name: authorName,
    message: note,
    message_type: 'rejection',
  });
  return true;
};

export const reopenInquiry = async (
  id: number, note: string, authorEmail: string, authorName: string
): Promise<boolean> => {
  const ok = await updateInquiryStatus(id, 'reopened');
  if (!ok) return false;
  await addMessage(id, {
    author_email: authorEmail,
    author_name: authorName,
    message: note,
    message_type: 'counter',
  });
  return true;
};

// ── SLA Config ──

export const getSlaConfig = async (): Promise<InquirySlaConfig[]> => {
  const { data, error } = await supabase
    .from('dre_inquiry_sla_config')
    .select('*')
    .order('priority');

  if (error) {
    console.error('Erro ao buscar SLA config:', error);
    return [];
  }
  return (data || []) as InquirySlaConfig[];
};

export const updateSlaConfig = async (
  priority: string, deadlineHours: number, reminderHours: number, escalateTo?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('dre_inquiry_sla_config')
    .update({
      deadline_hours: deadlineHours,
      reminder_hours: reminderHours,
      escalate_to: escalateTo || null,
    })
    .eq('priority', priority);

  if (error) {
    console.error('Erro ao atualizar SLA config:', error);
    return false;
  }
  return true;
};

// ── Stats ──

export const getInquiryStats = async (): Promise<InquiryStats> => {
  const { data, error } = await supabase
    .from('dre_inquiries')
    .select('status');

  if (error) {
    console.error('Erro ao buscar stats:', error);
    return { total: 0, pending: 0, answered: 0, approved: 0, rejected: 0, reopened: 0, expired: 0, closed: 0 };
  }

  const rows = data || [];
  return {
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    answered: rows.filter(r => r.status === 'answered').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    reopened: rows.filter(r => r.status === 'reopened').length,
    expired: rows.filter(r => r.status === 'expired').length,
    closed: rows.filter(r => r.status === 'closed').length,
  };
};

// ── Badge Count ──

export const getPendingInquiryCount = async (email: string): Promise<number> => {
  const { count, error } = await supabase
    .from('dre_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('assignee_email', email)
    .in('status', ['pending', 'reopened', 'rejected']);

  if (error) {
    console.error('Erro ao contar pendentes:', error);
    return 0;
  }
  return count || 0;
};

// Contagem de solicitações respondidas aguardando revisão do solicitante
export const getAnsweredInquiryCount = async (email: string): Promise<number> => {
  const { count, error } = await supabase
    .from('dre_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('requester_email', email)
    .eq('status', 'answered');

  if (error) {
    console.error('Erro ao contar respondidas:', error);
    return 0;
  }
  return count || 0;
};

// ── Deep Link ──

export const buildInquiryDeepLink = (
  inquiryId: number,
  filterContext: DreInquiryFilterContext,
  baseUrl: string = window.location.origin
): string => {
  const filtersB64 = btoa(JSON.stringify(filterContext));
  return `${baseUrl}/?view=soma_tags&inquiry=${inquiryId}&filters=${filtersB64}`;
};

// ── Realtime ──

export const subscribeInquiries = (email: string, onChange: () => void) => {
  const channel = supabase
    .channel('dre_inquiries_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'dre_inquiries',
    }, (payload) => {
      const row = payload.new as DreInquiry | undefined;
      if (row && (row.requester_email === email || row.assignee_email === email)) {
        onChange();
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

// ── Send Email ──

export const sendInquiryEmail = async (data: {
  type: 'new_request' | 'response' | 'approval' | 'rejection' | 'sla_warning' | 'sla_breach';
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  subject: string;
  question: string;
  message?: string;
  priority?: string;
  filterSummary: string;
  deepLink: string;
  dreSnapshot?: Record<string, number> | null;
}): Promise<boolean> => {
  try {
    const res = await fetch('/api/send-inquiry-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error('Erro ao enviar email:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao enviar email:', err);
    return false;
  }
};

// ── Helpers ──

export const formatFilterContextSummary = (ctx: DreInquiryFilterContext): string => {
  const parts: string[] = [];
  if (ctx.year) parts.push(`Ano ${ctx.year}`);
  if (ctx.months?.length > 0) {
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    parts.push(`Meses: ${ctx.months.map(m => monthNames[parseInt(m) - 1] || m).join(', ')}`);
  }
  if (ctx.marcas?.length > 0) parts.push(`Marca: ${ctx.marcas.join(', ')}`);
  if (ctx.filiais?.length > 0) parts.push(`Filial: ${ctx.filiais.join(', ')}`);
  if (ctx.tags01?.length > 0) parts.push(`Tag01: ${ctx.tags01.join(', ')}`);
  if (ctx.tags02?.length > 0) parts.push(`Tag02: ${ctx.tags02.join(', ')}`);
  if (ctx.tags03?.length > 0) parts.push(`Tag03: ${ctx.tags03.join(', ')}`);
  if (ctx.recurring) parts.push(`Recorrente: ${ctx.recurring}`);
  return parts.join(' | ');
};

// Lista todos os usuários do sistema (para o seletor)
export const getSystemUsers = async (): Promise<Array<{ id: string; email: string; name: string; role: string }>> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .neq('role', 'pending')
    .order('name');

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
  return data || [];
};

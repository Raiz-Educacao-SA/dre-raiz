import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircleQuestion, Clock, CheckCircle2, XCircle, AlertTriangle, Zap, Loader2, RotateCcw, Save, User } from 'lucide-react';
import { getAllInquiries, getInquiryStats, getSlaConfig, updateSlaConfig } from '../../services/inquiryService';
import type { DreInquiry, InquiryStats, InquirySlaConfig, InquiryStatus } from '../../types';
import InquiryThreadPanel from './InquiryThreadPanel';
import { toast } from 'sonner';

interface InquiryAdminDashboardProps {
  currentUser: { email: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  answered: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  reopened: 'bg-purple-100 text-purple-700',
  expired:  'bg-gray-100 text-gray-500',
  closed:   'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', answered: 'Respondida', approved: 'Aprovada',
  rejected: 'Devolvida', reopened: 'Reaberta', expired: 'Expirada', closed: 'Encerrada',
};

const InquiryAdminDashboard: React.FC<InquiryAdminDashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [inquiries, setInquiries] = useState<DreInquiry[]>([]);
  const [slaConfig, setSlaConfig] = useState<InquirySlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedInquiry, setSelectedInquiry] = useState<DreInquiry | null>(null);
  const [savingSla, setSavingSla] = useState(false);

  // Editable SLA values
  const [normalHours, setNormalHours] = useState(48);
  const [normalReminder, setNormalReminder] = useState(24);
  const [urgentHours, setUrgentHours] = useState(24);
  const [urgentReminder, setUrgentReminder] = useState(6);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, inqs, sla] = await Promise.all([
      getInquiryStats(),
      getAllInquiries(filterStatus ? { status: filterStatus as InquiryStatus } : undefined),
      getSlaConfig(),
    ]);
    setStats(s);
    setInquiries(inqs);
    setSlaConfig(sla);
    // Init SLA form
    const n = sla.find(c => c.priority === 'normal');
    const u = sla.find(c => c.priority === 'urgent');
    if (n) { setNormalHours(n.deadline_hours); setNormalReminder(n.reminder_hours); }
    if (u) { setUrgentHours(u.deadline_hours); setUrgentReminder(u.reminder_hours); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSla = async () => {
    setSavingSla(true);
    await Promise.all([
      updateSlaConfig('normal', normalHours, normalReminder),
      updateSlaConfig('urgent', urgentHours, urgentReminder),
    ]);
    toast.success('SLA atualizado');
    setSavingSla(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Pendentes', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Respondidas', value: stats.answered, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Aprovadas', value: stats.approved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Devolvidas', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Reabertas', value: stats.reopened, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Expiradas', value: stats.expired, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* SLA Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#1B75BB]" />
            <h3 className="text-sm font-bold text-gray-800">Configuração de SLA</h3>
          </div>
          <button
            onClick={handleSaveSla}
            disabled={savingSla}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1B75BB] text-white text-[10px] font-bold disabled:opacity-50"
          >
            {savingSla ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Salvar SLA
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Normal</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-gray-500 block">Prazo (horas)</label>
                <input type="number" value={normalHours} onChange={e => setNormalHours(Number(e.target.value))}
                  className="w-full border border-blue-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
              <div>
                <label className="text-[8px] text-gray-500 block">Lembrete antes (h)</label>
                <input type="number" value={normalReminder} onChange={e => setNormalReminder(Number(e.target.value))}
                  className="w-full border border-blue-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
            </div>
          </div>
          <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><Zap size={10} /> Urgente</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[8px] text-gray-500 block">Prazo (horas)</label>
                <input type="number" value={urgentHours} onChange={e => setUrgentHours(Number(e.target.value))}
                  className="w-full border border-red-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
              <div>
                <label className="text-[8px] text-gray-500 block">Lembrete antes (h)</label>
                <input type="number" value={urgentReminder} onChange={e => setUrgentReminder(Number(e.target.value))}
                  className="w-full border border-red-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Todas as Solicitações</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setFilterStatus('')}
              className={`text-[8px] font-bold px-2 py-1 rounded-full ${!filterStatus ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500'}`}>
              Todas
            </button>
            {['pending', 'answered', 'approved', 'rejected', 'reopened', 'expired'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-[8px] font-bold px-2 py-1 rounded-full ${filterStatus === s ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">#</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Assunto</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Solicitante</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Responsável</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Status</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Prioridade</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Criação</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">SLA</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400 text-xs">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : inquiries.map(inq => {
                const slaBreached = inq.sla_breached;
                const slaClose = !slaBreached && inq.sla_deadline_at && new Date(inq.sla_deadline_at) < new Date(Date.now() + 6 * 3600000);
                return (
                  <tr
                    key={inq.id}
                    onClick={() => setSelectedInquiry(inq)}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{inq.id}</td>
                    <td className="px-3 py-2 font-bold text-gray-700 max-w-[200px] truncate">{inq.subject}</td>
                    <td className="px-3 py-2 text-gray-500">{inq.requester_name}</td>
                    <td className="px-3 py-2 text-gray-500">{inq.assignee_name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[inq.status]}`}>
                        {STATUS_LABELS[inq.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {inq.priority === 'urgent' ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5 w-fit">
                          <Zap size={8} /> Urgente
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400">Normal</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-400">{formatDate(inq.created_at)}</td>
                    <td className="px-3 py-2">
                      {slaBreached ? (
                        <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5">
                          <AlertTriangle size={9} /> Expirado
                        </span>
                      ) : slaClose ? (
                        <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                          <Clock size={9} /> Próximo
                        </span>
                      ) : inq.sla_deadline_at ? (
                        <span className="text-[9px] text-gray-400">{formatDate(inq.sla_deadline_at)}</span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thread Panel */}
      {selectedInquiry && (
        <InquiryThreadPanel
          inquiry={selectedInquiry}
          currentUser={currentUser}
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
};

export default InquiryAdminDashboard;

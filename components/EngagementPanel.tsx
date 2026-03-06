import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, AlertTriangle, Mail, Loader2, Users, Flame, Star, Eye, ArrowUpDown, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import type { EngagementStat, WeeklyHistory } from '../services/supabaseService';

type SortField = 'name' | 'score' | 'level' | 'total_sessions_7d' | 'total_minutes_7d' | 'days_since_last_access' | 'active_days_7d';
type SortDir = 'asc' | 'desc';

// Score semanal — thresholds ajustados para 7 dias
// Minutos: max 150min (2.5h/semana), Sessoes: max 7 (1/dia), Dias ativos: max 5 (dias uteis)
function calcWeeklyScore(minutes: number, sessions: number, activeDays: number): number {
  return Math.min(100, Math.round(
    (Math.min(minutes, 150) / 150) * 50 +
    (Math.min(sessions, 7) / 7) * 25 +
    (Math.min(activeDays, 5) / 5) * 25
  ));
}

function getEngagementLevel(score: number): { level: string; color: string; bgColor: string; icon: React.ReactNode } {
  if (score >= 75) return { level: 'Campea(o)', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <Trophy size={14} className="text-amber-500" /> };
  if (score >= 50) return { level: 'Engajado(a)', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: <Flame size={14} className="text-green-500" /> };
  if (score >= 25) return { level: 'Moderado(a)', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <Star size={14} className="text-blue-500" /> };
  if (score > 0) return { level: 'Iniciante', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', icon: <Eye size={14} className="text-orange-500" /> };
  return { level: 'Inativo(a)', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <AlertTriangle size={14} className="text-red-500" /> };
}

function getLevelColor(score: number): string {
  if (score >= 75) return 'bg-amber-500';
  if (score >= 50) return 'bg-green-500';
  if (score >= 25) return 'bg-blue-500';
  if (score > 0) return 'bg-orange-500';
  return 'bg-gray-300';
}

function getLevelDot(score: number): string {
  if (score >= 75) return 'bg-amber-400';
  if (score >= 50) return 'bg-green-400';
  if (score >= 25) return 'bg-blue-400';
  if (score > 0) return 'bg-orange-400';
  return 'bg-gray-300';
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'manager': return 'Gestor';
    case 'approver': return 'Aprovador';
    case 'viewer': return 'Visualizador';
    default: return role;
  }
}

const EngagementPanel: React.FC = () => {
  const [stats, setStats] = useState<EngagementStat[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('total_minutes_7d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{ email: string; ok: boolean } | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [statsData, historyData] = await Promise.all([
      supabaseService.getEngagementStats(),
      supabaseService.getEngagementWeeklyHistory(),
    ]);
    setStats(statsData);
    setWeeklyHistory(historyData);
    setLoading(false);
  };

  // Historico por usuario: { user_id: WeeklyHistory[] }
  const historyByUser = useMemo(() => {
    const map: Record<string, WeeklyHistory[]> = {};
    for (const h of weeklyHistory) {
      if (!map[h.user_id]) map[h.user_id] = [];
      map[h.user_id].push(h);
    }
    return map;
  }, [weeklyHistory]);

  // Weeks labels (do historico)
  const weekLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const h of weeklyHistory) {
      labels.add(h.week_label);
    }
    return Array.from(labels);
  }, [weeklyHistory]);

  // Stats com score
  const statsWithScore = useMemo(() => {
    return stats.map(s => {
      const score = calcWeeklyScore(s.total_minutes_7d, s.total_sessions_7d, s.active_days_7d);
      const userHistory = historyByUser[s.user_id] || [];
      // Tendencia: score da semana atual vs semana anterior
      const scores = userHistory.map(h => calcWeeklyScore(h.total_minutes, h.total_sessions, h.active_days));
      const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;
      return { ...s, score, trend, weeklyScores: scores };
    });
  }, [stats, historyByUser]);

  const sortedStats = useMemo(() => {
    let filtered = statsWithScore;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name?.toLowerCase().includes(term) || s.email.toLowerCase().includes(term));
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(s => getEngagementLevel(s.score).level === filterLevel);
    }

    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'name') {
        va = (a.name || '').toLowerCase();
        vb = (b.name || '').toLowerCase();
      } else if (sortField === 'score' || sortField === 'level') {
        // Nivel e score ordenam pelo score numerico
        va = a.score;
        vb = b.score;
      } else {
        va = a[sortField];
        vb = b[sortField];
      }
      if (sortDir === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
      return va < vb ? 1 : va > vb ? -1 : 0;
    });
  }, [statsWithScore, sortField, sortDir, searchTerm, filterLevel]);

  const summary = useMemo(() => {
    const levels = statsWithScore.map(s => ({ ...getEngagementLevel(s.score), score: s.score }));
    return {
      total: statsWithScore.length,
      campeoes: levels.filter(l => l.level === 'Campea(o)').length,
      engajados: levels.filter(l => l.level === 'Engajado(a)').length,
      moderados: levels.filter(l => l.level === 'Moderado(a)').length,
      iniciantes: levels.filter(l => l.level === 'Iniciante').length,
      inativos: levels.filter(l => l.level === 'Inativo(a)').length,
      avgScore: levels.length > 0 ? Math.round(levels.reduce((s, l) => s + l.score, 0) / levels.length) : 0,
    };
  }, [statsWithScore]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleSendReminder = async (stat: EngagementStat & { score: number }) => {
    setSendingEmail(stat.email);
    setEmailResult(null);
    try {
      const res = await fetch('/api/send-engagement-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stat.name,
          email: stat.email,
          role: stat.role,
          score: stat.score,
          days_inactive: stat.days_since_last_access,
          total_sessions: stat.total_sessions_7d,
          total_minutes: stat.total_minutes_7d,
          active_days: stat.active_days_7d,
        }),
      });
      const data = await res.json();
      setEmailResult({ email: stat.email, ok: res.ok });
      if (!res.ok) console.error('Email error:', data);
    } catch (err) {
      setEmailResult({ email: stat.email, ok: false });
      console.error('Email send error:', err);
    } finally {
      setSendingEmail(null);
      setTimeout(() => setEmailResult(null), 5000);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown size={12} className={`inline ml-1 ${sortField === field ? 'text-blue-600' : 'text-gray-300'}`} />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-gray-500">Carregando dados de engajamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard label="Total Usuarios" value={summary.total} icon={<Users size={18} />} color="gray" />
        <SummaryCard label="Campeoes" value={summary.campeoes} icon={<Trophy size={18} />} color="amber" onClick={() => setFilterLevel(f => f === 'Campea(o)' ? 'all' : 'Campea(o)')} active={filterLevel === 'Campea(o)'} />
        <SummaryCard label="Engajados" value={summary.engajados} icon={<Flame size={18} />} color="green" onClick={() => setFilterLevel(f => f === 'Engajado(a)' ? 'all' : 'Engajado(a)')} active={filterLevel === 'Engajado(a)'} />
        <SummaryCard label="Moderados" value={summary.moderados} icon={<Star size={18} />} color="blue" onClick={() => setFilterLevel(f => f === 'Moderado(a)' ? 'all' : 'Moderado(a)')} active={filterLevel === 'Moderado(a)'} />
        <SummaryCard label="Iniciantes" value={summary.iniciantes} icon={<Eye size={18} />} color="orange" onClick={() => setFilterLevel(f => f === 'Iniciante' ? 'all' : 'Iniciante')} active={filterLevel === 'Iniciante'} />
        <SummaryCard label="Inativos" value={summary.inativos} icon={<AlertTriangle size={18} />} color="red" onClick={() => setFilterLevel(f => f === 'Inativo(a)' ? 'all' : 'Inativo(a)')} active={filterLevel === 'Inativo(a)'} />
        <SummaryCard label="Score Medio" value={`${summary.avgScore}%`} icon={<TrendingUp size={18} />} color="purple" />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        {filterLevel !== 'all' && (
          <button onClick={() => setFilterLevel('all')} className="text-xs text-blue-600 hover:text-blue-800 underline">
            Limpar filtro
          </button>
        )}
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          Atualizar
        </button>
        <span className="text-xs text-gray-400">{sortedStats.length} usuarios | Ranking semanal (7 dias)</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('name')} className="hover:text-gray-900">
                  Usuario <SortIcon field="name" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('level')} className="hover:text-gray-900">
                  Nivel <SortIcon field="level" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('score')} className="hover:text-gray-900">
                  Score <SortIcon field="score" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 min-w-[140px]">Ultimas 5 Semanas</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('total_sessions_7d')} className="hover:text-gray-900">
                  Sessoes <SortIcon field="total_sessions_7d" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('total_minutes_7d')} className="hover:text-gray-900">
                  Tempo <SortIcon field="total_minutes_7d" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('active_days_7d')} className="hover:text-gray-900">
                  Dias Ativos <SortIcon field="active_days_7d" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">
                <button onClick={() => handleSort('days_since_last_access')} className="hover:text-gray-900">
                  Ult. Acesso <SortIcon field="days_since_last_access" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">Acao</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat) => {
              const eng = getEngagementLevel(stat.score);
              const isInactive = stat.days_since_last_access > 7;
              const isExpanded = expandedUser === stat.user_id;
              const userHist = historyByUser[stat.user_id] || [];
              return (
                <React.Fragment key={stat.user_id}>
                  <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isInactive ? 'bg-red-50/30' : ''}`}
                      onClick={() => setExpandedUser(isExpanded ? null : stat.user_id)}>
                    {/* Usuario */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {stat.photo_url ? (
                          <img src={stat.photo_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                            {(stat.name || stat.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 text-xs">{stat.name || stat.email.split('@')[0]}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              stat.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                              stat.role === 'manager' ? 'bg-blue-100 text-blue-600' :
                              stat.role === 'approver' ? 'bg-green-100 text-green-600' :
                              'bg-gray-100 text-gray-500'
                            }`}>{roleLabel(stat.role)}</span>
                          </div>
                          <div className="text-[11px] text-gray-400">{stat.email}</div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400 ml-auto" /> : <ChevronDown size={14} className="text-gray-300 ml-auto" />}
                      </div>
                    </td>
                    {/* Nivel */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${eng.bgColor} ${eng.color}`}>
                        {eng.icon} {eng.level}
                      </span>
                    </td>
                    {/* Score + trend */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${getLevelColor(stat.score)}`} style={{ width: `${stat.score}%` }} />
                        </div>
                        <span className="text-xs font-black text-gray-700 w-6">{stat.score}</span>
                        {stat.trend !== 0 && (
                          <span className={`text-[10px] font-bold flex items-center ${stat.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {stat.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {stat.trend > 0 ? '+' : ''}{stat.trend}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Ultimas 5 semanas — mini timeline */}
                    <td className="px-3 py-3">
                      <div className="flex items-end justify-center gap-1">
                        {stat.weeklyScores.map((ws, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5" title={`${weekLabels[i] || `S${i+1}`}: Score ${ws}`}>
                            <div className="w-5 bg-gray-100 rounded-sm overflow-hidden relative" style={{ height: '28px' }}>
                              <div
                                className={`absolute bottom-0 w-full rounded-sm transition-all ${getLevelColor(ws)}`}
                                style={{ height: `${Math.max(ws > 0 ? 10 : 0, (ws / 100) * 28)}px` }}
                              />
                            </div>
                            <span className="text-[8px] text-gray-400 font-mono">{weekLabels[i] || ''}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    {/* Sessoes */}
                    <td className="px-3 py-3 text-center font-mono text-xs font-bold text-gray-700">{stat.total_sessions_7d}</td>
                    {/* Tempo */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-gray-700">{formatMinutes(stat.total_minutes_7d)}</span>
                    </td>
                    {/* Dias ativos */}
                    <td className="px-3 py-3 text-center font-mono text-xs font-bold text-gray-700">{stat.active_days_7d}/7</td>
                    {/* Ultimo acesso */}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold ${
                        stat.days_since_last_access <= 1 ? 'text-green-600' :
                        stat.days_since_last_access <= 3 ? 'text-blue-600' :
                        stat.days_since_last_access <= 7 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {stat.days_since_last_access === 0 ? 'Hoje' :
                         stat.days_since_last_access === 1 ? 'Ontem' :
                         `${stat.days_since_last_access}d`}
                      </span>
                    </td>
                    {/* Acao */}
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {emailResult?.email === stat.email ? (
                        emailResult.ok ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={14} /> Enviado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 text-xs"><XCircle size={14} /> Erro</span>
                        )
                      ) : (
                        <button
                          onClick={() => handleSendReminder(stat)}
                          disabled={sendingEmail === stat.email}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            stat.days_since_last_access > 7
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Enviar lembrete por email"
                        >
                          {sendingEmail === stat.email ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Mail size={12} />
                          )}
                          Lembrete
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Linha expandida — detalhes semanais */}
                  {isExpanded && userHist.length > 0 && (
                    <tr className="bg-gray-50/80">
                      <td colSpan={9} className="px-6 py-3">
                        <div className="flex items-start gap-6">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-1">Historico Semanal</div>
                          <div className="flex gap-3 flex-wrap">
                            {userHist.map((wh, i) => {
                              const ws = calcWeeklyScore(wh.total_minutes, wh.total_sessions, wh.active_days);
                              const wEng = getEngagementLevel(ws);
                              const isCurrent = i === userHist.length - 1;
                              return (
                                <div key={i} className={`border rounded-lg p-3 min-w-[120px] transition-all ${isCurrent ? 'ring-2 ring-blue-400 shadow-sm' : ''} ${wEng.bgColor}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-bold text-gray-600">Sem. {wh.week_label}</span>
                                    {isCurrent && <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded">ATUAL</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {wEng.icon}
                                    <span className={`text-sm font-black ${wEng.color}`}>{ws}</span>
                                    <span className={`text-[10px] font-bold ${wEng.color}`}>{wEng.level}</span>
                                  </div>
                                  <div className="space-y-0.5 text-[10px] text-gray-500">
                                    <div>{wh.total_sessions} sessoes</div>
                                    <div>{formatMinutes(wh.total_minutes)}</div>
                                    <div>{wh.active_days} dias ativos</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {sortedStats.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhum usuario encontrado{searchTerm ? ` para "${searchTerm}"` : ''}.
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 px-1">
        <span className="font-bold uppercase">Criterios semanais (7 dias):</span>
        <span>Tempo (50%): max 2h30</span>
        <span>Sessoes (25%): max 7</span>
        <span>Dias ativos (25%): max 5</span>
        <span className="ml-auto">Clique na linha para ver historico</span>
      </div>
    </div>
  );
};

function SummaryCard({ label, value, icon, color, onClick, active }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; onClick?: () => void; active?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-3 text-center transition-all ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${active ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : ''}`}
    >
      <div className="flex justify-center mb-1 opacity-60">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

export default EngagementPanel;

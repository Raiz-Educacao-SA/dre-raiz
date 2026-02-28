import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

interface Alert {
  id: string;
  alert_type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  metric_value: number | null;
  threshold_value: number | null;
  created_at: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  loading?: boolean;
  onDismiss?: (alertId: string) => void;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; bg: string; border: string; text: string; badge: string }> = {
  high: {
    icon: AlertTriangle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
  },
  medium: {
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  low: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
};

function formatAlertType(type: string): string {
  return type
    .replace(/^TREND_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function AlertsPanel({ alerts, loading, onDismiss }: AlertsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Alertas Ativos</h3>
        {alerts.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {alerts.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum alerta ativo</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sorted.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-2 p-3 rounded-lg border ${config.bg} ${config.border}`}
              >
                <Icon size={14} className={`${config.text} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.badge}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-500 truncate">
                      {formatAlertType(alert.alert_type)}
                    </span>
                  </div>
                  <p className={`text-xs ${config.text}`}>{alert.message}</p>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                    title="Dispensar"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

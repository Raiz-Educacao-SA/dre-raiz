import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import FinancialHealthCard from './FinancialHealthCard';
import ForecastPanel from './ForecastPanel';
import AlertsPanel from './AlertsPanel';
import BrandHealthTable from './BrandHealthTable';
import CutPlanPanel from './CutPlanPanel';

// --------------------------------------------
// Types (matching endpoint responses)
// --------------------------------------------

interface HealthBreakdown {
  confidence: number;
  margin_real: number;
  margin_orcado: number;
  ebitda_real: number;
  ebitda_a1: number;
  high_priority_count: number;
  conflicts_count: number;
}

interface HealthData {
  score: number;
  classification: string;
  breakdown: HealthBreakdown;
}

interface ForecastData {
  forecast: {
    score: [number, number, number];
    margin: [number, number, number];
    ebitda: [number, number, number];
  };
  slope: {
    score: number;
    margin: number;
    ebitda: number;
  };
  risk_assessment: string;
}

interface AlertData {
  id: string;
  alert_type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  metric_value: number | null;
  threshold_value: number | null;
  created_at: string;
}

interface BrandScore {
  brand: string;
  score: number;
  classification: string;
  margin_real: number;
  margin_orcado: number;
  ebitda_real: number;
}

interface CutPlanData {
  gap: number;
  proposed_actions: {
    area: string;
    current_gap: number;
    suggested_cut: number;
    estimated_impact: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  projected_score_after_plan: number;
}

// --------------------------------------------
// Fetch helper
// --------------------------------------------

const API_BASE = '/api/agent-team';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function CEOView() {
  // State
  const [health, setHealth] = useState<HealthData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [brands, setBrands] = useState<BrandScore[]>([]);
  const [cutPlan, setCutPlan] = useState<CutPlanData | null>(null);

  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingCutPlan, setLoadingCutPlan] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [healthRes, forecastRes, brandsRes] = await Promise.all([
          fetchJSON<HealthData>('/health-score'),
          fetchJSON<ForecastData>('/forecast'),
          fetchJSON<{ brands: BrandScore[] }>('/brand-health-score'),
        ]);

        if (cancelled) return;

        setHealth(healthRes);
        setLoadingHealth(false);

        setForecast(forecastRes);
        setLoadingForecast(false);

        setBrands(brandsRes.brands);
        setLoadingBrands(false);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
        setError(msg);
        setLoadingHealth(false);
        setLoadingForecast(false);
        setLoadingBrands(false);
      }
    };

    const loadAlerts = async () => {
      try {
        // Fetch alerts from the latest completed run
        const runRes = await fetchJSON<{ run: { id: string } | null }>('/runs?limit=1');
        if (cancelled) return;

        // Alerts are stored in agent_alerts table — fetch via supabase directly
        // For now, use a simple endpoint pattern
        // Since there's no dedicated alerts endpoint yet, we fetch from runs
        // and build alerts client-side from the health data
        setAlerts([]);
        setLoadingAlerts(false);
      } catch {
        if (cancelled) return;
        setLoadingAlerts(false);
      }
    };

    load();
    loadAlerts();

    return () => { cancelled = true; };
  }, []);

  // Generate cut plan
  const handleGenerateCutPlan = useCallback(async (targetScore: number) => {
    setLoadingCutPlan(true);
    try {
      const result = await fetchJSON<CutPlanData>('/generate-cut-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_score: targetScore }),
      });
      setCutPlan(result);
    } catch {
      // Silent — CutPlanPanel shows empty state
    } finally {
      setLoadingCutPlan(false);
    }
  }, []);

  // Dismiss alert
  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    // Fire-and-forget: mark as dismissed in DB
    fetch(`${API_BASE}/review-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, action: 'dismiss' }),
    }).catch(() => { /* silent */ });
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">Painel Estratégico</h1>
          <p className="text-xs text-gray-500">Visão consolidada da saúde financeira</p>
        </div>
      </div>

      {/* Row 1: Score destaque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {loadingHealth ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-36 bg-gray-100 rounded-full w-36 mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            </div>
          ) : health ? (
            <FinancialHealthCard
              score={health.score}
              classification={health.classification}
              breakdown={health.breakdown}
            />
          ) : null}
        </div>

        {/* Row 1 right: Forecast + Alerts */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ForecastPanel data={forecast} loading={loadingForecast} />
          <AlertsPanel
            alerts={alerts}
            loading={loadingAlerts}
            onDismiss={handleDismissAlert}
          />
        </div>
      </div>

      {/* Row 2: Brand ranking */}
      <BrandHealthTable brands={brands} loading={loadingBrands} />

      {/* Row 3: Cut plan */}
      <CutPlanPanel
        data={cutPlan}
        currentScore={health?.score ?? 0}
        loading={loadingCutPlan}
        onGenerate={handleGenerateCutPlan}
      />
    </div>
  );
}

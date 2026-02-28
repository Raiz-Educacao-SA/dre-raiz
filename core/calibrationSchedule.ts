// ============================================
// Core Calibration Schedule — Adaptive Intelligence
// Funções puras — zero side effects, zero I/O
// Integra ciclo mensal de auto-calibração
// com o scheduleEngine existente
// ============================================

import type { ScheduleConfig } from './scheduleEngine';
import { calculateNextRun, shouldRunNow, validateScheduleConfig } from './scheduleEngine';
import type { FeedbackAnalysis } from './feedbackEngine';
import type { CalibrationResult } from './modelCalibration';
import type { ConfidenceResult } from './confidenceScore';

// --------------------------------------------
// Types
// --------------------------------------------

/** Tipo de evento no ciclo de calibração */
export type CalibrationEventType =
  | 'feedback_collection'   // Coleta de dados feedback (forecast vs realizado)
  | 'error_analysis'        // Execução do feedbackEngine
  | 'calibration'           // Execução do modelCalibration
  | 'confidence_update'     // Recálculo do confidenceScore
  | 'report_generation';    // Geração do relatório adaptivo

/** Status de um evento de calibração */
export type CalibrationEventStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Evento individual no ciclo de calibração */
export interface CalibrationEvent {
  event_type: CalibrationEventType;
  status: CalibrationEventStatus;
  scheduled_at: string;      // ISO 8601
  executed_at: string | null;
  duration_ms: number;
  error_message: string | null;
}

/** Ciclo completo de calibração (1 execução mensal) */
export interface CalibrationCycle {
  cycle_id: string;           // formato: 'cal-YYYY-MM'
  reference_period: string;   // 'YYYY-MM'
  status: 'pending' | 'running' | 'completed' | 'failed';
  events: CalibrationEvent[];
  feedback_analysis: FeedbackAnalysis | null;
  calibration_result: CalibrationResult | null;
  confidence_result: ConfidenceResult | null;
  started_at: string | null;
  completed_at: string | null;
}

/** Configuração do schedule de calibração */
export interface CalibrationScheduleConfig {
  /** Schedule base (reutiliza ScheduleConfig do scheduleEngine) */
  schedule: ScheduleConfig;
  /** Número mínimo de feedback entries para executar calibração */
  min_feedback_entries: number;
  /** Se true, pula calibração quando confiança é muito alta */
  skip_if_healthy: boolean;
  /** Threshold de confiança acima do qual pula calibração */
  skip_threshold: number;
  /** Número máximo de ciclos armazenados no histórico */
  max_history_cycles: number;
}

// --------------------------------------------
// Default Config
// --------------------------------------------

export const DEFAULT_CALIBRATION_SCHEDULE: CalibrationScheduleConfig = {
  schedule: {
    frequency: 'monthly',
    execution_time: '03:00',  // 3AM — baixa carga
    timezone: 'America/Sao_Paulo',
    day_of_month: 5,          // Dia 5 de cada mês (após fechamento)
    is_active: true,
    next_run_at: null,
    last_run_at: null,
  },
  min_feedback_entries: 3,
  skip_if_healthy: true,
  skip_threshold: 85,
  max_history_cycles: 24,  // 2 anos de histórico
};

// --------------------------------------------
// Helpers
// --------------------------------------------

/**
 * Gera o cycle_id a partir de um período de referência.
 * Formato: 'cal-YYYY-MM'
 */
export function buildCycleId(referencePeriod: string): string {
  return `cal-${referencePeriod}`;
}

/**
 * Extrai o período de referência a partir de uma data ISO.
 * Retorna o mês anterior (dados do mês fechado).
 * Ex: '2026-03-05T03:00:00Z' → '2026-02'
 */
export function extractReferencePeriod(isoDate: string): string {
  const d = new Date(isoDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed

  // Mês anterior
  if (month === 0) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

// --------------------------------------------
// Cycle Planning
// --------------------------------------------

/**
 * Cria um novo ciclo de calibração com todos os eventos pendentes.
 * A ordem dos eventos define o pipeline de execução.
 *
 * Pipeline: feedback_collection → error_analysis → calibration → confidence_update → report_generation
 */
export function createCalibrationCycle(
  referencePeriod: string,
  scheduledAt: string,
): CalibrationCycle {
  const eventTypes: CalibrationEventType[] = [
    'feedback_collection',
    'error_analysis',
    'calibration',
    'confidence_update',
    'report_generation',
  ];

  return {
    cycle_id: buildCycleId(referencePeriod),
    reference_period: referencePeriod,
    status: 'pending',
    events: eventTypes.map(event_type => ({
      event_type,
      status: 'pending' as CalibrationEventStatus,
      scheduled_at: scheduledAt,
      executed_at: null,
      duration_ms: 0,
      error_message: null,
    })),
    feedback_analysis: null,
    calibration_result: null,
    confidence_result: null,
    started_at: null,
    completed_at: null,
  };
}

// --------------------------------------------
// Execution Decisions
// --------------------------------------------

/**
 * Determina se o ciclo de calibração deve ser executado agora.
 *
 * Verifica:
 * 1. Schedule ativo e horário atingido (via shouldRunNow)
 * 2. Número mínimo de feedback entries atingido
 * 3. Se skip_if_healthy, verifica confiança atual
 *
 * Retorna { should_run, reason }.
 */
export function shouldCalibrate(
  config: CalibrationScheduleConfig,
  currentTime: string,
  feedbackCount: number,
  currentConfidenceScore: number | null,
): { should_run: boolean; reason: string } {
  // 1. Check schedule timing
  if (!shouldRunNow(config.schedule, currentTime)) {
    return { should_run: false, reason: 'Fora do horário programado.' };
  }

  // 2. Check minimum feedback entries
  if (feedbackCount < config.min_feedback_entries) {
    return {
      should_run: false,
      reason: `Feedback insuficiente: ${feedbackCount}/${config.min_feedback_entries} entries.`,
    };
  }

  // 3. Check if should skip due to high health
  if (config.skip_if_healthy && currentConfidenceScore !== null) {
    if (currentConfidenceScore >= config.skip_threshold) {
      return {
        should_run: false,
        reason: `Confiança alta (${currentConfidenceScore}>=${config.skip_threshold}). Calibração dispensada.`,
      };
    }
  }

  return {
    should_run: true,
    reason: `Condições atendidas: ${feedbackCount} entries, horário correto.`,
  };
}

// --------------------------------------------
// Event Progression
// --------------------------------------------

/**
 * Retorna o próximo evento pendente no ciclo.
 * Retorna null se todos estão completos ou se há falha.
 */
export function getNextPendingEvent(cycle: CalibrationCycle): CalibrationEvent | null {
  if (cycle.status === 'failed' || cycle.status === 'completed') return null;

  for (const event of cycle.events) {
    if (event.status === 'pending') return event;
    if (event.status === 'failed') return null; // Pipeline para em falha
  }

  return null; // Todos completos
}

/**
 * Verifica se todos os eventos do ciclo estão completos ou skipped.
 */
export function isCycleComplete(cycle: CalibrationCycle): boolean {
  return cycle.events.every(e => e.status === 'completed' || e.status === 'skipped');
}

/**
 * Verifica se algum evento do ciclo falhou.
 */
export function isCycleFailed(cycle: CalibrationCycle): boolean {
  return cycle.events.some(e => e.status === 'failed');
}

// --------------------------------------------
// Schedule Integration
// --------------------------------------------

/**
 * Calcula a próxima execução do schedule de calibração.
 * Reutiliza calculateNextRun do scheduleEngine.
 */
export function calculateNextCalibration(
  config: CalibrationScheduleConfig,
  fromDate: string,
): string {
  return calculateNextRun(config.schedule, fromDate);
}

/**
 * Valida a configuração do schedule de calibração.
 * Reutiliza validateScheduleConfig + validações adicionais.
 */
export function validateCalibrationSchedule(
  config: CalibrationScheduleConfig,
): string[] {
  const errors = validateScheduleConfig(config.schedule);

  if (config.min_feedback_entries < 1) {
    errors.push('min_feedback_entries deve ser >= 1');
  }

  if (config.skip_threshold < 0 || config.skip_threshold > 100) {
    errors.push('skip_threshold deve estar entre 0 e 100');
  }

  if (config.max_history_cycles < 1) {
    errors.push('max_history_cycles deve ser >= 1');
  }

  if (config.schedule.frequency !== 'monthly') {
    errors.push('Calibração deve ter frequência mensal (frequency: "monthly")');
  }

  return errors;
}

// --------------------------------------------
// History Management
// --------------------------------------------

/**
 * Limita o histórico de ciclos ao máximo configurado.
 * Remove os mais antigos (início do array).
 * Retorna novo array (não muta o original).
 */
export function trimCycleHistory(
  cycles: CalibrationCycle[],
  maxCycles: number,
): CalibrationCycle[] {
  if (cycles.length <= maxCycles) return [...cycles];
  return cycles.slice(cycles.length - maxCycles);
}

/**
 * Calcula estatísticas do histórico de calibração.
 */
export function summarizeCycleHistory(cycles: CalibrationCycle[]): {
  total_cycles: number;
  completed: number;
  failed: number;
  skipped_events: number;
  avg_duration_ms: number;
  last_completed_period: string | null;
} {
  const completed = cycles.filter(c => c.status === 'completed');
  const failed = cycles.filter(c => c.status === 'failed');

  // Average duration of completed cycles
  const durations = completed
    .filter(c => c.started_at && c.completed_at)
    .map(c => new Date(c.completed_at!).getTime() - new Date(c.started_at!).getTime())
    .filter(d => d > 0 && isFinite(d));

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    : 0;

  // Count skipped events across all cycles
  const totalSkipped = cycles.reduce(
    (sum, c) => sum + c.events.filter(e => e.status === 'skipped').length,
    0,
  );

  // Last completed period
  const lastCompleted = completed.length > 0
    ? completed[completed.length - 1].reference_period
    : null;

  return {
    total_cycles: cycles.length,
    completed: completed.length,
    failed: failed.length,
    skipped_events: totalSkipped,
    avg_duration_ms: avgDuration,
    last_completed_period: lastCompleted,
  };
}

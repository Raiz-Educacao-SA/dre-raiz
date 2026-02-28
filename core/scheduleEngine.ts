// ============================================
// Core Schedule Engine
// Funções puras — zero side effects, zero I/O
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  execution_time: string;   // "HH:MM"
  timezone: string;         // IANA timezone
  day_of_week?: number;     // 0-6 (Sunday-Saturday), for weekly
  day_of_month?: number;    // 1-28, for monthly
  is_active: boolean;
  next_run_at: string | null;  // ISO 8601
  last_run_at: string | null;  // ISO 8601
}

export interface DateContext {
  year: string;
  month_from: string;
  month_to: string;
  current_date: string;   // YYYY-MM-DD
  current_month: string;  // YYYY-MM
}

// --------------------------------------------
// Parse execution time
// --------------------------------------------

/**
 * Parseia "HH:MM" para horas e minutos.
 * Retorna { hours: 0, minutes: 0 } para input inválido.
 */
export function parseExecutionTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(':');
  if (parts.length !== 2) return { hours: 0, minutes: 0 };

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return { hours: 0, minutes: 0 };
  if (hours < 0 || hours > 23) return { hours: 0, minutes: 0 };
  if (minutes < 0 || minutes > 59) return { hours: 0, minutes: 0 };

  return { hours, minutes };
}

// --------------------------------------------
// Calculate next run
// --------------------------------------------

/**
 * Calcula a próxima execução com base na frequência e horário.
 *
 * @param schedule - Configuração do schedule
 * @param fromDate - Data base para cálculo (ISO 8601)
 * @returns ISO 8601 timestamp da próxima execução
 */
export function calculateNextRun(
  schedule: ScheduleConfig,
  fromDate: string,
): string {
  const { hours, minutes } = parseExecutionTime(schedule.execution_time);
  const from = new Date(fromDate);

  // Começar do dia seguinte ao fromDate
  const next = new Date(from);
  next.setUTCHours(hours, minutes, 0, 0);

  // Se o horário já passou hoje, avançar para amanhã
  if (next <= from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  switch (schedule.frequency) {
    case 'daily':
      // next já está correto (próximo dia com o horário)
      break;

    case 'weekly': {
      const targetDay = schedule.day_of_week ?? 1; // default segunda
      while (next.getUTCDay() !== targetDay) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
    }

    case 'monthly': {
      const targetDom = schedule.day_of_month ?? 1; // default dia 1
      // Se já passou o dia alvo este mês, ir para próximo mês
      // IMPORTANTE: setar dia para 1 ANTES de avançar mês para evitar
      // overflow de data (ex: Jan 31 + 1 mês = Mar 3, não Feb 28)
      if (next.getUTCDate() > targetDom) {
        next.setUTCDate(1);
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      next.setUTCDate(targetDom);
      break;
    }
  }

  return next.toISOString();
}

// --------------------------------------------
// Should run now
// --------------------------------------------

/**
 * Determina se um schedule deve ser executado agora.
 *
 * Regras:
 * 1. Schedule deve estar ativo
 * 2. next_run_at deve existir
 * 3. currentTime >= next_run_at
 * 4. Tolerância de 30 minutos (não executa se atrasou mais de 30min)
 *
 * @param schedule - Configuração do schedule
 * @param currentTime - Tempo atual (ISO 8601)
 * @returns true se deve executar
 */
export function shouldRunNow(
  schedule: ScheduleConfig,
  currentTime: string,
): boolean {
  if (!schedule.is_active) return false;
  if (!schedule.next_run_at) return false;

  const now = new Date(currentTime).getTime();
  const nextRun = new Date(schedule.next_run_at).getTime();

  if (isNaN(now) || isNaN(nextRun)) return false;

  // Deve ter passado do horário programado
  if (now < nextRun) return false;

  // Tolerância: não executar se atrasou mais de 30 minutos
  const toleranceMs = 30 * 60 * 1000;
  if (now - nextRun > toleranceMs) return false;

  return true;
}

// --------------------------------------------
// Build objective from template
// --------------------------------------------

/**
 * Substitui placeholders no template de objetivo.
 *
 * Placeholders suportados:
 * - {{year}} — ano atual
 * - {{month_from}} — mês inicial (YYYY-MM)
 * - {{month_to}} — mês final (YYYY-MM)
 * - {{current_date}} — data atual (YYYY-MM-DD)
 * - {{current_month}} — mês atual (YYYY-MM)
 */
export function buildObjectiveFromTemplate(
  template: string,
  context: DateContext,
): string {
  return template
    .replace(/\{\{year\}\}/g, context.year)
    .replace(/\{\{month_from\}\}/g, context.month_from)
    .replace(/\{\{month_to\}\}/g, context.month_to)
    .replace(/\{\{current_date\}\}/g, context.current_date)
    .replace(/\{\{current_month\}\}/g, context.current_month);
}

// --------------------------------------------
// Build date context
// --------------------------------------------

/**
 * Constrói DateContext a partir de uma data ISO.
 */
export function buildDateContext(isoDate: string): DateContext {
  const d = new Date(isoDate);
  const year = d.getUTCFullYear().toString();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');

  return {
    year,
    month_from: `${year}-01`,
    month_to: `${year}-12`,
    current_date: `${year}-${month}-${String(d.getUTCDate()).padStart(2, '0')}`,
    current_month: `${year}-${month}`,
  };
}

// --------------------------------------------
// Validate schedule config
// --------------------------------------------

/**
 * Valida uma configuração de schedule.
 * Retorna lista de erros (vazia = válido).
 */
export function validateScheduleConfig(config: {
  frequency: string;
  execution_time: string;
  timezone: string;
  day_of_week?: number;
  day_of_month?: number;
}): string[] {
  const errors: string[] = [];

  // Frequency
  if (!['daily', 'weekly', 'monthly'].includes(config.frequency)) {
    errors.push(`Frequência inválida: ${config.frequency}. Use: daily, weekly, monthly`);
  }

  // Execution time — valida formato E range
  if (!config.execution_time || !config.execution_time.match(/^\d{2}:\d{2}$/)) {
    errors.push(`Horário inválido: ${config.execution_time ?? '(vazio)'}. Use formato HH:MM`);
  } else {
    const parsed = parseExecutionTime(config.execution_time);
    // parseExecutionTime retorna {0,0} para ranges inválidos (ex: "25:00", "12:99")
    if (parsed.hours === 0 && parsed.minutes === 0 && config.execution_time !== '00:00') {
      errors.push(`Horário fora do range: ${config.execution_time}. Horas: 00-23, Minutos: 00-59`);
    }
  }

  // Day of week (for weekly)
  if (config.frequency === 'weekly') {
    if (config.day_of_week === undefined || config.day_of_week === null) {
      errors.push('day_of_week é obrigatório para frequência semanal');
    } else if (config.day_of_week < 0 || config.day_of_week > 6) {
      errors.push(`day_of_week inválido: ${config.day_of_week}. Use 0 (Domingo) a 6 (Sábado)`);
    }
  }

  // Day of month (for monthly)
  if (config.frequency === 'monthly') {
    if (config.day_of_month === undefined || config.day_of_month === null) {
      errors.push('day_of_month é obrigatório para frequência mensal');
    } else if (config.day_of_month < 1 || config.day_of_month > 28) {
      errors.push(`day_of_month inválido: ${config.day_of_month}. Use 1 a 28`);
    }
  }

  return errors;
}

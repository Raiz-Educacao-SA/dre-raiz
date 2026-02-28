import { describe, it, expect } from 'vitest';
import {
  parseExecutionTime,
  calculateNextRun,
  shouldRunNow,
  buildObjectiveFromTemplate,
  buildDateContext,
  validateScheduleConfig,
} from '../scheduleEngine';
import type { ScheduleConfig } from '../scheduleEngine';

// --------------------------------------------
// parseExecutionTime
// --------------------------------------------

describe('parseExecutionTime', () => {
  it('parses valid HH:MM', () => {
    expect(parseExecutionTime('08:30')).toEqual({ hours: 8, minutes: 30 });
    expect(parseExecutionTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    expect(parseExecutionTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('returns {0,0} for invalid formats', () => {
    expect(parseExecutionTime('25:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseExecutionTime('12:99')).toEqual({ hours: 0, minutes: 0 });
    expect(parseExecutionTime('abc')).toEqual({ hours: 0, minutes: 0 });
    expect(parseExecutionTime('')).toEqual({ hours: 0, minutes: 0 });
    expect(parseExecutionTime('1:30')).toEqual({ hours: 1, minutes: 30 });
  });

  it('rejects negative values', () => {
    expect(parseExecutionTime('-1:30')).toEqual({ hours: 0, minutes: 0 });
  });
});

// --------------------------------------------
// shouldRunNow
// --------------------------------------------

describe('shouldRunNow', () => {
  const baseSchedule: ScheduleConfig = {
    frequency: 'daily',
    execution_time: '08:00',
    timezone: 'UTC',
    is_active: true,
    next_run_at: '2026-02-28T08:00:00.000Z',
    last_run_at: null,
  };

  it('returns true when current time equals next_run_at', () => {
    expect(shouldRunNow(baseSchedule, '2026-02-28T08:00:00.000Z')).toBe(true);
  });

  it('returns true within 30-minute window', () => {
    expect(shouldRunNow(baseSchedule, '2026-02-28T08:15:00.000Z')).toBe(true);
    expect(shouldRunNow(baseSchedule, '2026-02-28T08:29:59.000Z')).toBe(true);
  });

  it('returns false beyond 30-minute window', () => {
    expect(shouldRunNow(baseSchedule, '2026-02-28T08:31:00.000Z')).toBe(false);
  });

  it('returns false when inactive', () => {
    const inactive = { ...baseSchedule, is_active: false };
    expect(shouldRunNow(inactive, '2026-02-28T08:00:00.000Z')).toBe(false);
  });

  it('returns false when no next_run_at', () => {
    const noNext = { ...baseSchedule, next_run_at: null };
    expect(shouldRunNow(noNext, '2026-02-28T08:00:00.000Z')).toBe(false);
  });

  it('returns false when before next_run_at', () => {
    expect(shouldRunNow(baseSchedule, '2026-02-28T07:59:59.000Z')).toBe(false);
  });
});

// --------------------------------------------
// calculateNextRun
// --------------------------------------------

describe('calculateNextRun', () => {
  const baseSchedule: ScheduleConfig = {
    frequency: 'daily',
    execution_time: '08:00',
    timezone: 'UTC',
    is_active: true,
    next_run_at: null,
    last_run_at: null,
  };

  it('calculates next daily run', () => {
    const next = calculateNextRun(baseSchedule, '2026-02-28T10:00:00.000Z');
    const d = new Date(next);
    expect(d.getUTCHours()).toBe(8);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCDate()).toBe(1); // next day (March 1)
  });

  it('schedules same day if time not passed', () => {
    const next = calculateNextRun(baseSchedule, '2026-02-28T06:00:00.000Z');
    const d = new Date(next);
    expect(d.getUTCDate()).toBe(28); // same day
    expect(d.getUTCHours()).toBe(8);
  });

  it('calculates next weekly run', () => {
    const weekly: ScheduleConfig = {
      ...baseSchedule,
      frequency: 'weekly',
      day_of_week: 1, // Monday
    };
    const next = calculateNextRun(weekly, '2026-02-28T10:00:00.000Z'); // Saturday
    const d = new Date(next);
    expect(d.getUTCDay()).toBe(1); // Monday
  });

  it('calculates next monthly run', () => {
    const monthly: ScheduleConfig = {
      ...baseSchedule,
      frequency: 'monthly',
      day_of_month: 5,
    };
    const next = calculateNextRun(monthly, '2026-02-28T10:00:00.000Z');
    const d = new Date(next);
    expect(d.getUTCDate()).toBe(5);
    expect(d.getUTCMonth()).toBe(2); // March (0-indexed)
  });
});

// --------------------------------------------
// buildDateContext
// --------------------------------------------

describe('buildDateContext', () => {
  it('builds correct context from ISO date', () => {
    const ctx = buildDateContext('2026-06-15T12:00:00.000Z');
    expect(ctx.year).toBe('2026');
    expect(ctx.month_from).toBe('2026-01');
    expect(ctx.month_to).toBe('2026-12');
    expect(ctx.current_date).toBe('2026-06-15');
    expect(ctx.current_month).toBe('2026-06');
  });

  it('pads single-digit months', () => {
    const ctx = buildDateContext('2026-03-01T00:00:00.000Z');
    expect(ctx.current_month).toBe('2026-03');
  });
});

// --------------------------------------------
// buildObjectiveFromTemplate
// --------------------------------------------

describe('buildObjectiveFromTemplate', () => {
  const context = {
    year: '2026',
    month_from: '2026-01',
    month_to: '2026-12',
    current_date: '2026-06-15',
    current_month: '2026-06',
  };

  it('replaces all placeholders', () => {
    const template = 'Análise DRE {{year}} de {{month_from}} a {{month_to}}';
    const result = buildObjectiveFromTemplate(template, context);
    expect(result).toBe('Análise DRE 2026 de 2026-01 a 2026-12');
  });

  it('replaces multiple occurrences', () => {
    const template = '{{year}} e {{year}} e {{year}}';
    expect(buildObjectiveFromTemplate(template, context)).toBe('2026 e 2026 e 2026');
  });

  it('returns unchanged string without placeholders', () => {
    expect(buildObjectiveFromTemplate('No placeholders here', context)).toBe('No placeholders here');
  });
});

// --------------------------------------------
// validateScheduleConfig
// --------------------------------------------

describe('validateScheduleConfig', () => {
  it('returns empty errors for valid daily config', () => {
    const errors = validateScheduleConfig({
      frequency: 'daily',
      execution_time: '08:00',
      timezone: 'UTC',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires day_of_week for weekly', () => {
    const errors = validateScheduleConfig({
      frequency: 'weekly',
      execution_time: '08:00',
      timezone: 'UTC',
    });
    expect(errors.some(e => e.includes('day_of_week'))).toBe(true);
  });

  it('requires day_of_month for monthly', () => {
    const errors = validateScheduleConfig({
      frequency: 'monthly',
      execution_time: '08:00',
      timezone: 'UTC',
    });
    expect(errors.some(e => e.includes('day_of_month'))).toBe(true);
  });

  it('rejects day_of_month > 28', () => {
    const errors = validateScheduleConfig({
      frequency: 'monthly',
      execution_time: '08:00',
      timezone: 'UTC',
      day_of_month: 31,
    });
    expect(errors.some(e => e.includes('day_of_month'))).toBe(true);
  });

  it('rejects invalid frequency', () => {
    const errors = validateScheduleConfig({
      frequency: 'hourly',
      execution_time: '08:00',
      timezone: 'UTC',
    });
    expect(errors.some(e => e.includes('Frequência'))).toBe(true);
  });

  it('rejects invalid time format', () => {
    const errors = validateScheduleConfig({
      frequency: 'daily',
      execution_time: '25:00',
      timezone: 'UTC',
    });
    expect(errors.some(e => e.includes('Horário') || e.includes('range'))).toBe(true);
  });
});

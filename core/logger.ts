// ============================================
// Structured Logger
// Infrastructure utility — tipos puros + sanitização
// Sink plugável: default = console JSON estruturado
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export type LogSink = (entry: LogEntry) => void | Promise<void>;

// --------------------------------------------
// Sanitization (pure)
// --------------------------------------------

const SENSITIVE_PATTERN =
  /api.?key|token|secret|password|credential|authorization|cookie|session|private.?key|service.?role/i;

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[DEPTH_LIMIT]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? value.slice(0, MAX_STRING_LENGTH) + `...[truncated ${value.length - MAX_STRING_LENGTH} chars]`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const truncated = value.length > MAX_ARRAY_LENGTH;
    const items = value.slice(0, MAX_ARRAY_LENGTH).map((v) => sanitizeValue(v, depth + 1));
    if (truncated) items.push(`...(${value.length - MAX_ARRAY_LENGTH} more)`);
    return items;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = SENSITIVE_PATTERN.test(k) ? '[REDACTED]' : sanitizeValue(v, depth + 1);
    }
    return result;
  }

  return String(value);
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return sanitizeValue(payload, 0) as Record<string, unknown>;
}

// --------------------------------------------
// Sink management
// --------------------------------------------

let _sinks: LogSink[] = [];

function defaultConsoleSink(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'error': console.error(line); break;
    case 'warning': console.warn(line); break;
    default: console.log(line); break;
  }
}

export function addLogSink(sink: LogSink): void {
  _sinks.push(sink);
}

export function clearLogSinks(): void {
  _sinks = [];
}

function emit(entry: LogEntry): void {
  const sinks = _sinks.length > 0 ? _sinks : [defaultConsoleSink];
  for (const sink of sinks) {
    try {
      const result = sink(entry);
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {});
      }
    } catch {
      // Sink failure must never break application flow
    }
  }
}

// --------------------------------------------
// Public API
// --------------------------------------------

export function logInfo(context: string, message: string, payload?: Record<string, unknown>): void {
  emit({
    level: 'info',
    context,
    message,
    payload: payload ? sanitizePayload(payload) : undefined,
    timestamp: new Date().toISOString(),
  });
}

export function logWarning(context: string, message: string, payload?: Record<string, unknown>): void {
  emit({
    level: 'warning',
    context,
    message,
    payload: payload ? sanitizePayload(payload) : undefined,
    timestamp: new Date().toISOString(),
  });
}

export function logError(context: string, message: string, payload?: Record<string, unknown>): void {
  emit({
    level: 'error',
    context,
    message,
    payload: payload ? sanitizePayload(payload) : undefined,
    timestamp: new Date().toISOString(),
  });
}

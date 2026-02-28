import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logInfo, logWarning, logError, addLogSink, clearLogSinks } from '../logger';
import type { LogEntry, LogSink } from '../logger';

// --------------------------------------------
// Setup: clear sinks before each test
// --------------------------------------------

beforeEach(() => {
  clearLogSinks();
});

// --------------------------------------------
// Basic logging
// --------------------------------------------

describe('logInfo', () => {
  it('calls sinks with info level', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logInfo('test', 'hello');

    expect(sink).toHaveBeenCalledTimes(1);
    const entry = sink.mock.calls[0][0] as LogEntry;
    expect(entry.level).toBe('info');
    expect(entry.context).toBe('test');
    expect(entry.message).toBe('hello');
    expect(entry.timestamp).toBeTruthy();
  });
});

describe('logWarning', () => {
  it('calls sinks with warning level', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logWarning('test', 'warn msg');

    const entry = sink.mock.calls[0][0] as LogEntry;
    expect(entry.level).toBe('warning');
  });
});

describe('logError', () => {
  it('calls sinks with error level', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logError('test', 'error msg');

    const entry = sink.mock.calls[0][0] as LogEntry;
    expect(entry.level).toBe('error');
  });
});

// --------------------------------------------
// Payload sanitization
// --------------------------------------------

describe('payload sanitization', () => {
  it('redacts sensitive keys', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logInfo('test', 'msg', {
      api_key: 'sk-12345',
      token: 'abc123',
      safe_value: 'visible',
    });

    const payload = sink.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.api_key).toBe('[REDACTED]');
    expect(payload.token).toBe('[REDACTED]');
    expect(payload.safe_value).toBe('visible');
  });

  it('redacts service_role key', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logInfo('test', 'msg', { service_role_key: 'secret123' });

    const payload = sink.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.service_role_key).toBe('[REDACTED]');
  });

  it('passes numbers and booleans through', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);

    logInfo('test', 'msg', { count: 42, active: true });

    const payload = sink.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.count).toBe(42);
    expect(payload.active).toBe(true);
  });
});

// --------------------------------------------
// Multiple sinks
// --------------------------------------------

describe('sink management', () => {
  it('calls multiple sinks', () => {
    const sink1 = vi.fn<LogSink>();
    const sink2 = vi.fn<LogSink>();
    addLogSink(sink1);
    addLogSink(sink2);

    logInfo('test', 'msg');

    expect(sink1).toHaveBeenCalledTimes(1);
    expect(sink2).toHaveBeenCalledTimes(1);
  });

  it('clearLogSinks removes all custom sinks', () => {
    const sink = vi.fn<LogSink>();
    addLogSink(sink);
    clearLogSinks();

    logInfo('test', 'msg');

    expect(sink).not.toHaveBeenCalled();
  });
});

// --------------------------------------------
// Error resilience
// --------------------------------------------

describe('sink error handling', () => {
  it('continues to next sink when one throws', () => {
    const badSink = vi.fn<LogSink>().mockImplementation(() => {
      throw new Error('sink failed');
    });
    const goodSink = vi.fn<LogSink>();

    addLogSink(badSink);
    addLogSink(goodSink);

    logInfo('test', 'msg');

    expect(badSink).toHaveBeenCalled();
    expect(goodSink).toHaveBeenCalled();
  });
});

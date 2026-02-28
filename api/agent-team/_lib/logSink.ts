// ============================================
// Supabase Log Sink
// Persiste logs estruturados na tabela system_logs
// Fire-and-forget — falha de escrita nunca quebra fluxo
// ============================================

import { supabaseAdmin } from './supabaseAdmin';
import type { LogSink, LogEntry } from '../../../core/logger';

export function createSupabaseSink(organizationId?: string): LogSink {
  return async (entry: LogEntry) => {
    try {
      const sb = supabaseAdmin();
      await sb.from('system_logs').insert({
        organization_id: organizationId || null,
        context: entry.context,
        level: entry.level,
        message: entry.message,
        payload: entry.payload || null,
      });
    } catch {
      // DB write failure must never break application flow
    }
  };
}

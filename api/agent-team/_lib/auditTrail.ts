// ============================================
// Decision Audit Trail — Write Service
// Fire-and-forget — falha nunca quebra fluxo principal
// Usa supabaseAdmin (service_role) para bypass de RLS
// ============================================

import { supabaseAdmin } from './supabaseAdmin';
import { logWarning } from '../../../core/logger';

// --------------------------------------------
// Types
// --------------------------------------------

export type AuditActionType =
  | 'analysis'
  | 'optimization'
  | 'forecast'
  | 'schedule'
  | 'override'
  | 'weight_change'
  | 'approval'
  | 'rejection';

export interface AuditEntry {
  run_id?: string;
  action_type: AuditActionType;
  input_snapshot?: Record<string, unknown>;
  output_snapshot?: Record<string, unknown>;
  model_version?: string;
  performed_by: string;
  justification?: string;
}

// --------------------------------------------
// Core write function (fire-and-forget safe)
// --------------------------------------------

const CTX = 'audit-trail';

/**
 * Registra uma entrada no decision_audit_trail.
 * Fire-and-forget — falha de escrita é logada mas nunca propaga exceção.
 * Retorna o ID do registro criado ou null se falhou.
 */
export async function recordAuditEntry(entry: AuditEntry): Promise<string | null> {
  try {
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from('decision_audit_trail')
      .insert({
        run_id: entry.run_id || null,
        action_type: entry.action_type,
        input_snapshot: entry.input_snapshot || null,
        output_snapshot: entry.output_snapshot || null,
        model_version: entry.model_version || null,
        performed_by: entry.performed_by,
        justification: entry.justification || null,
      })
      .select('id')
      .single();

    if (error) {
      logWarning(CTX, 'Falha ao registrar audit entry', {
        action_type: entry.action_type,
        performed_by: entry.performed_by,
        error: error.message,
      });
      return null;
    }

    return data?.id || null;
  } catch {
    // Fire-and-forget: nunca propagar exceção
    return null;
  }
}

/**
 * Versão fire-and-forget pura — não espera resultado.
 * Usa em pontos onde o caller não pode/não deve await.
 */
export function recordAuditEntryAsync(entry: AuditEntry): void {
  recordAuditEntry(entry).catch(() => {
    // silencioso — logWarning já foi chamado dentro de recordAuditEntry
  });
}

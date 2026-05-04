import { supabase } from './supabase';
import type { AuditLog } from '../types';

export async function logEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      encounter_id: event.encounter_id || null,
      patient_id: event.patient_id || null,
      action_type: event.action_type,
      actor: event.actor || 'resident',
      entity_type: event.entity_type,
      entity_id: event.entity_id || '',
      details: event.details,
    });
  } catch {
    // Graceful degradation — store in localStorage if offline
    const pending = JSON.parse(localStorage.getItem('pg_pending_audit') || '[]');
    pending.push({ ...event, timestamp: new Date().toISOString() });
    localStorage.setItem('pg_pending_audit', JSON.stringify(pending));
  }
}

export async function flushPendingAuditLogs(): Promise<void> {
  const pending = JSON.parse(localStorage.getItem('pg_pending_audit') || '[]');
  if (pending.length === 0) return;

  const { error } = await supabase.from('audit_logs').insert(pending);
  if (!error) {
    localStorage.removeItem('pg_pending_audit');
  }
}

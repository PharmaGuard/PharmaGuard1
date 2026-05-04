import { useEffect, useState } from 'react';
import { Clock, Download, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

interface AuditTrailProps {
  encounterId: string;
  patientName: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  PATIENT_CREATED: { label: 'Patient Created', color: 'bg-blue-100 text-blue-700' },
  MEDICATION_ADDED: { label: 'Medication Added', color: 'bg-green-100 text-green-700' },
  MEDICATION_MODIFIED: { label: 'Medication Modified', color: 'bg-amber-100 text-amber-700' },
  MEDICATION_DISCONTINUED: { label: 'Medication Discontinued', color: 'bg-red-100 text-red-700' },
  RULES_RUN: { label: 'Risk Engine Run', color: 'bg-slate-100 text-slate-600' },
  ALERT_ACCEPTED: { label: 'Alert Accepted', color: 'bg-green-100 text-green-700' },
  ALERT_OVERRIDDEN: { label: 'Alert Overridden', color: 'bg-orange-100 text-orange-700' },
  CLINICAL_DATA_UPDATED: { label: 'Clinical Data Updated', color: 'bg-blue-100 text-blue-700' },
  DISCHARGE_COMPLETED: { label: 'Discharge Completed', color: 'bg-teal-100 text-teal-700' },
};

export default function AuditTrail({ encounterId, patientName }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, [encounterId]);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('encounter_id', encounterId)
      .order('timestamp', { ascending: false });
    if (data) setLogs(data as AuditLog[]);
    setLoading(false);
  }

  const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action_type)))];

  const filtered = filterType === 'all'
    ? logs
    : logs.filter(l => l.action_type === filterType);

  function exportAudit() {
    const lines = [
      `PharmaGuard Audit Trail — ${patientName}`,
      `Encounter: ${encounterId}`,
      `Exported: ${new Date().toISOString()}`,
      '',
      'Timestamp | Action | Actor | Entity | Details',
      '---',
      ...logs.map(l =>
        `${new Date(l.timestamp).toLocaleString('en-IN')} | ${l.action_type} | ${l.actor} | ${l.entity_type}${l.entity_id ? ':' + l.entity_id.slice(0, 8) : ''} | ${JSON.stringify(l.details)}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaguard-audit-${encounterId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Audit Trail</h2>
          <p className="text-sm text-slate-500">{logs.length} events recorded for this encounter</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportAudit}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        {actionTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === type
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {type === 'all' ? 'All' : ACTION_LABELS[type]?.label || type}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading audit log...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No audit events found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(log => {
              const meta = ACTION_LABELS[log.action_type] || { label: log.action_type, color: 'bg-slate-100 text-slate-600' };
              return (
                <div key={log.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-500">by {log.actor}</span>
                      </div>

                      {/* Details rendering */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(log.details).map(([key, val]) => {
                            if (val === null || val === undefined || val === '') return null;
                            return (
                              <p key={key} className="text-xs text-slate-600">
                                <span className="font-medium text-slate-500">{key.replace(/_/g, ' ')}: </span>
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </p>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>Audit integrity notice:</strong> This log is append-only. All entries are timestamped at the server. Overrides of RED alerts include mandatory justification text and are permanently recorded.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CheckCircle, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import type { Alert } from '../types';
import AlertBadge from './AlertBadge';

interface AlertCardProps {
  alert: Alert;
  onAccept: (alertId: string) => void;
  onOverride: (alertId: string, reason: string) => void;
  isCollapsed?: boolean;
}

export default function AlertCard({ alert, onAccept, onOverride, isCollapsed = false }: AlertCardProps) {
  const [expanded, setExpanded] = useState(!isCollapsed && alert.severity === 'red');
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const isResolved = alert.status !== 'active';

  const borderColor = {
    red: 'border-red-300',
    amber: 'border-amber-300',
    green: 'border-green-300',
  }[alert.severity];

  const headerBg = {
    red: 'bg-red-50',
    amber: 'bg-amber-50',
    green: 'bg-green-50',
  }[alert.severity];

  const statusLabel: Record<string, string> = {
    accepted: 'Accepted',
    overridden: 'Overridden',
    dismissed: 'Dismissed',
  };

  return (
    <div className={`rounded-lg border-2 ${borderColor} overflow-hidden transition-all`}>
      <div
        className={`${headerBg} px-4 py-3 flex items-start gap-3 cursor-pointer`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <AlertBadge severity={alert.severity} />
            {isResolved && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                {statusLabel[alert.status] || alert.status}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-800 leading-tight">{alert.title}</span>
          </div>
          {!expanded && (
            <p className="text-xs text-slate-500 line-clamp-1">{alert.reason}</p>
          )}
        </div>
        <button className="flex-shrink-0 text-slate-400 hover:text-slate-600 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="bg-white px-4 py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Reason</p>
            <p className="text-sm text-slate-700 leading-relaxed">{alert.reason}</p>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Rule Source</p>
              <p className="text-xs text-slate-600">{alert.rule_source}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Suggested Action</p>
            <p className="text-sm text-blue-700 font-medium leading-relaxed">{alert.suggested_action}</p>
          </div>

          {isResolved && (
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">Resolution</p>
              <p className="text-sm text-slate-700">Status: <strong>{statusLabel[alert.status]}</strong></p>
              {alert.override_reason && (
                <p className="text-sm text-slate-600 mt-1">Override reason: {alert.override_reason}</p>
              )}
              {alert.resolved_by && (
                <p className="text-xs text-slate-400 mt-1">By: {alert.resolved_by}</p>
              )}
            </div>
          )}

          {!isResolved && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => onAccept(alert.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Accept Recommendation
              </button>

              {alert.severity !== 'red' ? (
                <button
                  onClick={() => onOverride(alert.id, 'clinician review — no action needed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Override
                </button>
              ) : (
                <button
                  onClick={() => setShowOverride(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Override (requires justification)
                </button>
              )}
            </div>
          )}

          {showOverride && !isResolved && alert.severity === 'red' && (
            <div className="p-3 bg-red-50 rounded-md border border-red-200 space-y-2">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                RED Alert Override — Mandatory Justification
              </p>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Enter clear clinical justification for overriding this safety alert..."
                rows={3}
                className="w-full text-sm px-3 py-2 rounded border border-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (overrideReason.trim().length < 10) return;
                    onOverride(alert.id, overrideReason.trim());
                    setShowOverride(false);
                  }}
                  disabled={overrideReason.trim().length < 10}
                  className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                >
                  Confirm Override
                </button>
                <button
                  onClick={() => { setShowOverride(false); setOverrideReason(''); }}
                  className="px-3 py-1.5 text-sm font-medium bg-white text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {overrideReason.trim().length > 0 && overrideReason.trim().length < 10 && (
                <p className="text-xs text-red-600">Justification must be at least 10 characters.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/auditLogger';
import { runRuleEngine, getDataCompletenessIssues } from '../lib/ruleEngine';
import type { Patient, Encounter, Medication, Alert } from '../types';
import AlertCard from './AlertCard';
import DataCompletenessPanel from './DataCompletenessPanel';

interface RiskAlertsPanelProps {
  patient: Patient;
  encounter: Encounter;
  medications: Medication[];
  alerts: Alert[];
  onAlertsChange: (alerts: Alert[]) => void;
  onProceedToReview: () => void;
}

export default function RiskAlertsPanel({
  patient, encounter, medications, alerts, onAlertsChange, onProceedToReview,
}: RiskAlertsPanelProps) {
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const completeness = getDataCompletenessIssues(encounter, medications);

  async function runRules() {
    setRunning(true);

    // Delete existing active alerts for this encounter
    await supabase.from('alerts').delete().eq('encounter_id', encounter.id).eq('status', 'active');

    const results = runRuleEngine(patient, encounter, medications);

    if (results.length > 0) {
      const toInsert = results.map(r => ({
        encounter_id: encounter.id,
        medication_ids: r.medication_ids,
        severity: r.severity,
        alert_type: r.alert_type,
        title: r.title,
        reason: r.reason,
        rule_source: r.rule_source,
        suggested_action: r.suggested_action,
        status: 'active',
      }));
      const { data: newAlerts } = await supabase.from('alerts').insert(toInsert).select();
      if (newAlerts) {
        const preserved = alerts.filter(a => a.status !== 'active');
        onAlertsChange([...preserved, ...(newAlerts as Alert[])]);
      }
    } else {
      const preserved = alerts.filter(a => a.status !== 'active');
      onAlertsChange(preserved);
    }

    await logEvent({
      encounter_id: encounter.id,
      patient_id: patient.id,
      action_type: 'RULES_RUN',
      actor: 'system',
      entity_type: 'encounter',
      entity_id: encounter.id,
      details: { alerts_found: results.length, medications_checked: medications.length },
    });

    setRunning(false);
  }

  useEffect(() => {
    if (alerts.filter(a => a.status === 'active').length === 0) {
      runRules();
    }
  }, []);

  async function handleAccept(alertId: string) {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const { data: updated } = await supabase
      .from('alerts')
      .update({ status: 'accepted', resolved_by: 'resident', resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .select()
      .single();

    if (updated) {
      onAlertsChange(alerts.map(a => a.id === alertId ? updated as Alert : a));
      await logEvent({
        encounter_id: encounter.id,
        patient_id: patient.id,
        action_type: 'ALERT_ACCEPTED',
        actor: 'resident',
        entity_type: 'alert',
        entity_id: alertId,
        details: { title: alert.title, severity: alert.severity },
      });
    }
  }

  async function handleOverride(alertId: string, reason: string) {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    if (alert.severity === 'red' && (!reason || reason.trim().length < 10)) return;

    const { data: updated } = await supabase
      .from('alerts')
      .update({
        status: 'overridden',
        override_reason: reason,
        resolved_by: 'resident',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (updated) {
      onAlertsChange(alerts.map(a => a.id === alertId ? updated as Alert : a));
      await logEvent({
        encounter_id: encounter.id,
        patient_id: patient.id,
        action_type: 'ALERT_OVERRIDDEN',
        actor: 'resident',
        entity_type: 'alert',
        entity_id: alertId,
        details: { title: alert.title, severity: alert.severity, override_reason: reason },
      });
    }
  }

  const active = alerts.filter(a => a.status === 'active');
  const resolved = alerts.filter(a => a.status !== 'active');

  const redActive = active.filter(a => a.severity === 'red');
  const amberActive = active.filter(a => a.severity === 'amber');
  const greenActive = active.filter(a => a.severity === 'green');

  const top3 = [
    ...redActive,
    ...amberActive,
    ...greenActive,
  ].slice(0, 3);

  const remaining = [
    ...redActive,
    ...amberActive,
    ...greenActive,
  ].slice(3);

  const unresolvedReds = redActive.length;
  const canProceed = unresolvedReds === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Risk Alerts</h2>
          <p className="text-sm text-slate-500">
            {active.length} active issue{active.length !== 1 ? 's' : ''} &middot; {resolved.length} resolved
          </p>
        </div>
        <button
          onClick={runRules}
          disabled={running}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          Re-run
        </button>
      </div>

      <DataCompletenessPanel
        present={completeness.present}
        missing={completeness.missing}
        cannotAssess={completeness.cannotAssess}
      />

      {running ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Running rule engine...</p>
        </div>
      ) : active.length === 0 && resolved.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-xl border border-green-200">
          <ShieldCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-green-800 mb-1">No active alerts found</p>
          <p className="text-sm text-green-600">No rule-based safety issues detected for current medication list.</p>
          {completeness.missing.length > 0 && (
            <div className="flex items-center gap-2 mt-3 mx-auto max-w-sm p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-left">
              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">Some risks cannot be assessed due to missing clinical data.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Top Issues (showing {Math.min(3, active.length)} of {active.length})
                </h3>
                <div className="flex gap-1.5">
                  {redActive.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                      {redActive.length} RED
                    </span>
                  )}
                  {amberActive.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      {amberActive.length} AMBER
                    </span>
                  )}
                  {greenActive.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                      {greenActive.length} GREEN
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {top3.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAccept={handleAccept}
                    onOverride={handleOverride}
                  />
                ))}
              </div>

              {remaining.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowAll(v => !v)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {showAll ? 'Hide' : `Show ${remaining.length} more lower-priority issue${remaining.length > 1 ? 's' : ''}`}
                  </button>
                  {showAll && (
                    <div className="mt-3 space-y-3">
                      {remaining.map(alert => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          onAccept={handleAccept}
                          onOverride={handleOverride}
                          isCollapsed={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Resolved</h3>
              <div className="space-y-2">
                {resolved.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAccept={handleAccept}
                    onOverride={handleOverride}
                    isCollapsed={true}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={`p-3 rounded-xl border ${canProceed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-2">
          {canProceed
            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-sm font-medium ${canProceed ? 'text-green-800' : 'text-red-800'}`}>
            {canProceed
              ? 'All RED alerts resolved. You may proceed to review.'
              : `${unresolvedReds} RED alert${unresolvedReds > 1 ? 's' : ''} require${unresolvedReds === 1 ? 's' : ''} action or justified override before proceeding.`}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onProceedToReview}
          disabled={!canProceed}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Proceed to Review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

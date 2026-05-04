import { useState, useEffect } from 'react';
import { Plus, RefreshCw, ClipboardList, ChevronDown, ChevronUp, Calendar, AlertTriangle, CheckCircle, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { runRuleEngine } from '../lib/ruleEngine';
import { logEvent } from '../lib/auditLogger';
import type { Patient, Encounter, Medication, Alert, FollowUpReview as FollowUpReviewType } from '../types';
import ClinicalDataPanel from './ClinicalDataPanel';
import AlertBadge from './AlertBadge';

interface FollowUpReviewProps {
  patient: Patient;
  encounter: Encounter;
  medications: Medication[];
  onEncounterUpdate: (enc: Encounter) => void;
  onMedicationsChange: (meds: Medication[]) => void;
}

export default function FollowUpReview({
  patient,
  encounter,
  medications,
  onEncounterUpdate,
  onMedicationsChange,
}: FollowUpReviewProps) {
  const [reviews, setReviews] = useState<FollowUpReviewType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newReviewer, setNewReviewer] = useState('resident');
  const [latestAlerts, setLatestAlerts] = useState<Alert[]>([]);
  const [alertsRun, setAlertsRun] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [encounter.id]);

  async function loadReviews() {
    const { data } = await supabase
      .from('follow_up_reviews')
      .select('*')
      .eq('encounter_id', encounter.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as FollowUpReviewType[]);
  }

  async function runFollowUpRules() {
    setRunning(true);
    setAlertsRun(false);

    await supabase
      .from('alerts')
      .delete()
      .eq('encounter_id', encounter.id)
      .eq('status', 'active');

    const results = runRuleEngine(patient, encounter, medications);
    const newAlerts: Alert[] = [];

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
      const { data: inserted } = await supabase.from('alerts').insert(toInsert).select();
      if (inserted) newAlerts.push(...(inserted as Alert[]));
    }

    setLatestAlerts(newAlerts);
    setAlertsRun(true);

    await logEvent({
      encounter_id: encounter.id,
      patient_id: patient.id,
      action_type: 'FOLLOWUP_RULES_RUN',
      actor: 'resident',
      entity_type: 'encounter',
      entity_id: encounter.id,
      details: {
        alerts_generated: newAlerts.length,
        red: newAlerts.filter(a => a.severity === 'red').length,
        amber: newAlerts.filter(a => a.severity === 'amber').length,
      },
    });

    setRunning(false);
  }

  async function handleSaveReview() {
    if (!alertsRun) {
      await runFollowUpRules();
    }

    const { data } = await supabase
      .from('follow_up_reviews')
      .insert({
        encounter_id: encounter.id,
        patient_id: patient.id,
        review_date: new Date().toISOString().slice(0, 10),
        reviewer: newReviewer,
        clinical_data_snapshot: encounter.clinical_data,
        medication_changes: [],
        notes: newNotes,
        alerts_generated: latestAlerts.length,
      })
      .select()
      .single();

    if (data) {
      setReviews(prev => [data as FollowUpReviewType, ...prev]);
      await logEvent({
        encounter_id: encounter.id,
        patient_id: patient.id,
        action_type: 'FOLLOWUP_REVIEW_SAVED',
        actor: newReviewer,
        entity_type: 'follow_up_review',
        entity_id: data.id,
        details: { review_date: data.review_date, alerts_generated: latestAlerts.length, notes: newNotes },
      });
      setCreating(false);
      setNewNotes('');
      setAlertsRun(false);
      setLatestAlerts([]);
    }
  }

  const redCount = latestAlerts.filter(a => a.severity === 'red').length;
  const amberCount = latestAlerts.filter(a => a.severity === 'amber').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Post-Discharge Follow-up</h2>
          <p className="text-sm text-slate-500">
            {patient.name} &middot; {patient.age}y {patient.sex}
            {encounter.discharge_date && (
              <span className="ml-2 text-slate-400">
                Discharged {new Date(encounter.discharge_date).toLocaleDateString('en-IN')}
              </span>
            )}
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Review</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Stethoscope className="w-4 h-4" />
            New Follow-up Review
          </div>

          <ClinicalDataPanel
            encounter={encounter}
            onUpdate={onEncounterUpdate}
          />

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-700 font-medium mb-1">
              Update clinical values above (weight, eGFR, labs, etc.) before running the rule check.
              All changes are logged automatically.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reviewer</label>
            <input
              type="text"
              value={newReviewer}
              onChange={e => setNewReviewer(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Dr. Sharma, Resident"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinical Notes</label>
            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              rows={3}
              placeholder="Observations, medication changes, patient-reported symptoms, plan..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runFollowUpRules}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running...' : 'Re-run Risk Check'}
            </button>
            <button
              onClick={handleSaveReview}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Save Review
            </button>
            <button
              onClick={() => { setCreating(false); setAlertsRun(false); setLatestAlerts([]); }}
              className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          {alertsRun && (
            <div className={`p-3 rounded-lg border text-sm ${
              redCount > 0 ? 'bg-red-50 border-red-200' :
              amberCount > 0 ? 'bg-amber-50 border-amber-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 font-semibold mb-2">
                {redCount > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className={redCount > 0 ? 'text-red-800' : amberCount > 0 ? 'text-amber-800' : 'text-green-800'}>
                  {latestAlerts.length === 0
                    ? 'No alerts generated'
                    : `${latestAlerts.length} alert${latestAlerts.length > 1 ? 's' : ''} generated`}
                  {redCount > 0 && ` — ${redCount} RED`}
                  {amberCount > 0 && ` · ${amberCount} AMBER`}
                </span>
              </div>
              <div className="space-y-1.5">
                {latestAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 text-xs">
                    <AlertBadge severity={alert.severity} size="sm" />
                    <span className="text-slate-700">{alert.title}</span>
                  </div>
                ))}
                {latestAlerts.length > 5 && (
                  <p className="text-xs text-slate-500">+{latestAlerts.length - 5} more alerts</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {reviews.length === 0 && !creating ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-600 mb-1">No follow-up reviews yet</p>
          <p className="text-sm text-slate-400 mb-4">
            Create a follow-up review to update clinical values and re-run the risk check after discharge.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Start First Review
          </button>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Review History ({reviews.length})
          </p>
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-800">
                    {new Date(review.review_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">by {review.reviewer}</span>
                </div>
                {review.alerts_generated > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">
                    {review.alerts_generated} alert{review.alerts_generated > 1 ? 's' : ''}
                  </span>
                )}
                {review.alerts_generated === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">
                    No alerts
                  </span>
                )}
                {expandedId === review.id
                  ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {expandedId === review.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      ['eGFR', review.clinical_data_snapshot?.egfr != null ? `${review.clinical_data_snapshot.egfr} mL/min` : '—'],
                      ['Creatinine', review.clinical_data_snapshot?.creatinine != null ? `${review.clinical_data_snapshot.creatinine} mg/dL` : '—'],
                      ['Weight', review.clinical_data_snapshot?.weight != null ? `${review.clinical_data_snapshot.weight} kg` : '—'],
                      ['Hepatic', review.clinical_data_snapshot?.hepatic_impairment || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-2">
                        <div className="text-slate-400 font-medium">{label}</div>
                        <div className="text-slate-800 font-semibold capitalize">{value}</div>
                      </div>
                    ))}
                  </div>

                  {review.notes && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{review.notes}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400">
                    Recorded {new Date(review.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

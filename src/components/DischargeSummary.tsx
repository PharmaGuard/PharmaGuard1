import { useState } from 'react';
import { Printer, CheckCircle, AlertTriangle, Shield, FileText, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/auditLogger';
import type { Patient, Encounter, Medication, Alert, EncounterTab } from '../types';
import AlertBadge from './AlertBadge';

interface DischargeSummaryProps {
  patient: Patient;
  encounter: Encounter;
  medications: Medication[];
  alerts: Alert[];
  onEncounterUpdate: (enc: Encounter) => void;
  onTabChange?: (tab: EncounterTab) => void;
}

export default function DischargeSummary({
  patient, encounter, medications, alerts, onEncounterUpdate, onTabChange,
}: DischargeSummaryProps) {
  const [dischargeNotes, setDischargeNotes] = useState(encounter.discharge_notes || '');
  const [saving, setSaving] = useState(false);
  const [discharged, setDischarged] = useState(encounter.status === 'discharged');

  const active = medications.filter(m => m.status !== 'discontinued');
  const discontinued = medications.filter(m => m.status === 'discontinued');
  const overridden = alerts.filter(a => a.status === 'overridden');
  const accepted = alerts.filter(a => a.status === 'accepted');
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const redAlerts = activeAlerts.filter(a => a.severity === 'red');

  const canDischarge = redAlerts.length === 0;

  const monitoringRecs = generateMonitoringRecs(medications, alerts);

  async function handleDischarge() {
    setSaving(true);
    const { data } = await supabase
      .from('encounters')
      .update({
        status: 'discharged',
        discharge_date: new Date().toISOString().slice(0, 10),
        discharge_notes: dischargeNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', encounter.id)
      .select()
      .single();

    if (data) {
      onEncounterUpdate(data as Encounter);
      setDischarged(true);
      await logEvent({
        encounter_id: encounter.id,
        patient_id: patient.id,
        action_type: 'DISCHARGE_COMPLETED',
        actor: 'resident',
        entity_type: 'encounter',
        entity_id: encounter.id,
        details: { medications: active.length, alerts_resolved: accepted.length + overridden.length, discharge_notes: dischargeNotes },
      });
    }
    setSaving(false);
  }

  async function saveNotes() {
    await supabase
      .from('encounters')
      .update({ discharge_notes: dischargeNotes, updated_at: new Date().toISOString() })
      .eq('id', encounter.id);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Discharge Safety Summary</h2>
          <p className="text-sm text-slate-500">
            {discharged ? 'Discharge completed' : 'Review and confirm discharge'}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors print:hidden"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      {!canDischarge && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">
            Cannot discharge: {redAlerts.length} unresolved RED alert{redAlerts.length > 1 ? 's' : ''} must be resolved first.
          </p>
        </div>
      )}

      {/* Printable summary content */}
      <div id="discharge-summary-print">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-xl p-4 mb-4 print:rounded-none">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            <span className="font-bold text-lg">PharmaGuard</span>
            <span className="text-blue-200 text-sm">Discharge Safety Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-blue-200 text-xs">Patient</div>
              <div className="font-semibold">{patient.name}</div>
            </div>
            <div>
              <div className="text-blue-200 text-xs">Age / Sex</div>
              <div className="font-semibold">{patient.age}y {patient.sex}</div>
            </div>
            {patient.demo_id && (
              <div>
                <div className="text-blue-200 text-xs">ID</div>
                <div className="font-semibold">{patient.demo_id}</div>
              </div>
            )}
            {patient.ward && (
              <div>
                <div className="text-blue-200 text-xs">Ward</div>
                <div className="font-semibold">{patient.ward}</div>
              </div>
            )}
            <div>
              <div className="text-blue-200 text-xs">Admission</div>
              <div className="font-semibold">{new Date(encounter.admission_date).toLocaleDateString('en-IN')}</div>
            </div>
            <div>
              <div className="text-blue-200 text-xs">Discharge Date</div>
              <div className="font-semibold">
                {discharged && encounter.discharge_date
                  ? new Date(encounter.discharge_date).toLocaleDateString('en-IN')
                  : new Date().toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>
          {patient.diagnoses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-blue-600">
              <span className="text-blue-200 text-xs">Diagnoses: </span>
              <span className="text-sm">{patient.diagnoses.join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Final medication list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-700">Final Medication List ({active.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Medication</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Generic</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Dose / Freq</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 hidden sm:table-cell">Route</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 hidden md:table-cell">Indication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {active.map((med, i) => (
                <tr key={med.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{med.brand_name}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{med.generic_name || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    <span className="font-medium">{med.dose}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    {med.frequency}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs capitalize hidden sm:table-cell">{med.route}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs hidden md:table-cell">{med.indication}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {discontinued.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              <strong>Discontinued during admission:</strong> {discontinued.map(m => m.brand_name).join(', ')}
            </div>
          )}
        </div>

        {/* Alerts & actions taken */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Risk Issues Identified & Actions Taken</h3>

            {alerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg border text-xs ${
                alert.severity === 'red' ? 'bg-red-50 border-red-200' :
                alert.severity === 'amber' ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <AlertBadge severity={alert.severity} size="sm" />
                  <span className="font-semibold text-slate-800">{alert.title}</span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${
                    alert.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    alert.status === 'overridden' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {alert.status === 'accepted' ? 'Recommendation Accepted' :
                     alert.status === 'overridden' ? 'Overridden' : 'Active'}
                  </span>
                </div>
                <p className="text-slate-600 mb-1">{alert.reason}</p>
                {alert.override_reason && (
                  <p className="text-orange-700 font-medium">Override reason: {alert.override_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Monitoring recommendations */}
        {monitoringRecs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Monitoring Recommendations</h3>
            <ul className="space-y-1.5">
              {monitoringRecs.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clinical notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 print:hidden">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Discharge Notes</h3>
          <textarea
            value={dischargeNotes}
            onChange={e => setDischargeNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add discharge notes, follow-up instructions, specific concerns..."
            rows={4}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {dischargeNotes && (
          <div className="hidden print:block bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Discharge Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{dischargeNotes}</p>
          </div>
        )}

        {/* Signoff box */}
        <div className={`mt-4 p-4 rounded-xl border-2 ${discharged ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'}`}>
          {discharged ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-800">Discharge completed and signed off</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    All safety checks passed. Discharge date: {encounter.discharge_date ? new Date(encounter.discharge_date).toLocaleDateString('en-IN') : 'Today'}
                  </p>
                </div>
              </div>
              {onTabChange && (
                <button
                  onClick={() => onTabChange('followup')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Start Post-Discharge Follow-up Review
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-slate-700">Discharge Signoff</p>
              </div>
              <p className="text-xs text-slate-500">
                By completing discharge, I confirm that medication reconciliation has been completed, all RED alerts have been addressed, and the final medication list is accurate and clinically appropriate.
              </p>
              <button
                onClick={handleDischarge}
                disabled={!canDischarge || saving}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Completing...' : 'Complete Discharge & Sign Off'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateMonitoringRecs(medications: Medication[], _alerts: Alert[]): string[] {
  const recs: string[] = [];
  const active = medications.filter(m => m.status !== 'discontinued');

  const hasMed = (generic: string) => active.some(m =>
    (m.generic_name || '').toLowerCase() === generic ||
    (m.brand_name || '').toLowerCase().includes(generic)
  );

  if (hasMed('warfarin')) recs.push('Monitor INR every 2–4 weeks (or more frequently if recent dose change)');
  if (hasMed('digoxin')) recs.push('Monitor serum digoxin levels and renal function at 1 week and 1 month');
  if (hasMed('metformin')) recs.push('Check renal function (eGFR, creatinine) at 1 month after discharge');
  if (hasMed('lithium')) recs.push('Monitor serum lithium levels and thyroid/renal function every 3 months');
  if (active.some(m => (m.drug_class || '').toLowerCase() === 'anticoagulant')) {
    recs.push('Monitor for signs of bleeding: unusual bruising, blood in urine/stool');
  }
  if (active.some(m => (m.drug_class || '').toLowerCase() === 'antidiabetic')) {
    recs.push('Monitor capillary blood glucose as per outpatient schedule');
  }
  if (active.some(m => (m.drug_class || '').toLowerCase() === 'antihypertensive')) {
    recs.push('BP check at 2-week follow-up; adjust doses if needed');
  }
  if (active.some(m => m.fall_risk)) {
    recs.push('Fall risk assessment at follow-up; reinforce home safety');
  }
  if (active.length >= 5) {
    recs.push('Medication review in 4 weeks with GP — aim to deprescribe when clinically safe');
  }

  return recs;
}

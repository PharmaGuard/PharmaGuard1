import { CheckCircle, AlertTriangle, Ban, ArrowRight, Pill, User } from 'lucide-react';
import type { Patient, Encounter, Medication, Alert } from '../types';
import AlertBadge from './AlertBadge';

interface ConsolidatedReviewProps {
  patient: Patient;
  encounter: Encounter;
  medications: Medication[];
  alerts: Alert[];
  onProceedToDischarge: () => void;
  onGoToAlerts: () => void;
}

export default function ConsolidatedReview({
  patient, encounter, medications, alerts, onProceedToDischarge, onGoToAlerts,
}: ConsolidatedReviewProps) {
  const active = medications.filter(m => m.status !== 'discontinued');
  const discontinued = medications.filter(m => m.status === 'discontinued');
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const redAlerts = activeAlerts.filter(a => a.severity === 'red');
  const overridden = alerts.filter(a => a.status === 'overridden');
  const accepted = alerts.filter(a => a.status === 'accepted');

  const canDischarge = redAlerts.length === 0;

  const statusIcon = (med: Medication) => {
    if (med.status === 'discontinued') return <Ban className="w-3.5 h-3.5 text-slate-400" />;
    const medAlerts = alerts.filter(a => a.medication_ids.includes(med.id) && a.status === 'active');
    if (medAlerts.some(a => a.severity === 'red')) return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
    if (medAlerts.some(a => a.severity === 'amber')) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
  };

  const getMedAlerts = (med: Medication) =>
    alerts.filter(a => a.medication_ids.includes(med.id) && a.status === 'active');

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Consolidated Review</h2>
        <p className="text-sm text-slate-500">Final unified medication list for {patient.name}</p>
      </div>

      {/* Patient summary card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-semibold text-slate-900 text-sm">{patient.name}</span>
              {patient.elderly_risk_mode && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">65+ Elderly</span>
              )}
              <span className="text-xs text-slate-500">{patient.age}y {patient.sex}</span>
              {patient.ward && <span className="text-xs text-slate-500">Ward: {patient.ward}</span>}
            </div>
            {patient.diagnoses.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{patient.diagnoses.join(' · ')}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {encounter.clinical_data?.egfr != null && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">eGFR: {encounter.clinical_data.egfr} mL/min</span>
              )}
              {encounter.clinical_data?.creatinine != null && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Cr: {encounter.clinical_data.creatinine} mg/dL</span>
              )}
              {encounter.clinical_data?.weight != null && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Weight: {encounter.clinical_data.weight} kg</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert summary */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Alert Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
            <div className="p-2 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xl font-bold text-red-600">{redAlerts.length}</div>
              <div className="text-xs text-red-500 font-medium">RED Active</div>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-xl font-bold text-amber-600">{activeAlerts.filter(a => a.severity === 'amber').length}</div>
              <div className="text-xs text-amber-500 font-medium">AMBER Active</div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xl font-bold text-green-600">{accepted.length}</div>
              <div className="text-xs text-green-500 font-medium">Accepted</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold text-slate-600">{overridden.length}</div>
              <div className="text-xs text-slate-500 font-medium">Overridden</div>
            </div>
          </div>

          {overridden.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Override Summary</p>
              {overridden.map(a => (
                <div key={a.id} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertBadge severity={a.severity} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Override reason: {a.override_reason}</p>
                    {a.resolved_by && <p className="text-xs text-slate-400 mt-0.5">By: {a.resolved_by}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full medication list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Pill className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Final Medication List <span className="text-slate-400 font-normal">({active.length} active)</span>
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-6"></th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Medication</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Dose / Freq</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Source</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {active.map(med => {
              const medAlerts = getMedAlerts(med);
              return (
                <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">{statusIcon(med)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{med.brand_name}</div>
                    {med.generic_name && med.generic_name !== med.brand_name && (
                      <div className="text-xs text-slate-400">{med.generic_name}</div>
                    )}
                    {medAlerts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {medAlerts.map(a => (
                          <AlertBadge key={a.id} severity={a.severity} size="sm" />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell text-slate-600">
                    <span className="font-medium">{med.dose}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span>{med.frequency}</span>
                    <div className="text-xs text-slate-400 capitalize">{med.route}</div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-xs text-slate-500">{med.prescribing_source}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      med.status === 'modified' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {med.status === 'modified' ? 'Modified' : 'Active'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {discontinued.length > 0 && (
          <>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Discontinued during reconciliation</span>
            </div>
            {discontinued.map(med => (
              <div key={med.id} className="px-4 py-2.5 flex items-center gap-3 border-t border-slate-100 opacity-60">
                <Ban className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500 line-through">{med.brand_name}</span>
                <span className="text-xs text-slate-400">{med.generic_name}</span>
                <span className="ml-auto text-xs text-slate-400">{med.prescribing_source}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Clearance status */}
      <div className={`p-4 rounded-xl border-2 ${canDischarge ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-start gap-3">
          {canDischarge
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-bold ${canDischarge ? 'text-green-800' : 'text-red-800'}`}>
              {canDischarge
                ? 'Discharge clearance criteria met'
                : `Discharge blocked: ${redAlerts.length} unresolved RED alert${redAlerts.length > 1 ? 's' : ''}`}
            </p>
            <p className={`text-xs mt-0.5 ${canDischarge ? 'text-green-600' : 'text-red-600'}`}>
              {canDischarge
                ? 'All RED alerts have been resolved or overridden with justification. Proceed to generate discharge summary.'
                : 'Return to Risk Alerts and resolve all RED alerts before generating the discharge summary.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        {!canDischarge && (
          <button
            onClick={onGoToAlerts}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Resolve RED Alerts
          </button>
        )}
        <button
          onClick={onProceedToDischarge}
          disabled={!canDischarge}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Generate Discharge Summary
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

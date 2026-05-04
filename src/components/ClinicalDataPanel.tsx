import { useState } from 'react';
import { Activity, Plus, X, ChevronDown, ChevronUp, Brain, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/auditLogger';
import type { Encounter, ClinicalData } from '../types';

interface ClinicalDataPanelProps {
  encounter: Encounter;
  onUpdate: (updated: Encounter) => void;
  readOnly?: boolean;
}

export default function ClinicalDataPanel({ encounter, onUpdate, readOnly = false }: ClinicalDataPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');

  const cd: ClinicalData = encounter.clinical_data || {};

  async function updateField(field: keyof ClinicalData, value: unknown) {
    if (readOnly) return;
    setSaving(true);
    const newData: ClinicalData = { ...cd, [field]: value };
    const { data } = await supabase
      .from('encounters')
      .update({ clinical_data: newData, updated_at: new Date().toISOString() })
      .eq('id', encounter.id)
      .select()
      .single();

    if (data) {
      onUpdate(data as Encounter);
      await logEvent({
        encounter_id: encounter.id,
        action_type: 'CLINICAL_DATA_UPDATED',
        actor: 'resident',
        entity_type: 'encounter',
        entity_id: encounter.id,
        details: { field, value },
      });
    }
    setSaving(false);
  }

  async function addAllergy() {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    const current = cd.allergies || [];
    if (!current.includes(trimmed)) {
      await updateField('allergies', [...current, trimmed]);
    }
    setAllergyInput('');
  }

  async function removeAllergy(a: string) {
    const current = cd.allergies || [];
    await updateField('allergies', current.filter(x => x !== a));
  }

  const missingCount = [
    cd.egfr == null && cd.creatinine == null,
    cd.weight == null,
    cd.hepatic_impairment == null,
    cd.cognitive_impairment == null,
    cd.fall_history == null,
    !cd.allergies || cd.allergies.length === 0,
  ].filter(Boolean).length;

  const hasData = cd.egfr != null || cd.creatinine != null || cd.weight != null ||
    (cd.allergies && cd.allergies.length > 0) || cd.hepatic_impairment != null ||
    cd.cognitive_impairment != null || cd.fall_history != null;

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-700">Clinical Data</span>
        {missingCount > 0 && (
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {missingCount} field{missingCount > 1 ? 's' : ''} missing
          </span>
        )}
        {hasData && missingCount === 0 && (
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Complete</span>
        )}
        {saving && <span className="ml-2 text-xs text-slate-400">Saving...</span>}
        {readOnly && <span className="ml-2 text-xs text-slate-400 italic">Read only</span>}
        <div className="ml-auto text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-slate-100 pt-3">

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Renal & Body Metrics</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">eGFR (mL/min)</label>
                <input
                  type="number" min={1} max={200}
                  value={cd.egfr ?? ''}
                  onChange={e => updateField('egfr', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 45"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Creatinine (mg/dL)</label>
                <input
                  type="number" min={0.1} max={20} step="0.1"
                  value={cd.creatinine ?? ''}
                  onChange={e => updateField('creatinine', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 1.8"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg)</label>
                <input
                  type="number" min={10} max={300}
                  value={cd.weight ?? ''}
                  onChange={e => updateField('weight', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 58"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Organ Function</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hepatic Impairment</label>
                <select
                  value={cd.hepatic_impairment ?? ''}
                  onChange={e => updateField('hepatic_impairment', e.target.value || null)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50"
                >
                  <option value="">— Not assessed —</option>
                  <option value="none">None (Normal)</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe (Child-Pugh C)</option>
                </select>
                {cd.hepatic_impairment && cd.hepatic_impairment !== 'none' && (
                  <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Rule engine will flag hepatic-risk drugs
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Systolic BP (mmHg)</label>
                <input
                  type="number" min={60} max={260}
                  value={cd.systolic_bp ?? ''}
                  onChange={e => updateField('systolic_bp', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 138"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> CNS & Falls Risk Factors
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cognitive Impairment</label>
                <select
                  value={cd.cognitive_impairment === null || cd.cognitive_impairment === undefined ? '' : cd.cognitive_impairment ? 'yes' : 'no'}
                  onChange={e => updateField('cognitive_impairment', e.target.value === '' ? null : e.target.value === 'yes')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50"
                >
                  <option value="">— Not assessed —</option>
                  <option value="no">No</option>
                  <option value="yes">Yes (documented)</option>
                </select>
                {cd.cognitive_impairment && (
                  <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    CNS drug alerts will be escalated
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fall History</label>
                <select
                  value={cd.fall_history === null || cd.fall_history === undefined ? '' : cd.fall_history ? 'yes' : 'no'}
                  onChange={e => updateField('fall_history', e.target.value === '' ? null : e.target.value === 'yes')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50"
                >
                  <option value="">— Not assessed —</option>
                  <option value="no">No</option>
                  <option value="yes">Yes (prior fall documented)</option>
                </select>
                {cd.fall_history && (
                  <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Fall-risk alerts will be escalated to RED
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Electrolytes (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serum Potassium (mEq/L)</label>
                <input
                  type="number" min={1} max={10} step="0.1"
                  value={cd.serum_potassium ?? ''}
                  onChange={e => updateField('serum_potassium', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 4.0"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
                {cd.serum_potassium !== null && cd.serum_potassium !== undefined && cd.serum_potassium < 3.5 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Hypokalaemia ({cd.serum_potassium}) — increases digoxin toxicity risk
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serum Sodium (mEq/L)</label>
                <input
                  type="number" min={100} max={180}
                  value={cd.serum_sodium ?? ''}
                  onChange={e => updateField('serum_sodium', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 138"
                  readOnly={readOnly}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none read-only:bg-slate-50"
                />
                {cd.serum_sodium !== null && cd.serum_sodium !== undefined && cd.serum_sodium < 135 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Hyponatraemia ({cd.serum_sodium}) — SSRIs and diuretics increase risk
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Known Allergies</p>
            {!readOnly && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }}
                  placeholder="e.g. Penicillin, Sulfa"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={addAllergy}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            )}
            {(cd.allergies || []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(cd.allergies || []).map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                    {a}
                    {!readOnly && (
                      <button onClick={() => removeAllergy(a)} className="hover:text-red-900 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No allergies documented</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

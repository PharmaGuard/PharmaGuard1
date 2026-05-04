import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, ArrowRightLeft, Zap } from 'lucide-react';
import { normalizeMedication } from '../data/drugDictionary';
import type { Medication } from '../types';

interface MedicationFormProps {
  encounterId: string;
  editMed?: Medication | null;
  onSave: (data: Partial<Medication>) => void;
  onClose: () => void;
}

const ROUTES = ['oral', 'IV', 'IM', 'SC', 'sublingual', 'topical', 'inhaled', 'rectal', 'transdermal', 'nasal', 'ophthalmic'];
const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'OD at night', 'Every 4h', 'Every 6h', 'Every 8h', 'Every 12h', 'PRN', 'Once only', 'Weekly'];

export default function MedicationForm({ encounterId, editMed, onSave, onClose }: MedicationFormProps) {
  const [brandName, setBrandName] = useState(editMed?.brand_name || '');
  const [genericName, setGenericName] = useState(editMed?.generic_name || '');
  const [dose, setDose] = useState(editMed?.dose || '');
  const [frequency, setFrequency] = useState(editMed?.frequency || '');
  const [route, setRoute] = useState(editMed?.route || 'oral');
  const [indication, setIndication] = useState(editMed?.indication || '');
  const [prescribingSource, setPrescribingSource] = useState(editMed?.prescribing_source || '');
  const [notes, setNotes] = useState(editMed?.notes || '');
  const [normResult, setNormResult] = useState<ReturnType<typeof normalizeMedication> | null>(null);

  useEffect(() => {
    if (brandName.trim().length >= 3) {
      const result = normalizeMedication(brandName, genericName);
      setNormResult(result);
      if (result.generic_name && !genericName) {
        setGenericName(result.generic_name);
      }
      if (result.entry?.uses && result.entry.uses.length > 0 && !indication) {
        setIndication(result.entry.uses[0]);
      }
    } else {
      setNormResult(null);
    }
  }, [brandName]);

  function handleSave() {
    if (!brandName.trim() || !dose.trim() || !frequency.trim() || !indication.trim() || !prescribingSource.trim()) return;
    const norm = normalizeMedication(brandName, genericName);
    onSave({
      encounter_id: encounterId,
      brand_name: brandName.trim(),
      generic_name: genericName.trim() || norm.generic_name,
      dose: dose.trim(),
      frequency: frequency.trim(),
      route,
      indication: indication.trim(),
      prescribing_source: prescribingSource.trim(),
      drug_class: norm.drug_class,
      drug_subclass: norm.drug_subclass,
      confidence: norm.confidence,
      requires_confirmation: norm.requires_confirmation,
      notes: notes.trim(),
    });
  }

  const isValid = brandName.trim() && dose.trim() && frequency.trim() && indication.trim() && prescribingSource.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-900">
            {editMed ? 'Edit Medication' : 'Add Medication'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {normResult && normResult.confidence === 'low' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Low-confidence match</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Best match: <strong>{normResult.generic_name}</strong> ({normResult.drug_class}). Please confirm or correct the generic name.
                </p>
              </div>
            </div>
          )}

          {normResult && normResult.confidence === 'unrecognized' && brandName.trim().length >= 3 && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Drug not found in local dictionary. Enter generic name manually. Some rules may not apply until identified.
              </p>
            </div>
          )}

          {normResult && normResult.confidence === 'high' && (
            <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-green-100">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-xs text-green-700 flex-1">
                  Identified: <strong>{normResult.generic_name}</strong> — {normResult.drug_class}
                </p>
                {normResult.entry?.manufacturer && (
                  <span className="text-xs text-green-600 opacity-70">{normResult.entry.manufacturer}</span>
                )}
              </div>
              {normResult.entry && (
                <div className="px-3 py-2 space-y-2">
                  {normResult.entry.compositions && normResult.entry.compositions.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Composition: </span>
                        <span className="text-xs text-slate-600">{normResult.entry.compositions.join(' + ')}</span>
                      </div>
                    </div>
                  )}
                  {normResult.entry.uses && normResult.entry.uses.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Uses: </span>
                        <span className="text-xs text-slate-600">{normResult.entry.uses.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {normResult.entry.side_effects && normResult.entry.side_effects.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Common side effects: </span>
                        <span className="text-xs text-slate-500">{normResult.entry.side_effects.slice(0, 4).join(', ')}{normResult.entry.side_effects.length > 4 ? ` +${normResult.entry.side_effects.length - 4} more` : ''}</span>
                      </div>
                    </div>
                  )}
                  {normResult.entry.substitutes && normResult.entry.substitutes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Substitutes: </span>
                        <span className="text-xs text-slate-500">{normResult.entry.substitutes.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {normResult.entry.habit_forming && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">Habit Forming</span>
                    </div>
                  )}
                  {normResult.entry.is_discontinued && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Discontinued Product</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Voveran, Clopidogrel, Lasix"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Generic Name (if known)</label>
              <input
                type="text"
                value={genericName}
                onChange={e => setGenericName(e.target.value)}
                placeholder="e.g. diclofenac"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Dose <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dose}
                onChange={e => setDose(e.target.value)}
                placeholder="e.g. 50mg, 5mg/5ml"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Frequency <span className="text-red-500">*</span>
              </label>
              <input
                list="freq-list"
                type="text"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                placeholder="e.g. BD, OD"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <datalist id="freq-list">
                {FREQUENCIES.map(f => <option key={f} value={f} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Route</label>
              <select
                value={route}
                onChange={e => setRoute(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Prescribing Team / Source <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={prescribingSource}
                onChange={e => setPrescribingSource(e.target.value)}
                placeholder="e.g. Gen Med, Cardiology"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Indication <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={indication}
                onChange={e => setIndication(e.target.value)}
                placeholder="e.g. Pain relief post-op, HTN, T2DM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {editMed ? 'Save Changes' : 'Add Medication'}
          </button>
        </div>
      </div>
    </div>
  );
}

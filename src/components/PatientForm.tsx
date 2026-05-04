import { useState } from 'react';
import { ArrowLeft, Plus, X, AlertTriangle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/auditLogger';
import type { Patient, Encounter } from '../types';

interface PatientFormProps {
  onBack: () => void;
  onCreated: (patient: Patient, encounter: Encounter) => void;
}

export default function PatientForm({ onBack, onCreated }: PatientFormProps) {
  const [name, setName] = useState('');
  const [demoId, setDemoId] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male');
  const [ward, setWard] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ageNum = parseInt(age) || 0;
  const isElderly = ageNum >= 65;

  function addDiagnosis() {
    const trimmed = diagnosisInput.trim();
    if (trimmed && !diagnoses.includes(trimmed)) {
      setDiagnoses(d => [...d, trimmed]);
      setDiagnosisInput('');
    }
  }

  function removeDiagnosis(d: string) {
    setDiagnoses(prev => prev.filter(x => x !== d));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age || ageNum < 1) {
      setError('Name and valid age are required.');
      return;
    }
    setError('');
    setLoading(true);

    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .insert({
        name: name.trim(),
        demo_id: demoId.trim() || null,
        age: ageNum,
        sex,
        ward: ward.trim(),
        bed_number: bedNumber.trim(),
        diagnoses,
        elderly_risk_mode: isElderly,
      })
      .select()
      .single();

    if (patientErr || !patient) {
      setError('Failed to create patient. Please try again.');
      setLoading(false);
      return;
    }

    const { data: encounter, error: encErr } = await supabase
      .from('encounters')
      .insert({
        patient_id: patient.id,
        status: 'medication_entry',
        ward: ward.trim(),
        admission_date: new Date().toISOString().slice(0, 10),
        clinical_data: { egfr: null, creatinine: null, weight: null, allergies: [] },
      })
      .select()
      .single();

    if (encErr || !encounter) {
      setError('Failed to create encounter. Please try again.');
      setLoading(false);
      return;
    }

    await logEvent({
      encounter_id: encounter.id,
      patient_id: patient.id,
      action_type: 'PATIENT_CREATED',
      actor: 'resident',
      entity_type: 'patient',
      entity_id: patient.id,
      details: { name: patient.name, age: patient.age, elderly_risk_mode: isElderly },
    });

    setLoading(false);
    onCreated(patient as Patient, encounter as Encounter);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Patient</h1>
          <p className="text-sm text-slate-500">Create a new medication reconciliation case</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Patient Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name or alias"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Age (years) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 72"
                  min={1} max={120}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                {isElderly && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                )}
              </div>
              {isElderly && (
                <p className="text-xs text-orange-600 mt-1 font-medium">Elderly risk mode will be enabled (age 65+)</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sex</label>
              <select
                value={sex}
                onChange={e => setSex(e.target.value as typeof sex)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Demo / Patient ID</label>
              <input
                type="text"
                value={demoId}
                onChange={e => setDemoId(e.target.value)}
                placeholder="MRN or demo ID"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ward</label>
              <input
                type="text"
                value={ward}
                onChange={e => setWard(e.target.value)}
                placeholder="e.g. Gen Med Ward B"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bed Number</label>
              <input
                type="text"
                value={bedNumber}
                onChange={e => setBedNumber(e.target.value)}
                placeholder="e.g. B-12"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Key Diagnoses</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={diagnosisInput}
              onChange={e => setDiagnosisInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDiagnosis(); } }}
              placeholder="e.g. Type 2 Diabetes, CKD Stage 3..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={addDiagnosis}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {diagnoses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {diagnoses.map(d => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDiagnosis(d)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {diagnoses.length === 0 && (
            <p className="text-xs text-slate-400">No diagnoses added yet. Add relevant diagnoses to improve rule engine accuracy.</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Creating...' : 'Create Patient & Start'}
          </button>
        </div>
      </form>
    </div>
  );
}

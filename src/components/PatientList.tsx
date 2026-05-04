import { useState, useEffect } from 'react';
import { Plus, Search, User, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient, Encounter } from '../types';

interface PatientListProps {
  onSelectPatient: (patient: Patient, encounter: Encounter) => void;
  onCreatePatient: () => void;
  refreshTrigger: number;
}

interface PatientWithEncounter {
  patient: Patient;
  encounter: Encounter | null;
}

export default function PatientList({ onSelectPatient, onCreatePatient, refreshTrigger }: PatientListProps) {
  const [items, setItems] = useState<PatientWithEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPatients();
  }, [refreshTrigger]);

  async function loadPatients() {
    setLoading(true);
    const { data: patients } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!patients) { setLoading(false); return; }

    const withEncounters = await Promise.all(
      patients.map(async (p) => {
        const { data: enc } = await supabase
          .from('encounters')
          .select('*')
          .eq('patient_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { patient: p as Patient, encounter: enc as Encounter | null };
      })
    );

    setItems(withEncounters);
    setLoading(false);
  }

  async function handleSelect(item: PatientWithEncounter) {
    if (item.encounter) {
      onSelectPatient(item.patient, item.encounter);
    } else {
      const { data: newEnc } = await supabase
        .from('encounters')
        .insert({
          patient_id: item.patient.id,
          status: 'medication_entry',
          admission_date: new Date().toISOString().slice(0, 10),
          clinical_data: { egfr: null, creatinine: null, weight: null, allergies: [] },
        })
        .select()
        .single();
      if (newEnc) onSelectPatient(item.patient, newEnc as Encounter);
    }
  }

  const filtered = items.filter(item =>
    item.patient.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.patient.demo_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.patient.ward || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel: Record<string, string> = {
    medication_entry: 'Entering Meds',
    alerts_review: 'Reviewing Alerts',
    consolidated_review: 'Final Review',
    discharge_clearance: 'Discharge Check',
    discharged: 'Discharged',
  };

  const statusColor: Record<string, string> = {
    medication_entry: 'bg-blue-100 text-blue-700',
    alerts_review: 'bg-amber-100 text-amber-700',
    consolidated_review: 'bg-purple-100 text-purple-700',
    discharge_clearance: 'bg-green-100 text-green-700',
    discharged: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Active Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">Medication reconciliation cases</p>
        </div>
        <button
          onClick={onCreatePatient}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Patient
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, or ward..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading patients...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 mb-1">
            {search ? 'No patients match your search' : 'No patients yet'}
          </p>
          <p className="text-sm text-slate-400 mb-4">
            {search ? 'Try a different search term' : 'Add the first patient to begin medication reconciliation'}
          </p>
          {!search && (
            <button
              onClick={onCreatePatient}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <button
              key={item.patient.id}
              onClick={() => handleSelect(item)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">{item.patient.name}</span>
                    {item.patient.elderly_risk_mode && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        65+
                      </span>
                    )}
                    {item.encounter && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[item.encounter.status] || 'bg-slate-100 text-slate-500'}`}>
                        {statusLabel[item.encounter.status] || item.encounter.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{item.patient.age}y {item.patient.sex}</span>
                    {item.patient.demo_id && <span>ID: {item.patient.demo_id}</span>}
                    {item.patient.ward && <span>Ward: {item.patient.ward}</span>}
                    {item.patient.bed_number && <span>Bed: {item.patient.bed_number}</span>}
                    {item.patient.diagnoses.length > 0 && (
                      <span className="truncate max-w-[200px]">{item.patient.diagnoses.slice(0, 2).join(', ')}</span>
                    )}
                  </div>
                  {item.encounter && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      Admitted: {new Date(item.encounter.admission_date).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          <strong>PharmaGuard</strong> is advisory only. All clinical decisions remain with the treating clinician. This is a pilot tool for general medicine ward use.
        </p>
      </div>
    </div>
  );
}

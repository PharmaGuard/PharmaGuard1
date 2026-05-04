import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, HelpCircle, Pill } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/auditLogger';
import { getDataCompletenessIssues } from '../lib/ruleEngine';
import type { Patient, Encounter, Medication } from '../types';
import MedicationForm from './MedicationForm';
import ClinicalDataPanel from './ClinicalDataPanel';
import DataCompletenessPanel from './DataCompletenessPanel';

interface MedicationEntryProps {
  patient: Patient;
  encounter: Encounter;
  medications: Medication[];
  onEncounterUpdate: (enc: Encounter) => void;
  onMedicationsChange: (meds: Medication[]) => void;
  onProceedToAlerts: () => void;
}

export default function MedicationEntry({
  patient,
  encounter,
  medications,
  onEncounterUpdate,
  onMedicationsChange,
  onProceedToAlerts,
}: MedicationEntryProps) {
  const [showForm, setShowForm] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);

  const active = medications.filter(m => m.status !== 'discontinued');
  const completeness = getDataCompletenessIssues(encounter, medications);

  async function handleSaveMed(data: Partial<Medication>) {
    if (editMed) {
      const { data: updated } = await supabase
        .from('medications')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editMed.id)
        .select()
        .single();
      if (updated) {
        onMedicationsChange(medications.map(m => m.id === editMed.id ? updated as Medication : m));
        await logEvent({
          encounter_id: encounter.id,
          patient_id: patient.id,
          action_type: 'MEDICATION_MODIFIED',
          actor: 'resident',
          entity_type: 'medication',
          entity_id: editMed.id,
          details: { brand_name: data.brand_name, generic_name: data.generic_name, change: 'edited' },
        });
      }
    } else {
      const { data: newMed } = await supabase
        .from('medications')
        .insert(data)
        .select()
        .single();
      if (newMed) {
        onMedicationsChange([...medications, newMed as Medication]);
        await logEvent({
          encounter_id: encounter.id,
          patient_id: patient.id,
          action_type: 'MEDICATION_ADDED',
          actor: 'resident',
          entity_type: 'medication',
          entity_id: newMed.id,
          details: { brand_name: newMed.brand_name, generic_name: newMed.generic_name },
        });
      }
    }
    setShowForm(false);
    setEditMed(null);
  }

  async function handleDiscontinue(med: Medication) {
    const { data: updated } = await supabase
      .from('medications')
      .update({ status: 'discontinued', updated_at: new Date().toISOString() })
      .eq('id', med.id)
      .select()
      .single();
    if (updated) {
      onMedicationsChange(medications.map(m => m.id === med.id ? updated as Medication : m));
      await logEvent({
        encounter_id: encounter.id,
        patient_id: patient.id,
        action_type: 'MEDICATION_DISCONTINUED',
        actor: 'resident',
        entity_type: 'medication',
        entity_id: med.id,
        details: { brand_name: med.brand_name },
      });
    }
  }

  const confidenceBadge = (med: Medication) => {
    if (med.confidence === 'high') return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <CheckCircle className="w-3 h-3" /> Identified
      </span>
    );
    if (med.confidence === 'low') return (
      <span className="flex items-center gap-0.5 text-xs text-amber-600">
        <AlertTriangle className="w-3 h-3" /> Low confidence
      </span>
    );
    return (
      <span className="flex items-center gap-0.5 text-xs text-slate-400">
        <HelpCircle className="w-3 h-3" /> Unrecognized
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Medication Entry</h2>
          <p className="text-sm text-slate-500">
            {patient.name} &middot; {patient.age}y {patient.sex}
            {patient.elderly_risk_mode && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                <AlertTriangle className="w-3 h-3" /> Elderly risk mode
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditMed(null); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Medication</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <ClinicalDataPanel encounter={encounter} onUpdate={onEncounterUpdate} />

      <DataCompletenessPanel
        present={completeness.present}
        missing={completeness.missing}
        cannotAssess={completeness.cannotAssess}
      />

      {active.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-600 mb-1">No medications entered yet</p>
          <p className="text-sm text-slate-400 mb-4">Add medications one by one or start with the most critical ones</p>
          <button
            onClick={() => { setEditMed(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Medication
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Active Medications <span className="text-slate-400 font-normal">({active.length})</span>
            </span>
            {medications.filter(m => m.status === 'discontinued').length > 0 && (
              <span className="text-xs text-slate-400">
                +{medications.filter(m => m.status === 'discontinued').length} discontinued
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {active.map(med => (
              <div key={med.id} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-900">{med.brand_name}</span>
                      {med.generic_name && med.generic_name !== med.brand_name && (
                        <span className="text-xs text-slate-500">({med.generic_name})</span>
                      )}
                      {med.drug_class && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                          {med.drug_class}
                        </span>
                      )}
                      {confidenceBadge(med)}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="font-medium">{med.dose}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span>{med.frequency}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="capitalize">{med.route}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-0.5">
                      <span>For: {med.indication}</span>
                      <span>Source: {med.prescribing_source}</span>
                    </div>
                    {med.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">{med.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditMed(med); setShowForm(true); }}
                      className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDiscontinue(med)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Discontinue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length >= 1 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onProceedToAlerts}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Run Risk Check
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      )}

      {showForm && (
        <MedicationForm
          encounterId={encounter.id}
          editMed={editMed}
          onSave={handleSaveMed}
          onClose={() => { setShowForm(false); setEditMed(null); }}
        />
      )}
    </div>
  );
}

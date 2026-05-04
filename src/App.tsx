import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { runRuleEngine } from './lib/ruleEngine';
import { flushPendingAuditLogs } from './lib/auditLogger';
import type { Patient, Encounter, Medication, Alert, AppView, EncounterTab } from './types';

import Navigation from './components/Navigation';
import PatientList from './components/PatientList';
import PatientForm from './components/PatientForm';
import MedicationEntry from './components/MedicationEntry';
import RiskAlertsPanel from './components/RiskAlertsPanel';
import ConsolidatedReview from './components/ConsolidatedReview';
import DischargeSummary from './components/DischargeSummary';
import AuditTrail from './components/AuditTrail';
import FollowUpReview from './components/FollowUpReview';

export default function App() {
  const [view, setView] = useState<AppView>('patient-list');
  const [encounterTab, setEncounterTab] = useState<EncounterTab>('medications');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [listRefresh, setListRefresh] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      flushPendingAuditLogs();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadEncounterData(enc: Encounter) {
    const [{ data: meds }, { data: alts }] = await Promise.all([
      supabase.from('medications').select('*').eq('encounter_id', enc.id).order('added_at'),
      supabase.from('alerts').select('*').eq('encounter_id', enc.id).order('created_at'),
    ]);
    setMedications((meds as Medication[]) || []);
    setAlerts((alts as Alert[]) || []);
  }

  function handleSelectPatient(p: Patient, enc: Encounter) {
    setPatient(p);
    setEncounter(enc);
    setEncounterTab('medications');
    setView('encounter');
    loadEncounterData(enc);
  }

  function handlePatientCreated(p: Patient, enc: Encounter) {
    setPatient(p);
    setEncounter(enc);
    setMedications([]);
    setAlerts([]);
    setEncounterTab('medications');
    setView('encounter');
    setListRefresh(r => r + 1);
  }

  function handleBackToList() {
    setView('patient-list');
    setPatient(null);
    setEncounter(null);
    setMedications([]);
    setAlerts([]);
    setListRefresh(r => r + 1);
  }

  async function handleProceedToAlerts() {
    if (!encounter || !patient) return;

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
      const preserved = alerts.filter(a => a.status !== 'active');
      setAlerts([...preserved, ...((newAlerts as Alert[]) || [])]);
    }

    const { data: updatedEnc } = await supabase
      .from('encounters')
      .update({ status: 'alerts_review', updated_at: new Date().toISOString() })
      .eq('id', encounter.id)
      .select()
      .single();
    if (updatedEnc) setEncounter(updatedEnc as Encounter);

    setEncounterTab('alerts');
  }

  async function handleProceedToReview() {
    if (!encounter) return;
    const { data: updatedEnc } = await supabase
      .from('encounters')
      .update({ status: 'consolidated_review', updated_at: new Date().toISOString() })
      .eq('id', encounter.id)
      .select()
      .single();
    if (updatedEnc) setEncounter(updatedEnc as Encounter);
    setEncounterTab('review');
  }

  async function handleProceedToDischarge() {
    if (!encounter) return;
    const { data: updatedEnc } = await supabase
      .from('encounters')
      .update({ status: 'discharge_clearance', updated_at: new Date().toISOString() })
      .eq('id', encounter.id)
      .select()
      .single();
    if (updatedEnc) setEncounter(updatedEnc as Encounter);
    setEncounterTab('discharge');
  }

  const alertCounts = {
    red: alerts.filter(a => a.severity === 'red' && a.status === 'active').length,
    amber: alerts.filter(a => a.severity === 'amber' && a.status === 'active').length,
    green: alerts.filter(a => a.severity === 'green' && a.status === 'active').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation
        isEncounterView={view === 'encounter'}
        encounterView={encounterTab}
        patientName={patient?.name}
        onTabChange={setEncounterTab}
        onBackToList={handleBackToList}
        alertCounts={alertCounts}
        isDischargedEncounter={encounter?.status === 'discharged'}
      />

      {!online && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 px-4 font-medium">
          You are offline. Changes are being saved locally and will sync when connection is restored.
        </div>
      )}

      <main>
        {view === 'patient-list' && (
          <PatientList
            onSelectPatient={handleSelectPatient}
            onCreatePatient={() => setView('patient-form')}
            refreshTrigger={listRefresh}
          />
        )}

        {view === 'patient-form' && (
          <PatientForm
            onBack={() => setView('patient-list')}
            onCreated={handlePatientCreated}
          />
        )}

        {view === 'encounter' && patient && encounter && (
          <>
            {encounterTab === 'medications' && (
              <MedicationEntry
                patient={patient}
                encounter={encounter}
                medications={medications}
                onEncounterUpdate={setEncounter}
                onMedicationsChange={setMedications}
                onProceedToAlerts={handleProceedToAlerts}
              />
            )}

            {encounterTab === 'alerts' && (
              <RiskAlertsPanel
                patient={patient}
                encounter={encounter}
                medications={medications}
                alerts={alerts}
                onAlertsChange={setAlerts}
                onProceedToReview={handleProceedToReview}
              />
            )}

            {encounterTab === 'review' && (
              <ConsolidatedReview
                patient={patient}
                encounter={encounter}
                medications={medications}
                alerts={alerts}
                onProceedToDischarge={handleProceedToDischarge}
                onGoToAlerts={() => setEncounterTab('alerts')}
              />
            )}

            {encounterTab === 'discharge' && (
              <DischargeSummary
                patient={patient}
                encounter={encounter}
                medications={medications}
                alerts={alerts}
                onEncounterUpdate={setEncounter}
                onTabChange={setEncounterTab}
              />
            )}

            {encounterTab === 'followup' && (
              <FollowUpReview
                patient={patient}
                encounter={encounter}
                medications={medications}
                onEncounterUpdate={setEncounter}
                onMedicationsChange={setMedications}
              />
            )}

            {encounterTab === 'audit' && (
              <AuditTrail
                encounterId={encounter.id}
                patientName={patient.name}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

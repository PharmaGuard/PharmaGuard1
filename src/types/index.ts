export interface Patient {
  id: string;
  name: string;
  demo_id?: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  diagnoses: string[];
  elderly_risk_mode: boolean;
  ward?: string;
  bed_number?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export interface ClinicalData {
  egfr?: number | null;
  creatinine?: number | null;
  weight?: number | null;
  allergies?: string[];
  hepatic_impairment?: 'none' | 'mild' | 'moderate' | 'severe' | null;
  cognitive_impairment?: boolean | null;
  fall_history?: boolean | null;
  comorbidity_count?: number | null;
  systolic_bp?: number | null;
  serum_potassium?: number | null;
  serum_sodium?: number | null;
}

export type EncounterStatus =
  | 'medication_entry'
  | 'alerts_review'
  | 'consolidated_review'
  | 'discharge_clearance'
  | 'discharged';

export interface Encounter {
  id: string;
  patient_id: string;
  status: EncounterStatus;
  ward?: string;
  admission_date: string;
  discharge_date?: string;
  clinical_data: ClinicalData;
  discharge_notes?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export type MedicationStatus = 'active' | 'modified' | 'discontinued';
export type ConfidenceLevel = 'high' | 'low' | 'unrecognized';

export interface Medication {
  id: string;
  encounter_id: string;
  brand_name: string;
  generic_name?: string;
  dose: string;
  frequency: string;
  route: string;
  indication: string;
  prescribing_source: string;
  drug_class?: string;
  drug_subclass?: string;
  status: MedicationStatus;
  confidence?: ConfidenceLevel;
  requires_confirmation?: boolean;
  notes?: string;
  added_at: string;
  added_by?: string;
  updated_at?: string;
}

export type AlertSeverity = 'red' | 'amber' | 'green';
export type AlertStatus = 'active' | 'accepted' | 'overridden' | 'dismissed';

export interface Alert {
  id: string;
  encounter_id: string;
  medication_ids: string[];
  severity: AlertSeverity;
  alert_type: string;
  title: string;
  reason: string;
  rule_source: string;
  suggested_action: string;
  status: AlertStatus;
  override_reason?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  encounter_id?: string;
  patient_id?: string;
  action_type: string;
  actor: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface FollowUpReview {
  id: string;
  encounter_id: string;
  patient_id: string;
  review_date: string;
  reviewer: string;
  clinical_data_snapshot: ClinicalData;
  notes: string;
  alerts_generated: number;
  created_at: string;
}

export interface DrugEntry {
  brand_names: string[];
  generic_name: string;
  drug_class: string;
  drug_subclass: string;
  chemical_class?: string;
  compositions?: string[];
  side_effects?: string[];
  uses?: string[];
  substitutes?: string[];
  manufacturer?: string;
  habit_forming?: boolean;
  is_discontinued?: boolean;
  high_risk_elderly: boolean;
  renal_risk: boolean;
  hepatic_risk?: boolean;
  anticholinergic_score: number;
  sedative_score: number;
  cns_active?: boolean;
  fall_risk: boolean;
  bleeding_risk: boolean;
  narrow_therapeutic_index?: boolean;
  dose_thresholds?: DoseThreshold[];
}

export interface DoseThreshold {
  unit: string;
  max_geriatric_daily_mg?: number;
  max_adult_daily_mg?: number;
  max_weight_based_mg_per_kg?: number;
  renal_adjustment_egfr_threshold?: number;
  sex_note?: string;
  source: string;
  flag_severity: AlertSeverity;
}

export interface RuleResult {
  medication_ids: string[];
  severity: AlertSeverity;
  alert_type: string;
  title: string;
  reason: string;
  rule_source: string;
  suggested_action: string;
}

export type AppView = 'patient-list' | 'patient-form' | 'encounter';
export type EncounterTab = 'medications' | 'alerts' | 'review' | 'discharge' | 'audit' | 'followup';

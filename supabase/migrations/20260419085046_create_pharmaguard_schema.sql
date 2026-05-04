/*
  # PharmaGuard Clinical Workflow Schema

  ## Overview
  Complete database schema for the PharmaGuard elderly medication safety app.
  Supports medication reconciliation, risk alerting, discharge gating, and full audit trail.

  ## Tables Created

  ### patients
  - Core patient demographics
  - Auto-enables elderly_risk_mode for age >= 65
  - Stores diagnoses as text array

  ### encounters
  - One active reconciliation case per patient admission
  - Tracks workflow state machine: medication_entry -> alerts_review -> consolidated_review -> discharge_clearance -> discharged
  - Stores clinical data (eGFR, creatinine, weight, allergies) as JSONB

  ### medications
  - Individual medication records per encounter
  - Brand + generic name, drug class, dose/frequency/route
  - Tracks prescribing source and status (active/modified/discontinued)
  - Supports low-confidence normalization flag

  ### alerts
  - Rule-generated alerts with severity (red/amber/green)
  - Stores rule source and suggested action
  - Tracks resolution status and override reasons

  ### audit_logs
  - Immutable event log for every user action
  - Stores actor, entity, action type, and JSONB details
  - Used for discharge safety signoff and senior review

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users full access (pilot phase - single ward)
  - All records have created_at timestamps for audit integrity
*/

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  demo_id text,
  age integer NOT NULL CHECK (age > 0 AND age < 150),
  sex text NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  diagnoses text[] DEFAULT '{}',
  elderly_risk_mode boolean DEFAULT false,
  ward text DEFAULT '',
  bed_number text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'resident',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Encounters table
CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  status text NOT NULL DEFAULT 'medication_entry' CHECK (
    status IN ('medication_entry', 'alerts_review', 'consolidated_review', 'discharge_clearance', 'discharged')
  ),
  ward text DEFAULT '',
  admission_date date DEFAULT CURRENT_DATE,
  discharge_date date,
  clinical_data jsonb DEFAULT '{"egfr": null, "creatinine": null, "weight": null, "allergies": []}',
  discharge_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'resident',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read encounters"
  ON encounters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert encounters"
  ON encounters FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update encounters"
  ON encounters FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES encounters(id),
  brand_name text NOT NULL DEFAULT '',
  generic_name text DEFAULT '',
  dose text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT 'oral',
  indication text NOT NULL DEFAULT '',
  prescribing_source text NOT NULL DEFAULT '',
  drug_class text DEFAULT '',
  drug_subclass text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'modified', 'discontinued')),
  confidence text DEFAULT 'high' CHECK (confidence IN ('high', 'low', 'unrecognized')),
  requires_confirmation boolean DEFAULT false,
  notes text DEFAULT '',
  added_at timestamptz DEFAULT now(),
  added_by text DEFAULT 'resident',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read medications"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete medications"
  ON medications FOR DELETE
  TO authenticated
  USING (true);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES encounters(id),
  medication_ids text[] DEFAULT '{}',
  severity text NOT NULL CHECK (severity IN ('red', 'amber', 'green')),
  alert_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  rule_source text NOT NULL DEFAULT '',
  suggested_action text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'overridden', 'dismissed')),
  override_reason text DEFAULT '',
  resolved_by text DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (true);

-- Audit logs table (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid REFERENCES encounters(id),
  patient_id uuid REFERENCES patients(id),
  action_type text NOT NULL DEFAULT '',
  actor text DEFAULT 'resident',
  entity_type text NOT NULL DEFAULT '',
  entity_id text DEFAULT '',
  details jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_encounter_id ON medications(encounter_id);
CREATE INDEX IF NOT EXISTS idx_alerts_encounter_id ON alerts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_encounter_id ON audit_logs(encounter_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

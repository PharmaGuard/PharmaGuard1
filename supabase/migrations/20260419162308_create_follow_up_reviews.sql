/*
  # Create follow_up_reviews table

  ## Summary
  Creates a table for post-discharge follow-up clinical reviews linked to encounters.

  ## New Tables
  - `follow_up_reviews`
    - `id` (uuid, primary key)
    - `encounter_id` (uuid, FK to encounters)
    - `patient_id` (uuid, FK to patients)
    - `review_date` (date, defaults to today)
    - `reviewer` (text, clinician name/role)
    - `clinical_data_snapshot` (jsonb, state of clinical data at review time)
    - `medication_changes` (jsonb, list of medication changes made during review)
    - `notes` (text, free-text clinical notes)
    - `alerts_generated` (integer, count of alerts fired during this review)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon and authenticated users can SELECT, INSERT, UPDATE (pilot mode)
*/

CREATE TABLE IF NOT EXISTS follow_up_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewer text NOT NULL DEFAULT 'resident',
  clinical_data_snapshot jsonb NOT NULL DEFAULT '{}',
  medication_changes jsonb NOT NULL DEFAULT '[]',
  notes text NOT NULL DEFAULT '',
  alerts_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE follow_up_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pilot anon can read follow_up_reviews"
  ON follow_up_reviews FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Pilot anon can insert follow_up_reviews"
  ON follow_up_reviews FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Pilot anon can update follow_up_reviews"
  ON follow_up_reviews FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pilot auth can read follow_up_reviews"
  ON follow_up_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pilot auth can insert follow_up_reviews"
  ON follow_up_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Pilot auth can update follow_up_reviews"
  ON follow_up_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

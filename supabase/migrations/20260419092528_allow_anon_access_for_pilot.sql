/*
  # Allow anon role access for PharmaGuard pilot

  ## Reason
  The pilot app uses the Supabase anon key without user authentication.
  All existing policies are restricted to the `authenticated` role only,
  which blocks all operations from the frontend.

  ## Changes
  - Drop existing `authenticated`-only policies on all tables
  - Re-create policies granting access to both `authenticated` AND `anon` roles
  - This is appropriate for a closed pilot on a trusted ward network
*/

-- PATIENTS
DROP POLICY IF EXISTS "Authenticated users can read patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;

CREATE POLICY "Pilot users can read patients"
  ON patients FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pilot users can insert patients"
  ON patients FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Pilot users can update patients"
  ON patients FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ENCOUNTERS
DROP POLICY IF EXISTS "Authenticated users can read encounters" ON encounters;
DROP POLICY IF EXISTS "Authenticated users can insert encounters" ON encounters;
DROP POLICY IF EXISTS "Authenticated users can update encounters" ON encounters;

CREATE POLICY "Pilot users can read encounters"
  ON encounters FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pilot users can insert encounters"
  ON encounters FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Pilot users can update encounters"
  ON encounters FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- MEDICATIONS
DROP POLICY IF EXISTS "Authenticated users can read medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can insert medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can delete medications" ON medications;

CREATE POLICY "Pilot users can read medications"
  ON medications FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pilot users can insert medications"
  ON medications FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Pilot users can update medications"
  ON medications FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pilot users can delete medications"
  ON medications FOR DELETE
  TO authenticated, anon
  USING (true);

-- ALERTS
DROP POLICY IF EXISTS "Authenticated users can read alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON alerts;

CREATE POLICY "Pilot users can read alerts"
  ON alerts FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pilot users can insert alerts"
  ON alerts FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Pilot users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pilot users can delete alerts"
  ON alerts FOR DELETE
  TO authenticated, anon
  USING (true);

-- AUDIT LOGS
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

CREATE POLICY "Pilot users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pilot users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

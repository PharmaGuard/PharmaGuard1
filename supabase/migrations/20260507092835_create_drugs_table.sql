CREATE TABLE drugs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name    text NOT NULL,
  brand_names     text[]   NOT NULL DEFAULT '{}',
  drug_class      text     NOT NULL,
  drug_subclass   text     NOT NULL DEFAULT '',
  chemical_class  text,
  compositions    text[]   DEFAULT '{}',
  side_effects    text[]   DEFAULT '{}',
  uses            text[]   DEFAULT '{}',
  substitutes     text[]   DEFAULT '{}',
  manufacturer    text,
  habit_forming   boolean  DEFAULT false,
  is_discontinued boolean  DEFAULT false,
  high_risk_elderly        boolean DEFAULT false,
  renal_risk               boolean DEFAULT false,
  hepatic_risk             boolean DEFAULT false,
  anticholinergic_score    int     DEFAULT 0,
  sedative_score           int     DEFAULT 0,
  cns_active               boolean DEFAULT false,
  fall_risk                boolean DEFAULT false,
  bleeding_risk            boolean DEFAULT false,
  narrow_therapeutic_index boolean DEFAULT false,
  dose_thresholds jsonb    DEFAULT '[]'
);

-- Indexes for fast lookup
CREATE INDEX drugs_generic_name_idx ON drugs USING gin(to_tsvector('simple', generic_name));
CREATE INDEX drugs_brand_names_idx  ON drugs USING gin(brand_names);
CREATE INDEX drugs_drug_class_idx   ON drugs (drug_class);

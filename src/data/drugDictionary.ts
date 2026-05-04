import type { DrugEntry } from '../types';

/*
 * Drug dictionary sourced from DataSet_Med.xlsx (India-focused formulary dataset).
 * Each entry carries:
 *   - All known brand names + substitutes from the dataset
 *   - Generic name(s) extracted from short_composition fields
 *   - Therapeutic Class and Action Class from the dataset
 *   - Side effects and therapeutic uses from the dataset
 *   - Clinical risk properties (elderly risk, renal, anticholinergic, sedative, falls, bleeding)
 *     assigned from pharmacological knowledge of each generic
 *
 * Section 1: 10 unique drugs directly from DataSet_Med.xlsx (India formulary)
 * Section 2: Extended clinical entries for rule engine coverage — drugs commonly prescribed
 *   in Indian general medicine wards but not yet in the primary dataset.
 */

export const DRUG_DICTIONARY: DrugEntry[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: DataSet_Med.xlsx — Primary dataset entries
  // ─────────────────────────────────────────────────────────────────────────────

  // Dataset ID 1 & 7 — Amoxycillin + Clavulanic Acid (Augmentin, Amoxyclav)
  {
    brand_names: ['Augmentin 625 Duo Tablet', 'Amoxyclav 625 Tablet', 'Augmentin', 'Amoxyclav', 'Penciclav', 'Moxikind-CV'],
    generic_name: 'amoxicillin + clavulanic acid',
    drug_class: 'Antibiotic',
    drug_subclass: 'penicillin_beta_lactamase',
    chemical_class: '',
    compositions: ['Amoxycillin 500mg', 'Clavulanic Acid 125mg'],
    side_effects: ['Vomiting', 'Nausea', 'Diarrhea'],
    uses: ['Treatment of Bacterial infections'],
    substitutes: ['Penciclav 500 mg/125 mg Tablet', 'Moxikind-CV 625 Tablet'],
    manufacturer: 'Glaxo SmithKline Pharmaceuticals Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: false,
    renal_risk: false,
    anticholinergic_score: 0,
    sedative_score: 0,
    fall_risk: false,
    bleeding_risk: false,
  },

  // Dataset ID 2 & 8 — Azithromycin (Azithral, Azee)
  {
    brand_names: ['Azithral 500 Tablet', 'Azee 500 Tablet', 'Azithral', 'Azee', 'Zithrocare', 'Azax'],
    generic_name: 'azithromycin',
    drug_class: 'Antibiotic',
    drug_subclass: 'macrolide',
    chemical_class: 'Macrolides',
    compositions: ['Azithromycin 500mg'],
    side_effects: ['Vomiting', 'Nausea', 'Abdominal pain', 'Diarrhea'],
    uses: ['Treatment of Bacterial infections'],
    substitutes: ['Zithrocare 500mg Tablet', 'Azax 500 Tablet'],
    manufacturer: 'Alembic Pharmaceuticals Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: false,
    renal_risk: false,
    anticholinergic_score: 0,
    sedative_score: 0,
    fall_risk: false,
    bleeding_risk: false,
  },

  // Dataset ID 3 — Ambroxol + Levosalbutamol (Ascoril LS)
  {
    brand_names: ['Ascoril LS Syrup', 'Ascoril LS', 'Solvin LS Syrup', 'Ambrodil-LX Syrup'],
    generic_name: 'ambroxol + levosalbutamol',
    drug_class: 'Mucolytic + Bronchodilator',
    drug_subclass: 'mucolytic_bronchodilator',
    chemical_class: '',
    compositions: ['Ambroxol 30mg/5ml', 'Levosalbutamol 1mg/5ml'],
    side_effects: ['Nausea', 'Vomiting', 'Diarrhea', 'Upset stomach', 'Stomach pain', 'Allergic reaction', 'Dizziness', 'Headache', 'Rash', 'Hives', 'Tremors', 'Palpitations', 'Muscle cramp', 'Increased heart rate'],
    uses: ['Treatment of Cough with mucus'],
    substitutes: ['Solvin LS Syrup', 'Ambrodil-LX Syrup'],
    manufacturer: 'Glenmark Pharmaceuticals Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: false,
    renal_risk: false,
    anticholinergic_score: 0,
    sedative_score: 0,
    fall_risk: false,
    bleeding_risk: false,
  },

  // Dataset ID 4 — Fexofenadine 120mg (Allegra) — 2nd gen antihistamine, safe in elderly
  {
    brand_names: ['Allegra 120mg Tablet', 'Allegra', 'Lcfex Tablet', 'Etofex 120mg Tablet', 'Fexova'],
    generic_name: 'fexofenadine',
    drug_class: 'Antihistamine',
    drug_subclass: 'second_gen',
    chemical_class: 'Diphenylmethane Derivative',
    compositions: ['Fexofenadine 120mg'],
    side_effects: ['Headache', 'Drowsiness', 'Dizziness', 'Nausea'],
    uses: ['Treatment of Sneezing and runny nose due to allergies', 'Treatment of Allergic conditions'],
    substitutes: ['Lcfex Tablet', 'Etofex 120mg Tablet'],
    manufacturer: 'Sanofi India Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: false,
    renal_risk: false,
    anticholinergic_score: 0,
    sedative_score: 0,
    fall_risk: false,
    bleeding_risk: false,
  },

  // Dataset ID 5 — Pheniramine 25mg (Avil) — 1st gen antihistamine, HIGH anticholinergic
  {
    brand_names: ['Avil 25 Tablet', 'Avil', 'Eralet 25mg Tablet'],
    generic_name: 'pheniramine',
    drug_class: 'Antihistamine',
    drug_subclass: 'first_gen',
    chemical_class: 'Pyridines Derivatives',
    compositions: ['Pheniramine 25mg'],
    side_effects: ['Sleepiness', 'Dryness in mouth', 'Urinary retention', 'Blurred vision', 'Constipation', 'Confusion'],
    uses: ['Treatment of Allergic conditions'],
    substitutes: ['Eralet 25mg Tablet'],
    manufacturer: 'Sanofi India Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: true,
    renal_risk: false,
    anticholinergic_score: 3,
    sedative_score: 2,
    fall_risk: true,
    bleeding_risk: false,
  },

  // Dataset ID 6 — Montelukast + Fexofenadine (Allegra-M)
  {
    brand_names: ['Allegra-M Tablet', 'Allegra-M', 'Emlukast-FX Tablet', 'LCFEX-Mont Tablet'],
    generic_name: 'montelukast + fexofenadine',
    drug_class: 'Antihistamine + Leukotriene Antagonist',
    drug_subclass: 'ltra_second_gen_antihistamine',
    chemical_class: '',
    compositions: ['Montelukast 10mg', 'Fexofenadine 120mg'],
    side_effects: ['Nausea', 'Diarrhea', 'Vomiting', 'Skin rash', 'Flu-like symptoms', 'Headache', 'Drowsiness', 'Dizziness'],
    uses: ['Treatment of Sneezing and runny nose due to allergies'],
    substitutes: ['Emlukast-FX Tablet', 'LCFEX-Mont Tablet'],
    manufacturer: 'Sanofi India Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: false,
    renal_risk: false,
    anticholinergic_score: 0,
    sedative_score: 0,
    fall_risk: false,
    bleeding_risk: false,
  },

  // Dataset ID 9 — Hydroxyzine 25mg (Atarax) — 1st gen antihistamine, HIGH anticholinergic
  {
    brand_names: ['Atarax 25mg Tablet', 'Atarax', 'HD Zine 25mg Tablet', 'Hyzox 25 Tablet'],
    generic_name: 'hydroxyzine',
    drug_class: 'Antihistamine',
    drug_subclass: 'first_gen',
    chemical_class: 'Piperazine Derivative',
    compositions: ['Hydroxyzine 25mg'],
    side_effects: ['Sedation', 'Nausea', 'Vomiting', 'Upset stomach', 'Constipation', 'Dry mouth', 'Urinary retention'],
    uses: ['Treatment of Anxiety', 'Treatment of Skin conditions with inflammation & itching'],
    substitutes: ['HD Zine 25mg Tablet', 'Hyzox 25 Tablet'],
    manufacturer: "Dr Reddy's Laboratories Ltd",
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: true,
    renal_risk: false,
    anticholinergic_score: 3,
    sedative_score: 2,
    fall_risk: true,
    bleeding_risk: false,
  },

  // Dataset ID 10 — Phenylephrine + Chlorpheniramine Maleate (Ascoril D Plus)
  // Chlorpheniramine is a 1st gen antihistamine — significant anticholinergic burden in elderly
  {
    brand_names: ['Ascoril D Plus Syrup Sugar Free', 'Ascoril D Plus', 'Arnikof D Syrup', 'Cofsolve-D Syrup'],
    generic_name: 'phenylephrine + chlorpheniramine',
    drug_class: 'Decongestant + Antihistamine',
    drug_subclass: 'decongestant_first_gen_antihistamine',
    chemical_class: '',
    compositions: ['Phenylephrine 5mg', 'Chlorpheniramine Maleate 2mg'],
    side_effects: ['Nausea', 'Vomiting', 'Loss of appetite', 'Headache', 'Sleepiness', 'Dry mouth', 'Increased blood pressure'],
    uses: ['Treatment of Dry cough'],
    substitutes: ['Arnikof D Syrup', 'Cofsolve-D Syrup'],
    manufacturer: 'Glenmark Pharmaceuticals Ltd',
    habit_forming: false,
    is_discontinued: false,
    high_risk_elderly: true,
    renal_risk: false,
    anticholinergic_score: 3,
    sedative_score: 2,
    fall_risk: true,
    bleeding_risk: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: Extended clinical entries for rule engine coverage
  // Common drugs in Indian general medicine wards not yet in the primary dataset.
  // ─────────────────────────────────────────────────────────────────────────────

  // NSAIDs
  { brand_names: ['Brufen', 'Ibugesic', 'Combiflam', 'Ibuprofen'], generic_name: 'ibuprofen', drug_class: 'NSAID', drug_subclass: 'propionic_acid', side_effects: ['GI upset', 'Nausea', 'Peptic ulcer', 'Renal impairment', 'Fluid retention'], uses: ['Pain relief', 'Anti-inflammatory', 'Fever'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 2400, source: 'BNF / CDSCO', flag_severity: 'red' }] },
  { brand_names: ['Voveran', 'Voltaren', 'Diclofenac', 'Voveron'], generic_name: 'diclofenac', drug_class: 'NSAID', drug_subclass: 'acetic_acid', side_effects: ['GI upset', 'Peptic ulcer', 'Renal impairment', 'Elevated liver enzymes'], uses: ['Pain relief', 'Anti-inflammatory'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 150, source: 'BNF / CDSCO', flag_severity: 'red' }] },
  { brand_names: ['Aceclac', 'Zerodol', 'Aceclofenac', 'Hifenac'], generic_name: 'aceclofenac', drug_class: 'NSAID', drug_subclass: 'acetic_acid', side_effects: ['GI upset', 'Nausea', 'Peptic ulcer', 'Renal impairment'], uses: ['Pain relief', 'Anti-inflammatory'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 200, source: 'BNF / CDSCO', flag_severity: 'red' }] },
  { brand_names: ['Naprosyn', 'Naproxen'], generic_name: 'naproxen', drug_class: 'NSAID', drug_subclass: 'propionic_acid', side_effects: ['GI upset', 'Peptic ulcer', 'Renal impairment'], uses: ['Pain relief', 'Anti-inflammatory'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 1000, source: 'BNF / CDSCO', flag_severity: 'red' }] },
  { brand_names: ['Indocid', 'Indomethacin'], generic_name: 'indomethacin', drug_class: 'NSAID', drug_subclass: 'acetic_acid', side_effects: ['GI upset', 'Peptic ulcer', 'CNS effects', 'Renal impairment'], uses: ['Pain relief', 'Gout'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Celecox', 'Cobix', 'Celecoxib'], generic_name: 'celecoxib', drug_class: 'NSAID', drug_subclass: 'cox2_inhibitor', side_effects: ['GI upset', 'Fluid retention', 'Renal impairment'], uses: ['Pain relief', 'Osteoarthritis'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Etoricoxib', 'Nucoxia', 'Arcoxia'], generic_name: 'etoricoxib', drug_class: 'NSAID', drug_subclass: 'cox2_inhibitor', side_effects: ['GI upset', 'Fluid retention', 'Hypertension', 'Renal impairment'], uses: ['Pain relief', 'Arthritis'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Benzodiazepines
  { brand_names: ['Valium', 'Diazepam', 'Calmpose'], generic_name: 'diazepam', drug_class: 'Benzodiazepine', drug_subclass: 'long_acting', side_effects: ['Sedation', 'Confusion', 'Falls', 'Respiratory depression', 'Dependence'], uses: ['Anxiety', 'Muscle spasm', 'Seizures'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 5, max_adult_daily_mg: 40, source: 'Beers Criteria 2023', flag_severity: 'red' }] },
  { brand_names: ['Ativan', 'Lorazepam', 'Larpose'], generic_name: 'lorazepam', drug_class: 'Benzodiazepine', drug_subclass: 'short_acting', side_effects: ['Sedation', 'Confusion', 'Falls', 'Respiratory depression', 'Dependence'], uses: ['Anxiety', 'Acute seizures'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 2, max_adult_daily_mg: 10, source: 'Beers Criteria 2023', flag_severity: 'red' }] },
  { brand_names: ['Alprax', 'Restyl', 'Alprazolam'], generic_name: 'alprazolam', drug_class: 'Benzodiazepine', drug_subclass: 'short_acting', side_effects: ['Sedation', 'Dependence', 'Falls', 'Memory impairment'], uses: ['Anxiety', 'Panic disorder'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 0.5, max_adult_daily_mg: 4, source: 'Beers Criteria 2023', flag_severity: 'red' }] },
  { brand_names: ['Rivotril', 'Clonazepam', 'Epitril'], generic_name: 'clonazepam', drug_class: 'Benzodiazepine', drug_subclass: 'long_acting', side_effects: ['Sedation', 'Ataxia', 'Falls', 'Dependence'], uses: ['Epilepsy', 'Anxiety'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 1, max_adult_daily_mg: 20, source: 'Beers Criteria 2023', flag_severity: 'red' }] },

  // First-gen antihistamines (standalone — not in dataset)
  { brand_names: ['Piriton', 'Chlorpheniramine', 'CTM'], generic_name: 'chlorpheniramine', drug_class: 'Antihistamine', drug_subclass: 'first_gen', chemical_class: 'Alkylamine', side_effects: ['Drowsiness', 'Dry mouth', 'Urinary retention', 'Constipation', 'Blurred vision'], uses: ['Allergic rhinitis', 'Urticaria'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 3, sedative_score: 2, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Phenergan', 'Promethazine'], generic_name: 'promethazine', drug_class: 'Antihistamine', drug_subclass: 'first_gen', chemical_class: 'Phenothiazine', side_effects: ['Profound sedation', 'Dry mouth', 'Urinary retention', 'Extrapyramidal effects'], uses: ['Allergic conditions', 'Nausea', 'Sedation'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 3, sedative_score: 3, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Benadryl', 'Diphenhydramine'], generic_name: 'diphenhydramine', drug_class: 'Antihistamine', drug_subclass: 'first_gen', chemical_class: 'Ethanolamine', side_effects: ['Profound sedation', 'Dry mouth', 'Urinary retention', 'Confusion'], uses: ['Allergies', 'Insomnia'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 3, sedative_score: 3, fall_risk: true, bleeding_risk: false },

  // Safe 2nd-gen antihistamines
  { brand_names: ['Claritin', 'Lorfast', 'Loratadine', 'Alaspan'], generic_name: 'loratadine', drug_class: 'Antihistamine', drug_subclass: 'second_gen', side_effects: ['Headache', 'Fatigue'], uses: ['Allergic rhinitis', 'Urticaria'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Zyrtec', 'Cetrizet', 'Cetirizine', 'Cetzine'], generic_name: 'cetirizine', drug_class: 'Antihistamine', drug_subclass: 'second_gen', chemical_class: 'Piperazine Derivative', side_effects: ['Mild drowsiness', 'Headache', 'Dry mouth'], uses: ['Allergic rhinitis', 'Urticaria'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 1, fall_risk: false, bleeding_risk: false },

  // Opioids
  { brand_names: ['Tramadol', 'Ultracet', 'Tramazac', 'Contramal'], generic_name: 'tramadol', drug_class: 'Opioid', drug_subclass: 'weak_opioid', side_effects: ['Nausea', 'Constipation', 'Dizziness', 'Sedation', 'Seizures', 'Serotonin syndrome'], uses: ['Moderate to severe pain'], high_risk_elderly: true, renal_risk: true, cns_active: true, anticholinergic_score: 1, sedative_score: 2, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 200, max_adult_daily_mg: 400, source: 'BNF / Beers Criteria 2023', flag_severity: 'amber' }] },
  { brand_names: ['Morphine', 'MS Contin', 'Morphgesic'], generic_name: 'morphine', drug_class: 'Opioid', drug_subclass: 'strong_opioid', side_effects: ['Respiratory depression', 'Sedation', 'Constipation', 'Nausea', 'Vomiting', 'Dependence'], uses: ['Severe pain'], habit_forming: true, high_risk_elderly: true, renal_risk: true, cns_active: true, anticholinergic_score: 1, sedative_score: 3, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Codeine', 'Codicept'], generic_name: 'codeine', drug_class: 'Opioid', drug_subclass: 'weak_opioid', side_effects: ['Constipation', 'Sedation', 'Nausea', 'Respiratory depression'], uses: ['Mild to moderate pain', 'Cough suppression'], habit_forming: true, high_risk_elderly: true, renal_risk: true, cns_active: true, anticholinergic_score: 0, sedative_score: 2, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 240, source: 'BNF', flag_severity: 'red' }] },

  // Anticoagulants
  { brand_names: ['Warfarin', 'Warf', 'Coumadin'], generic_name: 'warfarin', drug_class: 'Anticoagulant', drug_subclass: 'vitamin_k_antagonist', side_effects: ['Bleeding', 'Bruising', 'Hair loss', 'INR fluctuation'], uses: ['AF', 'DVT/PE prevention', 'Mechanical heart valve'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Xarelto', 'Rivaroxaban'], generic_name: 'rivaroxaban', drug_class: 'Anticoagulant', drug_subclass: 'doac', side_effects: ['Bleeding', 'Anaemia', 'Nausea'], uses: ['AF stroke prevention', 'DVT/PE treatment'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Eliquis', 'Apixaban'], generic_name: 'apixaban', drug_class: 'Anticoagulant', drug_subclass: 'doac', side_effects: ['Bleeding', 'Anaemia', 'Nausea'], uses: ['AF stroke prevention', 'DVT/PE treatment'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Heparin', 'Clexane', 'Enoxaparin', 'Lovenox'], generic_name: 'enoxaparin', drug_class: 'Anticoagulant', drug_subclass: 'lmwh', side_effects: ['Bleeding', 'Thrombocytopenia', 'Injection site bruising'], uses: ['DVT/PE treatment', 'Bridging anticoagulation'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Dabigatran', 'Pradaxa'], generic_name: 'dabigatran', drug_class: 'Anticoagulant', drug_subclass: 'doac', side_effects: ['Bleeding', 'Dyspepsia', 'Nausea'], uses: ['AF stroke prevention', 'DVT/PE treatment'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },

  // Antiplatelets
  { brand_names: ['Aspirin', 'Ecosprin', 'Disprin', 'Loprin'], generic_name: 'aspirin', drug_class: 'Antiplatelet', drug_subclass: 'salicylate', side_effects: ['GI bleeding', 'GI upset', 'Tinnitus', 'Peptic ulcer'], uses: ['ACS', 'Stroke prevention', 'Antiplatelet'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Clopidogrel', 'Plavix', 'Deplatt', 'Clopivas'], generic_name: 'clopidogrel', drug_class: 'Antiplatelet', drug_subclass: 'p2y12', side_effects: ['Bleeding', 'Bruising', 'GI upset'], uses: ['ACS', 'Stroke prevention'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },
  { brand_names: ['Ticagrelor', 'Brilinta', 'Ticab'], generic_name: 'ticagrelor', drug_class: 'Antiplatelet', drug_subclass: 'p2y12', side_effects: ['Bleeding', 'Dyspnoea', 'Bradycardia'], uses: ['ACS'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: true },

  // Antidepressants / SSRIs
  { brand_names: ['Escitalopram', 'Nexito', 'Cipralex', 'Stalopam'], generic_name: 'escitalopram', drug_class: 'Antidepressant', drug_subclass: 'ssri', side_effects: ['Nausea', 'Insomnia', 'Sexual dysfunction', 'Hyponatraemia', 'QT prolongation'], uses: ['Depression', 'Anxiety'], high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 1, fall_risk: true, bleeding_risk: true, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 10, max_adult_daily_mg: 20, sex_note: 'Max 10mg/day in elderly regardless of sex; QT prolongation higher in females', source: 'BNF / EMA', flag_severity: 'amber' }] },
  { brand_names: ['Sertraline', 'Zoloft', 'Daxid'], generic_name: 'sertraline', drug_class: 'Antidepressant', drug_subclass: 'ssri', side_effects: ['Nausea', 'Diarrhoea', 'Insomnia', 'Hyponatraemia'], uses: ['Depression', 'OCD', 'PTSD'], high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 1, fall_risk: true, bleeding_risk: true },
  { brand_names: ['Fluoxetine', 'Prozac', 'Fludac', 'Prodep'], generic_name: 'fluoxetine', drug_class: 'Antidepressant', drug_subclass: 'ssri', side_effects: ['Nausea', 'Insomnia', 'Anxiety', 'Hyponatraemia'], uses: ['Depression', 'OCD'], high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: true },
  { brand_names: ['Venlafaxine', 'Effexor', 'Veniz', 'Venlor'], generic_name: 'venlafaxine', drug_class: 'Antidepressant', drug_subclass: 'snri', side_effects: ['Hypertension', 'Nausea', 'Insomnia', 'Hyponatraemia', 'Sweating'], uses: ['Depression', 'Anxiety'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 0, sedative_score: 1, fall_risk: true, bleeding_risk: true },

  // Antipsychotics
  { brand_names: ['Haloperidol', 'Serenace', 'Halidol'], generic_name: 'haloperidol', drug_class: 'Antipsychotic', drug_subclass: 'first_gen', side_effects: ['Extrapyramidal effects', 'Tardive dyskinesia', 'QT prolongation', 'Sedation', 'Hypotension'], uses: ['Psychosis', 'Acute agitation'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 2, sedative_score: 2, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 2, max_adult_daily_mg: 20, source: 'Beers Criteria 2023 / BNF', flag_severity: 'red' }] },
  { brand_names: ['Olanzapine', 'Oleanz', 'Zyprexa', 'Olanex'], generic_name: 'olanzapine', drug_class: 'Antipsychotic', drug_subclass: 'second_gen', side_effects: ['Weight gain', 'Metabolic syndrome', 'Sedation', 'Dizziness', 'Hyperglycaemia'], uses: ['Schizophrenia', 'Bipolar disorder'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 2, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 5, max_adult_daily_mg: 20, sex_note: 'Females may require lower doses due to pharmacokinetic differences', source: 'Beers Criteria 2023 / BNF', flag_severity: 'red' }] },
  { brand_names: ['Quetiapine', 'Seroquel', 'Quepin', 'Qutipin'], generic_name: 'quetiapine', drug_class: 'Antipsychotic', drug_subclass: 'second_gen', side_effects: ['Sedation', 'Postural hypotension', 'Weight gain', 'Hyperglycaemia'], uses: ['Schizophrenia', 'Bipolar disorder'], high_risk_elderly: true, renal_risk: false, cns_active: true, anticholinergic_score: 1, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 100, max_adult_daily_mg: 800, source: 'Beers Criteria 2023', flag_severity: 'red' }] },
  { brand_names: ['Risperidone', 'Risperdal', 'Sizodon', 'Risnia'], generic_name: 'risperidone', drug_class: 'Antipsychotic', drug_subclass: 'second_gen', side_effects: ['Extrapyramidal effects', 'Hyperprolactinaemia', 'Postural hypotension', 'QT prolongation'], uses: ['Schizophrenia', 'Bipolar disorder'], high_risk_elderly: true, renal_risk: true, cns_active: true, anticholinergic_score: 0, sedative_score: 2, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 2, max_adult_daily_mg: 16, source: 'Beers Criteria 2023 / BNF', flag_severity: 'red' }] },

  // Antihypertensives
  { brand_names: ['Amlodipine', 'Amlip', 'Amlong', 'Norvasc'], generic_name: 'amlodipine', drug_class: 'Antihypertensive', drug_subclass: 'ccb_dihydropyridine', side_effects: ['Peripheral oedema', 'Flushing', 'Headache', 'Palpitations'], uses: ['Hypertension', 'Angina'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Enalapril', 'Envas', 'Vasotec', 'Enam'], generic_name: 'enalapril', drug_class: 'Antihypertensive', drug_subclass: 'ace_inhibitor', side_effects: ['Cough', 'Hyperkalaemia', 'Renal impairment', 'Angioedema', 'Hypotension'], uses: ['Hypertension', 'Heart failure', 'Diabetic nephropathy'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Ramipril', 'Cardace', 'Altace', 'Ramistar'], generic_name: 'ramipril', drug_class: 'Antihypertensive', drug_subclass: 'ace_inhibitor', side_effects: ['Cough', 'Hyperkalaemia', 'Renal impairment', 'Angioedema'], uses: ['Hypertension', 'Heart failure', 'Post-MI'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Telmisartan', 'Telma', 'Telsartan', 'Micardis'], generic_name: 'telmisartan', drug_class: 'Antihypertensive', drug_subclass: 'arb', side_effects: ['Hyperkalaemia', 'Renal impairment', 'Dizziness', 'Back pain'], uses: ['Hypertension', 'Diabetic nephropathy'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Losartan', 'Losar', 'Cozaar', 'Losacar'], generic_name: 'losartan', drug_class: 'Antihypertensive', drug_subclass: 'arb', side_effects: ['Hyperkalaemia', 'Renal impairment', 'Dizziness', 'Fatigue'], uses: ['Hypertension', 'Diabetic nephropathy', 'Heart failure'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Atenolol', 'Tenormin', 'Betacard', 'Aten'], generic_name: 'atenolol', drug_class: 'Antihypertensive', drug_subclass: 'beta_blocker', side_effects: ['Bradycardia', 'Fatigue', 'Cold extremities', 'Bronchospasm'], uses: ['Hypertension', 'Angina', 'Post-MI'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Metoprolol', 'Betaloc', 'Metolar', 'Revelol'], generic_name: 'metoprolol', drug_class: 'Antihypertensive', drug_subclass: 'beta_blocker', side_effects: ['Bradycardia', 'Fatigue', 'Dizziness', 'Bronchospasm'], uses: ['Hypertension', 'Angina', 'Heart failure', 'Post-MI'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Prazosin', 'Minipress', 'Prazocin'], generic_name: 'prazosin', drug_class: 'Antihypertensive', drug_subclass: 'alpha_blocker', side_effects: ['Postural hypotension', 'Dizziness', 'Syncope', 'Headache', 'Palpitations'], uses: ['Hypertension', 'BPH'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },

  // Diuretics
  { brand_names: ['Furosemide', 'Lasix', 'Frusenex', 'Frusemide'], generic_name: 'furosemide', drug_class: 'Diuretic', drug_subclass: 'loop', side_effects: ['Electrolyte imbalance', 'Dehydration', 'Hypotension', 'Ototoxicity', 'Hyponatraemia'], uses: ['Oedema', 'Heart failure', 'Hypertension'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Hydrochlorothiazide', 'HCT', 'Aquazide'], generic_name: 'hydrochlorothiazide', drug_class: 'Diuretic', drug_subclass: 'thiazide', side_effects: ['Hyponatraemia', 'Hypokalaemia', 'Hyperuricaemia', 'Glucose intolerance'], uses: ['Hypertension', 'Oedema'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Spironolactone', 'Aldactone', 'Spiromide'], generic_name: 'spironolactone', drug_class: 'Diuretic', drug_subclass: 'potassium_sparing', side_effects: ['Hyperkalaemia', 'Gynaecomastia', 'Menstrual irregularity', 'GI upset'], uses: ['Heart failure', 'Hypertension', 'Ascites'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Antidiabetics
  { brand_names: ['Metformin', 'Glyciphage', 'Glucophage', 'Glycomet'], generic_name: 'metformin', drug_class: 'Antidiabetic', drug_subclass: 'biguanide', side_effects: ['GI upset', 'Nausea', 'Diarrhoea', 'Lactic acidosis (rare)'], uses: ['Type 2 Diabetes Mellitus'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 3000, source: 'BNF / ADA Guidelines', flag_severity: 'red' }] },
  { brand_names: ['Glibenclamide', 'Daonil', 'Glyburide'], generic_name: 'glibenclamide', drug_class: 'Antidiabetic', drug_subclass: 'sulfonylurea', side_effects: ['Hypoglycaemia', 'Weight gain', 'GI upset'], uses: ['Type 2 Diabetes Mellitus'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Glimepiride', 'Amaryl', 'Glimate', 'Glimpid'], generic_name: 'glimepiride', drug_class: 'Antidiabetic', drug_subclass: 'sulfonylurea', side_effects: ['Hypoglycaemia', 'Weight gain', 'Dizziness'], uses: ['Type 2 Diabetes Mellitus'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Insulin', 'Humulin', 'Lantus', 'Mixtard', 'Actrapid', 'Insugen'], generic_name: 'insulin', drug_class: 'Antidiabetic', drug_subclass: 'insulin', side_effects: ['Hypoglycaemia', 'Weight gain', 'Injection site reactions', 'Hypokalaemia'], uses: ['Type 1 & Type 2 Diabetes Mellitus'], high_risk_elderly: true, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Sitagliptin', 'Januvia', 'Istavel', 'Zita'], generic_name: 'sitagliptin', drug_class: 'Antidiabetic', drug_subclass: 'dpp4', side_effects: ['Nasopharyngitis', 'Pancreatitis (rare)', 'Headache'], uses: ['Type 2 Diabetes Mellitus'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Statins
  { brand_names: ['Atorvastatin', 'Lipitor', 'Atorva', 'Tonact'], generic_name: 'atorvastatin', drug_class: 'Statin', drug_subclass: 'hmg_coa', side_effects: ['Myalgia', 'Elevated liver enzymes', 'Headache', 'GI upset'], uses: ['Hypercholesterolaemia', 'Cardiovascular risk reduction'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Rosuvastatin', 'Crestor', 'Rozavel', 'Rosuvas'], generic_name: 'rosuvastatin', drug_class: 'Statin', drug_subclass: 'hmg_coa', side_effects: ['Myalgia', 'Proteinuria', 'Headache', 'Elevated CK'], uses: ['Hypercholesterolaemia', 'Cardiovascular risk reduction'], high_risk_elderly: false, renal_risk: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Sedative-hypnotics (Z-drugs)
  { brand_names: ['Zolpidem', 'Ambien', 'Stilnox', 'Nitrest'], generic_name: 'zolpidem', drug_class: 'Sedative-Hypnotic', drug_subclass: 'z_drug', side_effects: ['Drowsiness', 'Dizziness', 'Complex sleep behaviours', 'Dependence', 'Falls', 'Next-day impairment'], uses: ['Insomnia'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 5, max_adult_daily_mg: 10, sex_note: 'Females clear zolpidem ~50% slower; max 5mg in females', source: 'Beers Criteria 2023 / FDA', flag_severity: 'red' }] },
  { brand_names: ['Zopiclone', 'Zopicon', 'Imovane'], generic_name: 'zopiclone', drug_class: 'Sedative-Hypnotic', drug_subclass: 'z_drug', side_effects: ['Drowsiness', 'Metallic taste', 'Dizziness', 'Dependence', 'Falls'], uses: ['Insomnia'], habit_forming: true, high_risk_elderly: true, renal_risk: false, cns_active: true, hepatic_risk: true, anticholinergic_score: 0, sedative_score: 3, fall_risk: true, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 3.75, max_adult_daily_mg: 7.5, source: 'Beers Criteria 2023 / BNF', flag_severity: 'red' }] },

  // Cardiac
  { brand_names: ['Digoxin', 'Lanoxin', 'Digitek'], generic_name: 'digoxin', drug_class: 'Cardiac Glycoside', drug_subclass: 'glycoside', side_effects: ['Nausea', 'Vomiting', 'Visual disturbances', 'Bradycardia', 'Arrhythmia (toxicity)', 'Anorexia'], uses: ['Heart failure', 'AF rate control'], high_risk_elderly: true, renal_risk: true, narrow_therapeutic_index: true, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_geriatric_daily_mg: 0.125, max_adult_daily_mg: 0.25, renal_adjustment_egfr_threshold: 60, source: 'Beers Criteria 2023 / BNF', flag_severity: 'amber' }] },
  { brand_names: ['Amiodarone', 'Cordarone', 'Tachyra', 'Amiodar'], generic_name: 'amiodarone', drug_class: 'Antiarrhythmic', drug_subclass: 'class_iii', side_effects: ['Thyroid dysfunction', 'Pulmonary toxicity', 'Photosensitivity', 'QT prolongation', 'Corneal deposits'], uses: ['Ventricular arrhythmia', 'AF'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // PPIs
  { brand_names: ['Omeprazole', 'Omez', 'Prilosec', 'Ocid'], generic_name: 'omeprazole', drug_class: 'PPI', drug_subclass: 'proton_pump', side_effects: ['Headache', 'Diarrhoea', 'Hypomagnesaemia (long term)', 'C. diff risk'], uses: ['GERD', 'Peptic ulcer', 'H. pylori eradication'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Pantoprazole', 'Pan', 'Pantocid', 'Pantocar'], generic_name: 'pantoprazole', drug_class: 'PPI', drug_subclass: 'proton_pump', side_effects: ['Headache', 'Diarrhoea', 'Hypomagnesaemia (long term)'], uses: ['GERD', 'Peptic ulcer'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Rabeprazole', 'Razo', 'Rablet', 'Rabeloc'], generic_name: 'rabeprazole', drug_class: 'PPI', drug_subclass: 'proton_pump', side_effects: ['Headache', 'Diarrhoea', 'Hypomagnesaemia (long term)'], uses: ['GERD', 'Peptic ulcer'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Corticosteroids
  { brand_names: ['Prednisolone', 'Omnacortil', 'Wysolone'], generic_name: 'prednisolone', drug_class: 'Corticosteroid', drug_subclass: 'oral', side_effects: ['Hyperglycaemia', 'Osteoporosis', 'Hypertension', 'Adrenal suppression', 'Immunosuppression', 'GI ulcer'], uses: ['Inflammation', 'Autoimmune diseases', 'Asthma', 'COPD'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Dexamethasone', 'Decadron', 'Dexona', 'Dexacort'], generic_name: 'dexamethasone', drug_class: 'Corticosteroid', drug_subclass: 'oral', side_effects: ['Hyperglycaemia', 'Osteoporosis', 'Hypertension', 'Adrenal suppression', 'Psychosis'], uses: ['Cerebral oedema', 'Anaphylaxis', 'Inflammation'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Anticholinergics (bladder)
  { brand_names: ['Oxybutynin', 'Cystrin', 'Ditropan'], generic_name: 'oxybutynin', drug_class: 'Anticholinergic', drug_subclass: 'bladder', side_effects: ['Dry mouth', 'Constipation', 'Urinary retention', 'Confusion', 'Blurred vision', 'Tachycardia'], uses: ['Overactive bladder', 'Urge incontinence'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 3, sedative_score: 1, fall_risk: true, bleeding_risk: false },
  { brand_names: ['Tolterodine', 'Detrol', 'Detrusitol'], generic_name: 'tolterodine', drug_class: 'Anticholinergic', drug_subclass: 'bladder', side_effects: ['Dry mouth', 'Constipation', 'Blurred vision', 'Headache'], uses: ['Overactive bladder'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 3, sedative_score: 0, fall_risk: false, bleeding_risk: false },
  { brand_names: ['Solifenacin', 'Vesicare'], generic_name: 'solifenacin', drug_class: 'Anticholinergic', drug_subclass: 'bladder', side_effects: ['Dry mouth', 'Constipation', 'Blurred vision', 'UTI'], uses: ['Overactive bladder'], high_risk_elderly: true, renal_risk: false, anticholinergic_score: 3, sedative_score: 0, fall_risk: false, bleeding_risk: false },

  // Analgesics
  { brand_names: ['Paracetamol', 'Crocin', 'Dolo', 'Calpol', 'Tylenol'], generic_name: 'paracetamol', drug_class: 'Analgesic', drug_subclass: 'non_opioid', side_effects: ['Hepatotoxicity (overdose)', 'Rash (rare)'], uses: ['Pain relief', 'Fever'], high_risk_elderly: false, renal_risk: false, anticholinergic_score: 0, sedative_score: 0, fall_risk: false, bleeding_risk: false, dose_thresholds: [{ unit: 'mg/day', max_adult_daily_mg: 4000, source: 'BNF / WHO / CDSCO', flag_severity: 'red' }] },

];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup and normalization helpers
// ─────────────────────────────────────────────────────────────────────────────

export function lookupDrug(nameInput: string): { entry: DrugEntry | null; confidence: 'high' | 'low' | 'unrecognized' } {
  const name = nameInput.trim().toLowerCase();
  if (!name) return { entry: null, confidence: 'unrecognized' };

  // Exact match on generic name
  const exactGeneric = DRUG_DICTIONARY.find(d => d.generic_name.toLowerCase() === name);
  if (exactGeneric) return { entry: exactGeneric, confidence: 'high' };

  // Exact match on any brand name or substitute
  const allBrands = DRUG_DICTIONARY.find(d =>
    [...d.brand_names, ...(d.substitutes || [])].some(b => b.toLowerCase() === name)
  );
  if (allBrands) return { entry: allBrands, confidence: 'high' };

  // Starts-with match (e.g. "Augmentin" matches "Augmentin 625 Duo Tablet")
  const startsWithBrand = DRUG_DICTIONARY.find(d =>
    d.brand_names.some(b => b.toLowerCase().startsWith(name) || name.startsWith(b.toLowerCase()))
  );
  if (startsWithBrand) return { entry: startsWithBrand, confidence: 'high' };

  // Partial match on generic
  const partialGeneric = DRUG_DICTIONARY.find(d =>
    d.generic_name.toLowerCase().includes(name) || name.includes(d.generic_name.toLowerCase())
  );
  if (partialGeneric) return { entry: partialGeneric, confidence: 'low' };

  // Partial match on brand name or composition
  const partialBrand = DRUG_DICTIONARY.find(d =>
    d.brand_names.some(b => b.toLowerCase().includes(name) || name.includes(b.toLowerCase())) ||
    (d.compositions || []).some(c => c.toLowerCase().includes(name) || name.includes(c.toLowerCase().split(' ')[0]))
  );
  if (partialBrand) return { entry: partialBrand, confidence: 'low' };

  return { entry: null, confidence: 'unrecognized' };
}

export function normalizeMedication(brandName: string, genericInput?: string): {
  generic_name: string;
  drug_class: string;
  drug_subclass: string;
  confidence: 'high' | 'low' | 'unrecognized';
  requires_confirmation: boolean;
  entry: DrugEntry | null;
} {
  const brandLookup = lookupDrug(brandName);
  const genericLookup = genericInput ? lookupDrug(genericInput) : { entry: null, confidence: 'unrecognized' as const };

  const best = brandLookup.entry || genericLookup.entry;
  const confidence = brandLookup.confidence === 'high' ? 'high' :
    genericLookup.confidence === 'high' ? 'high' :
    brandLookup.confidence === 'low' || genericLookup.confidence === 'low' ? 'low' : 'unrecognized';

  if (best) {
    return {
      generic_name: best.generic_name,
      drug_class: best.drug_class,
      drug_subclass: best.drug_subclass,
      confidence,
      requires_confirmation: confidence === 'low',
      entry: best,
    };
  }

  return {
    generic_name: genericInput || brandName,
    drug_class: '',
    drug_subclass: '',
    confidence: 'unrecognized',
    requires_confirmation: true,
    entry: null,
  };
}

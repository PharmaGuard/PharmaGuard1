import type { Medication, Patient, Encounter, RuleResult, AlertSeverity, DrugEntry } from '../types';
import { DRUG_DICTIONARY } from '../data/drugDictionary';

// ─────────────────────────────────────────────────────────────────────────────
// TEXT NORMALISATION
// Strips Unicode punctuation, collapses whitespace, lowercases.
// Used for drug name matching — keeps +, -, /, . for combo drug names.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeText(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')   // em/en dash → hyphen
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9+\-/. ]/g, '')
    .trim();
}

function normalizeDx(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// DRUG DICTIONARY LOOKUP
// Four-tier matching: exact generic → brand name → safe composition → partial.
//
// BUG FIX vs upgraded engine: composition and partial matches require
// token length ≥ 4 chars to prevent false positives (e.g. "am" matching
// amiodarone, amoxicillin, and metformin simultaneously).
// ─────────────────────────────────────────────────────────────────────────────
function getDrugEntry(medication: Medication): DrugEntry | null {
  const generic = normalizeText(medication.generic_name);
  const brand   = normalizeText(medication.brand_name);
  const tokens  = [generic, brand].filter(t => t.length > 0);
  if (tokens.length === 0) return null;

  return (
    DRUG_DICTIONARY.find(d => {
      const dGeneric = normalizeText(d.generic_name);

      // Tier 1: exact generic name match
      if (tokens.some(t => t === dGeneric)) return true;

      // Tier 2: exact brand name match
      if (d.brand_names.some(b => {
        const nb = normalizeText(b);
        return tokens.some(t => t === nb);
      })) return true;

      // Tier 3: composition match — e.g. "ibuprofen+paracetamol" tablet
      // Minimum length of 4 on BOTH sides prevents "am" / "ol" false hits
      if (d.compositions?.some(c => {
        const nc = normalizeText(c);
        if (nc.length < 4) return false;
        return tokens.some(t => t.length >= 4 && (nc.includes(t) || t.includes(nc)));
      })) return true;

      // Tier 4: partial generic (handles "metformin 500mg" → "metformin")
      // Minimum length of 5 to avoid short-token false positives
      if (tokens.some(t => t.length >= 5 && dGeneric.includes(t))) return true;

      return false;
    }) ?? null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-INDEX ACTIVE MEDICATIONS
// Builds a Map<medicationId, DrugEntry> once per engine run so all subsequent
// rule checks are O(1) per medication, not O(m) where m = dictionary size.
// ─────────────────────────────────────────────────────────────────────────────
function buildEntryIndex(meds: Medication[]): Map<string, DrugEntry> {
  const index = new Map<string, DrugEntry>();
  for (const med of meds) {
    const entry = getDrugEntry(med);
    if (entry) index.set(med.id, entry);
  }
  return index;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSIS CONTEXT
// Returns a has() closure that tests whether the patient's diagnoses list
// contains any of the given keyword terms (bidirectional substring match).
//
// Uses patient.diagnoses only — Encounter has no diagnoses field in the type
// and casting around that would be a type model smell.
// ─────────────────────────────────────────────────────────────────────────────
function buildDiagnosisContext(patient: Patient) {
  const normalizedDx = (patient.diagnoses ?? []).map(normalizeDx).filter(Boolean);

  return function has(...terms: string[]): boolean {
    const needles = terms.map(normalizeDx).filter(Boolean);
    return needles.some(needle =>
      normalizedDx.some(dx => dx.includes(needle) || needle.includes(dx))
    );
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOSE PARSING
// Converts a dose string + frequency label into estimated daily mg.
// Handles all common Indian prescription abbreviations including Q4H.
//
// BUG FIX: Uses word-boundary regex (\b) to prevent substring false matches
// (e.g. "period" matching "od", "modify" matching "od").
// BUG FIX: Restored q4 (6×/day) case that was missing in the upgraded engine.
// ─────────────────────────────────────────────────────────────────────────────
function parseDailyDoseMg(dose: string, frequency: string): number | null {
  const doseMatch = dose.match(/([\d.]+)\s*(mg|mcg|g)\b/i);
  if (!doseMatch) return null;

  let amount = parseFloat(doseMatch[1]);
  if (isNaN(amount)) return null;

  const unit = doseMatch[2].toLowerCase();
  if (unit === 'g')   amount *= 1000;
  if (unit === 'mcg') amount /= 1000;

  const freq = frequency.toLowerCase();

  // PRN and one-off doses have no meaningful daily total — skip the check entirely.
  // Returning null causes all dose-threshold rules to silently skip this medication,
  // which is the correct clinical behaviour (daily limits don't apply to as-needed doses).
  if (/\b(prn|as needed|as required|once only|stat|single dose)\b/.test(freq)) return null;

  let multiplier = 1;

  // Check most specific patterns first to avoid ambiguous substring matches
  if      (/\b(1-1-1-1|qid|four times|q6)\b/.test(freq))                     multiplier = 4;
  else if (/\b(1-1-1|tds|tid|three times|thrice|q8)\b/.test(freq))            multiplier = 3;
  else if (/\b(1-0-1|bd|bid|twice daily|twice a day|q12)\b/.test(freq))       multiplier = 2;
  else if (/\b(1-0-0|od|qd|once daily|once a day)\b/.test(freq))              multiplier = 1;
  else if (/\bq4\b/.test(freq))                                                multiplier = 6;
  else if (/\b(hs|night|nocte|0-0-1|bedtime)\b/.test(freq))                   multiplier = 1;
  else if (/\b(alternate|eod|every other day)\b/.test(freq))                   multiplier = 0.5;
  else if (/\b(weekly|once a week)\b/.test(freq))                              multiplier = 1 / 7;
  // ── Fix: handle the UI dropdown's "Every Xh" options that were previously
  //    silently falling through to multiplier = 1 (once-daily), making all
  //    dose-threshold rules blind to these frequencies.
  else if (/every\s*4\s*h/i.test(freq))                                        multiplier = 6;
  else if (/every\s*6\s*h/i.test(freq))                                        multiplier = 4;
  else if (/every\s*8\s*h/i.test(freq))                                        multiplier = 3;
  else if (/every\s*12\s*h/i.test(freq))                                        multiplier = 2;

  return amount * multiplier;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT FACTORY
// ─────────────────────────────────────────────────────────────────────────────
function makeAlert(
  severity: AlertSeverity,
  alert_type: string,
  title: string,
  reason: string,
  rule_source: string,
  suggested_action: string,
  medication_ids: string[]
): RuleResult {
  return { medication_ids, severity, alert_type, title, reason, rule_source, suggested_action };
}

/** Safely returns display name for a medication */
function medName(med: Medication): string {
  return med.generic_name || med.brand_name || 'Unknown drug';
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE SECTION 1: PER-MEDICATION RULES
// One pass per active medication. Covers Beers drug classes, dose checks,
// specific high-risk drug rules (metformin, digoxin, glibenclamide), and
// hepatic / narrow therapeutic index flags.
// ─────────────────────────────────────────────────────────────────────────────
function runMedicationRules(
  med: Medication,
  entry: DrugEntry,
  patient: Patient,
  clinical: Encounter['clinical_data'],
  results: RuleResult[]
): void {
  const name      = medName(med);
  const egfr      = clinical.egfr ?? null;
  const isElderly = patient.elderly_risk_mode;

  // ── NSAIDs ──────────────────────────────────────────────────────────────────
  if (entry.drug_class === 'NSAID') {
    if (isElderly) {
      results.push(makeAlert('red', 'nsaid_elderly',
        'NSAID prescribed to elderly patient',
        `${name} is an NSAID. NSAIDs are explicitly listed as high-risk (Beers Criteria) in patients aged 65+ due to risk of GI bleeding, acute kidney injury, and fluid retention. This patient is ${patient.age} years old.`,
        'Beers Criteria 2023 / AGS',
        'Consider paracetamol as safer alternative. If NSAID is essential, use lowest effective dose with PPI cover and monitor renal function. Document clear indication.',
        [med.id]
      ));
    }

    if (egfr !== null) {
      if (egfr < 60) {
        results.push(makeAlert('red', 'nsaid_renal',
          'NSAID contraindicated: eGFR < 60',
          `${name} (NSAID) should be avoided when eGFR < 60 mL/min. Patient eGFR is ${egfr} mL/min. NSAIDs reduce renal prostaglandin synthesis, causing renal vasoconstriction and risk of AKI.`,
          'CDSCO / BNF / Beers Criteria',
          'Discontinue NSAID immediately. Use paracetamol for pain. Check serum creatinine and urine output. Consult nephrology if eGFR < 30.',
          [med.id]
        ));
      } else if (egfr < 90) {
        results.push(makeAlert('amber', 'nsaid_renal_caution',
          'NSAID caution: reduced eGFR',
          `Patient eGFR is ${egfr} mL/min (mildly reduced). NSAIDs carry added risk of further renal impairment in patients with pre-existing CKD.`,
          'BNF / CDSCO',
          'Use minimum effective dose, monitor renal function during treatment, ensure adequate hydration.',
          [med.id]
        ));
      }
    } else {
      results.push(makeAlert('amber', 'nsaid_no_renal_data',
        'NSAID prescribed: renal function not documented',
        `${name} is an NSAID. Renal function (eGFR/creatinine) has not been recorded. Cannot assess renal safety.`,
        'Clinical Practice Guideline',
        'Document eGFR or serum creatinine before continuing NSAID. Consider stopping until renal function is confirmed.',
        [med.id]
      ));
    }
  }

  // ── Benzodiazepines ─────────────────────────────────────────────────────────
  if (entry.drug_class === 'Benzodiazepine' && isElderly) {
    results.push(makeAlert('red', 'benzo_elderly',
      'Benzodiazepine in elderly: high fall and confusion risk',
      `${name} is a benzodiazepine. In patients aged 65+, benzodiazepines substantially increase risk of falls, hip fractures, acute confusion (delirium), and respiratory depression.`,
      'Beers Criteria 2023 / STOPP Version 2',
      'Plan gradual taper and discontinue. For insomnia: sleep hygiene, melatonin if needed. For anxiety: SSRI preferred. Document justification if unavoidable.',
      [med.id]
    ));
  }

  // ── Z-drugs ─────────────────────────────────────────────────────────────────
  if (entry.drug_class === 'Sedative-Hypnotic' && isElderly) {
    results.push(makeAlert('red', 'zdrug_elderly',
      'Sedative-hypnotic (Z-drug) in elderly: fall risk',
      `${name} (Z-drug) is associated with significantly increased fall risk in patients aged 65+. Effects may persist into the next day due to prolonged half-life in elderly patients.`,
      'Beers Criteria 2023 / STOPP Version 2',
      'Discontinue or reduce dose. Use CBT-I or melatonin as alternatives.',
      [med.id]
    ));
  }

  // ── First-generation antihistamines ─────────────────────────────────────────
  if (entry.drug_subclass === 'first_gen' && isElderly) {
    results.push(makeAlert('red', 'firstgen_antihistamine_elderly',
      'First-generation antihistamine in elderly: anticholinergic risk',
      `${name} is a first-generation antihistamine with high anticholinergic activity. In patients aged 65+, anticholinergic drugs increase risk of acute confusion, urinary retention, constipation, dry mouth, and blurred vision.`,
      'Beers Criteria 2023 / STOPP Version 2',
      'Switch to second-generation antihistamine (cetirizine, loratadine) if antihistamine is required.',
      [med.id]
    ));
  }

  // ── Antipsychotics in elderly ────────────────────────────────────────────────
  // Dementia/delirium documented → RED (Beers explicit avoid)
  // Elderly without documented cognitive impairment → AMBER (use with caution)
  // Also flags tardive dyskinesia risk — not just sedation.
  if (entry.drug_class === 'Antipsychotic' && isElderly) {
    if (clinical.cognitive_impairment === true) {
      results.push(makeAlert('red', 'antipsychotic_dementia_elderly',
        'Antipsychotic in cognitively impaired elderly patient',
        `${name} is an antipsychotic. In elderly patients with dementia or cognitive impairment, antipsychotics increase mortality, worsen confusion, and are associated with cerebrovascular events. This patient has documented cognitive impairment.`,
        'Beers Criteria 2023 — avoid in dementia / AGS',
        'Avoid unless no safer option exists. If unavoidable: use the lowest dose for the shortest time and document the indication. Consider non-pharmacological de-escalation first.',
        [med.id]
      ));
    } else {
      results.push(makeAlert('amber', 'antipsychotic_elderly',
        'Antipsychotic in elderly: extrapyramidal and metabolic risk',
        `${name} carries sedation, orthostatic hypotension, extrapyramidal, and metabolic risks in older adults. Tardive dyskinesia risk increases with duration of use.`,
        'Beers Criteria 2023 — use with caution',
        'Confirm indication. Consider dose reduction. Monitor for extrapyramidal symptoms, orthostatic hypotension, falls, and metabolic changes. Review regularly.',
        [med.id]
      ));
    }
  }

  // ── SSRIs in elderly ─────────────────────────────────────────────────────────
  // Falls, hyponatraemia (SIADH), and impaired platelet aggregation —
  // three independent risks that are all underrecognised in routine prescribing.
  if (entry.drug_class === 'Antidepressant' && entry.drug_subclass === 'ssri' && isElderly) {
    results.push(makeAlert('amber', 'ssri_elderly',
      'SSRI in elderly: falls, hyponatraemia, and bleeding risk',
      `${name} (SSRI) in older adults is associated with falls, hyponatraemia (syndrome of inappropriate ADH secretion), and impaired platelet aggregation. All three risks are underrecognised in routine prescribing.`,
      'Beers Criteria 2023 — use with caution / STOPP Version 2',
      'Check sodium at baseline and at 2–4 weeks. Review concurrent NSAIDs or anticoagulants that compound bleeding risk. Confirm the lowest effective dose.',
      [med.id]
    ));
  }

  // ── Alpha-blockers in elderly ────────────────────────────────────────────────
  if (entry.drug_subclass === 'alpha_blocker' && isElderly) {
    results.push(makeAlert('amber', 'alpha_blocker_elderly',
      'Alpha-blocker in elderly: postural hypotension and falls risk',
      `${name} (alpha-blocker) causes postural hypotension in elderly patients, significantly increasing fall risk.`,
      'Beers Criteria 2023',
      'Consider safer antihypertensive. If alpha-blocker is continued, advise patient to rise slowly. Monitor standing blood pressure.',
      [med.id]
    ));
  }

  // ── Geriatric dose thresholds ────────────────────────────────────────────────
  if (entry.dose_thresholds && entry.dose_thresholds.length > 0 && isElderly) {
    const dailyMg = parseDailyDoseMg(med.dose, med.frequency);
    if (dailyMg !== null) {
      for (const threshold of entry.dose_thresholds) {
        if (threshold.max_geriatric_daily_mg !== undefined && dailyMg > threshold.max_geriatric_daily_mg) {
          const sexNote = threshold.sex_note ? ` Note: ${threshold.sex_note}.` : '';
          results.push(makeAlert(
            threshold.flag_severity,
            'dose_too_high_geriatric',
            `Dose exceeds geriatric safety threshold: ${name}`,
            `Prescribed daily dose (~${dailyMg.toFixed(2)} ${threshold.unit}) exceeds the recommended maximum for elderly patients (${threshold.max_geriatric_daily_mg} ${threshold.unit}). Patient age: ${patient.age}y.${sexNote} Elderly patients have reduced clearance, lower body water, and altered drug distribution.`,
            threshold.source,
            `Reduce to maximum geriatric dose (${threshold.max_geriatric_daily_mg} ${threshold.unit}). Reassess at each visit. Monitor for drug accumulation and adverse effects.`,
            [med.id]
          ));
        }
      }
    }
  }

  // ── Absolute overdosage ceiling (all patients) ──────────────────────────────
  // Fires when prescribed daily dose exceeds max_adult_daily_mg regardless of age.
  // Independent of the geriatric check above — covers non-elderly overdosage too.
  // Uses the same parseDailyDoseMg and makeAlert primitives; no existing logic touched.
  if (entry.dose_thresholds && entry.dose_thresholds.length > 0) {
    const dailyMg = parseDailyDoseMg(med.dose, med.frequency);
    if (dailyMg !== null) {
      for (const threshold of entry.dose_thresholds) {
        if (threshold.max_adult_daily_mg !== undefined && dailyMg > threshold.max_adult_daily_mg) {
          results.push(makeAlert(
            'red',
            'dose_overdose_absolute',
            `Overdose alert: ${name} exceeds maximum daily dose`,
            `Prescribed daily dose (~${dailyMg.toFixed(2)} ${threshold.unit}) exceeds the absolute recommended maximum for adults (${threshold.max_adult_daily_mg} ${threshold.unit}/day). Exceeding this ceiling substantially increases the risk of toxicity and serious adverse effects — including hepatotoxicity for paracetamol, GI haemorrhage for NSAIDs, and cardiotoxicity for narrow-index drugs.`,
            threshold.source,
            `Reduce the dose immediately to within the safe ceiling (≤ ${threshold.max_adult_daily_mg} ${threshold.unit}/day). Review the indication and prescribe the minimum effective dose. Escalate to a clinical pharmacist for a full dose reconciliation.`,
            [med.id]
          ));
        }
      }
    }
  }

  // ── Weight-based dose check ──────────────────────────────────────────────────
  if (entry.dose_thresholds && entry.dose_thresholds.length > 0) {
    const weightThreshold = entry.dose_thresholds.find(t => t.max_weight_based_mg_per_kg !== undefined);
    if (weightThreshold) {
      if (clinical.weight === null || clinical.weight === undefined) {
        results.push(makeAlert('amber', 'weight_missing_for_dose_check',
          `Weight-based dosing cannot be assessed: ${name}`,
          `${name} requires weight-based dosing but patient weight has not been recorded. Dose safety cannot be fully assessed.`,
          weightThreshold.source,
          'Record patient weight to complete dosing assessment.',
          [med.id]
        ));
      } else {
        const dailyMg = parseDailyDoseMg(med.dose, med.frequency);
        if (dailyMg !== null) {
          const maxWeightBased = weightThreshold.max_weight_based_mg_per_kg! * clinical.weight;
          if (dailyMg > maxWeightBased * 1.2) {
            results.push(makeAlert('red', 'dose_exceeds_weight_threshold',
              `Dose exceeds weight-based maximum: ${name}`,
              `Daily dose (~${dailyMg.toFixed(1)} mg) exceeds weight-based maximum for patient weight ${clinical.weight} kg (max ${maxWeightBased.toFixed(1)} mg/day at ${weightThreshold.max_weight_based_mg_per_kg} mg/kg/day).`,
              weightThreshold.source,
              'Review and adjust dose based on patient weight. Consult prescribing guidelines.',
              [med.id]
            ));
          }
        }
      }
    }
  }

  // ── Sex-specific dose caution ────────────────────────────────────────────────
  if (entry.dose_thresholds && entry.dose_thresholds.length > 0 && patient.sex === 'female' && isElderly) {
    for (const threshold of entry.dose_thresholds) {
      if (threshold.sex_note) {
        const dailyMg = parseDailyDoseMg(med.dose, med.frequency);
        if (dailyMg !== null && threshold.max_geriatric_daily_mg !== undefined && dailyMg > threshold.max_geriatric_daily_mg * 0.75) {
          results.push(makeAlert('amber', 'sex_specific_dose_caution',
            `Sex-specific dosing consideration: ${name}`,
            `Evidence-based sex differences exist for this drug in elderly patients. ${threshold.sex_note}`,
            threshold.source,
            'Consider sex-adjusted dosing. Consult current prescribing guidelines for elderly female patients.',
            [med.id]
          ));
          break;
        }
      }
    }
  }

  // ── Metformin and renal impairment ───────────────────────────────────────────
  if (entry.generic_name === 'metformin' && egfr !== null) {
    if (egfr < 30) {
      results.push(makeAlert('red', 'metformin_severe_renal',
        'Metformin contraindicated: eGFR < 30',
        `Metformin is absolutely contraindicated when eGFR < 30 mL/min due to risk of lactic acidosis. Patient eGFR is ${egfr} mL/min.`,
        'CDSCO / BNF / ADA Guidelines',
        'Stop metformin immediately. Switch to safer antidiabetic: insulin or gliclazide. Urgent diabetologist review.',
        [med.id]
      ));
    } else if (egfr < 45) {
      results.push(makeAlert('amber', 'metformin_moderate_renal',
        'Metformin caution: eGFR 30–45',
        `Metformin should be used with caution when eGFR is 30–45 mL/min. Patient eGFR is ${egfr} mL/min.`,
        'BNF / ADA Guidelines',
        'Reduce metformin dose. Monitor renal function closely. Consider switching if eGFR continues to fall.',
        [med.id]
      ));
    }
  }

  // ── Digoxin and renal impairment ─────────────────────────────────────────────
  if (entry.generic_name === 'digoxin' && egfr !== null && egfr < 60) {
    results.push(makeAlert('red', 'digoxin_renal',
      'Digoxin toxicity risk: eGFR < 60',
      `Digoxin is renally cleared. When eGFR < 60, digoxin accumulates causing toxicity (bradycardia, nausea, visual disturbance, arrhythmia). Patient eGFR is ${egfr} mL/min.`,
      'BNF / CDSCO',
      'Reduce digoxin dose or dosing interval. Monitor serum digoxin levels (target 0.5–0.9 ng/mL in elderly). Check potassium — hypokalaemia worsens toxicity.',
      [med.id]
    ));
  }

  // ── Glibenclamide in elderly ─────────────────────────────────────────────────
  if (entry.generic_name === 'glibenclamide' && isElderly) {
    results.push(makeAlert('red', 'glibenclamide_elderly',
      'Glibenclamide: high hypoglycaemia risk in elderly',
      `Glibenclamide (long-acting sulfonylurea) is listed as high-risk in patients aged 65+. Prolonged hypoglycaemia can cause falls, cardiac events, and neurological damage.`,
      'Beers Criteria 2023 / STOPP Version 2',
      'Switch to gliclazide MR or a DPP-4 inhibitor. Monitor blood glucose closely for 48–72 hours after switching.',
      [med.id]
    ));
  }

  // ── Hepatic impairment ───────────────────────────────────────────────────────
  if (entry.hepatic_risk && clinical.hepatic_impairment && clinical.hepatic_impairment !== 'none') {
    const sev: AlertSeverity = clinical.hepatic_impairment === 'severe' ? 'red' : 'amber';
    results.push(makeAlert(sev, 'hepatic_risk_drug',
      `Hepatic caution: ${name} with ${clinical.hepatic_impairment} hepatic impairment`,
      `${name} has significant hepatic metabolism. It carries risk of accumulation or hepatotoxicity in patients with ${clinical.hepatic_impairment} hepatic impairment, potentially increasing sedative, CNS, or toxic effects unpredictably.`,
      'BNF / CDSCO / SmPC',
      clinical.hepatic_impairment === 'severe'
        ? 'Avoid this drug in severe hepatic impairment. Seek hepatology advice for an appropriate alternative.'
        : 'Use with caution. Reduce starting dose by 50%. Monitor for excessive drug effects and signs of hepatotoxicity.',
      [med.id]
    ));
  }

  // ── Narrow therapeutic index ─────────────────────────────────────────────────
  if (entry.narrow_therapeutic_index && isElderly) {
    results.push(makeAlert('amber', 'narrow_therapeutic_index',
      `Narrow therapeutic index drug in elderly: ${name}`,
      `${name} has a narrow therapeutic index. In elderly patients, reduced renal or hepatic clearance can cause rapid transition from therapeutic to toxic levels. Age-related changes in volume of distribution further increase variability.`,
      'BNF / Clinical Pharmacology',
      'Monitor serum levels where available. Use the lowest effective dose. Observe closely for early signs of toxicity.',
      [med.id]
    ));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE SECTION 2: DISEASE–DRUG INTERACTION RULES
// Matches active medications against the patient's diagnoses.
// Separate from per-medication rules to keep each concern isolated.
// ─────────────────────────────────────────────────────────────────────────────
function runDiseaseDrugRules(
  med: Medication,
  entry: DrugEntry,
  patient: Patient,
  clinical: Encounter['clinical_data'],
  hasDx: (...terms: string[]) => boolean,
  results: RuleResult[]
): void {
  const name      = medName(med);
  const isElderly = patient.elderly_risk_mode;

  // NSAID in heart failure
  if (entry.drug_class === 'NSAID') {
    if (hasDx('heart failure', 'cardiac failure', 'chf', 'congestive heart failure')) {
      results.push(makeAlert('red', 'nsaid_heart_failure',
        'NSAID in heart failure',
        `${name} can cause sodium and fluid retention, worsening heart failure. NSAIDs are contraindicated in most patients with established heart failure.`,
        'Beers Criteria 2023 — disease/drug interaction / ESC HF Guidelines',
        'Avoid NSAID. Use paracetamol for analgesia. If already prescribed, monitor weight, oedema, and dyspnoea closely.',
        [med.id]
      ));
    }

    if (hasDx('ckd', 'chronic kidney disease', 'renal impairment', 'kidney disease', 'chronic renal failure')) {
      results.push(makeAlert('amber', 'nsaid_ckd_diagnosis',
        'NSAID in chronic kidney disease',
        `${name} is being used in a patient with documented kidney disease, which substantially increases nephrotoxicity risk even when a numerical eGFR is not yet recorded.`,
        'Beers Criteria 2023 — disease/drug interaction',
        'Prefer a non-NSAID analgesic. If already prescribed, check renal labs urgently.',
        [med.id]
      ));
    }
  }

  // Anticholinergic drugs + BPH / narrow-angle glaucoma / urinary retention
  // These are absolute or near-absolute contraindications, not just cautions.
  if (entry.anticholinergic_score >= 2 || entry.drug_class === 'Anticholinergic') {
    if (hasDx('bph', 'benign prostatic hyperplasia', 'urinary retention', 'glaucoma', 'narrow angle glaucoma', 'narrow-angle glaucoma')) {
      results.push(makeAlert('red', 'anticholinergic_urological_ophthalmic',
        'Anticholinergic drug contraindicated in BPH / glaucoma / urinary retention',
        `${name} has significant anticholinergic activity. This is contraindicated or high-risk in BPH (worsens urinary retention), narrow-angle glaucoma (raises intraocular pressure), and urinary retention.`,
        'Beers Criteria 2023 — disease/drug interaction / BNF',
        'Substitute with a lower-anticholinergic alternative. For allergy: cetirizine or loratadine. For depression: SSRIs. For psychosis: discuss with psychiatry.',
        [med.id]
      ));
    }
  }

  // Opioid in elderly with fall history or cognitive impairment
  if (entry.drug_class === 'Opioid' && isElderly) {
    if (clinical.fall_history === true) {
      results.push(makeAlert('amber', 'opioid_fall_history',
        'Opioid in patient with documented fall history',
        `${name} increases sedation and fall risk. This patient has a documented fall history, making this combination particularly high-risk.`,
        'Beers Criteria 2023 — use with caution',
        'Use the lowest effective dose and the shortest duration. Consider non-opioid analgesics. Implement fall precautions and physiotherapy review.',
        [med.id]
      ));
    }
    if (clinical.cognitive_impairment === true) {
      results.push(makeAlert('amber', 'opioid_cognitive_impairment',
        'Opioid in cognitively impaired elderly patient',
        `${name} may worsen confusion and precipitate delirium in a patient with documented cognitive impairment.`,
        'Beers Criteria 2023 — use with caution / AGS Delirium Guidelines',
        'Reduce CNS burden wherever possible. Monitor for delirium using a validated tool (e.g. 4AT). If opioid is essential, use the lowest dose and shortest course.',
        [med.id]
      ));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE SECTION 3: DRUG–DRUG INTERACTION RULES
// Run once across the full active medication list using pre-computed class
// groups. No per-medication looping needed here.
// ─────────────────────────────────────────────────────────────────────────────
function runDDIRules(
  active: Medication[],
  getEntry: (med: Medication) => DrugEntry | null,
  results: RuleResult[]
): void {
  // Classify active meds by class/subclass once
  const byGeneric  = (name: string)   => active.find(m => getEntry(m)?.generic_name === name);
  const byClass    = (cls: string)    => active.filter(m => getEntry(m)?.drug_class === cls);
  const bySubclass = (sub: string)    => active.filter(m => getEntry(m)?.drug_subclass === sub);

  const nsaids         = byClass('NSAID');
  const opioids        = byClass('Opioid');
  const benzos         = byClass('Benzodiazepine');
  const anticoagulants = byClass('Anticoagulant');
  const antiplatelets  = byClass('Antiplatelet');
  const diuretics      = byClass('Diuretic');
  const corticosteroids = byClass('Corticosteroid');
  const acei           = bySubclass('ace_inhibitor');
  const arbs           = bySubclass('arb');
  const ssris          = bySubclass('ssri');
  const warfarin       = byGeneric('warfarin');
  const amiodarone     = byGeneric('amiodarone');

  // ── Amiodarone + Warfarin ────────────────────────────────────────────────────
  if (amiodarone && warfarin) {
    results.push(makeAlert('red', 'ddi_amiodarone_warfarin',
      'Critical DDI: Amiodarone + Warfarin — major bleeding risk',
      'Amiodarone inhibits CYP2C9 and CYP3A4, significantly increasing warfarin plasma levels. INR can double or triple within 1–2 weeks, causing life-threatening bleeding.',
      'BNF / CDSCO Drug Interaction Database',
      'Reduce warfarin dose by 30–50% when starting amiodarone. Monitor INR every 3–5 days for 4 weeks, then weekly. Target INR 2.0–3.0.',
      [amiodarone.id, warfarin.id]
    ));
  }

  // ── Opioid + Benzodiazepine ──────────────────────────────────────────────────
  // FDA black box warning. One of the most dangerous combinations in any ward.
  if (opioids.length > 0 && benzos.length > 0) {
    results.push(makeAlert('red', 'ddi_opioid_benzo',
      'Critical DDI: Opioid + Benzodiazepine — respiratory depression risk',
      `Concurrent opioids (${opioids.map(medName).join(', ')}) and benzodiazepines (${benzos.map(medName).join(', ')}) cause additive CNS and respiratory depression. This combination is associated with a 3–4× increase in overdose death risk.`,
      'FDA Black Box Warning / Beers Criteria 2023 — clinically important DDI',
      'Avoid combination if at all possible. If unavoidable, use minimum doses, monitor closely for respiratory depression, and have reversal agents accessible.',
      [...opioids.map(m => m.id), ...benzos.map(m => m.id)]
    ));
  }

  // ── Triple Whammy: ACEi/ARB + Diuretic + NSAID ──────────────────────────────
  // One of the most common causes of hospital-acquired AKI.
  if (nsaids.length > 0 && (acei.length > 0 || arbs.length > 0) && diuretics.length > 0) {
    const raasNames = [...acei, ...arbs].map(medName).join(', ');
    results.push(makeAlert('red', 'ddi_triple_whammy',
      'Triple Whammy: ACEi/ARB + Diuretic + NSAID — acute kidney injury risk',
      `This combination (${raasNames} + diuretic + NSAID) causes synergistic renal vasoconstriction and is one of the most common causes of hospital-acquired AKI. All three classes blunt renal autoregulation through independent mechanisms.`,
      'Renal safety / BNF Drug Interaction Database',
      'Avoid this triple combination. If unavoidable, monitor renal function and electrolytes every 48–72 hours. Ensure adequate hydration. Prefer paracetamol over NSAID.',
      [...nsaids.map(m => m.id), ...acei.map(m => m.id), ...arbs.map(m => m.id), ...diuretics.map(m => m.id)]
    ));
  } else if (nsaids.length > 0 && (acei.length > 0 || arbs.length > 0)) {
    // ACEi/ARB + NSAID without diuretic — still a clinically relevant risk
    results.push(makeAlert('amber', 'ddi_acei_arb_nsaid',
      'ACE inhibitor/ARB + NSAID — renal and hyperkalaemia risk',
      `Combination of ${[...acei, ...arbs].map(medName).join(', ')} (RAAS blocker) and ${nsaids.map(medName).join(', ')} (NSAID) can cause acute kidney injury and hyperkalaemia.`,
      'BNF / CDSCO',
      'Avoid combination if possible. Use paracetamol for analgesia. If essential, monitor renal function and potassium weekly.',
      [...nsaids.map(m => m.id), ...acei.map(m => m.id), ...arbs.map(m => m.id)]
    ));
  }

  // ── Corticosteroid + NSAID ───────────────────────────────────────────────────
  if (corticosteroids.length > 0 && nsaids.length > 0) {
    results.push(makeAlert('red', 'ddi_steroid_nsaid',
      'DDI: Corticosteroid + NSAID — GI bleed risk',
      `Concurrent use of ${corticosteroids.map(medName).join(', ')} (corticosteroid) and ${nsaids.map(medName).join(', ')} (NSAID) significantly increases GI ulceration and bleeding risk. Combined use is associated with a >15-fold increase in GI bleed risk versus either drug alone.`,
      'BNF / CDSCO',
      'Avoid concurrent use. If both are necessary, add a PPI. Review the indication for each drug.',
      [...corticosteroids.map(m => m.id), ...nsaids.map(m => m.id)]
    ));
  }

  // ── SSRI + NSAID ─────────────────────────────────────────────────────────────
  if (ssris.length > 0 && nsaids.length > 0) {
    results.push(makeAlert('amber', 'ddi_ssri_nsaid',
      'DDI: SSRI + NSAID — increased GI bleeding risk',
      `SSRIs (${ssris.map(medName).join(', ')}) inhibit platelet serotonin uptake, impairing platelet aggregation. Combined with NSAIDs (${nsaids.map(medName).join(', ')}), GI bleeding risk increases 3–15 fold.`,
      'BNF / CDSCO',
      'Add PPI if combination cannot be avoided. Prefer paracetamol over NSAID.',
      [...ssris.map(m => m.id), ...nsaids.map(m => m.id)]
    ));
  }

  // ── Dual anticoagulation ─────────────────────────────────────────────────────
  if (anticoagulants.length >= 2) {
    results.push(makeAlert('red', 'ddi_dual_anticoagulation',
      'Dual anticoagulation: major bleeding risk',
      `Patient is prescribed two anticoagulants: ${anticoagulants.map(medName).join(' + ')}. This carries a very high risk of life-threatening bleeding.`,
      'BNF / CDSCO / ESC Guidelines',
      'Review indication for each anticoagulant. One should typically be discontinued. Senior/haematology review recommended.',
      anticoagulants.map(m => m.id)
    ));
  }

  // ── Anticoagulant + Antiplatelet ─────────────────────────────────────────────
  if (anticoagulants.length > 0 && antiplatelets.length > 0) {
    results.push(makeAlert('amber', 'ddi_anticoag_antiplatelet',
      'Anticoagulant + Antiplatelet: elevated bleeding risk',
      `${anticoagulants.map(medName).join(', ')} (anticoagulant) combined with ${antiplatelets.map(medName).join(', ')} (antiplatelet) increases bleeding risk significantly.`,
      'BNF / ESC Guidelines',
      'Document clear indication. Add PPI if GI risk is elevated. Minimise duration of dual therapy.',
      [...anticoagulants.map(m => m.id), ...antiplatelets.map(m => m.id)]
    ));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE SECTION 4: AGGREGATE / BURDEN RULES
// Computes cumulative scores and multi-drug patterns across all active meds.
// Pre-computes all medication lists up front to avoid repeated filter passes.
// ─────────────────────────────────────────────────────────────────────────────
function runAggregateRules(
  active: Medication[],
  patient: Patient,
  clinical: Encounter['clinical_data'],
  getEntry: (med: Medication) => DrugEntry | null,
  results: RuleResult[]
): void {
  const isElderly = patient.elderly_risk_mode;
  const nameList  = (meds: Medication[]) => meds.map(medName).join(', ');

  // Pre-compute all scored lists once
  const cnsMeds             = active.filter(m => getEntry(m)?.cns_active === true);
  const sedativeMeds        = active.filter(m => (getEntry(m)?.sedative_score ?? 0) > 0);
  const anticholinergicMeds = active.filter(m => (getEntry(m)?.anticholinergic_score ?? 0) > 0);
  const fallRiskMeds        = active.filter(m => getEntry(m)?.fall_risk === true);
  const bleedingRiskMeds    = active.filter(m => getEntry(m)?.bleeding_risk === true);
  const sedativeScore       = sedativeMeds.reduce((sum, m) => sum + (getEntry(m)?.sedative_score ?? 0), 0);
  const anticholinergicScore = anticholinergicMeds.reduce((sum, m) => sum + (getEntry(m)?.anticholinergic_score ?? 0), 0);

  // ── CNS polypharmacy ─────────────────────────────────────────────────────────
  if (isElderly && cnsMeds.length >= 3) {
    const cogNote  = clinical.cognitive_impairment ? ' This patient has documented cognitive impairment — CNS-active drugs carry additional delirium risk.' : '';
    const fallNote = clinical.fall_history ? ' Patient has a documented fall history — CNS depressants substantially increase re-fall risk.' : '';
    results.push(makeAlert('red', 'cns_polypharmacy',
      `CNS medication overload: ${cnsMeds.length} CNS-active drugs`,
      `Patient is prescribed ${cnsMeds.length} CNS-active medications: ${nameList(cnsMeds)}. Combinations of CNS-active drugs in elderly patients markedly increase risk of delirium, excessive sedation, and falls.${cogNote}${fallNote}`,
      'Beers Criteria 2023 / STOPP Version 2 / AGS Delirium Guidelines',
      'Rationalise CNS medications. Identify which are essential. Consider dose reduction or safer alternatives. Implement falls precautions. Perform cognitive assessment.',
      cnsMeds.map(m => m.id)
    ));
  } else if (isElderly && cnsMeds.length === 2) {
    results.push(makeAlert('amber', 'cns_dual_therapy',
      'Dual CNS medication therapy in elderly: heightened sedation risk',
      `Patient is prescribed 2 CNS-active medications: ${nameList(cnsMeds)}. Combined CNS depression increases fall and confusion risk.`,
      'Beers Criteria 2023 / STOPP Version 2',
      'Monitor closely for excessive sedation and confusion. Review the continued need for each CNS medication.',
      cnsMeds.map(m => m.id)
    ));
  }

  // ── Cognitive impairment + CNS/anticholinergic burden ────────────────────────
  if (isElderly && clinical.cognitive_impairment === true) {
    const riskMeds = active.filter(m => {
      const e = getEntry(m);
      return e && (e.anticholinergic_score >= 2 || e.sedative_score >= 2 || e.cns_active === true);
    });
    if (riskMeds.length > 0) {
      results.push(makeAlert('red', 'cognitive_impairment_cns_risk',
        'CNS-active drugs in cognitively impaired elderly patient',
        `Patient has documented cognitive impairment. ${riskMeds.length} medication(s) may worsen cognitive status or precipitate delirium: ${nameList(riskMeds)}.`,
        'AGS Delirium Prevention Guidelines / Beers Criteria 2023',
        'Urgent medication review by senior clinician. Minimise all CNS-active and anticholinergic agents. Ensure non-pharmacological delirium prevention measures are in place.',
        riskMeds.map(m => m.id)
      ));
    }
  }

  // ── Fall history + fall-risk medications ─────────────────────────────────────
  if (isElderly && clinical.fall_history === true && fallRiskMeds.length > 0) {
    results.push(makeAlert('red', 'fall_history_risk_drugs',
      'Fall-risk medications in patient with documented fall history',
      `Patient has a documented history of falls. ${fallRiskMeds.length} prescribed medication(s) independently increase fall risk: ${nameList(fallRiskMeds)}. Prior falls are the strongest predictor of future falls.`,
      'NICE CG161 / Beers Criteria 2023',
      'Conduct structured falls risk assessment. Reduce fall-risk medications where possible. Refer to physiotherapy for gait and balance assessment. Implement fall prevention protocol at discharge.',
      fallRiskMeds.map(m => m.id)
    ));
  }

  // ── Falls risk aggregate ─────────────────────────────────────────────────────
  if (isElderly && fallRiskMeds.length >= 3) {
    results.push(makeAlert('red', 'falls_risk_high',
      'High falls risk: 3+ fall-risk medications',
      `Patient is prescribed ${fallRiskMeds.length} fall-risk medications: ${nameList(fallRiskMeds)}. Polypharmacy with multiple fall-risk drugs substantially increases hip fracture and hospitalisation risk.`,
      'NICE CG161 / Beers Criteria 2023',
      'Perform structured falls risk assessment. Reduce fall-risk medications where possible. Refer to physiotherapy. Implement fall prevention protocol.',
      fallRiskMeds.map(m => m.id)
    ));
  } else if (isElderly && fallRiskMeds.length === 2) {
    results.push(makeAlert('amber', 'falls_risk_moderate',
      'Moderate falls risk: 2 fall-risk medications',
      `Patient is prescribed 2 fall-risk medications: ${nameList(fallRiskMeds)}.`,
      'NICE CG161',
      'Implement fall prevention measures. Monitor for postural hypotension. Consider falls risk assessment.',
      fallRiskMeds.map(m => m.id)
    ));
  }

  // ── Sedative burden ──────────────────────────────────────────────────────────
  if (isElderly && sedativeScore >= 5) {
    results.push(makeAlert('red', 'sedative_burden_high',
      'High sedative burden: combined sedation risk',
      `Patient has a sedative burden score of ${sedativeScore}/15. Multiple sedating medications significantly increase risk of over-sedation, respiratory depression, and falls. Sedating drugs: ${nameList(sedativeMeds)}.`,
      'Sedative Load Index / Beers Criteria',
      'Review all sedating medications. Consider discontinuing the least essential. Avoid combining opioids + benzodiazepines. Monitor closely for sedation and falls.',
      sedativeMeds.map(m => m.id)
    ));
  } else if (isElderly && sedativeScore >= 3) {
    results.push(makeAlert('amber', 'sedative_burden_moderate',
      'Moderate sedative burden: falls caution',
      `Patient has a sedative burden score of ${sedativeScore}/15. Combined sedating medications increase fall risk. Sedating drugs: ${nameList(sedativeMeds)}.`,
      'Sedative Load Index',
      'Review necessity of each sedating drug. Implement falls precautions. Consider physiotherapy review.',
      sedativeMeds.map(m => m.id)
    ));
  }

  // ── Anticholinergic burden ───────────────────────────────────────────────────
  if (isElderly && anticholinergicScore >= 4) {
    results.push(makeAlert('red', 'anticholinergic_burden_high',
      'High anticholinergic burden: delirium and cognitive risk',
      `Anticholinergic burden score is ${anticholinergicScore}. High anticholinergic load in elderly patients causes acute delirium, cognitive impairment, urinary retention, constipation, and dry mouth. At-risk drugs: ${nameList(anticholinergicMeds)}.`,
      'Anticholinergic Burden Scale (ACB) / STOPP Version 2',
      'Reduce anticholinergic load. Substitute with lower-risk alternatives. Review each anticholinergic drug for continued necessity.',
      anticholinergicMeds.map(m => m.id)
    ));
  } else if (isElderly && anticholinergicScore >= 2) {
    results.push(makeAlert('amber', 'anticholinergic_burden_moderate',
      'Moderate anticholinergic burden: confusion risk',
      `Anticholinergic burden score is ${anticholinergicScore}. Combined anticholinergic effects may cause confusion, especially in cognitively vulnerable elderly patients.`,
      'ACB Scale / Beers Criteria',
      'Monitor for signs of anticholinergic toxicity (confusion, dry mouth, urinary retention). Consider switching to lower-burden alternatives.',
      anticholinergicMeds.map(m => m.id)
    ));
  }

  // ── Duplicate therapy ────────────────────────────────────────────────────────
  // Groups meds by drug_class::drug_subclass.
  // Uses Map instead of Record to avoid prototype collision bugs.
  const classBuckets = new Map<string, Medication[]>();
  for (const med of active) {
    const e = getEntry(med);
    if (e?.drug_class) {
      const key    = `${e.drug_class}::${e.drug_subclass ?? ''}`;
      const bucket = classBuckets.get(key) ?? [];
      bucket.push(med);
      classBuckets.set(key, bucket);
    }
  }
  for (const [key, meds] of classBuckets) {
    if (meds.length > 1) {
      const [drugClass, subclass] = key.split('::');
      const subclassLabel = subclass ? ` (${subclass.replace(/_/g, ' ')})` : '';
      results.push(makeAlert('amber', 'duplicate_therapy',
        `Duplicate therapy: ${meds.length}× ${drugClass}${subclassLabel}`,
        `Patient is prescribed ${meds.length} drugs from the same class (${drugClass}${subclassLabel}): ${nameList(meds)}. Duplicate therapy increases adverse effect risk without added benefit.`,
        'Medication Reconciliation Best Practice',
        'Review each drug in this class. Keep only the most appropriate agent. Document clear indication if intentional combination.',
        meds.map(m => m.id)
      ));
    }
  }

  // ── Polypharmacy ─────────────────────────────────────────────────────────────
  if (isElderly && active.length >= 5) {
    results.push(makeAlert('green', 'polypharmacy',
      'Polypharmacy: medication review recommended',
      `Patient is on ${active.length} active medications. Polypharmacy (5+ drugs) in elderly patients is associated with increased adverse drug events, drug interactions, poor adherence, and falls.`,
      'WHO Medication Safety Challenge / STOPP/START',
      'Consider a structured medication review. Apply deprescribing principles — review each drug for continued necessity, appropriate dose, and risk/benefit in current clinical context.',
      active.map(m => m.id)
    ));
  }

  // ── Bleeding risk accumulation ───────────────────────────────────────────────
  if (bleedingRiskMeds.length >= 2) {
    results.push(makeAlert('amber', 'bleeding_risk_cumulative',
      'Multiple bleeding-risk medications',
      `Patient is prescribed ${bleedingRiskMeds.length} medications with bleeding risk: ${nameList(bleedingRiskMeds)}. Cumulative bleeding risk is significantly elevated.`,
      'BNF / Haematology Guidelines',
      'Assess overall bleeding risk. Ensure clear indication for each agent. Monitor for signs of bleeding.',
      bleedingRiskMeds.map(m => m.id)
    ));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT: runRuleEngine
//
// Execution order:
//   1. Filter discontinued medications
//   2. Build entry index (O(n×m) — happens exactly once)
//   3. Build diagnosis context closure
//   4. Per-medication rules (Beers, dose, specific drug rules)
//   5. Disease–drug interaction rules
//   6. Drug–drug interaction rules
//   7. Aggregate burden rules
//   8. Deduplicate + sort red → amber → green
// ─────────────────────────────────────────────────────────────────────────────
export function runRuleEngine(
  patient: Patient,
  encounter: Encounter,
  medications: Medication[]
): RuleResult[] {
  const active   = medications.filter(m => m.status !== 'discontinued');
  const clinical = encounter.clinical_data ?? {};
  const results: RuleResult[] = [];

  // Single dictionary scan — all rule checks below are O(1) per medication
  const entryIndex = buildEntryIndex(active);
  const getEntry   = (med: Medication): DrugEntry | null => entryIndex.get(med.id) ?? null;

  // Build diagnosis matcher from patient's diagnoses array
  const hasDx = buildDiagnosisContext(patient);

  // Section 1 + 2: Per-medication rules (Beers, doses, specific drugs, disease–drug)
  for (const med of active) {
    const entry = getEntry(med);
    if (!entry) continue;
    runMedicationRules(med, entry, patient, clinical, results);
    runDiseaseDrugRules(med, entry, patient, clinical, hasDx, results);
  }

  // Section 3: Drug–drug interaction rules
  runDDIRules(active, getEntry, results);

  // Section 4: Aggregate burden rules
  runAggregateRules(active, patient, clinical, getEntry, results);

  // Deduplicate by alert_type + sorted medication IDs, then sort by severity
  const seen: Set<string> = new Set();
  const severityRank: Record<AlertSeverity, number> = { red: 0, amber: 1, green: 2 };

  return results
    .filter(r => {
      const key = `${r.alert_type}:${[...r.medication_ids].sort().join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: getDataCompletenessIssues
//
// Reports what clinical data is present, missing, and what safety checks
// cannot be completed without it.
//
// BUG FIX vs original: uses active medications only (not all medications
// including discontinued) for the cannotAssess items.
// ─────────────────────────────────────────────────────────────────────────────
export function getDataCompletenessIssues(
  encounter: Encounter,
  medications: Medication[]
): { missing: string[]; present: string[]; cannotAssess: string[] } {
  const clinical = encounter.clinical_data ?? {};
  const present: string[]      = [];
  const missing: string[]      = [];
  const cannotAssess: string[] = [];

  // Discontinued medications do not need active safety checks
  const active     = medications.filter(m => m.status !== 'discontinued');
  const entryIndex = buildEntryIndex(active);
  const getEntry   = (med: Medication) => entryIndex.get(med.id) ?? null;
  const nameOf     = (med: Medication) => med.brand_name || med.generic_name || 'Unknown';

  // eGFR / Creatinine
  if (clinical.egfr !== null && clinical.egfr !== undefined) {
    present.push(`eGFR: ${clinical.egfr} mL/min`);
  } else if (clinical.creatinine !== null && clinical.creatinine !== undefined) {
    present.push(`Creatinine: ${clinical.creatinine} mg/dL`);
    const renalMeds = active.filter(m => getEntry(m)?.renal_risk);
    if (renalMeds.length > 0) {
      cannotAssess.push(`Precise renal safety of: ${renalMeds.map(nameOf).join(', ')} (eGFR not calculated)`);
    }
  } else {
    missing.push('eGFR / Creatinine');
    const renalMeds = active.filter(m => getEntry(m)?.renal_risk);
    if (renalMeds.length > 0) {
      cannotAssess.push(`Renal safety of: ${renalMeds.map(nameOf).join(', ')}`);
    }
  }

  // Weight
  if (clinical.weight !== null && clinical.weight !== undefined) {
    present.push(`Weight: ${clinical.weight} kg`);
  } else {
    missing.push('Patient weight');
    const weightMeds = active.filter(m =>
      getEntry(m)?.dose_thresholds?.some(t => t.max_weight_based_mg_per_kg !== undefined)
    );
    if (weightMeds.length > 0) {
      cannotAssess.push(`Weight-based dose check for: ${weightMeds.map(nameOf).join(', ')}`);
    }
  }

  // Hepatic impairment
  if (clinical.hepatic_impairment !== null && clinical.hepatic_impairment !== undefined) {
    present.push(`Hepatic function: ${clinical.hepatic_impairment === 'none' ? 'Normal' : clinical.hepatic_impairment}`);
  } else {
    missing.push('Hepatic function status');
    const hepaticMeds = active.filter(m => getEntry(m)?.hepatic_risk);
    if (hepaticMeds.length > 0) {
      cannotAssess.push(`Hepatic safety of: ${hepaticMeds.map(nameOf).join(', ')}`);
    }
  }

  // Cognitive impairment
  if (clinical.cognitive_impairment !== null && clinical.cognitive_impairment !== undefined) {
    present.push(`Cognitive impairment: ${clinical.cognitive_impairment ? 'Yes (documented)' : 'No'}`);
  } else {
    missing.push('Cognitive impairment status');
  }

  // Fall history
  if (clinical.fall_history !== null && clinical.fall_history !== undefined) {
    present.push(`Fall history: ${clinical.fall_history ? 'Yes (documented)' : 'No'}`);
  } else {
    missing.push('Fall history');
  }

  // Allergies
  if (clinical.allergies && clinical.allergies.length > 0) {
    present.push(`Allergies: ${clinical.allergies.join(', ')}`);
  } else {
    missing.push('Allergy status (not documented)');
    cannotAssess.push('Allergy-based contraindications');
  }

  if (active.length > 0) {
    present.push(`${active.length} active medication(s) entered`);
  }

  return { present, missing, cannotAssess };
}

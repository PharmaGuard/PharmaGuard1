import { supabase } from '../lib/supabase';
import type { DrugEntry } from '../types';

export async function lookupDrug(nameInput: string): Promise<{
  entry: DrugEntry | null;
  confidence: 'high' | 'low' | 'unrecognized';
}> {
  const name = nameInput.trim().toLowerCase();
  if (!name) return { entry: null, confidence: 'unrecognized' };

  // Tier 1: exact generic name
  const { data: exactGeneric } = await supabase
    .from('drugs')
    .select('*')
    .ilike('generic_name', name)
    .limit(1)
    .single();
  if (exactGeneric) return { entry: exactGeneric as DrugEntry, confidence: 'high' };

  // Tier 2: brand name array contains the input
  const { data: brandMatch } = await supabase
    .from('drugs')
    .select('*')
    .contains('brand_names', [name])  // Postgres array @> operator
    .limit(1)
    .single();
  if (brandMatch) return { entry: brandMatch as DrugEntry, confidence: 'high' };

  // Tier 3: partial/fuzzy match
  const { data: partial } = await supabase
    .from('drugs')
    .select('*')
    .ilike('generic_name', `%${name}%`)
    .limit(1)
    .single();
  if (partial) return { entry: partial as DrugEntry, confidence: 'low' };

  return { entry: null, confidence: 'unrecognized' };
}

export async function normalizeMedication(brandName: string, genericInput?: string) {
  const brandLookup  = await lookupDrug(brandName);
  const genericLookup = genericInput ? await lookupDrug(genericInput) 
                                     : { entry: null, confidence: 'unrecognized' as const };
  // ... same resolution logic as before, just awaited
}

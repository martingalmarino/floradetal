// Lightweight typed access to the local datasets, safe to bundle in client scripts (no Zod).
// Validation happens at build time in src/lib/data.ts and in tests/data.test.ts.
import plantsJson from '../data/plants.json';
import calendarJson from '../data/calendar.json';
import localitiesJson from '../data/localities.json';
import careRulesJson from '../data/care-rules.json';
import sourcesJson from '../data/sources.json';
import type { CalendarData, CareRule, Locality, Plant, Source } from './schemas';

export const plants = plantsJson as unknown as Plant[];
export const sources = sourcesJson as unknown as Source[];
export const calendar = calendarJson as unknown as CalendarData;
export const localities = localitiesJson as unknown as Locality[];
export const careRules = careRulesJson as unknown as CareRule[];

const plantIndex = new Map(plants.map((plant) => [plant.id, plant]));
const localityIndex = new Map(localities.map((locality) => [locality.id, locality]));

export function getPlant(id: string): Plant | undefined {
  return plantIndex.get(id);
}

export function getSourceById(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

export function getLocality(id: string | null | undefined): Locality | undefined {
  return id ? localityIndex.get(id) : undefined;
}

// Build-time, schema-validated access to every dataset. Importing this module fails the build
// when a record is malformed or a cross-reference is broken.
import { z } from 'astro/zod';
import plantsJson from '../data/plants.json';
import sourcesJson from '../data/sources.json';
import localitiesJson from '../data/localities.json';
import calendarJson from '../data/calendar.json';
import careRulesJson from '../data/care-rules.json';
import {
  calendarSchema,
  careRuleSchema,
  localitySchema,
  plantSchema,
  sourceSchema,
  type CalendarData,
  type CareRule,
  type Locality,
  type Plant,
  type Source,
} from './schemas';

export interface Dataset {
  plants: Plant[];
  sources: Source[];
  localities: Locality[];
  calendar: CalendarData;
  careRules: CareRule[];
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Returns a list of human-readable integrity problems; empty when the dataset is consistent. */
export function findIntegrityProblems(dataset: Dataset): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(dataset.sources.map((s) => s.id));
  const plantIds = new Set(dataset.plants.map((p) => p.id));
  const ruleIds = new Set(dataset.calendar.rules.map((r) => r.id));
  const coverageIds = new Set(dataset.calendar.coverages.map((c) => c.id));

  for (const dup of duplicates(dataset.plants.map((p) => p.slug))) problems.push(`Slug duplicado: ${dup}`);
  for (const dup of duplicates(dataset.plants.map((p) => p.id))) problems.push(`ID de planta duplicado: ${dup}`);
  for (const dup of duplicates(dataset.sources.map((s) => s.id))) problems.push(`Fuente duplicada: ${dup}`);
  for (const dup of duplicates([...ruleIds])) problems.push(`Regla de calendario duplicada: ${dup}`);

  for (const plant of dataset.plants) {
    if (plant.id !== plant.slug) problems.push(`${plant.id}: id y slug deben coincidir`);
    for (const id of [...plant.sourceIds, ...plant.careSourceIds]) {
      if (!sourceIds.has(id)) problems.push(`${plant.id}: fuente inexistente ${id}`);
    }
    for (const id of plant.calendarRuleIds) {
      if (!ruleIds.has(id)) problems.push(`${plant.id}: regla de calendario inexistente ${id}`);
    }
    if (plant.specificToxicityEvidence && !sourceIds.has(plant.specificToxicityEvidence.sourceId)) {
      problems.push(`${plant.id}: fuente de toxicidad inexistente`);
    }
  }

  for (const rule of dataset.calendar.rules) {
    if (!plantIds.has(rule.plantId)) problems.push(`Calendario: planta inexistente ${rule.plantId}`);
    if (!sourceIds.has(rule.sourceId)) problems.push(`Calendario: fuente inexistente ${rule.sourceId}`);
    if (!coverageIds.has(rule.coverageId)) problems.push(`Calendario: cobertura inexistente ${rule.coverageId}`);
    if (duplicates(rule.months.map(String)).length) problems.push(`Calendario: meses repetidos en ${rule.id}`);
    const plant = dataset.plants.find((p) => p.id === rule.plantId);
    if (plant && !plant.calendarRuleIds.includes(rule.id)) {
      problems.push(`${rule.plantId}: falta referenciar la regla ${rule.id}`);
    }
  }

  for (const note of dataset.calendar.generalNotes) {
    if (!plantIds.has(note.plantId)) problems.push(`Orientación general: planta inexistente ${note.plantId}`);
    for (const id of note.sourceIds) if (!sourceIds.has(id)) problems.push(`Orientación general: fuente ${id}`);
  }

  for (const override of dataset.calendar.localOverrides) {
    if (!plantIds.has(override.plantId)) problems.push(`Override local: planta inexistente ${override.plantId}`);
    if (!sourceIds.has(override.sourceId)) problems.push(`Override local: fuente inexistente ${override.sourceId}`);
  }

  for (const rule of dataset.careRules) {
    for (const id of rule.sourceIds) if (!sourceIds.has(id)) problems.push(`Cuidado ${rule.id}: fuente ${id}`);
    if (rule.sourceMode === 'fixed' && rule.sourceIds.length === 0) {
      problems.push(`Cuidado ${rule.id}: necesita fuentes fijas`);
    }
  }

  return problems;
}

export function parseDataset(raw: Record<keyof Dataset, unknown>): Dataset {
  const dataset: Dataset = {
    plants: z.array(plantSchema).parse(raw.plants),
    sources: z.array(sourceSchema).parse(raw.sources),
    localities: z.array(localitySchema).parse(raw.localities),
    calendar: calendarSchema.parse(raw.calendar),
    careRules: z.array(careRuleSchema).parse(raw.careRules),
  };
  const problems = findIntegrityProblems(dataset);
  if (problems.length > 0) {
    throw new Error(`Datos inconsistentes:\n- ${problems.join('\n- ')}`);
  }
  return dataset;
}

export const dataset = parseDataset({
  plants: plantsJson,
  sources: sourcesJson,
  localities: localitiesJson,
  calendar: calendarJson,
  careRules: careRulesJson,
});

export const { plants, sources, localities, calendar, careRules } = dataset;

const sourceIndex = new Map(sources.map((s) => [s.id, s]));
const plantIndex = new Map(plants.map((p) => [p.id, p]));

export function getSource(id: string): Source {
  const source = sourceIndex.get(id);
  if (!source) throw new Error(`Fuente inexistente: ${id}`);
  return source;
}

export function getPlantById(id: string): Plant {
  const plant = plantIndex.get(id);
  if (!plant) throw new Error(`Planta inexistente: ${id}`);
  return plant;
}

export const publicSources = sources.filter((s) => s.public);

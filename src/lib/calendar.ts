import { ACTION_LABEL, monthName, type CalendarGroup } from './labels';
import type { CalendarRule, CareRule, GeneralNote, Locality, Plant } from './schemas';

export const CALENDAR_TIME_ZONE = 'America/Argentina/Cordoba';
export const REFERENCE_COVERAGE_ID = 'temperate_reference';
export const REFERENCE_LABEL = 'Calendario orientativo para clima templado';
export const CONSULT_TEXT = 'Consultá la época de siembra para tu zona.';

export interface PlanningPeriod {
  year: number;
  month: number;
}

/** Month and year "now" in Argentina, computed when called (never frozen at build time). */
export function currentPlanningPeriod(now: Date = new Date(), timeZone = CALENDAR_TIME_ZONE): PlanningPeriod {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { year, month };
}

export function shiftPeriod(period: PlanningPeriod, deltaMonths: number): PlanningPeriod {
  const zeroBased = period.year * 12 + (period.month - 1) + deltaMonths;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export function isValidPeriod(value: unknown): value is PlanningPeriod {
  if (typeof value !== 'object' || value === null) return false;
  const { year, month } = value as Record<string, unknown>;
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    (year as number) >= 2000 &&
    (year as number) <= 2200 &&
    (month as number) >= 1 &&
    (month as number) <= 12
  );
}

export function periodKey(period: PlanningPeriod): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function formatPeriod(period: PlanningPeriod): string {
  return `${monthName(period.month)} de ${period.year}`;
}

/** Completion keys are scoped to a planning year and month so they never repeat in later years. */
export function completionKey(plantId: string, ruleId: string, period: PlanningPeriod): string {
  return `${plantId}|${ruleId}|${periodKey(period)}`;
}

export function groupForRule(rule: Pick<CalendarRule, 'actionType'>): Exclude<CalendarGroup, 'cuidados'> {
  switch (rule.actionType) {
    case 'iniciar_almacigo':
      return 'almacigos';
    case 'trasplantar':
      return 'trasplantes';
    case 'sembrar':
    case 'plantar_dientes':
      return 'siembra_directa';
  }
}

export interface RuleFilter {
  month: number;
  coverageId?: string;
  plantIds?: ReadonlySet<string> | null;
  group?: CalendarGroup | 'todas';
}

export function rulesForMonth(rules: readonly CalendarRule[], filter: RuleFilter): CalendarRule[] {
  const coverageId = filter.coverageId ?? REFERENCE_COVERAGE_ID;
  return rules.filter((rule) => {
    if (rule.coverageId !== coverageId) return false;
    if (!rule.months.includes(filter.month)) return false;
    if (filter.plantIds && !filter.plantIds.has(rule.plantId)) return false;
    if (filter.group && filter.group !== 'todas' && groupForRule(rule) !== filter.group) return false;
    return true;
  });
}

export type CalendarAccess =
  | { mode: 'reference_offered'; note: string | null }
  | { mode: 'consult_first'; note: null };

/**
 * Temperate-reference localities are offered the reference calendar (still labelled as a reference).
 * Every other locality sees plant guidance and sources first and may open the reference deliberately.
 */
export function calendarAccess(locality: Locality | undefined | null): CalendarAccess {
  if (locality && locality.coverage === 'reference_temperate') {
    return { mode: 'reference_offered', note: locality.note };
  }
  return { mode: 'consult_first', note: null };
}

/** Plain-language description of a rule that never turns a protected seedbed into outdoor sowing. */
export function describeRule(rule: CalendarRule): string {
  const action = ACTION_LABEL[rule.actionType].toLocaleLowerCase('es-AR');
  switch (rule.method) {
    case 'almacigo_protegido':
      return `${capitalizeFirst(action)} en almácigo protegido (no es siembra al aire libre)`;
    case 'exterior':
      return `${capitalizeFirst(action)} al exterior`;
    case 'directa':
      return `${capitalizeFirst(action)} directamente en el lugar definitivo`;
    case 'directa_o_almacigo':
      return `${capitalizeFirst(action)} en el lugar definitivo o en almácigo`;
  }
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1);
}

export type PlantingHint =
  | {
      kind: 'reference_window';
      rules: CalendarRule[];
      text: string;
      label: typeof REFERENCE_LABEL;
      localityNote: string | null;
    }
  | { kind: 'consult'; text: typeof CONSULT_TEXT; generalNote: GeneralNote | null };

const VERB_FOR_ACTION: Record<CalendarRule['actionType'], string> = {
  iniciar_almacigo: 'iniciar un almácigo protegido',
  sembrar: 'sembrar',
  plantar_dientes: 'plantar dientes',
  trasplantar: 'trasplantar al exterior',
};

export interface PlantingHintInput {
  plant: Plant;
  locality: Locality | undefined | null;
  month: number | null;
  isOutdoorSpace: boolean;
  rules: readonly CalendarRule[];
  generalNotes: readonly GeneralNote[];
}

/**
 * Suitability and planting date are separate questions. "Podés…" is only produced when the user's
 * locality is routed to the temperate reference, a rule covers the planning month and the method
 * fits the space. Everything else falls back to "Consultá la época de siembra para tu zona".
 */
export function plantingHint(input: PlantingHintInput): PlantingHint {
  const generalNote = input.generalNotes.find((n) => n.plantId === input.plant.id) ?? null;
  const consult: PlantingHint = { kind: 'consult', text: CONSULT_TEXT, generalNote };
  const access = calendarAccess(input.locality);
  if (access.mode !== 'reference_offered' || input.month === null) return consult;

  const month = input.month;
  const matching = input.rules.filter(
    (rule) =>
      rule.plantId === input.plant.id &&
      rule.coverageId === REFERENCE_COVERAGE_ID &&
      rule.months.includes(month) &&
      (rule.method === 'almacigo_protegido' || input.isOutdoorSpace),
  );
  if (matching.length === 0) return consult;

  const verbs = matching.map((rule) => VERB_FOR_ACTION[rule.actionType]);
  const text = `Según el calendario orientativo para clima templado, en ${monthName(month)} podés ${joinSpanish(verbs)}.`;
  return { kind: 'reference_window', rules: matching, text, label: REFERENCE_LABEL, localityNote: access.note };
}

function joinSpanish(items: string[]): string {
  return new Intl.ListFormat('es-AR', { style: 'long', type: 'conjunction' }).format(items);
}

export interface CareContext {
  inContainer: boolean;
}

export function careRulesForPlant(
  plant: Plant,
  careRules: readonly CareRule[],
  calendarRules: readonly CalendarRule[],
  context: CareContext = { inContainer: true },
): CareRule[] {
  const hasTransplantRule = calendarRules.some((r) => r.plantId === plant.id && r.actionType === 'trasplantar');
  return careRules.filter((rule) => {
    const { waterProfile, category, hasTransplantRule: needsTransplant, inContainer } = rule.appliesTo;
    if (waterProfile) return plant.waterProfile === waterProfile;
    if (category) return plant.category === category;
    if (needsTransplant) return hasTransplantRule;
    if (inContainer) return context.inContainer;
    return false;
  });
}

export function careSourceIds(rule: CareRule, plant: Plant | null): string[] {
  if (rule.sourceMode === 'fixed' || !plant) return rule.sourceIds;
  return [...new Set([...plant.careSourceIds, ...rule.sourceIds])];
}

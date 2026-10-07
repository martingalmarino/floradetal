// Deterministic plant recommendation engine. Scores are internal ranking heuristics chosen for the
// product, not agronomic probabilities, and are never shown to the user.
import { compareSpanish } from './text';
import type { Category, Plant } from './schemas';

export type SpaceType = 'interior' | 'balcon' | 'patio' | 'jardin';
export type GrowingMedium = 'maceta' | 'suelo';
export type SpaceSize = 'small' | 'medium' | 'large';
export type SunTiming = 'manana' | 'tarde' | 'mixto';
export type ShadeQuality = 'luminosa' | 'oscura';
export type IndoorLight = 'brillante' | 'media' | 'baja' | 'sin_luz';
export type Goal = 'follaje' | 'flores' | 'aromaticas' | 'huerta';
export type TimeCommitment = 'low' | 'medium';
export type FrostExposure = 'si' | 'no' | 'no_se';

export interface SelectorAnswers {
  localityId: string;
  space: SpaceType;
  medium: GrowingMedium;
  size: SpaceSize;
  sunHours: number | null;
  sunTiming: SunTiming | null;
  shade: ShadeQuality | null;
  indoorLight: IndoorLight | null;
  goals: Goal[];
  time: TimeCommitment;
  wind: boolean;
  frost: FrostExposure;
}

export type MatchTier = 'good' | 'conditional';

export interface Recommendation {
  plant: Plant;
  tier: MatchTier;
  /** Internal ranking value; not displayed. */
  score: number;
  reasons: [string, string];
  conditions: string[];
  notes: string[];
}

export type EmptyReason = 'no_natural_light' | 'outdoor_foliage' | 'no_matches';

export interface RecommendationResult {
  good: Recommendation[];
  conditional: Recommendation[];
  emptyReason: EmptyReason | null;
  /** Confidence is lowered when the user does not know whether the space gets frost. */
  lowConfidence: boolean;
}

export const MAX_GOOD = 6;
export const MAX_CONDITIONAL = 4;

const GOAL_FOR_CATEGORY: Record<Category, Goal> = {
  huerta: 'huerta',
  aromatica: 'aromaticas',
  flores: 'flores',
  interior: 'follaje',
};

const GOAL_REASON: Record<Goal, string> = {
  huerta: 'Es una hortaliza, como buscás para tu huerta.',
  aromaticas: 'Es una aromática para cocina, como pediste.',
  flores: 'Aporta flores, que es lo que buscás.',
  follaje: 'Es una planta de follaje para interior, como buscás.',
};

export function isOutdoor(space: SpaceType): boolean {
  return space !== 'interior';
}

type OutdoorLight = 'full' | 'partial' | 'bright_shade' | 'dark';

/** UI heuristics: 6+ hours = full sun, 3–5 = partial; under 3 depends on the declared shade. */
export function classifyOutdoorLight(sunHours: number, shade: ShadeQuality | null): OutdoorLight {
  if (sunHours >= 6) return 'full';
  if (sunHours >= 3) return 'partial';
  return shade === 'oscura' ? 'dark' : 'bright_shade';
}

interface Evaluation {
  excluded: boolean;
  score: number;
  reasons: string[];
  conditions: string[];
  notes: string[];
}

interface Facet {
  excluded?: boolean;
  score?: number;
  reason?: string;
  condition?: string;
  note?: string;
}

function hoursText(hours: number): string {
  if (hours === 0) return 'sin sol directo';
  if (hours === 1) return 'alrededor de 1 hora de sol directo';
  return `unas ${hours} horas de sol directo`;
}

function evaluateOutdoorLight(plant: Plant, answers: SelectorAnswers): Facet {
  const hours = answers.sunHours ?? 0;
  const light = classifyOutdoorLight(hours, answers.shade);
  const timing = answers.sunTiming;
  const afternoon = timing === 'tarde' || timing === 'mixto';

  switch (plant.lightProfile) {
    case 'full_sun':
      if (light === 'full') return { score: 4, reason: `Se adapta a la luz que indicás: ${hoursText(hours)}.` };
      if (light === 'partial')
        return {
          score: 1,
          reason: `Puede crecer con ${hoursText(hours)}, aunque prefiere sol pleno.`,
          condition: 'Prefiere 6 horas de sol o más: con menos luz puede crecer, florecer o producir menos.',
        };
      return { excluded: true };
    case 'sun_or_partial':
      if (light === 'full' || light === 'partial')
        return { score: light === 'full' ? 4 : 3, reason: `Se adapta a la luz que indicás: ${hoursText(hours)}.` };
      if (light === 'bright_shade')
        return {
          score: 1,
          reason: 'Tolera media sombra, y tu espacio es luminoso aunque reciba poco sol.',
          condition: 'Con menos de 3 horas de sol directo puede crecer más lento o florecer menos.',
        };
      return { excluded: true };
    case 'bright_shade':
      if (light === 'bright_shade')
        return { score: 4, reason: 'Prefiere sombra luminosa, como la que describiste.' };
      if (light === 'partial' && timing === 'manana')
        return { score: 4, reason: 'Recibe sol suave de la mañana, que es lo que prefiere.' };
      if (light === 'dark') return { excluded: true };
      return {
        score: light === 'partial' ? 2 : 1,
        reason: 'Puede ubicarse en tu espacio si le das reparo del sol fuerte.',
        condition: afternoon
          ? 'Necesita protección del sol fuerte de la tarde.'
          : 'Con muchas horas de sol directo necesita un lugar más reparado.',
      };
    default:
      // Indoor-only records are never recommended for an exposed outdoor setting.
      return { excluded: true };
  }
}

function evaluateIndoorLight(plant: Plant, answers: SelectorAnswers): Facet {
  const light = answers.indoorLight;
  if (!light || light === 'sin_luz') return { excluded: true };
  switch (plant.lightProfile) {
    case 'indoor_bright':
      if (light === 'brillante') return { score: 4, reason: 'Se adapta a la luz indirecta brillante que describiste.' };
      if (light === 'media')
        return {
          score: 1,
          reason: 'Puede vivir con luz indirecta media si la acercás a la ventana más luminosa.',
          condition: 'Prefiere luz indirecta brillante: con luz media crece más lento.',
        };
      return { excluded: true };
    case 'indoor_bright_medium':
      if (light === 'brillante') return { score: 4, reason: 'Se adapta a la luz indirecta brillante que describiste.' };
      if (light === 'media') return { score: 4, reason: 'Se adapta a la luz indirecta media que describiste.' };
      return { excluded: true };
    case 'indoor_tolerates_low':
      if (light === 'baja')
        return {
          score: 2,
          reason: 'Tolera poca luz natural, como la de tu ambiente.',
          note: 'Con poca luz suele crecer más lento.',
        };
      return {
        score: 4,
        reason: `Se adapta a la luz indirecta ${light === 'brillante' ? 'brillante' : 'media'} que describiste.`,
      };
    default:
      // Outdoor crops and flowers are not recommended for an interior in this release.
      return { excluded: true };
  }
}

function evaluateSpace(plant: Plant, answers: SelectorAnswers): Facet {
  const inContainer = answers.medium === 'maceta';
  switch (plant.spaceClass) {
    case 'small':
      return { score: 3, reason: 'Es de porte chico y entra bien en el espacio que tenés.' };
    case 'medium':
      if (answers.size === 'small') return { score: 1, reason: 'Ocupa un espacio moderado.' };
      return { score: 3, reason: 'Su tamaño es adecuado para el espacio que indicás.' };
    case 'large':
      // A large plant is never a good match for a small space without a documented compact cultivar.
      if (answers.size === 'small') return { excluded: true };
      if (answers.size === 'medium')
        return {
          score: 1,
          reason: 'Puede ubicarse si le reservás lugar para crecer.',
          note: inContainer ? 'Es una planta grande: en maceta necesita un recipiente amplio.' : 'Es una planta grande: reservale lugar.',
        };
      return {
        score: 3,
        reason: 'Tenés espacio amplio, que es lo que necesita para crecer.',
        note: inContainer ? 'En maceta necesita un recipiente amplio.' : undefined,
      };
    case 'varies':
      if (answers.size === 'small')
        return {
          score: 1,
          reason: 'Existen formas de distinto tamaño.',
          condition: 'Su tamaño cambia mucho según la variedad: elegí una compacta para tu espacio.',
        };
      return {
        score: answers.size === 'large' ? 3 : 2,
        reason: 'Tu espacio permite elegir entre distintas variedades.',
        note: 'El tamaño depende de la variedad que elijas.',
      };
  }
}

function evaluateMaintenance(plant: Plant, answers: SelectorAnswers): Facet {
  if (answers.time === 'low') {
    if (plant.maintenance === 'low') return { score: 2, reason: 'Pide pocos cuidados, acorde al tiempo que tenés.' };
    // Medium-care plants are alternatives for low-time users and must not outrank good low-care matches.
    return { score: 0, condition: 'Pide más dedicación que la que indicás: tenelo en cuenta antes de elegirla.' };
  }
  return {
    score: 2,
    reason:
      plant.maintenance === 'low'
        ? 'Pide pocos cuidados, así que te sobra tiempo para disfrutarla.'
        : 'Pide cuidados regulares, acordes al tiempo que tenés.',
  };
}

function evaluateFrost(plant: Plant, answers: SelectorAnswers): Facet {
  if (!isOutdoor(answers.space)) return {};
  if (plant.frostProfile === 'sensitive') {
    if (answers.frost === 'si')
      return {
        condition:
          'Es sensible a las heladas: en tu espacio, cultivala en la temporada sin heladas o dale un lugar protegido del frío.',
      };
    if (answers.frost === 'no_se')
      return {
        condition: 'No sabés si tu espacio tiene heladas: si las hay, va a necesitar protección o cultivo de temporada.',
      };
    return {};
  }
  if (plant.frostProfile === 'unspecified' && answers.frost !== 'no') {
    return {
      condition: 'No tenemos datos sobre su tolerancia a las heladas: consultá en un vivero de tu zona.',
    };
  }
  if (plant.frostProfile === 'some_tolerance' && answers.frost === 'si') {
    return { note: 'Tolera algo de frío, pero no es inmune a heladas fuertes.' };
  }
  return {};
}

function evaluateWind(plant: Plant, answers: SelectorAnswers): Facet {
  if (!isOutdoor(answers.space) || !answers.wind || !plant.tallOrTrained) return {};
  return { condition: 'Con viento fuerte, ubicala en un lugar reparado y preparale un soporte o tutor.' };
}

function goalMatch(plant: Plant, answers: SelectorAnswers): Goal | null {
  const goal = GOAL_FOR_CATEGORY[plant.category];
  return answers.goals.includes(goal) ? goal : null;
}

function environmentAllowed(plant: Plant, answers: SelectorAnswers): boolean {
  return plant.environments.includes(isOutdoor(answers.space) ? 'exterior' : 'interior');
}

export function evaluatePlant(plant: Plant, answers: SelectorAnswers): Recommendation | null {
  if (!environmentAllowed(plant, answers)) return null;
  const goal = goalMatch(plant, answers);
  if (!goal) return null;

  const parts: Facet[] = [
    isOutdoor(answers.space) ? evaluateOutdoorLight(plant, answers) : evaluateIndoorLight(plant, answers),
    evaluateSpace(plant, answers),
    { score: 3, reason: GOAL_REASON[goal] },
    evaluateMaintenance(plant, answers),
    evaluateFrost(plant, answers),
    evaluateWind(plant, answers),
  ];
  if (parts.some((p) => p.excluded)) return null;

  const evaluation: Evaluation = { excluded: false, score: 0, reasons: [], conditions: [], notes: [] };
  for (const part of parts) {
    evaluation.score += part.score ?? 0;
    if (part.reason) evaluation.reasons.push(part.reason);
    if (part.condition) evaluation.conditions.push(part.condition);
    if (part.note) evaluation.notes.push(part.note);
  }
  // Each unresolved condition lowers the ranking.
  evaluation.score -= evaluation.conditions.length * 2;

  const [first, ...rest] = evaluation.reasons;
  // Prefer light first, then a reason about care time or space that reflects the user's answers.
  const lightReason = first ?? GOAL_REASON[goal];
  const careReason = rest.find((r) => r.startsWith('Pide')) ?? rest[0] ?? GOAL_REASON[goal];

  return {
    plant,
    tier: evaluation.conditions.length === 0 ? 'good' : 'conditional',
    score: evaluation.score,
    reasons: [lightReason, careReason],
    conditions: evaluation.conditions,
    notes: evaluation.notes,
  };
}

function byRank(a: Recommendation, b: Recommendation): number {
  if (b.score !== a.score) return b.score - a.score;
  return compareSpanish(a.plant.commonName, b.plant.commonName);
}

export function recommend(plants: readonly Plant[], answers: SelectorAnswers): RecommendationResult {
  const lowConfidence = isOutdoor(answers.space) && answers.frost === 'no_se';

  if (!isOutdoor(answers.space) && answers.indoorLight === 'sin_luz') {
    return { good: [], conditional: [], emptyReason: 'no_natural_light', lowConfidence };
  }

  const evaluated = plants
    .map((plant) => evaluatePlant(plant, answers))
    .filter((r): r is Recommendation => r !== null);

  const good = evaluated.filter((r) => r.tier === 'good').sort(byRank).slice(0, MAX_GOOD);
  const conditional = evaluated.filter((r) => r.tier === 'conditional').sort(byRank).slice(0, MAX_CONDITIONAL);

  let emptyReason: EmptyReason | null = null;
  if (good.length === 0 && conditional.length === 0) {
    const onlyFoliageOutdoors =
      isOutdoor(answers.space) && answers.goals.length > 0 && answers.goals.every((g) => g === 'follaje');
    emptyReason = onlyFoliageOutdoors ? 'outdoor_foliage' : 'no_matches';
  }
  return { good, conditional, emptyReason, lowConfidence };
}

export function validateAnswers(answers: Partial<SelectorAnswers>): string[] {
  const missing: string[] = [];
  if (!answers.localityId) missing.push('localityId');
  if (!answers.space) missing.push('space');
  if (!answers.size) missing.push('size');
  if (answers.space && answers.space !== 'interior') {
    if (answers.sunHours === null || answers.sunHours === undefined) missing.push('sunHours');
    if (!answers.sunTiming && (answers.sunHours ?? 0) > 0) missing.push('sunTiming');
    if ((answers.sunHours ?? 0) < 3 && !answers.shade) missing.push('shade');
  }
  if (answers.space === 'interior' && !answers.indoorLight) missing.push('indoorLight');
  if (!answers.goals || answers.goals.length === 0) missing.push('goals');
  if (!answers.time) missing.push('time');
  if (answers.space && answers.space !== 'interior' && !answers.frost) missing.push('frost');
  return missing;
}

import type {
  ActionType,
  Category,
  FrostProfile,
  LightProfile,
  Maintenance,
  SowingMethod,
  SpaceClass,
  WaterProfile,
} from './schemas';

export const CATEGORY_LABEL: Record<Category, string> = {
  huerta: 'Huerta',
  aromatica: 'Aromáticas',
  flores: 'Flores',
  interior: 'Plantas de interior',
};

export const CATEGORY_SINGULAR: Record<Category, string> = {
  huerta: 'hortaliza',
  aromatica: 'aromática',
  flores: 'planta con flores',
  interior: 'planta de interior',
};

export const ENVIRONMENT_LABEL = {
  exterior: 'Balcón, patio o jardín',
  interior: 'Interior',
} as const;

export const LIGHT_LABEL: Record<LightProfile, string> = {
  full_sun: 'Sol pleno',
  sun_or_partial: 'Sol o media sombra',
  bright_shade: 'Sombra luminosa',
  indoor_bright: 'Luz indirecta brillante',
  indoor_bright_medium: 'Luz indirecta brillante o media',
  indoor_tolerates_low: 'Tolera poca luz natural',
};

export const LIGHT_DETAIL: Record<LightProfile, string> = {
  full_sun: 'Prefiere un lugar al aire libre con sol directo durante buena parte del día, idealmente unas 6 horas o más.',
  sun_or_partial: 'Se adapta a sol directo o a media sombra: como referencia, al menos unas 3 horas de sol directo.',
  bright_shade: 'Prefiere sombra luminosa o sol suave de la mañana; el sol fuerte de la tarde le puede resultar excesivo.',
  indoor_bright: 'En interior necesita luz natural indirecta abundante, cerca de una ventana luminosa y sin sol fuerte directo.',
  indoor_bright_medium: 'En interior se adapta a luz indirecta brillante o media; evitá el sol directo fuerte.',
  indoor_tolerates_low: 'En interior prefiere luz indirecta brillante o media y tolera poca luz natural, aunque crece más lento.',
};

export const WATER_LABEL: Record<WaterProfile, string> = {
  even_moisture: 'Humedad pareja',
  partial_dry: 'Secado parcial entre riegos',
  substantial_dry: 'Dejar secar bien',
};

export const WATER_DETAIL: Record<WaterProfile, string> = {
  even_moisture: 'Mantené el sustrato con humedad moderada y pareja, sin encharcar.',
  partial_dry: 'Dejá que el sustrato pierda parte de la humedad entre riegos y asegurá un buen drenaje.',
  substantial_dry: 'Dejá secar bastante el sustrato antes de volver a regar, sobre todo con frío o crecimiento lento.',
};

export const FROST_LABEL: Record<FrostProfile, string> = {
  sensitive: 'Sensible a heladas',
  some_tolerance: 'Algo de tolerancia al frío',
  unspecified: 'Tolerancia al frío sin datos',
};

export const FROST_DETAIL: Record<FrostProfile, string> = {
  sensitive: 'Es sensible a las heladas: protegela o cultivala en la temporada sin heladas.',
  some_tolerance: 'Tolera algo de frío, según variedad y etapa, pero no es inmune a heladas fuertes.',
  unspecified: 'No tenemos datos sobre su tolerancia a las heladas; consultá en un vivero de tu zona.',
};

export const MAINTENANCE_LABEL: Record<Maintenance, string> = {
  low: 'Cuidado bajo',
  medium: 'Cuidado medio',
};

export const SPACE_LABEL: Record<SpaceClass, string> = {
  small: 'Espacio chico',
  medium: 'Espacio mediano',
  large: 'Necesita mucho espacio',
  varies: 'Tamaño según variedad',
};

export const ACTION_LABEL: Record<ActionType, string> = {
  iniciar_almacigo: 'Iniciar almácigo',
  sembrar: 'Sembrar',
  plantar_dientes: 'Plantar dientes',
  trasplantar: 'Trasplantar',
};

export const METHOD_LABEL: Record<SowingMethod, string> = {
  almacigo_protegido: 'Almácigo protegido',
  exterior: 'Al exterior',
  directa: 'Siembra directa',
  directa_o_almacigo: 'Directa o en almácigo',
};

export type CalendarGroup = 'almacigos' | 'siembra_directa' | 'trasplantes' | 'cuidados';

export const CALENDAR_GROUP_LABEL: Record<CalendarGroup, string> = {
  almacigos: 'Almácigos',
  siembra_directa: 'Siembra directa',
  trasplantes: 'Trasplantes',
  cuidados: 'Revisiones de cuidado',
};

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export function monthName(month: number): string {
  const name = MONTH_NAMES[month - 1];
  if (!name) throw new RangeError(`Mes fuera de rango: ${month}`);
  return name;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1);
}

/** "septiembre y octubre", "febrero, marzo y abril". */
export function formatMonthList(months: number[]): string {
  const names = months.map(monthName);
  return new Intl.ListFormat('es-AR', { style: 'long', type: 'conjunction' }).format(names);
}

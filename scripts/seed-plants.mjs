// Regenerates src/data/plants.json from the starter matrix (scripts/seed/starter-matrix.txt).
// Usage: node scripts/seed-plants.mjs
// Optional numeric fields stay null: the matrix does not supply them and they must not be guessed.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrix = readFileSync(join(root, 'scripts/seed/starter-matrix.txt'), 'utf8');
const calendar = JSON.parse(readFileSync(join(root, 'src/data/calendar.json'), 'utf8'));

const CATEGORY = { H: 'huerta', A: 'aromatica', F: 'flores', I: 'interior' };
const ENVIRONMENT = { OUT: ['exterior'], IN: ['interior'] };
const LIGHT = {
  S: 'full_sun',
  SP: 'sun_or_partial',
  P: 'bright_shade',
  IB: 'indoor_bright',
  IBM: 'indoor_bright_medium',
  IBML: 'indoor_tolerates_low',
};
const WATER = { M: 'even_moisture', D: 'partial_dry', X: 'substantial_dry' };
const FROST = { S: 'sensitive', T: 'some_tolerance', U: 'unspecified' };
const CARE = { B: 'low', M: 'medium' };
const SPACE = { P: 'small', M: 'medium', G: 'large', V: 'varies' };

const ALIASES = {
  tomate: ['tomate cherry'],
  morron: ['pimiento', 'pimiento dulce', 'pimentón dulce'],
  rucula: ['rucula'],
  ciboulette: ['cebollino'],
  romero: ['Rosmarinus officinalis'],
  gaura: ['Gaura lindheimeri'],
  sansevieria: ['Sansevieria trifasciata', 'lengua de suegra'],
  potus: ['pothos'],
  rabanito: ['Raphanus sativus'],
  arveja: ['Pisum sativum', 'Lathyrus oleraceus'],
  malvon: ['malvon', 'geranio zonal'],
  menta: ['hierbabuena'],
  monstera: ['costilla de Adán'],
};

const IDENTITY_NOTES = {
  tomate: [
    'Si buscaste “tomate cherry”, llegaste a la ficha general del tomate: el cherry es un tipo de fruto chico y no significa que la planta sea enana o compacta.',
  ],
  malvon: [
    '“Geranio” es un nombre común que se usa para plantas distintas. Esta ficha corresponde al malvón zonal y no a todos los pelargonios.',
  ],
  morron: ['La ficha agrupa a los pimientos dulces; las variedades difieren en forma, color y tamaño.'],
  acelga: ['Representa al grupo hortícola de la acelga dentro de Beta vulgaris.'],
  remolacha: ['Representa al grupo hortícola de la remolacha dentro de Beta vulgaris.'],
  hortensia: ['Hay muchos cultivares de hortensia; tamaño, floración y poda cambian entre ellos.'],
  lavanda: ['Corresponde a la lavanda inglesa; otras lavandas tienen necesidades distintas.'],
  'salvia-azul': ['Es una salvia ornamental; no confundir con la salvia culinaria.'],
};

// Editorial flag derived from the practical notes: plants that are tall, climbing or need a tutor.
const TALL_OR_TRAINED = new Set(['tomate', 'arveja', 'chaucha', 'cosmos', 'zinnia', 'verbena-bonariensis']);

const lines = matrix.trim().split('\n').slice(1);
const plants = lines.map((line) => {
  const cells = line.split('|');
  if (cells.length !== 12) throw new Error(`Fila con ${cells.length} columnas: ${line}`);
  const [slug, commonName, scientificName, cat, env, light, water, frost, care, space, practicalNote, sources] = cells;
  const sourceIds = sources.split(',').map((s) => s.trim());
  const calendarRuleIds = calendar.rules.filter((r) => r.plantId === slug).map((r) => r.id);
  const lookup = (map, key, field) => {
    if (!(key in map)) throw new Error(`Valor desconocido "${key}" en ${field} (${slug})`);
    return map[key];
  };
  return {
    id: slug,
    slug,
    commonName,
    scientificName,
    aliases: ALIASES[slug] ?? [],
    identityNotes: IDENTITY_NOTES[slug] ?? [],
    category: lookup(CATEGORY, cat, 'category'),
    environments: lookup(ENVIRONMENT, env, 'environment'),
    lightProfile: lookup(LIGHT, light, 'light'),
    waterProfile: lookup(WATER, water, 'water'),
    frostProfile: lookup(FROST, frost, 'frost'),
    maintenance: lookup(CARE, care, 'care'),
    spaceClass: lookup(SPACE, space, 'space'),
    tallOrTrained: TALL_OR_TRAINED.has(slug),
    practicalNote,
    sourceIds,
    careSourceIds: sourceIds,
    calendarRuleIds,
    editorialStatus: 'starter_reference',
    editorialReviewedAt: null,
    compiledAt: '2026-10-06',
    nativeRangeStatus: 'not_evaluated',
    petSafetyStatus: 'not_evaluated',
    image: null,
    adultHeightCm: null,
    spreadCm: null,
    recommendedContainerLiters: null,
    plantingDepthCm: null,
    spacingCm: null,
    harvestDays: null,
    propagationNotes: null,
    localNativeRegions: [],
    specificToxicityEvidence: null,
    affiliateLink: null,
  };
});

writeFileSync(join(root, 'src/data/plants.json'), `${JSON.stringify(plants, null, 2)}\n`);
console.log(`plants.json: ${plants.length} registros`);

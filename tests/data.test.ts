import { describe, expect, it } from 'vitest';
import { calendar, dataset, findIntegrityProblems, localities, plants, sources } from '../src/lib/data';
import { matchesQuery, searchIndexText } from '../src/lib/text';

const NUMERIC_OPTIONAL = [
  'adultHeightCm',
  'spreadCm',
  'recommendedContainerLiters',
  'plantingDepthCm',
  'spacingCm',
  'harvestDays',
] as const;

describe('validación del dataset', () => {
  it('contiene exactamente 40 slugs únicos', () => {
    expect(plants).toHaveLength(40);
    expect(new Set(plants.map((p) => p.slug)).size).toBe(40);
  });

  it('no tiene problemas de integridad (fuentes, plantas y reglas referenciadas existen)', () => {
    expect(findIntegrityProblems(dataset)).toEqual([]);
  });

  it('todas las fuentes referenciadas existen', () => {
    const ids = new Set(sources.map((s) => s.id));
    for (const plant of plants) for (const id of plant.sourceIds) expect(ids.has(id), `${plant.id}→${id}`).toBe(true);
    for (const rule of calendar.rules) expect(ids.has(rule.sourceId)).toBe(true);
  });

  it('los meses del calendario son enteros 1–12 y las plantas existen', () => {
    const plantIds = new Set(plants.map((p) => p.id));
    for (const rule of calendar.rules) {
      expect(plantIds.has(rule.plantId)).toBe(true);
      for (const m of rule.months) {
        expect(Number.isInteger(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      }
    }
  });

  it('ningún campo numérico opcional se convierte en cero: quedan en null', () => {
    for (const plant of plants) {
      for (const field of NUMERIC_OPTIONAL) expect(plant[field], `${plant.id}.${field}`).toBeNull();
    }
  });

  it('estado editorial honesto: referencia inicial, sin revisión profesional declarada', () => {
    for (const plant of plants) {
      expect(plant.editorialStatus).toBe('starter_reference');
      expect(plant.editorialReviewedAt).toBeNull();
      expect(plant.compiledAt).toBe('2026-10-06');
      expect(plant.nativeRangeStatus).toBe('not_evaluated');
      expect(plant.petSafetyStatus).toBe('not_evaluated');
    }
  });

  it('las overrides locales están vacías hasta que exista contenido con fuente', () => {
    expect(calendar.localOverrides).toEqual([]);
  });

  it('la fuente de Astro no figura en la bibliografía pública', () => {
    expect(sources.find((s) => s.id === 'ASTRO_DOCS')?.public).toBe(false);
  });

  it('las localidades tienen cobertura editorial explícita', () => {
    expect(localities.find((l) => l.id === 'bariloche')?.coverage).toBe('general_only');
    expect(localities.find((l) => l.id === 'rosario')?.coverage).toBe('reference_temperate');
    expect(localities.find((l) => l.id === 'otra')?.coverage).toBe('general_only');
  });

  it('el dataset inválido falla la validación', async () => {
    const { parseDataset } = await import('../src/lib/data');
    expect(() =>
      parseDataset({
        plants: [{ ...plants[0], adultHeightCm: 0 }],
        sources,
        localities,
        calendar,
        careRules: [],
      }),
    ).toThrow();
  });
});

describe('búsqueda en español', () => {
  const index = new Map(plants.map((p) => [p.id, searchIndexText(p)]));
  const search = (q: string) => plants.filter((p) => matchesQuery(index.get(p.id)!, q)).map((p) => p.id);

  it('"rúcula" y "rucula" encuentran la rúcula', () => {
    expect(search('rúcula')).toContain('rucula');
    expect(search('rucula')).toContain('rucula');
    expect(search('RUCULA')).toContain('rucula');
  });

  it('busca por nombre científico y alias', () => {
    expect(search('Rosmarinus officinalis')).toEqual(['romero']);
    expect(search('pothos')).toEqual(['potus']);
    expect(search('cebollino')).toEqual(['ciboulette']);
    expect(search('tomate cherry')).toEqual(['tomate']);
    expect(search('geranio zonal')).toEqual(['malvon']);
    expect(search('pimenton')).toEqual(['morron']);
  });
});

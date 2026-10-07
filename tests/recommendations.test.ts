import { describe, expect, it } from 'vitest';
import { plants, calendar, localities } from '../src/lib/data';
import { recommend, type SelectorAnswers } from '../src/lib/recommendations';
import { plantingHint, calendarAccess } from '../src/lib/calendar';

const base: SelectorAnswers = {
  localityId: 'ciudad-autonoma-buenos-aires',
  space: 'balcon',
  medium: 'maceta',
  size: 'medium',
  sunHours: 6,
  sunTiming: 'mixto',
  shade: null,
  indoorLight: null,
  goals: ['huerta', 'aromaticas', 'flores'],
  time: 'medium',
  wind: false,
  frost: 'no',
};

const ids = (list: { plant: { id: string } }[]) => list.map((r) => r.plant.id);

describe('motor de recomendaciones', () => {
  it('interior sin luz natural no recomienda ninguna planta como apta', () => {
    const result = recommend(plants, {
      ...base,
      space: 'interior',
      sunHours: null,
      sunTiming: null,
      indoorLight: 'sin_luz',
      goals: ['follaje'],
    });
    expect(result.good).toHaveLength(0);
    expect(result.conditional).toHaveLength(0);
    expect(result.emptyReason).toBe('no_natural_light');
  });

  it('interior con luz indirecta brillante no recomienda tomate ni flores de sol', () => {
    const result = recommend(plants, {
      ...base,
      space: 'interior',
      sunHours: null,
      sunTiming: null,
      indoorLight: 'brillante',
      goals: ['follaje', 'flores', 'huerta'],
    });
    const all = [...ids(result.good), ...ids(result.conditional)];
    expect(all).not.toContain('tomate');
    expect(all).not.toContain('portulaca');
    expect(all).not.toContain('zinnia');
    expect(result.good.length).toBeGreaterThan(0);
    for (const r of [...result.good, ...result.conditional]) expect(r.plant.environments).toContain('interior');
  });

  it('exterior a pleno sol, espacio chico y poco tiempo: plantas bajas de sol, sin hortensia ni gomero como buenas', () => {
    const result = recommend(plants, {
      ...base,
      size: 'small',
      sunHours: 8,
      time: 'low',
      goals: ['huerta', 'aromaticas', 'flores', 'follaje'],
    });
    const good = ids(result.good);
    expect(good.length).toBeGreaterThan(0);
    expect(good).not.toContain('hortensia');
    expect(good).not.toContain('gomero');
    expect(ids(result.conditional)).not.toContain('gomero');
    for (const r of result.good) {
      expect(['small', 'medium']).toContain(r.plant.spaceClass);
      expect(r.plant.maintenance).toBe('low');
    }
  });

  it('las de cuidado medio no superan a las buenas de cuidado bajo para quien tiene poco tiempo', () => {
    const result = recommend(plants, { ...base, time: 'low', size: 'large', sunHours: 8 });
    for (const r of result.good) expect(r.plant.maintenance).toBe('low');
    const mediumCare = result.conditional.filter((r) => r.plant.maintenance === 'medium');
    for (const r of mediumCare) expect(r.conditions.join(' ')).toMatch(/más dedicación/);
  });

  it('con heladas en invierno, las anuales de estación cálida aparecen como opción condicionada, no prohibidas', () => {
    const result = recommend(plants, {
      ...base,
      size: 'large',
      sunHours: 8,
      frost: 'si',
      goals: ['huerta'],
    });
    const tomato = result.conditional.find((r) => r.plant.id === 'tomate');
    expect(tomato).toBeDefined();
    expect(tomato?.conditions.join(' ')).toMatch(/heladas/);
    expect(ids(result.good)).not.toContain('tomate');
  });

  it('heladas desconocidas bajan la confianza y muestran una condición concreta', () => {
    const result = recommend(plants, { ...base, size: 'large', sunHours: 8, frost: 'no_se', goals: ['huerta'] });
    expect(result.lowConfidence).toBe(true);
    const morron = result.conditional.find((r) => r.plant.id === 'morron');
    expect(morron?.conditions.join(' ')).toMatch(/No sabés si tu espacio tiene heladas/);
  });

  it('una planta de sol pleno nunca es buena en sombra profunda', () => {
    const result = recommend(plants, { ...base, sunHours: 0, sunTiming: null, shade: 'oscura' });
    const all = [...result.good, ...result.conditional];
    for (const r of all) expect(r.plant.lightProfile).not.toBe('full_sun');
  });

  it('viento fuerte agrega condición de reparo para plantas altas o con tutor', () => {
    const result = recommend(plants, { ...base, size: 'large', sunHours: 8, wind: true, goals: ['flores'] });
    const cosmos = [...result.good, ...result.conditional].find((r) => r.plant.id === 'cosmos');
    expect(cosmos?.tier).toBe('conditional');
    expect(cosmos?.conditions.join(' ')).toMatch(/viento/);
  });

  it('las plantas de interior nunca se recomiendan para exterior', () => {
    const result = recommend(plants, { ...base, goals: ['follaje'] });
    expect(result.good).toHaveLength(0);
    expect(result.conditional).toHaveLength(0);
    expect(result.emptyReason).toBe('outdoor_foliage');
  });

  it('cada resultado trae dos razones y no relleno: máximo 6 buenas y 4 condicionadas', () => {
    const result = recommend(plants, { ...base, size: 'large', sunHours: 8 });
    expect(result.good.length).toBeLessThanOrEqual(6);
    expect(result.conditional.length).toBeLessThanOrEqual(4);
    for (const r of [...result.good, ...result.conditional]) {
      expect(r.reasons).toHaveLength(2);
      expect(r.reasons[0]).not.toEqual(r.reasons[1]);
      for (const reason of r.reasons) expect(reason).not.toMatch(/Córdoba|Buenos Aires/);
    }
  });

  it('es determinístico y desempata por nombre en español', () => {
    const a = recommend(plants, base);
    const b = recommend(plants, base);
    expect(ids(a.good)).toEqual(ids(b.good));
    for (let i = 1; i < a.good.length; i++) {
      const prev = a.good[i - 1]!;
      const cur = a.good[i]!;
      if (prev.score === cur.score) {
        expect(prev.plant.commonName.localeCompare(cur.plant.commonName, 'es-AR')).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe('fecha de siembra separada de la aptitud', () => {
  const tomato = plants.find((p) => p.id === 'tomate')!;
  const cordoba = localities.find((l) => l.id === 'cordoba-capital')!;
  const bariloche = localities.find((l) => l.id === 'bariloche')!;

  it('balcón soleado en Córdoba en octubre: referencia templada con su aclaración, sin garantía local', () => {
    const result = recommend(plants, { ...base, localityId: 'cordoba-capital', size: 'large', sunHours: 8 });
    expect(result.good.length + result.conditional.length).toBeGreaterThan(0);
    const hint = plantingHint({
      plant: tomato,
      locality: cordoba,
      month: 10,
      isOutdoorSpace: true,
      rules: calendar.rules,
      generalNotes: calendar.generalNotes,
    });
    expect(hint.kind).toBe('reference_window');
    if (hint.kind !== 'reference_window') return;
    expect(hint.label).toBe('Calendario orientativo para clima templado');
    expect(hint.localityNote).toMatch(/La altura y las heladas pueden cambiar las fechas/);
    expect(hint.text).toMatch(/orientativo/);
    expect(hint.text).not.toMatch(/verificad|garantiz|pronóstico/i);
  });

  it('Bariloche no hereda en silencio las fechas de la referencia templada', () => {
    expect(calendarAccess(bariloche).mode).toBe('consult_first');
    const hint = plantingHint({
      plant: tomato,
      locality: bariloche,
      month: 10,
      isOutdoorSpace: true,
      rules: calendar.rules,
      generalNotes: calendar.generalNotes,
    });
    expect(hint.kind).toBe('consult');
    expect(hint.text).toBe('Consultá la época de siembra para tu zona.');
  });

  it('sin regla para el mes, se pide consultar la época', () => {
    const hint = plantingHint({
      plant: tomato,
      locality: cordoba,
      month: 6,
      isOutdoorSpace: true,
      rules: calendar.rules,
      generalNotes: calendar.generalNotes,
    });
    expect(hint.kind).toBe('consult');
  });
});

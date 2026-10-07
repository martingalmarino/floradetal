import { describe, expect, it } from 'vitest';
import { calendar, careRules, plants } from '../src/lib/data';
import {
  careRulesForPlant,
  completionKey,
  currentPlanningPeriod,
  describeRule,
  groupForRule,
  rulesForMonth,
  shiftPeriod,
} from '../src/lib/calendar';

describe('período de planificación', () => {
  it('usa la hora de Argentina: 1 de enero 01:00 UTC todavía es diciembre en Córdoba', () => {
    expect(currentPlanningPeriod(new Date('2027-01-01T01:00:00Z'))).toEqual({ year: 2026, month: 12 });
    expect(currentPlanningPeriod(new Date('2027-01-01T04:00:00Z'))).toEqual({ year: 2027, month: 1 });
  });

  it('pasa de diciembre a enero cambiando de año, y vuelve', () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftPeriod({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(shiftPeriod({ year: 2026, month: 10 }, 12)).toEqual({ year: 2027, month: 10 });
  });

  it('las tareas completadas en octubre no quedan marcadas el octubre siguiente', () => {
    const october2026 = completionKey('tomate', 'tomate-trasplantar', { year: 2026, month: 10 });
    const october2027 = completionKey('tomate', 'tomate-trasplantar', { year: 2027, month: 10 });
    expect(october2026).not.toEqual(october2027);
    expect(october2026).toBe('tomate|tomate-trasplantar|2026-10');
  });
});

describe('reglas del calendario de referencia', () => {
  it('chaucha aparece en enero (ventana que cruza el año)', () => {
    const january = rulesForMonth(calendar.rules, { month: 1 }).map((r) => r.id);
    expect(january).toContain('chaucha-sembrar');
  });

  it('un almácigo protegido nunca se agrupa ni se describe como siembra al aire libre', () => {
    for (const rule of calendar.rules.filter((r) => r.method === 'almacigo_protegido')) {
      expect(groupForRule(rule)).toBe('almacigos');
      expect(describeRule(rule)).toMatch(/almácigo protegido/);
      expect(describeRule(rule)).toMatch(/no es siembra al aire libre/);
    }
  });

  it('filtra por grupo y por "solo mis plantas"', () => {
    const october = rulesForMonth(calendar.rules, { month: 10, group: 'trasplantes' });
    expect(october.every((r) => r.actionType === 'trasplantar')).toBe(true);
    const mine = rulesForMonth(calendar.rules, { month: 10, plantIds: new Set(['tomate']) });
    expect(mine.every((r) => r.plantId === 'tomate')).toBe(true);
    expect(mine.length).toBe(2);
  });

  it('meses sin tareas devuelven lista vacía (la interfaz explica que no es una prohibición)', () => {
    expect(rulesForMonth(calendar.rules, { month: 1, group: 'almacigos' })).toEqual([]);
  });

  it('lechuga, zanahoria, remolacha y rúcula solo tienen orientación general, sin meses', () => {
    for (const id of ['lechuga', 'zanahoria', 'remolacha', 'rucula']) {
      expect(calendar.rules.some((r) => r.plantId === id)).toBe(false);
      expect(calendar.generalNotes.some((n) => n.plantId === id)).toBe(true);
    }
  });
});

describe('revisiones de cuidado condicionales', () => {
  it('asigna la revisión de riego según el perfil hídrico y la de plantines solo a quienes se trasplantan', () => {
    const tomato = plants.find((p) => p.id === 'tomate')!;
    const zamio = plants.find((p) => p.id === 'zamioculca')!;
    const tomatoRules = careRulesForPlant(tomato, careRules, calendar.rules).map((r) => r.id);
    const zamioRules = careRulesForPlant(zamio, careRules, calendar.rules).map((r) => r.id);
    expect(tomatoRules).toEqual(expect.arrayContaining(['agua-humedad-pareja', 'plantines-huerta', 'drenaje-maceta']));
    expect(zamioRules).toEqual(expect.arrayContaining(['agua-secado-amplio', 'follaje-interior']));
    expect(zamioRules).not.toContain('plantines-huerta');
  });
});

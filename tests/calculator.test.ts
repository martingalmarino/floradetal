import { describe, expect, it } from 'vitest';
import {
  calculate,
  cylinderLiters,
  formatLiters,
  parseDecimal,
  rectangleLiters,
  truncatedConeLiters,
} from '../src/lib/calculator';

describe('fórmulas de volumen', () => {
  it('cilindro de 30 cm × 25 cm ≈ 17,6714587 L', () => {
    expect(cylinderLiters(30, 25)).toBeCloseTo(17.6714587, 6);
  });

  it('jardinera rectangular 60 × 20 × 20 cm = 24 L', () => {
    expect(rectangleLiters(60, 20, 20)).toBe(24);
  });

  it('cono truncado 30/20 cm × 25 cm ≈ 12,4354709 L', () => {
    expect(truncatedConeLiters(30, 20, 25)).toBeCloseTo(12.4354709, 6);
  });
});

describe('calculate', () => {
  it('cilindro sin pan de raíces: muestra 17,7 L y una bolsa de 20 L', () => {
    const outcome = calculate({ shape: 'cylinder', diameter: '30', fillHeight: '25' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.requiredL).toBeCloseTo(17.6714587, 6);
    expect(formatLiters(outcome.result.requiredL)).toBe('17,7 L');
    expect(outcome.result.bags).toBe(1);
  });

  it('rectángulo 60 × 20 × 20: 24 L y dos bolsas', () => {
    const outcome = calculate({ shape: 'rectangle', length: '60', width: '20', fillHeight: '20' });
    expect(outcome.ok && outcome.result.requiredL).toBe(24);
    expect(outcome.ok && outcome.result.bags).toBe(2);
    expect(outcome.ok && formatLiters(outcome.result.requiredL)).toBe('24 L');
  });

  it('cono truncado usa el diámetro en la línea de llenado', () => {
    const outcome = calculate({ shape: 'cone', upperDiameter: '30', bottomDiameter: '20', fillHeight: '25' });
    expect(outcome.ok && outcome.result.grossPerPotL).toBeCloseTo(12.4354709, 6);
  });

  it('dos macetas cilíndricas con 5 L ocupados y 10 % de margen', () => {
    const base = calculate({ shape: 'cylinder', diameter: '30', fillHeight: '25', occupied: '5', quantity: '2' });
    expect(base.ok && base.result.requiredL).toBeCloseTo(25.3429174, 6);
    const withAllowance = calculate({
      shape: 'cylinder',
      diameter: '30',
      fillHeight: '25',
      occupied: '5',
      quantity: '2',
      allowance: '10',
    });
    expect(withAllowance.ok).toBe(true);
    if (!withAllowance.ok) return;
    expect(withAllowance.result.purchaseL).toBeCloseTo(27.8772091, 6);
    expect(withAllowance.result.bags).toBe(2);
  });

  it('acepta coma decimal: "12,5" es 12.5 y nunca 125', () => {
    const outcome = calculate({ shape: 'rectangle', length: '12,5', width: '10', fillHeight: '8' });
    expect(outcome.ok && outcome.result.requiredL).toBeCloseTo(1, 10);
  });

  it('identifica campos vacíos, cero, negativos e inválidos', () => {
    const outcome = calculate({ shape: 'rectangle', length: '', width: '0', fillHeight: '-3' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.length).toMatch(/Largo interno/);
    expect(outcome.errors.width).toMatch(/mayor que cero/);
    expect(outcome.errors.fillHeight).toMatch(/mayor que cero/);

    const invalid = calculate({ shape: 'cylinder', diameter: 'abc', fillHeight: 'Infinity' });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.errors.diameter).toBeDefined();
    expect(invalid.errors.fillHeight).toBeDefined();
  });

  it('cantidad debe ser entero positivo y bolsa mayor que cero', () => {
    const outcome = calculate({ shape: 'cylinder', diameter: '30', fillHeight: '25', quantity: '1,5', bagSize: '0' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.quantity).toBeDefined();
    expect(outcome.errors.bagSize).toBeDefined();
  });

  it('pan de raíces mayor que la capacidad es un error, no un cero silencioso', () => {
    const outcome = calculate({ shape: 'cylinder', diameter: '30', fillHeight: '25', occupied: '30' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.occupied).toMatch(/mayor que la capacidad/);
  });

  it('cono con diámetro superior menor que la base es inconsistente', () => {
    const outcome = calculate({ shape: 'cone', upperDiameter: '18', bottomDiameter: '20', fillHeight: '25' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.upperDiameter).toMatch(/igual o mayor/);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['1,5', 1.5],
    ['1.5', 1.5],
    [' 30 ', 30],
    [',5', 0.5],
  ])('"%s" → %d', (raw, expected) => {
    expect(parseDecimal(raw)).toEqual({ ok: true, value: expected });
  });

  it.each(['1.000,5', '1,2,3', '1e3', 'NaN', '12cm'])('rechaza "%s"', (raw) => {
    expect(parseDecimal(raw).ok).toBe(false);
  });

  it('vacío es "empty"', () => {
    expect(parseDecimal('   ')).toEqual({ ok: false, error: 'empty' });
  });
});

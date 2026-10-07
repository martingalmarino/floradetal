// Geometric usable-volume estimates for containers. All dimensions are internal, in centimetres.
// These functions do not prescribe substrate recipes, watering amounts or load capacity.

export type Shape = 'cylinder' | 'rectangle' | 'cone';

export type ParseResult = { ok: true; value: number } | { ok: false; error: 'empty' | 'invalid' };

/**
 * Accepts "1,5" and "1.5" as one and a half. Rejects thousands separators and mixed
 * separators instead of guessing, so "1,5" can never become 15.
 */
export function parseDecimal(raw: string | null | undefined): ParseResult {
  const text = (raw ?? '').trim().replace(/\s+/g, '');
  if (text === '') return { ok: false, error: 'empty' };
  if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/.test(text)) return { ok: false, error: 'invalid' };
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, error: 'invalid' };
  return { ok: true, value };
}

export function cylinderLiters(diameterCm: number, fillHeightCm: number): number {
  return (Math.PI * (diameterCm / 2) ** 2 * fillHeightCm) / 1000;
}

export function rectangleLiters(lengthCm: number, widthCm: number, fillHeightCm: number): number {
  return (lengthCm * widthCm * fillHeightCm) / 1000;
}

/** Truncated cone: the upper diameter must be measured at the fill line, not at the rim. */
export function truncatedConeLiters(upperDiameterAtFillCm: number, bottomDiameterCm: number, fillHeightCm: number): number {
  const R = upperDiameterAtFillCm / 2;
  const r = bottomDiameterCm / 2;
  return (Math.PI * fillHeightCm * (R * R + R * r + r * r)) / (3 * 1000);
}

export type FieldName =
  | 'diameter'
  | 'length'
  | 'width'
  | 'upperDiameter'
  | 'bottomDiameter'
  | 'fillHeight'
  | 'occupied'
  | 'quantity'
  | 'allowance'
  | 'bagSize';

export type RawInputs = { shape: Shape } & Partial<Record<FieldName, string>>;

export interface CalculationResult {
  shape: Shape;
  grossPerPotL: number;
  netPerPotL: number;
  requiredL: number;
  purchaseL: number;
  bags: number;
  quantity: number;
  allowancePercent: number;
  bagSizeL: number;
}

export type CalculationOutcome =
  | { ok: true; result: CalculationResult }
  | { ok: false; errors: Partial<Record<FieldName, string>> };

const FIELD_LABEL: Record<FieldName, string> = {
  diameter: 'Diámetro interno',
  length: 'Largo interno',
  width: 'Ancho interno',
  upperDiameter: 'Diámetro en la línea de llenado',
  bottomDiameter: 'Diámetro de la base',
  fillHeight: 'Altura de llenado',
  occupied: 'Volumen ocupado por el pan de raíces',
  quantity: 'Cantidad de macetas',
  allowance: 'Margen de compra',
  bagSize: 'Tamaño de la bolsa',
};

export function fieldsForShape(shape: Shape): FieldName[] {
  switch (shape) {
    case 'cylinder':
      return ['diameter', 'fillHeight'];
    case 'rectangle':
      return ['length', 'width', 'fillHeight'];
    case 'cone':
      return ['upperDiameter', 'bottomDiameter', 'fillHeight'];
  }
}

export function calculate(inputs: RawInputs): CalculationOutcome {
  const errors: Partial<Record<FieldName, string>> = {};
  const values: Partial<Record<FieldName, number>> = {};

  const readPositive = (field: FieldName) => {
    const parsed = parseDecimal(inputs[field]);
    if (!parsed.ok) {
      errors[field] =
        parsed.error === 'empty'
          ? `${FIELD_LABEL[field]}: completá este dato.`
          : `${FIELD_LABEL[field]}: escribí un número, por ejemplo 25 o 12,5.`;
      return;
    }
    if (parsed.value <= 0) {
      errors[field] = `${FIELD_LABEL[field]}: tiene que ser mayor que cero.`;
      return;
    }
    values[field] = parsed.value;
  };

  const readOptional = (field: FieldName, fallback: number, opts: { min: number; allowZero: boolean }) => {
    const raw = inputs[field];
    if (raw === undefined || raw.trim() === '') {
      values[field] = fallback;
      return;
    }
    const parsed = parseDecimal(raw);
    if (!parsed.ok) {
      errors[field] = `${FIELD_LABEL[field]}: escribí un número, por ejemplo 5 o 2,5.`;
      return;
    }
    if (parsed.value < opts.min || (!opts.allowZero && parsed.value === 0)) {
      errors[field] = opts.allowZero
        ? `${FIELD_LABEL[field]}: no puede ser negativo.`
        : `${FIELD_LABEL[field]}: tiene que ser mayor que cero.`;
      return;
    }
    values[field] = parsed.value;
  };

  for (const field of fieldsForShape(inputs.shape)) readPositive(field);
  readOptional('occupied', 0, { min: 0, allowZero: true });
  readOptional('allowance', 0, { min: 0, allowZero: true });
  readOptional('bagSize', 20, { min: 0, allowZero: false });

  const quantityRaw = inputs.quantity?.trim() ?? '';
  if (quantityRaw === '') {
    values.quantity = 1;
  } else if (!/^\d+$/.test(quantityRaw) || Number(quantityRaw) < 1) {
    errors.quantity = `${FIELD_LABEL.quantity}: usá un número entero, 1 o más.`;
  } else {
    values.quantity = Number(quantityRaw);
  }

  if (values.allowance !== undefined && values.allowance > 100) {
    errors.allowance = `${FIELD_LABEL.allowance}: usá un porcentaje entre 0 y 100.`;
  }

  if (
    inputs.shape === 'cone' &&
    values.upperDiameter !== undefined &&
    values.bottomDiameter !== undefined &&
    values.upperDiameter < values.bottomDiameter
  ) {
    errors.upperDiameter = `${FIELD_LABEL.upperDiameter}: tiene que ser igual o mayor que el de la base.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const v = values as Record<FieldName, number>;
  let gross: number;
  switch (inputs.shape) {
    case 'cylinder':
      gross = cylinderLiters(v.diameter, v.fillHeight);
      break;
    case 'rectangle':
      gross = rectangleLiters(v.length, v.width, v.fillHeight);
      break;
    case 'cone':
      gross = truncatedConeLiters(v.upperDiameter, v.bottomDiameter, v.fillHeight);
      break;
  }

  if (v.occupied > gross) {
    return {
      ok: false,
      errors: {
        occupied: `${FIELD_LABEL.occupied}: es mayor que la capacidad calculada (${formatLiters(gross)}). Revisá las medidas.`,
      },
    };
  }

  const netPerPot = Math.max(0, gross - v.occupied);
  const required = netPerPot * v.quantity;
  const purchase = required * (1 + v.allowance / 100);
  const bags = Math.ceil(purchase / v.bagSize);

  return {
    ok: true,
    result: {
      shape: inputs.shape,
      grossPerPotL: gross,
      netPerPotL: netPerPot,
      requiredL: required,
      purchaseL: purchase,
      bags,
      quantity: v.quantity,
      allowancePercent: v.allowance,
      bagSizeL: v.bagSize,
    },
  };
}

const litersFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** Rounds only for display, using Argentine decimal formatting: 17,7 L. */
export function formatLiters(value: number): string {
  return `${litersFormat.format(value)} L`;
}

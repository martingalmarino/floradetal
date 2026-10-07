import { track } from '../lib/analytics';
import { calculate, formatLiters, type FieldName, type RawInputs, type Shape } from '../lib/calculator';
import { el } from './ui';

const form = document.querySelector<HTMLFormElement>('[data-calc]')!;
const results = document.querySelector<HTMLElement>('[data-results]')!;
const summary = document.querySelector<HTMLElement>('[data-error-summary]')!;
const FIELD_NAMES: FieldName[] = [
  'diameter',
  'length',
  'width',
  'upperDiameter',
  'bottomDiameter',
  'fillHeight',
  'occupied',
  'quantity',
  'allowance',
  'bagSize',
];

const SHAPE_TEXT: Record<Shape, string> = {
  cylinder: 'maceta redonda recta',
  rectangle: 'jardinera o cantero rectangular',
  cone: 'maceta redonda que se angosta',
};

function shape(): Shape {
  return (form.querySelector<HTMLInputElement>('input[name="shape"]:checked')?.value as Shape) ?? 'cylinder';
}

function input(name: FieldName): HTMLInputElement {
  return form.elements.namedItem(name) as HTMLInputElement;
}

function updateShape(): void {
  const current = shape();
  for (const field of form.querySelectorAll<HTMLElement>('[data-shapes]')) {
    field.hidden = !(field.dataset.shapes ?? '').split(' ').includes(current);
  }
  for (const diagram of document.querySelectorAll<HTMLElement>('[data-diagram]')) {
    diagram.hidden = diagram.dataset.diagram !== current;
  }
}

function clearErrors(): void {
  summary.hidden = true;
  summary.textContent = '';
  for (const name of FIELD_NAMES) {
    input(name).removeAttribute('aria-invalid');
    const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
  }
}

function row(label: string, value: string, detail: string): HTMLElement {
  return el('div', { className: 'calc-result' }, [
    el('dt', { text: label }),
    el('dd', {}, [el('strong', { className: 'calc-result__value', text: value }), el('span', { className: 'small muted', text: detail })]),
  ]);
}

function submit(): void {
  clearErrors();
  const current = shape();
  const raw: RawInputs = { shape: current };
  for (const name of FIELD_NAMES) raw[name] = input(name).value;
  const outcome = calculate(raw);

  if (!outcome.ok) {
    const entries = Object.entries(outcome.errors) as [FieldName, string][];
    for (const [name, message] of entries) {
      input(name).setAttribute('aria-invalid', 'true');
      const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }
    }
    summary.textContent =
      entries.length === 1 ? 'Revisá el dato marcado.' : `Revisá los ${entries.length} datos marcados.`;
    summary.hidden = false;
    results.replaceChildren(el('p', { className: 'muted small', text: 'Corregí los datos para ver el resultado.' }));
    const first = entries[0];
    if (first) input(first[0]).focus();
    return;
  }

  const r = outcome.result;
  const pots = r.quantity === 1 ? '1 recipiente' : `${r.quantity} recipientes`;
  const bagText = r.bags === 1 ? '1 bolsa' : `${r.bags} bolsas`;
  results.replaceChildren(
    el('dl', { className: 'calc-results' }, [
      row('Volumen aproximado', formatLiters(r.grossPerPotL), `Por ${SHAPE_TEXT[r.shape]}, hasta la línea de llenado.`),
      row(
        'Sustrato nuevo estimado',
        formatLiters(r.requiredL),
        `${r.netPerPotL < r.grossPerPotL ? `Descontando ${formatLiters(r.grossPerPotL - r.netPerPotL)} de pan de raíces por recipiente. ` : ''}Total para ${pots}.`,
      ),
      row(
        'Compra orientativa',
        `${bagText} de ${formatLiters(r.bagSizeL)}`,
        r.allowancePercent > 0
          ? `${formatLiters(r.purchaseL)} con ${r.allowancePercent.toLocaleString('es-AR')} % de margen.`
          : 'Sin margen adicional.',
      ),
    ]),
    el('p', {
      className: 'small muted',
      text: 'Es una estimación: el pan de raíces, las formas irregulares y el asentamiento cambian lo que vas a usar.',
    }),
  );
  track('calculator_complete', { shape: r.shape });
}

form.addEventListener('change', (event) => {
  if ((event.target as HTMLInputElement).name === 'shape') {
    updateShape();
    clearErrors();
  }
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit();
});
document.querySelector('[data-allowance-10]')?.addEventListener('click', () => {
  input('allowance').value = '10';
  input('allowance').focus();
});

updateShape();

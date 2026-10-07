import { track } from '../lib/analytics';
import { calendar, getLocality, plants } from '../lib/catalog';
import { currentPlanningPeriod, plantingHint, REFERENCE_LABEL } from '../lib/calendar';
import { categoryIllustration } from '../lib/illustrations';
import { CATEGORY_LABEL, LIGHT_LABEL, MAINTENANCE_LABEL, METHOD_LABEL, monthName } from '../lib/labels';
import {
  isOutdoor,
  recommend,
  type Goal,
  type Recommendation,
  type RecommendationResult,
  type SelectorAnswers,
} from '../lib/recommendations';
import { plantPath } from '../lib/site';
import { getBrowserStore, STORAGE_KEYS } from '../lib/storage';
import { notifyGardenChanged } from './garden-state';
import { el, icon, illustrationNode } from './ui';

type Answers = Partial<SelectorAnswers>;
type FieldError = { field: string; message: string };

const STEP_NAMES = ['Ubicación', 'Espacio', 'Luz', 'Objetivo', 'Cuidado'];
const UNKNOWN_COVERAGE =
  'Todavía no tenemos fechas de siembra específicas para esta zona. Podés explorar plantas según las condiciones de tu espacio.';
const CALENDAR_EXPLANATION =
  'Las fechas cambian según la localidad, las heladas, la variedad y el lugar de cultivo. Tomalas como referencia y contrastalas con un vivero o una agencia de INTA de tu zona.';

const form = document.querySelector<HTMLFormElement>('[data-selector]')!;
const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
const progressItems = [...form.querySelectorAll<HTMLElement>('[data-progress-step]')];
const progressText = form.querySelector<HTMLElement>('[data-progress-text]')!;
const backButton = form.querySelector<HTMLButtonElement>('[data-back]')!;
const nextButton = form.querySelector<HTMLButtonElement>('[data-next]')!;
const submitButton = form.querySelector<HTMLButtonElement>('[data-submit]')!;
const resultsSection = document.querySelector<HTMLElement>('[data-results]')!;
const resume = document.querySelector<HTMLElement>('[data-resume]')!;
const store = getBrowserStore();

let current = 0;
let started = false;

// ---------- Form <-> answers ----------

const VALUES = {
  space: ['interior', 'balcon', 'patio', 'jardin'],
  medium: ['maceta', 'suelo'],
  size: ['small', 'medium', 'large'],
  sunTiming: ['manana', 'tarde', 'mixto'],
  shade: ['luminosa', 'oscura'],
  indoorLight: ['brillante', 'media', 'baja', 'sin_luz'],
  goals: ['follaje', 'flores', 'aromaticas', 'huerta'],
  time: ['low', 'medium'],
  frost: ['si', 'no', 'no_se'],
} as const;

function radioValue(name: string): string | null {
  return form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null;
}

function setRadio(name: string, value: string | null | undefined): void {
  for (const input of form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) {
    input.checked = value !== null && value !== undefined && input.value === value;
  }
}

function pick<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function sunHoursInput(): HTMLInputElement {
  return form.elements.namedItem('sunHours') as HTMLInputElement;
}

function localitySelect(): HTMLSelectElement {
  return form.elements.namedItem('localityId') as HTMLSelectElement;
}

function readForm(): Answers {
  const space = pick(VALUES.space, radioValue('space'));
  const outdoor = space ? isOutdoor(space) : true;
  const hours = Number(sunHoursInput().value);
  const needsMedium = space === 'patio' || space === 'jardin';
  const windValue = radioValue('wind');
  return {
    localityId: localitySelect().value || undefined,
    space,
    medium: needsMedium ? pick(VALUES.medium, radioValue('medium')) : space ? 'maceta' : undefined,
    size: pick(VALUES.size, radioValue('size')),
    sunHours: outdoor ? hours : null,
    sunTiming: outdoor && hours > 0 ? (pick(VALUES.sunTiming, radioValue('sunTiming')) ?? null) : null,
    shade: outdoor && hours < 3 ? (pick(VALUES.shade, radioValue('shade')) ?? null) : null,
    indoorLight: outdoor ? null : (pick(VALUES.indoorLight, radioValue('indoorLight')) ?? null),
    goals: [...form.querySelectorAll<HTMLInputElement>('input[name="goals"]:checked')]
      .map((i) => pick(VALUES.goals, i.value))
      .filter((g): g is Goal => g !== undefined),
    time: pick(VALUES.time, radioValue('time')),
    wind: outdoor ? (windValue === 'si' ? true : windValue === 'no' ? false : undefined) : false,
    frost: outdoor ? pick(VALUES.frost, radioValue('frost')) : 'no',
  };
}

function sanitizeStored(raw: unknown): Answers {
  if (typeof raw !== 'object' || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const hours = typeof r.sunHours === 'number' && Number.isInteger(r.sunHours) && r.sunHours >= 0 && r.sunHours <= 12 ? r.sunHours : null;
  return {
    localityId: typeof r.localityId === 'string' && getLocality(r.localityId) ? r.localityId : undefined,
    space: pick(VALUES.space, r.space),
    medium: pick(VALUES.medium, r.medium),
    size: pick(VALUES.size, r.size),
    sunHours: hours,
    sunTiming: pick(VALUES.sunTiming, r.sunTiming) ?? null,
    shade: pick(VALUES.shade, r.shade) ?? null,
    indoorLight: pick(VALUES.indoorLight, r.indoorLight) ?? null,
    goals: Array.isArray(r.goals) ? r.goals.map((g) => pick(VALUES.goals, g)).filter((g): g is Goal => g !== undefined) : [],
    time: pick(VALUES.time, r.time),
    wind: typeof r.wind === 'boolean' ? r.wind : undefined,
    frost: pick(VALUES.frost, r.frost),
  };
}

function writeForm(answers: Answers): void {
  localitySelect().value = answers.localityId ?? '';
  setRadio('space', answers.space);
  setRadio('medium', answers.medium);
  setRadio('size', answers.size);
  if (typeof answers.sunHours === 'number') sunHoursInput().value = String(answers.sunHours);
  setRadio('sunTiming', answers.sunTiming);
  setRadio('shade', answers.shade);
  setRadio('indoorLight', answers.indoorLight);
  for (const input of form.querySelectorAll<HTMLInputElement>('input[name="goals"]')) {
    input.checked = answers.goals?.includes(input.value as Goal) ?? false;
  }
  setRadio('time', answers.time);
  setRadio('wind', answers.wind === undefined ? null : answers.wind ? 'si' : 'no');
  setRadio('frost', answers.frost);
}

function saveProfile(): void {
  store.write(STORAGE_KEYS.profile, readForm());
}

// ---------- Conditional fields ----------

function hoursLabel(hours: number): string {
  return hours === 1 ? '1 hora' : `${hours} horas`;
}

function updateConditional(): void {
  const answers = readForm();
  const outdoor = answers.space ? isOutdoor(answers.space) : true;
  const hours = Number(sunHoursInput().value);

  form.querySelector<HTMLElement>('[data-medium-field]')!.hidden = !(answers.space === 'patio' || answers.space === 'jardin');
  form.querySelector<HTMLElement>('[data-outdoor-light]')!.hidden = !outdoor;
  form.querySelector<HTMLElement>('[data-indoor-light]')!.hidden = outdoor;
  form.querySelector<HTMLElement>('[data-sun-timing]')!.hidden = !outdoor || hours === 0;
  form.querySelector<HTMLElement>('[data-shade]')!.hidden = !outdoor || hours >= 3;
  for (const field of form.querySelectorAll<HTMLElement>('[data-outdoor-only]')) field.hidden = !outdoor;

  const output = form.querySelector<HTMLOutputElement>('[data-sun-output]')!;
  output.textContent = hoursLabel(hours);
  sunHoursInput().setAttribute('aria-valuetext', `${hoursLabel(hours)} de sol directo`);

  const goalsHint = form.querySelector<HTMLElement>('[data-goals-hint]')!;
  goalsHint.textContent = outdoor
    ? 'Las plantas de follaje de esta guía son de interior: para exterior, elegí flores, aromáticas o huerta.'
    : 'Para interior, esta guía incluye plantas de follaje.';

  const info = form.querySelector<HTMLElement>('[data-coverage-info]')!;
  const locality = getLocality(answers.localityId);
  info.replaceChildren();
  if (!locality) {
    info.hidden = true;
  } else {
    info.hidden = false;
    info.append(icon('calendar', 20));
    const body = el('div');
    if (locality.coverage === 'reference_temperate') {
      body.append(
        el('p', {}, [el('strong', { text: `Para esta zona podemos ofrecerte el ${REFERENCE_LABEL.toLocaleLowerCase('es-AR')}.` })]),
        el('p', { text: 'Es una referencia, no un calendario verificado para tu ciudad.' }),
      );
      if (locality.note) body.append(el('p', { text: locality.note }));
    } else {
      body.append(el('p', { text: UNKNOWN_COVERAGE }));
    }
    info.append(body);
  }
}

// ---------- Validation ----------

function validateStep(index: number): FieldError[] {
  const a = readForm();
  const errors: FieldError[] = [];
  const outdoor = a.space ? isOutdoor(a.space) : true;
  switch (index) {
    case 0:
      if (!a.localityId) errors.push({ field: 'localityId', message: 'Elegí tu localidad o “Otra localidad”.' });
      break;
    case 1:
      if (!a.space) errors.push({ field: 'space', message: 'Elegí el tipo de espacio.' });
      if ((a.space === 'patio' || a.space === 'jardin') && !a.medium)
        errors.push({ field: 'medium', message: 'Indicá si vas a plantar en maceta o en el suelo.' });
      if (!a.size) errors.push({ field: 'size', message: 'Elegí cuánto lugar tenés.' });
      break;
    case 2:
      if (outdoor) {
        if ((a.sunHours ?? 0) > 0 && !a.sunTiming) errors.push({ field: 'sunTiming', message: 'Indicá cuándo le da el sol.' });
        if ((a.sunHours ?? 0) < 3 && !a.shade) errors.push({ field: 'shade', message: 'Indicá cómo es el lugar cuando no hay sol.' });
      } else if (!a.indoorLight) {
        errors.push({ field: 'indoorLight', message: 'Elegí cómo es la luz natural del ambiente.' });
      }
      break;
    case 3:
      if (!a.goals || a.goals.length === 0) errors.push({ field: 'goals', message: 'Elegí al menos una opción.' });
      break;
    case 4:
      if (!a.time) errors.push({ field: 'time', message: 'Elegí cuánto tiempo querés dedicarle.' });
      if (outdoor && a.wind === undefined) errors.push({ field: 'wind', message: 'Indicá si hay viento fuerte.' });
      if (outdoor && !a.frost) errors.push({ field: 'frost', message: 'Indicá si el espacio suele tener heladas, o elegí “No sé”.' });
      break;
  }
  return errors;
}

function clearErrors(step: HTMLElement): void {
  for (const node of step.querySelectorAll<HTMLElement>('[data-error-for]')) {
    node.hidden = true;
    node.textContent = '';
  }
  for (const control of step.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
}

function showErrors(step: HTMLElement, errors: FieldError[]): void {
  clearErrors(step);
  for (const error of errors) {
    const node = step.querySelector<HTMLElement>(`[data-error-for="${error.field}"]`);
    if (node) {
      node.textContent = error.message;
      node.hidden = false;
    }
    const select = step.querySelector<HTMLElement>(`select[name="${error.field}"]`);
    select?.setAttribute('aria-invalid', 'true');
    node?.closest('fieldset')?.setAttribute('aria-invalid', 'true');
  }
  const first = errors[0];
  if (first) {
    const control = step.querySelector<HTMLElement>(`[name="${first.field}"]`);
    control?.focus();
  }
}

// ---------- Navigation ----------

function goTo(index: number, focus = true): void {
  current = Math.max(0, Math.min(steps.length - 1, index));
  steps.forEach((step, i) => step.classList.toggle('is-active', i === current));
  progressItems.forEach((item, i) => {
    if (i === current) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    item.dataset.done = String(i < current);
  });
  progressText.textContent = `Paso ${current + 1} de ${steps.length}: ${STEP_NAMES[current]}`;
  backButton.hidden = current === 0;
  nextButton.hidden = current === steps.length - 1;
  submitButton.hidden = current !== steps.length - 1;
  if (focus) steps[current]?.querySelector<HTMLElement>('h2')?.focus();
}

function next(): void {
  const step = steps[current]!;
  const errors = validateStep(current);
  if (errors.length > 0) {
    showErrors(step, errors);
    return;
  }
  clearErrors(step);
  goTo(current + 1);
}

// ---------- Results ----------

function finalAnswers(): SelectorAnswers | null {
  for (let i = 0; i < steps.length; i++) {
    if (validateStep(i).length > 0) return null;
  }
  const a = readForm();
  return {
    localityId: a.localityId!,
    space: a.space!,
    medium: a.medium ?? 'maceta',
    size: a.size!,
    sunHours: a.sunHours ?? null,
    sunTiming: a.sunTiming ?? null,
    shade: a.shade ?? null,
    indoorLight: a.indoorLight ?? null,
    goals: a.goals ?? [],
    time: a.time!,
    wind: a.wind ?? false,
    frost: a.frost ?? 'no',
  };
}

const SPACE_TEXT = { interior: 'Interior', balcon: 'Balcón', patio: 'Patio o terraza', jardin: 'Jardín' } as const;
const SIZE_TEXT = { small: 'chico', medium: 'mediano', large: 'grande' } as const;
const TIMING_TEXT = { manana: 'sobre todo a la mañana', tarde: 'sobre todo a la tarde', mixto: 'mañana y tarde' } as const;
const INDOOR_TEXT = {
  brillante: 'Luz indirecta brillante',
  media: 'Luz indirecta media',
  baja: 'Poca luz natural',
  sin_luz: 'Sin luz natural',
} as const;
const GOAL_TEXT = { follaje: 'follaje', flores: 'flores', aromaticas: 'aromáticas para cocina', huerta: 'huerta' } as const;
const FROST_TEXT = { si: 'Sí', no: 'No', no_se: 'No sé' } as const;

function renderAnswers(answers: SelectorAnswers): void {
  const list = document.querySelector<HTMLElement>('[data-answers-list]')!;
  const outdoor = isOutdoor(answers.space);
  const light = outdoor
    ? `${hoursLabel(answers.sunHours ?? 0)} de sol directo${answers.sunTiming ? `, ${TIMING_TEXT[answers.sunTiming]}` : ''}${
        answers.shade ? `; sombra ${answers.shade === 'luminosa' ? 'luminosa' : 'oscura'}` : ''
      }`
    : INDOOR_TEXT[answers.indoorLight ?? 'media'];
  const rows: [string, string, number][] = [
    ['Ubicación', getLocality(answers.localityId)?.label ?? '—', 0],
    [
      'Espacio',
      `${SPACE_TEXT[answers.space]}, ${answers.medium === 'suelo' ? 'en el suelo' : 'en maceta'}, lugar ${SIZE_TEXT[answers.size]}`,
      1,
    ],
    ['Luz', light, 2],
    ['Objetivo', answers.goals.map((g) => GOAL_TEXT[g]).join(', '), 3],
    [
      'Cuidado',
      `Tiempo ${answers.time === 'low' ? 'poco' : 'regular'}${
        outdoor ? `; viento fuerte: ${answers.wind ? 'sí' : 'no'}; heladas: ${FROST_TEXT[answers.frost].toLocaleLowerCase('es-AR')}` : ''
      }`,
      4,
    ],
  ];
  list.replaceChildren(
    ...rows.map(([label, value, step]) => {
      const button = el('button', { className: 'btn btn--ghost btn--small', text: 'Editar', attrs: { type: 'button' } });
      button.append(el('span', { className: 'visually-hidden', text: ` ${label.toLocaleLowerCase('es-AR')}` }));
      button.addEventListener('click', () => editStep(step));
      return el('div', { className: 'answers__row' }, [el('dt', { text: label }), el('dd', {}, [el('span', { text: value }), button])]);
    }),
  );
}

function renderHint(rec: Recommendation, answers: SelectorAnswers, month: number): HTMLElement {
  const hint = plantingHint({
    plant: rec.plant,
    locality: getLocality(answers.localityId),
    month,
    isOutdoorSpace: isOutdoor(answers.space),
    rules: calendar.rules,
    generalNotes: calendar.generalNotes,
  });
  const box = el('div', { className: 'result-card__hint' }, [icon('calendar', 18)]);
  const body = el('div');
  if (hint.kind === 'reference_window') {
    body.append(el('p', { className: 'result-card__hint-label', text: hint.label }), el('p', { text: hint.text }));
    const conditions = el('ul', { className: 'condition-list' });
    for (const rule of hint.rules) {
      conditions.append(el('li', {}, [icon('alert', 16), el('span', { text: `${METHOD_LABEL[rule.method]}: ${rule.condition}` })]));
    }
    body.append(conditions);
  } else if (rec.plant.category !== 'interior') {
    body.append(el('p', { text: hint.text }));
    if (hint.generalNote) body.append(el('p', { className: 'muted', text: `Orientación general: ${hint.generalNote.text}` }));
  } else {
    return el('span', { attrs: { hidden: '' } });
  }
  box.append(body);
  return box;
}

function renderCard(rec: Recommendation, answers: SelectorAnswers, month: number): HTMLElement {
  const { plant } = rec;
  const media = el('div', { className: 'plant-card__media' }, [
    illustrationNode(categoryIllustration(plant.category, `Ilustración de la categoría ${CATEGORY_LABEL[plant.category]}`)),
    el('span', { className: 'illustration-tag', text: 'Ilustración' }),
  ]);
  const title = el('h4', { className: 'plant-card__title' }, [el('a', { text: plant.commonName, attrs: { href: plantPath(plant.slug) } })]);
  const chips = el('ul', { className: 'chips', attrs: { 'aria-label': 'Características' } }, [
    el('li', { className: 'chip' }, [icon(plant.environments.includes('interior') ? 'window' : 'sun', 15), LIGHT_LABEL[plant.lightProfile]]),
    el('li', { className: 'chip' }, [icon('clock', 15), MAINTENANCE_LABEL[plant.maintenance]]),
  ]);
  const reasons = el('div', {}, [
    el('p', { className: 'label', text: 'Por qué se adapta' }),
    el(
      'ul',
      { className: 'reason-list' },
      rec.reasons.map((reason) => el('li', {}, [icon('check', 16), el('span', { text: reason })])),
    ),
  ]);
  const conditions =
    rec.conditions.length > 0
      ? el('div', { className: 'result-card__conditions' }, [
          el('p', { className: 'label', text: 'Tené en cuenta' }),
          el(
            'ul',
            { className: 'condition-list' },
            rec.conditions.map((c) => el('li', {}, [icon('alert', 16), el('span', { text: c })])),
          ),
        ])
      : null;
  const notes = rec.notes.length > 0 ? el('p', { className: 'small muted', text: rec.notes.join(' ') }) : null;

  const save = el('button', {
    className: 'btn btn--secondary btn--small',
    attrs: { type: 'button', 'data-save-plant': plant.id, 'data-plant-name': plant.commonName, 'data-saved': 'false' },
  });
  save.append(icon('heart', 18), el('span', { text: 'Guardar en mi jardín', attrs: { 'data-save-label': '' } }));
  save.append(el('span', { className: 'visually-hidden', text: `: ${plant.commonName}` }));
  const view = el('a', { className: 'btn btn--ghost btn--small', text: 'Ver ficha', attrs: { href: plantPath(plant.slug) } });
  view.append(el('span', { className: 'visually-hidden', text: ` de ${plant.commonName}` }));

  return el('article', { className: `plant-card result-card result-card--${rec.tier}` }, [
    media,
    el('div', { className: 'plant-card__body' }, [
      el('div', {}, [
        el('p', { className: 'eyebrow', text: CATEGORY_LABEL[plant.category] }),
        title,
        el('p', { className: 'plant-card__sci', text: plant.scientificName }),
      ]),
      chips,
      reasons,
      conditions,
      notes,
      renderHint(rec, answers, month),
      el('div', { className: 'plant-card__footer' }, [save, view]),
    ]),
  ]);
}

function callout(kind: 'info' | 'warning', iconName: 'info' | 'alert' | 'calendar', children: Node[]): HTMLElement {
  return el('div', { className: `callout${kind === 'warning' ? ' callout--warning' : ''}` }, [icon(iconName, 20), el('div', {}, children)]);
}

function renderNotices(answers: SelectorAnswers, result: RecommendationResult, month: number): void {
  const container = document.querySelector<HTMLElement>('[data-results-notices]')!;
  const notices: HTMLElement[] = [];
  const locality = getLocality(answers.localityId);
  const hasOutdoorResults = isOutdoor(answers.space) && result.good.length + result.conditional.length > 0;

  if (hasOutdoorResults) {
    if (locality?.coverage === 'reference_temperate') {
      const children: Node[] = [
        el('p', {}, [el('strong', { text: REFERENCE_LABEL })]),
        el('p', {
          text: `Cuando una planta tiene una ventana de referencia en ${monthName(month)}, lo indicamos en su tarjeta. ${monthName(month).replace(/^./, (c) => c.toLocaleUpperCase('es-AR'))} es tu mes de planificación, no un pronóstico.`,
        }),
        el('p', { text: CALENDAR_EXPLANATION }),
      ];
      if (locality.note) children.push(el('p', { text: locality.note }));
      notices.push(callout('info', 'calendar', children));
    } else {
      const link = el('a', { text: 'Ver el calendario orientativo para clima templado', attrs: { href: '/calendario/' } });
      notices.push(
        callout('info', 'calendar', [
          el('p', { text: UNKNOWN_COVERAGE }),
          el('p', {}, ['Si querés, podés consultar igualmente el ', link, ', sabiendo que no fue pensado para tu zona.']),
        ]),
      );
    }
  }
  if (result.lowConfidence) {
    notices.push(
      callout('warning', 'alert', [
        el('p', {
          text: 'Como no sabés si tu espacio tiene heladas, las plantas sensibles al frío aparecen como alternativas con condiciones. Si podés, averigualo con vecinos o en un vivero de tu zona.',
        }),
      ]),
    );
  }
  if (!isOutdoor(answers.space)) {
    notices.push(
      callout('info', 'info', [
        el('p', { text: 'Para interior usamos la luz del ambiente que describiste; no depende del clima exterior de tu ciudad.' }),
      ]),
    );
  }
  container.replaceChildren(...notices);
}

function renderEmpty(result: RecommendationResult): void {
  const container = document.querySelector<HTMLElement>('[data-results-empty]')!;
  container.replaceChildren();
  if (!result.emptyReason) return;
  const edit = (step: number, label: string) => {
    const button = el('button', { className: 'btn btn--primary', text: label, attrs: { type: 'button' } });
    button.addEventListener('click', () => editStep(step));
    return button;
  };
  let title = 'No encontramos plantas para esta combinación';
  let text: string[] = [
    'Ninguna planta de esta selección inicial se adapta bien a todas tus respuestas. Probá cambiar el espacio disponible, la luz o lo que querés cultivar.',
  ];
  let action = edit(1, 'Cambiar el espacio');
  if (result.emptyReason === 'no_natural_light') {
    title = 'Sin luz natural, ninguna planta de esta guía va a prosperar';
    text = [
      'Todas las plantas de esta selección dependen de la luz natural. Para cultivar ahí, la condición de luz tiene que cambiar: por ejemplo, elegir otro ambiente con ventana.',
      'La planificación con luz artificial no está incluida en esta versión.',
    ];
    action = edit(2, 'Cambiar la luz');
  } else if (result.emptyReason === 'outdoor_foliage') {
    title = 'Las plantas de follaje de esta guía son de interior';
    text = ['Para tu espacio al aire libre, probá con flores, aromáticas o huerta.'];
    action = edit(3, 'Cambiar lo que querés cultivar');
  }
  const explore = el('a', { className: 'btn btn--secondary', text: 'Explorar todas las plantas', attrs: { href: '/plantas/' } });
  container.append(
    el('div', { className: 'card card--sage' }, [
      el('h3', { text: title }),
      ...text.map((t) => el('p', { text: t })),
      el('div', { className: 'btn-row' }, [action, explore]),
    ]),
  );
}

function renderGroup(target: HTMLElement, title: string, intro: string | null, items: Recommendation[], answers: SelectorAnswers, month: number): void {
  target.replaceChildren();
  if (items.length === 0) return;
  const list = el(
    'ul',
    { className: 'grid grid--3 results__grid' },
    items.map((rec) => el('li', {}, [renderCard(rec, answers, month)])),
  );
  target.append(el('h3', { className: 'results__group-title', text: title }));
  if (intro) target.append(el('p', { className: 'muted', text: intro }));
  target.append(list);
}

function showResults(answers: SelectorAnswers, focus = true): void {
  const result = recommend(plants, answers);
  const { month } = currentPlanningPeriod();
  renderAnswers(answers);
  renderNotices(answers, result, month);
  renderGroup(
    document.querySelector<HTMLElement>('[data-results-good]')!,
    'Buenas opciones para tu espacio',
    null,
    result.good,
    answers,
    month,
  );
  renderGroup(
    document.querySelector<HTMLElement>('[data-results-conditional]')!,
    'Alternativas con condiciones',
    result.good.length === 0
      ? 'No encontramos opciones sin condiciones, pero estas pueden funcionar si tenés en cuenta lo que se indica en cada una.'
      : 'Pueden funcionar si tenés en cuenta lo que se indica en cada una.',
    result.conditional,
    answers,
    month,
  );
  renderEmpty(result);

  const summary = document.querySelector<HTMLElement>('[data-results-summary]')!;
  const g = result.good.length;
  const c = result.conditional.length;
  summary.textContent =
    g + c === 0
      ? 'No encontramos plantas para esta combinación.'
      : `${g === 1 ? '1 buena opción' : `${g} buenas opciones`}${c > 0 ? ` y ${c === 1 ? '1 alternativa' : `${c} alternativas`} con condiciones` : ''}.`;

  resultsSection.hidden = false;
  form.hidden = true;
  resume.hidden = true;
  notifyGardenChanged();
  if (focus) {
    const heading = document.getElementById('results-title');
    heading?.focus();
    heading?.scrollIntoView({ block: 'start' });
  }
  track('selector_complete', {
    space: answers.space,
    goals: answers.goals.length,
    good: g,
    conditional: c,
  });
}

function editStep(step: number): void {
  resultsSection.hidden = true;
  form.hidden = false;
  goTo(step);
  form.scrollIntoView({ block: 'start' });
}

// ---------- Wiring ----------

form.addEventListener('change', (event) => {
  if (!started) {
    started = true;
    track('selector_start');
  }
  updateConditional();
  saveProfile();
  const target = event.target as HTMLElement;
  const step = target.closest<HTMLElement>('[data-step]');
  if (step) {
    const fieldName = (target as HTMLInputElement).name;
    const error = step.querySelector<HTMLElement>(`[data-error-for="${fieldName}"]`);
    if (error && !error.hidden) {
      error.hidden = true;
      error.closest('fieldset')?.removeAttribute('aria-invalid');
      target.removeAttribute('aria-invalid');
    }
  }
});
form.addEventListener('input', (event) => {
  if ((event.target as HTMLElement).id === 'sunHours') updateConditional();
});
nextButton.addEventListener('click', next);
backButton.addEventListener('click', () => goTo(current - 1));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const step = steps[current]!;
  const errors = validateStep(current);
  if (errors.length > 0) {
    showErrors(step, errors);
    return;
  }
  for (let i = 0; i < steps.length; i++) {
    const stepErrors = validateStep(i);
    if (stepErrors.length > 0) {
      goTo(i);
      showErrors(steps[i]!, stepErrors);
      return;
    }
  }
  const answers = finalAnswers();
  if (answers) {
    saveProfile();
    showResults(answers);
  }
});
document.querySelector('[data-edit-answers]')?.addEventListener('click', () => editStep(0));
document.querySelector('[data-resume-results]')?.addEventListener('click', () => {
  const answers = finalAnswers();
  if (answers) showResults(answers);
});
document.querySelector('[data-restart]')?.addEventListener('click', () => {
  store.remove(STORAGE_KEYS.profile);
  form.reset();
  sunHoursInput().value = '4';
  resume.hidden = true;
  updateConditional();
  goTo(0);
});

// Restore previous answers, if any.
const acceptAny = (_value: unknown): _value is unknown => true;
const stored = sanitizeStored(store.read(STORAGE_KEYS.profile, acceptAny, null));
writeForm(stored);
updateConditional();
goTo(0, false);
if (finalAnswers()) resume.hidden = false;

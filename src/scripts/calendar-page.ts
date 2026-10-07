import { calendar, careRules, getLocality, getPlant, getSourceById } from '../lib/catalog';
import {
  calendarAccess,
  careRulesForPlant,
  currentPlanningPeriod,
  describeRule,
  formatPeriod,
  groupForRule,
  isValidPeriod,
  periodKey,
  REFERENCE_LABEL,
  rulesForMonth,
  shiftPeriod,
  type PlanningPeriod,
} from '../lib/calendar';
import { CALENDAR_GROUP_LABEL, formatMonthList, monthName, type CalendarGroup } from '../lib/labels';
import { plantPath } from '../lib/site';
import { createStore, getBrowserStore, isChecked, readChecks, STORAGE_KEYS, toggleCheck } from '../lib/storage';
import type { CalendarRule } from '../lib/schemas';
import { favorites, onGardenChange } from './garden-state';
import { el, icon } from './ui';

const UNKNOWN_COVERAGE =
  'Todavía no tenemos fechas de siembra específicas para esta zona. Podés explorar plantas según las condiciones de tu espacio.';

const planner = document.querySelector<HTMLElement>('[data-planner]')!;
const localitySelect = document.querySelector<HTMLSelectElement>('[data-cal-locality]')!;
const monthSelect = document.querySelector<HTMLSelectElement>('[data-cal-month]')!;
const yearLabel = document.querySelector<HTMLElement>('[data-cal-year]')!;
const mineToggle = document.querySelector<HTMLInputElement>('[data-cal-mine]')!;
const mineHint = document.querySelector<HTMLElement>('[data-cal-mine-hint]')!;
const coverageBox = document.querySelector<HTMLElement>('[data-cal-coverage]')!;
const output = document.querySelector<HTMLElement>('[data-cal-output]')!;
const outputTitle = document.querySelector<HTMLElement>('[data-cal-output-title]')!;
const groupsBox = document.querySelector<HTMLElement>('[data-cal-groups]')!;

const store = getBrowserStore();
// The month override lasts for the browsing session only, so a new month starts fresh.
const sessionStore = createStore(() => (typeof window === 'undefined' ? null : window.sessionStorage));

type ProfileLike = Record<string, unknown> & { localityId?: string };
const isObject = (v: unknown): v is ProfileLike => typeof v === 'object' && v !== null && !Array.isArray(v);

let period: PlanningPeriod = sessionStore.read(STORAGE_KEYS.calendarPeriod, isValidPeriod, currentPlanningPeriod());
let filter: CalendarGroup | 'todas' = 'todas';
let consultOpened = false;

function readProfile(): ProfileLike {
  return store.read(STORAGE_KEYS.profile, isObject, {});
}

function setLocality(id: string): void {
  const profile = readProfile();
  if (id) profile.localityId = id;
  else delete profile.localityId;
  store.write(STORAGE_KEYS.profile, profile);
}

function setPeriod(next: PlanningPeriod): void {
  period = next;
  sessionStore.write(STORAGE_KEYS.calendarPeriod, period);
  render();
}

// ---------- Rendering ----------

function sourceLink(id: string): HTMLElement {
  const source = getSourceById(id);
  if (!source) return el('span');
  return el('a', { text: source.title, attrs: { href: source.url, target: '_blank', rel: 'noopener' } });
}

function renderCoverage(): boolean {
  const locality = getLocality(localitySelect.value);
  const access = calendarAccess(locality);
  coverageBox.replaceChildren();

  if (!locality) {
    coverageBox.append(
      el('div', { className: 'callout' }, [
        icon('calendar', 20),
        el('div', {}, [
          el('p', {}, [el('strong', { text: REFERENCE_LABEL })]),
          el('p', {
            text: 'Elegí tu zona para saber si esta referencia es un buen punto de partida. Mientras tanto, te mostramos las ventanas de referencia.',
          }),
        ]),
      ]),
    );
    return true;
  }

  if (access.mode === 'reference_offered') {
    const children: Node[] = [
      el('p', {}, [el('strong', { text: `${REFERENCE_LABEL} — ${locality.label}` })]),
      el('p', { text: 'Es la referencia que ofrecemos para tu zona. No es un calendario verificado para tu ciudad.' }),
    ];
    if (access.note) children.push(el('p', { text: access.note }));
    coverageBox.append(el('div', { className: 'callout' }, [icon('calendar', 20), el('div', {}, children)]));
    return true;
  }

  const open = el('button', {
    className: 'btn btn--secondary btn--small',
    text: consultOpened ? 'Ocultar la referencia de clima templado' : 'Consultar igualmente la referencia de clima templado',
    attrs: { type: 'button', 'aria-expanded': String(consultOpened) },
  });
  open.addEventListener('click', () => {
    consultOpened = !consultOpened;
    render();
    if (consultOpened) outputTitle.focus();
  });
  const sources = el('ul', { className: 'source-list' }, [
    el('li', {}, [sourceLink('INTA_HUERTAS')]),
    el('li', {}, [sourceLink('INTA_PATAGONIA')]),
  ]);
  const children: Node[] = [
    el('p', {}, [el('strong', { text: locality.label })]),
    el('p', { text: UNKNOWN_COVERAGE }),
    el('p', {}, [
      el('a', { text: 'Encontrá plantas según tu espacio', attrs: { href: '/encontra-tu-planta/' } }),
      ' o consultá materiales del INTA para tu región:',
    ]),
    sources,
    el('div', { className: 'btn-row' }, [open]),
  ];
  if (consultOpened) {
    children.push(
      el('p', {
        className: 'small',
        text: 'Estás consultando la referencia de clima templado: no fue pensada para tu zona y sus fechas no se ajustan automáticamente.',
      }),
    );
  }
  coverageBox.append(el('div', { className: 'callout callout--warning' }, [icon('map', 20), el('div', {}, children)]));
  return consultOpened;
}

function toggleButton(label: string, pressed: boolean, onToggle: () => void): HTMLButtonElement {
  const button = el('button', {
    className: 'btn btn--ghost btn--small',
    attrs: { type: 'button', 'aria-pressed': String(pressed) },
  });
  button.append(icon('check', 16), el('span', { text: label }));
  button.addEventListener('click', onToggle);
  return button;
}

function ruleCard(rule: CalendarRule): HTMLElement {
  const plant = getPlant(rule.plantId);
  const key = periodKey(period);
  const done = isChecked(readChecks(store), rule.plantId, rule.id, key);
  const source = getSourceById(rule.sourceId);
  return el('li', { className: 'card task' }, [
    el('p', { className: 'task__plant' }, [el('a', { text: plant?.commonName ?? rule.plantId, attrs: { href: plantPath(rule.plantId) } })]),
    el('p', { className: 'task__title', text: describeRule(rule) }),
    el('p', { className: 'small', text: `Meses de referencia: ${formatMonthList(rule.months)}` }),
    el('p', { className: 'small task__condition' }, [icon('alert', 16), el('span', { text: rule.condition })]),
    el('p', { className: 'small muted', text: `Fuente: ${source?.title ?? rule.sourceId}` }),
    toggleButton(`Marcar como hecha en ${monthName(period.month)}`, done, () => {
      toggleCheck(store, rule.plantId, rule.id, key);
      render();
    }),
  ]);
}

function renderPlanting(group: Exclude<CalendarGroup, 'cuidados'>, rules: CalendarRule[]): HTMLElement | null {
  const items = rules.filter((r) => groupForRule(r) === group);
  if (items.length === 0) return null;
  return el('section', { className: 'task-group' }, [
    el('h3', { text: CALENDAR_GROUP_LABEL[group] }),
    el('ul', { className: 'grid grid--3 task-list' }, items.map(ruleCard)),
  ]);
}

function renderCare(mine: string[] | null): HTMLElement {
  const section = el('section', { className: 'task-group' }, [
    el('h3', { text: CALENDAR_GROUP_LABEL.cuidados }),
    el('p', {
      className: 'muted',
      text: 'En cualquier mes, según el estado de tu planta. No son frecuencias fijas de riego.',
    }),
  ]);
  const key = periodKey(period);
  if (mine && mine.length > 0) {
    const checks = readChecks(store);
    const list = el('ul', { className: 'grid grid--2 task-list' });
    for (const id of mine) {
      const plant = getPlant(id);
      if (!plant) continue;
      const rules = careRulesForPlant(plant, careRules, calendar.rules);
      list.append(
        el('li', { className: 'card task' }, [
          el('p', { className: 'task__plant' }, [el('a', { text: plant.commonName, attrs: { href: plantPath(plant.slug) } })]),
          el(
            'ul',
            { className: 'care-checks' },
            rules.map((rule) =>
              el('li', {}, [
                el('span', { text: rule.text }),
                toggleButton('Ya lo revisé', isChecked(checks, plant.id, rule.id, key), () => {
                  toggleCheck(store, plant.id, rule.id, key);
                  render();
                }),
              ]),
            ),
          ),
        ]),
      );
    }
    section.append(list);
  } else {
    section.append(
      el(
        'ul',
        { className: 'care-generic' },
        careRules.map((rule) => el('li', {}, [el('strong', { text: `${rule.label}: ` }), rule.text])),
      ),
      el('p', { className: 'small' }, [
        'Guardá tus plantas y activá “Solo mis plantas” para marcar “Ya lo revisé” en cada una. ',
        el('a', { text: 'Ir a Mi jardín', attrs: { href: '/mi-jardin/' } }),
      ]),
    );
  }
  return section;
}

function renderEmptyPlanting(): HTMLElement {
  return el('div', { className: 'card card--sage' }, [
    el('p', {}, [el('strong', { text: `No hay tareas de siembra en esta referencia para ${monthName(period.month)}${mineToggle.checked ? ' en tus plantas' : ''}.` })]),
    el('p', {
      text: 'Que no figure no significa que esté prohibido: la referencia solo incluye algunas ventanas seleccionadas. Revisá la ficha de cada planta y consultá fuentes locales.',
    }),
    el('div', { className: 'btn-row' }, [
      el('a', { className: 'btn btn--secondary btn--small', text: 'Ver todas las plantas', attrs: { href: '/plantas/' } }),
      el('a', { className: 'btn btn--ghost btn--small', text: 'Fuentes del INTA', attrs: { href: '#fuentes-cal' } }),
    ]),
  ]);
}

function render(): void {
  monthSelect.value = String(period.month);
  yearLabel.textContent = String(period.year);
  monthSelect.setAttribute('aria-label', `Mes de planificación (${period.year})`);

  const mine = mineToggle.checked ? favorites() : null;
  mineHint.hidden = !(mineToggle.checked && (mine?.length ?? 0) === 0);

  const showTasks = renderCoverage();
  output.hidden = false;
  outputTitle.setAttribute('tabindex', '-1');
  if (!showTasks) {
    // Care checks do not depend on planting dates, so they stay available for every zone.
    outputTitle.textContent = `Revisiones de cuidado para ${formatPeriod(period)}`;
    groupsBox.replaceChildren(renderCare(mine));
    return;
  }

  outputTitle.textContent = `Tareas de referencia para ${formatPeriod(period)}`;
  const plantIds = mine ? new Set(mine) : null;
  const rules = rulesForMonth(calendar.rules, { month: period.month, plantIds, group: filter === 'cuidados' ? 'todas' : filter });
  const blocks: HTMLElement[] = [];

  if (filter !== 'cuidados') {
    const groups: Exclude<CalendarGroup, 'cuidados'>[] =
      filter === 'todas' ? ['almacigos', 'siembra_directa', 'trasplantes'] : [filter];
    const planting = groups.map((g) => renderPlanting(g, rules)).filter((b): b is HTMLElement => b !== null);
    if (planting.length === 0) blocks.push(renderEmptyPlanting());
    else blocks.push(...planting);
  }
  if (filter === 'todas' || filter === 'cuidados') blocks.push(renderCare(mine));
  groupsBox.replaceChildren(...blocks);
}

// ---------- Wiring ----------

const profile = readProfile();
if (typeof profile.localityId === 'string' && getLocality(profile.localityId)) localitySelect.value = profile.localityId;

localitySelect.addEventListener('change', () => {
  consultOpened = false;
  setLocality(localitySelect.value);
  render();
});
monthSelect.addEventListener('change', () => setPeriod({ year: period.year, month: Number(monthSelect.value) }));
document.querySelector('[data-cal-prev]')?.addEventListener('click', () => setPeriod(shiftPeriod(period, -1)));
document.querySelector('[data-cal-next]')?.addEventListener('click', () => setPeriod(shiftPeriod(period, 1)));
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="cal-filter"]')) {
  radio.addEventListener('change', () => {
    filter = radio.value as CalendarGroup | 'todas';
    render();
  });
}
mineToggle.addEventListener('change', render);
onGardenChange(render);

planner.hidden = false;
render();

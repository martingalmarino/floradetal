import { calendar, careRules, getPlant, plants } from '../lib/catalog';
import { careRulesForPlant, currentPlanningPeriod, periodKey } from '../lib/calendar';
import { LIGHT_LABEL, MAINTENANCE_LABEL, WATER_LABEL } from '../lib/labels';
import { plantPath, SITE_NAME } from '../lib/site';
import { isChecked, NOTE_MAX_LENGTH, readChecks, readNotes, saveNote, STORAGE_KEYS, toggleCheck, type CheckEntry } from '../lib/storage';
import { favorites, notifyGardenChanged, onGardenChange, removeFromGarden, store, undoRemove } from './garden-state';
import { copyText } from './share';
import { el, icon, showToast } from './ui';

const knownIds = new Set(plants.map((p) => p.id));
const list = document.querySelector<HTMLUListElement>('[data-list]')!;
const empty = document.querySelector<HTMLElement>('[data-empty]')!;
const count = document.querySelector<HTMLElement>('[data-count]')!;
const toolbar = document.querySelector<HTMLElement>('[data-toolbar]')!;
const warning = document.querySelector<HTMLElement>('[data-storage-warning]')!;
const historySection = document.querySelector<HTMLElement>('[data-history-section]')!;
const historyList = document.querySelector<HTMLOListElement>('[data-history]')!;
const dialog = document.querySelector<HTMLDialogElement>('[data-reset-dialog]')!;
const resetButton = document.querySelector<HTMLButtonElement>('[data-reset]')!;

const dateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFormat.format(new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1));
}

function lastCheck(checks: CheckEntry[], plantId: string, ruleId: string): CheckEntry | undefined {
  return checks.filter((c) => c.plantId === plantId && c.ruleId === ruleId).sort((a, b) => b.at.localeCompare(a.at))[0];
}

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

function renderItem(plantId: string): HTMLElement | null {
  const plant = getPlant(plantId);
  if (!plant) return null;
  const notes = readNotes(store());
  const note = notes[plant.id];
  const checks = readChecks(store());
  const period = periodKey(currentPlanningPeriod());
  const status = el('p', { className: 'garden-item__status', attrs: { 'aria-live': 'polite' } });

  // Notes: plain text only, assigned through .value (never parsed as HTML).
  const noteId = `note-${plant.id}`;
  const textarea = el('textarea', {
    attrs: { id: noteId, maxlength: String(NOTE_MAX_LENGTH), rows: '4', placeholder: 'Ej.: la trasplanté a una maceta de 20 L.' },
  });
  textarea.value = note?.text ?? '';
  const persistNote = debounce(() => {
    saveNote(store(), plant.id, { text: textarea.value });
    status.textContent = store().persistent ? 'Nota guardada en este dispositivo.' : 'Nota guardada solo en esta sesión.';
  }, 500);
  textarea.addEventListener('input', () => {
    status.textContent = 'Guardando…';
    persistNote();
  });

  const dateId = `review-${plant.id}`;
  const dateInput = el('input', { attrs: { id: dateId, type: 'date' } });
  dateInput.value = note?.reviewDate ?? '';
  const due = el('p', { className: 'garden-item__due' });
  const updateDue = () => {
    const value = dateInput.value;
    due.hidden = !value || value > todayIso();
    due.textContent = value && value <= todayIso() ? `Fecha de revisión: ${formatDay(value)}. ¿Ya la miraste?` : '';
  };
  dateInput.addEventListener('change', () => {
    const value = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? dateInput.value : null;
    saveNote(store(), plant.id, { reviewDate: value });
    status.textContent = value ? `Fecha de revisión guardada: ${formatDay(value)}.` : 'Fecha de revisión quitada.';
    updateDue();
  });
  updateDue();

  const rules = careRulesForPlant(plant, careRules, calendar.rules);
  const checkList = el(
    'ul',
    { className: 'care-checks' },
    rules.map((rule) => {
      const done = isChecked(checks, plant.id, rule.id, period);
      const last = lastCheck(checks, plant.id, rule.id);
      const button = el('button', {
        className: 'btn btn--ghost btn--small',
        attrs: { type: 'button', 'aria-pressed': String(done), id: `check-${plant.id}-${rule.id}` },
      });
      button.append(icon('check', 16), el('span', { text: 'Ya lo revisé' }));
      button.addEventListener('click', () => {
        const nowChecked = toggleCheck(store(), plant.id, rule.id, period);
        showToast(nowChecked ? `Revisión registrada: ${plant.commonName}.` : `Revisión desmarcada: ${plant.commonName}.`, undefined, 3000);
        render();
      });
      return el('li', {}, [
        el('span', { text: rule.text }),
        last ? el('span', { className: 'garden-item__last', text: `Última vez: ${dateFormat.format(new Date(last.at))}` }) : null,
        button,
      ]);
    }),
  );

  const remove = el('button', { className: 'btn btn--ghost btn--small no-print', attrs: { type: 'button' } });
  remove.append(icon('trash', 16), el('span', { text: 'Quitar' }), el('span', { className: 'visually-hidden', text: ` ${plant.commonName}` }));
  remove.addEventListener('click', () => {
    const index = removeFromGarden(plant.id);
    showToast(`${plant.commonName} se quitó de tu jardín.`, {
      label: 'Deshacer',
      onClick: () => {
        undoRemove(plant.id, index);
        showToast(`${plant.commonName} volvió a tu jardín.`, undefined, 3000);
      },
    });
  });

  return el('li', { className: 'card garden-item', attrs: { 'data-plant': plant.id } }, [
    el('div', { className: 'garden-item__head' }, [
      el('div', {}, [
        el('h2', { className: 'garden-item__title' }, [el('a', { text: plant.commonName, attrs: { href: plantPath(plant.slug) } })]),
        el('p', { className: 'garden-item__sci', text: plant.scientificName }),
        el('ul', { className: 'chips', attrs: { 'aria-label': 'Características' } }, [
          el('li', { className: 'chip', text: LIGHT_LABEL[plant.lightProfile] }),
          el('li', { className: 'chip', text: WATER_LABEL[plant.waterProfile] }),
          el('li', { className: 'chip', text: MAINTENANCE_LABEL[plant.maintenance] }),
        ]),
      ]),
      remove,
    ]),
    el('div', { className: 'stack' }, [
      el('div', { className: 'field' }, [el('label', { text: 'Tus notas', attrs: { for: noteId } }), textarea]),
      el('div', { className: 'field' }, [
        el('label', { text: 'Fecha para revisarla (opcional)', attrs: { for: dateId } }),
        dateInput,
        el('p', { className: 'hint', text: 'Solo se muestra acá, en Mi jardín. No enviamos notificaciones.' }),
      ]),
      due,
      status,
    ]),
    el('div', { className: 'garden-item__checks' }, [
      el('h3', { text: 'Revisiones de cuidado' }),
      el('p', { className: 'hint', text: 'Según el estado de la planta, no con una frecuencia fija.' }),
      checkList,
    ]),
  ]);
}

function renderHistory(ids: string[]): void {
  const checks = readChecks(store())
    .filter((c) => ids.includes(c.plantId))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);
  historySection.hidden = checks.length === 0;
  historyList.replaceChildren(
    ...checks.map((c) => {
      const plant = getPlant(c.plantId);
      const rule = careRules.find((r) => r.id === c.ruleId);
      const what = rule ? rule.label : 'Tarea del calendario';
      return el('li', { text: `${dateFormat.format(new Date(c.at))} — ${plant?.commonName ?? c.plantId}: ${what}` });
    }),
  );
}

function render(): void {
  const ids = favorites(knownIds);
  warning.hidden = store().persistent;
  empty.hidden = ids.length > 0;
  toolbar.hidden = ids.length === 0;
  count.textContent = ids.length === 0 ? '' : ids.length === 1 ? '1 planta guardada' : `${ids.length} plantas guardadas`;

  const focused = document.activeElement;
  const focusedId = focused instanceof HTMLElement ? focused.id : '';
  // Re-rendering while typing would lose the cursor; skip if a note is being edited.
  if (focused instanceof HTMLTextAreaElement && list.contains(focused)) return;

  list.replaceChildren(...ids.map(renderItem).filter((node): node is HTMLElement => node !== null));
  renderHistory(ids);
  if (focusedId) document.getElementById(focusedId)?.focus();
}

document.querySelector('[data-share-list]')?.addEventListener('click', async () => {
  const ids = favorites(knownIds);
  const lines = ids
    .map((id) => getPlant(id))
    .filter((p) => p !== undefined)
    .map((p) => `${p.commonName}: ${new URL(plantPath(p.slug), window.location.origin).href}`);
  const text = `Mis plantas en ${SITE_NAME}:\n${lines.join('\n')}`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: `Mis plantas en ${SITE_NAME}`, text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const copied = await copyText(text);
  showToast(copied ? 'Lista copiada. Incluye solo nombres y enlaces, sin tus notas.' : 'No pudimos copiar la lista en este navegador.');
});

resetButton.addEventListener('click', () => {
  if (typeof dialog.showModal === 'function') {
    dialog.returnValue = '';
    dialog.showModal();
  } else if (window.confirm('¿Borrar todos tus datos de este dispositivo? No se puede deshacer.')) {
    clearAll();
  }
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'confirm') clearAll();
  resetButton.focus();
});

function clearAll(): void {
  store().clearAll();
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.calendarPeriod);
  } catch {
    // ignore
  }
  notifyGardenChanged();
  showToast('Borramos tus datos de este dispositivo.');
}

onGardenChange(render);
render();

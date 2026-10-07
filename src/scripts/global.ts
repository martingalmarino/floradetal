import { track } from '../lib/analytics';
import { favorites, onGardenChange, removeFromGarden, saveToGarden, store, undoRemove } from './garden-state';
import { sharePayload, shareOnWhatsApp } from './share';
import { showToast } from './ui';

function setupMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });
}

function updateGardenCount(): void {
  const count = favorites().length;
  for (const badge of document.querySelectorAll<HTMLElement>('[data-garden-count]')) {
    badge.hidden = count === 0;
    badge.textContent = String(count);
    badge.setAttribute('aria-label', `${count} ${count === 1 ? 'planta guardada' : 'plantas guardadas'}`);
  }
}

const SAVED_LABEL = 'Guardada en mi jardín';
const SAVE_LABEL = 'Guardar en mi jardín';

export function syncSaveButtons(root: ParentNode = document): void {
  const saved = new Set(favorites());
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-save-plant]')) {
    const id = button.dataset.savePlant ?? '';
    const isSaved = saved.has(id);
    button.dataset.saved = String(isSaved);
    const label = button.querySelector('[data-save-label]');
    if (label) label.textContent = isSaved ? SAVED_LABEL : SAVE_LABEL;
  }
}

function handleSaveClick(button: HTMLButtonElement): void {
  const id = button.dataset.savePlant ?? '';
  const name = button.dataset.plantName ?? 'La planta';
  if (button.dataset.saved === 'true') {
    const index = removeFromGarden(id);
    showToast(`${name} se quitó de tu jardín.`, { label: 'Deshacer', onClick: () => undoRemove(id, index) });
    return;
  }
  saveToGarden(id);
  track('garden_add', { plant: id });
  const persistent = store().persistent;
  showToast(
    persistent
      ? `${name} se guardó en tu jardín, en este dispositivo.`
      : `${name} se guardó solo mientras tengas esta página abierta: este navegador no permite guardar datos.`,
  );
}

function setupDelegatedClicks(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const saveButton = target?.closest<HTMLButtonElement>('[data-save-plant]');
    if (saveButton) {
      handleSaveClick(saveButton);
      return;
    }
    const shareButton = target?.closest<HTMLButtonElement>('[data-share]');
    if (shareButton) {
      const payload = {
        title: shareButton.dataset.shareTitle ?? document.title,
        text: shareButton.dataset.shareText ?? document.title,
        url: shareButton.dataset.shareUrl ?? window.location.pathname,
      };
      if (shareButton.dataset.share === 'whatsapp') shareOnWhatsApp(payload);
      else void sharePayload(payload);
      return;
    }
    const printButton = target?.closest<HTMLButtonElement>('[data-print]');
    if (printButton) window.print();
  });
}

setupMenu();
setupDelegatedClicks();
updateGardenCount();
syncSaveButtons();
onGardenChange(() => {
  updateGardenCount();
  syncSaveButtons();
});

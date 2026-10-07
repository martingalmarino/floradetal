// Client-side garden state shared by every page. Emits "pv:garden-changed" so all controls stay in sync.
import {
  addFavorite,
  getBrowserStore,
  readFavorites,
  removeFavorite,
  restoreFavorite,
  STORAGE_KEYS,
} from '../lib/storage';

export const GARDEN_EVENT = 'pv:garden-changed';
const PLANT_ID = /^[a-z0-9-]{1,60}$/;

export function store() {
  return getBrowserStore();
}

/** Pages that render plant data filter these IDs against the catalog. */
export function favorites(knownIds?: ReadonlySet<string>): string[] {
  return readFavorites(store(), knownIds).filter((id) => PLANT_ID.test(id));
}

function emit(): void {
  document.dispatchEvent(new CustomEvent(GARDEN_EVENT));
}

export function saveToGarden(plantId: string): boolean {
  if (!PLANT_ID.test(plantId)) return false;
  const added = addFavorite(store(), plantId);
  emit();
  return added;
}

export function removeFromGarden(plantId: string): number {
  const index = removeFavorite(store(), plantId);
  emit();
  return index;
}

export function undoRemove(plantId: string, index: number): void {
  restoreFavorite(store(), plantId, index);
  emit();
}

export function notifyGardenChanged(): void {
  emit();
}

export function onGardenChange(callback: () => void): void {
  document.addEventListener(GARDEN_EVENT, callback);
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === STORAGE_KEYS.favorites) callback();
  });
}

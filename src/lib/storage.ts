// Versioned, defensive local persistence. Never touches window during server rendering, survives
// corrupt JSON and storage-denied errors, and falls back to in-memory state for the current page.

export const STORAGE_KEYS = {
  profile: 'pv:v1:profile',
  favorites: 'pv:v1:favorites',
  checks: 'pv:v1:checks',
  notes: 'pv:v1:notes',
  calendarPeriod: 'pv:v1:calendar-period',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Validator<T> = (value: unknown) => value is T;

export interface SafeStore {
  /** False when values only live in memory for this page. */
  readonly persistent: boolean;
  read<T>(key: StorageKey, validate: Validator<T>, fallback: T): T;
  write(key: StorageKey, value: unknown): boolean;
  remove(key: StorageKey): void;
  clearAll(): void;
}

function probe(backend: StorageBackend): boolean {
  const testKey = 'pv:probe';
  try {
    backend.setItem(testKey, '1');
    backend.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function createStore(getBackend: () => StorageBackend | null | undefined): SafeStore {
  let backend: StorageBackend | null = null;
  try {
    const candidate = getBackend();
    backend = candidate && probe(candidate) ? candidate : null;
  } catch {
    backend = null;
  }
  const memory = new Map<string, string>();
  let persistent = backend !== null;

  const rawGet = (key: string): string | null => {
    if (backend) {
      try {
        return backend.getItem(key);
      } catch {
        persistent = false;
        backend = null;
      }
    }
    return memory.get(key) ?? null;
  };

  return {
    get persistent() {
      return persistent;
    },
    read<T>(key: StorageKey, validate: Validator<T>, fallback: T): T {
      const raw = rawGet(key);
      if (raw === null) return fallback;
      try {
        const parsed: unknown = JSON.parse(raw);
        return validate(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    },
    write(key: StorageKey, value: unknown): boolean {
      const serialized = JSON.stringify(value);
      memory.set(key, serialized);
      if (!backend) return false;
      try {
        backend.setItem(key, serialized);
        return true;
      } catch {
        persistent = false;
        backend = null;
        return false;
      }
    },
    remove(key: StorageKey): void {
      memory.delete(key);
      try {
        backend?.removeItem(key);
      } catch {
        persistent = false;
      }
    },
    clearAll(): void {
      for (const key of Object.values(STORAGE_KEYS)) this.remove(key);
    },
  };
}

let browserStore: SafeStore | null = null;

/** Lazily creates the localStorage-backed store. Call only from client-side code. */
export function getBrowserStore(): SafeStore {
  if (!browserStore) {
    browserStore = createStore(() => (typeof window === 'undefined' ? null : window.localStorage));
  }
  return browserStore;
}

// ---------- Validators ----------

export const isStringArray: Validator<string[]> = (value): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 80);

export interface NoteEntry {
  text: string;
  reviewDate: string | null;
  updatedAt: string;
}

export type NotesMap = Record<string, NoteEntry>;

export const NOTE_MAX_LENGTH = 2000;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isNotesMap: Validator<NotesMap> = (value): value is NotesMap => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.text === 'string' &&
      e.text.length <= NOTE_MAX_LENGTH &&
      (e.reviewDate === null || (typeof e.reviewDate === 'string' && ISO_DAY.test(e.reviewDate))) &&
      typeof e.updatedAt === 'string'
    );
  });
};

export interface CheckEntry {
  plantId: string;
  ruleId: string;
  period: string;
  at: string;
}

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isCheckList: Validator<CheckEntry[]> = (value): value is CheckEntry[] =>
  Array.isArray(value) &&
  value.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.plantId === 'string' &&
      typeof e.ruleId === 'string' &&
      typeof e.period === 'string' &&
      PERIOD.test(e.period) &&
      typeof e.at === 'string'
    );
  });

// ---------- Favorites ----------

export function readFavorites(store: SafeStore, knownIds?: ReadonlySet<string>): string[] {
  const list = store.read(STORAGE_KEYS.favorites, isStringArray, []);
  const unique = [...new Set(list)];
  return knownIds ? unique.filter((id) => knownIds.has(id)) : unique;
}

/** Adds a plant once; returns false when it was already saved. */
export function addFavorite(store: SafeStore, plantId: string): boolean {
  const list = readFavorites(store);
  if (list.includes(plantId)) return false;
  store.write(STORAGE_KEYS.favorites, [...list, plantId]);
  return true;
}

/** Removes a plant and returns its previous index so the removal can be undone. */
export function removeFavorite(store: SafeStore, plantId: string): number {
  const list = readFavorites(store);
  const index = list.indexOf(plantId);
  if (index === -1) return -1;
  store.write(
    STORAGE_KEYS.favorites,
    list.filter((id) => id !== plantId),
  );
  return index;
}

export function restoreFavorite(store: SafeStore, plantId: string, index: number): void {
  const list = readFavorites(store).filter((id) => id !== plantId);
  const position = Math.max(0, Math.min(index, list.length));
  list.splice(position, 0, plantId);
  store.write(STORAGE_KEYS.favorites, list);
}

// ---------- Notes ----------

export function readNotes(store: SafeStore): NotesMap {
  return store.read(STORAGE_KEYS.notes, isNotesMap, {});
}

export function saveNote(store: SafeStore, plantId: string, patch: Partial<Pick<NoteEntry, 'text' | 'reviewDate'>>, now = new Date()): NoteEntry {
  const notes = readNotes(store);
  const previous = notes[plantId] ?? { text: '', reviewDate: null, updatedAt: now.toISOString() };
  const next: NoteEntry = {
    text: (patch.text ?? previous.text).slice(0, NOTE_MAX_LENGTH),
    reviewDate: patch.reviewDate === undefined ? previous.reviewDate : patch.reviewDate,
    updatedAt: now.toISOString(),
  };
  store.write(STORAGE_KEYS.notes, { ...notes, [plantId]: next });
  return next;
}

// ---------- Checks ----------

export function readChecks(store: SafeStore): CheckEntry[] {
  return store.read(STORAGE_KEYS.checks, isCheckList, []);
}

export function isChecked(checks: readonly CheckEntry[], plantId: string, ruleId: string, period: string): boolean {
  return checks.some((c) => c.plantId === plantId && c.ruleId === ruleId && c.period === period);
}

/** Toggles a completion for one plant, rule and planning month. Returns the new checked state. */
export function toggleCheck(store: SafeStore, plantId: string, ruleId: string, period: string, now = new Date()): boolean {
  const checks = readChecks(store);
  if (isChecked(checks, plantId, ruleId, period)) {
    store.write(
      STORAGE_KEYS.checks,
      checks.filter((c) => !(c.plantId === plantId && c.ruleId === ruleId && c.period === period)),
    );
    return false;
  }
  store.write(STORAGE_KEYS.checks, [...checks, { plantId, ruleId, period, at: now.toISOString() }].slice(-500));
  return true;
}

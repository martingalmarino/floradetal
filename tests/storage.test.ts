import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  addFavorite,
  createStore,
  isChecked,
  readChecks,
  readFavorites,
  readNotes,
  removeFavorite,
  restoreFavorite,
  saveNote,
  toggleCheck,
  type StorageBackend,
} from '../src/lib/storage';

class MemoryBackend implements StorageBackend {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

class DeniedBackend implements StorageBackend {
  getItem(): string | null {
    throw new DOMException('denied', 'SecurityError');
  }
  setItem(): void {
    throw new DOMException('denied', 'SecurityError');
  }
  removeItem(): void {
    throw new DOMException('denied', 'SecurityError');
  }
}

describe('favoritos', () => {
  let backend: MemoryBackend;
  beforeEach(() => {
    backend = new MemoryBackend();
  });

  it('guarda, recarga y quita favoritos sin duplicados', () => {
    const store = createStore(() => backend);
    expect(addFavorite(store, 'tomate')).toBe(true);
    expect(addFavorite(store, 'tomate')).toBe(false);
    expect(addFavorite(store, 'romero')).toBe(true);

    const reloaded = createStore(() => backend);
    expect(readFavorites(reloaded)).toEqual(['tomate', 'romero']);

    const index = removeFavorite(reloaded, 'tomate');
    expect(readFavorites(reloaded)).toEqual(['romero']);
    restoreFavorite(reloaded, 'tomate', index);
    expect(readFavorites(reloaded)).toEqual(['tomate', 'romero']);
  });

  it('filtra IDs desconocidos y duplicados guardados por versiones anteriores', () => {
    backend.setItem(STORAGE_KEYS.favorites, JSON.stringify(['tomate', 'tomate', 'planta-inexistente']));
    const store = createStore(() => backend);
    expect(readFavorites(store, new Set(['tomate']))).toEqual(['tomate']);
  });

  it('JSON corrupto o con forma inválida vuelve al valor por defecto', () => {
    backend.setItem(STORAGE_KEYS.favorites, '{no es json');
    backend.setItem(STORAGE_KEYS.notes, JSON.stringify({ tomate: { text: 42 } }));
    backend.setItem(STORAGE_KEYS.checks, JSON.stringify([{ plantId: 'x', ruleId: 'y', period: '2026-13', at: '' }]));
    const store = createStore(() => backend);
    expect(readFavorites(store)).toEqual([]);
    expect(readNotes(store)).toEqual({});
    expect(readChecks(store)).toEqual([]);
  });

  it('almacenamiento no disponible: funciona en memoria y lo informa', () => {
    const store = createStore(() => new DeniedBackend());
    expect(store.persistent).toBe(false);
    expect(addFavorite(store, 'potus')).toBe(true);
    expect(readFavorites(store)).toEqual(['potus']);
  });

  it('acceso a localStorage que lanza excepción al obtenerlo', () => {
    const store = createStore(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(readFavorites(store)).toEqual([]);
  });

  it('borrar mis datos elimina todas las claves versionadas', () => {
    const store = createStore(() => backend);
    addFavorite(store, 'tomate');
    saveNote(store, 'tomate', { text: 'hola' });
    store.clearAll();
    expect(backend.data.size).toBe(0);
  });
});

describe('notas', () => {
  it('se guardan como texto plano, sin interpretar HTML', () => {
    const backend = new MemoryBackend();
    const store = createStore(() => backend);
    const html = '<img src=x onerror="alert(1)"> regar <b>poco</b>';
    saveNote(store, 'menta', { text: html });
    expect(readNotes(createStore(() => backend)).menta?.text).toBe(html);
  });

  it('guarda la fecha de revisión elegida por el usuario', () => {
    const store = createStore(() => new MemoryBackend());
    saveNote(store, 'menta', { reviewDate: '2026-11-02' });
    saveNote(store, 'menta', { text: 'trasplantar' });
    expect(readNotes(store).menta).toMatchObject({ text: 'trasplantar', reviewDate: '2026-11-02' });
  });
});

describe('revisiones completadas', () => {
  it('se registran por planta, regla y mes de planificación', () => {
    const store = createStore(() => new MemoryBackend());
    expect(toggleCheck(store, 'tomate', 'agua-humedad-pareja', '2026-10')).toBe(true);
    const checks = readChecks(store);
    expect(isChecked(checks, 'tomate', 'agua-humedad-pareja', '2026-10')).toBe(true);
    expect(isChecked(checks, 'tomate', 'agua-humedad-pareja', '2027-10')).toBe(false);
    expect(toggleCheck(store, 'tomate', 'agua-humedad-pareja', '2026-10')).toBe(false);
  });
});

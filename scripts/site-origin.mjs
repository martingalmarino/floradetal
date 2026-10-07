// Resolves the production origin from SITE_URL. Shared by astro.config.mjs and the release check.

const FORBIDDEN_HOSTS = ['example.com', 'example.org', 'example.net', 'localhost', '127.0.0.1'];

/**
 * @param {string | undefined} raw
 * @returns {{ ok: true, origin: string } | { ok: false, reason: string }}
 */
export function validateSiteOrigin(raw) {
  if (!raw || raw.trim() === '') {
    return { ok: false, reason: 'Falta SITE_URL (origen público del sitio, por ejemplo https://tu-dominio-real).' };
  }
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: `SITE_URL no es una URL válida: "${raw}".` };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'SITE_URL debe usar https:// en producción.' };
  }
  const host = url.hostname.toLowerCase();
  if (FORBIDDEN_HOSTS.some((forbidden) => host === forbidden || host.endsWith(`.${forbidden}`))) {
    return { ok: false, reason: `SITE_URL apunta a un dominio de ejemplo o local (${host}).` };
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    return { ok: false, reason: 'SITE_URL debe ser solo el origen, sin ruta, parámetros ni fragmento.' };
  }
  return { ok: true, origin: url.origin };
}

/**
 * Returns the configured origin, or undefined in local development.
 * Throws when a production build is explicitly requested without a valid origin.
 * @param {Record<string, string | undefined>} env
 */
export function resolveSiteOrigin(env) {
  const requireOrigin = env.PV_REQUIRE_SITE === '1' || env.VERCEL_ENV === 'production';
  const result = validateSiteOrigin(env.SITE_URL);
  if (result.ok) return result.origin;
  if (requireOrigin) {
    throw new Error(`[patio-verde] Build de producción bloqueado: ${result.reason}`);
  }
  if (env.SITE_URL) {
    console.warn(`[patio-verde] SITE_URL ignorado: ${result.reason}`);
  }
  return undefined;
}

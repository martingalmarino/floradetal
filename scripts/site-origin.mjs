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
 * SITE_URL wins. On Vercel production builds without SITE_URL, falls back to the project's
 * production domain (custom domain if assigned, otherwise *.vercel.app).
 * @param {Record<string, string | undefined>} env
 * @returns {string | undefined}
 */
export function siteUrlFromEnv(env) {
  if (env.SITE_URL && env.SITE_URL.trim() !== '') return env.SITE_URL;
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return undefined;
}

/**
 * Returns the configured origin, or undefined in local development.
 * Throws when a production build is explicitly requested without a valid origin.
 * @param {Record<string, string | undefined>} env
 */
export function resolveSiteOrigin(env) {
  const requireOrigin = env.PV_REQUIRE_SITE === '1' || env.VERCEL_ENV === 'production';
  const raw = siteUrlFromEnv(env);
  const result = validateSiteOrigin(raw);
  if (result.ok) return result.origin;
  if (requireOrigin) {
    throw new Error(`[flora-de-tal] Build de producción bloqueado: ${result.reason}`);
  }
  if (raw) {
    console.warn(`[flora-de-tal] SITE_URL ignorado: ${result.reason}`);
  }
  return undefined;
}

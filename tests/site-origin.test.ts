import { describe, expect, it } from 'vitest';
import { resolveSiteOrigin, validateSiteOrigin } from '../scripts/site-origin.mjs';

describe('validateSiteOrigin', () => {
  it('accepts a real https origin', () => {
    expect(validateSiteOrigin('https://floradetal.com.ar/')).toEqual({ ok: true, origin: 'https://floradetal.com.ar' });
  });

  it.each(['', 'http://floradetal.com.ar', 'https://example.com', 'https://www.example.org', 'https://localhost', 'https://floradetal.com.ar/blog'])(
    'rejects %s',
    (raw) => {
      expect(validateSiteOrigin(raw).ok).toBe(false);
    },
  );
});

describe('resolveSiteOrigin', () => {
  it('returns undefined in local builds without SITE_URL', () => {
    expect(resolveSiteOrigin({})).toBeUndefined();
  });

  it('prefers SITE_URL over the Vercel production domain', () => {
    expect(
      resolveSiteOrigin({
        VERCEL_ENV: 'production',
        SITE_URL: 'https://floradetal.com.ar',
        VERCEL_PROJECT_PRODUCTION_URL: 'floradetal.vercel.app',
      }),
    ).toBe('https://floradetal.com.ar');
  });

  it('uses the Vercel production domain when SITE_URL is missing', () => {
    expect(resolveSiteOrigin({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'floradetal.vercel.app' })).toBe(
      'https://floradetal.vercel.app',
    );
  });

  it('does not use the production domain for preview deployments', () => {
    expect(resolveSiteOrigin({ VERCEL_ENV: 'preview', VERCEL_PROJECT_PRODUCTION_URL: 'floradetal.vercel.app' })).toBeUndefined();
  });

  it('fails a production build with no origin at all', () => {
    expect(() => resolveSiteOrigin({ VERCEL_ENV: 'production' })).toThrow(/Falta SITE_URL/);
    expect(() => resolveSiteOrigin({ PV_REQUIRE_SITE: '1' })).toThrow(/Falta SITE_URL/);
  });

  it('fails a production build pointing to an example domain', () => {
    expect(() => resolveSiteOrigin({ VERCEL_ENV: 'production', SITE_URL: 'https://example.com' })).toThrow(/ejemplo/);
  });
});

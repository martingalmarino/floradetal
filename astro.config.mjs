// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { resolveSiteOrigin } from './scripts/site-origin.mjs';

const site = resolveSiteOrigin(process.env);

const PRIVATE_PATHS = ['/mi-jardin/', '/404/'];

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: false,
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) => !PRIVATE_PATHS.some((path) => new URL(page).pathname === path),
    }),
  ],
});

// Production release gate: refuses to build without a real public origin.
import { siteUrlFromEnv, validateSiteOrigin } from './site-origin.mjs';

const result = validateSiteOrigin(siteUrlFromEnv(process.env));

if (!result.ok) {
  console.error(`\n✖ Chequeo de release: ${result.reason}`);
  console.error('  Configurá SITE_URL con el dominio real antes de publicar. Ver README.md → Deploy.\n');
  process.exit(1);
}

console.log(`✔ Chequeo de release: origen configurado ${result.origin}`);

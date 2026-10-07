# Flora de Tal

MVP de un sitio de jardinería hogareña para Argentina: ayuda a elegir plantas según el espacio, la luz y el tiempo
disponible, y a planificar cuidados simples. El nombre se define en `SITE_NAME` (`src/lib/site.ts`).

> **Alcance del contenido.** Las 40 fichas, el calendario y las reglas de cuidado son una **referencia inicial**
> compilada el 6 de octubre de 2026 a partir de las fuentes de `src/data/sources.json`. No tienen revisión
> agronómica profesional y el calendario es orientativo para clima templado: no es un calendario verificado por
> ciudad ni un pronóstico. Ver [`docs/content-methodology.md`](docs/content-methodology.md).

## Requisitos

- Node.js 22.12 o superior y npm.
- Para el smoke test de navegador: Google Chrome instalado, o Chromium de Playwright (ver más abajo).

## Uso

```bash
npm install
npm run dev            # servidor de desarrollo en http://localhost:4321
npm run build          # build estático en dist/ (sin SITE_URL: sin canonical ni sitemap)
npm run preview        # sirve dist/ localmente
```

## Comandos de calidad

| Comando | Qué hace |
| --- | --- |
| `npm run check` | Chequeo de tipos de Astro + TypeScript estricto |
| `npm test` | Tests unitarios (Vitest): recomendaciones, calculadora, calendario, almacenamiento y datos |
| `npm run validate:data` | Solo la validación de datos (esquemas Zod + integridad referencial) |
| `npm run check:links` | Revisa enlaces internos, recursos y anclas en `dist/` (correr después de `build`) |
| `npm run test:e2e` | Smoke test con Playwright (compila y levanta un preview en el puerto 4322) |
| `npm run build:production` | Build de release: falla si `SITE_URL` falta o no es válido |

El smoke test usa el Google Chrome instalado (`channel: 'chrome'`) y corre cada caso a 320 px y en escritorio.
Astro admite un solo `astro preview` por proyecto: si tenés uno corriendo, detenelo antes. Para usar el Chromium de
Playwright:

```bash
npx playwright install chromium
PW_CHANNEL= npm run test:e2e
```

## Configuración

Variables de entorno (ver `.env.example`):

- `SITE_URL` — origen público del sitio, por ejemplo `https://tu-dominio.com.ar`. Debe ser `https`, sin ruta, y no
  puede ser `example.*`, `localhost` ni `127.0.0.1`. Con `SITE_URL` el build genera URLs canónicas absolutas,
  `og:url`, `og:image`, `sitemap-index.xml` y la referencia al sitemap en `robots.txt`. Sin `SITE_URL` el build de
  desarrollo omite todo eso (nunca usa un dominio de ejemplo).
- `PUBLIC_ANALYTICS_ENABLED` — `false` por defecto. Aunque se ponga en `true`, no se envía nada hasta registrar un
  proveedor real con `registerAnalyticsAdapter()` en `src/lib/analytics.ts`. Los eventos previstos solo llevan valores
  gruesos (nunca notas ni texto libre).

## Deploy (Vercel u otro hosting estático)

No hay backend: cualquier hosting de archivos estáticos sirve.

1. Configurar la variable de entorno `SITE_URL` con el dominio real.
2. Comando de build: `npm run build:production`. Directorio de salida: `dist`.

En Vercel alcanza con importar el repositorio (preset Astro, build `npm run build`). En producción, si no hay
`SITE_URL`, se usa el dominio de producción del proyecto que informa Vercel (`VERCEL_PROJECT_PRODUCTION_URL`: el
dominio propio si está asignado, o el `*.vercel.app`). Si no hay ninguno de los dos, el build falla a propósito.
Los deploys de preview se compilan sin canonical ni sitemap.

El sitio usa barra final en todas las URLs (`/plantas/tomate/`). `dist/404.html` es la página de error.

## Arquitectura

```
src/
  data/                 Datos tipados en JSON (validados con Zod en el build)
    plants.json           40 fichas (generadas desde scripts/seed/starter-matrix.txt)
    calendar.json         Reglas de calendario, notas generales y overrides locales (vacío)
    localities.json       Localidades y su cobertura (referencia templada / solo general)
    care-rules.json       Revisiones de cuidado (no son frecuencias de riego)
    sources.json          Registro de fuentes con alcance y fecha de revisión
  content/guides/       Guías en Markdown (content collection)
  content.config.ts     Colecciones: plants (file loader) y guides (glob loader)
  lib/                  Lógica pura y testeable
    schemas.ts            Esquemas Zod y tipos
    data.ts               Carga validada + chequeos de integridad (solo build)
    catalog.ts            Acceso liviano a los datos para scripts del navegador
    recommendations.ts    Motor de recomendaciones determinístico
    calendar.ts           Período de planificación, reglas del mes, cobertura y textos
    calculator.ts         Volúmenes, parseo de decimales con coma, bolsas
    storage.ts            localStorage versionado con validación y fallback en memoria
    text.ts               Normalización sin tildes y orden en español
  scripts/              Interactividad por página (TypeScript sin framework)
  components/, layouts/, pages/, styles/
scripts/                Seed de plantas, chequeo de release y verificador de enlaces
tests/                  Tests unitarios (Vitest)
e2e/                    Smoke test de navegador (Playwright)
```

Decisiones principales:

- **Estático y sin cuentas.** Sin base de datos, APIs pagas, IA en tiempo de ejecución ni llamadas de red al cargar.
  Las páginas de contenido funcionan sin JavaScript; el selector, el calendario interactivo, la calculadora y Mi jardín
  lo necesitan y lo avisan.
- **Recomendaciones determinísticas** (`src/lib/recommendations.ts`): exclusiones duras (luz insuficiente, tamaño,
  objetivo), coincidencias condicionadas (viento, heladas, mantenimiento) y puntaje (luz 0–4, espacio 0–3, objetivo
  0–3, mantenimiento 0–2, −2 por condición). Hasta 6 buenas opciones y 4 alternativas con condiciones, cada una con
  dos motivos. La aptitud de la planta se calcula aparte de la fecha de siembra.
- **Calendario por cobertura.** Las localidades con `reference_temperate` ven la referencia de clima templado; las
  `general_only` (y "Otra localidad") ven "Consultá la época de siembra para tu zona" y pueden abrir la referencia
  con aviso. No se corren fechas automáticamente. El esquema de overrides locales existe pero está vacío y
  deshabilitado.
- **Mi jardín** usa claves versionadas `pv:v1:*` en `localStorage`; si el almacenamiento está bloqueado o corrupto,
  la página sigue funcionando en memoria y lo avisa. Las notas se muestran siempre como texto plano.

## Agregar o editar contenido

- Plantas: editar `scripts/seed/starter-matrix.txt` y regenerar con `node scripts/seed-plants.mjs`, o editar
  `src/data/plants.json` directamente. `npm run validate:data` detecta campos inválidos, ids repetidos, fuentes o
  reglas inexistentes.
- Guías: agregar un `.md` en `src/content/guides/` con el frontmatter de las existentes.
- Fuentes: registrar en `src/data/sources.json` antes de referenciarlas.

Procedimiento completo en [`docs/content-methodology.md`](docs/content-methodology.md).

## Limitaciones conocidas

- Contenido de referencia inicial sin revisión agronómica profesional; toxicidad para mascotas y estado nativo no
  evaluados.
- Imágenes: ilustraciones vectoriales por categoría (no fotos de cada especie).
- Calendario de referencia único para clima templado; sin calendarios locales verificados.
- Sin recordatorios ni notificaciones: Mi jardín solo funciona mientras el sitio está abierto y en el mismo
  navegador.

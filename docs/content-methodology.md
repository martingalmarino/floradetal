# Metodología de contenido

Este documento describe de dónde sale el contenido de Flora de Tal, qué supuestos tiene y cómo ampliarlo sin perder
trazabilidad. La versión pública resumida está en `/metodologia-y-fuentes/`.

## Estado actual

- **40 plantas** (huerta, aromáticas, flores e interior) con `editorialStatus: "starter_reference"` y
  `compiledAt: "2026-10-06"`.
- **Calendario**: una única cobertura, `temperate_reference` ("Calendario orientativo para clima templado"), con
  reglas por planta y método, más notas generales para cultivos sin regla específica.
- **Revisiones de cuidado**: seis reglas genéricas (humedad, secado, follaje, plantines, drenaje). No son frecuencias
  de riego ni de fertilización.
- **Fuentes**: registro en `src/data/sources.json`, con editor, título, URL, tipo (`argentina`,
  `foreign_reference`, `implementation`), alcance y fecha de revisión. Las fuentes de implementación (por ejemplo,
  la documentación de Astro) tienen `public: false` y no se muestran al usuario.

Ningún contenido tuvo revisión agronómica profesional. Es una compilación de referencia hecha a partir de las
fuentes citadas en cada ficha.

## Procedencia y criterios

1. Cada ficha cita al menos una fuente (`sourceIds`); cada regla de calendario y de cuidado cita la suya
   (`sourceId`). La validación falla si una referencia no existe.
2. Para calendario y prácticas de huerta se usan fuentes argentinas (hoy, publicaciones de INTA). Para datos
   botánicos generales (luz, tamaño, tolerancias) se usa una referencia extranjera de extensión universitaria
   (NC State Extension), marcada como `foreign_reference`: describe la especie, no las condiciones argentinas.
3. Los perfiles de luz, agua, heladas, mantenimiento y espacio son **categorías gruesas**, no valores medidos. Los
   campos numéricos opcionales (alturas, distancias, temperaturas) están en `null` hasta tener un dato verificado
   con fuente.
4. Las identidades ambiguas tienen nota explícita (`identityNotes`): por ejemplo, "tomate cherry" lleva a la ficha
   general del tomate y aclara que no significa planta compacta.

## Supuestos del calendario

- La referencia corresponde a zonas templadas de llanura. Las localidades se clasifican como
  `reference_temperate` (se ofrece la referencia, con notas como la de altura y heladas en Córdoba y Río Cuarto) o
  `general_only` (no se ofrece por defecto; se muestra "Consultá la época de siembra para tu zona").
- No se corren fechas automáticamente por latitud, altura ni clima.
- El "almácigo protegido" se presenta siempre como tal, nunca como siembra al aire libre.
- El mes de planificación se toma en la zona horaria `America/Argentina/Cordoba` y el usuario puede cambiarlo; no
  es un pronóstico.
- La aptitud de una planta para un espacio y la época de siembra son decisiones separadas: el selector solo dice
  "podés…" cuando existe una regla de la cobertura correspondiente para ese mes.

## Qué no fue evaluado

- **Toxicidad para mascotas y personas** (`petSafetyStatus: "not_evaluated"`): no existe un filtro "apta para
  mascotas" y la interfaz lo dice explícitamente.
- **Estado nativo o invasor** (`nativeRangeStatus: "not_evaluated"`).
- **Variedades**: las fichas son por especie o grupo; el tamaño, el ciclo y las fechas cambian según la variedad.
- **Plagas, enfermedades y diagnóstico**: fuera de alcance.

## Cómo ampliar el contenido

1. **Registrar la fuente** en `sources.json` (con `scopeNote` que diga para qué sirve y para qué no) y la fecha de
   revisión.
2. **Agregar o editar la planta** en `scripts/seed/starter-matrix.txt` y correr `node scripts/seed-plants.mjs`, o
   editar `src/data/plants.json`. Completar campos numéricos solo con dato verificado.
3. **Calendario**: agregar reglas en `calendar.json` con `coverageId`, `plantId`, `actionType`, `method`, `months`,
   `condition` y `sourceId`. Si no hay una fuente específica, usar una nota general en lugar de una regla.
4. **Validar**: `npm run validate:data`, `npm test`, `npm run build` y `npm run check:links`.
5. **Cambiar el estado editorial** (`editorialStatus`) solo cuando haya una revisión profesional documentada.

## Calendarios locales (pendiente)

El esquema `localOverrides` en `calendar.json` permite, a futuro, reglas por zona con `geographicScope`,
`growingContext` (`protected` u `open_air`), `reviewedAt` y `enabled`. Hoy está vacío. Para habilitar un calendario
local hace falta: una fuente local identificable (por ejemplo, una agencia de INTA), la definición del alcance
geográfico, revisión de una persona idónea y tests que cubran la nueva cobertura.

## Mejoras pendientes

- Revisión agronómica profesional de fichas y calendario.
- Evaluación de toxicidad para mascotas con fuentes específicas.
- Fotos con licencia y atribución (hoy son ilustraciones por categoría, marcadas como tales).
- Calendarios locales verificados para zonas fuera de la referencia templada.
- Datos numéricos (alturas, distancias de plantación) con fuente.

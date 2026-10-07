import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function next(page: Page) {
  await page.getByRole('button', { name: 'Siguiente' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('recorrido completo: selector → guardar → Mi jardín', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Encontrá plantas para tu espacio y aprendé a cuidarlas.');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('link', { name: 'Encontrar mis plantas' }).first().click();
  await expect(page).toHaveURL(/\/encontra-tu-planta\/$/);
  await expectNoHorizontalOverflow(page);

  // Validation identifies the field.
  await next(page);
  await expect(page.getByText('Elegí tu localidad o “Otra localidad”.')).toBeVisible();

  // Step A
  await page.getByLabel('Localidad').selectOption('cordoba-capital');
  await expect(page.getByText('La altura y las heladas pueden cambiar las fechas', { exact: false })).toBeVisible();
  await next(page);
  await expect(page.getByRole('heading', { name: '¿Cómo es tu espacio?' })).toBeFocused();

  // Step B
  await page.getByText('Balcón', { exact: true }).click();
  await page.getByText('Chico', { exact: true }).click();
  await next(page);

  // Step C
  await page.getByLabel('Horas de sol directo en el lugar de la planta').fill('8');
  await page.getByText('Mañana y tarde', { exact: true }).click();
  await next(page);

  // Step D
  await page.getByText('Aromáticas para cocina', { exact: true }).click();
  await page.getByText('Flores', { exact: true }).click();
  await next(page);

  // Step E
  await page.getByText('Poco', { exact: true }).click();
  await page.locator('label[for="wind-no"]').click();
  await page.locator('label[for="frost-si"]').click();
  await page.getByRole('button', { name: 'Encontrar mis plantas' }).click();

  const results = page.locator('[data-results]');
  await expect(page.getByRole('heading', { name: 'Plantas para tu espacio' })).toBeFocused();
  await expect(results.getByText('Calendario orientativo para clima templado').first()).toBeVisible();
  const goodNames = await page.locator('[data-results-good] .plant-card__title').allTextContents();
  expect(goodNames.length).toBeGreaterThan(0);
  expect(goodNames).not.toContain('Hortensia');
  expect(goodNames).not.toContain('Gomero');
  await expect(results).not.toContainText(/verificad|pronóstico de/i);
  await expectNoHorizontalOverflow(page);

  // Save the first good match.
  const firstName = goodNames[0]!;
  await page.locator('[data-results-good] [data-save-plant]').first().click();
  await expect(page.locator('.toast').first()).toContainText(`${firstName} se guardó en tu jardín`);
  await expect(page.locator('[data-garden-count]').first()).toHaveText('1');

  // Saving twice does not duplicate (second click toggles off, third adds once).
  await page.locator('[data-results-good] [data-save-plant]').first().click();
  await page.locator('[data-results-good] [data-save-plant]').first().click();
  const favorites = await page.evaluate(() => JSON.parse(localStorage.getItem('pv:v1:favorites') ?? '[]'));
  expect(favorites).toHaveLength(1);

  // Answers are retained after reload.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ver mis resultados' })).toBeVisible();

  // Mi jardín
  await page.goto('/mi-jardin/');
  await expect(page.getByText('Guardado en este dispositivo')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: firstName })).toBeVisible();
  const note = page.getByLabel('Tus notas');
  const html = '<img src=x onerror="window.__xss=1"> regar <b>poco</b>';
  await note.fill(html);
  await expect(page.getByText('Nota guardada en este dispositivo.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Tus notas')).toHaveValue(html);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await page.locator('.garden-item img').count()).toBe(0);

  // Care check
  const check = page.getByRole('button', { name: 'Ya lo revisé' }).first();
  await check.click();
  await expect(page.getByRole('button', { name: 'Ya lo revisé' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Historial de revisiones' })).toBeVisible();

  // Remove with undo
  await page.getByRole('button', { name: new RegExp(`Quitar ${firstName}`) }).click();
  await expect(page.getByText('Tu jardín empieza con una planta.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByRole('heading', { level: 2, name: firstName })).toBeVisible();

  // Reset requires explicit confirmation.
  await page.getByRole('button', { name: 'Borrar mis datos' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: firstName })).toBeVisible();
  await page.getByRole('button', { name: 'Borrar mis datos' }).click();
  await page.getByRole('button', { name: 'Sí, borrar todo' }).click();
  await expect(page.getByText('Tu jardín empieza con una planta. Explorá opciones y guardá las que te gusten.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pv:v1:notes'))).toBeNull();
});

test('interior sin luz natural explica que la luz tiene que cambiar', async ({ page }) => {
  await page.goto('/encontra-tu-planta/');
  await page.getByLabel('Localidad').selectOption('bariloche');
  await expect(page.getByText('Todavía no tenemos fechas de siembra específicas para esta zona.', { exact: false })).toBeVisible();
  await next(page);
  await page.getByText('Interior', { exact: true }).click();
  await page.getByText('Mediano', { exact: true }).click();
  await next(page);
  await page.getByText('Sin luz natural', { exact: true }).click();
  await next(page);
  await page.getByText('Follaje', { exact: true }).click();
  await next(page);
  await page.getByText('Poco', { exact: true }).click();
  await page.getByRole('button', { name: 'Encontrar mis plantas' }).click();
  await expect(page.getByText('la condición de luz tiene que cambiar', { exact: false })).toBeVisible();
  expect(await page.locator('[data-results-good] .plant-card').count()).toBe(0);
});

test('directorio: búsqueda sin tildes, filtros y estado vacío', async ({ page }) => {
  await page.goto('/plantas/');
  await expect(page.locator('[data-count]')).toHaveText('40 plantas');
  await page.getByRole('searchbox', { name: 'Buscar' }).fill('rucula');
  await expect(page.locator('[data-count]')).toHaveText('1 planta');
  await page.getByRole('searchbox', { name: 'Buscar' }).fill('rúcula');
  await expect(page.locator('[data-count]')).toHaveText('1 planta');
  await page.getByRole('searchbox', { name: 'Buscar' }).fill('xyzzy');
  await expect(page.getByRole('heading', { name: 'No encontramos plantas con esa combinación' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).last().click();
  await expect(page.locator('[data-count]')).toHaveText('40 plantas');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('interior');
  await expect(page.locator('[data-count]')).toHaveText('8 plantas');
  await expectNoHorizontalOverflow(page);
});

test('ficha de planta: contenido estático, calendario con condición y fuentes', async ({ page }) => {
  await page.goto('/plantas/tomate/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tomate');
  await expect(page.getByText('Iniciar almácigo en almácigo protegido (no es siembra al aire libre)')).toBeVisible();
  await expect(page.getByText('Mantener protección térmica', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: /NC State — Solanum lycopersicum/ })).toBeVisible();
  await expect(page.getByText('no fue evaluada', { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('calculadora: fixtures, coma decimal y errores por campo', async ({ page }) => {
  await page.goto('/calculadora-de-sustrato/');
  await page.getByRole('button', { name: 'Calcular litros' }).click();
  await expect(page.getByText('Diámetro interno: completá este dato.')).toBeVisible();
  await page.getByLabel(/Diámetro interno/).fill('30');
  await page.getByLabel(/Altura de llenado/).fill('25');
  await page.getByRole('button', { name: 'Calcular litros' }).click();
  await expect(page.locator('[data-results]')).toContainText('17,7 L');
  await expect(page.locator('[data-results]')).toContainText('1 bolsa de 20 L');

  await page.getByText('Jardinera o cantero rectangular').click();
  await page.getByLabel(/Largo interno/).fill('60');
  await page.getByLabel(/Ancho interno/).fill('20');
  await page.getByLabel(/Altura de llenado/).fill('20');
  await page.getByRole('button', { name: 'Calcular litros' }).click();
  await expect(page.locator('[data-results]')).toContainText('24 L');
  await expect(page.locator('[data-results]')).toContainText('2 bolsas de 20 L');

  await page.getByLabel(/Largo interno/).fill('12,5');
  await page.getByLabel(/Ancho interno/).fill('10');
  await page.getByLabel(/Altura de llenado/).fill('8');
  await page.getByRole('button', { name: 'Calcular litros' }).click();
  await expect(page.locator('[data-results]')).toContainText('1 L');

  await page.getByText('Maceta redonda que se angosta hacia abajo').click();
  await page.getByLabel(/Diámetro en la línea de llenado/).fill('18');
  await page.getByLabel(/Diámetro de la base/).fill('20');
  await page.getByLabel(/Altura de llenado/).fill('25');
  await page.getByRole('button', { name: 'Calcular litros' }).click();
  await expect(page.getByText('tiene que ser igual o mayor que el de la base', { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('calendario: diciembre → enero cambia de año y Bariloche no hereda fechas', async ({ page }) => {
  await page.goto('/calendario/');
  await page.getByLabel('Mes de planificación', { exact: false }).selectOption('12');
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  const year = Number(await page.locator('[data-cal-year]').textContent());
  await expect(page.locator('[data-cal-output-title]')).toHaveText(`Tareas de referencia para enero de ${year}`);
  await expect(page.locator('[data-cal-groups]')).toContainText('Chaucha');

  await page.getByLabel('Tu zona').selectOption('bariloche');
  await expect(page.getByText('Todavía no tenemos fechas de siembra específicas para esta zona.', { exact: false })).toBeVisible();
  await expect(page.locator('[data-cal-groups]')).not.toContainText('Chaucha');
  await page.getByRole('button', { name: 'Consultar igualmente la referencia de clima templado' }).click();
  await expect(page.locator('[data-cal-groups]')).toContainText('Chaucha');
  await expect(page.getByText('no fue pensada para tu zona', { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('almacenamiento corrupto o no disponible no rompe Mi jardín', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('pv:v1:favorites', '{no es json'));
  await page.goto('/mi-jardin/');
  await expect(page.getByText('Tu jardín empieza con una planta.', { exact: false })).toBeVisible();

  const blocked = await context.newPage();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await blocked.goto('/mi-jardin/');
  await expect(blocked.getByText('Este navegador no permite guardar datos.', { exact: false })).toBeVisible();
  await blocked.close();
});

test('teclado: el enlace para saltar al contenido funciona', async ({ page }) => {
  await page.goto('/plantas/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contenido')).toBeFocused();
});

test('SEO: mi jardín no se indexa y el 404 ofrece búsqueda', async ({ page }) => {
  await page.goto('/mi-jardin/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/no-existe/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No encontramos esta página');
});

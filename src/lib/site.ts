export const SITE_NAME = 'Flora de Tal';
export const SITE_PROMISE = 'Encontrá plantas para tu espacio y aprendé a cuidarlas.';
export const SITE_SUPPORT =
  'Contanos cómo es tu balcón, patio o jardín. Te ayudamos a elegir plantas según la luz, el espacio y el tiempo que tenés.';

export const NAV_ITEMS = [
  { href: '/encontra-tu-planta/', label: 'Encontrá tu planta' },
  { href: '/plantas/', label: 'Plantas' },
  { href: '/calendario/', label: 'Calendario' },
  { href: '/calculadora-de-sustrato/', label: 'Calculadora' },
  { href: '/mi-jardin/', label: 'Mi jardín' },
] as const;

export const GUIDES_ORDER = [
  'como-medir-la-luz-para-tus-plantas',
  'como-saber-si-una-planta-necesita-riego',
  'como-elegir-una-maceta',
] as const;

export function plantPath(slug: string): string {
  return `/plantas/${slug}/`;
}

// Category-level vector illustrations. They do not depict an exact species and are always
// labelled as illustrations in the interface.
import type { Category } from './schemas';

const BG = '#eaf0e5';
const SOIL = '#c9b79c';
const GREEN = '#3f7a5e';
const GREEN_LIGHT = '#7fae8a';
const FOREST = '#183d32';
const TERRA = '#af573c';
const CREAM = '#f7f5ef';

const huerta = `
<rect width="320" height="180" fill="${BG}"/>
<circle cx="262" cy="40" r="18" fill="#f1d9a7"/>
<path d="M0 140h320v40H0z" fill="${SOIL}"/>
<path d="M0 140c60-8 120-8 160-4s110 6 160-2v8H0z" fill="#b8a283"/>
<g stroke="${FOREST}" stroke-width="2.5" stroke-linecap="round" fill="none">
  <path d="M70 140V92"/><path d="M160 140V80"/><path d="M250 140v-38"/>
</g>
<g fill="${GREEN}">
  <path d="M70 112c-18 0-26-12-26-22 16 0 26 8 26 22z"/><path d="M70 102c16-2 26-14 26-24-16 0-26 10-26 24z"/>
  <path d="M160 104c-20 0-30-14-30-26 18 0 30 10 30 26z"/><path d="M160 92c18-2 30-16 30-28-18 0-30 12-30 28z"/>
  <path d="M250 118c-14 0-22-10-22-18 12 0 22 6 22 18z"/><path d="M250 110c14-2 22-12 22-20-12 0-22 8-22 20z"/>
</g>
<g fill="${GREEN_LIGHT}">
  <path d="M115 140c-10-4-14-14-12-22 8 4 12 12 12 22z"/><path d="M115 140c10-4 14-14 12-22-8 4-12 12-12 22z"/>
  <path d="M205 140c-10-4-14-14-12-22 8 4 12 12 12 22z"/><path d="M205 140c10-4 14-14 12-22-8 4-12 12-12 22z"/>
</g>`;

const aromatica = `
<rect width="320" height="180" fill="${BG}"/>
<rect x="0" y="150" width="320" height="30" fill="#dcd3c1"/>
<g stroke="${FOREST}" stroke-width="2.2" stroke-linecap="round" fill="none">
  <path d="M110 112V62"/><path d="M96 112V76"/><path d="M124 112V70"/>
  <path d="M210 112V58"/><path d="M196 112V80"/><path d="M226 112V72"/>
</g>
<g fill="${GREEN}">
  <ellipse cx="110" cy="62" rx="6" ry="10"/><ellipse cx="102" cy="76" rx="6" ry="9" transform="rotate(-30 102 76)"/>
  <ellipse cx="118" cy="84" rx="6" ry="9" transform="rotate(30 118 84)"/><ellipse cx="124" cy="70" rx="5" ry="8"/>
  <ellipse cx="96" cy="92" rx="5" ry="8" transform="rotate(-25 96 92)"/>
</g>
<g fill="${GREEN_LIGHT}">
  <path d="M210 58c-4 10-4 20 0 30 4-10 4-20 0-30z"/><path d="M196 80c-6 6-8 14-6 22 6-6 8-14 6-22z"/>
  <path d="M226 72c6 6 8 14 6 22-6-6-8-14-6-22z"/><path d="M210 80c-8 4-12 12-12 20 8-4 12-12 12-20z"/>
  <path d="M212 76c8 4 12 12 12 20-8-4-12-12-12-20z"/>
</g>
<path d="M78 112h64l-8 40h-48z" fill="${TERRA}"/><rect x="74" y="106" width="72" height="10" rx="3" fill="#c26a4e"/>
<path d="M178 112h64l-8 40h-48z" fill="${TERRA}"/><rect x="174" y="106" width="72" height="10" rx="3" fill="#c26a4e"/>`;

const flores = `
<rect width="320" height="180" fill="${BG}"/>
<path d="M0 150h320v30H0z" fill="#cbd9c0"/>
<g stroke="${FOREST}" stroke-width="2.5" stroke-linecap="round" fill="none">
  <path d="M90 150c0-30 4-50 10-70"/><path d="M160 150V64"/><path d="M230 150c0-28-4-46-10-62"/>
</g>
<g fill="${GREEN}">
  <path d="M160 120c-16 0-26-10-26-20 14 0 26 6 26 20z"/><path d="M160 110c16-2 24-12 24-22-14 0-24 8-24 22z"/>
  <path d="M94 124c-12-2-18-10-18-18 10 0 18 6 18 18z"/><path d="M226 120c12-2 18-10 18-18-10 0-18 6-18 18z"/>
</g>
<g fill="${TERRA}">
  <circle cx="100" cy="68" r="9"/><circle cx="88" cy="80" r="9"/><circle cx="112" cy="80" r="9"/><circle cx="94" cy="94" r="9"/><circle cx="108" cy="94" r="9"/>
</g>
<circle cx="100" cy="84" r="7" fill="#f1d9a7"/>
<g fill="#e9b949">
  <ellipse cx="160" cy="44" rx="7" ry="13"/><ellipse cx="160" cy="76" rx="7" ry="13"/>
  <ellipse cx="144" cy="60" rx="13" ry="7"/><ellipse cx="176" cy="60" rx="13" ry="7"/>
</g>
<circle cx="160" cy="60" r="8" fill="${TERRA}"/>
<g fill="#9b7bb8"><circle cx="220" cy="74" r="8"/><circle cx="210" cy="86" r="8"/><circle cx="230" cy="86" r="8"/><circle cx="220" cy="96" r="7"/></g>
<circle cx="220" cy="86" r="5" fill="${CREAM}"/>`;

const interior = `
<rect width="320" height="180" fill="${BG}"/>
<rect x="196" y="18" width="92" height="104" rx="6" fill="${CREAM}" stroke="#c9d6c0" stroke-width="3"/>
<path d="M242 18v104M196 70h92" stroke="#c9d6c0" stroke-width="3"/>
<rect x="0" y="152" width="320" height="28" fill="#dcd3c1"/>
<g fill="${GREEN}">
  <path d="M130 112c-30-6-50-30-46-56 26 6 44 28 46 56z"/>
  <path d="M136 110c6-34 28-56 56-58-2 30-24 52-56 58z"/>
</g>
<g fill="${GREEN_LIGHT}">
  <path d="M132 112c-8-30 0-62 22-80 10 28 2 60-22 80z"/>
  <path d="M128 114c-20-14-44-12-58 2 18 14 42 12 58-2z"/>
</g>
<g stroke="${FOREST}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6">
  <path d="M130 110 98 66"/><path d="M134 110l44-50"/><path d="M132 110l20-70"/>
</g>
<path d="M100 112h70l-8 42h-54z" fill="${TERRA}"/><rect x="96" y="106" width="78" height="10" rx="3" fill="#c26a4e"/>`;

const BODIES: Record<Category, string> = { huerta, aromatica, flores, interior };

export function categoryIllustration(category: Category, title: string): string {
  const safeTitle = title.replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" role="img" aria-label="${safeTitle}" preserveAspectRatio="xMidYMid slice">${BODIES[category]}</svg>`;
}

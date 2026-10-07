// Consistent 24×24 line icons (stroke = currentColor). Static, trusted markup only.
export const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'sun-cloud': '<path d="M8 3v1.5M3.8 4.8l1 1M2 9h1.5M12.2 4.8l-1 1"/><path d="M5.3 11.5A3.5 3.5 0 1 1 11.6 8"/><path d="M8.5 20h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8.5 20Z"/>',
  shade: '<path d="M4 15h16"/><path d="M6 15a6 6 0 0 1 12 0"/><path d="M12 15v6M9 21h6"/><path d="M12 3v3"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/>',
  droplet: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z"/>',
  leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z"/><path d="M12 14c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5Z"/>',
  flower: '<circle cx="12" cy="8.5" r="1.7"/><circle cx="12" cy="4.9" r="1.9"/><circle cx="15.6" cy="8.5" r="1.9"/><circle cx="8.4" cy="8.5" r="1.9"/><circle cx="12" cy="12.1" r="1.9"/><path d="M12 14v7M12 18.5c-2 0-3.5-1-4-2.8 2 0 3.5.8 4 2.8Z"/>',
  herb: '<path d="M12 21V8"/><path d="M12 12c-2.5 0-4.5-1.6-4.5-4 2.5 0 4.5 1.6 4.5 4ZM12 9c2.5 0 4.5-1.6 4.5-4-2.5 0-4.5 1.6-4.5 4ZM12 16c2.5 0 4.5-1.6 4.5-4-2.5 0-4.5 1.6-4.5 4Z"/>',
  pot: '<path d="M5 10h14l-1.6 9.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8L5 10Z"/><path d="M4 7h16v3H4z"/><path d="M12 7V4m0 0c-1.5-1.5-3.5-1.5-4.5-1 0 1.5 2 2.5 4.5 1Zm0 0c1.5-1.5 3.5-1.5 4.5-1 0 1.5-2 2.5-4.5 1Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.8-5"/>',
  'arrow-left': '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17h.01"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
  snowflake: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  ruler: '<path d="m3 16.5 13.5-13.5 4.5 4.5L7.5 21 3 16.5Z"/><path d="m7 12.5 2 2M10 9.5l2 2M13 6.5l2 2"/>',
  note: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4M8.5 12h7M8.5 15.5h7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  map: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function iconSvg(name: IconName, size = 20, label?: string): string {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${ICON_PATHS[name]}</svg>`;
}

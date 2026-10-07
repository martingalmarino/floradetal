import { track } from '../lib/analytics';
import { showToast } from './ui';

export interface SharePayload {
  title: string;
  text: string;
  /** Public path or absolute URL. Personal notes and location are never included. */
  url: string;
}

function absolute(url: string): string {
  return new URL(url, window.location.origin).href;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** Web Share API on explicit click, with an accurate copy-to-clipboard fallback. */
export async function sharePayload(payload: SharePayload): Promise<void> {
  const url = absolute(payload.url);
  track('share_click', { method: 'native_or_copy' });
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const copied = await copyText(`${payload.text} ${url}`);
  showToast(copied ? 'Enlace copiado.' : `No pudimos copiar el enlace. Copialo a mano: ${url}`, undefined, copied ? 4000 : 10000);
}

/** Opens WhatsApp's composer with the text; nothing is sent automatically. */
export function shareOnWhatsApp(payload: SharePayload): void {
  track('share_click', { method: 'whatsapp' });
  const message = `${payload.text} ${absolute(payload.url)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

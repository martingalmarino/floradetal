import { iconSvg, type IconName } from '../lib/icons';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Shows a short status message in the polite live region, optionally with one action. */
export function showToast(message: string, action?: ToastAction, durationMs = 6000): void {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--small';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.append(button);
  }
  region.append(toast);
  window.setTimeout(() => toast.remove(), durationMs);
}

/** Creates an element with optional class and plain-text content (never parses HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (Node | string | null | undefined | false)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) for (const [key, value] of Object.entries(options.attrs)) node.setAttribute(key, value);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Inserts one of the static, trusted line icons. */
export function icon(name: IconName, size = 18): Element {
  const template = document.createElement('template');
  template.innerHTML = iconSvg(name, size);
  return template.content.firstElementChild as Element;
}

export function illustrationNode(markup: string): Element {
  const template = document.createElement('template');
  template.innerHTML = markup;
  return template.content.firstElementChild as Element;
}

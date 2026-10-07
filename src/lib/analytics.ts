// Optional analytics adapter. Disabled by default: nothing is sent unless the owner enables it
// (PUBLIC_ANALYTICS_ENABLED=true) AND registers a real provider adapter in client code.
export type AnalyticsEvent =
  | 'selector_start'
  | 'selector_complete'
  | 'plant_view'
  | 'garden_add'
  | 'calculator_complete'
  | 'share_click';

/** Only coarse, non-personal values are allowed: no notes, addresses or free text. */
export type AnalyticsProps = Record<string, string | number | boolean>;

export type AnalyticsAdapter = (event: AnalyticsEvent, props: AnalyticsProps) => void;

let adapter: AnalyticsAdapter | null = null;

const ENABLED = import.meta.env.PUBLIC_ANALYTICS_ENABLED === 'true';

export function registerAnalyticsAdapter(next: AnalyticsAdapter): void {
  adapter = next;
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (!ENABLED || !adapter) return;
  try {
    adapter(event, props);
  } catch {
    // Analytics must never break the experience.
  }
}

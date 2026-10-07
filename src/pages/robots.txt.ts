import type { APIRoute } from 'astro';

// No Disallow rules: crawlers must be able to read the noindex tags on personal pages.
export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site) lines.push('', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

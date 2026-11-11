/**
 * GET /api/export?token=YOUR_ADMIN_TOKEN
 * Downloads every signup stored in the SIGNUPS KV namespace as a CSV file,
 * ready to import into Mailchimp, Beehiiv, Kit or a spreadsheet.
 * Protected by the ADMIN_TOKEN secret (Cloudflare Pages > Settings > Variables and Secrets).
 */
const COLS = ['email', 'first_name', 'city', 'signed_up_at', 'first_signed_up_at', 'visitor_city', 'visitor_country', 'source'];
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // keep spreadsheet formulas from running
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return new Response('Not authorized', { status: 401 });
  if (!env.SIGNUPS) return new Response('The SIGNUPS KV binding is not set up.', { status: 503 });

  const rows = [COLS.join(',')];
  let cursor;
  do {
    const page = await env.SIGNUPS.list({ prefix: 'signup:', cursor });
    const records = await Promise.all(page.keys.map((k) => env.SIGNUPS.get(k.name, 'json')));
    records.filter(Boolean).forEach((r) => rows.push(COLS.map((c) => cell(r[c])).join(',')));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const day = new Date().toISOString().slice(0, 10);
  return new Response(rows.join('\n') + '\n', {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="catchin-sunsets-signups-${day}.csv"`,
      'cache-control': 'no-store'
    }
  });
}

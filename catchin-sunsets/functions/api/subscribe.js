/**
 * POST /api/subscribe
 * Cloudflare Pages Function that receives newsletter signups from the site form.
 *
 * Where signups go (configure in Cloudflare Pages > Settings):
 *   SIGNUPS      KV namespace binding. Each signup is stored under "signup:<email>".
 *   WEBHOOK_URL  Optional. Every signup is also POSTed here as JSON
 *                (Zapier, Make, Mailchimp/Beehiiv/Kit via automation, a Google Sheet script, etc.).
 * At least one of the two must be set, otherwise the endpoint answers 503 and the form shows
 * "Signups open soon".
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  const wantsHtml = !(request.headers.get('accept') || '').includes('application/json');
  const type = request.headers.get('content-type') || '';
  let data = {};
  try {
    data = type.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, message: 'We could not read that form. Please try again.' }, 400);
  }

  // Honeypot: bots fill the hidden "company" field. Pretend it worked.
  if (clean(data.company, 100)) return wantsHtml ? Response.redirect(new URL('/thanks.html', request.url).toString(), 303) : json({ ok: true });

  const email = clean(data.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ ok: false, message: 'Enter a valid email address, like you@example.com.' }, 400);
  const age = data.age_21 === true || data.age_21 === 'yes' || data.age_21 === 'on';
  if (!age) return json({ ok: false, message: 'Confirm you are 21 or older to join.' }, 400);

  if (!env.SIGNUPS && !env.WEBHOOK_URL) return json({ ok: false, message: 'Signups are not connected yet.' }, 503);

  const record = {
    email,
    first_name: clean(data.first_name, 80),
    city: clean(data.city, 80),
    age_21: true,
    signed_up_at: new Date().toISOString(),
    visitor_country: request.cf?.country || '',
    visitor_city: request.cf?.city || '',
    source: 'catchin-sunsets-site'
  };

  try {
    if (env.SIGNUPS) {
      const key = `signup:${email}`;
      const existing = await env.SIGNUPS.get(key, 'json');
      if (existing?.signed_up_at) record.first_signed_up_at = existing.first_signed_up_at || existing.signed_up_at;
      await env.SIGNUPS.put(key, JSON.stringify(record));
    }
    if (env.WEBHOOK_URL) {
      const res = await fetch(env.WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record) });
      if (!res.ok && !env.SIGNUPS) throw new Error('webhook ' + res.status);
    }
  } catch (err) {
    console.error('signup failed', err);
    return json({ ok: false, message: 'Something went wrong on our side. Please try again in a minute.' }, 502);
  }

  return wantsHtml ? Response.redirect(new URL('/thanks.html', request.url).toString(), 303) : json({ ok: true });
}

export const onRequestGet = () => json({ ok: false, message: 'Use POST.' }, 405);

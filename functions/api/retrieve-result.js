// GET /api/retrieve-result?code=XXXXXXXX — patient retrieves result by code
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    if (!env.P24_RESULTS) return json({ ok: false, error: 'KV not configured' }, 500);
    const url  = new URL(request.url);
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();
    if (!code) return json({ ok: false, error: 'no code' }, 400);

    const raw = await env.P24_RESULTS.get('code:' + code);
    if (!raw) return json({ ok: false, error: 'not found' }, 404);

    const record = JSON.parse(raw);
    // Don't expose patient_email in the response
    const { patient_email, ...safe } = record;
    return json({ ok: true, result: safe });
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', ...cors() } });
}
function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' };
}

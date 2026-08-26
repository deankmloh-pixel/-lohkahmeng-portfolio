// POST /api/store-result — Desktop App pushes result + code to KV
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.P24_RESULTS) return json({ ok: false, error: 'KV not configured' }, 500);

    // Optional auth key to prevent abuse
    const apiKey = request.headers.get('x-api-key') || '';
    const expected = env.STORE_API_KEY || '';
    if (expected && apiKey !== expected) return json({ ok: false, error: 'unauthorized' }, 401);

    const b = await request.json();
    const code = (b.code || '').toString().trim().toUpperCase();
    if (!code || code.length < 4) return json({ ok: false, error: 'invalid code' }, 400);

    const record = {
      code,
      patient_name:  (b.patient_name  || '').toString().trim(),
      patient_email: (b.patient_email || '').toString().trim(),
      class_name:    (b.class_name    || '').toString().trim(),
      zone:          (b.zone          || '').toString().trim(),
      binary_prob:   parseFloat(b.binary_prob) || 0,
      probs4:        Array.isArray(b.probs4) ? b.probs4.map(Number) : [0,0,0,0],
      description:   (b.description   || '').toString().trim(),
      timestamp:     (b.timestamp     || new Date().toISOString()).toString(),
      expires:       Date.now() + 7 * 24 * 60 * 60 * 1000  // 7 days
    };

    // Store with 7-day TTL (604800 seconds)
    await env.P24_RESULTS.put('code:' + code, JSON.stringify(record), { expirationTtl: 604800 });
    return json({ ok: true, code });
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
  return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-api-key' };
}

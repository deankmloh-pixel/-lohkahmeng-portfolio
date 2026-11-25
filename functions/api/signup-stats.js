// POST /api/signup-stats {secret}
// READ-ONLY list of newsletter subscribers and Zero Homeless testers (25 Nov 2026).
// Protected by BROADCAST_SECRET (same key as /api/broadcast). Sends no email, changes nothing.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let secret = "";
    try { secret = ((await request.json()).secret || "").toString(); } catch (_) {}
    if (!env.BROADCAST_SECRET || secret !== env.BROADCAST_SECRET)
      return json({ ok: false, error: "unauthorized" }, 401);
    if (!env.DB)
      return json({ ok: false, error: "database not configured" }, 500);

    const subs = await safeAll(env.DB,
      "SELECT name, email, source, created_at FROM subscribers ORDER BY created_at");
    const testers = await safeAll(env.DB,
      "SELECT name, email, app, created_at FROM testers ORDER BY created_at");

    return json({
      ok: true,
      checked_at_utc: new Date().toISOString(),
      subscribers_total: subs.length,
      testers_total: testers.length,
      subscribers: subs,
      testers: testers
    });
  } catch (e) {
    return json({ ok: false, error: "server" }, 500);
  }
}

async function safeAll(db, sql) {
  try { const r = await db.prepare(sql).all(); return (r && r.results) || []; }
  catch (_) { return []; }   // table not created yet -> empty list
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

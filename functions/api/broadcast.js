// POST /api/broadcast { secret, subject, html }
// Auth by BROADCAST_SECRET. Reads D1 subscribers, sends via Resend (batches of 100), individualized.
// Each email gets a unique unsubscribe link (replaces %%UNSUBSCRIBE%% in html) + List-Unsubscribe headers.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!env.BROADCAST_SECRET || body.secret !== env.BROADCAST_SECRET) return json({ ok:false, error:"unauthorized" }, 401);
    const subject = (body.subject || "").toString().trim();
    const html = (body.html || "").toString();
    if (!subject || !html) return json({ ok:false, error:"subject and html required" }, 400);
    if (!env.RESEND_API_KEY) return json({ ok:false, error:"RESEND_API_KEY not set" }, 500);
    if (!env.DB) return json({ ok:false, error:"DB not bound" }, 500);
    const rows = await env.DB.prepare("SELECT email FROM subscribers").all();
    const emails = (rows.results || []).map(r => r.email).filter(Boolean);
    if (!emails.length) return json({ ok:true, sent:0, note:"no subscribers yet" });
    const FROM = env.FROM_EMAIL || "Dr Loh Kah Meng · AEGIS <aegisloh@aegishumanai.com>";
    let sent = 0, failed = 0, errors = [];
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = [];
      for (const to of emails.slice(i, i + 100)) {
        const t = await tok(to, env.BROADCAST_SECRET);
        const unsub = "https://aegishumanai.com/api/unsubscribe?e=" + encodeURIComponent(to) + "&t=" + t;
        chunk.push({
          from: FROM, to: [to], subject,
          html: html.split("%%UNSUBSCRIBE%%").join(unsub),
          headers: { "List-Unsubscribe": "<" + unsub + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, reply_to: env.REPLY_TO || "aegisloh@aegishumanai.com",
        });
      }
      const resp = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (resp.ok) sent += chunk.length; else { failed += chunk.length; errors.push((await resp.text()).slice(0,200)); }
    }
    return json({ ok: failed === 0, sent, failed, total: emails.length, errors });
  } catch (e) { return json({ ok:false, error:"server" }, 500); }
}
export async function onRequestOptions() { return new Response(null, { headers: { "access-control-allow-origin":"*", "access-control-allow-methods":"POST, OPTIONS", "access-control-allow-headers":"content-type" } }); }
async function tok(email, secret) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email + ":" + secret));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
function json(o, s=200){ return new Response(JSON.stringify(o), { status:s, headers:{ "content-type":"application/json","access-control-allow-origin":"*" } }); }

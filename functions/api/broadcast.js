// POST /api/broadcast  { secret, subject, message }
// Protected by BROADCAST_SECRET env var.
// Queries D1 (binding: DB, database: aegis-subs) and sends via Resend batch API.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { secret, subject, message } = body;

    if (!env.BROADCAST_SECRET || secret !== env.BROADCAST_SECRET)
      return json({ ok: false, error: "unauthorized" }, 401);
    if (!subject)
      return json({ ok: false, error: "subject required" }, 400);
    if (!env.RESEND_API_KEY)
      return json({ ok: false, error: "email not configured" }, 500);
    if (!env.DB)
      return json({ ok: false, error: "database not configured" }, 500);

    // Pull all subscribers
    const { results } = await env.DB.prepare(
      "SELECT name, email FROM subscribers ORDER BY created_at"
    ).all();

    if (!results || results.length === 0)
      return json({ ok: true, sent: 0, note: "no subscribers yet" });

    const FROM    = env.FROM_EMAIL || "Dr Loh Kah Meng · AEGIS <aegisloh@aegishumanai.com>";
    const bodyTxt = message ? escHtml(message) : "Visit aegishumanai.com to see the latest.";
    const html    = emailShell(
      subject,
      `<p style="margin:0 0 16px">${bodyTxt}</p>`,
      "Visit aegishumanai.com",
      "https://aegishumanai.com"
    );

    // Resend batch: up to 100 per call — we use 50 to stay safe
    const BATCH = 50;
    let sent = 0;
    for (let i = 0; i < results.length; i += BATCH) {
      const slice = results.slice(i, i + BATCH).map(s => ({
        from:     FROM,
        to:       [s.email],
        subject,
        html,
        reply_to: "aegisloh@aegishumanai.com"
      }));
      await fetch("https://api.resend.com/emails/batch", {
        method:  "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type":  "application/json"
        },
        body: JSON.stringify(slice)
      });
      sent += slice.length;
    }

    return json({ ok: true, sent, total: results.length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin":  "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

function emailShell(heading, bodyHtml, btnText, btnUrl) {
  return `<table role=presentation width=100% cellpadding=0 cellspacing=0 style="background:#0f1720;margin:0;padding:0"><tr><td align=center>
<table role=presentation width=600 cellpadding=0 cellspacing=0 style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif">
<tr><td align=center style="background:#0f1720;padding:26px 24px 16px">
  <div style="color:#c9a24b;font-size:13px;letter-spacing:4px;font-weight:bold">A E G I S</div>
  <div style="color:#8aa0b4;font-size:11px;letter-spacing:1px;margin-top:2px">HUMAN-AI AUGMENTING SYSTEMS</div>
</td></tr>
<tr><td style="padding:0 24px"><div style="height:2px;background:linear-gradient(90deg,rgba(201,162,75,0),#c9a24b,rgba(201,162,75,0))"></div></td></tr>
<tr><td style="background:#fff;padding:32px 34px 8px">
  <h1 style="color:#12202e;font-family:Georgia,serif;font-size:24px;margin:0 0 16px">${heading}</h1>
  <div style="color:#33475b;font-size:15px;line-height:1.6">${bodyHtml}</div>
  <table role=presentation cellpadding=0 cellspacing=0 style="margin:4px 0 26px">
    <tr><td bgcolor="#c9a24b" style="border-radius:10px">
      <a href="${btnUrl}" style="display:inline-block;padding:13px 28px;color:#0f1720;font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px">${btnText} &rarr;</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#fff;padding:0 34px 30px">
  <div style="height:1px;background:#e6ebf0;margin-bottom:14px"></div>
  <div style="color:#c9a24b;font-size:13px;font-style:italic;margin-bottom:8px">AEGIS &mdash; AI augments judgment, it does not replace it.</div>
  <div style="color:#93a4b4;font-size:12px;line-height:1.6">
    Questions? <a href="mailto:aegisloh@aegishumanai.com" style="color:#5a9fd4">aegisloh@aegishumanai.com</a><br>
    <a href="https://aegishumanai.com" style="color:#5a9fd4">aegishumanai.com</a>
  </div>
</td></tr>
</table></td></tr></table>`;
}

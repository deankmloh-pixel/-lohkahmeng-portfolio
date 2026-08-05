// POST /api/subscribe {email,name} -> store in D1. If new + Resend configured, send a WELCOME email.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let email = "", name = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) { const b = await request.json(); email=(b.email||"").toString().trim(); name=(b.name||"").toString().trim(); }
    else { const f = await request.formData(); email=(f.get("email")||"").toString().trim(); name=(f.get("name")||"").toString().trim(); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok:false, error:"invalid email" }, 400);
    if (!env.DB) return json({ ok:false, error:"db not bound" }, 500);
    email = email.toLowerCase();
    const res = await env.DB.prepare("INSERT OR IGNORE INTO subscribers (email, name, created_at, source) VALUES (?, ?, ?, ?)")
      .bind(email, name, new Date().toISOString(), request.headers.get("referer") || "site").run();
    const isNew = !!(res && res.meta && res.meta.changes > 0);
    if (isNew && env.RESEND_API_KEY) { try { await welcome(env, email, name); } catch (e) {} }
    return json({ ok:true, new:isNew });
  } catch (e) { return json({ ok:false, error:"server" }, 500); }
}
export async function onRequestOptions() { return new Response(null, { headers:{ "access-control-allow-origin":"*","access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type" } }); }
async function welcome(env, email, name) {
  const t = await tok(email, env.BROADCAST_SECRET || "");
  const unsub = "https://aegishumanai.com/api/unsubscribe?e=" + encodeURIComponent(email) + "&t=" + t;
  const hi = name ? (", " + name) : "";
  const html = emailShell(
    "Welcome aboard" + hi + ".",
    `<p style="margin:0 0 16px">You're on the list — which means the next time AEGIS ships a working tool, you'll be among the <b>first</b> to see it.</p>
     <p style="margin:0 0 16px"><b>What to expect:</b> a short note <i>only</i> when a new app goes live. Real systems, honest write-ups, no spam, no filler. That's the whole promise.</p>
     <p style="margin:0 0 22px">AEGIS builds AI that <b>augments human judgment — never replaces it.</b> In everything we make, a person stays in command.</p>`,
    "Explore what's live", "https://aegishumanai.com/", unsub);
  await send(env, email, "Welcome to AEGIS — you're on the list", html, unsub);
}
async function send(env, to, subject, html, unsub) {
  const FROM = env.FROM_EMAIL || "Dr Loh Kah Meng · AEGIS <aegisloh@aegishumanai.com>";
  const headers = unsub ? { "List-Unsubscribe":"<"+unsub+">", "List-Unsubscribe-Post":"List-Unsubscribe=One-Click" } : undefined;
  await fetch("https://api.resend.com/emails", { method:"POST",
    headers:{ "Authorization":"Bearer "+env.RESEND_API_KEY, "Content-Type":"application/json" },
    body: JSON.stringify({ from:FROM, to:[to], subject, html, headers, reply_to: env.REPLY_TO || "aegisloh@aegishumanai.com" }) });
}
async function tok(email, secret){ const b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email+":"+secret)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24); }
function json(o,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","access-control-allow-origin":"*"}}); }
function emailShell(heading, bodyHtml, btnText, btnUrl, unsub){
  const foot = unsub ? `You can leave anytime &middot; <a href="${unsub}" style="color:#93a4b4">Unsubscribe</a>` : `The door stays open &mdash; <a href="https://aegishumanai.com/subscribe" style="color:#5a9fd4">rejoin anytime</a>`;
  return `<table role=presentation width=100% cellpadding=0 cellspacing=0 style="background:#0f1720;margin:0;padding:0"><tr><td align=center>
  <table role=presentation width=600 cellpadding=0 cellspacing=0 style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif">
  <tr><td align=center style="background:#0f1720;padding:26px 24px 16px"><div style="color:#c9a24b;font-size:13px;letter-spacing:4px;font-weight:bold">A E G I S</div><div style="color:#8aa0b4;font-size:11px;letter-spacing:1px;margin-top:2px">HUMAN-AI AUGMENTING SYSTEMS</div></td></tr>
  <tr><td style="padding:0 24px"><div style="height:2px;background:linear-gradient(90deg,rgba(201,162,75,0),#c9a24b,rgba(201,162,75,0))"></div></td></tr>
  <tr><td style="background:#fff;padding:32px 34px 8px"><h1 style="color:#12202e;font-family:Georgia,serif;font-size:24px;margin:0 0 16px">${heading}</h1><div style="color:#33475b;font-size:15px;line-height:1.6">${bodyHtml}</div>
  <table role=presentation cellpadding=0 cellspacing=0 style="margin:4px 0 26px"><tr><td bgcolor="#c9a24b" style="border-radius:10px"><a href="${btnUrl}" style="display:inline-block;padding:13px 28px;color:#0f1720;font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px">${btnText} &rarr;</a></td></tr></table></td></tr>
  <tr><td style="background:#fff;padding:0 34px 30px"><div style="height:1px;background:#e6ebf0;margin-bottom:14px"></div><div style="color:#c9a24b;font-size:13px;font-style:italic;margin-bottom:8px">AEGIS &mdash; AI augments judgment, it does not replace it.</div><div style="color:#93a4b4;font-size:12px;line-height:1.6">${foot}</div></td></tr>
  </table></td></tr></table>`;
}

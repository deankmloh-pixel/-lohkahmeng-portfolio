// POST /api/request-textbook {email,name}
// -> sends visitor a PDF download link email
// -> notifies aegisloh@aegishumanai.com
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let email = "", name = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = await request.json();
      email = (b.email || "").toString().trim();
      name  = (b.name  || "").toString().trim();
    } else {
      const f = await request.formData();
      email = (f.get("email") || "").toString().trim();
      name  = (f.get("name")  || "").toString().trim();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ ok: false, error: "invalid email" }, 400);
    if (!env.RESEND_API_KEY)
      return json({ ok: false, error: "email not configured" }, 500);

    email = email.toLowerCase();
    const hi     = name || "there";
    const pdfUrl = "https://aegishumanai.com/downloads/project-21-prof-dhanjoo.pdf";

    // 1. Send PDF link to the visitor
    const visitorHtml = emailShell(
      "Your textbook download is ready.",
      `<p style="margin:0 0 16px">Hi ${escHtml(hi)},</p>
       <p style="margin:0 0 16px">Thank you for your interest. Here is your personal download link for the AEGIS clinical AI textbook dedicated to Prof. Dhanjoo N. Ghista:</p>
       <p style="margin:0 0 16px"><b>Project 21 &mdash; Clinical AI for Parkinson&rsquo;s Disease Detection</b><br>
       A full engineering textbook with laboratory exercises, worked examples, and a step-by-step guided project.</p>
       <p style="margin:0 0 22px">If you use this in teaching or research, we only ask that you write to us at
       <a href="mailto:aegisloh@aegishumanai.com" style="color:#c9a24b">aegisloh@aegishumanai.com</a>.</p>`,
      "Download the textbook — PDF, 1.5 MB",
      pdfUrl
    );
    await sendEmail(env, email, "Your AEGIS textbook — Project 21 (Parkinson’s)", visitorHtml);

    // 2. Store subscriber in D1 (aegis-subs database, binding: DB)
    if (env.DB) {
      try {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS subscribers (
             id         INTEGER PRIMARY KEY AUTOINCREMENT,
             name       TEXT,
             email      TEXT NOT NULL,
             source     TEXT DEFAULT 'p21-textbook',
             created_at TEXT DEFAULT (datetime('now'))
           )`
        ).run();
        await env.DB.prepare(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)`
        ).run();
        await env.DB.prepare(
          `INSERT OR IGNORE INTO subscribers (name, email, source) VALUES (?, ?, ?)`
        ).bind(name || null, email, "p21-textbook").run();
      } catch (_) { /* D1 errors must not block email delivery */ }
    }

    // 3. Notify Dr Loh
    const notifyHtml = emailShell(
      "New textbook request.",
      `<p style="margin:0 0 12px">A visitor just requested the P21 textbook via the tribute page.</p>
       <table style="border-collapse:collapse;font-size:14px;color:#33475b;margin:0 0 16px">
         <tr><td style="padding:4px 14px 4px 0;font-weight:bold;white-space:nowrap">Name:</td><td>${escHtml(name || "(not given)")}</td></tr>
         <tr><td style="padding:4px 14px 4px 0;font-weight:bold;white-space:nowrap">Email:</td><td>${escHtml(email)}</td></tr>
       </table>`,
      "View the tribute page",
      "https://aegishumanai.com/prof-dhanjoo-ghista.html"
    );
    await sendEmail(env, "aegisloh@aegishumanai.com",
      "Textbook request — " + (name ? escHtml(name) + " <" + email + ">" : email),
      notifyHtml);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "server" }, 500);
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

// ── helpers ──────────────────────────────────────────────────────────────────

async function sendEmail(env, to, subject, html) {
  const FROM = env.FROM_EMAIL || "Dr Loh Kah Meng · AEGIS <aegisloh@aegishumanai.com>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization":  "Bearer " + env.RESEND_API_KEY,
      "Content-Type":   "application/json"
    },
    body: JSON.stringify({
      from:     FROM,
      to:       [to],
      subject,
      html,
      reply_to: env.REPLY_TO || "aegisloh@aegishumanai.com"
    })
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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
  <div style="color:#93a4b4;font-size:12px;line-height:1.6">Questions? <a href="mailto:aegisloh@aegishumanai.com" style="color:#5a9fd4">aegisloh@aegishumanai.com</a></div>
</td></tr>
</table></td></tr></table>`;
}

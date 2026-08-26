// POST /api/p24-submit {name, email, filename} -> send MRI enquiry email via Resend
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let name = "", email = "", filename = "", filedata = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = await request.json();
      name = (b.name || "").toString().trim();
      email = (b.email || "").toString().trim();
      filename = (b.filename || "").toString().trim();
    } else {
      const f = await request.formData();
      name = (f.get("name") || "").toString().trim();
      email = (f.get("email") || "").toString().trim();
      filename = (f.get("filename") || "").toString().trim();
    }

    if (!env.RESEND_API_KEY) return json({ ok: false, error: "mail not configured" }, 500);

    const FROM = env.FROM_EMAIL || "AEGIS TumorSentinel <aegisloh@aegishumanai.com>";
    const submitted = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    const html = `<table role=presentation width=100% cellpadding=0 cellspacing=0 style="background:#0f1720;margin:0;padding:0"><tr><td align=center>
<table role=presentation width=600 cellpadding=0 cellspacing=0 style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif">
<tr><td align=center style="background:#0f1720;padding:26px 24px 16px">
  <div style="color:#c9a24b;font-size:13px;letter-spacing:4px;font-weight:bold">A E G I S</div>
  <div style="color:#8aa0b4;font-size:11px;letter-spacing:1px;margin-top:2px">TUMORSENTINEL · P24</div>
</td></tr>
<tr><td style="padding:0 24px"><div style="height:2px;background:linear-gradient(90deg,rgba(201,162,75,0),#c9a24b,rgba(201,162,75,0))"></div></td></tr>
<tr><td style="background:#fff;padding:32px 34px 28px">
  <h1 style="color:#12202e;font-family:Georgia,serif;font-size:22px;margin:0 0 18px">New MRI Submission</h1>
  <table role=presentation cellpadding=0 cellspacing=0 width=100% style="border:1px solid #e6ebf0;border-radius:8px;overflow:hidden;margin-bottom:22px">
    <tr><td style="background:#f7f9fb;padding:10px 16px;font-size:12px;color:#8aa0b4;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;width:110px">Patient</td>
        <td style="padding:10px 16px;font-size:15px;color:#12202e;font-weight:600">${name || "(not provided)"}</td></tr>
    <tr style="border-top:1px solid #e6ebf0"><td style="background:#f7f9fb;padding:10px 16px;font-size:12px;color:#8aa0b4;font-weight:bold;letter-spacing:.08em;text-transform:uppercase">Email</td>
        <td style="padding:10px 16px;font-size:15px;color:#1a6aab">${email || "(not provided)"}</td></tr>
    <tr style="border-top:1px solid #e6ebf0"><td style="background:#f7f9fb;padding:10px 16px;font-size:12px;color:#8aa0b4;font-weight:bold;letter-spacing:.08em;text-transform:uppercase">File</td>
        <td style="padding:10px 16px;font-size:14px;color:#33475b;font-family:monospace">${filename || "(unknown)"}</td></tr>
    <tr style="border-top:1px solid #e6ebf0"><td style="background:#f7f9fb;padding:10px 16px;font-size:12px;color:#8aa0b4;font-weight:bold;letter-spacing:.08em;text-transform:uppercase">Submitted</td>
        <td style="padding:10px 16px;font-size:13px;color:#6b7c93">${submitted}</td></tr>
  </table>
  <p style="margin:0 0 14px;color:#33475b;font-size:14px;line-height:1.6">Issue a result code from the Desktop App and send to the patient at the email above.</p>
  <div style="background:#0d2e14;border:1px solid #16A34A;border-radius:7px;padding:12px 16px;font-size:13px;color:#4ade80;">
    &#10003; Action: open Desktop App → issue code → send to patient
  </div>
</td></tr>
<tr><td style="background:#0f1720;padding:14px 24px;text-align:center">
  <div style="color:#8aa0b4;font-size:11px">AEGIS · AI augments judgment, it does not replace it.</div>
</td></tr>
</table></td></tr></table>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: ["aegisloh@gmail.com"],
        cc: ["dean.kmloh@gmail.com"],
        subject: "TumorSentinel MRI Submission — " + (name || email || "Anonymous"),
        html,
        attachments: filedata ? [{ filename: filename || 'mri.jpg', content: filedata }] : []
      })
    });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "server" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
}

// GET/POST /api/unsubscribe?e=&t= -> remove from D1. If removed + Resend configured, send a FAREWELL email.
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").toLowerCase().trim();
  const token = url.searchParams.get("t") || "";
  if (!email) return page("Invalid unsubscribe link.", 400);
  if (!token || token !== await tok(email, env.BROADCAST_SECRET || "")) return page("This unsubscribe link is invalid.", 400);
  let removed = false;
  if (env.DB) { try { const r = await env.DB.prepare("DELETE FROM subscribers WHERE email = ?").bind(email).run(); removed = !!(r && r.meta && r.meta.changes > 0); } catch (e) {} }
  if (removed && env.RESEND_API_KEY) { try { await farewell(env, email); } catch (e) {} }
  if (request.method === "POST") return new Response("unsubscribed", { status: 200 });
  return page("You've been unsubscribed from AEGIS updates. Sorry to see you go — you're always welcome back at aegishumanai.com/subscribe.");
}
async function farewell(env, email){
  const html = shell("Sorry to see you go.",
    `<p style="margin:0 0 16px">Your email has been removed from the AEGIS list — you won't hear from us again, and we've made sure of it.</p>
     <p style="margin:0 0 16px">If it wasn't what you hoped for, that's on us to earn back. No hard feelings either way — thank you for having given us a look.</p>
     <p style="margin:0 0 22px"><b>The door stays open.</b> Whenever you're curious again, you're welcome to rejoin — same promise, no spam.</p>`,
    "Rejoin anytime", "https://aegishumanai.com/subscribe");
  const FROM = env.FROM_EMAIL || "Dr Loh Kah Meng · AEGIS <aegisloh@aegishumanai.com>";
  await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:FROM,to:[email],subject:"You've left the AEGIS list — the door stays open",html,reply_to:env.REPLY_TO||"aegisloh@aegishumanai.com"})});
}
async function tok(email, secret){ const b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email+":"+secret)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24); }
function page(msg, status=200){ return new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>AEGIS</title><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#0f1720;color:#e8eef5;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px;margin:0"><div><div style="color:#c9a24b;font-weight:700;letter-spacing:3px;margin-bottom:12px">A E G I S</div><p style="max-width:42ch;line-height:1.6;color:#c7d2dd">${msg}</p></div>`,{status,headers:{"content-type":"text/html; charset=utf-8"}}); }
function shell(heading, bodyHtml, btnText, btnUrl){
  return `<table role=presentation width=100% cellpadding=0 cellspacing=0 style="background:#0f1720;margin:0;padding:0"><tr><td align=center>
  <table role=presentation width=600 cellpadding=0 cellspacing=0 style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif">
  <tr><td align=center style="background:#0f1720;padding:26px 24px 16px"><div style="color:#c9a24b;font-size:13px;letter-spacing:4px;font-weight:bold">A E G I S</div><div style="color:#8aa0b4;font-size:11px;letter-spacing:1px;margin-top:2px">HUMAN-AI AUGMENTING SYSTEMS</div></td></tr>
  <tr><td style="padding:0 24px"><div style="height:2px;background:linear-gradient(90deg,rgba(201,162,75,0),#c9a24b,rgba(201,162,75,0))"></div></td></tr>
  <tr><td style="background:#fff;padding:32px 34px 8px"><h1 style="color:#12202e;font-family:Georgia,serif;font-size:24px;margin:0 0 16px">${heading}</h1><div style="color:#33475b;font-size:15px;line-height:1.6">${bodyHtml}</div>
  <table role=presentation cellpadding=0 cellspacing=0 style="margin:4px 0 26px"><tr><td bgcolor="#c9a24b" style="border-radius:10px"><a href="${btnUrl}" style="display:inline-block;padding:13px 28px;color:#0f1720;font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px">${btnText} &rarr;</a></td></tr></table></td></tr>
  <tr><td style="background:#fff;padding:0 34px 30px"><div style="height:1px;background:#e6ebf0;margin-bottom:14px"></div><div style="color:#c9a24b;font-size:13px;font-style:italic">AEGIS &mdash; AI augments judgment, it does not replace it.</div></td></tr>
  </table></td></tr></table>`;
}

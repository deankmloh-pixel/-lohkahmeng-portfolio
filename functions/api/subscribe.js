// Cloudflare Pages Function — POST /api/subscribe -> stores email in D1 (binding: DB)
// Table: subscribers(email PK, name, created_at, source). See schema.sql.
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let email = "", name = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = await request.json();
      email = (b.email || "").toString().trim();
      name = (b.name || "").toString().trim();
    } else {
      const f = await request.formData();
      email = (f.get("email") || "").toString().trim();
      name = (f.get("name") || "").toString().trim();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "invalid email" }, 400);
    }
    if (!env.DB) return json({ ok: false, error: "db not bound" }, 500);
    await env.DB
      .prepare("INSERT OR IGNORE INTO subscribers (email, name, created_at, source) VALUES (?, ?, ?, ?)")
      .bind(email.toLowerCase(), name, new Date().toISOString(), request.headers.get("referer") || "site")
      .run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "server" }, 500);
  }
}
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

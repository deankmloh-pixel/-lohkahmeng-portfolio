# AEGIS Subscribe — Cloudflare-native (capture in D1). One-time setup.

Everything on YOUR Cloudflare. No third party, no subscriber cap, free.

## Files (all in the repo)
- subscribe.html                 — the branded signup page (posts to /api/subscribe)
- functions/api/subscribe.js     — Cloudflare Pages Function that writes to D1
- schema.sql                     — the subscribers table
- footer-signup.html             — optional site-wide footer widget

## One-time Cloudflare setup (Claude can do this in your dashboard for you)
1. Cloudflare dashboard -> Storage & Databases -> D1 -> Create database, name it: aegis-subscribers
2. In that database's Console, paste schema.sql and Run (creates the subscribers table).
3. Cloudflare -> your Pages project (aegishumanai.com) -> Settings -> Functions -> D1 database bindings ->
   Add binding:  Variable name = DB   ->   Database = aegis-subscribers   (Save).
4. Push the repo (adds functions/ + subscribe.html). Cloudflare redeploys.

## Test (after deploy)
Open https://aegishumanai.com/subscribe.html -> enter an email -> should show "You're on the list."
Verify in Cloudflare -> D1 -> aegis-subscribers -> Console:  SELECT * FROM subscribers;

## See / export your list anytime
D1 Console:  SELECT email, name, created_at FROM subscribers ORDER BY created_at DESC;
(Export via the D1 console.)

## Phase 2 — sending an announcement (only when you have a list)
Cloudflare stores the list but does not send bulk email. When ready, add a tiny sender:
a Worker that reads D1 + sends via a free mail API (Resend free tier ~3k/mo), OR export the list
into EmailOctopus/Sender and send from there. Claude builds this on request.

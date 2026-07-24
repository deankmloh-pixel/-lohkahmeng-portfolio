/* AEGIS site-wide disclaimer — include on every page:
   <script src="/disclaimer.js" defer></script>
   Footer on every page + a MANDATORY read-before-entry modal (per session)
   that locks the page (no scroll/use) until the visitor clicks "I understand & agree". */
(function () {
  var NAVY = "#1C2438", GOLD = "#B08D3A";
  var SHORT = "AEGIS and all tools on this website are built to demystify generative artificial intelligence — for demonstration and research purposes only, and NOT for medical purposes. We are not liable for any legal or medical liabilities. Use at your own risk.";

  function build() {
    // footer strip (every page)
    var f = document.createElement("div");
    f.setAttribute("role", "contentinfo");
    f.style.cssText = "background:" + NAVY + ";color:#cdd3e0;font:13px/1.5 Georgia,serif;padding:14px 18px;text-align:center;border-top:2px solid " + GOLD + ";";
    f.innerHTML = SHORT + ' &nbsp;<a href="/disclaimer.html" style="color:' + GOLD + ';text-decoration:underline;">Terms &amp; Disclaimer</a>';
    document.body.appendChild(f);

    // mandatory gate, once per session
    try { if (sessionStorage.getItem("aegis_agreed_session") === "1") return; } catch (e) {}

    // lock the page: no scroll, no interaction behind the overlay
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    var ov = document.createElement("div");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(7,14,30,.92);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;";
    ov.innerHTML =
      '<div style="max-width:580px;background:#0f1424;color:#e7ecf5;border:1px solid ' + GOLD + ';border-radius:10px;padding:30px 32px;font:15px/1.65 Georgia,serif;">' +
        '<div style="color:' + GOLD + ';font-weight:bold;letter-spacing:2px;font-size:13px;margin-bottom:12px;">AEGIS &mdash; PLEASE READ BEFORE ENTERING</div>' +
        '<p style="margin:0 0 14px;">' + SHORT + '</p>' +
        '<p style="margin:0 0 20px;font-size:13px;color:#aab2c5;">By clicking below you confirm you use this site for demonstration and research only, not for any medical purpose, and that you accept the <a href="/disclaimer.html" style="color:' + GOLD + ';">Terms &amp; Disclaimer</a>.</p>' +
        '<div style="text-align:right;"><button id="aegis-agree" style="background:' + GOLD + ';color:#0f1424;border:0;border-radius:6px;padding:12px 26px;font:bold 15px Georgia,serif;cursor:pointer;">I understand &amp; agree</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    document.getElementById("aegis-agree").onclick = function () {
      try { sessionStorage.setItem("aegis_agreed_session", "1"); } catch (e) {}
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = "";
      ov.remove();
    };
  }
  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();

// Password-only gate + private data store for /2040. Contains no secrets: the password is the
// DASH_PASSWORD env var; data lives in Netlify Blobs (never in this public repo). Fails closed.
import { getStore } from "https://esm.sh/@netlify/blobs@8.1.0";

const NAMES = new Set(["data", "linear", "cowork"]);
const COOKIE = "dash2040";
const enc = new TextEncoder();

const eq = (x, y) => {
  const a = enc.encode(x), b = enc.encode(y);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return d === 0;
};
const token = async (pass) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("2040-v1")));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
};
const page = (msg = "", status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>2040</title>
<style>:root{--bg:#fafaf9;--fg:#1c1917;--line:#d6d3d1;--acc:#ea580c;--bad:#b91c1c}@media(prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--line:#44403c;--acc:#fb923c;--bad:#f87171}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px system-ui,sans-serif}
form{width:min(320px,calc(100vw - 32px));display:grid;gap:12px}input,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:transparent;color:inherit}
button{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600;cursor:pointer}p{margin:0;color:var(--bad);font-size:.875rem}</style></head>
<body><form method="post" action="/2040/login"><input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>${msg ? `<p>${msg}</p>` : ""}<button type="submit">Enter</button></form></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );

export default async (request, context) => {
  const pass = Netlify.env.get("DASH_PASSWORD");
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const json = (body, status = 200) =>
    new Response(body, { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } });
  if (!pass) return page("Not configured.", 503);

  // Login form submit
  if (path === "/2040/login" && request.method === "POST") {
    const given = String((await request.formData()).get("password") ?? "");
    if (!eq(given, pass)) return page("Wrong password.", 401);
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/2040/",
        "Set-Cookie": `${COOKIE}=${await token(pass)}; Path=/2040; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Authenticated if valid cookie, or Basic header (for scripts; any username)
  const cookies = Object.fromEntries((request.headers.get("cookie") || "").split(/;\s*/).map((c) => c.split(/=(.*)/s).slice(0, 2)));
  let ok = cookies[COOKIE] ? eq(cookies[COOKIE], await token(pass)) : false;
  const h = request.headers.get("authorization") || "";
  if (!ok && h.startsWith("Basic ")) {
    try { ok = eq(atob(h.slice(6)).split(":").slice(1).join(":"), pass); } catch { /* ignore */ }
  }
  if (!ok) {
    const wantsPage = request.method === "GET" && (path === "/2040" || path === "/2040/");
    return wantsPage ? page() : json('{"error":"unauthorized"}', 401);
  }

  if (url.pathname === "/2040") return Response.redirect(new URL("/2040/", url), 302);
  const store = getStore("dash2040");
  const m = path.match(/^\/2040\/(data|linear|cowork)\.json$/);
  if (m) {
    const v = await store.get(m[1]);
    return v === null ? json('{"missing":true}', 404) : json(v);
  }
  if (path === "/2040/ingest" && request.method === "POST") {
    const name = url.searchParams.get("name") || "";
    if (!NAMES.has(name)) return json('{"error":"bad name"}', 400);
    const text = await request.text();
    if (text.length > 200000) return json('{"error":"too large"}', 413);
    try { JSON.parse(text); } catch { return json('{"error":"not json"}', 400); }
    await store.set(name, text);
    return json('{"ok":true}');
  }
  const res = await context.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
};

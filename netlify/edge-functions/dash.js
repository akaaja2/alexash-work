// Password gate + private data store for /2040. Contains no secrets: the password is the
// DASH_PASSWORD env var and the data lives in Netlify Blobs (never in this public repo).
// Fails closed if DASH_PASSWORD is unset.
import { getStore } from "npm:@netlify/blobs@8.1.0";

const NAMES = new Set(["data", "linear", "cowork"]);

export default async (request, context) => {
  const deny = () =>
    new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="2040", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  const pass = Netlify.env.get("DASH_PASSWORD");
  if (!pass) return deny();
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return deny();
  let given = "";
  try { given = atob(h.slice(6)).split(":").slice(1).join(":"); } catch { return deny(); }
  const enc = new TextEncoder();
  const a = enc.encode(given), b = enc.encode(pass);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return deny();

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  if (path === "/2040") return Response.redirect(new URL("/2040/", url), 302);

  const m = path.match(/^\/2040\/(data|linear|cowork)\.json$/);
  const store = getStore("dash2040");
  const json = (body, status = 200) =>
    new Response(body, { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } });

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

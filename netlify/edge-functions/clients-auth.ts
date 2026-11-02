// Password gate for the private client briefing at /clients.
// The password lives only in the Netlify environment variable CLIENTS_PASSWORD
// (Site configuration > Environment variables, scope: Functions). It is never in the repo.
// If the variable is missing, the page is refused rather than served unprotected.
import type { Config, Context } from "@netlify/edge-functions";

const REALM = "IN2030 client briefing";

function unauthorised(message = "Password required.") {
  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (request: Request, context: Context) => {
  const expected = Netlify.env.get("CLIENTS_PASSWORD");
  if (!expected) {
    return new Response("This page is not available yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return unauthorised();

  let supplied = "";
  try {
    const decoded = atob(header.slice(6));
    // Any user name is accepted; only the password is checked.
    supplied = decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return unauthorised();
  }
  if (!safeEqual(supplied, expected)) return unauthorised("Wrong password.");

  const response = await context.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
};

export const config: Config = {
  path: ["/clients", "/clients.html", "/clients/*"],
};

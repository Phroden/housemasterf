// Lokal forhåndsvisning: viser public/ og henter innholdet fra Herah.
//   deno run --allow-net --allow-read tools/serve.ts                 (innhold fra https://herah.frodewerner.no)
//   HERAH=http://localhost:8080 deno run --allow-net --allow-read --allow-env tools/serve.ts
// Åpne http://localhost:8000. Bookingskjemaet sendes ikke videre herfra (svarer som om det gikk bra).
const HERAH = (Deno.env.get("HERAH") ?? "https://herah.frodewerner.no").replace(/\/$/, "");
const ROOT = new URL("../public/", import.meta.url);
// Samme CSP som Caddy (server/housemasterf.caddy), så feil viser seg lokalt også
const CSP = (await Deno.readTextFile(new URL("../server/housemasterf.caddy", import.meta.url))).match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? "";
const TYPES: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", woff2: "font/woff2", txt: "text/plain; charset=utf-8" };

Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/housemaster")) {
    if (req.method === "POST") return Response.json({ ok: true, note: "lokalt – ikke sendt" }, { status: 201 });
    const r = await fetch(HERAH + url.pathname + url.search);
    return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
  }
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  if (path.includes("..")) return new Response("Nei", { status: 400 });
  try {
    const body = await Deno.readFile(new URL(`.${path}`, ROOT));
    return new Response(body, { headers: { "content-type": TYPES[path.split(".").pop()!] ?? "application/octet-stream", "content-security-policy": CSP } });
  } catch {
    return new Response("Fant ikke siden", { status: 404 });
  }
});

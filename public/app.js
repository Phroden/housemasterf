// Housemaster F – henter innholdet fra Herah (/api/housemaster, samme adresse via Caddy) og fyller siden.
// Uten svar fra Herah vises standardtekstene som står i index.html.
"use strict";

const API = "/api/housemaster";
const $ = (s) => document.querySelector(s);

/** Lager et element: el("a", { href: "#", class: "x" }, "tekst", barn …). Tekst settes alltid som tekst, aldri som HTML. */
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c);
  return n;
}
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/** Bare https-lenker vises (Herah sjekker også) */
const safeUrl = (u) => {
  try { const x = new URL(u); return x.protocol === "https:" ? x.toString() : null; } catch { return null; }
};

// ---------------------------------------------------------------------------
// Spillere: SoundCloud, Mixcloud, Spotify og YouTube bygges inn først når noen trykker «Spill av».
// Andre lenker åpnes i en ny fane.
// ---------------------------------------------------------------------------
function embedFor(link, autoplay = true) {
  const u = safeUrl(link);
  if (!u) return null;
  const url = new URL(u);
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&color=%23ffb02e&auto_play=${autoplay}&hide_related=true&show_comments=false&show_reposts=false&visual=false`, height: 166 };
  }
  if (host === "mixcloud.com") {
    return { src: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=0&autoplay=${autoplay ? 1 : 0}&feed=${encodeURIComponent(url.pathname)}`, height: 120 };
  }
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
    if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`, height: m[1] === "track" || m[1] === "episode" ? 152 : 352 };
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com") {
    const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0`, height: 0, video: true };
  }
  return null;
}

function playerFrame(link, title) {
  const e = embedFor(link);
  if (!e) return null;
  const f = el("iframe", { class: "embed", src: e.src, title: `Spiller: ${title}`, loading: "lazy", allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    referrerpolicy: "strict-origin-when-cross-origin" });
  if (e.video) f.style.aspectRatio = "16 / 9";
  else f.style.height = `${e.height}px`;
  return f;
}

// ---------------------------------------------------------------------------
// Datoer
// ---------------------------------------------------------------------------
const asDate = (d) => new Date(`${d}T12:00:00`);
const ddmm = (d) => asDate(d).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" });
const weekday = (d) => asDate(d).toLocaleDateString("nb-NO", { weekday: "short", year: asDate(d).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });

// ---------------------------------------------------------------------------
// Utfylling
// ---------------------------------------------------------------------------
const COLORS = ["bg-accent", "bg-pink", "bg-teal"];

function setTexts(s) {
  for (const n of document.querySelectorAll("[data-text]")) {
    const v = s[n.dataset.text];
    if (typeof v === "string" && v) n.textContent = v;
  }
  // Båndet: ordene to ganger, så det kan gå rundt uten hopp
  if (s.ticker?.length) {
    const t = $("#ticker");
    t.replaceChildren();
    for (let r = 0; r < 2; r++) s.ticker.forEach((w, i) => t.append(`${w.toUpperCase()} `, el("span", { class: `s${(i % 3) + 1}` }, "✦"), " "));
  }
  if (Array.isArray(s.om) && s.om.length) $("#om-paras").replaceChildren(...s.om.map((p) => el("p", {}, p)));
  if (Array.isArray(s.sjangre)) {
    const cls = ["bg-accent", "bg-pink", "bg-teal", "bg-cream"];
    $("#tags").replaceChildren(...s.sjangre.map((g, i) => el("span", { class: i === s.sjangre.length - 1 && s.sjangre.length > 4 ? "tag tag-line" : `tag ${cls[i % cls.length]}` }, g)));
  }
  if (s.booking_tittel) {
    const words = s.booking_tittel.trim().split(/\s+/);
    const last = words.pop();
    $("#booking-title").replaceChildren(words.length ? `${words.join(" ")} ` : "", el("span", { class: "c-accent" }, last));
  }
  if (s.epost) {
    const p = $("#booking-mail"), a = p.querySelector("a");
    a.textContent = s.epost;
    a.href = `mailto:${s.epost}`;
    p.hidden = false;
  }
  $("#booking-form").hidden = s.booking_skjema === false;
  // Egen logo fra Herah: i menyen, under Om og nederst
  if (s.logo_url && s.logo_url.startsWith("/api/housemaster/files/")) {
    for (const img of document.querySelectorAll("[data-logo]")) img.src = s.logo_url;
    document.body.classList.add("custom-logo");
  }
  const sc = safeUrl(s.lenker?.soundcloud);
  if (sc) { $("#sc-follow").href = sc; $("#sc-follow").hidden = false; }
  const LINKS = [["soundcloud", "SoundCloud"], ["mixcloud", "Mixcloud"], ["instagram", "Instagram"], ["spotify", "Spotify"], ["youtube", "YouTube"], ["facebook", "Facebook"]];
  $("#footer-links").replaceChildren(...LINKS.filter(([k]) => safeUrl(s.lenker?.[k])).map(([k, label]) =>
    el("a", { href: safeUrl(s.lenker[k]), target: "_blank", rel: "noopener" }, label)));
}

function renderTracks(list) {
  const sec = $("#musikk");
  sec.hidden = !list.length;
  for (const a of document.querySelectorAll('[data-nav="laater"]')) a.hidden = !list.length;
  $("#tracks").replaceChildren(...list.map((t, i) => {
    const cover = el("div", { class: `track-cover ${COLORS[i % 3]}` });
    if (t.cover) {
      const img = el("img", { src: t.cover, alt: `Cover: ${t.title}`, loading: "lazy", width: "400", height: "400" });
      img.style.objectPosition = `center ${Number(t.cover_pos ?? 50)}%`;
      img.addEventListener("error", () => img.replaceWith(el("span", { "aria-hidden": "true" }, (t.title || "?").slice(0, 1).toUpperCase())));
      cover.append(img);
    } else cover.append(el("span", { "aria-hidden": "true" }, (t.title || "?").slice(0, 1).toUpperCase()));
    const chips = el("div", { class: "chips" },
      t.author ? el("span", { class: "chip t" }, t.author) : null,
      t.bpm ? el("span", { class: "chip t" }, `${t.bpm} BPM`) : null,
      t.toneart ? el("span", { class: "chip" }, t.toneart) : null,
      t.type || t.aar ? el("span", { class: "chip" }, [t.type, t.aar].filter(Boolean).join(" · ")) : null);
    const body = el("div", { class: "track-body" }, el("h3", {}, t.title), chips.childNodes.length ? chips : null);
    const link = safeUrl(t.lenke);
    if (link && embedFor(link)) {
      const btn = el("button", { type: "button", class: "play" }, "Spill av");
      btn.addEventListener("click", () => btn.replaceWith(playerFrame(link, t.title)));
      body.append(btn);
    } else if (link) {
      body.append(el("a", { class: "play", href: link, target: "_blank", rel: "noopener" }, "Hør låten ↗"));
    }
    return el("article", { class: "track" }, cover, body);
  }));
}

function waveform() {
  const g = $("#wave");
  if (g.childNodes.length) return;
  const H = [12, 28, 44, 24, 52, 32, 16, 40, 56, 36, 20, 48, 28, 44, 16, 52, 32, 24, 40, 12, 48, 28, 56, 36, 20, 44, 16, 32, 24, 12];
  H.forEach((h, i) => g.append(svg("rect", { x: String(i * 10), y: String((64 - h) / 2), width: "5", height: String(h), rx: "2", class: i >= 12 ? "dim" : "" })));
}

function renderMixes(list) {
  const sec = $("#mixer");
  sec.hidden = !list.length;
  for (const a of document.querySelectorAll('[data-nav="mixer"]')) a.hidden = !list.length;
  if (!list.length) return;
  waveform();
  const show = (m) => {
    $("#mix-meta").textContent = [`Mix #${m.nr}`, m.varighet ? `${m.varighet} min` : null, m.sjanger].filter(Boolean).join(" · ");
    $("#mix-title").textContent = m.title;
    $("#mix-desc").textContent = m.beskrivelse ?? "";
    $("#mix-desc").hidden = !m.beskrivelse;
    const embed = $("#mix-embed");
    embed.replaceChildren();
    embed.hidden = true;
    const btn = $("#mix-btn");
    const link = safeUrl(m.lenke);
    btn.hidden = !link;
    btn.onclick = () => {
      const f = playerFrame(link, m.title);
      if (!f) { window.open(link, "_blank", "noopener"); return; }
      embed.replaceChildren(f);
      embed.hidden = false;
    };
    btn.setAttribute("aria-label", `Spill av ${m.title}`);
    renderList(m);
  };
  const renderList = (current) => {
    const others = list.filter((m) => m !== current).slice(0, 6);
    $("#mix-list").replaceChildren(...others.map((m, i) =>
      el("button", { type: "button", class: "mix-item", onclick: () => { show(m); $("#mix-feature").scrollIntoView({ block: "nearest" }); } },
        el("span", {}, el("strong", {}, m.title), el("small", {}, [m.sjanger, m.varighet ? `${m.varighet} min` : null, m.dato ? asDate(m.dato).toLocaleDateString("nb-NO", { month: "short", year: "numeric" }) : null].filter(Boolean).join(" · "))),
        el("span", { class: `arrow a${i % 3}`, "aria-hidden": "true" }, "→"))));
  };
  show(list[0]);
}

function renderGigs(list) {
  const ul = $("#gigs");
  if (!list.length) {
    ul.replaceChildren(el("li", { class: "gig-empty" }, "Ingen offentlige spillejobber akkurat nå. ", el("a", { href: "#booking" }, "Book et sett?")));
    return;
  }
  ul.replaceChildren(...list.map((g) => {
    const where = [g.sted, g.by].filter(Boolean).join(", ");
    const tix = safeUrl(g.billetter);
    const until = g.slutt && g.slutt !== g.dato ? `–${ddmm(g.slutt)}` : "";
    return el("li", { class: "gig" },
      el("span", { class: "gig-date" }, el("b", {}, `${ddmm(g.dato)}${until}`), el("small", {}, [weekday(g.dato), g.tid].filter(Boolean).join(" · "))),
      el("span", { class: "gig-main" }, el("strong", {}, g.title), where ? el("span", {}, where) : null),
      g.lukket ? el("span", { class: "gig-closed" }, "Lukket arrangement")
        : tix ? el("a", { class: "gig-tix", href: tix, target: "_blank", rel: "noopener" }, "Billetter") : null);
  }));
}

// ---------------------------------------------------------------------------
// Bookingskjemaet
// ---------------------------------------------------------------------------
function setupForm() {
  const form = $("#booking-form");
  const status = $("#form-status");
  const date = form.elements.dato;
  date.min = new Date().toLocaleDateString("sv-SE");
  const say = (msg, kind) => { status.textContent = msg; status.className = `form-status ${kind ?? ""}`; };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const f of form.querySelectorAll("[aria-invalid]")) f.removeAttribute("aria-invalid");
    const bad = [...form.querySelectorAll("[required]")].filter((f) => !f.checkValidity());
    if (bad.length) {
      bad.forEach((f) => f.setAttribute("aria-invalid", "true"));
      bad[0].focus();
      say(bad[0].name === "epost" && bad[0].value ? "Sjekk e-postadressen." : "Fyll inn navn, e-post og en melding.", "err");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    say("Sender …");
    const data = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch(`${API}/booking`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Noe gikk galt. Prøv igjen, eller send en e-post.");
      form.reset();
      say("Takk! Forespørselen er sendt – du hører fra meg snart.", "ok");
    } catch (x) {
      say(x.message === "Failed to fetch" ? "Fikk ikke kontakt. Sjekk nettet og prøv igjen." : x.message, "err");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
async function main() {
  $("#year").textContent = String(new Date().getFullYear());
  setupForm();
  try {
    const r = await fetch(API, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    setTexts(d.settings ?? {});
    // Låtene du har limt inn i Herah (SoundCloud) først, så de fra samlingen Egne låter
    const picked = (d.settings?.utvalgte ?? []).map((u) => ({ title: u.title, author: u.author, cover: u.cover, lenke: u.url }));
    renderTracks([...picked, ...(d.laater ?? [])]);
    renderMixes(d.mixer ?? []);
    renderGigs(d.jobber ?? []);
  } catch (e) {
    console.warn("Kunne ikke hente innholdet:", e);
    $("#gigs").replaceChildren(el("li", { class: "gig-empty" }, "Kunne ikke hente spillejobbene akkurat nå."));
  }
}
main();

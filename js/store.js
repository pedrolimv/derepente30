// Escolhe o "banco de dados":
//  1. LOCAL  — se o site estiver sendo servido pelo notebook (local/servidor.js), sem internet;
//  2. FIREBASE — no site publicado (GitHub Pages);
//  3. DEMONSTRAÇÃO — se o Firebase não estiver configurado.
import { CONFIG } from "./config.js";

async function detectLocal() {
  if (location.hostname.endsWith("github.io")) return null;
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1500);
    const r = await fetch("api/ping", { cache: "no-store", signal: ctl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.mode === "local" ? j : null;
  } catch { return null; }
}

export const local = await detectLocal();
const key = CONFIG.firebase && CONFIG.firebase.apiKey;
export const isDemo = !local && (!key || key.startsWith("COLE"));

const impl = local ? await import("./store-local.js")
  : isDemo ? await import("./store-demo.js") : await import("./store-firebase.js");
export const store = impl.default;

// Endereço que vai no QR code
export function voteURL() {
  if (local) return `http://${local.dominio}${local.porta == 80 ? "" : ":" + local.porta}/votar.html`;
  return new URL("votar.html", location.href).href;
}

// Utilitários comuns ----------------------------------------------------
export const ts = p => (p && p.createdAt && (p.createdAt.toMillis ? p.createdAt.toMillis() : p.createdAt)) || Date.now();

export function newOptionId() { return "o" + Math.random().toString(36).slice(2, 8); }

export function tally(poll, counts) {
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0);
  const rows = (poll.options || []).map(o => ({ ...o, votes: (counts && counts[o.id]) || 0 }))
    .map(r => ({ ...r, pct: total ? Math.round((r.votes / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.votes - a.votes);
  return { total, rows };
}

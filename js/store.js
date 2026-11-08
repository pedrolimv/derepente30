// Escolhe o "banco de dados": Firebase (de verdade) ou demonstração (local).
import { CONFIG } from "./config.js";

const key = CONFIG.firebase && CONFIG.firebase.apiKey;
export const isDemo = !key || key.startsWith("COLE");

const impl = isDemo ? await import("./store-demo.js") : await import("./store-firebase.js");
export const store = impl.default;

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

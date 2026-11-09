// Backend LOCAL (sem internet): conversa com local/servidor.js no notebook.
const TK = "local-admin-token", DEV = "local-device";
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
let token = ls.get(TK);
let polls = null, counts = {};
const subs = { polls: new Set(), counts: new Set(), react: new Set(), auth: new Set() };
let es = null;

function connect() {
  if (es) es.close();
  es = new EventSource("api/events" + (token ? "?token=" + encodeURIComponent(token) : ""));
  es.addEventListener("polls", e => { polls = JSON.parse(e.data); subs.polls.forEach(f => f(polls)); });
  es.addEventListener("counts", e => { counts = JSON.parse(e.data); subs.counts.forEach(f => f(counts)); });
  es.addEventListener("react", e => { const r = JSON.parse(e.data); subs.react.forEach(f => f(r)); });
  // EventSource reconecta sozinho se o Wi-Fi oscilar
}
connect();

async function call(method, url, data) {
  const r = await fetch(url, {
    method, headers: { "content-type": "application/json", ...(token ? { "x-token": token } : {}) },
    body: data ? JSON.stringify(data) : undefined, cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.msg || "Erro " + r.status), { code: j.error || "unavailable" });
  return j;
}
function device() {
  let d = ls.get(DEV);
  if (!d) { d = "d" + Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set(DEV, d); }
  return d;
}
async function authState() {
  if (!token) return null;
  try { const r = await call("GET", "api/me"); if (r.admin) return { uid: "local", email: "organização", isAdmin: true }; } catch {}
  token = null; ls.set(TK, null); connect(); return null;
}
async function emitAuth() { const a = await authState(); subs.auth.forEach(f => f(a)); }

export default {
  mode: "local",

  watchPolls(cb) { subs.polls.add(cb); if (polls) cb(polls); return () => subs.polls.delete(cb); },
  watchPoll(id, cb) { return this.watchPolls(ps => cb(ps.find(p => p.id === id) || null)); },

  async voterId() { return device(); },
  async myVote(pid) { return (await call("GET", `api/myvote?pid=${encodeURIComponent(pid)}&device=${encodeURIComponent(device())}`)).option; },
  async vote(pid, option) { await call("POST", "api/vote", { pid, option, device: device() }); },

  onAuth(cb) { subs.auth.add(cb); authState().then(cb); return () => subs.auth.delete(cb); },
  async login(_email, senha) {
    const r = await call("POST", "api/login", { senha });
    token = r.token; ls.set(TK, token); connect(); await emitAuth();
  },
  async logout() { token = null; ls.set(TK, null); connect(); await emitAuth(); },

  async createPoll(data) { return (await call("POST", "api/polls", data)).id; },
  updatePoll(id, patch) { return call("PATCH", "api/polls/" + id, patch); },
  deletePoll(id) { return call("DELETE", "api/polls/" + id); },
  resetVotes(id) { return call("POST", `api/polls/${id}/reset`); },
  watchVotes(pid, cb) {
    const f = c => cb(c[pid] || {});
    subs.counts.add(f); f(counts);
    return () => subs.counts.delete(f);
  },

  async react(e) { await call("POST", "api/react", { e }); },
  watchReactions(cb) { subs.react.add(cb); return () => subs.react.delete(cb); },
  async clearReactions() { return 0; }, // no modo local as reações não ficam guardadas
};

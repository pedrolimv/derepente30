// MODO DEMONSTRAÇÃO — tudo fica no localStorage deste navegador.
// Serve para testar telas (abra votar, admin e telão em abas diferentes).
const KEY = "demo-votacao-db";
const subs = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { polls: {}, votes: {} }; }
  catch { return { polls: {}, votes: {} }; }
}
function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} emit(); }
function emit() { subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
addEventListener("storage", e => { if (e.key === null || e.key === KEY || e.key === "demo-admin") emit(); });
function sub(fn) { subs.add(fn); queueMicrotask(fn); return () => subs.delete(fn); }
const wait = () => new Promise(r => setTimeout(r, 250));

function voter() {
  let v = null;
  try { v = localStorage.getItem("demo-voter"); } catch {}
  if (!v) { v = "v" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem("demo-voter", v); } catch {} }
  return v;
}
function clean(data) {
  const out = { ...data };
  if (out.options) out.optionIds = out.options.map(o => o.id);
  return out;
}

export default {
  mode: "demo",

  watchPolls(cb) { return sub(() => cb(Object.values(load().polls))); },
  watchPoll(id, cb) { return sub(() => cb(load().polls[id] || null)); },

  async voterId() { return voter(); },
  newVoter() { try { localStorage.removeItem("demo-voter"); } catch {} return voter(); },
  async myVote(pid) { return (load().votes[pid] || {})[voter()] || null; },
  async vote(pid, option) {
    await wait();
    const db = load(), p = db.polls[pid];
    if (!p || p.status !== "open") throw Object.assign(new Error("Votação fechada"), { code: "permission-denied" });
    db.votes[pid] = db.votes[pid] || {};
    if (db.votes[pid][voter()]) throw Object.assign(new Error("Já votou"), { code: "permission-denied" });
    if (!p.optionIds.includes(option)) throw new Error("Opção inválida");
    db.votes[pid][voter()] = option; save(db);
  },

  onAuth(cb) {
    return sub(() => {
      let s = null; try { s = JSON.parse(localStorage.getItem("demo-admin")); } catch {}
      cb(s ? { uid: "demo-admin", email: s.email, isAdmin: true } : null);
    });
  },
  async login(email) { await wait(); localStorage.setItem("demo-admin", JSON.stringify({ email: email || "demo@teste" })); emit(); },
  async logout() { localStorage.removeItem("demo-admin"); emit(); },

  async createPoll(data) {
    const db = load(), id = "p" + Date.now().toString(36);
    db.polls[id] = { id, ...clean(data), status: "draft", reveal: false, showLive: false, results: null, createdAt: Date.now() };
    save(db); return id;
  },
  async updatePoll(id, patch) { const db = load(); if (!db.polls[id]) return; Object.assign(db.polls[id], clean(patch)); save(db); },
  async deletePoll(id) { const db = load(); delete db.polls[id]; delete db.votes[id]; save(db); },

  watchVotes(pid, cb) {
    return sub(() => {
      const counts = {};
      Object.values(load().votes[pid] || {}).forEach(o => { counts[o] = (counts[o] || 0) + 1; });
      cb(counts);
    });
  },
  async resetVotes(pid) { const db = load(); db.votes[pid] = {}; save(db); },

  async react(e) {
    let list = []; try { list = JSON.parse(localStorage.getItem(RKEY)) || []; } catch {}
    list.push({ id: Math.random().toString(36).slice(2), e }); list = list.slice(-30);
    try { localStorage.setItem(RKEY, JSON.stringify(list)); } catch {}
    rsubs.forEach(f => f());
  },
  watchReactions(cb) {
    const seen = new Set(readR().map(r => r.id));
    const f = () => readR().forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); cb(r.e); } });
    rsubs.add(f); return () => rsubs.delete(f);
  },
  async clearReactions() { const n = readR().length; localStorage.removeItem(RKEY); return n; },
};

const RKEY = "demo-reactions", rsubs = new Set();
function readR() { try { return JSON.parse(localStorage.getItem(RKEY)) || []; } catch { return []; } }
addEventListener("storage", e => { if (e.key === RKEY) rsubs.forEach(f => f()); });

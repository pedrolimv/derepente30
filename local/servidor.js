// =====================================================================
//  SERVIDOR LOCAL — votação ao vivo SEM INTERNET
//  Roda no notebook: serve o site, guarda os votos e (opcional) responde
//  o DNS para que o endereço personalizado funcione na rede do roteador.
//
//  Uso:  node local/servidor.js        (ou clique em local/INICIAR.bat)
//  Não precisa instalar nada além do Node.js.
// =====================================================================
"use strict";
const http = require("http");
const dgram = require("dgram");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const argCfg = process.argv.indexOf("--config");
const CFG_FILE = argCfg > 0 ? path.resolve(process.argv[argCfg + 1]) : path.join(__dirname, "config.json");
const DATA_DIR = argCfg > 0 ? path.join(path.dirname(CFG_FILE), "dados") : path.join(__dirname, "dados");
const DB_FILE = path.join(DATA_DIR, "votacao.json");

const cfg = Object.assign({
  dominio: "derepente30.com",
  ip: "auto",
  portaHttp: 80,
  dns: true,
  portaDns: 53,
  umVotoPorIp: true,
  qrUsaIp: false,
  senhaAdmin: "",
}, JSON.parse(fs.readFileSync(CFG_FILE, "utf8")));

const REACTIONS = ["👏", "😂", "🔥", "❤️", "🎉"];

/* ---------------- IP do notebook ---------------- */
function lanIPs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const a of list || []) if (a.family === "IPv4" && !a.internal) out.push({ name, ip: a.address });
  return out;
}
function pickIP() {
  if (cfg.ip && cfg.ip !== "auto") return cfg.ip;
  const ips = lanIPs();
  const priv = ips.find(i => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.ip));
  return (priv || ips[0] || { ip: "127.0.0.1" }).ip;
}
const IP = pickIP();

/* ---------------- Banco de dados (arquivo JSON) ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { polls: {}, votes: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}

/* ---------------- Sessões da organização ---------------- */
const tokens = new Set();
const isAdmin = req => tokens.has(req.headers["x-token"] || new URL(req.url, "http://x").searchParams.get("token") || "");

/* ---------------- Tempo real (Server-Sent Events) ---------------- */
const clients = new Set(); // { res, admin }
function send(c, event, data) { c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
function pollsList() { return Object.values(db.polls); }
function counts() {
  const out = {};
  for (const [pid, votes] of Object.entries(db.votes)) {
    const c = {}; for (const v of Object.values(votes)) c[v.option] = (c[v.option] || 0) + 1; out[pid] = c;
  }
  return out;
}
function broadcastPolls() { const p = pollsList(); clients.forEach(c => send(c, "polls", p)); }
let countsTimer = null;
function broadcastCounts() { // agrupa rajadas de votos
  if (countsTimer) return;
  countsTimer = setTimeout(() => { countsTimer = null; const c = counts(); clients.forEach(cl => cl.admin && send(cl, "counts", c)); }, 200);
}
setInterval(() => clients.forEach(c => c.res.write(": ping\n\n")), 20000);

/* ---------------- Utilidades HTTP ---------------- */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8" };
function json(res, code, obj) { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); }
function body(req) {
  return new Promise((ok, bad) => {
    let s = ""; req.on("data", d => { s += d; if (s.length > 1e5) req.destroy(); });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
  });
}
const clientIP = req => (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
const newId = p => p + crypto.randomBytes(5).toString("hex");
function cleanOptions(opts) {
  return (Array.isArray(opts) ? opts : []).slice(0, 40).map(o => ({
    id: String(o.id || newId("o")).slice(0, 20), name: String(o.name || "").trim().slice(0, 80), detail: String(o.detail || "").trim().slice(0, 80),
  })).filter(o => o.name);
}

/* ---------------- API ---------------- */
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  if (p === "/api/ping") return json(res, 200, { ok: true, mode: "local", dominio: cfg.qrUsaIp ? IP : cfg.dominio, ip: IP, porta: cfg.portaHttp });

  if (p === "/api/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
    const c = { res, admin: isAdmin(req) };
    clients.add(c); req.on("close", () => clients.delete(c));
    send(c, "polls", pollsList());
    if (c.admin) send(c, "counts", counts());
    return;
  }

  if (p === "/api/login" && m === "POST") {
    const b = await body(req);
    const ok = typeof b.senha === "string" && b.senha.length && crypto.timingSafeEqual(
      crypto.createHash("sha256").update(b.senha).digest(), crypto.createHash("sha256").update(cfg.senhaAdmin).digest());
    if (!ok) return json(res, 401, { error: "auth/invalid-credential" });
    const t = crypto.randomBytes(24).toString("hex"); tokens.add(t);
    return json(res, 200, { token: t });
  }
  if (p === "/api/me") return json(res, 200, { admin: isAdmin(req) });

  if (p === "/api/myvote") {
    const pid = url.searchParams.get("pid"), dev = url.searchParams.get("device") || "";
    const v = (db.votes[pid] || {})[dev];
    return json(res, 200, { option: v ? v.option : null });
  }

  if (p === "/api/vote" && m === "POST") {
    const b = await body(req), poll = db.polls[b.pid];
    const dev = String(b.device || "").slice(0, 64), ip = clientIP(req);
    if (!poll || poll.status !== "open") return json(res, 403, { error: "permission-denied", msg: "Votação fechada" });
    if (!dev || !(poll.optionIds || []).includes(b.option)) return json(res, 400, { error: "invalid-argument" });
    const votes = db.votes[b.pid] = db.votes[b.pid] || {};
    if (votes[dev]) return json(res, 409, { error: "permission-denied", msg: "Já votou" });
    if (cfg.umVotoPorIp && Object.values(votes).some(v => v.ip === ip)) return json(res, 409, { error: "permission-denied", msg: "Este aparelho já votou" });
    votes[dev] = { option: b.option, ip, at: Date.now() };
    save(); broadcastCounts();
    return json(res, 200, { ok: true });
  }

  if (p === "/api/react" && m === "POST") {
    const b = await body(req);
    if (!REACTIONS.includes(b.e)) return json(res, 400, { error: "invalid-argument" });
    clients.forEach(c => send(c, "react", b.e));
    return json(res, 200, { ok: true });
  }

  // ----- daqui pra baixo, só organização -----
  if (!isAdmin(req)) return json(res, 403, { error: "permission-denied" });

  if (p === "/api/polls" && m === "POST") {
    const b = await body(req), options = cleanOptions(b.options), id = newId("p");
    db.polls[id] = { id, title: String(b.title || "Votação").slice(0, 80), description: String(b.description || "").slice(0, 160), options,
      optionIds: options.map(o => o.id), status: "draft", reveal: false, showLive: false, results: null, createdAt: Date.now() };
    save(); broadcastPolls(); return json(res, 200, { id });
  }
  const mm = p.match(/^\/api\/polls\/([\w-]+)(\/reset)?$/);
  if (mm) {
    const id = mm[1], poll = db.polls[id];
    if (!poll) return json(res, 404, { error: "not-found" });
    if (mm[2] && m === "POST") { db.votes[id] = {}; save(); broadcastCounts(); return json(res, 200, { ok: true }); }
    if (m === "DELETE") { delete db.polls[id]; delete db.votes[id]; save(); broadcastPolls(); broadcastCounts(); return json(res, 200, { ok: true }); }
    if (m === "PATCH") {
      const b = await body(req);
      for (const k of ["title", "description", "status", "reveal", "showLive", "results"]) if (k in b) poll[k] = b[k];
      if (b.options) { poll.options = cleanOptions(b.options); poll.optionIds = poll.options.map(o => o.id); }
      save(); broadcastPolls(); return json(res, 200, { ok: true });
    }
  }
  if (p === "/api/reactions/clear" && m === "POST") return json(res, 200, { n: 0 });
  return json(res, 404, { error: "not-found" });
}

/* ---------------- Verificações de "tem internet?" dos celulares ----------------
   Respondemos como se houvesse internet: assim o celular NÃO abandona o Wi-Fi. */
function connectivity(req, res, url) {
  const p = url.pathname.toLowerCase();
  if (p === "/generate_204" || p === "/gen_204") { res.writeHead(204); res.end(); return true; }
  if (p === "/hotspot-detect.html" || p.startsWith("/library/test/success")) {
    res.writeHead(200, { "content-type": "text/html" }); res.end("<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>"); return true;
  }
  if (p === "/connecttest.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end("Microsoft Connect Test"); return true; }
  if (p === "/ncsi.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end("Microsoft NCSI"); return true; }
  if (p === "/success.txt" || p === "/canonical.html") { res.writeHead(200, { "content-type": "text/plain" }); res.end("success\n"); return true; }
  return false;
}

/* ---------------- Servidor HTTP ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (connectivity(req, res, url)) return;
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);

    // Qualquer outro endereço digitado na rede leva para a votação
    const host = (req.headers.host || "").split(":")[0].toLowerCase();
    const known = [cfg.dominio, "www." + cfg.dominio, IP, "localhost", "127.0.0.1"];
    if (host && !known.includes(host)) {
      res.writeHead(302, { location: `http://${cfg.dominio}${cfg.portaHttp == 80 ? "" : ":" + cfg.portaHttp}/votar.html` }); return res.end();
    }

    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.normalize(path.join(ROOT, rel));
    const relToRoot = path.relative(ROOT, file);
    if (relToRoot.startsWith("..") || /^(local|\.git)([\\/]|$)/.test(relToRoot) || path.basename(file).startsWith(".")) { res.writeHead(404); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Não encontrado"); }
      res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": /\.(html|js|css)$/.test(file) ? "no-cache" : "max-age=3600" });
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) {
    console.error(e); if (!res.headersSent) json(res, 500, { error: "internal" });
  }
});
server.keepAliveTimeout = 65000;

/* ---------------- DNS: todo nome aponta para este notebook ---------------- */
function startDNS() {
  const sock = dgram.createSocket("udp4");
  const ipBytes = Buffer.from(IP.split(".").map(Number));
  sock.on("message", (msg, rinfo) => {
    try {
      if (msg.length < 12) return;
      let i = 12; while (msg[i] !== 0 && i < msg.length) i += msg[i] + 1;
      const qEnd = i + 5, qtype = msg.readUInt16BE(i + 1);
      const header = Buffer.from(msg.subarray(0, 12));
      header[2] = 0x84 | (msg[2] & 0x01); header[3] = 0x80; // resposta, autoritativa, RA
      header.writeUInt16BE(1, 4); header.writeUInt16BE(qtype === 1 ? 1 : 0, 6); header.writeUInt16BE(0, 8); header.writeUInt16BE(0, 10);
      const question = msg.subarray(12, qEnd);
      const parts = [header, question];
      if (qtype === 1) parts.push(Buffer.from([0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4]), ipBytes); // A, TTL 60s
      sock.send(Buffer.concat(parts), rinfo.port, rinfo.address);
    } catch {}
  });
  sock.on("error", e => console.log(`\n  ⚠  DNS desligado (${e.code}). O endereço personalizado não vai funcionar; use o QR code ou http://${IP}${cfg.portaHttp == 80 ? "" : ":" + cfg.portaHttp}\n`));
  sock.bind(cfg.portaDns, "0.0.0.0");
}

/* ---------------- Início ---------------- */
async function askPassword() {
  if (cfg.senhaAdmin) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  cfg.senhaAdmin = await new Promise(ok => rl.question("  Crie a senha da organização para hoje (para entrar no admin): ", a => { rl.close(); ok(a.trim()); }));
  if (!cfg.senhaAdmin) { console.log("  Senha vazia. Feche e abra de novo."); process.exit(1); }
}

(async () => {
  console.log("\n  =============================================");
  console.log("   De repente 30 · Votação local (sem internet)");
  console.log("  =============================================\n");
  await askPassword();
  server.on("error", e => {
    console.log(`\n  ✖  Não consegui abrir a porta ${cfg.portaHttp} (${e.code}).`);
    console.log("     Feche outros programas que usem essa porta ou troque \"portaHttp\" em local/config.json.\n");
    process.exit(1);
  });
  server.listen(cfg.portaHttp, "0.0.0.0", () => {
    const port = cfg.portaHttp == 80 ? "" : ":" + cfg.portaHttp;
    console.log(`  IP deste notebook ........ ${IP}`);
    console.log(`  Endereço personalizado ... http://${cfg.dominio}${port}`);
    console.log(`  Endereço pelo IP ......... http://${IP}${port}\n`);
    console.log(`  Votar ......... http://${cfg.dominio}${port}/votar.html`);
    console.log(`  Admin ......... http://${IP}${port}/admin.html`);
    console.log(`  Telão ......... http://${IP}${port}/telao.html\n`);
    if (lanIPs().length > 1 && cfg.ip === "auto") console.log("  (Vários IPs encontrados: " + lanIPs().map(i => i.ip).join(", ") + ". Se o errado foi escolhido, defina \"ip\" em local/config.json.)\n");
    console.log("  Votos salvos em local/dados/votacao.json. Deixe esta janela aberta.\n");
  });
  if (cfg.dns) startDNS();
})();

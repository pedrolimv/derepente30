import { store, isDemo, ts, tally } from "./store.js";
import { $, $$, esc, toast, confetti, demoBanner, errMsg, statusLabel, REACTIONS, floatEmoji, countUp } from "./ui.js";

const app = $("#app"), bar = $("#confirmBar"), dlg = $("#confirmDlg");
const params = new URLSearchParams(location.search);
const S = { polls: null, focus: params.get("id"), selected: {}, mine: {}, checked: {}, busy: false, view: "", animated: {} };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

const cacheKey = pid => "voto:" + pid;
const getCache = pid => { try { return localStorage.getItem(cacheKey(pid)); } catch { return null; } };
const setCache = (pid, v) => { try { v ? localStorage.setItem(cacheKey(pid), v) : localStorage.removeItem(cacheKey(pid)); } catch {} };

if (isDemo) {
  const b = demoBanner('<button type="button" id="newVoter">Simular outro celular</button>');
  b.querySelector("#newVoter").addEventListener("click", () => {
    store.newVoter(); (S.polls || []).forEach(p => setCache(p.id, null));
    S.mine = {}; S.checked = {}; S.selected = {}; S.view = ""; render(); toast("Agora você é outro “celular”.");
  });
}

store.watchPolls(polls => { S.polls = polls; render(); }, e => {
  app.innerHTML = `<div class="state"><div class="big">📡</div><h2>Sem conexão</h2><p>${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
});

/* ---------- Reações ---------- */
let sent = 0, last = 0;
const pad = $("#reactPad");
pad.innerHTML = `<p>Mande sua reação pro telão</p><div class="react-row">${REACTIONS.map(e => `<button type="button" data-e="${e}" aria-label="Reagir com ${e}">${e}</button>`).join("")}</div>`;
$$("button", pad).forEach(b => b.addEventListener("click", async () => {
  const now = Date.now(), r = b.getBoundingClientRect();
  floatEmoji(b.dataset.e, r.left + r.width / 2 - 16, r.top - 10);
  b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit"); buzz(10);
  if (now - last < 700 || sent >= 80) return; // sem exagero: protege a cota grátis
  last = now; sent++;
  try { await store.react(b.dataset.e); } catch (e) { console.warn(e); }
}));
const showPad = on => pad.classList.toggle("show", on);

/* ---------- Já votei? ---------- */
async function checkMine(p) {
  if (S.checked[p.id]) return;
  S.checked[p.id] = true;
  const cached = getCache(p.id);
  if (cached) S.mine[p.id] = cached;
  try { const v = await store.myVote(p.id); S.mine[p.id] = v; setCache(p.id, v); } catch (e) { console.warn(e); }
  S.view = ""; render();
}

function pick() {
  const polls = (S.polls || []).slice().sort((a, b) => ts(b) - ts(a));
  if (S.focus) { const p = polls.find(x => x.id === S.focus); if (p) return { poll: p }; }
  const open = polls.filter(p => p.status === "open");
  if (open.length === 1) return { poll: open[0] };
  if (open.length > 1) return { list: open };
  const revealed = polls.filter(p => p.reveal && p.results);
  if (revealed.length) return { poll: revealed[0], others: revealed.slice(1) };
  const closed = polls.filter(p => p.status === "closed");
  if (closed.length) return { poll: closed[0] };
  return {};
}

function setHero(p) {
  const st = $("#heroStatus");
  $("#heroTitle").textContent = p ? (p.title || "Votação") : "De repente 30 Celebration";
  $("#heroDesc").textContent = p ? (p.description || "Votação ao vivo") : "Votação ao vivo da apresentação campeã.";
  st.hidden = !p;
  if (p) { st.className = "status " + (p.reveal ? "closed" : p.status); st.textContent = p.reveal ? "Resultado" : statusLabel[p.status]; }
}

// Só redesenha quando a tela muda de verdade (evita "piscar" as animações)
function paint(key, html, after) {
  if (S.view === key) return;
  S.view = key; app.innerHTML = html; app.classList.remove("swap"); void app.offsetWidth; app.classList.add("swap");
  after && after();
}

function render() {
  if (!S.polls) return;
  const { poll, list, others } = pick();
  bar.classList.remove("show");

  if (list) {
    setHero(null); showPad(true);
    return paint("list:" + list.map(p => p.id).join(), `<h2 class="h3" style="margin:4px 0 12px">Escolha a votação</h2><div class="poll-list">` +
      list.map((p, i) => `<a class="poll-link" style="--i:${i}" href="?id=${encodeURIComponent(p.id)}"><b>${esc(p.title)}</b><span class="status open">Aberta</span></a>`).join("") + `</div>`);
  }
  setHero(poll);
  if (!poll || poll.status === "draft") {
    showPad(true);
    return paint("wait", `<div class="state"><div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><h2>Já já começa!</h2><p>A votação abre na hora do show. Deixe esta página aberta — ela atualiza sozinha.</p></div>`);
  }
  if (poll.reveal && poll.results) { showPad(true); return renderResults(poll, others); }

  checkMine(poll);
  const mine = S.mine[poll.id], opts = poll.options || [];

  if (mine) {
    showPad(true);
    const o = opts.find(x => x.id === mine);
    return paint("voted:" + poll.id + poll.status, `<div class="voted-card"><div class="check-anim" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h2>Voto registrado!</h2><p>Você votou em</p><span class="choice">${esc(o ? o.name : "sua escolha")}</span></div>
      <p class="hint center">${poll.status === "open" ? "O resultado aparece aqui e no telão quando for publicado." : "Votação encerrada. Aguarde o resultado!"}</p>`);
  }
  if (poll.status === "closed") {
    showPad(true);
    return paint("closed:" + poll.id, `<div class="state"><div class="big drum">🥁</div><h2>Votação encerrada</h2><p>Apurando os votos… fique de olho no telão!</p></div>`);
  }

  showPad(false);
  const sel = S.selected[poll.id];
  paint("vote:" + poll.id + ":" + opts.map(o => o.id + o.name).join(), `<p class="hint" style="margin:0 0 12px">Toque na sua favorita e confirme. <b>1 voto por celular.</b></p>
    <div class="options" role="radiogroup" aria-label="${esc(poll.title)}">` +
    opts.map((o, i) => `<button type="button" class="opt" style="--i:${i}" role="radio" aria-checked="false" data-id="${esc(o.id)}">
        <span class="num">${i + 1}</span>
        <span class="nm">${esc(o.name)}${o.detail ? `<small>${esc(o.detail)}</small>` : ""}</span>
        <span class="radio" aria-hidden="true"></span></button>`).join("") + `</div>`,
    () => $$(".opt", app).forEach(b => b.addEventListener("click", () => { S.selected[poll.id] = b.dataset.id; buzz(12); render(); })));

  $$(".opt", app).forEach(b => b.setAttribute("aria-checked", b.dataset.id === sel));
  if (sel) {
    const o = opts.find(x => x.id === sel);
    $("#confirmBtn").textContent = `Votar em ${o ? o.name : ""}`;
    bar.classList.add("show");
    $("#confirmBtn").onclick = () => { $("#dlgName").textContent = o.name; dlg.showModal(); };
    $("#dlgOk").onclick = () => doVote(poll, sel);
  }
}

$("#dlgCancel").addEventListener("click", () => dlg.close());

async function doVote(poll, option) {
  if (S.busy) return;
  S.busy = true; $("#dlgOk").disabled = true; $("#dlgOk").textContent = "Enviando…";
  try {
    await store.vote(poll.id, option);
    S.mine[poll.id] = option; setCache(poll.id, option);
    dlg.close(); buzz([20, 40, 20]); confetti(); render();
  } catch (e) {
    dlg.close();
    try { const v = await store.myVote(poll.id); if (v) { S.mine[poll.id] = v; setCache(poll.id, v); render(); toast("Este celular já tinha votado."); return; } } catch {}
    toast(errMsg(e), 4000);
  } finally {
    S.busy = false; $("#dlgOk").disabled = false; $("#dlgOk").textContent = "Confirmar";
  }
}

function renderResults(poll, others = []) {
  const { total, rows } = tally(poll, poll.results.counts);
  const top = rows[0], winners = rows.filter(r => r.votes === (top && top.votes));
  paint("res:" + poll.id + ":" + total, `<div class="winner"><div class="crown">🏆</div><p class="cond" style="margin:0;font-size:1.2rem">${winners.length > 1 ? "Empate no topo!" : "A campeã é…"}</p>
      <h2>${esc(winners.map(r => r.name).join(" & ") || "—")}</h2>
      <p style="margin:0;opacity:.85"><b class="cu">0</b> ${total === 1 ? "voto" : "votos"} no total</p></div>
    <div class="bars">` + rows.map((r, i) => `<div class="barrow ${i === 0 && r.votes ? "first" : ""}" style="--i:${i}"><span class="fill" data-w="${r.pct}" style="width:0"></span>
      <span class="nm">${i + 1}º · ${esc(r.name)}${r.detail ? `<small>${esc(r.detail)}</small>` : ""}</span>
      <span class="ct">${r.votes}<small>${r.pct}%</small></span></div>`).join("") + `</div>` +
    (others.length ? `<h3 class="h3" style="margin:28px 0 10px">Outros resultados</h3><div class="poll-list">` +
      others.map(p => `<a class="poll-link" href="?id=${encodeURIComponent(p.id)}"><b>${esc(p.title)}</b><span class="status closed">Ver</span></a>`).join("") + `</div>` : ""),
    () => {
      countUp($(".cu", app), total, 1200);
      requestAnimationFrame(() => setTimeout(() => $$(".fill", app).forEach(f => f.style.width = f.dataset.w + "%"), 150));
      let celebrated = false; try { celebrated = !!sessionStorage.getItem("celebrou:" + poll.id); sessionStorage.setItem("celebrou:" + poll.id, 1); } catch {}
      if (!celebrated) { confetti(160); buzz([30, 60, 30, 60, 80]); }
    });
}

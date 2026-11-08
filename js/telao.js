import { store, ts, tally } from "./store.js";
import { $, $$, esc, confetti, qrSVG, statusLabel, floatEmoji } from "./ui.js";

const fixed = new URLSearchParams(location.search).get("id");
const voteURL = new URL("votar.html", location.href).href;
const shortURL = voteURL.replace(/^https?:\/\//, "");
const S = { polls: [], admin: false, counts: {}, watch: null, watchId: null, revealed: {}, view: "", lastTotal: null, reacts: 0 };

store.watchPolls(p => { S.polls = p; follow(); render(); });
store.onAuth(u => { S.admin = !!(u && u.isAdmin); follow(); render(); });

/* Reações vindas dos celulares */
store.watchReactions(e => {
  S.reacts++;
  floatEmoji(e, innerWidth * (0.08 + Math.random() * 0.84), innerHeight - 60, true);
  const rc = $("#reactCount"); if (rc) { rc.textContent = S.reacts; rc.parentElement.classList.remove("bump"); void rc.offsetWidth; rc.parentElement.classList.add("bump"); }
});

function current() {
  const ps = S.polls.slice().sort((a, b) => ts(b) - ts(a));
  if (fixed) return ps.find(p => p.id === fixed) || null;
  return ps.find(p => p.status === "open") || ps.find(p => p.reveal) || ps.find(p => p.status === "closed") || ps[0] || null;
}

// contagem ao vivo só com login da organização
function follow() {
  const p = current(), id = p && S.admin && p.status !== "draft" ? p.id : null;
  if (id === S.watchId) return;
  if (S.watch) S.watch();
  S.watch = null; S.watchId = id; S.lastTotal = null;
  if (id) S.watch = store.watchVotes(id, c => { S.counts[id] = c; render(); }, () => {});
}

const qrBlock = () => `<div class="qr">${qrSVG(voteURL)}<p>Aponte a câmera e vote!</p><small>${esc(shortURL)}</small></div>`;
const reactBadge = () => `<div class="rbadge"><span>👏</span><b id="reactCount">${S.reacts}</b><small>reações</small></div>`;

function paint(key, html, after) {
  const body = $("#body");
  if (S.view === key) return false;
  S.view = key; body.innerHTML = html; body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap");
  after && after(); return true;
}

function render() {
  const p = current(), st = $("#st");
  $("#footR").innerHTML = (S.admin ? "" : `<a href="admin.html">Entrar para ver a contagem ao vivo</a> · `) + `<button class="fs" id="fsBtn">Tela cheia</button>`;
  $("#fsBtn").onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});

  if (!p || p.status === "draft") {
    st.hidden = true;
    return paint("wait:" + (p ? p.id + p.title : ""), `<div><p class="kick">De repente 30 Celebration</p><h1>${esc(p ? p.title : "Votação ao vivo")}</h1>
      <p class="desc">A votação começa já já. Prepare o celular!</p>${reactBadge()}</div>${qrBlock()}`);
  }
  st.hidden = false; st.className = "status " + (p.reveal ? "closed" : p.status); st.textContent = p.reveal ? "Resultado" : statusLabel[p.status];

  if (p.reveal && p.results) return renderReveal(p);

  const counts = S.counts[p.id];
  const { total, rows } = tally(p, counts || {});
  const live = S.admin && counts;

  if (p.status === "closed") {
    paint("closed:" + p.id, `<div class="center"><div class="drum">🥁</div><h1>Votação encerrada!</h1><p class="desc" style="margin:0 auto 1em">Apurando os votos…</p>
      <div class="count center-flex" ${live ? "" : "hidden"}><b id="total">${total}</b><span>votos</span></div></div>`);
    if ($("#total")) $("#total").textContent = total;
    return;
  }

  paint("open:" + p.id + ":" + (p.showLive ? 1 : 0) + ":" + (live ? 1 : 0), `<div class="${p.showLive && live ? "compact" : ""}"><p class="kick">Votação ao vivo</p><h1>${esc(p.title)}</h1>
      <p class="desc">${esc(p.description || "Vote pelo celular na sua apresentação favorita!")}</p>
      <div class="count" ${live ? "" : "hidden"}><b id="total">${total}</b><span>${total === 1 ? "voto" : "votos"}</span></div>
      ${p.showLive && live ? `<div class="bars" id="liveBars"></div>` : ""}${reactBadge()}</div>${qrBlock()}`);

  const tEl = $("#total");
  if (tEl) {
    tEl.textContent = total;
    if (S.lastTotal !== null && total > S.lastTotal) { tEl.parentElement.classList.remove("bump"); void tEl.offsetWidth; tEl.parentElement.classList.add("bump"); }
    S.lastTotal = total;
  }
  const lb = $("#liveBars");
  if (lb) lb.innerHTML = barsHTML(rows, true);
}

/* Revelação: do último lugar até a campeã */
function renderReveal(p) {
  const { total, rows } = tally(p, p.results.counts);
  const winners = rows.filter(r => r.votes === rows[0].votes);
  const instant = !!S.revealed[p.id];
  const drew = paint("rev:" + p.id + ":" + total, `<div class="res-grid">
      <div class="center champ-box ${instant ? "show" : ""}" id="champBox">
        <p class="desc" style="margin:0 auto">${winners.length > 1 ? "Empate! As campeãs são" : "A campeã é…"}</p>
        <div class="champ sticker">${esc(winners.map(w => w.name).join(" & "))}</div>
        <div class="count center-flex"><b>${total}</b><span>votos</span></div>
      </div>
      <div class="bars reveal-bars">${barsHTML(rows, instant)}</div></div>`);
  if (!drew || instant) return;
  S.revealed[p.id] = true;

  const els = $$(".reveal-bars .barrow").reverse(); // último → primeiro
  let k = 0;
  const step = () => {
    if (k < els.length) {
      const el = els[k++]; el.classList.add("show");
      const f = $(".fill", el); f.style.width = f.dataset.w + "%";
      setTimeout(step, k === els.length ? 1800 : 1300);
    } else {
      $("#champBox").classList.add("show"); confetti(220); setTimeout(() => confetti(160), 1200);
    }
  };
  setTimeout(step, 900);
}

function barsHTML(rows, show) {
  return rows.map((r, i) => `<div class="barrow ${i === 0 && r.votes ? "first" : ""} ${show ? "show" : ""}"><span class="fill" data-w="${r.pct}" style="width:${show ? r.pct : 0}%"></span>
    <span class="nm"><em>${i + 1}º</em> ${esc(r.name)}${r.detail ? `<small>${esc(r.detail)}</small>` : ""}</span><span class="ct">${r.votes}<small>${r.pct}%</small></span></div>`).join("");
}

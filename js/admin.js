import { store, isDemo, local, ts, tally, newOptionId, voteURL as getVoteURL } from "./store.js";
import { $, $$, esc, toast, demoBanner, qrSVG, errMsg, statusLabel } from "./ui.js";

const app = $("#app");
const S = { user: undefined, polls: [], counts: {}, watchers: {}, form: null, unPolls: null };
const voteURL = getVoteURL();
const telaoURL = new URL("telao.html", location.href).href;

if (isDemo) demoBanner("No modo demonstração, qualquer e-mail e senha entram.");

store.onAuth(u => {
  S.user = u;
  $("#who").innerHTML = u ? `${esc(u.email)} · <a href="#" id="logout">Sair</a>` : "";
  if (u) $("#logout").onclick = e => { e.preventDefault(); store.logout(); };
  if (u && u.isAdmin) {
    if (!S.unPolls) S.unPolls = store.watchPolls(p => { S.polls = p; syncWatchers(); render(); }, e => toast(errMsg(e), 5000));
  } else if (S.unPolls) { S.unPolls(); S.unPolls = null; stopWatchers(); }
  render();
});

/* ---------- apuração em tempo real ---------- */
function syncWatchers() {
  const need = new Set(S.polls.filter(p => p.status !== "draft").map(p => p.id));
  for (const id of Object.keys(S.watchers)) if (!need.has(id)) { S.watchers[id](); delete S.watchers[id]; }
  for (const id of need) if (!S.watchers[id]) S.watchers[id] = store.watchVotes(id, c => { S.counts[id] = c; renderPoll(id); }, e => console.warn(e));
}
function stopWatchers() { Object.values(S.watchers).forEach(f => f()); S.watchers = {}; }

/* ---------- telas ---------- */
function render() {
  if (S.user === undefined) return;
  if (!S.user) return renderLogin();
  if (!S.user.isAdmin) return renderNotAdmin();
  renderDash();
}

function renderLogin() {
  app.innerHTML = `<div class="card login-card">
    <p class="eyebrow">Área da organização</p>
    <h1 style="font-size:2rem">Entrar</h1>
    <form id="loginForm">
      <div class="field" ${local ? "hidden" : ""}><label for="em">E-mail</label><input class="input" id="em" type="email" autocomplete="username" ${local ? "" : "required"}></div>
      <div class="field"><label for="pw">${local ? "Senha da organização" : "Senha"}</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <p class="err" id="loginErr"></p>
      <button class="btn block" type="submit">Entrar</button>
    </form>
    <p class="hint" style="margin-top:14px">${local
      ? "Modo local (sem internet): use a senha criada ao iniciar o servidor no notebook."
      : "Acesso só para a organização. O login é criado no Firebase (veja PUBLICAR.md)."}</p></div>`;
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.submitter || $("#loginForm button"); btn.disabled = true; $("#loginErr").textContent = "";
    try { await store.login($("#em").value.trim(), $("#pw").value); }
    catch (err) { $("#loginErr").textContent = errMsg(err); btn.disabled = false; }
  });
}

function renderNotAdmin() {
  app.innerHTML = `<div class="card login-card"><h1 style="font-size:1.8rem">Quase lá!</h1>
    <p>Você entrou, mas esta conta ainda não está liberada como organização.</p>
    <p class="hint">No Firebase Console → Firestore, crie a coleção <b>admins</b> com um documento cujo ID é:</p>
    <div class="linkline"><code id="uid">${esc(S.user.uid)}</code><button class="btn small" id="cpUid" type="button">Copiar</button></div>
    <p class="hint">Depois recarregue esta página.</p>
    <button class="btn ghost" type="button" id="out">Sair</button></div>`;
  $("#cpUid").onclick = () => copy(S.user.uid);
  $("#out").onclick = () => store.logout();
}

function renderDash() {
  if (S.form && S.formRead && $("#pollForm")) S.formRead(); // não perder o que está sendo digitado
  const polls = S.polls.slice().sort((a, b) => ts(b) - ts(a));
  app.innerHTML = `
    <p class="eyebrow">Área da organização</p>
    <h1>Votações <em>ao vivo</em></h1>
    <div class="admin-grid">
      <div>
        <div id="formSlot"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 12px">
          <h2 class="h3" style="margin:0">Suas votações</h2>
          <button class="btn small" type="button" id="newPoll">+ Nova votação</button>
        </div>
        <div id="pollList">${polls.length ? polls.map(p => `<article class="card poll-card" id="pc-${esc(p.id)}"></article>`).join("") :
          `<div class="card empty">Nenhuma votação ainda. Crie a primeira — por exemplo “Apresentação campeã”.</div>`}</div>
      </div>
      <aside class="card side-card">
        <h3 class="h3">Link para o público</h3>
        <div class="qr-box">${qrSVG(voteURL)}</div>
        <div class="linkline"><code>${esc(voteURL)}</code><button class="btn small" type="button" id="cpVote">Copiar</button></div>
        <a class="btn block wine" href="telao.html" target="_blank" rel="noopener">Abrir telão ↗</a>
        <p class="hint" style="margin-top:10px">O telão segue sozinho a votação que estiver aberta. Abra no notebook do projetor, entre com seu login e aperte <b>F11</b>.</p>
        <p class="hint" style="margin-top:10px">O público também pode mandar reações (👏 😂 🔥 ❤️ 🎉) que voam no telão.
          <button class="link" type="button" id="clrReact">Limpar reações antigas</button></p>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <h3 class="h3">Como fazer ao vivo</h3>
        <ol class="hint" style="padding-left:18px;margin:0;display:grid;gap:6px">
          <li>Crie a votação com as apresentações.</li>
          <li>Na hora, clique <b>Abrir votação</b> e mostre o QR no telão.</li>
          <li>Clique <b>Encerrar</b> quando der o tempo.</li>
          <li>Confira a apuração e clique <b>Publicar resultado</b> — aparece no telão e nos celulares.</li>
        </ol>
      </aside>
    </div>`;
  $("#cpVote").onclick = () => copy(voteURL);
  $("#clrReact").onclick = async () => {
    if (!confirm("Apagar as reações guardadas? (não afeta votos)")) return;
    try { const n = await store.clearReactions(); toast(`${n} reações apagadas.`); } catch (e) { toast(errMsg(e), 4000); }
  };
  $("#newPoll").onclick = () => openForm(null);
  polls.forEach(p => renderPoll(p.id));
  if (S.form) drawForm(); else if (!polls.length) openForm(null);
}

function renderPoll(id) {
  const el = document.getElementById("pc-" + id), p = S.polls.find(x => x.id === id);
  if (!el || !p) return;
  const counts = S.counts[id] || {};
  const { total, rows } = tally(p, counts);
  const live = p.status !== "draft";
  const created = new Date(ts(p)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const A = [];
  if (p.status === "draft") A.push(`<button class="btn small lime" data-a="open">▶ Abrir votação</button>`, `<button class="btn small ghost" data-a="edit">Editar</button>`);
  if (p.status === "open") A.push(`<button class="btn small wine" data-a="close">■ Encerrar votação</button>`);
  if (p.status === "closed") {
    A.push(p.reveal ? `<button class="btn small ghost" data-a="hide">Ocultar resultado</button>` : `<button class="btn small lime" data-a="publish">🏆 Publicar resultado</button>`);
    A.push(`<button class="btn small ghost" data-a="reopen">Reabrir</button>`, `<button class="btn small ghost" data-a="copy">Copiar resultado</button>`);
  }
  if (live) A.push(`<a class="btn small ghost" href="telao.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Telão ↗</a>`);
  if (p.status !== "open") {
    if (live) A.push(`<button class="btn small ghost" data-a="reset">Zerar votos</button>`);
    A.push(`<button class="btn small danger" data-a="delete">Excluir</button>`);
  }

  el.innerHTML = `<header><div><span class="status ${p.status}">${p.reveal ? "Publicada" : statusLabel[p.status]}</span>
      <h3>${esc(p.title)}</h3><div class="meta">${(p.options || []).length} opções · criada ${created}</div></div>
      ${live ? `<label class="switch"><input type="checkbox" data-a="live" ${p.showLive ? "checked" : ""}> Parcial no telão</label>` : ""}</header>
    ${live ? `<div class="totals"><b>${total}</b><span>${total === 1 ? "voto" : "votos"}${p.status === "open" ? " · ao vivo" : ""}</span></div>
      <div class="bars">${rows.map((r, i) => `<div class="barrow ${i === 0 && r.votes ? "first" : ""}"><span class="fill" style="width:${r.pct}%"></span>
        <span class="nm">${esc(r.name)}${r.detail ? `<small>${esc(r.detail)}</small>` : ""}</span><span class="ct">${r.votes}<small>${r.pct}%</small></span></div>`).join("")}</div>`
      : `<ol class="hint" style="margin:12px 0 0;padding-left:20px">${(p.options || []).map(o => `<li>${esc(o.name)}${o.detail ? ` — ${esc(o.detail)}` : ""}</li>`).join("")}</ol>`}
    <div class="actions">${A.join("")}</div>`;

  $$("[data-a]", el).forEach(b => b.addEventListener(b.type === "checkbox" ? "change" : "click", () => act(p, b.dataset.a, b)));
}

async function act(p, a, el) {
  const counts = S.counts[p.id] || {};
  try {
    if (a === "open") {
      const others = S.polls.filter(x => x.status === "open" && x.id !== p.id);
      if (others.length && confirm(`Encerrar também "${others.map(o => o.title).join(", ")}"? (recomendado: uma votação aberta por vez)`))
        await Promise.all(others.map(o => store.updatePoll(o.id, { status: "closed" })));
      await store.updatePoll(p.id, { status: "open", reveal: false, results: null }); toast("Votação aberta! 🎉");
    }
    if (a === "close") { if (!confirm("Encerrar a votação? Ninguém mais poderá votar.")) return; await store.updatePoll(p.id, { status: "closed" }); toast("Votação encerrada."); }
    if (a === "reopen") { await store.updatePoll(p.id, { status: "open", reveal: false, results: null }); toast("Votação reaberta."); }
    if (a === "publish") {
      const { total } = tally(p, counts);
      if (!confirm(`Publicar o resultado (${total} votos)? Ele aparece no telão e nos celulares.`)) return;
      await store.updatePoll(p.id, { reveal: true, results: { counts, total, at: Date.now() } }); toast("Resultado publicado! 🏆");
    }
    if (a === "hide") { await store.updatePoll(p.id, { reveal: false }); toast("Resultado ocultado."); }
    if (a === "live") { await store.updatePoll(p.id, { showLive: el.checked }); }
    if (a === "edit") openForm(p);
    if (a === "copy") {
      const { total, rows } = tally(p, counts);
      copy(`${p.title} — ${total} votos\n` + rows.map((r, i) => `${i + 1}º ${r.name}: ${r.votes} (${r.pct}%)`).join("\n"));
    }
    if (a === "reset") { if (!confirm("Apagar TODOS os votos desta votação? Não dá para desfazer.")) return; await store.resetVotes(p.id); await store.updatePoll(p.id, { reveal: false, results: null, status: "draft" }); toast("Votos zerados."); }
    if (a === "delete") { if (!confirm(`Excluir "${p.title}" e todos os votos? Não dá para desfazer.`)) return; await store.deletePoll(p.id); toast("Votação excluída."); }
  } catch (e) { toast(errMsg(e), 4500); }
}

/* ---------- formulário criar/editar ---------- */
function openForm(p) {
  S.form = p
    ? { id: p.id, title: p.title, description: p.description || "", options: (p.options || []).map(o => ({ ...o })) }
    : { id: null, title: "Apresentação campeã", description: "Vote na apresentação mais divertida do De Repente 30 Celebration!", options: [{ id: newOptionId(), name: "", detail: "" }, { id: newOptionId(), name: "", detail: "" }, { id: newOptionId(), name: "", detail: "" }] };
  drawForm();
  $("#formSlot").scrollIntoView({ behavior: "smooth", block: "start" });
}

function drawForm() {
  const f = S.form, slot = $("#formSlot");
  if (!slot) return;
  if (!f) { slot.innerHTML = ""; return; }
  slot.innerHTML = `<form class="card" id="pollForm" style="margin-bottom:22px">
      <h2 class="h3">${f.id ? "Editar votação" : "Nova votação"}</h2>
      <div class="field"><label for="ft">Título</label><input class="input" id="ft" required maxlength="80" value="${esc(f.title)}"></div>
      <div class="field"><label for="fd">Descrição <span class="hint">(opcional)</span></label><input class="input" id="fd" maxlength="160" value="${esc(f.description)}"></div>
      <div class="field"><label>Opções <span class="hint">(nome da apresentação · grupo/detalhe opcional)</span></label>
        <div class="opt-rows">${f.options.map((o, i) => `<div class="opt-row" data-i="${i}"><span class="n">${i + 1}</span>
          <input class="input name" placeholder="Nome da apresentação" maxlength="70" value="${esc(o.name)}">
          <input class="input detail" placeholder="Grupo / detalhe" maxlength="70" value="${esc(o.detail || "")}">
          <button type="button" class="rm" aria-label="Remover opção ${i + 1}">✕</button></div>`).join("")}</div>
        <button type="button" class="btn small ghost" id="addOpt">+ Adicionar opção</button>
      </div>
      <p class="err" id="formErr"></p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">${f.id ? "Salvar" : "Criar votação"}</button><button class="btn ghost" type="button" id="cancelForm">Cancelar</button></div>
    </form>`;
  const read = () => {
    f.title = $("#ft").value; f.description = $("#fd").value;
    $$(".opt-row", slot).forEach(r => { const o = f.options[+r.dataset.i]; o.name = $(".name", r).value; o.detail = $(".detail", r).value; });
  };
  S.formRead = read;
  $("#addOpt").onclick = () => { read(); f.options.push({ id: newOptionId(), name: "", detail: "" }); drawForm(); $$(".opt-row .name", slot).at(-1).focus(); };
  $$(".rm", slot).forEach(b => b.onclick = () => { read(); f.options.splice(+b.parentElement.dataset.i, 1); drawForm(); });
  $("#cancelForm").onclick = () => { S.form = null; drawForm(); };
  $("#pollForm").onsubmit = async e => {
    e.preventDefault(); read();
    const options = f.options.filter(o => o.name.trim());
    if (options.length < 2) { $("#formErr").textContent = "Coloque pelo menos 2 opções."; return; }
    const data = { title: f.title.trim(), description: f.description.trim(), options };
    try {
      if (f.id) await store.updatePoll(f.id, data); else await store.createPoll(data);
      S.form = null; drawForm(); toast(f.id ? "Votação salva." : "Votação criada! Abra quando for a hora.");
    } catch (err) { $("#formErr").textContent = errMsg(err); }
  };
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copiado!"); } catch { prompt("Copie:", text); }
}

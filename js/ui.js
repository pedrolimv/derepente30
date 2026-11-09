export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function toast(msg, ms = 2400) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), ms);
}

export function confetti(n = 120) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#55df5a", "#6cc8d2", "#c477a0", "#a8366f", "#ffffff", "#f5c542"];
  const box = document.createElement("div");
  box.className = "confetti";
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % colors.length]};` +
      `animation-delay:${Math.random() * .6}s;animation-duration:${2.2 + Math.random() * 1.8}s;` +
      `transform:rotate(${Math.random() * 360}deg);width:${6 + Math.random() * 8}px;height:${8 + Math.random() * 10}px`;
    box.append(p);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4800);
}

export function demoBanner(extra = "") {
  const b = document.createElement("div");
  b.className = "demo-banner";
  b.innerHTML = `<b>Modo demonstração</b> — os dados ficam só neste navegador. Configure o Firebase (veja PUBLICAR.md) para valer de verdade. ${extra}`;
  document.body.prepend(b);
  return b;
}

export function qrSVG(text) {
  if (!window.qrcode) return "";
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
}

export function errMsg(e) {
  const c = e && (e.code || "");
  if (c.includes("permission-denied")) return "Sem permissão. A votação pode ter sido encerrada ou você já votou.";
  if (c.includes("wrong-password") || c.includes("invalid-credential") || c.includes("user-not-found")) return "E-mail ou senha incorretos.";
  if (c.includes("too-many-requests")) return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (c.includes("unavailable") || c.includes("network")) return "Sem conexão. Verifique a internet e tente de novo.";
  if (c.includes("admin-restricted-operation") || c.includes("operation-not-allowed")) return "Login anônimo não está ativado no Firebase (veja PUBLICAR.md).";
  return (e && e.message) || "Algo deu errado. Tente de novo.";
}

export const REACTIONS = ["👏", "😂", "🔥", "❤️", "🎉"];

// Emoji que sobe e some, a partir de um ponto (x,y) da tela
export function floatEmoji(e, x, y, big = false) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const s = document.createElement("span");
  s.className = "float-emoji" + (big ? " big" : "");
  s.textContent = e;
  s.style.left = x + "px"; s.style.top = y + "px";
  s.style.setProperty("--dx", (Math.random() * 80 - 40) + "px");
  s.style.setProperty("--rot", (Math.random() * 50 - 25) + "deg");
  document.body.append(s);
  setTimeout(() => s.remove(), big ? 4200 : 1600);
}

// Anima um número de 0 até o valor
export function countUp(el, to, ms = 900) {
  const from = +el.dataset.v || 0, t0 = performance.now();
  el.dataset.v = to;
  if (document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = to; return; }
  const step = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export const statusLabel = { draft: "Rascunho", open: "Aberta", closed: "Encerrada" };

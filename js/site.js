import { confetti } from "./ui.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Contagem regressiva: 19/11 às 20h ---------- */
(() => {
  const target = new Date("2026-11-19T20:00:00-03:00"), end = new Date("2026-11-22T16:00:00-03:00");
  const el = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') };
  const pad = n => String(n).padStart(2, "0");
  function set(k, v) { if (el[k].textContent !== v) { el[k].textContent = v; el[k].classList.remove("tick"); void el[k].offsetWidth; el[k].classList.add("tick"); } }
  function tick() {
    const now = Date.now();
    if (now >= target) {
      $("#countdown").hidden = true;
      $("#cdLabel").innerHTML = now < end ? "<b>Estamos juntos!</b> Aproveite cada momento 💚" : "<b>Até o próximo acampamento!</b>";
      return clearInterval(timer);
    }
    let s = Math.floor((target - now) / 1000);
    set("d", pad(Math.floor(s / 86400))); s %= 86400;
    set("h", pad(Math.floor(s / 3600))); s %= 3600;
    set("m", pad(Math.floor(s / 60))); set("s", pad(s % 60));
  }
  const timer = setInterval(tick, 1000); tick();
})();

/* ---------- Cabeçalho, progresso, topo ---------- */
const top = $("#top"), bar = $("#progressTop"), toTop = $("#toTop");
function onScroll() {
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
  top.classList.toggle("scrolled", y > 8);
  bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  toTop.classList.toggle("show", y > innerHeight * 1.2);
}
addEventListener("scroll", onScroll, { passive: true }); onScroll();
toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

/* ---------- Menu celular ---------- */
const sheet = $("#sheet"), menuBtn = $("#menuBtn");
function setSheet(open) {
  sheet.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
  if (open) $("#sheetClose").focus();
}
menuBtn.addEventListener("click", () => setSheet(true));
$("#sheetClose").addEventListener("click", () => setSheet(false));
$$("#sheet a").forEach(a => a.addEventListener("click", () => setSheet(false)));
addEventListener("keydown", e => { if (e.key === "Escape" && sheet.classList.contains("open")) setSheet(false); });

/* ---------- Seção ativa ---------- */
const ids = ["inicio", "levar", "programacao", "epoca", "celebration", "local", "camisetas", "contato"];
const spy = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  const id = en.target.id;
  $$(".nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
  $$(".tabbar a[data-sec]").forEach(a => a.classList.toggle("active", a.dataset.sec === id));
}), { rootMargin: "-45% 0px -50% 0px" });
ids.forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

/* ---------- Animação ao rolar (escalonada por grupo) ---------- */
const rev = new IntersectionObserver(entries => {
  entries.filter(e => e.isIntersecting).forEach((en, i) => {
    en.target.style.setProperty("--rd", (i * 0.07) + "s");
    en.target.classList.add("in"); rev.unobserve(en.target);
  });
}, { rootMargin: "0px 0px -8% 0px" });
$$(".reveal").forEach(el => rev.observe(el));

/* ---------- Checklist com anel de progresso ---------- */
(() => {
  const KEY = "acamp26-mala", boxes = $$("#checklist input[type=checkbox]"), saved = ls.get(KEY, {});
  const fg = $("#ringFg"), C = 2 * Math.PI * 52;
  let ready = false;
  function update() {
    const done = boxes.filter(b => b.checked).length, all = boxes.length;
    fg.style.strokeDashoffset = C * (1 - done / all);
    $("#ringNum").textContent = done; $("#ringOf").textContent = `de ${all}`;
    $("#ring").classList.toggle("done", done === all);
    $("#packMsg").textContent = done === all ? "Mala pronta! Partiu acamp 🎉" : done === 0 ? "Marque conforme arruma a mala." : done > all / 2 ? "Quase lá!" : "Bom começo!";
    if (done === all && ready) confetti(140);
  }
  boxes.forEach(b => {
    b.checked = !!saved[b.dataset.k];
    b.addEventListener("change", () => { saved[b.dataset.k] = b.checked; ls.set(KEY, saved); if (navigator.vibrate) navigator.vibrate(8); update(); });
  });
  update(); ready = true;
  $("#progReset").addEventListener("click", () => { boxes.forEach(b => { b.checked = false; saved[b.dataset.k] = false; }); ls.set(KEY, saved); update(); });
})();

/* ---------- Programação: destaca o dia de hoje ---------- */
(() => {
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  $$(".tl-day").forEach(li => li.classList.toggle("today", li.dataset.date === today));
})();

/* ---------- Lightbox ---------- */
const lb = $("#lightbox");
function openLB(src, alt) {
  const img = lb.querySelector("img"); img.src = src; img.alt = alt || "";
  if (lb.showModal) lb.showModal(); else open(src, "_blank");
}
lb.querySelector(".x").addEventListener("click", () => lb.close());
lb.addEventListener("click", e => { if (e.target === lb) lb.close(); });
$$(".zoomable").forEach(b => b.addEventListener("click", () => openLB(b.dataset.full, b.querySelector("img").alt)));

/* ---------- Banner 3D interativo ---------- */
(() => {
  const t = $("#tilt"); if (!t) return;
  const img = t.querySelector("img");
  t.addEventListener("click", () => openLB(img.src, img.alt));
  if (reduced) return;
  const move = (x, y) => {
    const r = t.getBoundingClientRect(), px = (x - r.left) / r.width - .5, py = (y - r.top) / r.height - .5;
    t.style.setProperty("--ry", (px * 10) + "deg"); t.style.setProperty("--rx", (-py * 8) + "deg");
    t.style.setProperty("--px", (-px * 18) + "px"); t.style.setProperty("--py", (-py * 18) + "px");
    t.style.setProperty("--mx", (px + .5) * 100 + "%"); t.style.setProperty("--my", (py + .5) * 100 + "%"); t.style.setProperty("--so", 1);
  };
  const reset = () => ["--rx", "--ry", "--px", "--py", "--so"].forEach(p => t.style.removeProperty(p));
  t.addEventListener("pointermove", e => { if (e.pointerType === "mouse") move(e.clientX, e.clientY); });
  t.addEventListener("pointerleave", reset);
  // No celular: inclina conforme a rolagem
  if (matchMedia("(hover: none)").matches) {
    addEventListener("scroll", () => {
      const r = t.getBoundingClientRect(), p = (r.top + r.height / 2) / innerHeight - .5;
      if (Math.abs(p) < 1) { t.style.setProperty("--rx", (p * 10) + "deg"); t.style.setProperty("--py", (p * -24) + "px"); }
    }, { passive: true });
  }
})();

/* ---------- Galeria das décadas ---------- */
(() => {
  const stage = $("#decStage"); if (!stage) return;
  const imgs = $$("img", stage), tabs = $$(".dec-tabs button"), dots = $$(".dec-dots i");
  let i = 0;
  function go(n) {
    i = (n + imgs.length) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle("on", k === i));
    tabs.forEach((t, k) => t.setAttribute("aria-selected", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
    tabs[i].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }
  tabs.forEach((t, k) => t.addEventListener("click", () => go(k)));
  $(".dec-nav.prev", stage).addEventListener("click", () => go(i - 1));
  $(".dec-nav.next", stage).addEventListener("click", () => go(i + 1));
  $(".dec-zoom", stage).addEventListener("click", () => openLB(imgs[i].src, imgs[i].alt));
  let x0 = null;
  stage.addEventListener("pointerdown", e => { x0 = e.clientX; });
  stage.addEventListener("pointerup", e => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  addEventListener("keydown", e => {
    const r = stage.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && !lb.open) { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); }
  });
})();

/* ---------- Vídeo (carrega o YouTube só ao clicar) ---------- */
(() => {
  const v = $("#video"); if (!v) return;
  v.addEventListener("click", () => {
    v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0" title="De repente 30 Celebration" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }, { once: true });
})();

/* ---------- Instagram (embeds oficiais, carregados ao aparecer) ---------- */
(() => {
  const row = $("#instaRow"); if (!row) return;
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return; io.disconnect();
    $$(".ig", row).forEach(el => {
      const f = document.createElement("iframe");
      f.src = `https://www.instagram.com/p/${el.dataset.ig}/embed/`;
      f.loading = "lazy"; f.title = "Foto do Instagram @espacovillaparaibuna"; f.setAttribute("scrolling", "no");
      f.addEventListener("load", () => el.classList.add("ready"));
      el.append(f);
    });
  }, { rootMargin: "300px" });
  io.observe(row);
})();

/* ---------- Números que contam ---------- */
const counter = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return; counter.unobserve(en.target);
  const el = en.target, to = +el.dataset.count, t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / 1200); el.textContent = "≈" + Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  reduced ? (el.textContent = "≈" + to) : requestAnimationFrame(step);
}), { threshold: .6 });
$$("[data-count]").forEach(el => counter.observe(el));

/* ---------- Cupom ---------- */
$("#copyCupom").addEventListener("click", async e => {
  const code = $("#cupom").textContent.trim(), btn = e.currentTarget;
  try { await navigator.clipboard.writeText(code); toast(`Cupom ${code} copiado!`); } catch { toast(`Cupom: ${code}`); }
  btn.classList.add("copied"); $(".cp", btn).lastChild.textContent = "Copiado";
  setTimeout(() => { btn.classList.remove("copied"); $(".cp", btn).lastChild.textContent = "Copiar"; }, 2000);
});

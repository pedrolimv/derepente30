// Desenha os motivos gráficos da identidade (listras onduladas e ondas diagonais)
const PALETTE = ["#15585f", "#a8366f", "#c477a0", "#6cc8d2", "#55df5a", "#520030", "#6cc8d2", "#13716a", "#c477a0", "#a8366f"];

function rand(seed) { // pseudo-aleatório determinístico, para o desenho não "pular"
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function stripesSVG(count = 16, seed = 7) {
  const W = 1000, H = 400, r = rand(seed), step = W / count, sw = step * 0.32;
  let paths = "";
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * step, a = (r() - 0.5) * step * 0.6, b = (r() - 0.5) * step * 0.6;
    paths += `<path d="M${x},-10 C${x + a},${H * 0.35} ${x - a},${H * 0.65} ${x + b},${H + 10}" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${paths}</svg>`;
}

export function wavesSVG() {
  const cols = ["#a8366f", "#c477a0", "#6cc8d2", "#55df5a", "#520030", "#6cc8d2", "#13716a", "#c477a0", "#a8366f", "#6cc8d2", "#55df5a"];
  let p = "";
  cols.forEach((c, i) => {
    const o = -300 + i * 140, w = 70 + ((i * 37) % 60);
    p += `<path d="M${-200},${o + 700} C${150},${o + 560} ${260},${o + 260} ${560},${o + 200} S${980},${o - 60} ${1200},${o - 320}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  });
  return `<svg viewBox="0 0 1000 1000" aria-hidden="true">${p}</svg>`;
}

export function paint(root = document) {
  root.querySelectorAll("[data-stripes]").forEach(el => {
    el.innerHTML = stripesSVG(+el.dataset.stripes || 16, +el.dataset.seed || 7);
  });
  root.querySelectorAll("[data-waves]").forEach(el => { el.innerHTML = wavesSVG(); });
}

paint();

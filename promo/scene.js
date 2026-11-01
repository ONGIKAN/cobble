const DURATION = 24.0;

const params = new URLSearchParams(location.search);
const RATIO = params.get('ratio') === '916' ? '916' : '169';
const root = document.getElementById('root');
root.dataset.ratio = RATIO;

const $ = (id) => document.getElementById(id);

/* ---------------- ratio-specific assets ---------------- */
if (RATIO === '916') {
  $('img2').src = 'assets/phone-edit.png';
  $('img3').src = 'assets/phone-run.png';
}

/* ---------------- export icons + card body wrapper ---------------- */
const ICONS = {
  html: `<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="6" width="44" height="52" stroke="#c9b2ff" stroke-width="3"/><path d="M10 6l44 52M54 6L10 58" stroke="#6d3fdc" stroke-width="2" opacity=".55"/><text x="32" y="40" font-family="Consolas,monospace" font-size="17" font-weight="700" fill="#c9b2ff" text-anchor="middle">&lt;/&gt;</text></svg>`,
  win: `<svg viewBox="0 0 64 64" fill="none"><rect x="9" y="13" width="20" height="18" fill="#c9b2ff"/><rect x="35" y="13" width="20" height="18" fill="#9d7bff"/><rect x="9" y="35" width="20" height="18" fill="#9d7bff"/><rect x="35" y="35" width="20" height="18" fill="#c9b2ff"/></svg>`,
  android: `<svg viewBox="0 0 64 64" fill="none"><path d="M18 30a14 14 0 0 1 28 0v18a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="#a7e8b4"/><path d="M18 30h28" stroke="#14101f" stroke-width="2"/><circle cx="26" cy="24" r="2" fill="#14101f"/><circle cx="38" cy="24" r="2" fill="#14101f"/><path d="M20 20l-6-7M44 20l6-7" stroke="#a7e8b4" stroke-width="3"/></svg>`,
};
for (const el of document.querySelectorAll('.ex-icon')) {
  el.innerHTML = ICONS[el.dataset.icon] || '';
}
for (const card of document.querySelectorAll('.ex-card')) {
  const name = card.querySelector('.ex-name');
  const desc = card.querySelector('.ex-desc');
  const body = document.createElement('div');
  body.className = 'ex-body';
  body.append(name, desc);
  card.append(body);
}

/* ---------------- floating background ---------------- */
const floaters = [];
for (let i = 0; i < 18; i += 1) {
  const el = document.createElement('div');
  el.className = 'floater';
  const size = 0.5 + ((i * 37) % 11) / 10;
  el.style.width = `${size}vmin`;
  el.style.height = `${size}vmin`;
  el.style.opacity = '0';
  $('floaters').append(el);
  floaters.push({ el, seed: (i * 53) % 100 });
}

/* ---------------- animation helpers ---------------- */
const U = () => Math.min(innerWidth, innerHeight) / 100;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

function sample(frames, t, ease = easeOut) {
  const base = { x: 0, y: 0, s: 1, r: 0, o: 1 };
  if (t <= frames[0][0]) return { ...base, ...frames[0][1] };
  for (let i = 1; i < frames.length; i += 1) {
    const [t1, a] = frames[i - 1];
    const [t2, b] = frames[i];
    if (t <= t2) {
      const p = ease((t - t1) / Math.max(0.0001, t2 - t1));
      const out = {};
      for (const key of new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(base)])) {
        const v1 = a[key] ?? base[key];
        const v2 = b[key] ?? base[key];
        out[key] = v1 + (v2 - v1) * p;
      }
      return { ...base, ...out };
    }
  }
  return { ...base, ...frames[frames.length - 1][1] };
}

function put(el, st, extraTransform = '') {
  if (!el) return;
  const u = U();
  el.style.opacity = String(Math.max(0, Math.min(1, st.o === undefined ? 1 : st.o)));
  el.style.transform = `translate(${(st.x || 0) * u}px, ${(st.y || 0) * u}px) scale(${st.s === undefined ? 1 : st.s}) rotate(${st.r || 0}deg) ${extraTransform}`;
}

function fadeWindow(t, start, end) {
  if (t < start || t > end) return 0;
  const fadeIn = Math.min(1, (t - start) / 0.3);
  const fadeOut = Math.min(1, (end - t) / 0.4);
  return Math.min(fadeIn, fadeOut);
}

const sceneEls = {};
for (let i = 1; i <= 7; i += 1) sceneEls[`s${i}`] = $(`s${i}`);

/* element registries */
const els = {
  logoWrap: $('logoWrap'), brand: $('brand'), title: $('title'), subline: $('subline'), tagrow: $('tagrow'),
  k2: $('k2'), t2: $('t2'), st2: $('st2'), shot2: $('shot2'), ghost: $('ghostBlock'), cursor2: $('cursor2'),
  k3: $('k3'), t3: $('t3'), st3: $('st3'), shot3: $('shot3'), joy3: $('joy3'), knob: $('joyKnob'), score3: $('score3'),
  k4: $('k4'), t4: $('t4'), st4: $('st4'),
  k5: $('k5'), t5: $('t5'), st5: $('st5'), phoneBack: $('phoneBack'), phoneFront: $('phoneFront'), note5: $('note5'),
  k6: $('k6'), t6: $('t6'),
  outroLogo: $('outroLogo'), outroBrand: $('outroBrand'), outroTitle: $('outroTitle'), cta: $('cta'), links: $('links'), outroNote: $('outroNote'),
};
const exportCards = [...document.querySelectorAll('.ex-card')];
const chips = [...document.querySelectorAll('.chip-x')];
const exNames = [...document.querySelectorAll('.ex-name')];
const exDescs = [...document.querySelectorAll('.ex-desc')];

/* ---------------- timeline ---------------- */
const SCENE_WINDOWS = {
  s1: [0, 3.45],
  s2: [3.2, 7.95],
  s3: [7.75, 11.75],
  s4: [11.55, 15.35],
  s5: [15.15, 18.85],
  s6: [18.65, 21.65],
  s7: [21.45, 24.1],
};

function render(t) {
  for (const [id, [a, b]] of Object.entries(SCENE_WINDOWS)) {
    sceneEls[id].style.opacity = String(fadeWindow(t, a, b).toFixed(4));
  }

  // background drift
  const aurora = document.querySelector('.bg-aurora');
  aurora.style.transform = `translate(${Math.sin(t * 0.13) * 1.6}%, ${Math.cos(t * 0.11) * 1.2}%) scale(1.03)`;
  const u = U();
  for (const { el, seed } of floaters) {
    const speed = 0.28 + (seed % 7) * 0.045;
    const y = ((seed * 3.1 + t * speed * 9) % 120) - 110;
    const x = ((seed * 7.3) % 92) + Math.sin(t * 0.35 + seed) * 2.4;
    const o = 0.10 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.6 + seed));
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.opacity = String(o);
    el.style.transform = `translate(${Math.sin(t * 0.5 + seed) * 1.2 * u}px, 0) rotate(${(seed + t * 12) % 360}deg)`;
  }

  /* S1 */
  put(els.logoWrap, sample([[0.25, { o: 0, s: 0.55, y: 2.4, r: -8 }], [0.95, { o: 1, s: 1.05, y: 0, r: 0 }], [1.2, { s: 1 }], [2.6, { s: 1.02 }], [3.3, { s: 1.04 }]], t));
  put(els.brand, sample([[0.7, { o: 0, y: 1.4 }], [1.3, { o: 1, y: 0 }]], t));
  put(els.title, sample([[1.0, { o: 0, y: 3.2 }], [1.8, { o: 1, y: 0 }]], t));
  put(els.subline, sample([[1.5, { o: 0, y: 2 }], [2.15, { o: 1, y: 0 }]], t));
  put(els.tagrow, sample([[1.95, { o: 0, y: 2 }], [2.6, { o: 1, y: 0 }]], t));

  /* S2 */
  put(els.k2, sample([[3.35, { o: 0, y: 1.2 }], [3.8, { o: 1, y: 0 }]], t));
  put(els.t2, sample([[3.45, { o: 0, y: 2.4 }], [4.0, { o: 1, y: 0 }]], t));
  put(els.st2, sample([[3.6, { o: 0, y: 1.6 }], [4.1, { o: 1, y: 0 }]], t));
  put(els.shot2, sample([[3.5, { o: 0, y: 9, s: 0.92, r: 3.5 }], [4.45, { o: 1, y: 0, s: 1, r: 0 }], [4.45, { s: 1 }], [7.9, { s: 1.04 }]], t));
  const ghost = sample([[4.75, { o: 0, x: -17, y: 9, r: -8, s: 0.9 }], [5.15, { o: 1 }], [5.9, { x: -3.5, y: 1.6, r: -2.5, s: 1 }], [6.4, { x: 0, y: 0, r: 0, s: 1 }], [6.6, { s: 1.05 }], [6.85, { s: 1 }]], t);
  put(els.ghost, ghost);
  put(els.cursor2, sample([[5.0, { o: 0, x: -15, y: 8.5 }], [5.35, { o: 1, x: -13.5, y: 7.6 }], [5.95, { x: -4, y: 2.1 }], [6.42, { x: 0.9, y: 0.9 }], [6.62, { s: 0.85 }], [6.85, { s: 1 }]], t));

  const count = 30 + Math.round(27 * Math.max(0, Math.min(1, (t - 4.2) / 1.2)));
  $('blockCount').textContent = String(count);

  /* S3 */
  put(els.k3, sample([[7.9, { o: 0, y: 1.2 }], [8.3, { o: 1, y: 0 }]], t));
  put(els.t3, sample([[8.0, { o: 0, y: 2.4 }], [8.5, { o: 1, y: 0 }]], t));
  put(els.st3, sample([[8.15, { o: 0, y: 1.6 }], [8.6, { o: 1, y: 0 }]], t));
  put(els.shot3, sample([[8.0, { o: 0, y: 7, s: 0.94, r: -3 }], [8.95, { o: 1, y: 0, s: 1, r: 0 }]], t));
  const shotImg = $('img3');
  shotImg.style.transform = `scale(1.07) translateX(${Math.max(-0.02, Math.min(0.02, (t - 9.2) * 0.0022)) * 100}%)`;
  put(els.joy3, sample([[9.05, { o: 0, s: 0.7 }], [9.45, { o: 1, s: 1 }]], t));
  put(els.knob, sample([[9.5, { x: 0, y: 0 }], [9.9, { x: 1.5, y: 0 }], [10.25, { x: 1.5, y: 0 }], [10.6, { x: 0, y: -1.5 }], [10.95, { x: 0, y: -1.5 }], [11.3, { x: 0, y: 0 }]], t));
  put(els.score3, sample([[9.35, { o: 0, y: -1 }], [9.6, { o: 1, y: 0 }]], t));
  $('scoreNum').textContent = String(Math.round(3 * Math.max(0, Math.min(1, (t - 9.5) / 1.6))));

  /* S4 */
  put(els.k4, sample([[11.7, { o: 0, y: 1.2 }], [12.1, { o: 1, y: 0 }]], t));
  put(els.t4, sample([[11.8, { o: 0, y: 2.4 }], [12.3, { o: 1, y: 0 }]], t));
  put(els.st4, sample([[11.95, { o: 0, y: 1.6 }], [12.4, { o: 1, y: 0 }]], t));
  exportCards.forEach((card, i) => {
    const start = 12.25 + i * 0.18;
    put(card, sample([[start, { o: 0, y: 6, s: 0.94 }], [start + 0.6, { o: 1, y: 0, s: 1 }], [start + 1.5, { y: 0 }], [start + 1.85, { y: -1.1 }], [start + 2.2, { y: 0 }]], t));
  });

  /* S5 */
  put(els.k5, sample([[15.3, { o: 0, y: 1.2 }], [15.7, { o: 1, y: 0 }]], t));
  put(els.t5, sample([[15.4, { o: 0, y: 2.4 }], [15.9, { o: 1, y: 0 }]], t));
  put(els.st5, sample([[15.55, { o: 0, y: 1.6 }], [16.0, { o: 1, y: 0 }]], t));
  put(els.phoneBack, sample([[15.95, { o: 0, x: 7, y: 3, r: -16 }], [16.8, { o: 0.72, x: 0, y: 0, r: -9 }], [18.4, { y: -0.9, r: -9 }]], t));
  put(els.phoneFront, sample([[16.1, { o: 0, x: 10, y: 5, r: 10 }], [17.0, { o: 1, x: 0, y: 0, r: 0 }], [18.45, { y: -1.2 }]], t));
  put(els.note5, sample([[16.95, { o: 0, y: 1.6 }], [17.4, { o: 1, y: 0 }]], t));

  /* S6 */
  put(els.k6, sample([[18.85, { o: 0, y: 1.2 }], [19.25, { o: 1, y: 0 }]], t));
  put(els.t6, sample([[18.95, { o: 0, y: 2.4 }], [19.45, { o: 1, y: 0 }]], t));
  chips.forEach((chip, i) => {
    const start = 19.35 + i * 0.13;
    put(chip, sample([[start, { o: 0, y: 3, s: 0.9 }], [start + 0.5, { o: 1, y: 0, s: 1 }]], t));
  });

  /* S7 */
  put(els.outroLogo, sample([[21.95, { o: 0, s: 0.7, y: 1.5 }], [22.55, { o: 1, s: 1, y: 0 }]], t));
  put(els.outroBrand, sample([[22.2, { o: 0, y: 1.2 }], [22.65, { o: 1, y: 0 }]], t));
  put(els.outroTitle, sample([[22.35, { o: 0, y: 2.2 }], [22.85, { o: 1, y: 0 }]], t));
  put(els.cta, sample([[22.7, { o: 0, y: 2, s: 0.94 }], [23.05, { o: 1, y: 0, s: 1 }], [23.5, { s: 1 }], [23.72, { s: 1.04 }], [23.95, { s: 1 }]], t));
  put(els.links, sample([[23.0, { o: 0, y: 1.4 }], [23.4, { o: 1, y: 0 }]], t));
  put(els.outroNote, sample([[23.2, { o: 0, y: 1 }], [23.55, { o: 1, y: 0 }]], t));
}

window.__render = render;
window.__duration = DURATION;
render(0);

/* hide/dim unused elements per ratio */
if (RATIO === '916') {
  // S5 keeps phone imagery; S2/S3 use phone frames via CSS aspect override
  $('shot3').style.aspectRatio = '1170 / 2532';
}

const imgs = [...document.images];
window.__ready = Promise.all(
  imgs.map((img) => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {}))),
).then(() => true);

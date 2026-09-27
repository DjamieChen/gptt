const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];

const entry = $('#entry');
const site = $('#site');
const audio = $('#music');
const sound = $('#sound');
const avatar = $('#avatar');
const entryAvatar = $('.avatar--entry');
const statusText = $('#status-text');
const companionCopy = $('#companion-copy');
const glow = $('#cursor-glow');
const stage = $('#companion-stage');
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let musicWanted = false;
let pointer = { x: innerWidth * .5, y: innerHeight * .5, px: innerWidth * .5, py: innerHeight * .5, vx: 0, vy: 0 };
let lastInteraction = performance.now();
let currentExpression = 'neutral';
let hoveredTarget = null;
let blinkTimer = null;
let blinkTimeout = null;
let raf = null;

const expressions = {
  neutral:   { ew: 28, eh: 42, ey: 0, gap: 27, rl: 0, rr: 0, by: 0, bl: 0, br: 0, mw: 28, mh: 5, my: 30, mr: 0, cheeks: 0 },
  curious:   { ew: 27, eh: 39, ey: 0, gap: 27, rl: 4, rr: -4, by: -3, bl: -12, br: 13, mw: 22, mh: 6, my: 31, mr: -5, cheeks: 0 },
  happy:     { ew: 31, eh: 18, ey: 8, gap: 28, rl: 8, rr: -8, by: 2, bl: 4, br: -4, mw: 49, mh: 16, my: 27, mr: 0, cheeks: 1 },
  excited:   { ew: 31, eh: 48, ey: -2, gap: 29, rl: -3, rr: 3, by: -7, bl: -8, br: 8, mw: 37, mh: 22, my: 25, mr: 0, cheeks: .55 },
  focus:     { ew: 33, eh: 13, ey: 8, gap: 27, rl: -4, rr: 4, by: 8, bl: 14, br: -14, mw: 32, mh: 3, my: 33, mr: 0, cheeks: 0 },
  proud:     { ew: 29, eh: 29, ey: 4, gap: 28, rl: -5, rr: 5, by: -1, bl: 8, br: -8, mw: 42, mh: 10, my: 31, mr: -3, cheeks: .35 },
  wink:      { ew: 29, eh: 37, ey: 1, gap: 28, rl: 3, rr: -4, by: -1, bl: -4, br: 8, mw: 39, mh: 12, my: 30, mr: -7, cheeks: .5, wink: true },
  surprised: { ew: 30, eh: 52, ey: -5, gap: 30, rl: 0, rr: 0, by: -9, bl: 0, br: 0, mw: 24, mh: 24, my: 24, mr: 0, cheeks: 0, roundMouth: true },
  sleepy:    { ew: 34, eh: 7, ey: 10, gap: 27, rl: 1, rr: -1, by: 8, bl: 2, br: -2, mw: 25, mh: 5, my: 34, mr: 3, cheeks: 0 }
};

function applyExpression(el, name = 'neutral') {
  if (!el) return;
  const e = expressions[name] || expressions.neutral;
  el.style.setProperty('--eye-w', `${e.ew}px`);
  el.style.setProperty('--eye-h', `${e.eh}px`);
  el.style.setProperty('--eye-y', `${e.ey}px`);
  el.style.setProperty('--eye-gap', `${e.gap}px`);
  el.style.setProperty('--eye-rot-l', `${e.rl}deg`);
  el.style.setProperty('--eye-rot-r', `${e.rr}deg`);
  el.style.setProperty('--brow-y', `${e.by}px`);
  el.style.setProperty('--brow-rot-l', `${e.bl}deg`);
  el.style.setProperty('--brow-rot-r', `${e.br}deg`);
  el.style.setProperty('--mouth-w', `${e.mw}px`);
  el.style.setProperty('--mouth-h', `${e.mh}px`);
  el.style.setProperty('--mouth-y', `${e.my}px`);
  el.style.setProperty('--mouth-rot', `${e.mr}deg`);
  $$('.cheek', el).forEach(c => c.style.opacity = e.cheeks || 0);
  const mouth = $('.mouth', el);
  if (mouth) {
    mouth.style.borderRadius = e.roundMouth ? '999px' : '0 0 999px 999px';
    mouth.style.borderWidth = e.roundMouth ? '4px' : '0 0 4px 0';
    mouth.style.borderStyle = 'solid';
    mouth.style.borderColor = '#fff';
    if (!e.roundMouth) { mouth.style.borderTopColor = 'transparent'; mouth.style.borderLeftColor = 'transparent'; mouth.style.borderRightColor = 'transparent'; }
  }
  const right = $('.eye--right', el);
  if (right) right.style.height = e.wink ? '5px' : '';
}

function setExpression(name, say, status = 'reacting to this project') {
  currentExpression = name;
  applyExpression(avatar, name);
  if (say) companionCopy.textContent = say;
  statusText.textContent = status;
}

function setAccent(color) {
  if (!color) color = '#725cff';
  document.documentElement.style.setProperty('--accent', color);
}

function setMusicUI(on) {
  sound.classList.toggle('is-on', on);
  sound.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
}
async function playMusic() {
  musicWanted = true;
  audio.volume = .46;
  try { await audio.play(); setMusicUI(true); } catch { setMusicUI(false); }
}
function pauseMusic() { audio.pause(); musicWanted = false; setMusicUI(false); }

function enterSite(withMusic) {
  entry.classList.add('is-gone');
  site.classList.add('is-live');
  site.setAttribute('aria-hidden','false');
  if (withMusic) playMusic();
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 20);
}
$('#enter-music').addEventListener('click', () => enterSite(true));
$('#enter-muted').addEventListener('click', () => enterSite(false));
sound.addEventListener('click', () => audio.paused ? playMusic() : pauseMusic());

function trackFace(el, x, y, strength = 1) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const maxX = Math.min(12, r.width * .045) * strength;
  const maxY = Math.min(9, r.width * .033) * strength;
  const fx = Math.max(-maxX, Math.min(maxX, dx / d * maxX));
  const fy = Math.max(-maxY, Math.min(maxY, dy / d * maxY));
  el.style.setProperty('--face-x', `${fx}px`);
  el.style.setProperty('--face-y', `${fy}px`);
  el.style.setProperty('--tilt', `${Math.max(-8, Math.min(8, dx / Math.max(innerWidth, 1) * 16))}deg`);
  $$('.eye i', el).forEach(p => {
    p.style.setProperty('--pupil-x', `${fx * .16}px`);
    p.style.setProperty('--pupil-y', `${fy * .16}px`);
  });
}

function pointerLoop() {
  pointer.px += (pointer.x - pointer.px) * .13;
  pointer.py += (pointer.y - pointer.py) * .13;
  glow.style.left = `${pointer.px}px`;
  glow.style.top = `${pointer.py}px`;
  trackFace(entryAvatar, pointer.px, pointer.py, 1.05);
  trackFace(avatar, pointer.px, pointer.py, 1.1);

  const speed = Math.min(1, Math.hypot(pointer.vx, pointer.vy) / 52);
  const sx = 1 + speed * .055;
  const sy = 1 - speed * .045;
  if (avatar && !prefersReduced) {
    avatar.style.setProperty('--squash-x', sx.toFixed(3));
    avatar.style.setProperty('--squash-y', sy.toFixed(3));
  }
  pointer.vx *= .82; pointer.vy *= .82;
  raf = requestAnimationFrame(pointerLoop);
}

document.addEventListener('pointermove', e => {
  pointer.vx = e.clientX - pointer.x;
  pointer.vy = e.clientY - pointer.y;
  pointer.x = e.clientX; pointer.y = e.clientY;
  lastInteraction = performance.now();
  avatar?.classList.remove('is-idle');
});
document.addEventListener('pointerdown', () => {
  lastInteraction = performance.now();
  avatar?.classList.add('is-clicking');
  setTimeout(() => avatar?.classList.remove('is-clicking'), 500);
});

function blink(el = avatar) {
  if (!el) return;
  const left = $('.eye--left', el), right = $('.eye--right', el);
  if (!left || !right) return;
  const lh = left.style.height, rh = right.style.height;
  left.style.height = '4px'; right.style.height = '4px';
  setTimeout(() => { left.style.height = lh; right.style.height = rh; }, 115);
}
function scheduleBlink() {
  clearTimeout(blinkTimer);
  blinkTimer = setTimeout(() => {
    blink(avatar); if (Math.random() > .35) blink(entryAvatar);
    scheduleBlink();
  }, 2200 + Math.random() * 3300);
}

function hoverTarget(el) {
  hoveredTarget?.classList?.remove('is-active');
  hoveredTarget = el;
  el.classList?.add('is-active');
  const expr = el.dataset.expression || 'curious';
  const say = el.dataset.say || 'This one caught your attention.';
  const accent = el.dataset.accent || '#725cff';
  if (el.classList.contains('project-card')) el.style.setProperty('--card-accent', accent);
  setAccent(accent);
  setExpression(expr, say, 'reacting to your selection');
}
function clearTarget(el) {
  if (hoveredTarget !== el) return;
  el.classList?.remove('is-active');
  hoveredTarget = null;
  setExpression('neutral','Hover a project and I’ll react.','watching your cursor');
  setAccent('#725cff');
}

$$('[data-expression]').forEach(el => {
  el.addEventListener('pointerenter', () => hoverTarget(el));
  el.addEventListener('focus', () => hoverTarget(el));
  el.addEventListener('pointerleave', () => clearTarget(el));
  el.addEventListener('blur', () => clearTarget(el));
  el.addEventListener('touchstart', () => hoverTarget(el), { passive: true });
});

$$('.project-card').forEach(card => {
  card.style.setProperty('--card-accent', card.dataset.accent || '#725cff');
  card.addEventListener('pointermove', e => {
    if (innerWidth < 900 || prefersReduced) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(900px) rotateX(${(-y * 1.6).toFixed(2)}deg) rotateY(${(x * 1.8).toFixed(2)}deg)`;
  });
  card.addEventListener('pointerleave', () => card.style.transform = '');
  card.addEventListener('click', () => {
    setExpression('excited','Opening the original Canva project…','opening project');
    blink(avatar);
  });
});

function idleCheck() {
  const idle = performance.now() - lastInteraction > 12000 && !hoveredTarget;
  if (idle) {
    avatar?.classList.add('is-idle');
    if (currentExpression !== 'sleepy') setExpression('sleepy','Still here. Move around when you’re ready.','idle / waiting');
  } else if (!hoveredTarget && currentExpression === 'sleepy') {
    avatar?.classList.remove('is-idle');
    setExpression('neutral','Hover a project and I’ll react.','watching your cursor');
  }
  setTimeout(idleCheck, 1000);
}

// Mobile: update the companion from whichever project occupies the middle of the screen.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (innerWidth > 900) return;
    const best = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (best?.intersectionRatio > .45) hoverTarget(best.target);
  }, { threshold: [0,.25,.45,.65,.85], rootMargin: '-15% 0px -25% 0px' });
  $$('.project-card').forEach(c => observer.observe(c));
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !audio.paused) audio.pause();
  else if (!document.hidden && musicWanted) audio.play().then(() => setMusicUI(true)).catch(() => {});
});

applyExpression(entryAvatar,'curious');
applyExpression(avatar,'neutral');
scheduleBlink();
idleCheck();
if (!prefersReduced) pointerLoop();
else { glow.style.display = 'none'; }

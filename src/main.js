import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHero } from './three/hero.js';
import { initFinale } from './three/finale.js';
import { renderShots } from './three/thumbs.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ── Smooth scroll ──
const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reduced });
window.lenis = lenis;
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return e.preventDefault();
  const el = $(id);
  if (!el) return;
  e.preventDefault();
  lenis.scrollTo(id === '#top' ? 0 : el, { offset: id === '#finale' ? 0 : -40, duration: 1.6 });
}));

// ── Nav ──
const nav = $('.nav');
const links = $$('.nav-links a');
lenis.on('scroll', ({ scroll }) => nav.classList.toggle('is-scrolled', scroll > 40));
const sections = links.map((a) => $(a.getAttribute('href') === '#top' ? '#hero' : a.getAttribute('href')));
const navIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) links.forEach((a, i) => a.classList.toggle('is-active', sections[i] === e.target));
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => navIO.observe(s));

// ── Reveals + counters ──
const revealIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el, i) => {
  if (el.closest('.feat-grid, .eco-grid')) el.style.setProperty('--d', `${(i % 4) * 0.08}s`);
  revealIO.observe(el);
});
const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: reduced ? 0 : 2, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
  }
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => countIO.observe(el));

// ── Theme ──
// Dark mode is driven by the hero's day/night switch (and the nav button,
// which flips the same switch), so the 3D house and the page always agree.
let dark = false, finaleApi, themeTimer;
function applyTheme(on) {
  dark = on;
  const root = document.documentElement;
  root.classList.add('theme-anim');
  clearTimeout(themeTimer);
  themeTimer = setTimeout(() => root.classList.remove('theme-anim'), 1000);
  document.body.classList.toggle('dark', on);
  $('meta[name=theme-color]').content = on ? '#0A1820' : '#EEF5F1';
  $('#themeBtn').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('tise-theme', on ? 'dark' : 'light'); } catch {}
  finaleApi?.setDark(on);
  if (on) ensureNightShots();
  Object.keys(shots.day).forEach(showShot);
}

// ── Hero ──
const hero = $('#hero');
const stage = $('#heroStage');
const card = $('.spot-card');
const modeBtn = $('#modeToggle');
const SPOTS = {
  solar: [
    ['Solar array', '4.8 kW', '10 panels on the south roof, running at 96% of rated output.', 0.86],
    ['Solar array', '0.0 kW', 'Panels are resting. Tomorrow’s forecast: 31 kWh of sunshine.', 0.04],
  ],
  battery: [
    ['TISE Battery', '82%', 'Charging from surplus solar. Covers your evening until 23:40.', 0.82],
    ['TISE Battery', '64%', 'Powering the house tonight. Enough to last until sunrise.', 0.64],
  ],
  living: [
    ['Smart home', '1.2 kW', 'Live household draw — 74% of it is coming straight from the sun.', 0.74],
    ['Smart home', '1.9 kW', 'Evening peak. 100% supplied by your battery, zero from the grid.', 1],
  ],
};
let openSpot = null;
function fillCard(key) {
  const [eyebrow, value, text, bar] = SPOTS[key][heroApi.night ? 1 : 0];
  $('[data-f=eyebrow]', card).textContent = eyebrow;
  $('[data-f=value]', card).textContent = value;
  $('[data-f=text]', card).textContent = text;
  $('[data-f=bar]', card).style.width = `${bar * 100}%`;
}
function showSpot(key) {
  openSpot = key;
  $$('.spot', stage).forEach((s) => s.classList.toggle('is-active', s.dataset.key === key));
  if (!key) return card.classList.remove('is-open');
  $('[data-f=bar]', card).style.width = '0';
  fillCard(key);
  requestAnimationFrame(() => card.classList.add('is-open'));
  heroApi.focus(key);
}
const heroApi = initHero({
  canvas: $('#heroCanvas'),
  stage,
  reduced,
  onNight(on) {
    hero.classList.toggle('is-night', on);
    applyTheme(on);
    modeBtn.setAttribute('aria-pressed', String(on));
    $('[data-live=solar]').textContent = on ? '0.0 kW' : '4.8 kW';
    $('[data-live=batt]').textContent = on ? '64%' : '82%';
    if (openSpot) setTimeout(() => fillCard(openSpot), 50);
  },
});
$$('.spot button', stage).forEach((b) => b.addEventListener('click', () => {
  const key = b.parentElement.dataset.key;
  showSpot(openSpot === key ? null : key);
}));
$('.spot-close').addEventListener('click', () => showSpot(null));
modeBtn.addEventListener('click', () => heroApi.setNight(!dark));
$('#themeBtn').addEventListener('click', () => heroApi.setNight(!dark));
$$('.hero-copy .reveal').forEach((el, i) => el.style.setProperty('--d', `${0.1 + i * 0.1}s`));

// ── Card renders from the 3D house ──
// Day renders load first; night renders are made the first time dark mode is on.
const shotImgs = $$('img[data-shot]');
const shots = { day: {}, night: {} };
function showShot(key) {
  const url = (dark && shots.night[key]) || shots.day[key];
  if (!url) return;
  for (const img of shotImgs) if (img.dataset.shot === key && img.getAttribute('src') !== url) {
    img.onload = () => img.classList.add('is-loaded');
    img.src = url;
  }
}
let nightShots = false;
function ensureNightShots() {
  if (nightShots) return;
  nightShots = true;
  renderShots((key, url) => { shots.night[key] = url; showShot(key); }, { night: true });
}
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 600));
idle(() => renderShots((key, url) => { shots.day[key] = url; showShot(key); }), { timeout: 1500 });

// ── Why tabs ──
const whyItems = $$('.why-list li');
const whyImgs = $$('.why-media img');
const WHY = [
  ['Complete visibility', 'Every source and load, side by side, in real time.'],
  ['Better energy awareness', 'Your fridge, AC and EV ranked by what they really cost.'],
  ['Performance monitoring', 'All 10 panels healthy. Last check: 4 minutes ago.'],
  ['Informed energy decisions', 'Run the dishwasher at 13:00 — peak sun, zero grid.'],
];
let whyIdx = 0, whyTimer;
function setWhy(i) {
  whyIdx = i;
  whyItems.forEach((li, k) => { li.classList.remove('is-active'); if (k === i) { void li.offsetWidth; li.classList.add('is-active'); } });
  whyImgs.forEach((img, k) => img.classList.toggle('is-on', k === i));
  $('[data-why-title]').textContent = WHY[i][0];
  $('[data-why-text]').textContent = WHY[i][1];
  clearTimeout(whyTimer);
  whyTimer = setTimeout(() => setWhy((whyIdx + 1) % WHY.length), 6000);
}
whyItems.forEach((li, i) => li.querySelector('button').addEventListener('click', () => setWhy(i)));
new IntersectionObserver(([e]) => { if (e.isIntersecting) setWhy(whyIdx); else clearTimeout(whyTimer); }, { threshold: 0.3 }).observe($('.why'));

// ── Foldable: the section pins and the device unfolds as you scroll ──
const track = $('#foldTrack');
const fold = $('#device');
const foldR = $('#foldR');
const foldShadow = $('#foldShadow');
const foldScreens = $$('.fold .screen');
const step = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const fitScreens = () => foldScreens.forEach((el) => el.style.setProperty('--k', (el.clientWidth / 460).toFixed(4)));
new ResizeObserver(fitScreens).observe(fold);
function updateFold() {
  const r = track.getBoundingClientRect();
  const p = reduced ? 1 : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  const rise = step(-0.25, 0.12, p);      // drifts up as the section arrives
  const open = step(0.14, 0.72, p);       // 0 = folded shut, 1 = flat
  const hw = fold.firstElementChild.offsetWidth;
  const angle = -180 * (1 - open);
  foldR.style.transform = `rotateY(${angle}deg)`;
  fold.style.setProperty('--shade', (Math.sin((Math.abs(angle) * Math.PI) / 180) * 0.6).toFixed(3));
  fold.style.transform = `translate3d(${(hw / 2) * (1 - open)}px, ${(1 - rise) * 110}px, 0) rotateX(${mix(20, 0, step(0.05, 0.8, p))}deg) rotateY(${mix(-20, 0, open)}deg) scale(${mix(0.86, 1, open)})`;
  foldShadow.style.transform = `translateX(${(hw / 2) * (1 - open)}px) scaleX(${mix(0.5, 1, open)})`;
  if (open > 0.85) fold.classList.add('is-live');
}
lenis.on('scroll', updateFold);
addEventListener('resize', updateFold);
fitScreens();
updateFold();

// ── Testimonials ──
const QUOTES = [
  ['TISE gives us a clear view of our energy production, battery storage and household usage — all from one beautiful dashboard.', 'Maya Fernandes', 'Homeowner · 6.2 kW system', 'MF', 150],
  ['Our grid bill dropped by 61% in the first quarter. The app tells us exactly when to run the heavy stuff, and we just do it.', 'Rahul Nair', 'Homeowner · 8.4 kW + battery', 'RN', 200],
  ['I install systems for a living. TISE is the first monitoring app my clients actually open every day.', 'Daniel Okafor', 'Solar installer · 140 homes', 'DO', 30],
];
let q = 0;
function setQuote(i) {
  q = (i + QUOTES.length) % QUOTES.length;
  const [text, name, role, ini, h] = QUOTES[q];
  const bq = $('[data-q-text]');
  bq.classList.add('is-out');
  setTimeout(() => {
    bq.textContent = text;
    $('[data-q-name]').textContent = name;
    $('[data-q-role]').textContent = role;
    const av = $('[data-q-avatar]');
    av.textContent = ini; av.style.setProperty('--h', h);
    $$('.q-dots i').forEach((d, k) => d.classList.toggle('is-on', k === q));
    bq.classList.remove('is-out');
  }, 380);
}
$('.qnav.next').addEventListener('click', () => setQuote(q + 1));
$('.qnav.prev').addEventListener('click', () => setQuote(q - 1));

// ── Finale ──
const hud = $('#dayHud');
const hudEl = Object.fromEntries($$('[data-hud]', hud).map((el) => [el.dataset.hud, el]));
const hudIcon = $('.hud-ico use', hud);
const phase = (h) => (h < 7.5 ? 'Sunrise' : h < 11 ? 'Morning' : h < 15 ? 'Midday' : h < 17.8 ? 'Afternoon' : h < 19.2 ? 'Sunset' : h < 20.2 ? 'Dusk' : 'Night');
finaleApi = initFinale({
  canvas: $('#finaleCanvas'),
  section: $('#finale'),
  stage: $('#finaleStage'),
  hud,
  reduced,
  onProgress({ hour, clock, solar, batt, home }) {
    hudEl.clock.textContent = clock;
    hudEl.phase.textContent = phase(hour);
    hudEl.solar.textContent = `${solar.toFixed(1)} kW`;
    hudEl.batt.textContent = `${Math.round(batt)}%`;
    hudEl.home.textContent = `${home.toFixed(1)} kW`;
    hudIcon.setAttribute('href', hour > 19.2 ? '#moon' : '#sun');
  },
});

let saved = null;
try { saved = localStorage.getItem('tise-theme'); } catch {}
if (saved === 'dark') heroApi.setNight(true);

// Hero scene: the cutaway house on its terrace. Drag to turn it, tap the
// hotspots, flip day/night. It assembles itself once on load.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { buildHeroHouse } from './house.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { contactShadow, dotTex } from './kit.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// three's ACES Filmic curve, so we can find the scene colour that comes out
// of tone mapping as exactly the page background.
function aces(c, exposure) {
  const v = c.map((x) => (x * exposure) / 0.6);
  const i = [0.59719 * v[0] + 0.35458 * v[1] + 0.04823 * v[2], 0.076 * v[0] + 0.90834 * v[1] + 0.01566 * v[2], 0.0284 * v[0] + 0.13383 * v[1] + 0.83777 * v[2]];
  const f = i.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.432951) + 0.238081));
  return [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]];
}
function untoned(hex, exposure = 1) {
  const t = new THREE.Color(hex), goal = [t.r, t.g, t.b];
  const x = [...goal];
  for (let n = 0; n < 80; n++) {
    const y = aces(x, exposure);
    for (let k = 0; k < 3; k++) {
      const h = 1e-3, xs = [...x]; xs[k] += h;
      const d = (aces(xs, exposure)[k] - y[k]) / h;
      x[k] = Math.max(0, x[k] + (goal[k] - y[k]) / Math.max(d, 0.02));
    }
  }
  return new THREE.Color(x[0], x[1], x[2]);
}
const REST = 0.55;
const FOCUS = { solar: 0.3, battery: 1.1, living: 0.1 };

export function initHero({ canvas, stage, reduced = false, onNight }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const dayBg = untoned('#ECF4F0'), nightBg = untoned('#0A1820');
  scene.background = dayBg.clone();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 120);
  const target = new THREE.Vector3(0, 2.15, 0.6);
  const camDir = new THREE.Vector3(0, 0.22, 1).normalize();
  let dist = 21;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.5, 2.4);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const hemi = new THREE.HemisphereLight('#F2FBFF', '#B9C9AE', 1.1);
  const sun = new THREE.DirectionalLight('#FFF4E2', 2.7);
  sun.position.set(-6, 11, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(hemi, sun);
  const dayHemi = new THREE.Color('#F2FBFF'), nightHemi = new THREE.Color('#5A6E9A');
  const daySun = new THREE.Color('#FFF4E2'), moon = new THREE.Color('#9DB4FF');

  const rig = new THREE.Group();
  scene.add(rig);
  const house = buildHeroHouse();
  rig.add(house.root);
  const shadow = contactShadow(15, 12, 0.22);
  shadow.position.set(0, 0.004, 0.5);
  rig.add(shadow);

  // Energy packets running from the roof to the battery.
  const N = 21;
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const flowMat = new THREE.PointsMaterial({ map: dotTex(), color: '#00D98F', size: 0.3, transparent: true, depthWrite: false, toneMapped: false });
  const flow = new THREE.Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  house.root.add(flow);
  const tmp = new THREE.Vector3();
  function updateFlow(t) {
    const a = flowGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const u = (t * 0.11 + Math.floor(i / 3) / 7 + (i % 3) * 0.014) % 1;
      house.flowPath.getPointAt(u, tmp);
      a[i * 3] = tmp.x; a[i * 3 + 1] = tmp.y; a[i * 3 + 2] = tmp.z;
    }
    flowGeo.attributes.position.needsUpdate = true;
  }

  // ── Input ──
  const s = { yaw: -0.5, tYaw: -0.5, tilt: 0, tTilt: 0, vel: 0, px: 0, py: 0, spx: 0, spy: 0, scroll: 0, night: 0, last: -10, drag: false };
  let lx = 0, ly = 0, clock = 0;
  canvas.addEventListener('pointerdown', (e) => {
    s.drag = true; lx = e.clientX; ly = e.clientY; s.vel = 0; s.last = clock;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging', 'has-dragged');
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    s.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    s.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!s.drag) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    s.tYaw = clamp(s.tYaw + dx * 0.0065, -0.8, 1.5);
    s.tTilt = clamp(s.tTilt + dy * 0.003, -0.12, 0.3);
    s.vel = dx * 0.0065;
    s.last = clock;
  });
  const release = () => { s.drag = false; stage.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { s.px = s.py = 0; });

  // ── Hotspots ──
  const spots = [...stage.querySelectorAll('[data-anchor]')].map((el) => ({ el, a: house.anchors[el.dataset.anchor] }));
  const v = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3();
  let W = 1, H = 1;
  function placeSpots() {
    for (const { el, a } of spots) {
      v.copy(a.pos).applyMatrix4(house.root.matrixWorld);
      n.copy(a.normal).transformDirection(house.root.matrixWorld);
      toCam.copy(camera.position).sub(v).normalize();
      el.classList.toggle('is-away', n.dot(toCam) < 0.08);
      v.project(camera);
      el.style.transform = `translate3d(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px, 0)`;
    }
  }

  function focus(name) {
    if (name in FOCUS) { s.tYaw = FOCUS[name]; s.vel = 0; s.last = clock + 4; }
  }

  // ── Night ──
  function applyNight() {
    const k = s.night;
    house.setNight(k);
    hemi.intensity = 1.1 - k * 0.82;
    hemi.color.lerpColors(dayHemi, nightHemi, k);
    sun.intensity = 2.7 - k * 2.25;
    sun.color.lerpColors(daySun, moon, k);
    scene.environmentIntensity = 0.6 - k * 0.48;
    scene.background.lerpColors(dayBg, nightBg, k);
    bloom.strength = 0.4 + k * 0.35;
    flowMat.size = 0.3 + k * 0.08;
  }
  function setNight(on) {
    onNight?.(on);
    gsap.to(s, { night: on ? 1 : 0, duration: 1.6, ease: 'power2.inOut', onUpdate: applyNight });
  }

  // ── Size ──
  function resize() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    camera.aspect = W / H;
    dist = 24 * Math.max(1, 1.9 / camera.aspect) ** (camera.aspect < 1 ? 0.62 : 0.85);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  // ── Assembly intro ──
  function intro() {
    const p = house.parts;
    const tiny = { x: 0.001, y: 0.001, z: 0.001 };
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => stage.classList.add('is-ready') });
    tl.from(house.root.position, { y: -1.4, duration: 1.8 }, 0)
      .from(shadow.material, { opacity: 0, duration: 1.4 }, 0)
      .to(s, { tYaw: REST, duration: 2.6, ease: 'power3.inOut' }, 0)
      .from(p.walls.scale, { y: 0.001, duration: 1.1, ease: 'power3.out' }, 0.3)
      .from(p.room.scale, { ...tiny, duration: 1, ease: 'back.out(1.3)' }, 0.65)
      .from(p.battery.scale, { ...tiny, duration: 0.8, ease: 'back.out(1.6)' }, 0.9)
      .from(p.roof.position, { y: 3.6, duration: 1.2, ease: 'power4.out' }, 0.85)
      .from(p.panels.map((x) => x.position), { y: 1.8, duration: 0.8, stagger: 0.045, ease: 'back.out(1.8)' }, 1.3)
      .from(p.panels.map((x) => x.scale), { ...tiny, duration: 0.5, stagger: 0.045, ease: 'power2.out' }, 1.3)
      .from(p.greens.map((x) => x.scale), { ...tiny, duration: 0.9, stagger: 0.05, ease: 'back.out(1.8)' }, 1.1);
  }
  if (reduced) { s.yaw = s.tYaw = REST; stage.classList.add('is-ready'); } else intro();

  // ── Loop ──
  const t0 = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    clock = (performance.now() - t0) / 1000;
    if (!visible) return;

    if (!s.drag) {
      s.tYaw = clamp(s.tYaw + s.vel, -0.8, 1.5);
      s.vel *= 0.92;
      if (clock - s.last > 5 && !reduced) s.tYaw += (REST + Math.sin(clock * 0.16) * 0.22 - s.tYaw) * 0.006;
      s.tTilt *= 0.985;
    }
    s.yaw += (s.tYaw - s.yaw) * 0.075;
    s.tilt += (s.tTilt - s.tilt) * 0.08;
    s.spx += (s.px - s.spx) * 0.05;
    s.spy += (s.py - s.spy) * 0.05;
    s.scroll = clamp(window.scrollY / Math.max(1, H), 0, 1.2);

    rig.rotation.y = s.yaw - s.scroll * 0.2;
    rig.position.y = -s.scroll * 1.2;
    camera.position.copy(target).addScaledVector(camDir, dist);
    camera.position.y += s.tilt * dist * 0.7 - s.spy * 0.5;
    camera.position.x += s.spx * 0.7;
    camera.position.z -= s.spx * 0.7;
    camera.lookAt(target);

    house.update(clock);
    if (!reduced) updateFlow(clock);
    composer.render();
    placeSpots();
  }
  updateFlow(0);
  frame();

  return { setNight, focus, get night() { return s.night > 0.5; } };
}

// Shared 3D building blocks: palette, cached materials, solar arrays, greenery.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const COL = {
  wall: '#F7F6F2', cut: '#B7C1BC', roof: '#262C31', frame: '#2A3034', trim: '#FBFBF8',
  ceil: '#D9B78F', wood: '#B98A5E', woodDark: '#6E4F37', stone: '#E7E4DC', paving: '#D7D3C8',
  grass: '#A9C68C', grass2: '#93B877', soil: '#D9D0C0', leaf: '#4C8A4F', leaf2: '#6BA35A', leaf3: '#8DBB6B',
  pot: '#ECE6DA', potDark: '#353C41', sofa: '#E4DDCF', rug: '#F1ECE2', mint: '#00E89A', ink: '#0B1A20',
  metal: '#CDD3D7', warm: '#FFC98A',
};

const cache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  return cache.get(key);
}

const geoCache = new Map();
function roundedBox(w, h, d, r) {
  const key = [w, h, d, r].join('|');
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));
  return geoCache.get(key);
}

export function box(w, h, d, material, r = 0) {
  const m = new THREE.Mesh(r > 0 ? roundedBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, material, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// Soft round sprite used for glows, particles and contact shadows.
let dot;
export function dotTex() {
  return (dot ||= canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }));
}

export function contactShadow(w, d, strength = 0.32) {
  const tex = canvasTex(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    r.addColorStop(0, `rgba(10,30,25,${strength})`);
    r.addColorStop(1, 'rgba(10,30,25,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ── Solar ────────────────────────────────────────────────────────────────
let cellMat;
function panelMaterial() {
  if (cellMat) return cellMat;
  const map = canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = '#3a4a62'; g.fillRect(0, 0, w, h);
    const cols = 6, rows = 10, pad = 5, gap = 3;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = (h - pad * 2 - gap * (rows - 1)) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = pad + i * (cw + gap), y = pad + j * (ch + gap);
      const grd = g.createLinearGradient(x, y, x + cw, y + ch);
      grd.addColorStop(0, '#203760'); grd.addColorStop(1, '#122241');
      g.fillStyle = grd; g.fillRect(x, y, cw, ch);
      g.strokeStyle = 'rgba(170,190,220,.22)'; g.lineWidth = 1;
      g.beginPath();
      for (const f of [1 / 3, 2 / 3]) { g.moveTo(x + cw * f, y); g.lineTo(x + cw * f, y + ch); }
      g.stroke();
    }
  });
  cellMat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.2, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 });
  return cellMat;
}

// Panels lie in the local XZ plane, facing +Y. Returns the group plus each panel for staging.
export function solarArray(cols, rows, pw = 1, ph = 1.4, gap = 0.05) {
  const group = new THREE.Group();
  const panels = [];
  const frame = mat(COL.metal, { metalness: 0.8, roughness: 0.35 });
  const cellGeo = new THREE.PlaneGeometry(pw - 0.05, ph - 0.05).rotateX(-Math.PI / 2);
  const W = cols * pw + (cols - 1) * gap, D = rows * ph + (rows - 1) * gap;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const p = new THREE.Group();
    const f = box(pw, 0.045, ph, frame);
    const c = new THREE.Mesh(cellGeo, panelMaterial());
    c.position.y = 0.024; c.receiveShadow = true;
    p.add(f, c);
    p.position.set(-W / 2 + pw / 2 + i * (pw + gap), 0, -D / 2 + ph / 2 + j * (ph + gap));
    group.add(p); panels.push(p);
  }
  const sheen = glint(W, D);
  sheen.position.y = 0.03;
  group.add(sheen);
  return { group, panels, sheen, size: [W, D] };
}

// A soft light band that sweeps across an array — the "sun glint".
export function glint(w, d) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uI: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uT; uniform float uI;
        void main(){ float d = vUv.x * .75 + vUv.y * .45 - uT; float b = exp(-d * d * 60.) * .26 + exp(-d * d * 6.) * .04;
        gl_FragColor = vec4(vec3(1.,.98,.92) * b * uI, 1.); }`,
    }),
  );
  m.renderOrder = 2;
  return m;
}

// ── Greenery ─────────────────────────────────────────────────────────────
const blob = new THREE.IcosahedronGeometry(1, 2);

// Speckled leaf texture (also used as a bump map) so blobs read as foliage.
let leafTex;
function foliageTex() {
  return (leafTex ||= canvasTex(256, 256, (g, w, h) => {
    const R = rng(5);
    g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `hsl(0 0% ${52 + R() * 48}%)`;
      g.beginPath();
      const r = 2 + R() * 5;
      g.ellipse(R() * w, R() * h, r, r * 0.5, R() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }, [3, 2]));
}
const leafCache = new Map();
export function leafMat(color) {
  if (!leafCache.has(color)) leafCache.set(color, new THREE.MeshStandardMaterial({ color, map: foliageTex(), bumpMap: foliageTex(), bumpScale: 2, roughness: 0.92 }));
  return leafCache.get(color);
}

// Denser, leafier tree: forked trunk and many small clumps.
export function leafyTree(h, seed, palette = ['#3E6E36', '#4F8040', '#5F9248', '#6FA054']) {
  const R = rng(seed), g = new THREE.Group();
  const bark = mat('#6B5240', { roughness: 0.95 });
  g.add(at(cyl(0.05 * h / 3, 0.09 * h / 3, h * 0.5, bark, 10), 0, h * 0.25, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + R();
    const br = cyl(0.025 * h / 3, 0.04 * h / 3, h * 0.32, bark, 8);
    br.position.set(Math.cos(a) * h * 0.06, h * 0.6, Math.sin(a) * h * 0.06);
    br.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(br);
  }
  const canopy = new THREE.Group();
  const n = 16 + Math.floor(R() * 8);
  for (let i = 0; i < n; i++) {
    const s = h * (0.09 + R() * 0.09);
    const m = new THREE.Mesh(blob, leafMat(palette[Math.floor(R() * palette.length)]));
    const a = R() * Math.PI * 2, r = R() ** 0.6 * h * 0.3;
    m.scale.set(s, s * 0.85, s);
    m.position.set(Math.cos(a) * r, h * (0.58 + R() * 0.38) - r * 0.25, Math.sin(a) * r);
    m.castShadow = m.receiveShadow = true;
    canopy.add(m);
  }
  g.add(canopy);
  g.userData.canopy = canopy;
  g.userData.phase = R() * Math.PI * 2;
  return g;
}

// A row of clipped shrubs between two points.
export function hedge(x0, z0, x1, z1, seed, h = 0.7, palette = ['#3F7037', '#4C7F3E', '#5A8E45']) {
  const R = rng(seed), g = new THREE.Group();
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    for (let k = 0; k < 2; k++) {
      const s = h * (0.42 + R() * 0.22);
      const m = new THREE.Mesh(blob, leafMat(palette[Math.floor(R() * palette.length)]));
      m.scale.set(s, s * (0.9 + R() * 0.3), s);
      m.position.set(x0 + (x1 - x0) * t + (R() - 0.5) * 0.2, s * 0.8 + k * h * 0.25, z0 + (z1 - z0) * t + (R() - 0.5) * 0.2);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
  }
  return g;
}

export function bush(r, seed, palette = [COL.leaf, COL.leaf2]) {
  const R = rng(seed), g = new THREE.Group();
  const n = 4 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const s = r * (0.5 + R() * 0.5);
    const m = new THREE.Mesh(blob, leafMat(palette[Math.floor(R() * palette.length)]));
    m.scale.set(s, s * (0.8 + R() * 0.2), s);
    m.position.set((R() - 0.5) * r * 1.3, s * 0.75, (R() - 0.5) * r * 1.3);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

export function tree(h, seed, palette = [COL.leaf, COL.leaf2, COL.leaf3]) {
  const R = rng(seed), g = new THREE.Group();
  const trunk = cyl(0.06 * h / 3, 0.1 * h / 3, h * 0.55, mat(COL.woodDark));
  trunk.position.y = h * 0.275;
  const canopy = new THREE.Group();
  canopy.position.y = h * 0.5;
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const s = h * (0.18 + R() * 0.14);
    const m = new THREE.Mesh(blob, leafMat(palette[Math.floor(R() * palette.length)]));
    m.scale.setScalar(s);
    m.position.set((R() - 0.5) * h * 0.38, h * (0.12 + R() * 0.3), (R() - 0.5) * h * 0.38);
    m.castShadow = m.receiveShadow = true;
    canopy.add(m);
  }
  g.add(trunk, canopy);
  g.userData.canopy = canopy;
  g.userData.phase = R() * Math.PI * 2;
  return g;
}

export function conifer(h, seed, color = '#3F7A4C') {
  const R = rng(seed), g = new THREE.Group();
  g.add(at(cyl(0.05 * h / 3, 0.08 * h / 3, h * 0.3, mat(COL.woodDark)), 0, h * 0.15, 0));
  const canopy = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = h * (0.3 - i * 0.07), ch = h * (0.42 - i * 0.06);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 18), leafMat(i % 2 ? color : '#4A8756'));
    m.position.y = h * (0.42 + i * 0.2);
    m.rotation.y = R() * 3;
    m.castShadow = m.receiveShadow = true;
    canopy.add(m);
  }
  g.add(canopy);
  g.userData.canopy = canopy;
  g.userData.phase = R() * Math.PI * 2;
  return g;
}

export function pottedPlant(h, seed, potColor = COL.pot) {
  const R = rng(seed), g = new THREE.Group();
  const ph = h * 0.32;
  g.add(at(cyl(h * 0.16, h * 0.12, ph, mat(potColor, { roughness: 0.6 })), 0, ph / 2, 0));
  g.add(at(cyl(h * 0.145, h * 0.145, 0.02, mat('#5B4636')), 0, ph - 0.01, 0));
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  const n = 7 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.5;
    const len = h * (0.32 + R() * 0.22);
    const leaf = new THREE.Mesh(leafGeo, mat(R() > 0.5 ? COL.leaf : COL.leaf2));
    leaf.scale.set(len * 0.24, len, len * 0.06);
    const pivot = new THREE.Group();
    pivot.position.y = ph;
    pivot.rotation.set(0, a, 0.35 + R() * 0.5);
    leaf.position.y = len * 0.9;
    leaf.castShadow = true;
    pivot.add(leaf);
    g.add(pivot);
  }
  return g;
}

// TISE mark as a 2D path, used in canvas textures (800×795 design units).
export function drawMark(g, x, y, size, color) {
  const s = size / 800;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = color;
  g.fill(new Path2D('M321 0H479V205L628 60L740 172L595 317H800V477H595V637H479V795H321V637H205V477H0V317H205L60 172L172 60L321 205ZM205 477L400 285L595 477Z'), 'evenodd');
  g.restore();
}

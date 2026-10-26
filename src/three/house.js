// The hero house, modelled on the reference render: a gable house whose whole
// front wall is cut away to show a warm-lit living room and study. Standing-seam
// metal roof with four large panels, battery on the left gable, white terrace
// with steps, hedges and garden lights. Shared by the hero and the card renders.
import * as THREE from 'three';
import { COL, mat, box, cyl, at, rng, canvasTex, solarArray, leafyTree, hedge, pottedPlant, drawMark, dotTex } from './kit.js';

const P = THREE.MathUtils.degToRad(36), TAN = Math.tan(P), COS = Math.cos(P), SIN = Math.sin(P);
const HW = 4, HD = 2.6, T = 0.22, FL = 0.45, WH = 3.05, TOP = FL + WH, OV = 0.36, GO = 0.42, RT = 0.16;
const RIDGE = TOP + HD * TAN;
const SLOPE = (HD + OV) / COS;

// Point on the underside of a roof slope, `s` metres down from the ridge.
const slopePoint = (sign, s) => new THREE.Vector3(0, RIDGE - s * SIN, sign * s * COS);
const slopeNormal = (sign) => new THREE.Vector3(0, COS, sign * SIN);
const roofY = (z) => TOP + (HD - Math.abs(z)) * TAN;

function wall(len, h, t, openings, material) {
  const g = new THREE.Group();
  const piece = (x0, x1, y0, y1) => {
    if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return;
    g.add(at(box(x1 - x0, y1 - y0, t, material), (x0 + x1) / 2, (y0 + y1) / 2, 0));
  };
  let x = -len / 2;
  for (const o of [...openings].sort((a, b) => a.x0 - b.x0)) {
    piece(x, o.x0, 0, h); piece(o.x0, o.x1, 0, o.y0); piece(o.x0, o.x1, o.y1, h);
    x = o.x1;
  }
  piece(x, len / 2, 0, h);
  return g;
}

function frame(w, h, d, f, mullion = true) {
  const g = new THREE.Group();
  const ft = 0.06;
  g.add(at(box(w, ft, d, f), 0, h / 2 - ft / 2, 0), at(box(w, ft, d, f), 0, -h / 2 + ft / 2, 0));
  g.add(at(box(ft, h, d, f), -w / 2 + ft / 2, 0, 0), at(box(ft, h, d, f), w / 2 - ft / 2, 0, 0));
  if (mullion) g.add(at(box(0.045, h - ft, d * 0.8, f), 0, 0, 0));
  return g;
}

// ── Canvas textures ──
const planks = () => canvasTex(512, 512, (g, w, h) => {
  const R = rng(7);
  const rows = 8, ph = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R() * 200;
    while (x < w) {
      const len = 180 + R() * 200;
      g.fillStyle = `hsl(30 ${46 + R() * 8}% ${55 + R() * 8}%)`;
      g.fillRect(x, r * ph, len, ph);
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(120,80,40,${0.04 + R() * 0.05})`; g.fillRect(x, r * ph + R() * ph, len, 1 + R() * 2); }
      g.fillStyle = 'rgba(90,55,30,.3)';
      g.fillRect(x, r * ph, 2, ph);
      x += len;
    }
    g.fillStyle = 'rgba(90,55,30,.28)';
    g.fillRect(0, r * ph, w, 2);
  }
}, [2.5, 2]);

const cladding = () => canvasTex(128, 256, (g, w, h) => {
  const R = rng(3);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `hsl(28 ${44 + R() * 8}% ${46 + R() * 10}%)`;
    g.fillRect(i * 16, 0, 16, h);
    for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(60,30,10,${0.06 + R() * 0.08})`; g.fillRect(i * 16 + R() * 14, 0, 1, h); }
    g.fillStyle = 'rgba(40,20,8,.5)';
    g.fillRect(i * 16, 0, 1.5, h);
  }
});

const tvScreen = () => canvasTex(512, 300, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0B1E26'); bg.addColorStop(1, '#05101A');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  drawMark(g, 28, 26, 34, '#00E89A');
  g.fillStyle = '#E8FFF5'; g.font = '600 46px sans-serif'; g.fillText('4.8 kW', 28, 120);
  g.fillStyle = 'rgba(232,255,245,.55)'; g.font = '500 18px sans-serif'; g.fillText('SOLAR NOW', 30, 150);
  g.strokeStyle = '#00E89A'; g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 40; i++) { const x = 28 + i * 11.4, y = 250 - Math.sin(i / 40 * Math.PI) * 70 - Math.sin(i * 0.9) * 6; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
});

const artA = () => canvasTex(200, 280, (g, w, h) => {
  g.fillStyle = '#EFE8DC'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1C1F22';
  g.beginPath(); g.moveTo(70, 40); g.bezierCurveTo(150, 60, 160, 150, 110, 190); g.bezierCurveTo(80, 210, 60, 150, 90, 120); g.bezierCurveTo(110, 100, 60, 80, 70, 40); g.fill();
  g.fillStyle = '#C79B6E'; g.fillRect(40, 205, 120, 26);
});
const artB = () => canvasTex(200, 280, (g, w, h) => {
  g.fillStyle = '#F3EEE4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#00D98F'; g.beginPath(); g.arc(112, 104, 46, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3B2E25'; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 230); g.lineTo(100, 150); g.lineTo(160, 230); g.stroke();
});

const garden = () => canvasTex(256, 160, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#DDEFF2'); sky.addColorStop(1, '#F2F6EE');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const R = rng(19);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `hsl(${95 + R() * 25} ${30 + R() * 20}% ${28 + R() * 22}%)`;
    g.beginPath(); g.arc(R() * w, 50 + R() * 110, 8 + R() * 16, 0, Math.PI * 2); g.fill();
  }
});

const batteryFace = () => canvasTex(256, 360, (g, w, h) => {
  g.fillStyle = '#FBFBF9'; g.fillRect(0, 0, w, h);
  drawMark(g, 30, 34, 36, '#00C887');
  g.fillStyle = '#0B1A20'; g.font = '700 28px sans-serif'; g.fillText('TISE', 78, 64);
  g.fillStyle = '#0E1A1F'; g.fillRect(64, 180, 128, 64);
  g.fillStyle = '#00E89A'; g.font = '600 30px sans-serif'; g.fillText('82%', 98, 224);
  g.fillStyle = '#9AA6A9'; g.font = '500 14px sans-serif'; g.fillText('HOME BATTERY 13.5 kWh', 34, 320);
});

const grassTex = () => canvasTex(256, 256, (g, w, h) => {
  const R = rng(31);
  g.fillStyle = '#8CB66A'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `hsl(${88 + R() * 20} ${35 + R() * 20}% ${36 + R() * 22}%)`;
    g.fillRect(R() * w, R() * h, 1.5, 3 + R() * 4);
  }
}, [8, 8]);

const radial = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  r.addColorStop(0, '#fff'); r.addColorStop(0.7, '#aaa'); r.addColorStop(1, '#000');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

// ── Furniture ──
function sofa() {
  const g = new THREE.Group();
  const fab = mat('#EDE9E2', { roughness: 0.95 });
  g.add(at(box(2.3, 0.3, 0.95, fab, 0.07), 0, 0.27, 0));
  g.add(at(box(2.3, 0.5, 0.24, fab, 0.09), 0, 0.62, -0.36));
  for (const s of [-1, 1]) g.add(at(box(0.22, 0.48, 0.95, fab, 0.09), s * 1.04, 0.42, 0));
  for (const s of [-1, 0, 1]) {
    g.add(at(box(0.66, 0.15, 0.7, fab, 0.07), s * 0.66, 0.48, 0.08));
    g.add(at(box(0.64, 0.44, 0.2, fab, 0.09), s * 0.66, 0.72, -0.22));
  }
  const p1 = at(box(0.38, 0.34, 0.12, mat('#D9CBB4', { roughness: 0.95 }), 0.06), -0.75, 0.7, -0.08);
  const p2 = at(box(0.36, 0.32, 0.12, mat(COL.mint, { roughness: 0.95 }), 0.06), 0.78, 0.69, -0.08);
  p1.rotation.set(-0.2, 0.25, 0.12); p2.rotation.set(-0.2, -0.3, -0.1);
  g.add(p1, p2);
  for (const x of [-1.05, 1.05]) for (const z of [-0.38, 0.38]) g.add(at(cyl(0.025, 0.018, 0.12, mat(COL.woodDark)), x, 0.06, z));
  return g;
}

function officeChair() {
  const g = new THREE.Group();
  const shell = mat('#E8E9EA', { roughness: 0.5 });
  const dark = mat('#9DA3A7', { roughness: 0.4, metalness: 0.5 });
  g.add(at(box(0.5, 0.08, 0.48, shell, 0.035), 0, 0.5, 0));
  const back = box(0.46, 0.62, 0.05, shell, 0.025);
  back.position.set(0, 0.88, -0.24); back.rotation.x = -0.12;
  g.add(back);
  g.add(at(cyl(0.025, 0.025, 0.4, dark, 10), 0, 0.28, 0));
  for (let i = 0; i < 5; i++) {
    const leg = box(0.3, 0.03, 0.04, dark);
    const a = (i / 5) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
    leg.rotation.y = -a;
    g.add(leg, at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#2A3034')), Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29));
  }
  for (const s of [-1, 1]) g.add(at(box(0.04, 0.04, 0.3, dark), s * 0.25, 0.7, -0.02));
  return g;
}

function desk() {
  const g = new THREE.Group();
  const wood = mat('#C9965F', { roughness: 0.55 });
  const white = mat('#F2F1EE', { roughness: 0.5 });
  g.add(at(box(1.9, 0.045, 0.62, wood, 0.01), 0, 0.75, 0));
  g.add(at(box(0.04, 0.73, 0.58, white), -0.9, 0.365, 0));
  g.add(at(box(0.46, 0.72, 0.58, white, 0.01), 0.68, 0.36, 0));
  for (const y of [0.18, 0.42, 0.63]) g.add(at(box(0.14, 0.015, 0.01, mat('#9DA3A7', { metalness: 0.6 })), 0.68, y, 0.295));
  // Monitor, keyboard, lamp
  const black = mat('#141719', { roughness: 0.3, metalness: 0.3 });
  g.add(at(box(0.22, 0.015, 0.16, black), -0.15, 0.78, -0.12), at(box(0.04, 0.26, 0.03, black), -0.15, 0.9, -0.16));
  g.add(at(box(0.68, 0.4, 0.03, black, 0.01), -0.15, 1.12, -0.12));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), mat('#1C3442', { emissive: '#7FB8D8', emissiveIntensity: 0.35, roughness: 0.2 }));
  scr.position.set(-0.15, 1.12, -0.103);
  g.add(scr);
  g.add(at(box(0.44, 0.015, 0.14, mat('#E9EAEA')), -0.15, 0.78, 0.12));
  const lamp = new THREE.Group();
  lamp.add(at(cyl(0.07, 0.08, 0.02, black), 0, 0.01, 0));
  const arm = cyl(0.01, 0.01, 0.42, black, 6); arm.position.set(0.05, 0.2, 0); arm.rotation.z = -0.25; lamp.add(arm);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 16, 1, true), mat('#F2F1EE', { side: THREE.DoubleSide }));
  head.position.set(0.12, 0.42, 0); head.rotation.z = 2.3; lamp.add(head);
  lamp.position.set(-0.72, 0.775, -0.12);
  g.add(lamp);
  return g;
}

function bookshelf(seed, w = 0.98, h = 2.1, d = 0.34, wood = mat('#C28E57', { roughness: 0.6 })) {
  const R = rng(seed), g = new THREE.Group();
  g.add(at(box(0.03, h, d, wood), -w / 2, h / 2, 0), at(box(0.03, h, d, wood), w / 2, h / 2, 0));
  g.add(at(box(w, h, 0.02, wood), 0, h / 2, -d / 2 + 0.01));
  const levels = [0.55, 0.95, 1.35, 1.75, h];
  g.add(at(box(w - 0.04, 0.53, d - 0.02, mat('#F2F1EE', { roughness: 0.5 })), 0, 0.27, 0.005));
  g.add(at(box(0.01, 0.5, 0.01, mat('#C9CED1')), 0, 0.28, d / 2));
  const books = ['#2F3A40', '#D9CBB4', '#8A9A8F', '#B9644A', '#E7E2D8', '#4A5D6B', '#C79B6E', '#00B87A'];
  for (const y of levels) {
    g.add(at(box(w, 0.025, d, wood), 0, y, 0));
    if (y >= h) continue;
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.12) {
      if (R() < 0.18) { x += 0.12; continue; }
      const bw = 0.03 + R() * 0.035, bh = 0.2 + R() * 0.12;
      const b = box(bw, bh, d * 0.75, mat(books[Math.floor(R() * books.length)], { roughness: 0.8 }));
      b.position.set(x + bw / 2, y + 0.0125 + bh / 2, 0.02);
      if (R() < 0.1) b.rotation.z = 0.18;
      g.add(b);
      x += bw + 0.005;
    }
  }
  return g;
}

function tripodLamp(shadeMat, bulbMat) {
  const g = new THREE.Group();
  const wood = mat('#B5824F', { roughness: 0.6 });
  const top = new THREE.Vector3(0, 1.38, 0), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const foot = new THREE.Vector3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    const dir = top.clone().sub(foot);
    const leg = cyl(0.014, 0.018, dir.length(), wood, 8);
    leg.position.copy(foot).addScaledVector(dir, 0.5);
    leg.quaternion.setFromUnitVectors(up, dir.normalize());
    g.add(leg);
  }
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.34, 32, 1, true), shadeMat), 0, 1.5, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), bulbMat), 0, 1.45, 0));
  return g;
}

function frameArt(w, h, tex) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.03, mat('#1E2124', { roughness: 0.4 })));
  g.add(at(box(w - 0.06, h - 0.06, 0.005, mat('#FAFAF8')), 0, 0, 0.016));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, h - 0.16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  art.position.z = 0.02;
  g.add(art);
  return g;
}

export function buildHeroHouse() {
  const root = new THREE.Group();
  const parts = { panels: [], greens: [], sheens: [], ground: [] };

  // Materials that respond to night.
  const warm = new THREE.Color('#FFC27A');
  const led = new THREE.MeshStandardMaterial({ color: '#FFE6BF', emissive: warm, emissiveIntensity: 6, roughness: 0.4 });
  const shade = new THREE.MeshStandardMaterial({ color: '#F6EFE2', roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color('#FFD39A'), emissiveIntensity: 1.2 });
  const bulb = new THREE.MeshStandardMaterial({ color: '#FFF3DD', emissive: new THREE.Color('#FFD8A0'), emissiveIntensity: 2 });
  const winGlow = new THREE.MeshStandardMaterial({ color: '#4A3A2A', roughness: 0.08, metalness: 0.4, emissive: new THREE.Color('#FFB868'), emissiveIntensity: 1.4, envMapIntensity: 1.4 });
  const glass = new THREE.MeshStandardMaterial({ color: '#CFE2EA', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const tealLed = new THREE.MeshStandardMaterial({ color: COL.mint, emissive: new THREE.Color(COL.mint), emissiveIntensity: 1.6 });

  const plaster = mat('#F3F0EA', { roughness: 0.88 });
  const stone = mat('#EEECE7', { roughness: 0.85 });
  const frameM = mat('#1F2428', { roughness: 0.4, metalness: 0.4 });

  // ── Ground: fading lawn, terrace, steps ──
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(11, 72).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTex(), alphaMap: radial(), transparent: true, depthWrite: false, roughness: 1 }));
  lawn.receiveShadow = true;
  lawn.renderOrder = -1;
  lawn.position.set(0, -0.01, 0.8);
  root.add(lawn);
  parts.ground.push(lawn);

  const base = new THREE.Group();
  base.add(at(box(2 * HW + 1.4, 0.24, 2 * HD + 2.2, stone, 0.03), 0, 0.12, 0.5));
  base.add(at(box(2 * HW + 0.2, FL, 2 * HD + 0.3, stone), 0, FL / 2, 0.05));
  const stepW = 2.6;
  base.add(at(box(stepW, 0.11, 0.38, stone, 0.02), 0, 0.24 + 0.055, HD + 0.2 + 0.19));
  base.add(at(box(stepW + 0.4, 0.12, 0.42, stone, 0.02), 0, 0.06, HD + 1.6 + 0.23));
  // Warm LED lines along the slab and step nosings.
  base.add(at(box(2 * HW + 0.1, 0.02, 0.025, led), 0, FL - 0.03, HD + 0.21));
  base.add(at(box(stepW - 0.1, 0.015, 0.02, led), 0, 0.33, HD + 0.585));
  base.add(at(box(2 * HW + 1.3, 0.015, 0.02, led), 0, 0.2, HD + 1.6 + 0.005));
  root.add(base);
  parts.base = base;
  parts.floor = base;

  // ── Walls ──
  const walls = new THREE.Group();
  walls.position.y = FL;
  const backWin = { x0: -2.15, x1: -0.35, y0: 1.05, y1: 2.45 };
  walls.add(at(wall(2 * HW, WH, T, [backWin], plaster), 0, 0, -HD + T / 2));
  const bw = backWin.x1 - backWin.x0, bh = backWin.y1 - backWin.y0, bx = (backWin.x0 + backWin.x1) / 2, by = (backWin.y0 + backWin.y1) / 2;
  walls.add(at(frame(bw, bh, T + 0.03, frameM), bx, by, -HD + T / 2));
  walls.add(at(new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: garden() })), bx, by, -HD - 0.02));
  walls.add(at(new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.08, bh - 0.08), glass), bx, by, -HD + T / 2));
  for (let i = 0; i < 7; i++) walls.add(at(box(bw - 0.1, 0.03, 0.05, mat('#F7F6F2', { roughness: 0.6 })), bx, backWin.y1 - 0.08 - i * 0.045, -HD + T + 0.03));

  // Left gable: window, cedar cladding strip, gable triangle.
  const sideWin = { x0: -1.75, x1: -0.55, y0: 1.35, y1: 2.65 };
  const left = wall(2 * HD, WH, T, [sideWin], plaster);
  left.rotation.y = Math.PI / 2; left.position.x = -HW + T / 2;
  walls.add(left);
  const sw = sideWin.x1 - sideWin.x0, sh = sideWin.y1 - sideWin.y0, sz = -(sideWin.x0 + sideWin.x1) / 2, sy = (sideWin.y0 + sideWin.y1) / 2;
  const sf = frame(sw, sh, T + 0.04, frameM);
  sf.rotation.y = Math.PI / 2; sf.position.set(-HW + T / 2, sy, sz); walls.add(sf);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(sw - 0.06, sh - 0.06), winGlow);
  sg.rotation.y = -Math.PI / 2; sg.position.set(-HW + T / 2 - 0.01, sy, sz); walls.add(sg);
  const clad = new THREE.MeshStandardMaterial({ map: cladding(), roughness: 0.7 });
  const cladTop = roofY(0.05) - FL - 0.05, cladBot = 1.25;
  walls.add(at(box(0.04, cladTop - cladBot, 0.62, clad), -HW - 0.02, (cladTop + cladBot) / 2, 0.08));
  const right = box(T, WH, 2 * HD, plaster);
  right.position.set(HW - T / 2, WH / 2, 0);
  walls.add(right);
  const gableShape = new THREE.Shape([new THREE.Vector2(-HD, 0), new THREE.Vector2(HD, 0), new THREE.Vector2(0, HD * TAN)]);
  for (const sx of [-1, 1]) {
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: T, bevelEnabled: false }), plaster);
    gable.rotation.y = Math.PI / 2;
    gable.position.set(sx < 0 ? -HW : HW - T, WH, 0);
    gable.castShadow = gable.receiveShadow = true;
    walls.add(gable);
  }
  // Ceiling with a warm cove line along the cut edge; LED strips on the cut wall edges.
  walls.add(at(box(2 * HW - 2 * T, 0.1, 2 * HD - T, mat('#FAF9F6', { roughness: 0.9 })), 0, WH - 0.05, T / 2));
  walls.add(at(box(2 * HW - 2 * T, 0.025, 0.04, led), 0, WH - 0.115, HD - 0.04));
  for (const sx of [-1, 1]) walls.add(at(box(0.025, WH - 0.25, 0.025, led), sx * (HW - T - 0.02), WH / 2 - 0.05, HD - 0.03));
  root.add(walls);
  parts.walls = walls;

  // ── Interior ──
  const room = new THREE.Group();
  room.position.y = FL;
  const floor = box(2 * HW - 2 * T, 0.03, 2 * HD - T, new THREE.MeshStandardMaterial({ map: planks(), roughness: 0.5 }));
  floor.position.set(0, 0.015, T / 2);
  room.add(floor);
  room.add(at(box(3.1, 0.02, 2.2, mat('#E2E0DB', { roughness: 1 }), 0.01), 0.15, 0.04, 0.95));

  const d = desk(); d.position.set(-1.2, 0.03, -HD + T + 0.33); room.add(d);
  const ch = officeChair(); ch.position.set(-1.3, 0.03, -1.3); ch.rotation.y = Math.PI + 0.35; room.add(ch);
  room.add(at(frameArt(0.55, 0.75, artA()), -2.85, 1.65, -HD + T + 0.02));
  const narrow = bookshelf(4, 0.42, 1.7, 0.3, mat('#2E3438', { roughness: 0.6 })); narrow.position.set(0.05, 0.03, -HD + T + 0.16); room.add(narrow);
  const shelf = bookshelf(8); shelf.position.set(0.8, 0.03, -HD + T + 0.18); room.add(shelf);
  for (const [x, s] of [[0.58, 0.42], [1.03, 0.36]]) { const p = pottedPlant(s, 40 + x * 10, '#EDE7DC'); p.position.set(x, 2.13, -HD + T + 0.16); room.add(p); }
  const fl = tripodLamp(shade, bulb); fl.position.set(1.85, 0.03, -1.7); room.add(fl);

  const s = sofa(); s.rotation.y = Math.PI / 2; s.position.set(-0.95, 0.03, 1.0); room.add(s);
  const tableWood = mat('#C28E57', { roughness: 0.55 });
  room.add(at(box(1.15, 0.05, 0.62, tableWood, 0.015), 0.55, 0.42, 1.0));
  room.add(at(box(1.05, 0.03, 0.54, tableWood), 0.55, 0.14, 1.0));
  for (const x of [0.03, 1.07]) for (const z of [0.73, 1.27]) room.add(at(box(0.05, 0.42, 0.05, tableWood), x, 0.22, z));
  const tp = pottedPlant(0.32, 60, '#F2EEE6'); tp.position.set(0.4, 0.445, 0.95); room.add(tp);
  room.add(at(box(0.3, 0.03, 0.22, mat('#3B4A52')), 0.8, 0.46, 1.05));

  // TV wall on the right gable
  room.add(at(box(0.42, 0.4, 2.3, mat('#F2F1EE', { roughness: 0.5 }), 0.015), HW - T - 0.22, 0.26, -0.6));
  room.add(at(box(0.44, 0.04, 2.34, tableWood), HW - T - 0.22, 0.48, -0.6));
  for (const z of [-1.65, 0.45]) room.add(at(box(0.04, 0.08, 0.04, tableWood), HW - T - 0.05, 0.04, z), at(box(0.04, 0.08, 0.04, tableWood), HW - T - 0.38, 0.04, z));
  room.add(at(box(0.18, 0.12, 0.24, mat('#3A2C22', { roughness: 0.5 })), HW - T - 0.22, 0.56, -0.05));
  room.add(at(box(0.05, 0.95, 1.65, mat('#0E1012', { roughness: 0.15, metalness: 0.5 })), HW - T - 0.04, 1.55, -0.6));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.59, 0.89), new THREE.MeshStandardMaterial({ map: tvScreen(), emissiveMap: tvScreen(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.15 }));
  tv.rotation.y = -Math.PI / 2; tv.position.set(HW - T - 0.068, 1.55, -0.6);
  room.add(tv);
  const art2 = frameArt(0.6, 0.85, artB()); art2.rotation.y = -Math.PI / 2; art2.position.set(HW - T - 0.02, 1.6, 1.05); room.add(art2);

  // Plants + side cabinet
  const p1 = pottedPlant(1.4, 3, '#4A4F52'); p1.position.set(HW - 0.65, 0.03, 2.05); room.add(p1);
  const p2 = pottedPlant(1.0, 9, '#B9774E'); p2.position.set(-HW + 0.6, 0.03, 2.15); room.add(p2);
  room.add(at(box(0.45, 0.62, 0.9, mat('#F2F1EE', { roughness: 0.5 }), 0.02), -HW + T + 0.24, 0.34, 1.25));
  parts.greens.push(p1, p2);
  root.add(room);
  parts.room = room;

  // ── Roof: standing-seam metal ──
  const roof = new THREE.Group();
  const roofM = mat('#36404B', { roughness: 0.42, metalness: 0.45 });
  const ribM = mat('#46515D', { roughness: 0.35, metalness: 0.55 });
  const soffit = mat('#EFE9DF', { roughness: 0.8 });
  const fascia = mat('#2B333B', { roughness: 0.5, metalness: 0.3 });
  const RL = 2 * HW + 2 * GO, ext = 0.1;
  for (const sign of [-1, 1]) {
    const n = slopeNormal(sign);
    const mid = slopePoint(sign, (SLOPE - ext) / 2);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(RL, RT, SLOPE + ext), [fascia, fascia, roofM, soffit, fascia, fascia]);
    slab.castShadow = slab.receiveShadow = true;
    slab.rotation.x = sign * P;
    slab.position.copy(mid).addScaledVector(n, RT / 2);
    roof.add(slab);
    const ribGeo = new THREE.BoxGeometry(0.035, 0.045, SLOPE + ext);
    const ribs = new THREE.InstancedMesh(ribGeo, ribM, Math.floor((RL - 0.3) / 0.42) + 1);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(sign * P, 0, 0)), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < ribs.count; i++) {
      const p = mid.clone().addScaledVector(n, RT + 0.022);
      p.x = -RL / 2 + 0.15 + i * 0.42;
      ribs.setMatrixAt(i, m4.compose(p, q, one));
    }
    ribs.castShadow = true;
    roof.add(ribs);
    for (const xs of [-1, 1]) {
      const b = box(0.06, RT + 0.08, SLOPE + ext, fascia);
      b.rotation.x = sign * P;
      b.position.copy(mid).addScaledVector(n, RT / 2 - 0.02);
      b.position.x = xs * (RL / 2 + 0.03);
      roof.add(b);
    }
    roof.add(at(box(RL, 0.1, 0.07, fascia), 0, slopePoint(sign, SLOPE).y + 0.02, sign * (HD + OV + 0.02)));
  }
  roof.add(at(box(RL + 0.08, 0.09, 0.3, fascia, 0.03), 0, RIDGE + RT / COS + 0.03, 0));
  // Soffit cove light under the front eave.
  roof.add(at(box(2 * HW, 0.02, 0.05, led), 0, roofY(HD + 0.12) - 0.035, HD + 0.12));

  const arr = solarArray(4, 1, 1.32, 2.28, 0.05);
  arr.group.rotation.x = P;
  arr.group.position.copy(slopePoint(1, 1.72)).addScaledVector(slopeNormal(1), RT + 0.1);
  arr.group.position.x = 0.55;
  roof.add(arr.group);
  parts.panels.push(...arr.panels);
  parts.sheens.push(arr.sheen);
  parts.frontArray = arr.group;
  root.add(roof);
  parts.roof = roof;

  // ── Battery on the left gable + conduit ──
  const kit = new THREE.Group();
  const bz = 1.15, byC = 1.2, bxW = -HW - 0.12;
  kit.add(at(box(0.22, 0.95, 0.66, mat('#FBFBF9', { roughness: 0.35 }), 0.04), bxW, byC, bz));
  kit.add(at(box(0.23, 0.95, 0.14, mat('#5D666C', { roughness: 0.4 }), 0.03), bxW, byC, bz - 0.36));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.8), new THREE.MeshStandardMaterial({ map: batteryFace(), roughness: 0.35 }));
  face.rotation.y = -Math.PI / 2; face.position.set(bxW - 0.112, byC, bz + 0.02);
  kit.add(face);
  kit.add(at(box(0.012, 0.42, 0.025, tealLed), bxW - 0.115, byC + 0.05, bz + 0.27));
  for (const dz of [-0.12, 0, 0.12]) kit.add(at(cyl(0.018, 0.018, 0.5, mat('#3A4146'), 8), bxW + 0.02, byC - 0.72, bz + dz));
  const pipe = mat('#C9CED1', { metalness: 0.5, roughness: 0.35 });
  const pTop = roofY(bz - 0.2) - 0.15;
  kit.add(at(cyl(0.022, 0.022, pTop - (byC + 0.48), pipe, 10), -HW - 0.05, (pTop + byC + 0.48) / 2, bz - 0.2));
  // Uplight washing the gable wall
  kit.add(at(cyl(0.05, 0.05, 0.08, mat('#2A3034')), -HW - 0.3, 0.28, 2.2), at(box(0.06, 0.02, 0.06, led), -HW - 0.3, 0.33, 2.2));
  root.add(kit);
  parts.battery = kit;

  // ── Greenery + garden lights ──
  const g = (o) => { root.add(o); parts.greens.push(o); return o; };
  g(hedge(-HW - 1.0, HD + 2.05, -1.95, HD + 2.05, 1, 0.45));
  g(hedge(1.95, HD + 2.05, HW + 1.0, HD + 2.05, 2, 0.45));
  g(hedge(-HW - 1.05, -HD - 0.4, -HW - 1.05, HD + 1.8, 3, 0.55));
  g(hedge(HW + 1.05, -HD + 0.4, HW + 1.05, HD + 1.8, 4, 0.5));
  const t1 = g(leafyTree(3.6, 11)); t1.position.set(-HW - 1.9, 0, -0.8);
  const t2 = g(leafyTree(2.6, 12)); t2.position.set(-HW - 1.5, 0, -2.7);
  const t3 = g(leafyTree(3.3, 13)); t3.position.set(HW + 1.9, 0, -0.4);
  const halo = new THREE.SpriteMaterial({ map: dotTex(), color: '#FFC27A', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 });
  parts.halo = halo;
  for (const [x, z] of [[-HW - 0.75, HD + 2.5], [HW + 0.75, HD + 2.5], [-HW - 0.75, 0.6], [HW + 0.75, -1.6]]) {
    const b = new THREE.Group();
    b.add(at(cyl(0.05, 0.06, 0.5, mat('#2A3034', { metalness: 0.4, roughness: 0.4 }), 12), 0, 0.25, 0));
    b.add(at(cyl(0.045, 0.045, 0.07, bulb, 12), 0, 0.53, 0));
    const h = new THREE.Sprite(halo); h.scale.setScalar(0.28); h.position.y = 0.55; b.add(h);
    b.position.set(x, 0, z);
    g(b);
  }

  // ── Lights ──
  const roomA = new THREE.PointLight('#FFC88F', 0, 7, 1.5); roomA.position.set(-1.6, FL + 2.4, 0.2);
  const roomB = new THREE.PointLight('#FFC88F', 0, 7, 1.5); roomB.position.set(1.6, FL + 2.4, 0.2);
  const lampLight = new THREE.PointLight('#FFC98A', 0, 4, 1.8); lampLight.position.set(1.85, FL + 1.45, -1.7);
  const wash = new THREE.SpotLight('#FFC27A', 0, 6, 0.5, 0.9, 1.4);
  wash.position.set(-HW - 0.3, 0.35, 2.2);
  wash.target.position.set(-HW - 0.05, 3.2, 2.1);
  root.add(roomA, roomB, lampLight, wash, wash.target);

  const anchors = {
    solar: { pos: slopePoint(1, 1.72).addScaledVector(slopeNormal(1), RT + 0.5).setX(0.55), normal: slopeNormal(1) },
    battery: { pos: new THREE.Vector3(bxW - 0.35, byC + 0.25, bz), normal: new THREE.Vector3(-1, 0, 0) },
    living: { pos: new THREE.Vector3(0.4, FL + 1.25, 1.1), normal: new THREE.Vector3(0, 0, 1) },
  };

  // Energy path: across the panels → over the left verge → down the conduit → battery.
  const onRoof = (x, sl) => slopePoint(1, sl).addScaledVector(slopeNormal(1), RT + 0.16).setX(x);
  const flowPath = new THREE.CatmullRomCurve3([
    onRoof(1.6, 1.3), onRoof(-0.9, 1.3), onRoof(-HW + 0.1, 1.7),
    new THREE.Vector3(-HW - 0.12, pTop - 0.1, bz - 0.2),
    new THREE.Vector3(-HW - 0.12, byC + 0.6, bz - 0.2),
    new THREE.Vector3(-HW - 0.2, byC + 0.1, bz),
  ], false, 'centripetal');

  function setNight(v) {
    led.emissiveIntensity = 6 + v * 4;
    shade.emissiveIntensity = 1.2 + v * 2;
    bulb.emissiveIntensity = 5 + v * 4;
    winGlow.emissiveIntensity = 1.4 + v * 1;
    halo.opacity = 0.3 + v * 0.6;
    roomA.intensity = roomB.intensity = 5 + v * 9;
    lampLight.intensity = 1.5 + v * 4;
    wash.intensity = 6 + v * 22;
    for (const sh of parts.sheens) sh.material.uniforms.uI.value = 1 - v * 0.9;
  }

  function update(t) {
    tealLed.emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.6;
    for (const sh of parts.sheens) sh.material.uniforms.uT.value = ((t * 0.22) % 1.6) - 0.3;
  }

  setNight(0);
  return { root, parts, anchors, flowPath, setNight, update };
}

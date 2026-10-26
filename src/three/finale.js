// Finale: a farmhouse with a solar roof and carport, lived through one day.
// Scroll drives the clock from sunrise to night: sun arc, sky, lights coming
// on window by window, energy flowing roof → battery → car, then into the home.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COL, mat, box, cyl, at, rng, canvasTex, dotTex, solarArray, bush, tree, conifer, pottedPlant, drawMark } from './kit.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const P = THREE.MathUtils.degToRad(30), TAN = Math.tan(P), COS = Math.cos(P), SIN = Math.sin(P);
const HW = 4.5, HD = 2.8, T = 0.2, FL = 0.35, WH = 3.1, TOP = FL + WH, OV = 0.5, RT = 0.2;
const RIDGE = TOP + HD * TAN, SLOPE = (HD + OV) / COS;
const slopePoint = (sign, s) => new THREE.Vector3(0, RIDGE - s * SIN, sign * s * COS);
const slopeNormal = (sign) => new THREE.Vector3(0, COS, sign * SIN);

// Sky keyframes by hour.
const KEYS = [
  { h: 6.0, top: '#8DB2D2', bot: '#F8DCBC', sun: '#FFC38A', si: 1.3, hemi: 0.6, env: 0.35 },
  { h: 8.5, top: '#84C1E2', bot: '#EAF3EE', sun: '#FFF0D8', si: 2.5, hemi: 0.95, env: 0.55 },
  { h: 12.5, top: '#6DBAE2', bot: '#E1F1EE', sun: '#FFFFFF', si: 2.9, hemi: 1.05, env: 0.6 },
  { h: 16.5, top: '#88B3D5', bot: '#F5DCB6', sun: '#FFD29C', si: 2.4, hemi: 0.85, env: 0.5 },
  { h: 18.4, top: '#56699A', bot: '#F3A47E', sun: '#FF9B66', si: 1.4, hemi: 0.55, env: 0.35 },
  { h: 19.5, top: '#1F2C4E', bot: '#8B6D8B', sun: '#C990A2', si: 0.45, hemi: 0.32, env: 0.18 },
  { h: 21.0, top: '#060D1A', bot: '#12223A', sun: '#90AEEA', si: 0.4, hemi: 0.2, env: 0.1 },
];
const H0 = 6.4, H1 = 21.6;

function wall(len, h, t, openings, material) {
  const g = new THREE.Group();
  const piece = (x0, x1, y0, y1) => { if (x1 - x0 > 1e-3 && y1 - y0 > 1e-3) g.add(at(box(x1 - x0, y1 - y0, t, material), (x0 + x1) / 2, (y0 + y1) / 2, 0)); };
  let x = -len / 2;
  for (const o of [...openings].sort((a, b) => a.x0 - b.x0)) { piece(x, o.x0, 0, h); piece(o.x0, o.x1, 0, o.y0); piece(o.x0, o.x1, o.y1, h); x = o.x1; }
  piece(x, len / 2, 0, h);
  return g;
}

function pane(w, h, glassMat, bars = 1) {
  const g = new THREE.Group();
  const f = mat('#23292D', { roughness: 0.4, metalness: 0.4 });
  const ft = 0.07, d = T + 0.04;
  g.add(at(box(w, ft, d, f), 0, h / 2 - ft / 2, 0), at(box(w, ft, d, f), 0, -h / 2 + ft / 2, 0));
  g.add(at(box(ft, h, d, f), -w / 2 + ft / 2, 0, 0), at(box(ft, h, d, f), w / 2 - ft / 2, 0, 0));
  for (let i = 1; i <= bars; i++) g.add(at(box(0.045, h, d - 0.04, f), -w / 2 + (w / (bars + 1)) * i, 0, 0));
  g.add(box(w - 0.02, h - 0.02, 0.04, glassMat));
  return g;
}

function car() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: '#EEF1F0', roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = mat('#1C252B', { roughness: 0.1, metalness: 0.6 });
  g.add(at(box(1.9, 0.5, 4.5, paint, 0.22), 0, 0.6, 0));
  g.add(at(box(1.62, 0.4, 2.3, glass, 0.18), 0, 0.98, -0.3));
  g.add(at(box(1.5, 0.05, 1.7, paint, 0.02), 0, 1.18, -0.35));
  g.add(at(box(1.91, 0.035, 3.9, mat(COL.mint, { roughness: 0.4 })), 0, 0.46, 0));
  for (const x of [-0.88, 0.88]) for (const z of [-1.4, 1.4]) {
    const w = cyl(0.36, 0.36, 0.26, mat('#1A1F22', { roughness: 0.8 }), 24);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
    const hub = cyl(0.2, 0.2, 0.27, mat('#B8C0C4', { metalness: 0.8, roughness: 0.3 }), 18);
    hub.rotation.z = Math.PI / 2; hub.position.set(x, 0.36, z); g.add(hub);
  }
  const head = mat('#FFFFFF', { emissive: '#EAF6FF', emissiveIntensity: 0.6 });
  const tail = mat('#FF4A4A', { emissive: '#FF2B2B', emissiveIntensity: 0.4 });
  g.add(at(box(1.5, 0.06, 0.04, head), 0, 0.78, 2.15), at(box(1.6, 0.06, 0.04, tail), 0, 0.8, -2.15));
  g.userData.lights = [head, tail];
  return g;
}

function mower() {
  const g = new THREE.Group();
  g.add(at(box(0.62, 0.2, 0.46, mat('#F4F5F2', { roughness: 0.4 }), 0.1), 0, 0.17, 0));
  g.add(at(box(0.3, 0.06, 0.3, mat(COL.mint, { roughness: 0.4 }), 0.03), 0.04, 0.29, 0));
  for (const x of [-0.22, 0.22]) for (const z of [-0.24, 0.24]) {
    const w = cyl(0.08, 0.08, 0.06, mat('#1D2326'), 14);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.08, z); g.add(w);
  }
  return g;
}

function bird() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: '#1E2A30', side: THREE.DoubleSide, fog: true });
  const wingGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(0, 0, 0.16), new THREE.Vector3(0.62, 0, -0.04)]);
  const l = new THREE.Mesh(wingGeo, m), r = new THREE.Mesh(wingGeo, m);
  r.scale.x = -1;
  g.add(l, r, at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m), 0, 0, 0));
  g.children[2].scale.set(1, 0.8, 2.6);
  g.userData.wings = [l, r];
  return g;
}

function twinkle(count, gen, color, size, drift) {
  const pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set(gen(i), i * 3); ph[i] = Math.random(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uO: { value: 0 }, uC: { value: new THREE.Color(color) }, uS: { value: size }, uD: { value: drift }, uMap: { value: dotTex() } },
    vertexShader: `attribute float phase; uniform float uT, uS, uD; varying float vA;
      void main(){ vec3 p = position;
        p += vec3(sin(uT*.7+phase*6.), sin(uT*.9+phase*4.)*.6, cos(uT*.6+phase*5.)) * uD;
        vA = .35 + .65 * max(0., sin(uT*(1.5+phase)+phase*20.));
        vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = uS * (300. / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uC; uniform float uO; varying float vA;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(uC, a * vA * uO); }`,
  });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  return pts;
}

function buildHome() {
  const root = new THREE.Group();
  const live = { windows: [], sheens: [], trees: [], lamps: [], porch: [] };
  const plaster = mat('#F5F2EC', { roughness: 0.92 });
  const slats = new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(28 ${34 + (i % 3) * 4}% ${44 + ((i * 7) % 5) * 2}%)`; g.fillRect(i * 16, 0, 16, h); g.fillStyle = 'rgba(40,24,14,.45)'; g.fillRect(i * 16, 0, 2, h); }
  }, [3, 1]) });

  const glassFor = () => {
    const m = new THREE.MeshStandardMaterial({ color: '#2E3E48', roughness: 0.08, metalness: 0.55, envMapIntensity: 1.6, emissive: new THREE.Color('#FFC27A'), emissiveIntensity: 0 });
    live.windows.push({ m, th: 0.05 + live.windows.length * 0.07 });
    return m;
  };

  // Plinth + walls
  root.add(at(box(2 * HW + 0.4, FL, 2 * HD + 0.4, mat('#DCD8CF', { roughness: 0.95 })), 0, FL / 2, 0));
  const walls = new THREE.Group();
  walls.position.y = FL;
  const wA = { x0: -3.9, x1: -2.0, y0: 0.6, y1: 2.65 }, door = { x0: -0.65, x1: 0.65, y0: 0, y1: 2.55 }, wB = { x0: 1.1, x1: 3.95, y0: 0.45, y1: 2.65 };
  walls.add(at(wall(2 * HW, WH, T, [wA, door, wB], plaster), 0, 0, HD - T / 2));
  walls.add(at(wall(2 * HW, WH, T, [{ x0: -2.5, x1: -0.9, y0: 0.9, y1: 2.5 }, { x0: 1.4, x1: 3.0, y0: 0.9, y1: 2.5 }], plaster), 0, 0, -HD + T / 2));
  for (const o of [wA, door, wB]) walls.add(at(pane(o.x1 - o.x0, o.y1 - o.y0, glassFor(), o === wB ? 2 : 1), (o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, HD - T / 2));
  for (const sx of [-1, 1]) {
    const side = wall(2 * HD, WH, T, [{ x0: -0.8, x1: 0.8, y0: 0.9, y1: 2.5 }], plaster);
    side.rotation.y = Math.PI / 2; side.position.x = sx * (HW - T / 2); walls.add(side);
    const p = pane(1.6, 1.6, glassFor()); p.rotation.y = Math.PI / 2; p.position.set(sx * (HW - T / 2), 1.7, 0); walls.add(p);
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-HD, 0), new THREE.Vector2(HD, 0), new THREE.Vector2(0, HD * TAN)]), { depth: T, bevelEnabled: false }), slats);
    gable.rotation.y = Math.PI / 2; gable.position.set(sx > 0 ? HW - T : -HW, WH, 0); gable.castShadow = gable.receiveShadow = true;
    walls.add(gable);
    const round = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), glassFor());
    round.rotation.y = sx * Math.PI / 2; round.position.set(sx * (HW + 0.01), WH + 0.75, 0); walls.add(round);
  }
  root.add(walls);

  // Roof + solar
  const roofM = mat('#262C31', { roughness: 0.6, metalness: 0.15 });
  const RL = 2 * HW + 0.8, ext = 0.1;
  for (const sign of [-1, 1]) {
    const n = slopeNormal(sign);
    const mid = slopePoint(sign, (SLOPE - ext) / 2);
    const slab = box(RL, RT, SLOPE + ext, roofM);
    slab.rotation.x = sign * P; slab.position.copy(mid).addScaledVector(n, RT / 2);
    root.add(slab);
    const arr = solarArray(7, 2, 1.06, 1.5, 0.05);
    arr.group.rotation.x = sign * P;
    arr.group.position.copy(slopePoint(sign, 1.86)).addScaledVector(n, RT + 0.05);
    root.add(arr.group);
    live.sheens.push(arr.sheen);
  }
  root.add(at(box(RL + 0.1, 0.12, 0.4, roofM, 0.04), 0, RIDGE + RT / COS + 0.02, 0));

  // Porch
  const deckM = mat(COL.wood, { roughness: 0.75 });
  root.add(at(box(2 * HW, 0.2, 2.3, deckM), 0, FL - 0.1, HD + 1.15));
  root.add(at(box(2 * HW + 0.5, 0.14, 2.6, roofM), 0, 3.0, HD + 1.3));
  for (const x of [-4.3, -1.5, 1.5, 4.3]) root.add(at(box(0.16, 2.65, 0.16, mat(COL.woodDark, { roughness: 0.7 })), x, FL + 1.32, HD + 2.3));
  for (let i = 0; i < 2; i++) { const sh = 0.24 - i * 0.12; root.add(at(box(1.8, sh, 0.42, mat(COL.stone)), 0, sh / 2, HD + 2.5 + i * 0.42)); }
  const downlight = mat('#FFF3DD', { emissive: '#FFD39A', emissiveIntensity: 0 });
  live.porch.push(downlight);
  for (const x of [-2.8, 0, 2.8]) root.add(at(cyl(0.12, 0.12, 0.04, downlight, 16), x, 2.92, HD + 1.6));
  // Chairs + plant on the porch
  for (const x of [2.1, 3.3]) {
    const c = new THREE.Group();
    c.add(at(box(0.8, 0.14, 0.75, mat('#E7E0D2'), 0.05), 0, 0.42, 0), at(box(0.8, 0.6, 0.14, mat('#E7E0D2'), 0.05), 0, 0.72, -0.32));
    for (const lx of [-0.34, 0.34]) c.add(at(box(0.06, 0.4, 0.7, mat(COL.woodDark)), lx, 0.2, 0));
    c.position.set(x, FL, HD + 1.0); c.rotation.y = x > 3 ? -0.3 : 0.25; root.add(c);
  }
  root.add(at(cyl(0.25, 0.25, 0.4, mat(COL.wood), 20), 2.7, FL + 0.2, HD + 1.2));
  const pp = pottedPlant(1.3, 31, '#2F363B'); pp.position.set(-1.2, FL, HD + 0.55); root.add(pp);
  const pp2 = pottedPlant(1.0, 33, '#2F363B'); pp2.position.set(1.0, FL, HD + 0.55); root.add(pp2);

  // Carport with solar roof
  const cx = 6.8, post = mat('#2A3034', { metalness: 0.5, roughness: 0.4 });
  for (const x of [5.05, 8.55]) for (const z of [-2.2, 3.2]) root.add(at(box(0.12, 2.75, 0.12, post), x, 1.37, z));
  const cport = new THREE.Group();
  cport.position.set(cx, 2.82, 0.5);
  cport.rotation.x = 0.07;
  cport.add(box(3.9, 0.12, 6.0, roofM));
  const carr = solarArray(3, 3, 1.18, 1.82, 0.05);
  carr.group.position.y = 0.1;
  cport.add(carr.group);
  live.sheens.push(carr.sheen);
  root.add(cport);
  root.add(at(box(3.8, 0.04, 15.5, mat('#CFCBC2', { roughness: 0.9 })), cx, 0.02, 5.5));

  const ev = car();
  ev.position.set(cx + 0.1, 0.02, 0.6);
  root.add(ev);
  live.car = ev;

  // Wallbox, battery and cable on the +X wall
  const ledM = new THREE.MeshStandardMaterial({ color: COL.mint, emissive: new THREE.Color(COL.mint), emissiveIntensity: 1.2, toneMapped: false });
  live.led = ledM;
  root.add(at(box(0.14, 0.44, 0.34, mat('#20272B', { roughness: 0.4 }), 0.04), HW + 0.07, 1.45, 1.2));
  root.add(at(box(0.02, 0.2, 0.04, ledM), HW + 0.15, 1.5, 1.2));
  root.add(at(box(0.24, 1.45, 0.82, mat('#FBFBF9', { roughness: 0.35 }), 0.06), HW + 0.12, FL + 0.95, -1.4));
  root.add(at(box(0.02, 0.56, 0.035, ledM), HW + 0.25, FL + 0.95, -1.12));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(256, 128, (g) => { g.fillStyle = '#FBFBF9'; g.fillRect(0, 0, 256, 128); drawMark(g, 30, 34, 60, '#00C887'); g.fillStyle = '#0B1A20'; g.font = '700 46px sans-serif'; g.fillText('TISE', 104, 84); }) }));
  face.rotation.y = Math.PI / 2; face.position.set(HW + 0.245, FL + 1.45, -1.45);
  root.add(face);
  const port = new THREE.Vector3(cx + 0.1 - 0.96, 0.85, 0.6 - 1.3);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(new THREE.Vector3(HW + 0.12, 1.25, 1.2), new THREE.Vector3(HW + 0.3, 0.1, 1.0), new THREE.Vector3(port.x - 0.4, 0.1, port.z), port), 40, 0.028, 8), mat('#1D2326', { roughness: 0.5 }));
  cable.castShadow = true;
  root.add(cable);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 32), new THREE.MeshBasicMaterial({ color: COL.mint, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  ring.rotation.y = Math.PI / 2; ring.position.copy(port).add(new THREE.Vector3(-0.02, 0, 0));
  root.add(ring);
  live.ring = ring;

  // Energy paths
  live.dayFlows = [
    new THREE.CatmullRomCurve3([slopePoint(1, 1.4).addScaledVector(slopeNormal(1), RT + 0.15).setX(1.5), slopePoint(1, 1.4).addScaledVector(slopeNormal(1), RT + 0.15).setX(4.2), new THREE.Vector3(HW + 0.2, TOP - 0.2, 0.2), new THREE.Vector3(HW + 0.25, FL + 2.2, -1.2), new THREE.Vector3(HW + 0.3, FL + 1.3, -1.4)], false, 'centripetal'),
    new THREE.CatmullRomCurve3([new THREE.Vector3(cx, 3.05, -0.4), new THREE.Vector3(5.1, 2.9, -2.2), new THREE.Vector3(5.1, 1.6, -2.1), new THREE.Vector3(HW + 0.25, 1.45, 0.4), new THREE.Vector3(HW + 0.2, 1.25, 1.2), new THREE.Vector3(HW + 0.35, 0.15, 1.0), new THREE.Vector3(port.x - 0.4, 0.15, port.z), port.clone()], false, 'centripetal'),
  ];
  live.nightFlows = [
    new THREE.CatmullRomCurve3([new THREE.Vector3(HW + 0.3, FL + 1.3, -1.4), new THREE.Vector3(HW + 0.3, FL + 2.0, 0.6), new THREE.Vector3(HW - 0.2, FL + 2.0, HD + 0.25), new THREE.Vector3(2.5, FL + 1.6, HD + 0.2)], false, 'centripetal'),
  ];

  // Landscape
  const R = rng(77);
  const hedgeM = mat('#4F8B52', { roughness: 0.95 });
  for (const [x0, x1] of [[-4.6, -1.2], [1.2, 4.4]]) root.add(at(box(x1 - x0, 0.7, 0.7, hedgeM, 0.3), (x0 + x1) / 2, 0.35, HD + 3.1));
  const flowerCols = ['#FFFFFF', '#FFD86B', '#FF9EB5', COL.mint, '#B7A2FF'];
  const flowerGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const [x0, x1] of [[-4.6, -1.2], [1.2, 4.4]]) for (let i = 0; i < 26; i++) {
    const f = new THREE.Mesh(flowerGeo, mat(flowerCols[Math.floor(R() * flowerCols.length)], { roughness: 0.6 }));
    f.position.set(lerp(x0, x1, R()), 0.12 + R() * 0.1, HD + 3.65 + R() * 0.35);
    root.add(f);
  }
  for (let i = 0; i < 9; i++) root.add(at(box(1.0, 0.05, 0.6, mat(COL.stone), 0.03), (i % 2 - 0.5) * 0.18, 0.025, HD + 3.4 + i * 0.95));
  for (const x of [-1.25, 1.25]) {
    const lp = new THREE.Group();
    lp.add(at(cyl(0.035, 0.05, 1.9, mat('#23292D', { metalness: 0.5, roughness: 0.4 }), 12), 0, 0.95, 0));
    const head = new THREE.MeshStandardMaterial({ color: '#FFF6E6', emissive: new THREE.Color('#FFD39A'), emissiveIntensity: 0 });
    lp.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), head), 0, 1.98, 0));
    lp.position.set(x, 0, HD + 7.6);
    root.add(lp);
    live.lamps.push(head);
  }
  const bench = new THREE.Group();
  bench.add(at(box(1.6, 0.08, 0.45, mat(COL.wood)), 0, 0.45, 0), at(box(1.6, 0.35, 0.06, mat(COL.wood)), 0, 0.7, -0.2));
  for (const x of [-0.7, 0.7]) bench.add(at(box(0.06, 0.45, 0.45, mat('#23292D')), x, 0.22, 0));
  bench.position.set(3.4, 0, HD + 8.4); bench.rotation.y = -0.5;
  root.add(bench);

  const trees = [[-6.5, -6], [-2.4, -7.6], [2.6, -7.2], [7.4, -6.2], [-8.6, -1.2], [-9.4, 4.2], [11.6, -1.5], [12.2, 4.6], [-15, 13], [16, 12], [-4.5, -10.5], [6, -11], [-11.5, -6], [12.5, -7]];
  trees.forEach(([x, z], i) => {
    const t = R() > 0.3 ? tree(3.6 + R() * 2.4, 300 + i) : conifer(4 + R() * 2.4, 300 + i);
    t.position.set(x, 0, z); t.rotation.y = R() * 6;
    root.add(t); live.trees.push(t);
  });
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 9;
    const b = bush(0.5 + R() * 0.4, 400 + i);
    b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1);
    if (b.position.z > 4 && Math.abs(b.position.x) < 9) continue;
    root.add(b);
  }
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (1.05 + R() * 0.9), r = 34 + R() * 18;
    const t = R() > 0.5 ? tree(6 + R() * 4, 500 + i) : conifer(7 + R() * 4, 500 + i);
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.7 - 8);
    root.add(t);
  }
  for (const [x, z] of [[-5.2, 3.6], [5.0, -3.6], [-5.0, -3.2]]) { const b = bush(0.55, Math.abs(x * z) | 0); b.position.set(x, 0, z); root.add(b); }

  return { root, live };
}

export function initFinale({ canvas, section, stage, hud, onProgress, reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const skyU = { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uGlow: { value: new THREE.Color('#FFB27A') }, uG: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uTop, uBot, uGlow; uniform float uG; varying vec3 vP;
      void main(){ float e = max(normalize(vP).y, 0.); vec3 c = mix(uBot, uTop, pow(e, .55));
        c = mix(c, uGlow, uG * exp(-e * 9.) * .55); gl_FragColor = vec4(c, 1.); }`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  scene.fog = new THREE.Fog('#E1F1EE', 55, 170);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);
  const hemi = new THREE.HemisphereLight('#EAF6FF', '#9DB58A', 1);
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const lawn = new THREE.Mesh(new THREE.CircleGeometry(160, 64).rotateX(-Math.PI / 2), mat('#9FC283', { roughness: 1 }));
  lawn.receiveShadow = true;
  scene.add(lawn);
  const { root, live } = buildHome();
  root.position.x = -1.2;
  scene.add(root);

  const porchLight = new THREE.PointLight('#FFC27A', 0, 12, 1.6);
  porchLight.position.set(0, 2.6, HD + 1.8);
  const lampLights = [-1.25, 1.25].map((x) => { const l = new THREE.PointLight('#FFD39A', 0, 7, 1.8); l.position.set(x, 2.1, HD + 7.6); return l; });
  const winLight = new THREE.PointLight('#FFB868', 0, 14, 1.4);
  winLight.position.set(0, 1.8, HD + 2.6);
  root.add(porchLight, winLight, ...lampLights);

  // Sky dressing
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#FFE2B0', transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunSprite.scale.setScalar(16);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#FFFFFF', transparent: true, depthWrite: false, fog: false }));
  sunCore.scale.setScalar(3.4);
  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#E7EEFF', transparent: true, depthWrite: false, fog: false, opacity: 0 }));
  moonSprite.scale.setScalar(4.5);
  moonSprite.position.set(-28, 30, -60);
  scene.add(sunSprite, sunCore, moonSprite);

  const stars = twinkle(500, () => {
    const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.2;
    return [Math.cos(a) * Math.cos(e) * 120, 8 + Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 120 - 40];
  }, '#FFFFFF', 1.6 * renderer.getPixelRatio(), 0);
  stars.material.fog = false;
  scene.add(stars);
  const flies = twinkle(110, () => {
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 12;
    return [Math.cos(a) * r, 0.3 + Math.random() * 1.8, Math.sin(a) * r + 2];
  }, '#D9FF8E', 0.55 * renderer.getPixelRatio(), 0.6);
  scene.add(flies);
  const motes = twinkle(160, () => [(Math.random() - 0.5) * 34, 0.5 + Math.random() * 7, (Math.random() - 0.5) * 24 + 2], '#FFF6DA', 0.22 * renderer.getPixelRatio(), 1.4);
  scene.add(motes);

  const cloudM = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.25 });
  const clouds = [];
  const R = rng(9);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const n = 5 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const s = 1.6 + R() * 2.2;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), cloudM);
      m.position.set((k - n / 2) * 1.7 + R(), R() * 1.2, R() * 1.5);
      m.scale.y = 0.7;
      c.add(m);
    }
    c.position.set(-70 + i * 22 + R() * 8, 17 + R() * 9, -38 - R() * 25);
    c.userData.speed = 0.5 + R() * 0.6;
    clouds.push(c);
    scene.add(c);
  }

  const flock = [];
  for (let i = 0; i < 8; i++) {
    const b = bird();
    b.userData.off = [((i % 2) * 2 - 1) * Math.ceil(i / 2) * 0.9, Math.ceil(i / 2) * -0.7, R() * 0.4];
    b.userData.phase = R() * 6;
    flock.push(b);
    scene.add(b);
  }

  const bot = mower();
  root.add(bot);

  // Energy particles (day: panels → battery/car, night: battery → home).
  function makeFlow(curves, count) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * curves.length * 3), 3));
    const m = new THREE.PointsMaterial({ map: dotTex(), color: '#00E89A', size: 0.34, transparent: true, depthWrite: false, toneMapped: false });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    root.add(pts);
    const v = new THREE.Vector3();
    return {
      m,
      tick(t) {
        const a = geo.attributes.position.array;
        curves.forEach((c, ci) => {
          for (let i = 0; i < count; i++) {
            const u = (t * 0.09 + Math.floor(i / 3) / (count / 3) + (i % 3) * 0.012) % 1;
            c.getPointAt(u, v);
            a.set([v.x, v.y, v.z], (ci * count + i) * 3);
          }
        });
        geo.attributes.position.needsUpdate = true;
      },
    };
  }
  const dayFlow = makeFlow(live.dayFlows, 18);
  const nightFlow = makeFlow(live.nightFlows, 15);

  // ── Time of day ──
  const top = new THREE.Color(), bot2 = new THREE.Color(), sunC = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const hemiSky = new THREE.Color();
  function sample(h) {
    let i = 0;
    while (i < KEYS.length - 2 && h > KEYS[i + 1].h) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = smooth(a.h, b.h, h);
    top.lerpColors(tmpA.set(a.top), tmpB.set(b.top), t);
    bot2.lerpColors(tmpA.set(a.bot), tmpB.set(b.bot), t);
    sunC.lerpColors(tmpA.set(a.sun), tmpB.set(b.sun), t);
    return { si: lerp(a.si, b.si, t), hemi: lerp(a.hemi, b.hemi, t), env: lerp(a.env, b.env, t) };
  }
  function paintSky(glow) {
    skyU.uTop.value.copy(top);
    skyU.uBot.value.copy(bot2);
    skyU.uG.value = glow;
  }

  // ── Size / visibility ──
  let W = 1, H = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = Math.max(32, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) / camera.aspect)));
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(stage);

  let mx = 0, my = 0, smx = 0, smy = 0;
  stage.addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; });

  const target = new THREE.Vector3(0.6, 2.1, 1.5);
  let p = 0, ps = 0, lastHour = -1, darkT = 0, darkK = 0;
  const t0 = performance.now();
  const v = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { darkK = darkT; return; }
    const t = (performance.now() - t0) / 1000;
    darkK += (darkT - darkK) * 0.04;
    const r = section.getBoundingClientRect();
    p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    ps += (p - ps) * (reduced ? 1 : 0.08);
    smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;

    const hour = lerp(lerp(H0, 19.2, darkK), H1, ps);
    const k = sample(hour);
    const night = smooth(18.7, 20.4, hour);
    const day = 1 - smooth(18.2, 19.6, hour);

    // Sun arc behind the house; key light kept in front so the facade reads.
    const th = clamp((hour - 6) / 13.2, 0, 1) * Math.PI;
    const sx = -Math.cos(th) * 62, sy = 2 + Math.sin(th) * 34;
    sunSprite.position.set(sx, sy, -70); sunCore.position.copy(sunSprite.position);
    sunSprite.material.color.copy(sunC).lerp(tmpA.set('#FFFFFF'), 0.2);
    sunSprite.material.opacity = day * 0.9; sunCore.material.opacity = day;
    moonSprite.material.opacity = night;
    sun.position.lerpVectors(v.set(sx * 0.45, Math.max(sy, 10), 34), v.clone().set(-22, 30, 26), night);
    sun.color.copy(sunC);
    sun.intensity = k.si;
    hemi.intensity = k.hemi;
    hemi.color.copy(hemiSky.copy(top).lerp(tmpA.set('#FFFFFF'), 0.55)).lerp(tmpB.set('#2E3C66'), night);
    hemi.groundColor.set('#9DB58A').lerp(tmpA.set('#0E1A1C'), night);
    scene.environmentIntensity = k.env;
    scene.fog.color.copy(bot2).lerp(tmpB.set('#FFB27A'), smooth(17, 18.6, hour) * (1 - night) * 0.55);
    renderer.toneMappingExposure = 1.02 - night * 0.08;
    paintSky(smooth(17, 18.6, hour) * (1 - night));
    cloudM.emissive.copy(sunC);
    cloudM.emissiveIntensity = 0.12 + day * 0.18;
    cloudM.color.copy(tmpA.set('#FFFFFF').lerp(tmpB.set('#3A4766'), night));

    // Lights coming on
    for (const w of live.windows) w.m.emissiveIntensity = smooth(w.th, w.th + 0.18, night) * 1.5;
    const lampOn = smooth(0.15, 0.35, night);
    for (const l of live.lamps) l.emissiveIntensity = lampOn * 3;
    for (const l of lampLights) l.intensity = lampOn * 6;
    for (const d of live.porch) d.emissiveIntensity = smooth(0.3, 0.5, night) * 4;
    porchLight.intensity = smooth(0.3, 0.5, night) * 14;
    winLight.intensity = night * 10;
    for (const s of live.sheens) { s.material.uniforms.uT.value = ((t * 0.2) % 1.6) - 0.3; s.material.uniforms.uI.value = day; }
    stars.material.uniforms.uO.value = night;
    flies.material.uniforms.uO.value = smooth(0.4, 1, night);
    motes.material.uniforms.uO.value = day * 0.55;
    for (const m of [stars, flies, motes]) m.material.uniforms.uT.value = t;

    // Life
    live.led.emissiveIntensity = 1 + Math.sin(t * 2.6) * 0.5;
    const rs = (t * 0.6) % 1;
    live.ring.scale.setScalar(1 + rs * 2.4);
    live.ring.material.opacity = (1 - rs) * 0.9;
    for (const tr of live.trees) {
      const c = tr.userData.canopy, ph = tr.userData.phase;
      c.rotation.z = Math.sin(t * 0.9 + ph) * 0.025;
      c.rotation.x = Math.cos(t * 0.7 + ph) * 0.02;
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * 0.016;
      if (c.position.x > 85) c.position.x = -85;
    }
    const birdsOn = 1 - smooth(18.8, 19.8, hour);
    flock.forEach((b, i) => {
      const a = t * 0.07 + 1.2;
      const [ox, oy, oz] = b.userData.off;
      b.position.set(Math.cos(a) * 30 + ox, 13 + oy + Math.sin(t * 0.5 + i) * 0.2, Math.sin(a) * 12 - 22 + oz + Math.abs(ox) * 0.6);
      b.rotation.y = -a;
      b.visible = birdsOn > 0.05;
      b.scale.setScalar(birdsOn);
      const f = Math.sin(t * 9 + b.userData.phase) * 0.55;
      b.userData.wings[0].rotation.z = f; b.userData.wings[1].rotation.z = -f;
    });
    // Robot mower works the front lawn through the day, docks at dusk.
    const work = smooth(8.5, 9.5, hour) * (1 - smooth(16.5, 17.5, hour));
    const mt = t * 0.16;
    const mxp = lerp(-5.8, -4.3 + Math.sin(mt) * 2.6, work), mzp = lerp(HD + 4.2, HD + 8.6 + Math.sin(mt * 2) * 1.6, work);
    const dx = mxp - bot.position.x, dz = mzp - bot.position.z;
    if (dx * dx + dz * dz > 1e-6) bot.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    bot.position.set(mxp, 0, mzp);
    dayFlow.m.opacity = day; nightFlow.m.opacity = night;
    if (!reduced) { dayFlow.tick(t); nightFlow.tick(t); }
    live.car.userData.lights[0].emissiveIntensity = 0.4 + night * 2;

    // Camera drifts around the house as the day passes.
    const e = ps * ps * (3 - 2 * ps);
    const az = lerp(-0.5, 0.42, e) + Math.sin(t * 0.12) * 0.03 + smx * 0.06;
    const dist = lerp(38, 29, e);
    camera.position.set(target.x + Math.sin(az) * dist, lerp(9.5, 6.2, e) - smy * 0.6, target.z + Math.cos(az) * dist);
    camera.lookAt(target);
    sky.position.copy(camera.position);

    // Start with the house low in frame, clear of the headline; lift it at the end for the wordmark.
    const shift = H * (0.2 * smooth(0.8, 0.95, ps) - 0.26 * (1 - smooth(0, 0.2, ps)));
    if (Math.abs(shift) > 0.5) camera.setViewOffset(W, H, 0, shift, W, H); else camera.clearViewOffset();
    renderer.render(scene, camera);

    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    if (hh * 60 + mm !== lastHour) {
      lastHour = hh * 60 + mm;
      const solar = Math.max(0, Math.sin(th)) * day * 6.2;
      const batt = hour < 17 ? lerp(38, 96, smooth(7, 16, hour)) : lerp(96, 71, smooth(17.5, 21.6, hour));
      onProgress?.({ p: ps, hour, night, clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, solar, batt, home: 0.6 + night * 1.6 + Math.sin(hour) * 0.15 });
    }
    hud?.style.setProperty('--night', night.toFixed(3));
    section.style.setProperty('--p', ps.toFixed(4));
    section.style.setProperty('--night', night.toFixed(3));
  }
  frame();

  // Dark theme: the scroll runs from dusk into night instead of from morning.
  return { setDark(on) { darkT = on ? 1 : 0; } };
}

// Renders the card "photos" from the same 3D house, once, at load.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildHeroHouse } from './house.js';
import { COL, mat, tree, conifer, bush, rng } from './kit.js';

const DAY = ['#86C1E0', '#EEF5EF'];
const GOLD = ['#9DB7D2', '#F6D7B0'];
const DUSK = ['#2C3A63', '#EE9F7C'];
const NIGHT = ['#08111F', '#1A2C45'];

// key, size, camera, look-at, sky, night amount
export const SHOTS = [
  ['feat-monitor', 600, 820, [2.2, 7.4, 6.6], [0.6, 4.4, 1.5], GOLD, 0],
  ['feat-battery', 600, 820, [-6.7, 1.9, 3.1], [-4.1, 1.45, 1.0], DAY, 0],
  ['feat-analytics', 600, 820, [-5.5, 3.0, 12.5], [0, 2.4, 0.5], DUSK, 0.7],
  ['feat-proactive', 600, 820, [0.9, 2.2, 6.2], [0.4, 1.8, -0.6], NIGHT, 1],
  ['why-0', 1000, 760, [-7.5, 4.6, 13], [0, 2.3, 0.5], DAY, 0],
  ['why-1', 1000, 760, [2.6, 2.4, 6.4], [-0.3, 1.6, -0.8], GOLD, 0.15],
  ['why-2', 1000, 760, [1.2, 11, 7.8], [0.5, 3.6, 0.8], DAY, 0],
  ['why-3', 1000, 760, [8.5, 3.6, 11.5], [0, 2.3, 0.3], DUSK, 0.55],
  ['eco-solar', 360, 360, [1.7, 6.8, 5.8], [0.6, 4.3, 1.5], DAY, 0],
  ['eco-battery', 360, 360, [-6.1, 1.6, 2.1], [-4.1, 1.3, 1.1], DAY, 0],
  ['eco-home', 360, 360, [-9, 4.5, 12.5], [0, 2.2, 0.3], DUSK, 0.6],
  ['eco-inverter', 360, 360, [1.0, 2.0, 0.9], [3.7, 2.0, -0.6], GOLD, 0.3],
  ['eco-monitor', 360, 360, [0.5, 15, 6.5], [0, 2, 0.5], DAY, 0],
  ['eco-smart', 360, 360, [2.2, 2.1, 4.8], [-0.5, 1.5, -0.6], NIGHT, 0.9],
  ['dash', 900, 640, [-8.5, 7, 15.5], [0, 1.9, 0.6], null, 0],
];

function sky([top, bottom]) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function renderShots(onShot, { night: allNight = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const hemi = new THREE.HemisphereLight('#F2FBFF', '#B9C9AE', 1.1);
  const sun = new THREE.DirectionalLight('#FFF4E2', 2.7);
  sun.position.set(-6, 11, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(hemi, sun);

  const house = buildHeroHouse();
  scene.add(house.root);
  const world = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), mat(COL.grass, { roughness: 1 }));
  lawn.receiveShadow = true;
  world.add(lawn);
  const R = rng(40);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R() * 0.3, r = 8 + R() * 8;
    if (Math.sin(a) * r > 1) continue;
    const t = R() > 0.35 ? tree(3 + R() * 2.5, 100 + i) : conifer(3.5 + R() * 2, 100 + i);
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    world.add(t);
    if (R() > 0.5) { const b = bush(0.5, 200 + i); b.position.set(Math.cos(a) * (r - 1.5), 0, Math.sin(a) * (r - 1.5)); world.add(b); }
  }
  scene.add(world);

  const dayHemi = new THREE.Color('#F2FBFF'), nightHemi = new THREE.Color('#5A6E9A');
  const daySun = new THREE.Color('#FFF4E2'), moon = new THREE.Color('#9DB4FF'), gold = new THREE.Color('#FFC890');

  for (let [key, w, h, cam, look, colors, night] of SHOTS) {
    if (allNight) { colors = colors && (colors === DUSK ? DUSK : NIGHT); night = colors === DUSK ? 0.85 : 1; }
    const studio = !colors;
    for (const m of house.parts.ground) m.visible = studio;
    world.visible = !studio;
    scene.background = sky(colors || (allNight ? ['#10232C', '#0A1820'] : ['#E3F1EA', '#F3F8F5']));
    scene.fog = studio ? null : new THREE.Fog(colors[1], 22, 60);
    const warm = colors === GOLD || colors === DUSK;
    house.setNight(night);
    hemi.intensity = 1.1 - night * 0.8;
    hemi.color.lerpColors(dayHemi, nightHemi, night);
    sun.intensity = (warm ? 2.3 : 2.7) - night * 2.1;
    sun.color.lerpColors(warm ? gold : daySun, moon, colors === DUSK ? 0.2 : night);
    scene.environmentIntensity = 0.6 - night * 0.45;
    house.update(1.1);

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(...cam);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const url = await new Promise((r) => renderer.domElement.toBlob((b) => r(URL.createObjectURL(b)), 'image/jpeg', 0.9));
    onShot(key, url);
    await new Promise((r) => setTimeout(r, 0));
  }
  renderer.dispose();
  renderer.forceContextLoss();
}

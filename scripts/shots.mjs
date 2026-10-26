// Headless Chrome screenshots at scroll positions (in viewport heights).
// Usage: node scripts/shots.mjs <url> <outDir> <width>x<height> <pos,pos,...>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const WebSocket = globalThis.WebSocket ?? createRequire(import.meta.url)('../../node_modules/ws');

const [url, out, size, list] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', `--user-data-dir=/tmp/tise-shots-${port}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(250);
  try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = t.find((x) => x.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
}
await new Promise((r) => ws.addEventListener ? ws.addEventListener('open', r) : ws.on('open', r));
let id = 0; const pending = new Map();
ws.on('message', (d) => { const e = { data: String(d) }; const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
await send('Page.navigate', { url });
await sleep(+(process.env.WAIT || 5000));
if (process.env.PRE) { await send('Runtime.evaluate', { expression: process.env.PRE }); await sleep(2500); }
for (const pos of list.split(',')) {
  await send('Runtime.evaluate', { expression: `(window.lenis ? lenis.scrollTo(${pos} * innerHeight, { immediate: true, force: true }) : scrollTo(0, ${pos} * innerHeight))` });
  await sleep(+(process.env.STEP || 1800));
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(`${out}/s-${pos}.jpg`, Buffer.from(data, 'base64'));
}
chrome.kill();
process.exit(0);

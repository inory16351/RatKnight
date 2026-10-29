// 사용: node tools/serve.js → http://localhost:5330/tools/build_single.html 열기 (서버의 POST /__dist 로 dist/ 에 저장)
// 1) 게임을 숨은 창으로 띄워 모든 방을 한 번씩 불러 보고, 실제로 읽은 그림·JSON 목록을 모음 (빠뜨림 없게)
// 2) PNG 는 같은 크기의 WebP 로 다시 압축 (게임이 그림 크기로 자리를 재므로 크기는 그대로, 명암·픽셀화는 코드가 하니 손실 압축 괜찮음)
// 3) web/src 모듈을 파일마다 함수 스코프로 감싸 한 스크립트로 (언더월드 tools/build_single.py 와 같은 방식)
// 4) 그림·JSON·글꼴은 data URI 로 넣고, Image.src·fetch 를 그 표로 돌려 줌
const log = s => { document.getElementById('log').textContent += s + '\n'; };
const ROOT = '/', SRC = 'web/src/', OUT = 'ratknight_proto.html', WEBP_Q = 0.9;

async function collectAssets() {
  const fr = document.getElementById('game');
  fr.src = '/web/index.html?build=' + Date.now();
  await new Promise(r => fr.onload = r);
  const w = fr.contentWindow;
  await new Promise(r => { const t = setInterval(() => { if (w.__game) { clearInterval(t); r(); } }, 200); });
  await new Promise(r => setTimeout(r, 1500));
  for (let i = 0; i < w.__game.ROOMS.length; i++) { w.__game.loadRoom(i); w.__game.step(5); }
  await new Promise(r => setTimeout(r, 1500));
  const list = w.performance.getEntriesByType('resource').filter(e => !(e.responseStatus >= 400))
    .map(e => decodeURIComponent(new URL(e.name).pathname).slice(1)).filter(p => /^art\//.test(p) && /\.(png|json|woff2)$/.test(p));
  if (w.performance.getEntriesByType('resource').length >= 250 && !w.performance.setResourceTimingBufferSize) log('   경고: 리소스 기록이 잘렸을 수 있음');
  fr.src = 'about:blank';
  return [...new Set(list)].sort();
}
const toDataURL = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
async function encode(path) {
  const res = await fetch(ROOT + path, { cache: 'no-store' }); if (!res.ok) return null;
  if (path.endsWith('.json')) return { kind: 'json', data: await res.text(), bytes: 0 };
  const blob = await res.blob();
  if (!path.endsWith('.png')) return { kind: 'url', data: await toDataURL(blob), bytes: blob.size };
  const bmp = await createImageBitmap(blob), c = new OffscreenCanvas(bmp.width, bmp.height);
  c.getContext('2d').drawImage(bmp, 0, 0);
  const webp = await c.convertToBlob({ type: 'image/webp', quality: WEBP_Q });
  const best = webp.size < blob.size ? webp : blob;   // 작아질 때만 WebP
  return { kind: 'url', data: await toDataURL(best), bytes: best.size };
}

// ---------- 모듈 묶기 ----------
const IMPORT_RE = /import\s+(\{[\s\S]*?\}|\*\s+as\s+\w+|[A-Za-z_$][\w$]*)\s+from\s+'(\.{1,2}\/[\w/]+)\.js';[^\n]*/g;
const modId = (cur, rel) => { const parts = cur.split('/').slice(0, -1); for (const s of rel.split('/')) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); } return parts.join('/'); };
const v = mid => '__m_' + mid.replace(/\//g, '_');
async function moduleOrder(entry = 'main') {
  const seen = new Set(), order = [], src = {};
  async function visit(mid) {
    if (seen.has(mid)) return; seen.add(mid);
    src[mid] = await (await fetch(ROOT + SRC + mid + '.js', { cache: 'no-store' })).text();
    for (const m of src[mid].matchAll(IMPORT_RE)) await visit(modId(mid, m[2]));
    order.push(mid);
  }
  await visit(entry);
  return { order, src };
}
function moduleJs(name, s) {
  const names = [...s.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  for (const [, line] of s.matchAll(/^export\s+const\s+(.+);\s*$/gm))   // export const W = 1, H = 2; 처럼 한 줄에 여러 개
    for (const part of line.split(/,(?![^{[(]*[}\])])/)) { const m = part.match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (m && !names.includes(m[1])) names.push(m[1]); }
  s = s.replace(/^export\s+/gm, '');
  s = s.replace(IMPORT_RE, (_, spec, rel) => {
    const mod = v(modId(name, rel));
    if (spec.startsWith('*')) return `const ${spec.split(/\s+/).pop()} = ${mod};`;
    if (!spec.startsWith('{')) return `const ${spec} = ${mod}.default;`;
    return `const ${spec.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2')} = ${mod};`;
  });
  return `const ${v(name)} = (() => {\n${s}\nreturn { ${names.join(', ')} };\n})();\n`;
}
// 그림·JSON 표로 돌려 주는 덧대기: '../art/x.png' · 'art/x.png' · '/art/x.png' 모두 같은 열쇠
const SHIM = `
const __norm = u => { u = String(u); if (/^(data|blob|https?):/.test(u)) return null; return u.split('?')[0].replace(/^(\\.\\.?\\/|\\/)+/g, ''); };
{
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', { get() { return d.get.call(this); }, set(u) { const k = __norm(u); d.set.call(this, (k && __ASSETS[k]) || u); }, configurable: true });
  const f0 = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (u, o) => { const k = __norm(typeof u === 'string' ? u : u.url); if (k && k in __JSON) return Promise.resolve(new Response(__JSON[k], { headers: { 'Content-Type': 'application/json' } })); return f0(u, o); };
}
`;

async function build() {
  const t0 = performance.now();
  log('1/4 게임에서 쓰는 그림 모으는 중…');
  const list = await collectAssets();
  log(`   ${list.length}개`);
  log('2/4 압축 중…');
  const A = {}, J = {}; let raw = 0, packed = 0;
  for (const [i, p] of list.entries()) {
    const e = await encode(p); if (!e) { log('   없음 ' + p); continue; }
    if (e.kind === 'json') J[p] = e.data; else { A[p] = e.data; packed += e.bytes; }
    if (i % 40 === 0) log(`   ${i}/${list.length}`);
  }
  if (!A['art/fonts/neodgm.woff2']) { const e = await encode('art/fonts/neodgm.woff2'); if (e) A['art/fonts/neodgm.woff2'] = e.data; }
  log(`   그림 ${(packed / 1048576).toFixed(1)}MB`);
  log('3/4 모듈 묶는 중…');
  const { order, src } = await moduleOrder();
  const js = order.map(n => moduleJs(n, src[n])).join('');
  log(`   ${order.join(' · ')}`);
  log('4/4 HTML 만드는 중…');
  let html = await (await fetch(ROOT + 'web/index.html', { cache: 'no-store' })).text();
  html = html.replace("url('../art/fonts/neodgm.woff2')", () => `url('${A['art/fonts/neodgm.woff2']}')`);
  const assets = `<script>\nglobalThis.__ASSETS = ${JSON.stringify(A)};\nglobalThis.__JSON = ${JSON.stringify(J)};\n${SHIM}</script>\n`;
  html = html.replace('<script type="module" src="src/main.js"></script>', () => `${assets}<script type="module">\n${js}</script>`);
  html = html.replace('<title>기사쥐 — 액션 모션 프로토</title>', () => `<title>기사쥐 — 액션 모션 프로토 (단일 HTML ${new Date().toISOString().slice(0, 10)})</title>`);
  const r = await fetch('/__dist?name=' + OUT, { method: 'POST', body: new Blob([html], { type: 'text/html' }) });
  log(`   ${await r.text()} · ${((performance.now() - t0) / 1000).toFixed(1)}초`);
  log('끝 — 확인: /dist/ 에서 열어 /art/ 요청이 하나도 없어야 함 (있으면 빠진 그림)');
  window.__built = true;
}
build().catch(e => { log('실패: ' + (e.stack || e)); window.__built = 'error'; });

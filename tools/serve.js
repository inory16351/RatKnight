// 로컬 정적 서버: node tools/serve.js [포트]  → http://localhost:5330/web/index.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 5330);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css' };

http.createServer((req, res) => {
  // 다른 페이지(ChatGPT 탭)에서 생성 그림을 보낼 수 있게
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, GET'); res.end(); return; }
  // 받은 그림 저장: POST /__art?path=art/knight/x.png (art/ 아래만)
  if (req.method === 'POST' && req.url.startsWith('/__art')) {
    const rel = new URL(req.url, 'http://x').searchParams.get('path') || '';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(path.join(ROOT, 'art'))) { res.writeHead(403); return res.end(); }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.concat(chunks)); res.end('ok ' + rel); });
    return;
  }
  // 캡처 저장: POST /__save?name=파일.png (본문 = PNG) → docs/shots/
  if (req.method === 'POST' && req.url.startsWith('/__save')) {
    const name = path.basename(new URL(req.url, 'http://x').searchParams.get('name') || 'shot.png');
    const dir = path.join(ROOT, 'docs', 'shots');
    fs.mkdirSync(dir, { recursive: true });
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks)); res.end('ok'); });
    return;
  }
  // 도구 데이터: POST /__data?name=파일.json[&dir=saves] → data/[saves/] 저장 · DELETE 같은 주소 = 지우기 · GET /__list?dir=saves = 파일 목록
  const dataDir = q => path.join(ROOT, 'data', q.get('dir') === 'saves' ? 'saves' : '');
  if (req.method === 'GET' && req.url.startsWith('/__list')) {
    const dir = dataDir(new URL(req.url, 'http://x').searchParams);
    const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({ name: f.slice(0, -5), time: fs.statSync(path.join(dir, f)).mtimeMs })) : [];
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(list));
  }
  if (req.method === 'DELETE' && req.url.startsWith('/__data')) {
    const q = new URL(req.url, 'http://x').searchParams, name = path.basename(q.get('name') || '');
    const file = path.join(dataDir(q), name);
    if (!name.endsWith('.json') || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    fs.unlinkSync(file); return res.end('deleted');
  }
  if (req.method === 'POST' && req.url.startsWith('/__data')) {
    const q = new URL(req.url, 'http://x').searchParams, name = path.basename(q.get('name') || 'data.json');
    if (!name.endsWith('.json')) { res.writeHead(400); return res.end(); }
    const dir = dataDir(q);
    fs.mkdirSync(dir, { recursive: true });
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks)); res.end('ok data/' + name); });
    return;
  }
  // 단일 HTML 빌드 결과 저장: POST /__dist?name=파일.html → dist/ (tools/build_single.html 이 보냄)
  if (req.method === 'POST' && req.url.startsWith('/__dist')) {
    const name = path.basename(new URL(req.url, 'http://x').searchParams.get('name') || 'ratknight_proto.html');
    const dir = path.join(ROOT, 'dist');
    fs.mkdirSync(dir, { recursive: true });
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { const b = Buffer.concat(chunks); fs.writeFileSync(path.join(dir, name), b); res.end(`ok dist/${name} ${(b.length / 1048576).toFixed(1)}MB`); });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/web/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}/web/index.html`));

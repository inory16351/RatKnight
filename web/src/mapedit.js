// 맵 제작 도구 (web/mapedit.html) — 할로우 나이트처럼 거대한 맵 한 장 (data/world.json version 3)
// 월드 = 48px 칸 격자 (32×32 칸 청크로 저장).
//  · 지역 = 격자에 칠하는 색 구역(편의상 구분). 지역 통째로 옮기기 · 범위(테두리) 늘리고 줄이기
//  · 레이어 = 지형 판. ‘기본 지형’ + 통로마다 ‘통로 레이어’. 통로 레이어끼리는 화면에서 겹쳐도 지형이 섞이지 않음 (게임: 통로 구역에 들어가면 그 레이어 지형으로)
//  · 통로 구역 = 통로 레이어가 쓰는 사각형 범위 (옮기기 · 크기)
//  · 방 = 카메라 구역 · 타일·오브젝트 = 지형 칠하기, 범위 선택 후 끌어 옮기기, 물건 놓기
// 선택 단위만 다르고 화면은 같은 맵 하나 (확대 정도만 다름). 규칙 기준 = docs/map-structure-handoff.md · docs/map-structure-plan.md
import { ABIL, BLOCK } from './abilities.js';

const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const k in attrs) k.startsWith('on') ? e[k] = attrs[k] : k === 'style' ? e.style.cssText = attrs[k] : e.setAttribute(k, attrs[k]); for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k?.nodeType ? k : String(k)); return e; };
const toast = t => { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.display = 'none', 1800); };
const opt = (v, label, cur) => h('option', { value: v, ...(String(v) === String(cur ?? '') ? { selected: '' } : {}) }, label);

// ---------- 정의 ----------
const CH = 32;   // 청크 한 변 (칸)
const NEED = { '': '조건 없음', ...Object.fromEntries(Object.values(ABIL).filter(a => a.id).map(a => [a.id, `${a.id} · ${a.name}`])) };
const NEED_COL = { '': '#9aa0c8', ...Object.fromEntries(Object.values(ABIL).filter(a => a.id).map(a => [a.id, a.color])) };
const KIND = { normal: '일반 통로', shutter: '지나면 닫히는 셔터', ability: '능력 지형', drop: '절벽 낙하', swim: '물길 수영' };
// 지역별 타일셋 · 소품 (리소스 그림은 나중에, 지금은 임시 박스)
// 칸 한 글자: 공통 '.' 빈칸 · '=' 발판(아래서 통과) · '~' 물 · '%' 용암 · 예전 글자 '#' 벽 · '^' 'v' '<' '>' 가시(지역 없음)
// 지역 타일 = U+0100 + 지역×32 + 번호 (0~4 = 바닥 1~5 · 5~16 = 가시 1~3 × 방향 ↑↓←→)
const TBASE = 0x100, DIRS = ['↑', '↓', '←', '→'];
const tileCode = (rg, i) => String.fromCharCode(TBASE + rg * 32 + i);
const floorCode = (rg, n) => tileCode(rg, n - 1);
const spikeCode = (rg, n, d) => tileCode(rg, 5 + (n - 1) * 4 + d);
const LEGACY = { '#': { kind: 'floor', rg: null, n: 1 }, '=': { kind: 'plat' }, '~': { kind: 'water' }, '%': { kind: 'lava' }, '^': { kind: 'spike', rg: null, n: 1, d: 0 }, 'v': { kind: 'spike', rg: null, n: 1, d: 1 }, '<': { kind: 'spike', rg: null, n: 1, d: 2 }, '>': { kind: 'spike', rg: null, n: 1, d: 3 } };
function tileInfo(ch) {
  if (!ch || ch === '.') return null;
  const c = ch.charCodeAt(0) - TBASE;
  if (c >= 0 && c < 320) { const rg = Math.floor(c / 32), i = c % 32; return i < 5 ? { kind: 'floor', rg, n: i + 1 } : { kind: 'spike', rg, n: Math.floor((i - 5) / 4) + 1, d: (i - 5) % 4 }; }
  return LEGACY[ch] || null;
}
const isTile = t => typeof t === 'string' && t.length === 1;
const ASSET_KIND = { prop: { name: '오브젝트', n: 10 }, light: { name: '광원', n: 3 }, decor: { name: '장식', n: 5 } };
const PROP_SIZE = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3], [3, 3], [4, 2], [4, 3], [5, 4]], LIGHT_SIZE = [[1, 1], [1, 2], [2, 2]], DECOR_SIZE = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1]];
function ensureAssets(w) {
  w.assets ??= {};
  for (const r of w.regions) {
    const a = w.assets[r.id] ??= {};
    a.floor ??= [1, 2, 3, 4, 5].map(n => ({ name: `바닥 ${n}` }));
    a.spike ??= [1, 2, 3].map(n => ({ name: `가시 ${n}` }));
    a.prop ??= PROP_SIZE.map(([w2, h2], i) => ({ name: `오브젝트 ${i + 1}`, w: w2, h: h2 }));
    a.light ??= LIGHT_SIZE.map(([w2, h2], i) => ({ name: `광원 ${i + 1}`, w: w2, h: h2, r: 4 + i * 2 }));
    a.decor ??= DECOR_SIZE.map(([w2, h2], i) => ({ name: `장식 ${i + 1}`, w: w2, h: h2 }));
  }
}
const assetOf = o => W.assets?.[o.rg]?.[o.type]?.[o.n - 1];
const assetTool = t => typeof t === 'string' && t.startsWith('asset:') ? (([, kind, rg, n]) => ({ kind, rg: +rg, n: +n }))(t.split(':')) : null;
const OBJ = {
  spawn: { name: '시작 지점', col: '#ffffff', size: [1, 2] }, shelter: { name: '쉼터 촛불', col: '#ffb347', size: [1, 2] },
  collect: { name: '수집품 (탐험 목표)', col: '#ffe14a', size: [1, 1] }, heart: { name: '체력 조각', col: '#ff5d73', size: [1, 1] },
  foe: { name: '적', col: '#e07a3a', size: [1, 1] }, boss: { name: '보스 자리', col: '#ff3d7f', size: [6, 4] },
  gate: { name: '능력 지형 표시', col: '#c9a227', size: [3, 3] },
  lock: { name: '스토리 잠금 문', col: '#ff9a1f', size: [1, 3] }, shutter: { name: '셔터 (지나면 닫힘)', col: '#b0b8d8', size: [1, 3] },
  sign: { name: '안내 글', col: '#8d8fb0', size: [1, 1] },
};
const FOES = { crawler: '딱정벌레', flyer: '날파리', roach: '바퀴벌레', pigeon: '비둘기' };
const BOSS_ROLE = { start: '시작 보스 (첫 1티어)', story: '스토리 보스 (진행 순서에 따라)', true: '진엔딩 전용 보스', normal: '노말 엔딩 보스' };
const BOSS_TYPE = { box: '임시 박스', toad: '개굴대왕 재사용', centipede: '레일 지네 재사용' };

// ---------- 기본 월드: 지역 6개를 구조도 배치대로, 사이에 통로 둘 빈칸을 두고 칠해 둠 + 통로 19개 목록 ----------
const REGION_DEF = [[0, '시작', '시작', '#d8cfa8'], [1, '지역 1', '초반', '#86b86f'], [2, '지역 2', '초반', '#9b7fc8'], [3, '지역 3', '초반', '#6b9fd6'], [4, '지역 4', '후반 · 노말 엔딩', '#d68f62'], [5, '지역 5', '후반 · 노말 엔딩', '#5fbfb0']];
function defaultWorld() {
  const W = { version: 3, tile: BLOCK, chunk: CH, seq: 1, area: {}, layers: [{ id: 'main', name: '기본 지형', kind: 'main', tiles: {} }], rooms: [], objects: [], passages: [],
    regions: REGION_DEF.map(([id, name, role, color]) => ({ id, name, role, color })) };
  const fill = (id, x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rawSet(W.area, x, y, String(id)); };
  fill(0, 160, 0, 280, 40); fill(1, 160, 70, 280, 120); fill(2, 10, 110, 130, 170); fill(3, 310, 110, 430, 170); fill(4, 70, 210, 190, 260); fill(5, 250, 210, 370, 260);
  const add = (from, to, need, dir, kind) => W.passages.push({ id: `p${from}_${to}`, from, to, need, dir, kind, note: '' });
  add(0, 1, 'c', 'one', 'shutter'); add(0, 2, 'b', 'one', 'shutter'); add(0, 3, 'a', 'one', 'shutter');
  add(1, 2, 'a', 'two', 'ability'); add(1, 3, 'b', 'two', 'ability'); add(2, 3, 'c', 'two', 'ability');
  for (const r of [1, 2, 3]) { add(r, 4, 'd', 'one', 'ability'); add(r, 5, 'e', 'one', 'ability'); }
  add(4, 5, '', 'two', 'normal');
  for (const l of [4, 5]) for (const r of [1, 2, 3]) add(l, r, '', 'one', 'drop');
  ensureAssets(W);
  return W;
}
// 예전 형식(version 2: tiles 한 판) → 3
function migrate(w) {
  if (w.version === 3) return w;
  if (w.version !== 2) return null;
  w.layers = [{ id: 'main', name: '기본 지형', kind: 'main', tiles: w.tiles || {} }]; delete w.tiles;
  w.objects = (w.objects || []).filter(o => o.type !== 'pass');   // 예전 ‘통로 표시’는 통로 레이어·구역으로 바뀜
  w.version = 3; return w;
}

// ---------- 격자 (청크) — L = 'area' 또는 레이어 id ----------
let W = null;
const ck = (x, y) => Math.floor(x / CH) + ',' + Math.floor(y / CH);
const layer = id => W.layers.find(l => l.id === id);
const store = L => L === 'area' ? W.area : layer(L)?.tiles;
function rawSet(S, x, y, v) {
  const key = ck(x, y); let c = S[key];
  if (!c) { if (v === '.') return false; c = S[key] = Array(CH).fill('.'.repeat(CH)); }
  const ly = y - Math.floor(y / CH) * CH, lx = x - Math.floor(x / CH) * CH, row = c[ly];
  if (row[lx] === v) return false;
  c[ly] = row.slice(0, lx) + v + row.slice(lx + 1); return true;
}
function get(L, x, y) { const c = store(L)?.[ck(x, y)]; return c ? c[y - Math.floor(y / CH) * CH][x - Math.floor(x / CH) * CH] : '.'; }
function set(L, x, y, v) {
  const S = store(L); if (!S) return;
  const key = ck(x, y);
  if (stroke && !(L + '|' + key in stroke.chunks)) stroke.chunks[L + '|' + key] = S[key] ? [...S[key]] : null;
  if (rawSet(S, x, y, v)) { markDirty(L, key); if (L === 'area') areaDirty = true; }
}
const region = id => W.regions.find(r => r.id === +id);
const regionAt = (x, y) => { const v = get('area', x, y); return v === '.' ? null : region(v); };
const passage = id => W.passages.find(p => p.id === id);
const passLayer = pid => W.layers.find(l => l.passage === pid);
const newId = p => `${p}${W.seq++}`;

// ---------- 되돌리기: 한 번의 동작 단위로 바뀐 청크 + 나머지 ----------
const undoStack = [];
let stroke = null;
const metaOf = () => JSON.stringify({ rooms: W.rooms, objects: W.objects, regions: W.regions, passages: W.passages, seq: W.seq, layers: W.layers.map(l => ({ ...l, tiles: undefined })) });
function begin() { stroke = { chunks: {}, meta: metaOf() }; undoStack.push(stroke); if (undoStack.length > 80) undoStack.shift(); }
function end() { stroke = null; dirty(); }
function doUndo() {
  const u = undoStack.pop(); if (!u) return toast('되돌릴 것 없음');
  const m = JSON.parse(u.meta), tiles = Object.fromEntries(W.layers.map(l => [l.id, l.tiles]));
  Object.assign(W, m); W.layers = m.layers.map(l => ({ ...l, tiles: tiles[l.id] || {} }));
  for (const k in u.chunks) { const [L, key] = k.split('|'), S = store(L); if (!S) continue; if (u.chunks[k]) S[key] = u.chunks[k]; else delete S[key]; markDirty(L, key); }
  areaDirty = true; sel = null; cellSel = null; if (!layer(activeLayer)) activeLayer = 'main'; dirty(); panel();
}
$('#undo').onclick = doUndo;
const LS = 'rk_world3';
let saveT = 0;
function dirty() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(W)); } catch (e) { toast('브라우저 저장 공간 부족 — 파일로 저장하세요'); } }, 400); draw(); }
function pruneChunks() { for (const S of [W.area, ...W.layers.map(l => l.tiles)]) for (const k in S) if (S[k].every(r => /^\.+$/.test(r))) delete S[k]; }
$('#save').onclick = async () => { pruneChunks(); const r = await fetch('/__data?name=world.json', { method: 'POST', body: JSON.stringify(W) }); toast(r.ok ? 'data/world.json 저장됨' : '저장 실패 (서버 확인)'); };

// ---------- 지역 통계 (중심 · 범위) ----------
let areaDirty = true, stats = {};
function regionStats() {
  if (!areaDirty) return stats; areaDirty = false; stats = {};
  for (const key in W.area) {
    const [cx0, cy0] = key.split(',').map(Number), c = W.area[key];
    for (let y = 0; y < CH; y++) { const row = c[y]; if (/^\.+$/.test(row)) continue; for (let x = 0; x < CH; x++) { const v = row[x]; if (v === '.') continue; const X = cx0 * CH + x, Y = cy0 * CH + y, s = stats[v] ??= { n: 0, sx: 0, sy: 0, x0: X, y0: Y, x1: X, y1: Y }; s.n++; s.sx += X; s.sy += Y; s.x0 = Math.min(s.x0, X); s.y0 = Math.min(s.y0, Y); s.x1 = Math.max(s.x1, X); s.y1 = Math.max(s.y1, Y); } }
  }
  return stats;
}
const regionBox = id => { const s = regionStats()[id]; return s ? { x: s.x0, y: s.y0, w: s.x1 - s.x0 + 1, h: s.y1 - s.y0 + 1 } : null; };
function roomRegion(r) { const n = {}; for (let y = r.y; y < r.y + r.h; y += 2) for (let x = r.x; x < r.x + r.w; x += 2) { const v = get('area', x, y); if (v !== '.') n[v] = (n[v] || 0) + 1; } const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0]; return best ? region(best[0]) : null; }
const layerTiles = l => { let n = 0; for (const k in l.tiles) for (const row of l.tiles[k]) for (const c of row) if (c !== '.') n++; return n; };

// ---------- 화면 상태 ----------
const cv = $('#cv'), cx = cv.getContext('2d');
const cam = { x: 0, y: 0, z: 4 };   // z = 화면 px / 칸
let mode = 'tile', sel = null, curRegion = 1, tileRegion = 1, spikeDir = 0, tool = String.fromCharCode(TBASE + 32), brush = 1, hover = null;
let activeLayer = 'main', curPass = null, cellSel = null;   // cellSel = 타일 범위 선택 {x0,y0,x1,y1}
const moveOpt = { area: false, objects: true, allLayers: false };
const dpr = () => devicePixelRatio || 1;
let fitted = false;
function resize() { const r = cv.getBoundingClientRect(); cv.width = r.width * dpr(); cv.height = r.height * dpr(); if (!fitted && W && cv.width > 50) { fitted = true; fit(...worldBounds()); } draw(); }
addEventListener('resize', resize);
const toCell = (px, py) => [Math.floor((px - cam.x) / cam.z), Math.floor((py - cam.y) / cam.z)];
$('#mode').onchange = e => setMode(e.target.value);
function setMode(m) {
  mode = m; sel = null; cellSel = null;
  tool = { region: 'paint', pass: 'zone', room: 'select', tile: floorCode(tileRegion, 1) }[m];
  $('#mode').value = m; panel(); draw();
}
function fit(x0, y0, x1, y1) { const w = cv.width, hh = cv.height; if (w < 50) return; const z = Math.max(0.15, Math.min(48, Math.min(w / (x1 - x0 + 8), hh / (y1 - y0 + 8)))); cam.z = z; cam.x = w / 2 - (x0 + x1) / 2 * z; cam.y = hh / 2 - (y0 + y1) / 2 * z; draw(); }
function worldBounds() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const S of [W.area, ...W.layers.map(l => l.tiles)]) for (const k in S) { const [a, b] = k.split(',').map(Number); x0 = Math.min(x0, a * CH); y0 = Math.min(y0, b * CH); x1 = Math.max(x1, a * CH + CH); y1 = Math.max(y1, b * CH + CH); } return x0 > x1 ? [0, 0, 100, 60] : [x0, y0, x1, y1]; }
$('#fit-all').onclick = () => fit(...worldBounds());
$('#fit-sel').onclick = () => fitSel();
function fitSel() {
  const box = selBox(); if (box) return fit(box.x - 4, box.y - 4, box.x + box.w + 4, box.y + box.h + 4);
  toast('고른 것 없음');
}
function selBox() {
  if (sel?.kind === 'region') return regionBox(sel.id);
  if (sel?.kind === 'room') return W.rooms.find(q => q.id === sel.id);
  if (sel?.kind === 'obj') { const o = W.objects.find(q => q.id === sel.id); return o && { x: o.x - 16, y: o.y - 10, w: 32, h: 20 }; }
  if (mode === 'pass' && curPass) return passLayer(curPass)?.zone;
  if (cellSel) return { x: cellSel.x0, y: cellSel.y0, w: cellSel.x1 - cellSel.x0 + 1, h: cellSel.y1 - cellSel.y0 + 1 };
  return null;
}

// ---------- 청크 그림 (1칸 = 1px, 바뀐 것만 다시) ----------
const cache = {}, dirtyKeys = new Set();
function markDirty(L, key) { dirtyKeys.add(L + '|' + key); if (L === 'area') for (const l of W.layers) dirtyKeys.add(l.id + '|' + key); }   // 지형 색은 지역 색을 따르므로 지역이 바뀌면 같이
const hex = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const mix = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.round(v + (255 - v) * k); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; };
function tileColor(ti, areaCol) {
  const rc = ti.rg != null ? region(ti.rg)?.color : areaCol;
  if (ti.kind === 'floor') return rc ? mix(rc, 0.05 + (ti.n - 1) * 0.1) : '#9aa0c8';
  if (ti.kind === 'spike') return rc ? mix(rc, 0.72 + ti.n * 0.08) : '#f4f4ff';
  if (ti.kind === 'water') return '#3f8fe0';
  if (ti.kind === 'lava') return '#ff6a2a';
  return rc ? mix(rc, 0.45) : '#c8cce8';
}
function chunkImg(L, key) {
  const ck2 = L + '|' + key;
  if (cache[ck2] && !dirtyKeys.has(ck2)) return cache[ck2];
  dirtyKeys.delete(ck2);
  const c = cache[ck2] ||= Object.assign(document.createElement('canvas'), { width: CH, height: CH }), x = c.getContext('2d');
  x.clearRect(0, 0, CH, CH);
  const A = W.area[key], S = store(L)?.[key], col = {};
  for (const r of W.regions) col[r.id] = r.color;
  for (let y = 0; y < CH; y++) for (let X = 0; X < CH; X++) {
    const a = A ? A[y][X] : '.';
    if (L === 'area') { if (a !== '.') { x.fillStyle = hex(col[a] || '#888888', 0.16); x.fillRect(X, y, 1, 1); } continue; }
    const ti = tileInfo(S ? S[y][X] : '.'); if (!ti) continue;
    x.fillStyle = tileColor(ti, col[a]); x.fillRect(X, y, 1, 1);
  }
  return c;
}

// ---------- 그리기 ----------
const LAYER_COL = ['#2fe6ff', '#ff3d7f', '#ffe14a', '#7ee2a8', '#c79bff', '#ff9a1f'];
const layerColor = l => l.kind === 'main' ? '#e8e6f4' : NEED_COL[passage(l.passage)?.need || ''];
function draw() {
  if (!W) return;
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#0b0c14'; cx.fillRect(0, 0, cv.width, cv.height);
  const z = cam.z, vx0 = Math.floor(-cam.x / z), vy0 = Math.floor(-cam.y / z), vx1 = Math.ceil((cv.width - cam.x) / z), vy1 = Math.ceil((cv.height - cam.y) / z);
  cx.setTransform(z, 0, 0, z, cam.x, cam.y); cx.imageSmoothingEnabled = false;
  const vis = key => { const [a, b] = key.split(',').map(Number); return !((a + 1) * CH < vx0 || a * CH > vx1 || (b + 1) * CH < vy0 || b * CH > vy1); };
  const drawLayer = (L, alpha) => { const S = store(L); cx.globalAlpha = alpha; for (const key in S) if (vis(key)) { const [a, b] = key.split(',').map(Number); cx.drawImage(chunkImg(L, key), a * CH, b * CH); } cx.globalAlpha = 1; };
  drawLayer('area', 1);
  // 레이어: 기본 지형 → 통로 레이어. 지금 편집하는 레이어만 또렷하게, 나머지는 흐리게
  const act = layer(activeLayer), editing = mode === 'tile' || mode === 'pass';
  for (const l of W.layers) {
    if (l.hidden) continue;
    const a = !editing || l.id === activeLayer ? 1 : act?.kind === 'pass' ? (l.kind === 'main' ? 0.45 : 0.22) : 0.55;
    drawLayer(l.id, a);
  }
  // 확대: 지금 레이어의 지형 모양 · 칸 선
  if (z >= 10) {
    for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
      const ti = tileInfo(get(activeLayer, x, y)); if (!ti) continue;
      const rc = regionAt(x, y), col = tileColor(ti, rc?.color);
      if (ti.kind === 'floor') { if (z >= 22) { cx.fillStyle = 'rgba(0,0,0,0.45)'; cx.font = '0.38px sans-serif'; cx.fillText(ti.rg != null ? `${ti.rg}-${ti.n}` : '벽', x + 0.08, y + 0.45); } continue; }
      cx.fillStyle = '#0b0c14'; cx.fillRect(x, y, 1, 1);
      if (rc) { cx.fillStyle = hex(rc.color, 0.16); cx.fillRect(x, y, 1, 1); }
      cx.fillStyle = ti.kind === 'water' ? 'rgba(63,143,224,0.75)' : ti.kind === 'lava' ? 'rgba(255,106,42,0.85)' : col;
      cx.beginPath();
      if (ti.kind === 'spike') {
        if (ti.d === 0) { cx.moveTo(x, y + 1); cx.lineTo(x + 0.5, y + 0.1); cx.lineTo(x + 1, y + 1); }
        else if (ti.d === 1) { cx.moveTo(x, y); cx.lineTo(x + 0.5, y + 0.9); cx.lineTo(x + 1, y); }
        else if (ti.d === 3) { cx.moveTo(x, y); cx.lineTo(x + 0.9, y + 0.5); cx.lineTo(x, y + 1); }
        else { cx.moveTo(x + 1, y); cx.lineTo(x + 0.1, y + 0.5); cx.lineTo(x + 1, y + 1); }
      } else if (ti.kind === 'plat') cx.rect(x, y, 1, 0.3);
      else cx.rect(x, y, 1, 1);
      cx.fill();
    }
    cx.lineWidth = 1 / z;
    for (let x = vx0; x <= vx1; x++) { cx.strokeStyle = x % 5 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'; cx.beginPath(); cx.moveTo(x, vy0); cx.lineTo(x, vy1); cx.stroke(); }
    for (let y = vy0; y <= vy1; y++) { cx.strokeStyle = y % 5 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'; cx.beginPath(); cx.moveTo(vx0, y); cx.lineTo(vx1, y); cx.stroke(); }
  }
  // 고른 지역: 칸 밝게 + 범위 테두리 · 손잡이
  if (sel?.kind === 'region') {
    cx.fillStyle = 'rgba(255,255,255,0.10)';
    for (const key of Object.keys(W.area)) { if (!vis(key)) continue; const [a, b] = key.split(',').map(Number), c = W.area[key]; for (let y = 0; y < CH; y++) { const row = c[y]; if (!row.includes(String(sel.id))) continue; for (let x = 0; x < CH; x++) if (row[x] === String(sel.id)) cx.fillRect(a * CH + x, b * CH + y, 1, 1); } }
    const b = drag?.rbox || regionBox(sel.id); if (b) boxWithHandles(b, region(sel.id)?.color || '#fff', true);
  }
  // 통로 구역 (통로 레이어의 범위): 점선 사각형 + 이름 · 방향
  for (const l of W.layers) if (l.kind === 'pass' && l.zone && !l.hidden) {
    const p = passage(l.passage), on = mode === 'pass' && curPass === l.passage, act2 = l.id === activeLayer, col = layerColor(l), zb = (drag?.zone === l && drag.box) || l.zone;
    cx.setLineDash(on || act2 ? [] : [6 / z, 4 / z]); cx.lineWidth = (on ? 3 : 1.5) / z; cx.strokeStyle = col; cx.globalAlpha = on || act2 || mode === 'pass' ? 1 : 0.5;
    cx.fillStyle = hex(col.startsWith('#') ? col : '#9aa0c8', on ? 0.1 : 0.04); cx.fillRect(zb.x, zb.y, zb.w, zb.h); cx.strokeRect(zb.x, zb.y, zb.w, zb.h); cx.setLineDash([]);
    if (p) { cx.font = `bold ${12 / z}px 'Noto Sans KR'`; cx.fillStyle = col; cx.fillText(`통로 ${p.from}${p.dir === 'two' ? '↔' : '→'}${p.to}${p.need ? ' · ' + p.need : ''}`, zb.x + 3 / z, zb.y + 14 / z); }
    cx.globalAlpha = 1;
    if (on) boxWithHandles(zb, col, false);
  }
  // 방
  for (const r of W.rooms) {
    const on = sel?.kind === 'room' && sel.id === r.id, rr = roomRegion(r), rb = (drag?.resize === r || drag?.move === r) ? r : r;
    cx.lineWidth = (on ? 3 : mode === 'room' ? 1.5 : 1) / z; cx.strokeStyle = on ? '#f2b33d' : mode === 'room' ? (rr ? mix(rr.color, 0.3) : '#ffffff') : 'rgba(255,255,255,0.22)';
    cx.strokeRect(rb.x, rb.y, rb.w, rb.h);
    if (mode === 'room' || z >= 3) { cx.fillStyle = on ? '#f2b33d' : 'rgba(255,255,255,0.55)'; cx.font = `${Math.max(10 / z, 0.5)}px 'Noto Sans KR'`; cx.fillText(r.name, r.x + 4 / z, r.y + 13 / z); }
    if (on) boxWithHandles(r, '#f2b33d', false);
  }
  // 오브젝트 (지금 레이어가 아닌 것은 흐리게)
  for (const o of W.objects) if (o.type === 'light') {
    const a = assetOf(o), cxp = o.x + (o.w || 1) / 2, cyp = o.y + (o.h || 1) / 2, rr = a?.r || 4, g2 = cx.createRadialGradient(cxp, cyp, 0, cxp, cyp, rr);
    g2.addColorStop(0, 'rgba(255,220,120,0.28)'); g2.addColorStop(1, 'rgba(255,220,120,0)'); cx.fillStyle = g2; cx.beginPath(); cx.arc(cxp, cyp, rr, 0, 7); cx.fill();
  }
  for (const o of W.objects) {
    const on = sel?.kind === 'obj' && sel.id === o.id, other = editing && (o.layer || 'main') !== activeLayer;
    cx.globalAlpha = other ? 0.35 : 1;
    if (ASSET_KIND[o.type]) {
      const rc = region(o.rg)?.color || '#9aa0c8';
      cx.fillStyle = o.type === 'light' ? 'rgba(255,220,120,0.55)' : hex(rc, o.type === 'decor' ? 0.25 : 0.5); cx.fillRect(o.x, o.y, o.w || 1, o.h || 1);
      cx.strokeStyle = on ? '#f2b33d' : o.type === 'light' ? '#ffdc78' : mix(rc, 0.4); cx.lineWidth = (on ? 3 : 1.5) / z;
      if (o.type === 'decor') cx.setLineDash([3 / z, 2 / z]); cx.strokeRect(o.x, o.y, o.w || 1, o.h || 1); cx.setLineDash([]);
      if (z >= 6 || on) { cx.fillStyle = '#fff'; cx.font = `${10 / z}px 'Noto Sans KR'`; cx.fillText(objLabel(o), o.x + 2 / z, o.y + 11 / z); }
    } else {
      const col = o.type === 'gate' ? NEED_COL[o.need || ''] : OBJ[o.type]?.col || '#fff';
      cx.globalAlpha *= ['gate', 'boss'].includes(o.type) ? 0.4 : 0.9; cx.fillStyle = col; cx.fillRect(o.x, o.y, o.w || 1, o.h || 1); cx.globalAlpha = other ? 0.35 : 1;
      cx.strokeStyle = on ? '#f2b33d' : col; cx.lineWidth = (on ? 3 : 1.5) / z; cx.strokeRect(o.x, o.y, o.w || 1, o.h || 1);
      if (z >= 6 || on) { cx.fillStyle = '#fff'; cx.font = `${11 / z}px 'Noto Sans KR'`; cx.fillText(objLabel(o), o.x, o.y - 3 / z); }
    }
    cx.globalAlpha = 1;
  }
  // 타일 범위 선택 · 옮기는 중 미리보기
  if (cellSel) {
    const d = drag?.cells ? [drag.dx, drag.dy] : [0, 0], b = { x: cellSel.x0 + d[0], y: cellSel.y0 + d[1], w: cellSel.x1 - cellSel.x0 + 1, h: cellSel.y1 - cellSel.y0 + 1 };
    if (drag?.cells) { cx.globalAlpha = 0.7; for (const [x, y, v, L] of drag.cells.snap) { if (L === 'area') continue; const ti = tileInfo(v); if (ti) { cx.fillStyle = tileColor(ti, regionAt(x, y)?.color); cx.fillRect(x + d[0], y + d[1], 1, 1); } } cx.globalAlpha = 1; }
    cx.setLineDash([5 / z, 3 / z]); cx.strokeStyle = '#2fe6ff'; cx.lineWidth = 2 / z; cx.strokeRect(b.x, b.y, b.w, b.h); cx.setLineDash([]);
    cx.fillStyle = 'rgba(47,230,255,0.08)'; cx.fillRect(b.x, b.y, b.w, b.h);
  }
  // 지역 통째로 옮기는 중 미리보기
  if (drag?.region) { const b = drag.box0; cx.setLineDash([6 / z, 4 / z]); cx.strokeStyle = region(drag.region)?.color || '#fff'; cx.lineWidth = 3 / z; cx.strokeRect(b.x + drag.dx, b.y + drag.dy, b.w, b.h); cx.setLineDash([]); }
  // 지역 이름 (멀리서)
  if (z < 8) {
    const st = regionStats();
    for (const r of W.regions) { const s = st[r.id]; if (!s) continue; const X = s.sx / s.n, Y = s.sy / s.n; cx.font = `bold ${Math.max(14, 22 * Math.min(1, z / 2)) / z}px 'Noto Sans KR'`; cx.textAlign = 'center'; cx.lineWidth = 4 / z; cx.strokeStyle = '#0b0c14'; cx.strokeText(`${r.id} ${r.name}`, X, Y); cx.fillStyle = mix(r.color, 0.35); cx.fillText(`${r.id} ${r.name}`, X, Y); cx.textAlign = 'left'; }
  }
  // 붓 · 사각형 · 놓기 미리보기
  if (hover && !drag?.cells && !drag?.region) {
    cx.lineWidth = 2 / z; cx.strokeStyle = '#f2b33d';
    if (rectA) { const [x0, y0, x1, y1] = norm(rectA, hover); cx.strokeStyle = '#2fe6ff'; cx.strokeRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1); }
    else if ((mode === 'tile' && isTile(tool)) || (mode === 'region' && tool === 'paint')) { const r = Math.floor(brush / 2); cx.strokeRect(hover[0] - r, hover[1] - r, brush, brush); }
    else if (mode === 'tile' && (OBJ[tool] || assetTool(tool))) { const at = assetTool(tool), a = at && W.assets[at.rg]?.[at.kind]?.[at.n - 1], [w, hh] = a ? [a.w, a.h] : OBJ[tool].size; cx.strokeRect(hover[0], hover[1] - hh + 1, w, hh); }
  }
  if (newBox) { const [x0, y0, x1, y1] = norm(newBox.a, newBox.b); cx.strokeStyle = '#2fe6ff'; cx.lineWidth = 2 / z; cx.setLineDash([6 / z, 4 / z]); cx.strokeRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1); cx.setLineDash([]); }
  $('#zoom').textContent = `×${z >= 1 ? z.toFixed(1) : z.toFixed(2)}`;
  drawMini(); legend();
}
// 범위 사각형 + 손잡이 8개 (끌어서 크기)
function boxWithHandles(b, col, dashed) {
  const z = cam.z, s = 7 / z;
  cx.strokeStyle = col; cx.lineWidth = 2 / z; if (dashed) cx.setLineDash([8 / z, 4 / z]); cx.strokeRect(b.x, b.y, b.w, b.h); cx.setLineDash([]);
  cx.fillStyle = '#0b0c14';
  for (const [hx, hy] of [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]]) { const X = b.x + b.w * hx - s / 2, Y = b.y + b.h * hy - s / 2; cx.fillRect(X, Y, s, s); cx.strokeStyle = col; cx.strokeRect(X, Y, s, s); }
}
function objLabel(o) {
  if (ASSET_KIND[o.type]) return `${o.rg}·${assetOf(o)?.name || ASSET_KIND[o.type].name + ' ' + o.n}`;
  if (o.type === 'foe') return FOES[o.foe] || '적';
  if (o.type === 'boss') return `보스 · ${BOSS_ROLE[o.role]?.split(' ')[0] || ''}`;
  if (o.type === 'gate') return `능력 ${o.need || '?'}`;
  if (o.type === 'sign') return o.text || '안내';
  return OBJ[o.type]?.name || o.type;
}
const norm = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
const objAt = (x, y) => [...W.objects].reverse().find(o => (o.layer || 'main') === activeLayer && x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1)) || [...W.objects].reverse().find(o => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1));
const roomAt = (x, y) => [...W.rooms].reverse().find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
const inBox = (b, x, y) => b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

// ---------- 작은 지도 · 범례 (화면 왼쪽 아래) ----------
const mini = $('#mini'), mx = mini.getContext('2d');
let miniT = 0, miniGeo = null;
function drawMini() {
  if (performance.now() - miniT < 120 && !drag) return; miniT = performance.now();
  const [x0, y0, x1, y1] = worldBounds(), W2 = mini.width, H2 = mini.height, k = Math.min(W2 / (x1 - x0), H2 / (y1 - y0)), ox = (W2 - (x1 - x0) * k) / 2, oy = (H2 - (y1 - y0) * k) / 2;
  miniGeo = { x0, y0, k, ox, oy };
  mx.fillStyle = '#0b0c14'; mx.fillRect(0, 0, W2, H2); mx.imageSmoothingEnabled = true;
  const put = (L, a) => { const S = store(L); mx.globalAlpha = a; for (const key in S) { const [cx0, cy0] = key.split(',').map(Number); mx.drawImage(chunkImg(L, key), ox + (cx0 * CH - x0) * k, oy + (cy0 * CH - y0) * k, CH * k + 0.5, CH * k + 0.5); } mx.globalAlpha = 1; };
  put('area', 1); mx.globalAlpha = 1;
  for (const r of W.regions) { const b = regionBox(r.id); if (!b) continue; mx.fillStyle = hex(r.color, 0.35); mx.fillRect(ox + (b.x - x0) * k, oy + (b.y - y0) * k, b.w * k, b.h * k); }
  for (const l of W.layers) put(l.id, 1);
  for (const l of W.layers) if (l.zone) { mx.strokeStyle = layerColor(l); mx.lineWidth = 1; mx.strokeRect(ox + (l.zone.x - x0) * k, oy + (l.zone.y - y0) * k, l.zone.w * k, l.zone.h * k); }
  const vx0 = -cam.x / cam.z, vy0 = -cam.y / cam.z, vw = cv.width / cam.z, vh = cv.height / cam.z;
  mx.strokeStyle = '#f2b33d'; mx.lineWidth = 1.5; mx.strokeRect(ox + (vx0 - x0) * k, oy + (vy0 - y0) * k, vw * k, vh * k);
}
mini.addEventListener('mousedown', e => {
  const go = ev => { if (!miniGeo) return; const r = mini.getBoundingClientRect(), g = miniGeo, wx = g.x0 + ((ev.clientX - r.left) * mini.width / r.width - g.ox) / g.k, wy = g.y0 + ((ev.clientY - r.top) * mini.height / r.height - g.oy) / g.k; cam.x = cv.width / 2 - wx * cam.z; cam.y = cv.height / 2 - wy * cam.z; draw(); };
  go(e); const mv = ev => go(ev), up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); }; addEventListener('mousemove', mv); addEventListener('mouseup', up);
});
function legend() {
  const el = $('#legend'); if (!el) return;
  const key = mode + '|' + activeLayer + '|' + W.regions.map(r => r.color + r.name).join() + W.layers.length;
  if (el.dataset.k === key) return; el.dataset.k = key;
  el.replaceChildren(
    h('div', { class: 'lg' }, ...W.regions.map(r => h('span', {}, h('i', { class: 'sw', style: `background:${r.color}` }), `${r.id} ${r.name}`))),
    h('div', { class: 'lg' }, h('span', { class: 'hint' }, '통로 능력'), ...Object.entries(NEED).map(([k, n]) => h('span', {}, h('i', { class: 'sw', style: `background:${NEED_COL[k]}` }), k || '없음'))),
    h('div', { class: 'lg' }, h('span', { class: 'hint' }, '편집 레이어'), h('b', { style: `color:${layerColor(layer(activeLayer) || W.layers[0])}` }, layer(activeLayer)?.name || '기본 지형')));
}

// ---------- 입력 ----------
let drag = null, rectA = null, newBox = null, space = false;
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.code === 'Space') { space = true; e.preventDefault(); }
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); return; }
  if (e.code === 'Delete' || e.code === 'Backspace') {
    if (sel?.kind === 'obj') { begin(); W.objects = W.objects.filter(o => o.id !== sel.id); sel = null; end(); panel(); }
    else if (sel?.kind === 'room') { begin(); W.rooms = W.rooms.filter(o => o.id !== sel.id); sel = null; end(); panel(); }
    else if (cellSel) { begin(); for (const L of moveOpt.allLayers ? W.layers.map(l => l.id) : [activeLayer]) for (let y = cellSel.y0; y <= cellSel.y1; y++) for (let x = cellSel.x0; x <= cellSel.x1; x++) set(L, x, y, '.'); end(); toast('범위 안 타일 지움'); }
  }
  if (e.code === 'Escape') { cellSel = null; sel = null; draw(); panel(); }
  if (e.code === 'KeyF') fitSel();
  if (mode === 'tile' && /^[0-5]$/.test(e.key)) { tool = e.key === '0' ? '.' : floorCode(tileRegion, +e.key); panel(); }
  if (e.key === '[') { brush = Math.max(1, brush - 1); panel(); draw(); } if (e.key === ']') { brush = Math.min(40, brush + 1); panel(); draw(); }
});
addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault(); const px = e.offsetX * dpr(), py = e.offsetY * dpr(), z = Math.max(0.15, Math.min(48, cam.z * Math.exp(-e.deltaY * 0.0015)));
  cam.x = px - (px - cam.x) * z / cam.z; cam.y = py - (py - cam.y) * z / cam.z; cam.z = z; draw();
}, { passive: false });
function paint(x, y, L, v) { const r = Math.floor(brush / 2); for (let j = 0; j < brush; j++) for (let i = 0; i < brush; i++) set(L, x - r + i, y - r + j, v); }
// 사각형 손잡이 (화면 7px 안): l/r/t/b
function handleOf(b, px, py) {
  if (!b) return null;
  const m = 7 * dpr() / cam.z, x = (px - cam.x) / cam.z, y = (py - cam.y) / cam.z;
  if (x < b.x - m || x > b.x + b.w + m || y < b.y - m || y > b.y + b.h + m) return null;
  const e = { l: Math.abs(x - b.x) < m, r: Math.abs(x - b.x - b.w) < m, t: Math.abs(y - b.y) < m, b: Math.abs(y - b.y - b.h) < m };
  return e.l || e.r || e.t || e.b ? e : null;
}
const cursorOf = hd => hd ? (hd.l || hd.r ? (hd.t || hd.b ? ((hd.l && hd.t) || (hd.r && hd.b) ? 'nwse-resize' : 'nesw-resize') : 'ew-resize') : 'ns-resize') : null;
function resizeBox(s, hd, dx, dy, min = 2) {
  const q = { ...s };
  if (hd.l) { q.x = Math.min(s.x + dx, s.x + s.w - min); q.w = s.w - (q.x - s.x); } if (hd.r) q.w = Math.max(min, s.w + dx);
  if (hd.t) { q.y = Math.min(s.y + dy, s.y + s.h - min); q.h = s.h - (q.y - s.y); } if (hd.b) q.h = Math.max(min, s.h + dy);
  return q;
}
cv.addEventListener('mousedown', e => {
  const px = e.offsetX * dpr(), py = e.offsetY * dpr(), [x, y] = toCell(px, py);
  if (e.button === 1 || space) { drag = { pan: true, px, py, cx: cam.x, cy: cam.y }; return; }
  if (mode === 'region') {
    // 고른 지역의 범위 손잡이 = 범위 늘리기·줄이기
    const rb = sel?.kind === 'region' && regionBox(sel.id), hd = handleOf(rb, px, py);
    if (hd && tool !== 'paint' && tool !== 'rect') { drag = { rbox: rb, rbox0: rb, hd, x, y, rid: sel.id }; return; }
    if (tool === 'select' || tool === 'move' || e.altKey) {
      const v = get('area', x, y); sel = v === '.' ? null : { kind: 'region', id: +v }; if (sel) curRegion = sel.id; panel();
      if (sel && tool === 'move') drag = { region: sel.id, box0: regionBox(sel.id), x, y, dx: 0, dy: 0 };
      draw(); return;
    }
    begin(); const v = e.button === 2 ? '.' : String(curRegion);
    if (tool === 'rect' || e.shiftKey) { rectA = [x, y]; drag = { rect: 'area', v }; return; }
    paint(x, y, 'area', v); drag = { paint: 'area', v }; draw(); return;
  }
  if (mode === 'pass') {
    const l = curPass && passLayer(curPass), zb = l?.zone, hd = handleOf(zb, px, py);
    if (hd) { begin(); drag = { zone: l, hd, box0: { ...zb }, box: { ...zb }, x, y }; return; }
    if (inBox(zb, x, y)) { begin(); drag = { zone: l, move: true, box0: { ...zb }, box: { ...zb }, x, y }; return; }
    const hit = [...W.layers].reverse().find(q => q.kind === 'pass' && inBox(q.zone, x, y));
    if (hit) { curPass = hit.passage; activeLayer = hit.id; panel(); draw(); return; }
    if (l) { newBox = { a: [x, y], b: [x, y] }; drag = { newZone: l }; return; }
    return;
  }
  if (mode === 'room') {
    if (tool === 'new') { newBox = { a: [x, y], b: [x, y] }; drag = { newRoom: true }; return; }
    const r0 = sel?.kind === 'room' ? W.rooms.find(q => q.id === sel.id) : null, hd = handleOf(r0, px, py);
    if (hd) { begin(); drag = { resize: r0, hd, start: { ...r0 }, x, y }; return; }
    const r = roomAt(x, y); sel = r ? { kind: 'room', id: r.id } : null; panel();
    if (r) { begin(); drag = { move: r, start: { ...r }, x, y, moved: false }; }
    draw(); return;
  }
  // 타일 · 오브젝트
  if (tool === 'cells') {   // 범위 선택 → 안쪽 끌기 = 옮기기
    if (cellSel && x >= cellSel.x0 && x <= cellSel.x1 && y >= cellSel.y0 && y <= cellSel.y1) {
      const Ls = [...(moveOpt.allLayers ? W.layers.map(l => l.id) : [activeLayer]), ...(moveOpt.area ? ['area'] : [])], snap = [];
      for (const L of Ls) for (let yy = cellSel.y0; yy <= cellSel.y1; yy++) for (let xx = cellSel.x0; xx <= cellSel.x1; xx++) { const v = get(L, xx, yy); if (v !== '.') snap.push([xx, yy, v, L]); }
      drag = { cells: { snap, Ls }, x, y, dx: 0, dy: 0 }; return;
    }
    rectA = [x, y]; drag = { pickCells: true }; return;
  }
  if (tool === 'select' || ((OBJ[tool] || assetTool(tool)) && objAt(x, y) && e.button === 0)) {
    const o = objAt(x, y); sel = o ? { kind: 'obj', id: o.id } : null; panel();
    if (o) { begin(); drag = { obj: o, dx: x - o.x, dy: y - o.y }; }
    draw(); return;
  }
  if (assetTool(tool)) {
    if (e.button !== 0) return;
    const at = assetTool(tool), a = W.assets[at.rg][at.kind][at.n - 1];
    begin(); const o = { id: newId('o'), type: at.kind, rg: at.rg, n: at.n, x, y: y - a.h + 1, w: a.w, h: a.h, layer: activeLayer };
    W.objects.push(o); sel = { kind: 'obj', id: o.id }; end(); panel(); return;
  }
  if (OBJ[tool]) {
    if (e.button !== 0) return;
    begin(); const [w, hh] = OBJ[tool].size, o = { id: newId('o'), type: tool, x, y: y - hh + 1, w, h: hh, layer: activeLayer };
    if (tool === 'foe') o.foe = 'crawler'; if (tool === 'boss') { o.role = 'story'; o.bossType = 'box'; } if (tool === 'gate') o.need = 'a'; if (tool === 'sign') o.text = '';
    W.objects.push(o); sel = { kind: 'obj', id: o.id }; end(); panel(); return;
  }
  begin(); const v = e.button === 2 ? '.' : tool;
  if (e.shiftKey) { rectA = [x, y]; drag = { rect: activeLayer, v }; return; }
  paint(x, y, activeLayer, v); drag = { paint: activeLayer, v }; draw();
});
addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * dpr(), py = (e.clientY - r.top) * dpr();
  if (drag?.pan) { cam.x = drag.cx + px - drag.px; cam.y = drag.cy + py - drag.py; draw(); return; }
  if (e.target !== cv && !drag) return;
  const [x, y] = toCell(px, py); hover = [x, y];
  const d = drag;
  if (d?.paint) paint(x, y, d.paint, d.v);
  if (d?.obj) { d.obj.x = x - d.dx; d.obj.y = y - d.dy; }
  if (d?.newRoom || d?.newZone) newBox.b = [x, y];
  if (d?.pickCells) { const [x0, y0, x1, y1] = norm(rectA, [x, y]); cellSel = { x0, y0, x1, y1 }; }
  if (d?.cells || d?.region) { d.dx = x - d.x; d.dy = y - d.y; }
  if (d?.rbox0) d.rbox = resizeBox(d.rbox0, d.hd, x - d.x, y - d.y);
  if (d?.zone) { d.box = d.move ? { ...d.box0, x: d.box0.x + x - d.x, y: d.box0.y + y - d.y } : resizeBox(d.box0, d.hd, x - d.x, y - d.y); d.zone.zone = d.box; }
  if (d?.move) { d.move.x = d.start.x + x - d.x; d.move.y = d.start.y + y - d.y; d.moved = true; }
  if (d?.resize) Object.assign(d.resize, resizeBox(d.start, d.hd, x - d.x, y - d.y, 4));
  if (!d) {   // 손잡이 위에선 크기 바꾸기 화살표
    const box = mode === 'region' && sel?.kind === 'region' && tool !== 'paint' && tool !== 'rect' ? regionBox(sel.id) : mode === 'pass' && curPass ? passLayer(curPass)?.zone : mode === 'room' && sel?.kind === 'room' ? W.rooms.find(q => q.id === sel.id) : null;
    cv.style.cursor = cursorOf(handleOf(box, px, py)) || (mode === 'region' && tool === 'move' ? 'grab' : mode === 'tile' && tool === 'cells' && cellSel && x >= cellSel.x0 && x <= cellSel.x1 && y >= cellSel.y0 && y <= cellSel.y1 ? 'move' : 'crosshair');
  }
  const rg = regionAt(x, y), rm = roomAt(x, y), lz = W.layers.find(l => l.kind === 'pass' && inBox(l.zone, x, y));
  $('#status').replaceChildren(h('span', {}, `칸 (${x}, ${y})`), h('span', {}, `${x * BLOCK}, ${y * BLOCK}px`), h('span', {}, rg ? h('i', { class: 'sw', style: `background:${rg.color}` }) : '', ` 지역 ${rg ? rg.id + ' ' + rg.name : '없음'}`),
    h('span', {}, `방 ${rm ? rm.name : '없음'}`), h('span', {}, `통로 구역 ${lz ? lz.name : '없음'}`), h('span', {}, `편집 레이어: ${layer(activeLayer)?.name}`),
    cellSel ? h('span', {}, `선택 범위 ${cellSel.x1 - cellSel.x0 + 1}×${cellSel.y1 - cellSel.y0 + 1}칸`) : '', mode !== 'room' && mode !== 'pass' ? h('span', {}, `붓 ${brush}칸`) : '');
  draw();
});
addEventListener('mouseup', () => {
  const d = drag; drag = null; if (!d || d.pan) return;
  if (d.rect && rectA && hover) { const [x0, y0, x1, y1] = norm(rectA, hover); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(d.rect, x, y, d.v); }
  if (d.pickCells) { rectA = null; panel(); draw(); return; }
  rectA = null;
  if (d.cells) { if (d.dx || d.dy) { begin(); moveCells(cellSel, d.dx, d.dy, d.cells); cellSel = { x0: cellSel.x0 + d.dx, y0: cellSel.y0 + d.dy, x1: cellSel.x1 + d.dx, y1: cellSel.y1 + d.dy }; end(); toast('옮김'); } draw(); return; }
  if (d.region) { if (d.dx || d.dy) { begin(); moveRegion(d.region, d.dx, d.dy); end(); toast(`지역 ${d.region} 옮김`); panel(); } draw(); return; }
  if (d.rbox0) { const a = d.rbox0, b = d.rbox; if (a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h) { begin(); resizeRegion(d.rid, a, b); end(); panel(); } draw(); return; }
  if (d.zone) { stroke = null; dirty(); panel(); return; }
  if (d.newRoom || d.newZone) {
    const [x0, y0, x1, y1] = norm(newBox.a, newBox.b); newBox = null;
    if (x1 - x0 < 2 || y1 - y0 < 2) { draw(); return; }
    begin();
    if (d.newZone) d.newZone.zone = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    else { const r = { id: newId('r'), name: `방 ${W.rooms.length + 1}`, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; W.rooms.push(r); sel = { kind: 'room', id: r.id }; tool = 'select'; }
    end(); panel(); return;
  }
  if (d.move && d.moved && moveWithContent) moveCells({ x0: d.start.x, y0: d.start.y, x1: d.start.x + d.start.w - 1, y1: d.start.y + d.start.h - 1 }, d.move.x - d.start.x, d.move.y - d.start.y, null, true);
  if (d.move && !d.moved) undoStack.pop();
  stroke = null; dirty(); if (d.obj || d.move || d.resize) panel();
});

// ---------- 옮기기 · 범위 바꾸기 ----------
let moveWithContent = true;
// 범위(칸) 옮기기: snap 이 있으면 그것(타일 범위 선택), 없으면 모든 레이어·지역·오브젝트(방 옮기기)
function moveCells(b, dx, dy, snapInfo, everything = false) {
  if (!dx && !dy) return;
  const Ls = everything ? ['area', ...W.layers.map(l => l.id)] : snapInfo.Ls, cells = [];
  for (const L of Ls) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const v = get(L, x, y); if (v !== '.') cells.push([x, y, v, L]); set(L, x, y, '.'); }
  for (const [x, y, v, L] of cells) set(L, x + dx, y + dy, v);
  if (everything || moveOpt.objects) for (const o of W.objects) if (o.x >= b.x0 && o.x <= b.x1 && o.y >= b.y0 && o.y <= b.y1 && (everything || moveOpt.allLayers || (o.layer || 'main') === activeLayer)) { o.x += dx; o.y += dy; }
}
// 지역 통째로: 그 지역 색 칸 + 그 칸 위의 모든 레이어 타일 + 그 지역 오브젝트 + 그 지역 방
function moveRegion(id, dx, dy) {
  const v = String(id), cells = [], rooms = W.rooms.filter(r => roomRegion(r)?.id === id), objs = W.objects.filter(o => regionAt(o.x, o.y)?.id === id);
  for (const key in W.area) { const [a, b] = key.split(',').map(Number), c = W.area[key]; for (let y = 0; y < CH; y++) { if (!c[y].includes(v)) continue; for (let x = 0; x < CH; x++) if (c[y][x] === v) cells.push([a * CH + x, b * CH + y]); } }
  const tiles = [];
  for (const [x, y] of cells) { for (const l of W.layers) { const t = get(l.id, x, y); if (t !== '.') { tiles.push([x, y, t, l.id]); set(l.id, x, y, '.'); } } set('area', x, y, '.'); }
  for (const [x, y] of cells) set('area', x + dx, y + dy, v);
  for (const [x, y, t, L] of tiles) set(L, x + dx, y + dy, t);
  for (const o of objs) { o.x += dx; o.y += dy; }
  for (const r of rooms) { r.x += dx; r.y += dy; }
}
// 지역 범위 바꾸기: 새 범위로 늘어난 곳의 빈칸은 이 지역으로 칠하고, 새 범위 밖의 이 지역 칸은 비움 (지형은 그대로)
function resizeRegion(id, a, b) {
  const v = String(id);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (!inBox(a, x, y) && get('area', x, y) === '.') set('area', x, y, v);
  for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (!inBox(b, x, y) && get('area', x, y) === v) set('area', x, y, '.');
}
// 통로 레이어 만들기: 두 지역 사이(가운데)에 기본 구역
function makePassLayer(p) {
  const A = regionBox(p.from), B = regionBox(p.to);
  const ca = A ? [A.x + A.w / 2, A.y + A.h / 2] : [0, 0], cb = B ? [B.x + B.w / 2, B.y + B.h / 2] : [40, 0];
  const l = { id: newId('L'), name: `통로 ${p.from}${p.dir === 'two' ? '↔' : '→'}${p.to}`, kind: 'pass', passage: p.id, tiles: {},
    zone: { x: Math.round((ca[0] + cb[0]) / 2 - 12), y: Math.round((ca[1] + cb[1]) / 2 - 8), w: 24, h: 16 } };
  W.layers.push(l); return l;
}

// ---------- 패널 조각: 접히는 카드 · 드롭다운 ----------
function field(label, input) { return h('div', { class: 'row' }, h('label', { class: 'pick' }, h('span', {}, label), input)); }
const bind = (obj, key, cast = v => v) => e => { begin(); obj[key] = cast(e.target.value); end(); panel(); };
const OPEN = JSON.parse(localStorage.getItem('rk_map_cards') || '{}');
function card(id, title, color, body, open = true) {
  const d = h('details', { class: 'card', style: `--cc:${color}`, ...((OPEN[id] ?? open) ? { open: '' } : {}) }, h('summary', {}, title));
  d.addEventListener('toggle', () => { OPEN[id] = d.open; try { localStorage.setItem('rk_map_cards', JSON.stringify(OPEN)); } catch (e) {} });
  d.append(...[body].flat(Infinity).filter(Boolean)); return d;
}
const pick = (label, items, value, on) => h('label', { class: 'pick' }, label ? h('span', {}, label) : '', h('select', { onchange: e => on(e.target.value) }, items.map(([v, n]) => opt(v, n, value))));
const swatch = (col) => h('i', { class: 'sw', style: `background:${col}` });
const brushRow = () => h('div', { class: 'row' }, h('label', { class: 'pick' }, h('span', {}, '붓 크기'), h('input', { type: 'number', min: 1, max: 40, value: brush, onchange: e => { brush = Math.max(1, +e.target.value); draw(); } }), h('span', {}, '칸')), h('span', { class: 'hint' }, '[ ] 로도'));
const chk = (label, on, fn) => h('label', { class: 'pick' }, h('input', { type: 'checkbox', ...(on ? { checked: '' } : {}), onchange: e => fn(e.target.checked) }), h('span', {}, label));
const layerItems = () => W.layers.map(l => [l.id, l.kind === 'main' ? '기본 지형' : `${l.name}${l.zone ? '' : ' (구역 없음)'}`]);

function panel() { const el = $('#side'); el.innerHTML = ''; ({ region: regionPanel, pass: passPanel, room: roomPanel, tile: tilePanel })[mode](el); layersCard(el); checks(el); filePanel(el); toolChip(); legend(); }
function toolChip() {
  const t = $('#toolchip'); if (!t) return;
  let col = '#9aa0c8', txt = '';
  if (mode === 'region') { const r = region(curRegion); col = r?.color || col; txt = `${{ paint: '붓', rect: '사각형', select: '고르기 · 범위', move: '통째로 옮기기' }[tool] || ''} · 지역 ${r ? r.id + ' ' + r.name : ''}`; }
  else if (mode === 'pass') { const l = curPass && passLayer(curPass); col = l ? layerColor(l) : col; txt = curPass ? `${passLabel(passage(curPass))} 구역` : '통로를 고르세요'; }
  else if (mode === 'room') txt = tool === 'new' ? '새 방 그리기' : '방 고르기 · 옮기기';
  else { const at = assetTool(tool), ti = isTile(tool) && tileInfo(tool); if (at) { col = at.kind === 'light' ? '#ffdc78' : region(at.rg)?.color || col; txt = `${at.rg}번 ${W.assets[at.rg][at.kind][at.n - 1].name}`; } else if (OBJ[tool]) { col = OBJ[tool].col; txt = OBJ[tool].name; } else if (ti) { col = tileColor(ti, region(tileRegion)?.color); txt = ti.kind === 'floor' ? `${ti.rg}번 바닥 ${ti.n}` : ti.kind === 'spike' ? `${ti.rg}번 가시 ${ti.n} ${DIRS[ti.d]}` : { plat: '발판', water: '물', lava: '용암' }[ti.kind]; } else if (tool === '.') txt = '지우개'; else if (tool === 'cells') { col = '#2fe6ff'; txt = '범위 선택 · 옮기기'; } else txt = '고르기 · 옮기기'; txt += ` → ${layer(activeLayer)?.name}`; }
  t.replaceChildren(swatch(col), txt);
}
const passLabel = p => p ? `${p.from} ${p.dir === 'two' ? '↔' : '→'} ${p.to}` : '';

function regionPanel(el) {
  const st = regionStats(), r = region(curRegion);
  el.append(card('r-paint', '지역', '#f2b33d', [
    h('div', { class: 'row' }, pick('도구', [['paint', '붓 (칠하기)'], ['rect', '사각형 채우기'], ['select', '고르기 · 범위 조절'], ['move', '통째로 옮기기 (끌기)']], tool, v => { tool = v; panel(); draw(); })),
    tool === 'paint' || tool === 'rect' ? brushRow() : null,
    h('div', { class: 'hint' }, { paint: '왼쪽 = 칠하기 · 오른쪽 = 지우기 · Shift = 사각형', rect: '끌어서 사각형 채우기 · 오른쪽 = 지우기', select: '지역 클릭 = 고르기 → 테두리 손잡이 끌기 = 범위 늘리기·줄이기 (늘어난 빈칸만 칠함, 지형은 그대로)', move: '지역을 끌면 그 지역 칸 · 위의 모든 레이어 지형 · 오브젝트 · 방이 통째로 옮겨짐' }[tool]),
    h('div', { class: 'sub' }, '지역 (누르면 칠할 지역)'),
    W.regions.map(q => h('div', { class: 'item' + (curRegion === q.id ? ' on' : ''), style: `--c:${q.color}`, onclick: () => { curRegion = q.id; sel = { kind: 'region', id: q.id }; panel(); draw(); } },
      swatch(q.color), h('b', {}, `${q.id} ${q.name}`), h('span', { class: 'hint' }, `${q.role || ''} · ${st[q.id] ? `${st[q.id].x1 - st[q.id].x0 + 1}×${st[q.id].y1 - st[q.id].y0 + 1}칸` : '비어 있음'}`))),
    h('div', { class: 'row' }, h('button', { class: 'b', onclick: () => { const id = Math.max(...W.regions.map(q => q.id)) + 1; if (id > 9) return toast('지역은 0~9 까지'); begin(); W.regions.push({ id, name: `지역 ${id}`, role: '', color: '#c8c8c8' }); curRegion = id; ensureAssets(W); end(); panel(); } }, '+ 지역 추가'))]));
  if (r) {
    const b = regionBox(r.id);
    el.append(card('r-edit', `지역 ${r.id} 설정`, r.color, [
      h('div', { class: 'row' }, field('이름', h('input', { type: 'text', value: r.name, onchange: bind(r, 'name') })), h('input', { type: 'color', value: r.color, title: '지역 색', onchange: e => { begin(); r.color = e.target.value; for (const k in cache) dirtyKeys.add(k); end(); panel(); } })),
      field('역할', h('input', { type: 'text', value: r.role || '', onchange: bind(r, 'role') })),
      b ? h('div', { class: 'row' }, h('span', { class: 'hint' }, '범위'), 'x', h('input', { type: 'number', value: b.x, onchange: e => { begin(); resizeRegion(r.id, b, { ...b, x: +e.target.value, w: b.w + b.x - +e.target.value }); end(); panel(); } }),
        'y', h('input', { type: 'number', value: b.y, onchange: e => { begin(); resizeRegion(r.id, b, { ...b, y: +e.target.value, h: b.h + b.y - +e.target.value }); end(); panel(); } }),
        'w', h('input', { type: 'number', value: b.w, onchange: e => { begin(); resizeRegion(r.id, b, { ...b, w: Math.max(2, +e.target.value) }); end(); panel(); } }),
        'h', h('input', { type: 'number', value: b.h, onchange: e => { begin(); resizeRegion(r.id, b, { ...b, h: Math.max(2, +e.target.value) }); end(); panel(); } })) : h('div', { class: 'hint' }, '아직 칠한 칸 없음'),
      b ? h('div', { class: 'row' }, h('span', { class: 'hint' }, '통째로 옮기기'), ...[['←', -5, 0], ['→', 5, 0], ['↑', 0, -5], ['↓', 0, 5]].map(([n, dx, dy]) => h('button', { class: 'mini', title: `${Math.abs(dx || dy)}칸`, onclick: () => { begin(); moveRegion(r.id, dx, dy); end(); panel(); } }, n)), h('span', { class: 'hint' }, '5칸씩')) : null,
      h('div', { class: 'row' }, h('button', { class: 'b', onclick: () => { sel = { kind: 'region', id: r.id }; fitSel(); } }, '이 지역 맞춤'),
        r.id > 5 ? h('button', { class: 'b warn', onclick: () => { if (!confirm('이 지역 칠한 칸도 지울까요?')) return; begin(); for (const k in W.area) { const c = W.area[k]; if (stroke) stroke.chunks['area|' + k] ??= c; W.area[k] = c.map(row => row.replaceAll(String(r.id), '.')); markDirty('area', k); } W.regions = W.regions.filter(q => q !== r); curRegion = 0; areaDirty = true; end(); panel(); } }, '지역 삭제') : null)]));
  }
}
function passPanel(el) {
  const p = curPass && passage(curPass), l = p && passLayer(p.id);
  el.append(card('p-list', '통로 (구조도 연결) — 통로마다 레이어 · 구역', '#2fe6ff', [
    h('div', { class: 'hint' }, '통로 레이어끼리는 화면에서 겹쳐도 지형이 섞이지 않음. 구역 = 그 레이어 지형이 쓰이는 범위 (게임: 구역에 들어가면 그 통로 레이어 지형으로).'),
    W.passages.map(q => { const ql = passLayer(q.id), n = ql ? layerTiles(ql) : 0; return h('div', { class: 'item' + (curPass === q.id ? ' on' : ''), style: `--c:${NEED_COL[q.need || '']}`, onclick: () => { curPass = q.id; const ql2 = passLayer(q.id); if (ql2) { activeLayer = ql2.id; if (ql2.zone) fit(ql2.zone.x - 10, ql2.zone.y - 10, ql2.zone.x + ql2.zone.w + 10, ql2.zone.y + ql2.zone.h + 10); } panel(); draw(); } },
      h('span', { class: ql && n ? 'ok' : ql ? 'hint' : 'miss' }, ql && n ? '●' : ql ? '◐' : '○'), h('b', {}, passLabel(q)), h('span', { class: 'hint' }, `${q.need ? q.need + ' · ' : ''}${KIND[q.kind]}${ql ? ` · ${n}칸` : ' · 레이어 없음'}`)); }),
    h('div', { class: 'hint' }, '● 지형 있음 · ◐ 레이어만 · ○ 없음')]));
  if (!p) return;
  el.append(card('p-sel', `통로 ${passLabel(p)}`, NEED_COL[p.need || ''], [
    h('div', { class: 'row' }, pick('필요 능력', Object.entries(NEED), p.need, v => { begin(); p.need = v; for (const k in cache) dirtyKeys.add(k); end(); panel(); })),
    h('div', { class: 'row' }, pick('방향', [['one', '단방향 →'], ['two', '양방향 ↔']], p.dir, v => { begin(); p.dir = v; end(); panel(); }), pick('표현', Object.entries(KIND), p.kind, v => { begin(); p.kind = v; end(); panel(); })),
    field('메모', h('input', { type: 'text', value: p.note || '', onchange: bind(p, 'note') })),
    !l ? h('div', { class: 'row' }, h('button', { class: 'b on', onclick: () => { begin(); const nl = makePassLayer(p); activeLayer = nl.id; end(); fit(nl.zone.x - 10, nl.zone.y - 10, nl.zone.x + nl.zone.w + 10, nl.zone.y + nl.zone.h + 10); panel(); } }, '+ 통로 레이어 · 구역 만들기')) : [
      h('div', { class: 'sub' }, '구역 (범위)'),
      l.zone ? h('div', { class: 'row' }, 'x', h('input', { type: 'number', value: l.zone.x, onchange: e => { begin(); l.zone.x = +e.target.value; end(); panel(); } }), 'y', h('input', { type: 'number', value: l.zone.y, onchange: e => { begin(); l.zone.y = +e.target.value; end(); panel(); } }),
        'w', h('input', { type: 'number', value: l.zone.w, onchange: e => { begin(); l.zone.w = Math.max(2, +e.target.value); end(); panel(); } }), 'h', h('input', { type: 'number', value: l.zone.h, onchange: e => { begin(); l.zone.h = Math.max(2, +e.target.value); end(); panel(); } })) : h('div', { class: 'hint' }, '화면에서 끌어 구역을 그리세요'),
      h('div', { class: 'hint' }, '화면: 구역 안쪽 끌기 = 옮기기 · 테두리 손잡이 = 크기 · 빈 곳 끌기 = 구역 새로 그리기'),
      h('div', { class: 'row' }, h('button', { class: 'b on', onclick: () => { activeLayer = l.id; setMode('tile'); } }, '이 레이어에 지형 그리기 →'), h('button', { class: 'b', onclick: () => { if (l.zone) fit(l.zone.x - 10, l.zone.y - 10, l.zone.x + l.zone.w + 10, l.zone.y + l.zone.h + 10); } }, '구역 맞춤'),
        h('button', { class: 'b warn', onclick: () => { if (!confirm(`${l.name} 레이어와 그 지형을 지울까요? (되돌리기 가능)`)) return; begin(); for (const k in l.tiles) stroke.chunks[l.id + '|' + k] = l.tiles[k]; W.layers = W.layers.filter(q => q !== l); W.objects = W.objects.filter(o => o.layer !== l.id); activeLayer = 'main'; end(); panel(); } }, '레이어 지우기'))]]));
}
function roomPanel(el) {
  const r = sel?.kind === 'room' && W.rooms.find(q => q.id === sel.id);
  el.append(card('m-tool', '방 (카메라 구역)', '#f2b33d', [
    h('div', { class: 'row' }, pick('도구', [['select', '고르기 · 옮기기 · 크기'], ['new', '새 방 그리기 (끌기)']], tool, v => { tool = v; panel(); })),
    h('div', { class: 'row' }, chk('옮길 때 안의 지형·지역·물건도 같이', moveWithContent, v => moveWithContent = v)),
    h('div', { class: 'hint' }, '테두리 손잡이 = 크기 · 안쪽 끌기 = 옮기기 · Delete = 지우기 · F = 맞춤')]));
  if (r) {
    const rr = roomRegion(r);
    el.append(card('m-sel', `고른 방: ${r.name}`, rr?.color || '#9aa0c8', [
      field('이름', h('input', { type: 'text', value: r.name, onchange: bind(r, 'name') })),
      h('div', { class: 'row' }, 'x', h('input', { type: 'number', value: r.x, onchange: bind(r, 'x', Number) }), 'y', h('input', { type: 'number', value: r.y, onchange: bind(r, 'y', Number) }),
        'w', h('input', { type: 'number', value: r.w, onchange: bind(r, 'w', Number) }), 'h', h('input', { type: 'number', value: r.h, onchange: bind(r, 'h', Number) })),
      h('div', { class: 'row' }, rr ? swatch(rr.color) : null, h('span', { class: 'hint' }, `${r.w * BLOCK}×${r.h * BLOCK}px · 지역 ${rr ? rr.id + ' ' + rr.name : '없음 (지역을 칠해 주세요)'}`)),
      h('div', { class: 'row' }, h('button', { class: 'b', onclick: fitSel }, '맞춤'), h('button', { class: 'b warn', onclick: () => { begin(); W.rooms = W.rooms.filter(q => q !== r); sel = null; end(); panel(); } }, '방 삭제'))]));
  }
  const by = {}; for (const q of W.rooms) (by[roomRegion(q)?.id ?? '-'] ??= []).push(q);
  el.append(card('m-list', `방 목록 — ${W.rooms.length}개`, '#9aa0c8', Object.keys(by).sort().flatMap(k => {
    const g = region(k);
    return [h('div', { class: 'sub', style: `color:${g?.color || '#888'}` }, g ? `${g.id} ${g.name}` : '지역 없음'),
      ...by[k].map(q => h('div', { class: 'item' + (sel?.id === q.id ? ' on' : ''), style: `--c:${g?.color || '#555'}`, onclick: () => { sel = { kind: 'room', id: q.id }; fitSel(); panel(); } }, q.name, h('span', { class: 'hint' }, `${q.w}×${q.h}칸`)))];
  })));
}
// 타일·오브젝트: ‘그릴 것’ = 종류 → 항목 (드롭다운) + 미리보기
const CATS = [['floor', '바닥 타일'], ['spike', '가시 타일'], ['common', '공통 타일 (발판·물·용암·지우개)'], ['prop', '지역 오브젝트'], ['light', '지역 광원'], ['decor', '지역 장식'], ['game', '게임 오브젝트'], ['cells', '범위 선택 · 옮기기'], ['select', '오브젝트 고르기 · 옮기기']];
function catOf(t) {
  if (t === 'select' || t === 'cells') return t;
  const at = assetTool(t); if (at) return at.kind;
  if (OBJ[t]) return 'game';
  const ti = isTile(t) && tileInfo(t);
  if (ti?.kind === 'floor' && ti.rg != null) return 'floor';
  if (ti?.kind === 'spike' && ti.rg != null) return 'spike';
  return 'common';
}
function itemsOf(cat) {
  const A = W.assets[tileRegion];
  if (cat === 'floor') return A.floor.map((f, i) => [floorCode(tileRegion, i + 1), `${i + 1} · ${f.name}`]);
  if (cat === 'spike') return A.spike.map((f, i) => [spikeCode(tileRegion, i + 1, spikeDir), `${i + 1} · ${f.name}`]);
  if (cat === 'common') return [['=', '발판 (아래서 통과)'], ['~', '물'], ['%', '용암'], ['.', '지우개']];
  if (ASSET_KIND[cat]) return A[cat].map((a, i) => [`asset:${cat}:${tileRegion}:${i + 1}`, `${i + 1} · ${a.name} (${a.w}×${a.h}칸)`]);
  if (cat === 'game') return Object.entries(OBJ).map(([k, d]) => [k, d.name]);
  return [[cat, '']];
}
function toolPreview() {
  const c = h('canvas', { width: 120, height: 72, class: 'prev' }), x = c.getContext('2d'), rc = region(tileRegion)?.color || '#9aa0c8';
  x.fillStyle = '#0b0c14'; x.fillRect(0, 0, 120, 72);
  let w = 1, hh = 1, col = '#888', label = '';
  const at = assetTool(tool), ti = isTile(tool) && tileInfo(tool);
  if (at) { const a = W.assets[at.rg][at.kind][at.n - 1]; w = a.w; hh = a.h; col = at.kind === 'light' ? '#ffdc78' : hex(rc, at.kind === 'decor' ? 0.45 : 0.85); label = a.name; }
  else if (OBJ[tool]) { [w, hh] = OBJ[tool].size; col = OBJ[tool].col; label = OBJ[tool].name; }
  else if (ti) { w = 3; hh = 1; col = tileColor(ti, rc); label = ti.kind === 'spike' ? `가시 ${DIRS[ti.d]}` : ''; }
  else if (tool === '.') { col = '#12152b'; label = '지우개'; }
  const s = Math.min(14, 100 / w, 56 / hh), ox = (120 - w * s) / 2, oy = (72 - hh * s) / 2;
  if (at?.kind === 'light') { const a = W.assets[at.rg].light[at.n - 1], g2 = x.createRadialGradient(60, 36, 0, 60, 36, a.r * s); g2.addColorStop(0, 'rgba(255,220,120,0.35)'); g2.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g2; x.fillRect(0, 0, 120, 72); }
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    x.fillStyle = col; const X = ox + i * s, Y = oy + j * s;
    if (ti?.kind === 'spike') { x.beginPath(); if (ti.d === 0) { x.moveTo(X, Y + s); x.lineTo(X + s / 2, Y); x.lineTo(X + s, Y + s); } else if (ti.d === 1) { x.moveTo(X, Y); x.lineTo(X + s / 2, Y + s); x.lineTo(X + s, Y); } else if (ti.d === 3) { x.moveTo(X, Y); x.lineTo(X + s, Y + s / 2); x.lineTo(X, Y + s); } else { x.moveTo(X + s, Y); x.lineTo(X, Y + s / 2); x.lineTo(X + s, Y + s); } x.fill(); }
    else if (ti?.kind === 'plat') x.fillRect(X, Y, s, s * 0.3);
    else x.fillRect(X, Y, s, s);
    x.strokeStyle = 'rgba(255,255,255,0.15)'; x.strokeRect(X + 0.5, Y + 0.5, s - 1, s - 1);
  }
  return h('div', { class: 'row' }, c, h('div', {}, h('b', {}, label || ''), h('div', { class: 'hint' }, at || OBJ[tool] ? `${w}×${hh}칸 · 클릭으로 놓기` : '끌어서 칠하기')));
}
function tilePanel(el) {
  const rc = region(tileRegion)?.color || '#9aa0c8', cat = catOf(tool), regional = ['floor', 'spike', 'prop', 'light', 'decor'].includes(cat);
  el.append(card('t-draw', '그릴 것', '#f2b33d', [
    h('div', { class: 'row' }, pick('레이어', layerItems(), activeLayer, v => { activeLayer = v; panel(); draw(); }), swatch(layerColor(layer(activeLayer)))),
    h('div', { class: 'row' }, pick('종류', CATS, cat, v => { tool = itemsOf(v)[0][0]; panel(); draw(); })),
    regional ? h('div', { class: 'row' }, pick('지역 타일셋', W.regions.map(r => [r.id, `${r.id} ${r.name}`]), tileRegion, v => { tileRegion = +v; const at = assetTool(tool), ti = isTile(tool) && tileInfo(tool); if (at) tool = `asset:${at.kind}:${tileRegion}:${at.n}`; else if (ti?.rg != null) tool = ti.kind === 'floor' ? floorCode(tileRegion, ti.n) : spikeCode(tileRegion, ti.n, ti.d); panel(); }), swatch(rc)) : null,
    !['select', 'cells'].includes(cat) ? h('div', { class: 'row' }, pick('항목', itemsOf(cat), tool, v => { tool = v; panel(); draw(); }),
      cat === 'spike' ? pick('방향', DIRS.map((d, i) => [i, d]), spikeDir, v => { spikeDir = +v; const ti = tileInfo(tool); tool = spikeCode(tileRegion, ti.n, spikeDir); panel(); }) : null) : null,
    cat === 'cells' ? [
      h('div', { class: 'hint' }, '끌어서 범위 고르기 → 범위 안쪽을 끌면 옮김 · Delete = 범위 지우기 · Esc = 선택 풀기'),
      h('div', { class: 'row' }, chk('모든 레이어', moveOpt.allLayers, v => moveOpt.allLayers = v), chk('지역 색도', moveOpt.area, v => moveOpt.area = v), chk('오브젝트도', moveOpt.objects, v => moveOpt.objects = v)),
      cellSel ? h('div', { class: 'row' }, h('span', { class: 'hint' }, `선택 ${cellSel.x1 - cellSel.x0 + 1}×${cellSel.y1 - cellSel.y0 + 1}칸`), ...[['←', -1, 0], ['→', 1, 0], ['↑', 0, -1], ['↓', 0, 1]].map(([n, dx, dy]) => h('button', { class: 'mini', onclick: () => { const Ls = [...(moveOpt.allLayers ? W.layers.map(l => l.id) : [activeLayer]), ...(moveOpt.area ? ['area'] : [])]; begin(); moveCells(cellSel, dx, dy, { Ls }); cellSel = { x0: cellSel.x0 + dx, y0: cellSel.y0 + dy, x1: cellSel.x1 + dx, y1: cellSel.y1 + dy }; end(); } }, n))) : null] : null,
    !['select', 'cells'].includes(cat) ? toolPreview() : null,
    isTile(tool) ? brushRow() : null,
    isTile(tool) ? h('div', { class: 'hint' }, '왼쪽 = 칠하기 · 오른쪽 = 지우기 · Shift 끌기 = 사각형 · 1~5 = 이 타일셋 바닥 · 0 = 지우개') : null]));
  const o = sel?.kind === 'obj' && W.objects.find(x => x.id === sel.id);
  if (o) objForm(el, o);
  const A = W.assets[tileRegion];
  const nm = (a, key = 'name') => h('input', { type: 'text', value: a[key], style: 'width:110px', onchange: e => { begin(); a[key] = e.target.value; end(); panel(); } });
  const sz = (kind, a, i, key) => h('input', { type: 'number', min: 1, max: 40, value: a[key], onchange: e => { begin(); a[key] = Math.max(1, +e.target.value); for (const q of W.objects) if (q.type === kind && q.rg === tileRegion && q.n === i + 1) { q.w = a.w; q.h = a.h; } end(); panel(); } });
  el.append(card('t-def', `리소스 정의 — 지역 ${tileRegion} (이름 · 칸 크기)`, rc, [
    h('div', { class: 'sub' }, '바닥 · 가시'), ...['floor', 'spike'].flatMap(k => A[k].map(a => h('div', { class: 'row' }, nm(a)))),
    ...Object.entries(ASSET_KIND).flatMap(([kind, K]) => [h('div', { class: 'sub' }, K.name), ...A[kind].map((a, i) => h('div', { class: 'row' }, nm(a), 'w', sz(kind, a, i, 'w'), 'h', sz(kind, a, i, 'h'), kind === 'light' ? ['빛', h('input', { type: 'number', min: 1, max: 40, value: a.r, onchange: e => { begin(); a.r = +e.target.value; end(); } })] : null))])], false));
}
function objForm(el, o) {
  const rg = regionAt(o.x, o.y), col = ASSET_KIND[o.type] ? region(o.rg)?.color || '#9aa0c8' : OBJ[o.type]?.col || '#fff';
  el.append(card('t-sel', `고른 것: ${ASSET_KIND[o.type] ? `${o.rg}번 지역 ${assetOf(o)?.name}` : OBJ[o.type]?.name}`, col, [
    h('div', { class: 'hint' }, `놓인 지역: ${rg ? rg.id + ' ' + rg.name : '없음'} · 레이어: ${layer(o.layer || 'main')?.name || '기본 지형'}`),
    h('div', { class: 'row' }, pick('레이어', layerItems(), o.layer || 'main', v => { begin(); o.layer = v; end(); panel(); })),
    ASSET_KIND[o.type] ? h('div', { class: 'row' }, pick('항목', W.assets[o.rg][o.type].map((a, i) => [i + 1, `${i + 1} · ${a.name} (${a.w}×${a.h})`]), o.n, v => { begin(); o.n = +v; const a = assetOf(o); o.w = a.w; o.h = a.h; end(); panel(); })) : null,
    h('div', { class: 'row' }, 'x', h('input', { type: 'number', value: o.x, onchange: bind(o, 'x', Number) }), 'y', h('input', { type: 'number', value: o.y, onchange: bind(o, 'y', Number) }),
      'w', h('input', { type: 'number', value: o.w || 1, onchange: bind(o, 'w', Number) }), 'h', h('input', { type: 'number', value: o.h || 1, onchange: bind(o, 'h', Number) })),
    o.type === 'foe' ? h('div', { class: 'row' }, pick('종류', Object.entries(FOES), o.foe, v => { begin(); o.foe = v; end(); panel(); })) : null,
    o.type === 'boss' ? h('div', { class: 'row' }, pick('역할', Object.entries(BOSS_ROLE), o.role, v => { begin(); o.role = v; end(); panel(); })) : null,
    o.type === 'boss' ? h('div', { class: 'row' }, pick('그레이박스 보스', Object.entries(BOSS_TYPE), o.bossType, v => { begin(); o.bossType = v; end(); panel(); })) : null,
    o.type === 'gate' ? h('div', { class: 'row' }, pick('필요 능력', Object.entries(NEED), o.need, v => { begin(); o.need = v; end(); panel(); })) : null,
    o.type === 'sign' ? field('글', h('input', { type: 'text', value: o.text || '', onchange: bind(o, 'text') })) : null,
    h('div', { class: 'row' }, h('button', { class: 'b', onclick: fitSel }, '맞춤'), h('button', { class: 'b warn', onclick: () => { begin(); W.objects = W.objects.filter(x => x !== o); sel = null; end(); panel(); } }, '지우기'))]));
}
// 레이어 목록 (모든 모드): 보이기 · 편집 레이어 고르기
function layersCard(el) {
  el.append(card('layers', `레이어 ${W.layers.length}개 — 편집: ${layer(activeLayer)?.name}`, layerColor(layer(activeLayer) || W.layers[0]), W.layers.map(l => h('div', { class: 'item' + (l.id === activeLayer ? ' on' : ''), style: `--c:${layerColor(l)}`, onclick: () => { activeLayer = l.id; if (l.passage) curPass = l.passage; panel(); draw(); } },
    h('button', { class: 'mini', title: '보이기 · 숨기기', onclick: e => { e.stopPropagation(); l.hidden = !l.hidden; dirty(); panel(); } }, l.hidden ? '숨김' : '보임'), h('b', {}, l.name), h('span', { class: 'hint' }, `${l.kind === 'main' ? '' : l.zone ? `구역 ${l.zone.w}×${l.zone.h}` : '구역 없음'} · ${layerTiles(l)}칸`))), false));
}
// 검사: 핸드오프 규칙에 비춰 빠진 것
function checks(el) {
  const out = [], inR = (o, id) => regionAt(o.x, o.y)?.id === id, objs = (t, id) => W.objects.filter(o => o.type === t && inR(o, id));
  for (const p of W.passages) { const l = passLayer(p.id); if (!l) out.push(`통로 ${passLabel(p)}: 레이어 없음`); else if (!l.zone) out.push(`통로 ${passLabel(p)}: 구역 없음`); else if (!layerTiles(l)) out.push(`통로 ${passLabel(p)}: 지형 없음`); }
  if (!objs('spawn', 0).length) out.push('지역 0: 시작 지점 없음');
  if (!objs('boss', 0).some(o => o.role === 'start')) out.push('지역 0: 시작 보스 없음');
  for (const id of [1, 2, 3]) { const b = objs('boss', id); if (!b.some(o => o.role === 'story')) out.push(`지역 ${id}: 스토리 보스 자리 없음`); if (!b.some(o => o.role === 'true')) out.push(`지역 ${id}: 진엔딩 보스 자리 없음`); if (!objs('lock', id).length) out.push(`지역 ${id}: 스토리 잠금 문 없음`); }
  for (const id of [4, 5]) if (!objs('boss', id).some(o => o.role === 'normal')) out.push(`지역 ${id}: 노말 엔딩 보스 자리 없음`);
  for (const id of [1, 2, 3, 4, 5]) { const n = objs('collect', id).length; if (n < 2) out.push(`지역 ${id}: 수집품 ${n}개 (탐험 목표 2~3개 권장)`); }
  for (const r of W.rooms) if (!roomRegion(r)) out.push(`방 ${r.name}: 지역이 칠해지지 않음`);
  el.append(card('chk', out.length ? `검사 — 빠진 것 ${out.length}건` : '검사 — 빠진 것 없음', out.length ? '#ff5d73' : '#7ee2a8',
    out.length ? h('div', { class: 'warn-list' }, out.slice(0, 60).map(t => h('div', {}, '· ' + t))) : h('div', { class: 'ok' }, '핸드오프 규칙 기준으로 빠진 것 없음'), false));
}
function filePanel(el) {
  el.append(card('file', '파일', '#5a6396', h('div', { class: 'row' },
    h('button', { class: 'b', onclick: async () => { try { const d = migrate(await (await fetch('../data/world.json', { cache: 'no-store' })).json()); if (!d) return toast('알 수 없는 형식'); W = d; afterLoad(); toast('파일에서 불러옴'); } catch (e) { toast('data/world.json 없음'); } } }, '파일에서 다시 불러오기'),
    h('button', { class: 'b warn', onclick: () => { if (confirm('기본 구조(지역 6 · 사이 간격 · 통로 목록 19)로 새로 시작할까요? 브라우저 편집본이 바뀜')) { W = defaultWorld(); afterLoad(); } } }, '기본 구조로 새로 시작')), false));
}
function afterLoad() { ensureAssets(W); for (const k in cache) delete cache[k]; undoStack.length = 0; areaDirty = true; sel = null; cellSel = null; activeLayer = 'main'; curPass = null; dirty(); panel(); fit(...worldBounds()); }

// ---------- 시작: 브라우저 편집본 → 파일 → 기본 구조 ----------
try { W = migrate(JSON.parse(localStorage.getItem(LS) || localStorage.getItem('rk_world2') || 'null')); } catch (e) {}
if (!W) try { W = migrate(await (await fetch('../data/world.json', { cache: 'no-store' })).json()); } catch (e) {}
if (!W) W = defaultWorld();
ensureAssets(W);
setMode('tile'); resize();
globalThis.__map = { get W() { return W; }, setMode, draw, defaultWorld, get, set, begin, end, fit, cam, moveRegion, resizeRegion, moveCells, makePassLayer, get activeLayer() { return activeLayer; }, set activeLayer(v) { activeLayer = v; } };

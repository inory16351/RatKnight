// HUD · 알림 띠 · 스킬 노드 창 — 게임 캔버스 위에 그림 (HTML 덮개였던 것을 옮김, 사용자 지시 2026-10-29)
// 그림 = art/ui/sheet.png(Codex 팝아트 도시판 8종)을 자른 art/ui/cut/*.png. 그릴 크기로 줄인 뒤 2px 도트로 굽고(dot), 글자는 코드(NeoDGM)로 또렷하게.
// 좌표는 논리 화면(1280×720) 기준 — main 이 view 배율을 걸어 줌
import * as SK from './skills.js';

const IMG = {}, ICON = {}, SLOT = {}, NAMES = ['heart_full', 'heart_empty', 'badge', 'banner', 'xp_frame', 'xp_fill', 'boss_frame', 'boss_fill'];
const FONT = "'NeoDGM', 'Noto Sans KR', sans-serif", TITLE = "'Black Han Sans', 'NeoDGM', sans-serif";
const INK = '#141a3a', YEL = '#ffe14a', PINK = '#ff3d7f', CYAN = '#2fe6ff';
const BAR = {};   // 막대 틀의 안쪽(어두운 홈) 가면: 채움이 이 안에만 그려짐

export async function loadUI(loadImg) {
  for (const n of NAMES) IMG[n] = await loadImg(`../art/ui/cut/${n}.png`);
  for (const id in SK.NODES) ICON[id] = await loadImg(`../art/ui/icons/cut/${id}.png`);   // 노드 아이콘 (art/ui/icons/sheet.png, Codex)
  for (const sh of ['round', 'diamond']) for (const st of ['locked', 'ok', 'learned']) SLOT[`${sh}_${st}`] = await loadImg(`../art/ui/slots/cut/${sh}_${st}.png`);   // 노드 슬롯 (art/ui/slots/sheet.png)
  IMG.face = await loadImg('../art/ui/face/cut/face.png');   // 레벨 배지 안 기사쥐 얼굴 (art/ui/face/face.png)
  if (IMG.xp_frame) BAR.xp_frame = groove(IMG.xp_frame, 0.6, 0.5);
  if (IMG.boss_frame) BAR.boss_frame = groove(IMG.boss_frame, 0.6, 0.5);
  try { await document.fonts.load(`16px NeoDGM`); await document.fonts.load(`16px 'Black Han Sans'`); } catch (e) {}
}
// 틀 안쪽 홈: (fx, fy) 비율 자리에서 어두운 픽셀만 따라 채움 → 노란 테두리에 막힌 안쪽만 남음
function groove(im, fx, fy) {
  const w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const p = x.getImageData(0, 0, w, h).data, dark = j => p[j * 4 + 3] > 128 && p[j * 4] + p[j * 4 + 1] + p[j * 4 + 2] < 260;
  const seen = new Uint8Array(w * h), s0 = Math.round(fy * h) * w + Math.round(fx * w), st = [s0]; seen[s0] = 1;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  while (st.length) {
    const j = st.pop(), X = j % w, Y = (j / w) | 0; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    for (const k of [X > 0 ? j - 1 : -1, X < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && !seen[k] && dark(k)) { seen[k] = 1; st.push(k); }
  }
  const m = x.createImageData(w, h); for (let j = 0; j < w * h; j++) if (seen[j]) m.data[j * 4 + 3] = 255;
  const mc = document.createElement('canvas'); mc.width = w; mc.height = h; mc.getContext('2d').putImageData(m, 0, 0);
  return { mask: mc, box: [x0, y0, x1 + 1, y1 + 1] };
}
// 그릴 크기(w×h, 논리 px)로 줄여 n px 도트로 구움. 같은 크기는 다시 굽지 않음
const DOT = new Map();
function dot(im, w, h, n = 2) {
  const key = `${im.src || im.width}|${w}|${h}|${n}`; if (DOT.has(key)) return DOT.get(key);
  const sw = Math.max(1, Math.round(w / n)), sh = Math.max(1, Math.round(h / n)), c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, sw, sh);
  const d = x.getImageData(0, 0, sw, sh), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 110) { p[i + 3] = 0; continue; } p[i + 3] = 255; for (let k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] / 24) * 24; }
  x.putImageData(d, 0, 0); DOT.set(key, c); return c;
}
function put(c, im, x, y, w, h, n = 2) { if (!im) return; c.imageSmoothingEnabled = false; c.drawImage(dot(im, w, h, n), x, y, w, h); }
// 막대: 틀 → 홈 가면 안에 채움(pct 만큼) → 틀
const BARBUF = new Map();
function bar(c, frame, fill, x, y, w, h, pct) {
  const F = IMG[frame], G = BAR[frame]; if (!F) return;
  put(c, F, x, y, w, h);
  if (!G || !IMG[fill] || pct <= 0) return;
  const k = w / F.width, [bx0, by0, bx1, by1] = G.box, key = `${frame}|${w}|${h}`;
  const tw = Math.round(w / 2), th = Math.round(h / 2);
  if (!BARBUF.has(key)) BARBUF.set(key, Object.assign(document.createElement('canvas'), { width: tw, height: th }));
  const t = BARBUF.get(key);
  const tx = t.getContext('2d'); tx.clearRect(0, 0, tw, th); tx.imageSmoothingEnabled = true;
  const s = tw / F.width;
  tx.drawImage(IMG[fill], bx0 * s, by0 * s, (bx1 - bx0) * s * Math.min(1, pct), (by1 - by0) * s);
  tx.globalCompositeOperation = 'destination-in'; tx.drawImage(G.mask, 0, 0, tw, th); tx.globalCompositeOperation = 'source-over';
  c.imageSmoothingEnabled = false; c.drawImage(t, x, y, w, h);
}
function text(c, s, x, y, size, col, { align = 'left', font = FONT, edge = INK, lw = 4 } = {}) {
  c.font = `${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (edge) { c.lineWidth = lw; c.strokeStyle = edge; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}

// ---------- HUD ----------
// s = { hp, maxHp, lv, xp, xp0, xp1(없으면 MAX), sp, time, boss: { name, pct } | null, banner: { text, a } | null }
export function drawHUD(c, s, W, H) {
  // 레벨 배지 (왼쪽 위) · 하트 · 치즈 막대
  put(c, IMG.badge, 14, 8, 66, 74);
  if (IMG.face) {   // 배지 동그라미 안에 기사쥐 얼굴, 레벨은 아래 꼬리표
    put(c, IMG.face, 25, 33, 44, 44);
    text(c, `LV${s.lv}`, 47, 84, 15, YEL, { align: 'center', lw: 5 });
  } else {
    text(c, 'LV', 47, 50, 13, INK, { edge: null });
    text(c, String(s.lv), 47, 66, 24, '#fff', { edge: INK, lw: 5 });
  }
  for (let i = 0; i < s.maxHp; i++) put(c, IMG[i < s.hp ? 'heart_full' : 'heart_empty'], 86 + i * 34, 14, 34, 26);
  const pct = s.xp1 ? (s.xp - s.xp0) / (s.xp1 - s.xp0) : 1;
  bar(c, 'xp_frame', 'xp_fill', 86, 44, 190, 33, pct);
  text(c, s.xp1 ? `${s.xp} / ${s.xp1}` : 'MAX', 284, 61, 15, '#fff');
  if (s.sp > 0 && Math.floor(s.time * 3) % 2) text(c, `+${s.sp}P`, 47, IMG.face ? 104 : 92, 16, PINK, { align: 'center', edge: '#fff', lw: 4 });
  // 보스 막대 (아래 가운데)
  if (s.boss) {
    const w = 620, h = w * 101 / 597, x = (W - w) / 2, y = H - h - 14;
    text(c, s.boss.name, W / 2, y - 6, 20, YEL, { align: 'center', lw: 5 });
    bar(c, 'boss_frame', 'boss_fill', x, y, w, h, s.boss.pct);
  }
  // 알림 띠
  if (s.banner && s.banner.a > 0 && IMG.banner) {
    c.save(); c.globalAlpha = s.banner.a;
    c.font = `20px ${FONT}`; const tw = c.measureText(s.banner.text).width;
    const w = Math.min(W - 40, tw + 90), h = 64, x = (W - w) / 2, y = H - (s.boss ? 170 : 108);
    put(c, IMG.banner, x, y, w, h);
    text(c, s.banner.text, W / 2 - 4, y + h * 0.43, 20, INK, { align: 'center', edge: null });
    c.restore();
  }
}

// ---------- 스킬 노드 창 ----------
// 판(640×600)은 2px 도트로 그리고 글자는 위에 또렷하게. 판 좌표 = skills.js pos()
const PW = 640, PH = 600;
let panelBuf = null;
export function panelRect(W, H) { const s = Math.min(1, (H - 30) / PH, (W - 30) / PW); return { s, x: (W - PW * s) / 2, y: (H - PH * s) / 2 }; }
export function drawSkills(c, G, U, W, H, time) {
  c.fillStyle = 'rgba(10,8,24,0.72)'; c.fillRect(0, 0, W, H);
  const R = panelRect(W, H);
  c.save(); c.translate(R.x, R.y); c.scale(R.s, R.s);
  // 도형만 반 해상도 판에 그려 2배로 (도트)
  const b = panelBuf || (panelBuf = Object.assign(document.createElement('canvas'), { width: (PW + 16) / 2, height: (PH + 16) / 2 }));
  const x = b.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, b.width, b.height); x.scale(0.5, 0.5);
  x.fillStyle = PINK; x.fillRect(10, 10, PW, PH);                                 // 어긋난 분홍 그림자
  x.fillStyle = '#111'; x.fillRect(0, 0, PW, PH); x.fillStyle = '#1b1838'; x.fillRect(4, 4, PW - 8, PH - 8);
  x.fillStyle = 'rgba(255,255,255,0.08)'; for (let yy = 12; yy < PH; yy += 14) for (let xx = 12 + (yy / 14 % 2) * 7; xx < PW; xx += 14) x.fillRect(xx, yy, 3, 3);   // 망점
  for (const id in SK.NODES) for (const k of SK.NODES[id].links) {
    const [x0, y0] = SK.pos(id), [x1, y1] = SK.pos(k), on = G.skills.has(id) && G.skills.has(k);
    x.strokeStyle = '#111'; x.lineWidth = on ? 13 : 11; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.strokeStyle = on ? YEL : '#4a4570'; x.lineWidth = on ? 7 : 5; x.stroke();
  }
  for (const id in SK.NODES) {
    const n = SK.NODES[id], [nx, ny] = SK.pos(id), st = SK.canLearn(G, id), sel = U.sel === id;
    const bg = st === 'learned' ? YEL : st === 'ok' ? CYAN : '#2b2850';
    const shape = (r, off = 0) => { x.beginPath(); if (n.kind !== 'stat') x.arc(nx + off, ny + off, r, 0, 7); else { x.moveTo(nx + off, ny + off - r * 1.25); x.lineTo(nx + off + r * 1.25, ny + off); x.lineTo(nx + off, ny + off + r * 1.25); x.lineTo(nx + off - r * 1.25, ny + off); x.closePath(); } };
    if (sel) { x.fillStyle = '#fff'; shape(SLOT.round_ok ? 46 : 42); x.fill(); if (SLOT.round_ok) { x.fillStyle = PINK; shape(41); x.fill(); } }   // 고른 노드 = 흰·분홍 테
    if (SLOT.round_ok) continue;   // 슬롯 그림이 있으면 도형 대신 그림 (아래 글자 단계에서)
    x.fillStyle = '#111'; shape(34, 5); x.fill();                                   // 그림자
    x.fillStyle = sel ? PINK : '#111'; shape(34); x.fill();
    x.fillStyle = bg; shape(28); x.fill();
  }
  x.fillStyle = '#111'; x.fillRect(20, PH - 106, PW - 40, 90); x.fillStyle = CYAN; x.fillRect(20, PH - 106, PW - 40, 3); x.fillRect(20, PH - 19, PW - 40, 3); x.fillRect(20, PH - 106, 3, 90); x.fillRect(PW - 23, PH - 106, 3, 90);
  c.imageSmoothingEnabled = false; c.drawImage(b, 0, 0, b.width * 2, b.height * 2);
  // 글자
  text(c, '기사 수련 노드', 22, 36, 30, YEL, { font: TITLE, edge: PINK, lw: 6 });
  text(c, `Lv${G.lv} · 노드 포인트 ${G.sp}`, PW - 22, 36, 16, '#fff', { align: 'right' });
  for (const id in SK.NODES) {
    const n = SK.NODES[id], [nx, ny] = SK.pos(id), st = SK.canLearn(G, id), on = st === 'learned' || st === 'ok';
    const slot = SLOT[`${n.kind === 'stat' ? 'diamond' : 'round'}_${st === 'learned' ? 'learned' : st === 'ok' ? 'ok' : 'locked'}`];
    if (slot) put(c, slot, nx - 44, ny - 44, 88, 88);   // 슬롯 틀 (잠김 · 배울 수 있음 · 배움)
    if (ICON[id]) {   // 아이콘: 배웠거나 배울 수 있으면 제 색, 아니면 잿빛으로 흐리게
      const s = slot ? 50 : 58;
      c.save(); if (!on) { c.filter = 'grayscale(1) brightness(0.7)'; c.globalAlpha = 0.6; }
      put(c, ICON[id], nx - s / 2, ny - s / 2 - 1, s, s); c.restore();
    } else text(c, n.kind === 'act' ? '技' : '+', nx, ny + 1, 20, on ? '#111' : '#8d88b8', { align: 'center', font: TITLE, edge: null });
    text(c, n.name, nx, ny + 52, 13, st === 'learned' ? YEL : '#fff', { align: 'center' });
  }
  const n = SK.NODES[U.sel], st = SK.canLearn(G, U.sel);
  const why = { learned: '배움', ok: 'Z / A / Enter 로 배우기', locked: '이어진 노드를 먼저 배워야 함', level: `Lv${n.lv} 필요`, point: '노드 포인트 부족' }[st];
  text(c, n.name, 36, PH - 86, 17, YEL, { edge: null });
  c.font = `17px ${FONT}`; const nw = c.measureText(n.name).width;
  text(c, `${n.kind === 'act' ? '기술' : n.kind === 'stat' ? '능력치' : ''} · 요구 Lv${n.lv}`, 46 + nw, PH - 86, 13, CYAN, { edge: null });
  text(c, n.desc, 36, PH - 62, 14, '#fff', { edge: null });
  text(c, why, 36, PH - 38, 14, st === 'ok' ? CYAN : '#ff9a1f', { edge: null });
  text(c, '방향키 이동 · Esc / C 닫기', PW - 36, PH - 38, 12, '#8d88b8', { align: 'right', edge: null });
  c.restore();
}
// 창 위 클릭 → 노드 (논리 좌표 lx, ly)
export function nodeAt(lx, ly, W, H) {
  const R = panelRect(W, H), px = (lx - R.x) / R.s, py = (ly - R.y) / R.s;
  for (const id in SK.NODES) { const [nx, ny] = SK.pos(id); if (Math.hypot(px - nx, py - ny) < 40) return id; }
  return null;
}

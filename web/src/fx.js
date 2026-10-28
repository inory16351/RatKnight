// 이펙트: Codex 로 뽑은 이펙트 그림(art/fx/cut/*.png)을 칼 궤적·동작에 맞춰 붙인다.
// ① 칼 궤적 리본: 매 프레임 칼의 손잡이·칼끝(rig.js blade)을 적어 두고, 리본 그림을 그 길을 따라 삼각형으로 휘어 붙임.
//    머리 = 지금 칼끝, 꼬리 = 가장 오래된 자리. 칼이 멈추면 꼬리가 머리 쪽으로 감겨 들어가며 가늘어지고 사라짐.
//    칼이 몸 뒤쪽(먼 쪽)을 지난 구간은 캐릭터 뒤에, 몸 앞을 가로지른 구간은 캐릭터 위에 그림.
// ② 초승달: 막타·공중 베기에서 몸을 가로지르는 납작한 초승달 3프레임(생김 → 최대 → 찢어져 흩어짐)
// ③ 타격: 충격 섬광 · 가로 컷 섬광 · 파편 · 흙먼지
const NAMES = ['trail', 'slices', 'cres_a', 'cres_b', 'cres_c', 'rib_a', 'rib_b', 'rib_c', 'spin_a', 'spin_b', 'spin_c', 'diag_a', 'diag_b', 'ring_a', 'ring_b', 'half_0', 'half_1', 'half_2', 'half_3', 'hit', 'slit', 'dust', 'shard0', 'shard1', 'shard2', 'shard3', 'shard4', 'shard5'];
// 픽셀 팝아트 이펙트 (art/fx/pixel/cut, Codex 시트 fx_pixel_sheet.png): 리본 4단(온전 → 꼬리부터 픽셀 조각으로 부서짐) · 칼끝 반짝 3프레임 · 파편 · 먼지 3프레임 · 속도선
const PX_NAMES = ['rib_0', 'rib_1', 'rib_2', 'rib_3', 'glint_0', 'glint_1', 'glint_2', 'shard0', 'shard1', 'shard2', 'shard3', 'shard4', 'shard5', 'shard6', 'dust_0', 'dust_1', 'dust_2', 'speed'];
export const IMG = {};
// pre = IMG 키 앞에 붙일 말 (픽셀판은 'px_')
export async function loadFx(dir, names = NAMES, pre = '') {
  await Promise.all(names.map(n => new Promise(ok => {
    const im = new Image();
    im.onload = () => { IMG[pre + n] = im; ok(); };
    im.onerror = () => ok();   // 없는 그림은 건너뜀
    im.src = globalThis.__ASSETS?.[`${dir}/${n}.png`] ?? `${dir}/${n}.png`;
  })));
}
export const loadPix = dir => loadFx(dir, PX_NAMES, 'px_');
// 플랫 칼빛 (art/fx/flat/cut, Codex fx_sheet.png): 아주 가는 흰 칼빛 + 산호색·시안 테두리 리본 4단 — 픽셀화는 그릴 때 코드(pixLayer)가 함
export const loadFlat = dir => loadFx(dir, ['rib_0', 'rib_1', 'rib_2', 'rib_3', 'cres_0', 'cres_1', 'cres_2'], 'fl_');
// 굵은 노란 칼빛 (art/fx/bold/cut, Codex fx_yellow.png): 이나리처럼 두껍고 단색에 가까운 띠 — 흰 심 · 노랑 몸통 · 주황 안쪽 · 가는 남색 테두리. 4단으로 꼬리부터 굵은 조각으로 부서짐
export const loadV2 = dir => loadFx(dir, ['rib_0', 'rib_1', 'rib_2', 'rib_3'], 'v2_');
export const loadBold = dir => loadFx(dir, ['rib_0', 'rib_1', 'rib_2', 'rib_3', 'cres_0', 'cres_1', 'cres_2', 'streak', 'star'], 'bd_');
const pxShard = () => IMG['px_shard' + ((Math.random() * 7) | 0)];

// ribbonTex = 칼끝 궤적에 그림 리본을 휘어 붙일지 (끄면 처음 쓰던 납작한 4겹 줄기: 남색 테두리 · 주황 · 노랑 · 흰 심, 꼬리는 바늘처럼) — 사용자 선택(2026-10-28)으로 끔
export const FX = { trails: [], sprites: [], parts: [], texts: [], lines: null, glow: false, ink: false, ribbon: false, mono: null, streaks: [], ribbonTex: false, whiteRed: true };   // whiteRed = 칼빛 흰빛 → 노랑 → 주황으로 바뀜 (끄면 노랑 4겹만)

// ---------- ① 칼 궤적 리본 ----------
// style: thick | thin. life = 꼬리가 다 감겨 사라지는 시간
const TRAIL = { thick: { inner: 0.05, life: 0.15, w: 1 }, thin: { inner: 0.3, life: 0.12, w: 0.75 } };
export function trailStart(id, style = 'thick', tint = null) {
  const s = TRAIL[style] || TRAIL.thick;
  const tr = { id, pts: [], ...s, tint, open: true };
  FX.trails.push(tr);
  return tr;
}
// g, t = 월드 좌표 손잡이·칼끝, front = 몸 앞을 지나는 중인가, now = 시간
export function trailPush(tr, g, t, front, now, dense = false) {
  const last = tr.pts[tr.pts.length - 1];
  if (dense) { tr.pts.push({ g, t, front, at: now }); return; }   // 이미 잘게 쪼개 넘긴 자리
  // 크게 돌았으면 손잡이 둘레 각도로 잘게 나눠 채움 (한 프레임에 반 바퀴씩 돌아도 매끈하게)
  if (last) {
    const a0 = Math.atan2(last.t[1] - last.g[1], last.t[0] - last.g[0]), a1 = Math.atan2(t[1] - g[1], t[0] - g[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const L0 = Math.hypot(last.t[0] - last.g[0], last.t[1] - last.g[1]), L1 = Math.hypot(t[0] - g[0], t[1] - g[1]);
    const n = Math.min(12, Math.floor(Math.abs(da) / 0.18) + Math.floor(Math.hypot(t[0] - last.t[0], t[1] - last.t[1]) / 26));
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1), A = a0 + da * f, L = L0 + (L1 - L0) * f;
      const gx = last.g[0] + (g[0] - last.g[0]) * f, gy = last.g[1] + (g[1] - last.g[1]) * f;
      tr.pts.push({ g: [gx, gy], t: [gx + Math.cos(A) * L, gy + Math.sin(A) * L], front, at: last.at + (now - last.at) * f });
    }
  }
  tr.pts.push({ g, t, front, at: now });
}
export const trailEnd = tr => { if (tr) tr.open = false; };
// 휘두르는 칼끝에서 튀는 작은 파편 (궤적 머리를 따라)
export function tipSpark(x, y, dir) {
  const px = pxShard(), im = px || IMG['shard' + ((Math.random() * 6) | 0)]; if (!im) return;
  const ang = (Math.random() - 0.5) * 1.2 + (dir > 0 ? 0 : Math.PI);
  const sp = 120 + Math.random() * 260;
  // 픽셀 파편은 돌리지 않음 (도트가 뭉개지지 않게 90° 단위로만)
  FX.parts.push({ im, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 80, g: 900, rot: px ? ((Math.random() * 4) | 0) * Math.PI / 2 : Math.random() * 6, vr: px ? 0 : (Math.random() - 0.5) * 20, s: px ? 0.32 + Math.random() * 0.2 : 0.06 + Math.random() * 0.07, t: 0, life: 0.18 + Math.random() * 0.14 });
}
// 칼날 섬광: 같은 시트의 가는 가로 섬광(slit)을 칼끝에 붙여 짧게 맺혔다 사라지게 (도약 준비)
export function edgeGlint(follow, life) {
  if (!IMG.slit) return;
  sprite({ im: IMG.slit, x: 0, y: 0, life, follow, op: 'lighter',
    anim: u => ({ sx: 0.12 + 0.3 * Math.sin(Math.min(1, u * 1.4) * Math.PI), sy: 0.25, a: 1 }) });
}
// 칼끝 반짝: 휘두르는 동안 칼끝에 붙어 다니는 4각 별 (작게 → 크게 번쩍 → 부서짐)
export function tipGlint(follow, life, s = 0.42) {
  const fr = [IMG.px_glint_0, IMG.px_glint_1, IMG.px_glint_2]; if (!fr[1]) return;
  sprite({ frames: fr, x: 0, y: 0, life, follow, pix: true,
    anim: u => { const f = u < 0.2 ? 0 : u < 0.7 ? 1 : 2; return { f, sx: s * (f === 1 ? 1 + 0.15 * Math.sin(u * 40) : 1), sy: s * (f === 1 ? 1 + 0.15 * Math.sin(u * 40) : 1) }; } });
}

// 삼각형 텍스처 매핑: 그림의 (u,v) 세 점을 화면 (x,y) 세 점에 맞춰 그림
function texTri(ctx, im, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
  // 이음매가 안 보이게 삼각형을 무게중심에서 살짝 키워 자름
  const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, g = 0.6;
  const e = (x, y) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / d * g, y + (y - cy) / d * g]; };
  const [X0, Y0] = e(x0, y0), [X1, Y1] = e(x1, y1), [X2, Y2] = e(x2, y2);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.closePath(); ctx.clip();
  const den = u0 * (v2 - v1) - u1 * v2 + u2 * v1 + (u1 - u2) * v0;
  if (Math.abs(den) < 1e-6) { ctx.restore(); return; }
  const a = -(v0 * (x2 - x1) - v1 * x2 + v2 * x1 + (v1 - v2) * x0) / den;
  const b = (v0 * (y2 - y1) - v1 * y2 + v2 * y1 + (v1 - v2) * y0) / den;
  const c = (u0 * (x2 - x1) - u1 * x2 + u2 * x1 + (u1 - u2) * x0) / den;
  const d = (u0 * (y2 - y1) - u1 * y2 + u2 * y1 + (u1 - u2) * y0) / den;
  const ee = (u0 * (v2 * x1 - v1 * x2) + v0 * (u1 * x2 - u2 * x1) + (u2 * v1 - u1 * v2) * x0) / den;
  const f = (u0 * (v2 * y1 - v1 * y2) + v0 * (u1 * y2 - u2 * y1) + (u2 * v1 - u1 * v2) * y0) / den;
  ctx.transform(a, b, c, d, ee, f);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}

// 리본 한 조각: 그림의 [ua..ub] × [0..H] 띠를 네 점(칼끝 a·b, 안쪽 ib·ia)에 붙임.
// 칼끝 a 를 원점으로 가로축 = a→b, 세로축 = a→ia 인 평행사변형으로 그리고 실제 네모 모양으로 잘라 냄
function texQuad(ctx, im, a, b, ib, ia, ua, ub, H) {
  const du = Math.max(0.5, ub - ua);
  const ex = (b[0] - a[0]) / du, ey = (b[1] - a[1]) / du, fx = (ia[0] - a[0]) / H, fy = (ia[1] - a[1]) / H;
  ctx.save();
  // 이음매가 안 보이게 조각을 살짝 키워 자름
  const cx = (a[0] + b[0] + ib[0] + ia[0]) / 4, cy = (a[1] + b[1] + ib[1] + ia[1]) / 4;
  const g = p => { const d = Math.hypot(p[0] - cx, p[1] - cy) || 1; return [p[0] + (p[0] - cx) / d * 0.8, p[1] + (p[1] - cy) / d * 0.8]; };
  ctx.beginPath(); for (const p of [a, b, ib, ia].map(g)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.clip();
  ctx.transform(ex, ey, fx, fy, a[0] - ex * ua, a[1] - ey * ua);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}

// 지금 보이는 리본 조각들 (꼬리는 시간에 따라 머리 쪽으로 감김)
function trailQuads(tr, now) {
  const P = tr.pts;
  if (P.length < 2) return null;
  const head = P[P.length - 1];
  // 칼이 멈춘 뒤엔(닫힘) 머리 시각 기준으로 꼬리가 감김. 휘두르는 중엔 life 보다 오래된 자리만 버림
  const ref = tr.open ? now : Math.max(now, head.at);
  const cut = ref - tr.life;
  let i0 = 0; while (i0 < P.length - 1 && P[i0].at < cut) i0++;
  if (!tr.open && now - head.at > tr.life) return null;
  const vis = P.slice(Math.max(0, i0 - 1));
  if (vis.length < 2) return null;
  // 닫힌 뒤 남은 시간 비율 → 가늘어지고 옅어짐
  const fade = tr.open ? 0 : Math.min(1, (now - head.at) / tr.life);
  return { vis, fade };
}

export function drawTrails(ctx, now, front) {
  const im = IMG.trail; if (!im || !FX.ribbon) return;
  for (const tr of FX.trails) {
    const q = trailQuads(tr, now); if (!q) continue;
    const { vis, fade } = q, n = vis.length - 1;
    // 리본 길이에 따라 u 를 나눔 (칼끝이 지나간 거리 기준 → 빠르게 휘두른 곳이 길게 늘어남)
    const acc = [0];
    for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + Math.hypot(vis[i].t[0] - vis[i - 1].t[0], vis[i].t[1] - vis[i - 1].t[1]));
    const total = acc[n] || 1, W = im.width, H = im.height;
    const inner = tr.inner + (1 - tr.inner) * fade * 0.7;   // 사라질 때 안쪽부터 깎여 칼끝 쪽만 남음
    // 젠존제풍: ① 검은 잉크 판(오른쪽 아래로 어긋남) → ② 빛 번짐 → ③ 본 그림
    const passes = [];
    if (FX.ink) passes.push(['source-over', 'brightness(0)', 0.9 * (1 - fade), [4, 4]]);
    if (FX.glow) passes.push(['lighter', 'blur(6px)', 0.6 * (1 - fade), [0, 0]]);
    // 색 어긋남 (RGB 분리): 시안·자홍 판을 양옆으로 살짝 벌림
    if (FX.ink) { passes.push(['lighter', 'sepia(1) saturate(6) hue-rotate(150deg)', 0.45 * (1 - fade), [-6, -2]]); passes.push(['lighter', 'sepia(1) saturate(6) hue-rotate(280deg)', 0.4 * (1 - fade), [6, 2]]); }
    passes.push(['source-over', 'none', 1 - fade * 0.6, [0, 0]]);
    for (const [op, filter, alpha, off] of passes) {
      ctx.save();
      ctx.translate(off[0], off[1]);
      ctx.globalCompositeOperation = op; ctx.filter = filter; ctx.globalAlpha = Math.max(0, alpha);
      for (let i = 0; i < n; i++) {
        const a = vis[i], b = vis[i + 1];
        if (!!b.front !== front) continue;
        const ua = acc[i] / total * W, ub = acc[i + 1] / total * W;
        const ia = [a.g[0] + (a.t[0] - a.g[0]) * inner, a.g[1] + (a.t[1] - a.g[1]) * inner];
        const ib = [b.g[0] + (b.t[0] - b.g[0]) * inner, b.g[1] + (b.t[1] - b.g[1]) * inner];
        // v: 0 = 바깥(칼끝) · H = 안쪽(손잡이 쪽)
        texQuad(ctx, im, a.t, b.t, ib, ia, ua, ub, H);
      }
      ctx.restore();
    }
    // 바깥 날: 머리 쪽이 굵고 꼬리로 갈수록 가늘어지는 흰 칼선
    ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - fade;
    for (let i = 0; i < n; i++) {
      const a = vis[i], b = vis[i + 1]; if (!!b.front !== front) continue;
      const w0 = 4.5 * (acc[i] / total) * (1 - fade), w1 = 4.5 * (acc[i + 1] / total) * (1 - fade);
      const nx = a.g[0] - a.t[0], ny = a.g[1] - a.t[1], L = Math.hypot(nx, ny) || 1;
      const mx = b.g[0] - b.t[0], my = b.g[1] - b.t[1], M = Math.hypot(mx, my) || 1;
      ctx.beginPath(); ctx.moveTo(a.t[0], a.t[1]); ctx.lineTo(b.t[0], b.t[1]);
      ctx.lineTo(b.t[0] + mx / M * w1, b.t[1] + my / M * w1); ctx.lineTo(a.t[0] + nx / L * w0, a.t[1] + ny / L * w0); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- 순차 프레임 이펙트 (플립북) ----------
// art/fx/seq/<이름>_<번호>.png 를 차례로 넘김. 칼 휘두르는 진행(u 0~1)에 프레임을 맞춰 휘두르는 순간 그려지고, 끝나면 흩어지는 프레임으로.
export const SEQ = {};
export async function loadSeq(dir, names) {
  for (const [n, count] of Object.entries(names)) {
    SEQ[n] = [];
    for (let i = 0; i < count; i++) {
      const im = await new Promise(ok => { const m = new Image(); m.onload = () => ok(m); m.onerror = () => ok(null); m.src = globalThis.__ASSETS?.[`${dir}/${n}_${i}.png`] ?? `${dir}/${n}_${i}.png`; });
      if (im) SEQ[n].push(im);
    }
    if (!SEQ[n].length) delete SEQ[n];
  }
}
// name = 시퀀스, (x,y) = 중심, dir = 보는 쪽, w = 가로 폭(px), cut = 휘두르기가 끝나는 프레임 번호(그 뒤는 흩어짐), dur = 전체 시간
export function flip(name, x, y, dir, w, dur, cut, o = {}) {
  const fr = SEQ[name]; if (!fr) return null;
  const s = { name, frames: fr, x, y, dir, w, dur, cut: cut ?? Math.ceil(fr.length / 2), t: 0, front: o.front ?? true, back: o.back, follow: o.follow, sy: o.sy ?? 1 };
  FX.flips = FX.flips || []; FX.flips.push(s);
  return s;
}
// 가로 베기 호: 초승달 그림 하나를 몸 앞을 가로지르는 납작한 호로 놓고, 칼끝이 지나간 만큼만 드러냄(와이프 인).
// 휘두름이 끝나면 꼬리 쪽부터 칼끝으로 따라 지워짐(와이프 아웃). 그림 가로 = 호 전체(−1~+1, 앞 방향 +).
// o = { im, x, y(호 가운데), w, h, dir, sy, act(휘두르는 시간), dur(전체), range() → [lo, hi] (−1~1) }
export function sweep(o) { FX.sweeps = FX.sweeps || []; FX.sweeps.push({ t: 0, ...o }); }
function drawSweeps(ctx) {
  for (const s of FX.sweeps || []) {
    if (s.t < 0) continue;
    const [lo0, hi] = s.range();
    const k = s.t <= s.act ? 0 : Math.min(1, (s.t - s.act) / (s.dur - s.act));
    const lo = lo0 + (hi - lo0) * k * k;
    if (hi - lo < 0.01) continue;
    const im = s.im, W = s.w, H = s.h;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(s.dir, s.sy);
    ctx.beginPath(); ctx.rect(-W / 2 + (lo + 1) / 2 * W, -H, (hi - lo) / 2 * W, H * 2); ctx.clip();
    ctx.drawImage(im, -W / 2, -H / 2, W, H);
    ctx.restore();
  }
}
// ---------- 칼끝 줄기 (streak) ----------
// 칼끝(머리)이 그림의 뾰족한 앞끝, 꼬리는 휘두른 반대쪽으로 점점 가늘어져 바늘 끝이 되는 그림 한 장.
// 머리 = 지금 칼끝 자리, 방향 = 최근 칼끝 이동 방향, 길이 = 최근 이동 거리에 비례 (빠를수록 길게). 휘두르는 동안 생김→최대, 끝나면 찢어지며 사라짐.
export function streakStart(id) { const s = { id, pts: [], open: true, t: 0, fade: 0 }; FX.streaks.push(s); return s; }
export function streakPush(s, x, y, now, gx, gy, rx, ry) { s.pts.push({ x, y, at: now, gx, gy, rx, ry }); if (s.pts.length > 160) s.pts.shift(); }
export function streakEnd(s) { if (s) s.open = false; }
const STREAK_FADE = 0.4;
function drawStreaks(ctx) {
  // 절차적 궤적: 칼끝이 지나간 자리마다 점을 찍고, 점마다 '나이'로 굵기·길이가 줄어듦 (머리 = 막 지나간 곳 = 가장 굵고, 오래된 꼬리는 가늘어져 바늘 끝으로 사라짐).
  // 그림 한 장이 갑자기 뜨고 지는 게 아니라 칼이 지나가는 만큼 자라고, 다 휘둘러도 스스로 가늘어지며 사라짐.
  // 띠 = 칼끝 길(바깥) → 안쪽 길(칼 쪽 + 아래 섞음) 사이를 4겹 평면색으로 칠함: 남색 테두리 / 주황 / 노랑 / 흰 심 (팝아트 플랫).
  const W = 70, now = FX.now || 0;
  const COL0 = FX.mono ? [[FX.mono, 0, 1]] : RAMP.map((c, i) => [c, [0, 0.07, 0.24, 0.44][i], [1, 0.93, 0.78, 0.6][i]]);   // [색, 바깥쪽 비율, 안쪽 비율] · FX.mono = 단색 하나로
  // 흰색 → 빨강 (이나리처럼): 나타난 순간엔 새하얀 단색 → 분홍·빨강 → 부서질 땐 진한 빨강만 남음
  const WR = [['#7a0f22', 0, 1], ['#ff2e4d', 0.08, 0.92], ['#ffb3bf', 0.3, 0.75], ['#ffffff', 0.45, 0.6]];
  // 사용자 선택(2026-10-28): 색은 노랑으로, 바뀌는 방식은 그대로 — 나타난 순간 새하얀 단색 → 노랑 4겹 → 부서질 땐 주황으로 식음
  const colFor = s => { if (!FX.whiteRed) return COL0; const h = s.open ? 0 : s.fade / 0.25; return h < 0.25 ? [['#ffffff', 0, 1]] : h < 0.6 ? COL0 : [['#a8461a', 0, 1], ['#ff9a1f', 0.15, 0.85]]; };
  for (const s of FX.streaks) {
    const P = s.pts; if (P.length < 2) continue;
    const LIFE = s.span ?? Math.max(0.36, (s.life || 0.15) * 2.6);   // 휘두름 처음부터 끝까지 꼬리가 남도록 (act 보다 길게) · span = 경로 베기의 짧은 수명
    const seg = [];
    for (const p of P) {
      const age = (now - p.at) / LIFE; if (age >= 1 || age < 0) continue;
      let dx = (p.gx ?? p.x) - p.x, dy = (p.gy ?? p.y) - p.y, d = Math.hypot(dx, dy);
      if (d < 8) { dx = 0; dy = 1; d = 1; }
      s.dRef = s.dRef || d; if (d > s.dRef * 1.1) { dx *= s.dRef * 1.1 / d; dy *= s.dRef * 1.1 / d; d = s.dRef * 1.1; }   // 굵기는 시작할 때 칼 길이로 고정 (정면·뒷모습으로 바뀌며 손 자리가 튀어도 갑자기 두꺼워지지 않게)
      // 폭 = 칼 길이의 대부분 (칼에 두껍게 붙어 따라오는 부채꼴) · wFix = 어느 자리든 같은 굵기의 얇은 띠 (수평 회전 베기)
      const width = s.tipAttached ? Math.min(150, d * 0.78) : Math.min(180, Math.max(60, d * 0.95));
      const w = (s.wFix ?? width) * (s.wMul ?? 1) * Math.pow(1 - age, 0.35) * Math.min(1, (p.at - P[0].at) / 0.02 + 0.2);
      seg.push({ x: p.x, y: p.y, vx: dx / d * w, vy: dy / d * w, a: 1 - age * age });
    }
    if (seg.length < 2) continue;
    // 점 위치를 여러 번 평균내 모서리를 둥글게 (칼끝 샘플이 꺾여도 곡선으로)
    for (let pass = 0; pass < 5; pass++) for (let i = 1; i < seg.length - 1; i++) {
      for (const key of s.tipAttached ? ['x', 'y', 'vx', 'vy'] : ['x', 'y']) seg[i][key] = (seg[i - 1][key] + 2 * seg[i][key] + seg[i + 1][key]) / 4;
    }
    // 호 길이(arc length) 기준으로 다시 뽑음: 칼끝이 멈춰 점이 한 자리에 겹쳐도(앞쪽 끝) 굵기 곡선이 길이 위에서 끝까지 이어져
    // 양 끝이 한 점으로 모이며(소실점) 사라짐
    const n1 = seg.length - 1, cum = [0];
    for (let i = 1; i <= n1; i++) cum.push(cum[i - 1] + Math.hypot(seg[i].x - seg[i - 1].x, seg[i].y - seg[i - 1].y));
    const Ltot = cum[n1];
    if (Ltot < 2) continue;
    s.maxL = Math.max(s.maxL || 0, Ltot);
    const shrink = Math.min(1, Ltot / Math.max(1, s.maxL * 0.75));   // 꼬리가 칼끝(머리) 쪽으로 따라붙으며 줄어들 땐 굵기도 같이 가늘어져 점으로 소멸
    const K = s.tipAttached ? 96 : 30, S = [];
    let j = 0;
    for (let k = 0; k <= K; k++) {
      const q = k / K, d = q * Ltot;
      while (j < n1 - 1 && cum[j + 1] < d) j++;
      const a = seg[j], b = seg[j + 1], span = cum[j + 1] - cum[j], u = span > 1e-6 ? Math.max(0, Math.min(1, (d - cum[j]) / span)) : 0;
      const cap = q > 0.92 ? Math.sqrt(Math.max(0, 1 - Math.pow((q - 0.92) / 0.08, 2))) * (s.tipAttached ? 1 : 0.9) + (s.tipAttached ? 0 : 0.1) : 1;   // 3타 머리는 실제 칼끝 한 점으로 매끈하게 닫음
      const prof = Math.pow(q, s.wFix ? 1.7 : 1.1) * cap;   // 칼에 붙는 머리 쪽이 가장 굵고, 꼬리로 갈수록 확 가늘어져 바늘 끝으로 (수평 띠는 더 가파르게)
      const rx = a.vx + (b.vx - a.vx) * u, ry = a.vy + (b.vy - a.vy) * u, rl = Math.hypot(rx, ry) || 1;
      const crest = s.tipAttached ? Math.sin(Math.PI * q) * 30 * shrink : 0;
      S.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - crest, vx: rx * prof * shrink, vy: ry * prof * shrink, nx: rx / rl, ny: ry / rl });
    }
    if (FX.ribbonTex && (IMG.v2_rib_0 || IMG.trail || IMG.bd_rib_0 || IMG.fl_rib_0 || IMG.px_rib_0)) { drawRibbon(ctx, s, S, Ltot, shrink, LIFE); continue; }
    const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
    const edge = (o, rev) => {                    // 한 가장자리 점들(o = 안쪽 비율)
      const E = S.map(p => [p.x + p.vx * o, p.y + p.vy * o]); return rev ? E.reverse() : E;
    };
    ctx.save();
    ctx.lineJoin = 'round';
    for (const [col, o0, o1] of colFor(s)) {
      ctx.fillStyle = col;
      const A = edge(o0, false), B = edge(o1, true), L = A.concat(B);
      ctx.beginPath();
      ctx.moveTo(A[0][0], A[0][1]);
      for (let i = 1; i < A.length - 1; i++) { const m = mid(A[i], A[i + 1]); ctx.quadraticCurveTo(A[i][0], A[i][1], m[0], m[1]); }
      ctx.lineTo(A[A.length - 1][0], A[A.length - 1][1]);
      for (let i = 0; i < B.length - 1; i++) { const m = mid(B[i], B[i + 1]); ctx.quadraticCurveTo(B[i][0], B[i][1], m[0], m[1]); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// 픽셀 리본: 칼끝 길(S, 꼬리 → 머리)을 따라 리본 그림을 조각조각 휘어 붙임. 그림 오른쪽 = 머리(칼끝), 위 = 바깥 칼날(흰 선), 아래 = 안쪽(손잡이 쪽)
// 휘두르는 동안은 온전한 판(rib_0), 휘두름이 끝나면 꼬리부터 픽셀 조각으로 부서지는 판(rib_1 → 2 → 3)으로 넘어가며, 길이도 꼬리부터 먹혀 줄어듦
function drawRibbon(ctx, s, S, Ltot, shrink, LIFE) {
  const st = s.open ? 0 : 1 + Math.min(2, Math.floor(s.fade / (LIFE * 0.55) * 3));
  // 사용자 선택(2026-10-28): 초반 플랫 시트(art/fx/fx_sheet.png)의 뾰족한 화살 줄기 느낌 — 흰 심 · 노랑 · 주황 · 남색 어긋난 테두리. 4단이 있으면(v2_rib_) 꼬리부터 부서짐, 없으면 한 장(trail)
  const v2 = !!(IMG.v2_rib_0 || IMG.trail);
  const bold = !v2 && !!IMG.bd_rib_0, flat = v2 || bold || !!IMG.fl_rib_0, pre = v2 ? 'v2_rib_' : bold ? 'bd_rib_' : flat ? 'fl_rib_' : 'px_rib_';
  const im = (v2 && !IMG.v2_rib_0) ? IMG.trail : (IMG[pre + st] || IMG[pre + 0]), W = im.width, H = im.height, n = S.length - 1;
  // 플랫 칼빛은 면도날처럼 가늘게 (그림 자체가 머리 쪽으로 휘어 올라가며 굵어짐)
  const wd = (v2 ? Math.min(130, Math.max(56, Ltot * 0.32)) : bold ? Math.min(110, Math.max(50, Ltot * 0.28)) : flat ? Math.min(120, Math.max(56, Ltot * 0.32)) : Math.min(100, Math.max(48, Ltot * 0.24))) * (0.4 + 0.6 * shrink);   // 도트로 구워도 칼빛이 사라지지 않게 넉넉히
  // 칼끝 선을 그림 윗변 가까이에 맞춤 (픽셀판은 머리 갈고리가 솟아 있어 30% 아래)
  const o = v2 ? 0.5 : bold ? 0.2 : flat ? 0.12 : 0.3;   // 화살 줄기는 가운데 선이 칼끝 길 (가시가 양쪽으로)
  const out = p => [p.x - p.nx * wd * o, p.y - p.ny * wd * o], inn = p => [p.x + p.nx * wd * (1 - o), p.y + p.ny * wd * (1 - o)];
  s.S = S; s.wd = wd;   // 빛 번짐(drawGlow)이 같은 길을 씀
  ctx.save(); ctx.imageSmoothingEnabled = !flat;
  if (v2) {   // 색이 식어 감: 휘두르는 중 = 흰빛 → 끝난 직후 = 본색(노랑) → 부서질수록 주황·빨강으로 타들어 감
    const heat = s.open ? 0 : Math.min(1, s.fade / (LIFE * 0.7));
    ctx.filter = s.open ? 'brightness(1.6) saturate(0.35)' : heat < 0.3 ? 'none' : `hue-rotate(${-Math.round((heat - 0.3) / 0.7 * 40)}deg) saturate(${1 + heat})`;
  }
  for (let k = 0; k < n; k++) texQuad(ctx, im, out(S[k]), out(S[k + 1]), inn(S[k + 1]), inn(S[k]), k / n * W, (k + 1) / n * W, H);
  ctx.restore();
}

// ---------- 빛 번짐 (벡터) ----------
// 픽셀 리본 위에 매끈한 빛을 얹어 강조: 리본 모양 그대로 흐리게 번진 따뜻한 빛 + 바깥 칼날을 따라 가는 흰 빛줄기 + 칼끝 빛망울.
// 리본을 그릴 때 남겨 둔 칼끝 길(s.S)과 폭(s.wd)을 씀. 휘두름이 끝나면 빠르게 꺼짐
const GLOW_OUT = 0.12;
export function drawGlow(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of FX.streaks) {
    const S = s.S; if (!S || S.length < 2) continue;
    const a = s.open ? 1 : Math.max(0, 1 - s.fade / GLOW_OUT);
    if (a <= 0) continue;
    const n = S.length - 1, wd = s.wd;
    // 리본 띠 (꼬리 쪽은 가늘게)
    const band = (o0, o1) => {
      ctx.beginPath();
      for (let k = 0; k <= n; k++) { const p = S[k], t = Math.pow(k / n, 0.7); ctx.lineTo(p.x + p.nx * wd * o0 * t, p.y + p.ny * wd * o0 * t); }
      for (let k = n; k >= 0; k--) { const p = S[k], t = Math.pow(k / n, 0.7); ctx.lineTo(p.x + p.nx * wd * o1 * t, p.y + p.ny * wd * o1 * t); }
      ctx.closePath(); ctx.fill();
    };
    ctx.filter = 'blur(10px)'; ctx.fillStyle = `rgba(255,190,60,${0.2 * a})`; band(-0.3, 0.7);
    ctx.filter = 'blur(4px)'; ctx.fillStyle = `rgba(255,240,170,${0.22 * a})`; band(-0.15, 0.25);
    ctx.filter = 'blur(1.5px)'; ctx.fillStyle = `rgba(255,255,240,${0.6 * a})`; band(-0.05, 0.06);
    // 칼끝 빛망울 (휘두르는 동안)
    if (s.open) {
      const p = S[n], r = wd * 0.55, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,255,235,0.5)'); g.addColorStop(0.3, 'rgba(255,210,110,0.2)'); g.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.filter = 'none'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// 회전 베기(막타): 몸 둘레를 도는 납작한 소용돌이 3프레임 (캐릭터를 따라다님)
const HALF = {};
export function spinFx(x, y, dir, w, o = {}) {
  if (o.half && IMG.half_0) {   // 반원 수평 베기 전용 그림 4프레임 (왼쪽 끝 = 몸 중심, 오른쪽 = 전방)
    const hf = [IMG.half_0, IMG.half_1, IMG.half_2, IMG.half_3], base = w / hf[2].width;
    sprite({
      frames: hf, x, y, rot: Math.PI / 2 - 0.32 * dir, life: o.life ?? 0.34, front: true, follow: o.follow, halfImg: true,
      // 90° 눕혀 바닥과 나란한 납작한 반원(웃는 입 ⌣)으로: 그림 가로(x)가 세로로 눌려 납작해지고 그림 세로(y)가 전방 폭이 됨
      anim: u => { const f = u < 0.14 ? 0 : u < 0.34 ? 1 : u < 0.62 ? 2 : 3; return { f, sx: base * (0.42 + 0.1 * Math.min(1, u / 0.5)) * (f === 0 ? 0.8 : 1), sy: base * (0.85 + 0.2 * Math.min(1, u / 0.5)), a: f === 3 ? 1 - (u - 0.62) / 0.38 : 1 }; },
    });
    return;
  }
  const frames = [IMG.spin_a, IMG.spin_b, IMG.spin_c].filter(Boolean); if (!frames.length) return;
  const base = w / frames[1 % frames.length].width;
  sprite({
    frames, x, y, life: o.life ?? 0.34, front: true, flip: dir < 0, follow: o.follow, half: o.half, heat: o.heat,
    // heat: 다른 칼빛처럼 처음부터 고리 전체(가운데 그림)가 새하얗게 번쩍 나타났다가(크기도 바로 최대) 노랑 → 부서짐
    anim: u => { const f = o.heat ? (u < 0.62 ? 1 : 2) : u < 0.22 ? 0 : u < 0.62 ? 1 : 2; const grow = o.heat ? 1.1 : 0.8 + 0.3 * Math.min(1, u / 0.4); return { f, sx: base * grow, sy: base * (f === 1 ? 0.95 : 0.85), a: f === 2 ? 1 - (u - 0.62) / 0.38 : 1 }; },
  });
}

// 언더월드 pixfx rampOf: 기본색 하나에서 4단(어둠·본색·밝음·흰 심지)을 뽑음 — 단색으로 뽑은 뒤 밝기 단계로 노란 계열 도트로 다듬는 방식
const mixC = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rampOf = col => { const n = parseInt(col.replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return [mixC(c, [16, 10, 20], 0.55), c, mixC(c, [255, 255, 255], 0.45), mixC(c, [255, 255, 255], 0.82)].map(a => `rgb(${a[0]},${a[1]},${a[2]})`); };
const RAMP = rampOf('#ffd23a');
export function drawFlips(ctx, front) {
  if (front) drawStreaks(ctx);
  if (front) drawSweeps(ctx);
  for (const s of FX.flips || []) {
    const u = Math.min(0.999, s.t / s.dur);
    const i = Math.min(s.frames.length - 1, Math.floor(u * s.frames.length));
    const im = s.frames[i], k = s.w / im.width;
    // 몸 뒤쪽 판(back)이 있으면 뒤 판은 캐릭터 뒤, 본 판은 앞
    const pick = front ? im : s.back?.[i];
    if (!pick) continue;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(s.dir * k, k * s.sy);
    ctx.drawImage(pick, -pick.width / 2, -pick.height / 2);
    ctx.restore();
  }
}

// ---------- ②③ 그림 이펙트 ----------
// s = { im|frames, x, y, rot, sx, sy, life, t, front, op, anim(u)→{sx,sy,a,dx,dy} }
export function sprite(o) { FX.sprites.push({ t: 0, rot: 0, sx: 1, sy: 1, a: 1, front: true, op: 'source-over', ...o }); }

// 막타·공중 베기: 몸을 가로지르는 초승달. dir = 보는 쪽, w = 가로 폭(px)
export function crescent(x, y, dir, w, tilt = 0, o = {}) {
  const frames = [IMG.cres_a, IMG.cres_b, IMG.cres_c].filter(Boolean);
  if (!frames.length) return;
  const base = w / frames[1 % frames.length].width;
  sprite({
    frames, x, y, rot: tilt * dir, life: o.life ?? 0.26, front: true, flip: dir < 0, follow: o.follow, vflip: o.vflip,
    anim: u => {
      const f = u < 0.12 ? 0 : u < 0.42 ? 1 : 2;                                   // 생김 → 최대 → 찢어짐
      const sx = base * (0.75 + 0.35 * Math.min(1, u / 0.3)) * (f === 2 ? 1.08 : 1);
      const sy = base * (f === 0 ? 0.55 : f === 1 ? 0.62 : 0.5 - 0.25 * (u - 0.42));  // 납작하게: 몸을 가로지르는 수평
      return { f, sx, sy, a: f === 2 ? 1 - (u - 0.42) / 0.58 : 1, dx: dir * 30 * u };
    },
  });
}

// 타격 (이나리처럼): 적을 베고 나간 반대쪽에서 충격 섬광이 터지고, 베기 방향으로 가로 컷 + 빛줄기·파편이 뻗어 나감
// (x, y) = 적 반대쪽 터지는 자리 · up = 베기 방향이 위로 향한 각도(도) (올려 치면 비스듬히 위로 터짐)
export function hitBurst(x, y, dir, big = false, up = 0) {
  const k = big ? 2.2 : 1.5, th = dir > 0 ? -up * Math.PI / 180 : Math.PI + up * Math.PI / 180;   // 터져 나가는 방향
  const cx = Math.cos(th), cy = Math.sin(th);
  if (SEQ.hit) flip('hit', x, y, dir, (big ? 300 : 210), big ? 0.3 : 0.22);
  else if (IMG.hit) sprite({ im: IMG.hit, x, y, rot: (Math.random() - 0.5) * 0.6, life: 0.16, op: 'source-over',
    anim: u => { const z = (0.14 + 0.1 * Math.min(1, u / 0.2)) * k * (1 - 0.25 * u); return { sx: z, sy: z, a: u < 0.4 ? 1 : 1 - (u - 0.4) / 0.6 }; } });
  if (IMG.slit) sprite({ im: IMG.slit, x, y, rot: th, life: big ? 0.3 : 0.2, op: 'lighter',
    anim: u => ({ sx: (0.2 + 0.6 * Math.min(1, u / 0.15)) * k, sy: 0.32 * (1 - u) + 0.04, a: 1 - u * u, dx: cx * 50 * u, dy: cy * 50 * u }) });
  const sp = IMG.bd_streak || IMG.slit;   // 베기 방향으로 쭉 뻗는 빛줄기 (적 반대쪽으로 튀어 나감)
  if (sp) for (let i = 0; i < (big ? 8 : 5); i++) {
    const a = th + (Math.random() - 0.5) * 0.8, dist = (90 + Math.random() * 170) * (big ? 1.3 : 1), sc = (0.2 + Math.random() * 0.2) * (big ? 1.3 : 1);
    sprite({ im: sp, x, y, rot: a, life: 0.16 + Math.random() * 0.1, op: 'lighter',
      anim: u => { const e = 1 - (1 - u) ** 3; return { sx: sc * (1 - u * 0.6), sy: sc * 0.22 * (1 - u), a: 1 - u * u, dx: Math.cos(a) * dist * e, dy: Math.sin(a) * dist * e }; } });
  }
  const n = big ? 9 : 5;
  for (let i = 0; i < n; i++) {
    const im = IMG['shard' + (i % 6)]; if (!im) continue;
    const ang = th + (Math.random() - 0.5) * 1.6 - 0.35 * dir;
    const sp = 380 + Math.random() * 520;
    FX.parts.push({ im, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 160, g: 1600, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 30, s: 0.1 + Math.random() * 0.1, t: 0, life: 0.28 + Math.random() * 0.2 });
  }
}

// 기 모으기: 둘레에서 빛줄기가 (x, y) 로 빨려 들어옴 (도약 준비)
export function chargeIn(x, y) {
  const sp = IMG.bd_streak || IMG.slit; if (!sp) return;
  const a = Math.random() * Math.PI * 2, R = 80 + Math.random() * 70, ca = Math.cos(a), sa = Math.sin(a);
  sprite({ im: sp, x: x + ca * R, y: y + sa * R, rot: a, life: 0.2, op: 'lighter',
    anim: u => { const e = u * u; return { dx: -ca * R * e, dy: -sa * R * e, sx: 0.13 * (1 - u * 0.5), sy: 0.06 * (1 - u), a: Math.min(1, u * 4) * (1 - u) }; } });
}

// 효과음 글자 (만화식): 굵은 글씨 + 검은 테두리 + 어긋난 색판. 튀어나왔다 살짝 커지며 사라짐
export function sfx(text, x, y, dir, big = false) {
  FX.texts.push({ text, x: x + dir * 10, y, rot: (-0.18 + Math.random() * 0.1) * dir, s: big ? 1.6 : 1, t: 0, life: big ? 0.55 : 0.38 });
}
function drawTexts(ctx) {
  for (const q of FX.texts) {
    const u = q.t / q.life;
    const pop = u < 0.12 ? 0.4 + (u / 0.12) * 0.8 : 1.2 - 0.2 * Math.min(1, (u - 0.12) / 0.2) + u * 0.08;
    ctx.save();
    ctx.translate(q.x, q.y - u * 10); ctx.rotate(q.rot); ctx.scale(q.s * pop, q.s * pop);
    ctx.globalAlpha = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
    ctx.font = "58px 'NeoDGM', 'Noto Sans KR', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9; ctx.strokeStyle = '#111'; ctx.strokeText(q.text, 3, 3);
    ctx.fillStyle = '#ff3d7f'; ctx.fillText(q.text, 3, 3);            // 어긋난 색판 (자홍)
    ctx.strokeText(q.text, 0, 0);
    ctx.fillStyle = '#ffe14a'; ctx.fillText(q.text, 0, 0);           // 본 글자 (노랑)
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeText(q.text, -1, -1);
    ctx.restore();
  }
}

// ---------- 데미지 숫자 (팝아트) ----------
// 숫자 글꼴 = art/ui/digits/cut/0~9.png (Codex: 흰 채움 + 굵은 검은 외곽). 그림이 없으면 같은 모양을 글꼴로 구워 대신 씀.
// 색은 코드로: 흰 채움만 그 색으로 물들이고 밝은 망점을 얹음, 외곽은 검정 유지. 뒤에 어긋난 색판(인쇄 어긋남) 한 장.
const DIGITS = [], TINT = {}, NUMS = [];
export const DMG_STYLE = {   // [채움, 어긋난 색판]
  normal: ['#ffe14a', '#ff3d7f'],
  crit: ['#ff3d7f', '#2fe6ff'],   // 빈틈(2배) 피해
  fin: ['#ff9a1f', '#5b3dff'],    // 막타
  boss: ['#b8ff3c', '#ff3d7f'],
};
export async function loadDigits(dir) {
  const load = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
  for (let i = 0; i < 10; i++) {
    const im = await load(`${dir}/${i}.png`);
    DIGITS[i] = im ? toCanvas(im, 150) : fontDigit(i);
  }
}
function toCanvas(im, H) {   // 높이 H 로 맞춰 둠 (모든 숫자 같은 높이)
  const k = H / im.height, c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = H;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, H); return c;
}
function fontDigit(i) {
  const c = document.createElement('canvas'); c.width = 120; c.height = 150;
  const x = c.getContext('2d'); x.translate(60, 80); x.transform(1, 0, -0.12, 1, 0, 0);
  x.font = "130px 'Black Han Sans', 'Noto Sans KR', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 20; x.strokeStyle = '#000'; x.strokeText(String(i), 0, 0); x.fillStyle = '#fff'; x.fillText(String(i), 0, 0);
  return c;
}
function tinted(i, col, plate = false) {
  const key = i + col + plate; if (TINT[key]) return TINT[key];
  const src = DIGITS[i]; if (!src) return null;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, n = parseInt(col.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let k = 0; k < p.length; k += 4) {
    if (p[k + 3] < 128) { p[k + 3] = 0; continue; }
    p[k + 3] = 255;
    if (plate) { p[k] = rgb[0]; p[k + 1] = rgb[1]; p[k + 2] = rgb[2]; continue; }
    if (p[k] + p[k + 1] + p[k + 2] < 330) { p[k] = p[k + 1] = p[k + 2] = 17; continue; }   // 외곽
    const px = (k / 4) % c.width, py = (k / 4 / c.width) | 0, D = 11;
    const u = (px + py) / Math.SQRT2 / D, v = (px - py) / Math.SQRT2 / D, dot = Math.hypot(u - Math.round(u), v - Math.round(v)) < 0.22 && py < c.height * 0.55;   // 위쪽 절반에 밝은 망점
    for (let j = 0; j < 3; j++) p[k + j] = dot ? rgb[j] + (255 - rgb[j]) * 0.6 : rgb[j];
  }
  x.putImageData(d, 0, 0);
  return (TINT[key] = c);
}
// 피해 숫자 띄우기: 숫자마다 조금씩 늦게 튀어나와 통통 튐 → 위로 떠오르며 사라짐
export function damage(v, x, y, kind = 'normal') {
  const big = kind === 'crit' || kind === 'fin';
  NUMS.push({ s: String(Math.max(0, Math.round(v))), x, y, kind, t: 0, life: big ? 0.95 : 0.75, h: big ? 62 : 46, rot: (Math.random() - 0.5) * 0.24, vx: (Math.random() - 0.5) * 50 });
}
function drawNums(ctx) {
  for (const q of NUMS) {
    const [fill, plate] = DMG_STYLE[q.kind] || DMG_STYLE.normal, u = q.t / q.life;
    const ws = [...q.s].map(ch => { const im = DIGITS[+ch]; return im ? im.width / im.height * q.h * 0.74 : 0; });
    let x = -ws.reduce((a, b) => a + b, 0) / 2;
    ctx.save(); ctx.translate(q.x, q.y - 46 * Math.min(1, u * 1.6) - u * 14); ctx.rotate(q.rot);
    ctx.globalAlpha = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1;
    [...q.s].forEach((ch, i) => {
      const lt = q.t - i * 0.045; if (lt < 0) { x += ws[i]; return; }
      const im = DIGITS[+ch], a = tinted(+ch, fill), b = tinted(+ch, plate, true); if (!im) return;
      const pop = lt < 0.08 ? 0.3 + lt / 0.08 * 1.1 : lt < 0.18 ? 1.4 - (lt - 0.08) / 0.1 * 0.4 : 1;   // 튀어나옴 → 살짝 넘침 → 제자리
      const w = im.width / im.height * q.h, cx = x + ws[i] / 2, by = -Math.max(0, Math.sin(Math.min(1, lt / 0.22) * Math.PI)) * 8;
      ctx.save(); ctx.translate(cx, by); ctx.scale(pop, pop); ctx.rotate((i % 2 ? 1 : -1) * 0.06);
      ctx.drawImage(b, -w / 2 + 4, -q.h / 2 + 4, w, q.h);   // 어긋난 색판
      ctx.drawImage(a, -w / 2, -q.h / 2, w, q.h);
      ctx.restore();
      x += ws[i];
    });
    ctx.restore();
  }
}

// 집중선 (막타 임팩트 컷): 화면 가장자리에서 중심으로 몰리는 검은 쐐기 + 망점 테두리. 화면 좌표로 그림
export function focusLines(cx, cy, life = 0.28) { FX.lines = { cx, cy, t: 0, life, seed: Math.random() * 1000 }; }
export function drawFocus(ctx, w, h) {
  const L = FX.lines; if (!L) return;
  const u = L.t / L.life;
  ctx.save();
  ctx.globalAlpha = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
  const R = Math.hypot(w, h);
  let r = L.seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  ctx.fillStyle = '#0d0b18';
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, wd = 0.006 + rnd() * 0.02, inner = (0.32 + rnd() * 0.25 + u * 0.08) * Math.min(w, h);
    ctx.beginPath();
    ctx.moveTo(L.cx + Math.cos(a) * inner, L.cy + Math.sin(a) * inner);
    ctx.lineTo(L.cx + Math.cos(a - wd) * R, L.cy + Math.sin(a - wd) * R);
    ctx.lineTo(L.cx + Math.cos(a + wd) * R, L.cy + Math.sin(a + wd) * R);
    ctx.fill();
  }
  // 망점 테두리: 화면 가장자리로 갈수록 큰 점
  ctx.fillStyle = 'rgba(255,61,127,0.55)';
  const D = Math.max(10, Math.round(w / 90));
  for (let y = D / 2; y < h; y += D) for (let x = D / 2; x < w; x += D) {
    const e = Math.max(Math.abs(x - w / 2) / (w / 2), Math.abs(y - h / 2) / (h / 2));
    if (e < 0.72) continue;
    ctx.beginPath(); ctx.arc(x, y, D * 0.5 * Math.min(1, (e - 0.72) / 0.28), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 흙먼지: 발밑에서 dir 반대쪽으로
export function dust(x, y, dir, s = 1) {
  if (IMG.px_dust_0) {   // 픽셀 먼지 3프레임 (뭉게 → 작아짐 → 흩어짐), 그림은 왼쪽으로 쓸려 있음 → dir 반대쪽으로 쓸리게 뒤집음
    sprite({ frames: [IMG.px_dust_0, IMG.px_dust_1, IMG.px_dust_2], x: x - dir * 10, y, life: 0.34, front: false, flip: dir < 0, oy: 1, pix: true,
      anim: u => ({ f: u < 0.35 ? 0 : u < 0.7 ? 1 : 2, sx: 0.36 * s, sy: 0.36 * s, dx: -dir * 36 * u * s, dy: -4 * u }) });
    return;
  }
  if (!IMG.dust) return;
  sprite({ im: IMG.dust, x: x - dir * 10, y, rot: 0, life: 0.32, front: false, flip: dir > 0, oy: 1,
    anim: u => ({ sx: 0.22 * s * (0.6 + u * 0.7), sy: 0.22 * s * (0.6 + u * 0.5), a: 1 - u, dx: -dir * 40 * u * s, dy: -6 * u }) });
}

// 대시 속도선
export function speedSlices(x, y, dir) {
  if (!IMG.slices) return;
  sprite({ im: IMG.slices, x: x - dir * 50, y, life: 0.16, front: false, flip: dir < 0, op: 'lighter',
    anim: u => ({ sx: 0.38 * (1 + u * 0.5), sy: 0.3, a: 0.8 * (1 - u), dx: -dir * 60 * u }) });
}

export function update(dt, now) {
  FX.now = now;
  for (const s of FX.flips || []) { s.t += dt; if (s.follow) { const p = s.follow(s); s.x = p[0]; s.y = p[1]; } }
  FX.flips = (FX.flips || []).filter(s => s.t < s.dur);
  for (const s of FX.streaks) { s.t += dt; if (!s.open) s.fade += dt; }
  FX.streaks = FX.streaks.filter(s => s.open || (s.pts.length && now - s.pts[s.pts.length - 1].at < 0.4));
  for (const s of FX.sweeps || []) s.t += dt;
  FX.sweeps = (FX.sweeps || []).filter(s => s.t < s.dur);
  for (const q of FX.texts) q.t += dt;
  FX.texts = FX.texts.filter(q => q.t < q.life);
  for (const q of NUMS) { q.t += dt; q.x += q.vx * dt; }
  NUMS.splice(0, NUMS.length, ...NUMS.filter(q => q.t < q.life));
  if (FX.lines && (FX.lines.t += dt) > FX.lines.life) FX.lines = null;
  FX.trails = FX.trails.filter(tr => tr.open || (tr.pts.length && now - tr.pts[tr.pts.length - 1].at < tr.life + 0.02));
  for (const s of FX.sprites) { s.t += dt; if (s.follow) { const p = s.follow(); s.x = p[0]; s.y = p[1]; } }
  FX.sprites = FX.sprites.filter(s => s.t < s.life);
  for (const p of FX.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.96; }
  FX.parts = FX.parts.filter(p => p.t < p.life);
}

export function drawSprites(ctx, front) {
  for (const s of FX.sprites) {
    if (!!s.front !== front) continue;
    const u = Math.min(1, s.t / s.life), A = s.anim ? s.anim(u) : {};
    const im = s.frames ? s.frames[Math.min(s.frames.length - 1, A.f ?? 0)] : s.im;
    if (!im) continue;
    const sx = A.sx ?? s.sx, sy = A.sy ?? s.sy;
    ctx.save();
    if (s.pix) ctx.imageSmoothingEnabled = false;   // 픽셀 그림은 도트 그대로
    // heat = 칼빛 줄기와 같은 색 흐름: 나타날 때 새하얀 단색 → 본색(노랑) → 사라지며 주황으로 식음
    if (s.heat) ctx.filter = u < 0.18 ? 'brightness(0) invert(1)' : u > 0.6 ? 'hue-rotate(-22deg) saturate(1.6) brightness(0.9)' : 'none';
    ctx.globalCompositeOperation = s.op;
    ctx.globalAlpha = Math.max(0, A.a ?? 1);
    ctx.translate(s.x + (A.dx || 0), s.y + (A.dy || 0));
    ctx.rotate(s.rot);
    ctx.scale(s.flip ? -sx : sx, s.vflip ? -sy : sy);
    if (s.halfImg) ctx.drawImage(im, -im.width / 2, -im.height / 2);   // 전용 반원 그림 (눕혀서 그림)
    else if (s.half) {   // 회전 이펙트의 앞쪽 절반만 (중심에서 전방으로). 잘린 가장자리는 부드럽게 사라지게 마스크
      const hw = Math.round(im.width / 2), key = im.src;
      HALF[key] = HALF[key] || (() => {
        const c = document.createElement('canvas'); c.width = hw; c.height = im.height;
        const x = c.getContext('2d'); x.translate(hw, 0); x.scale(-1, 1); x.drawImage(im, 0, 0, hw, im.height, 0, 0, hw, im.height);   // 왼쪽 절반을 좌우 반전 → 몸 중심에서 전방으로 뻗음
        x.setTransform(1, 0, 0, 1, 0, 0);
        const g = x.createLinearGradient(0, 0, hw * 0.45, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, hw, im.height);
        return c;
      })();
      ctx.drawImage(HALF[key], 0, -im.height / 2);
    }
    else ctx.drawImage(im, -im.width / 2, s.oy ? -im.height : -im.height / 2);
    ctx.restore();
  }
  if (!front) return;
  drawTexts(ctx);
  drawNums(ctx);
  for (const p of FX.parts) {
    const u = p.t / p.life;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1 - u * u;
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.s * (1 - u * 0.5), p.s * (1 - u * 0.5));
    ctx.drawImage(p.im, -p.im.width / 2, -p.im.height / 2);
    ctx.restore();
  }
}




// ---------- 칼 쓸림 (smear, 언더월드 방식) ----------
// 휘두르는 동안 칼(손잡이~칼끝)의 자리를 계속 적어 두고, 이어진 두 자리 사이를 칼 각도로 잘게 나눠 칼날이 쓸고 간 부채꼴을 도트로 칠함.
// 칼끝 쪽이 희고 뜨겁고(흰 → 노랑 → 주황), 안쪽·오래된 쪽부터 체크무늬로 사라지며 마지막은 남색.
const SM = { life: 0.19, inner: 0.6, cols: ['#fff6dc', '#ffd23a', '#ff9a1f', '#1e2c66'] };
export function smearPush(arr, id, g, t, now) { arr.push({ id, g, t, at: now }); }
export function drawSmear(ctx, S, now, dot = 2) {
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i];
    if (a.id !== b.id) continue;
    const age = (now - b.at) / SM.life; if (age >= 1 || age < 0) continue;
    const a0 = Math.atan2(a.t[1] - a.g[1], a.t[0] - a.g[0]), a1 = Math.atan2(b.t[1] - b.g[1], b.t[0] - b.g[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const L0 = Math.hypot(a.t[0] - a.g[0], a.t[1] - a.g[1]), L1 = Math.hypot(b.t[0] - b.g[0], b.t[1] - b.g[1]);
    const n = Math.max(2, Math.ceil(Math.abs(da) * Math.max(L0, L1) / (dot * 0.6)));
    for (let j = 0; j <= n; j++) {
      const f = j / n, ang = a0 + da * f, L = L0 + (L1 - L0) * f;
      const gx = a.g[0] + (b.g[0] - a.g[0]) * f, gy = a.g[1] + (b.g[1] - a.g[1]) * f;
      const k = Math.min(1, age + (1 - f) * 0.5);
      const r0 = L * (SM.inner + (1 - SM.inner) * k * 0.8);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let r = r0; r <= L + 0.5; r += dot * 0.7) {
        const u = (r - r0) / Math.max(1, L - r0);
        const X = Math.round((gx + ca * r) / dot) * dot, Y = Math.round((gy + sa * r) / dot) * dot;
        if (k > 0.55 && ((X + Y) / dot) & 1) continue;
        ctx.fillStyle = SM.cols[u > 0.85 && k < 0.5 ? 0 : u > 0.6 ? 1 : u > 0.3 ? 2 : 3];
        ctx.fillRect(X, Y, dot, dot);
      }
    }
  }
}
export function smearPrune(S, now) { while (S.length && now - S[0].at > SM.life + 0.05) S.shift(); }

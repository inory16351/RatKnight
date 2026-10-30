// 컷아웃 리그 (옆모습 전용). 구조는 언더월드 프로토 rig.js 를 따름: 부위 PNG 를 뼈 각도대로 쌓아 그린다.
// 각도는 도(deg). 팔다리는 0 = 아래로 늘어짐, + = 보는 쪽(앞)으로 돌아감. 몸통·머리는 + = 앞으로 숙임.
// art/knight/rig.json: { scale, parts: { 이름: { file, pivot:[x,y], joints:{...} } } }  (좌표 = 부위 그림 px)
import { bakePart, variantFor, SHADE } from './shade.js';

export const SS = 2;   // 부위를 화면 크기의 SS 배로 미리 줄여 둠 (확대·줌에서도 선명하게)

const R = d => -d * Math.PI / 180;

const IMG_CACHE = new Map();   // 리그를 다시 만들 때(편집 도구) 같은 그림을 또 받지 않게
function loadImage(src) {
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);
  const p = new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error('이미지 로드 실패 ' + src));
    im.src = globalThis.__ASSETS?.[src] ?? src;
  });
  IMG_CACHE.set(src, p); p.catch(() => IMG_CACHE.delete(src));
  return p;
}
// 리그 덮어쓰기(patch, 캐릭터 테스트 도구의 리깅 편집): { scale, neckDrop, order, parts: { 이름: { pivot, joints: {관절: [x,y]}, file, adj: { dx, dy, rot, sc } } } }
// file 이 'art/' 로 시작하면 프로젝트 기준 경로(바꾼 그림), 아니면 리그 폴더 안 파일
// 좌우 분리: 원본 rig.json 은 가까운/먼(정면은 왼/오른) 팔다리가 한 부위 정의를 같이 씀 → 같은 그림으로 따로 된 부위를 만들어 따로 고칠 수 있게
export const ALIAS = { side: { upperArmF: 'upperArm', foreArmF: 'foreArm', thighF: 'thigh', shinF: 'shin' }, front: { upperArmR: 'upperArm', thighR: 'thigh', shinR: 'shin' } };
export const rigKind = def => def.parts.sword ? 'side' : 'front';
export function withAliases(base) {
  const def = structuredClone(base);
  for (const [a, src] of Object.entries(ALIAS[rigKind(def)])) if (!def.parts[a] && def.parts[src]) def.parts[a] = structuredClone(def.parts[src]);
  return def;
}
// 부모·자식 계층 (FK): parent = 붙는 부위 · joint = 부모의 어느 관절에 붙는지 · ang = 이 부위를 돌리는 자세 값(anim.js 자세) · side = 가까운(n)/먼(f)/가운데(c)
export const HIER = {
  side: {
    hips: { parent: null, ang: null, side: 'c', name: '엉덩이 (뿌리)' },
    torso: { parent: 'hips', joint: 'waist', ang: 'torso', side: 'c', name: '몸통' },
    head: { parent: 'torso', joint: 'neck', ang: 'head', side: 'c', name: '머리' },
    cape: { parent: 'torso', joint: 'cape', ang: 'cape', side: 'c', name: '망토 위' },
    capeB: { parent: 'cape', joint: 'next', ang: null, side: 'c', name: '망토 가운데' },
    capeC: { parent: 'capeB', joint: 'next', ang: null, side: 'c', name: '망토 아래' },
    tail: { parent: 'hips', joint: 'tail', ang: 'tail', side: 'c', name: '꼬리' },
    upperArm: { parent: 'torso', joint: 'shoulderN', ang: 'nU', side: 'n', name: '가까운 위팔 (칼 팔)' },
    foreArm: { parent: 'upperArm', joint: 'elbow', ang: 'nF', side: 'n', name: '가까운 아래팔' },
    sword: { parent: 'foreArm', joint: 'hand', ang: 'sw', side: 'n', name: '칼' },
    upperArmF: { parent: 'torso', joint: 'shoulderF', ang: 'fU', side: 'f', name: '먼 위팔 (빈 팔)' },
    foreArmF: { parent: 'upperArmF', joint: 'elbow', ang: 'fF', side: 'f', name: '먼 아래팔' },
    thigh: { parent: 'hips', joint: 'hipN', ang: 'nT', side: 'n', name: '가까운 허벅지' },
    shin: { parent: 'thigh', joint: 'knee', ang: 'nS', side: 'n', name: '가까운 정강이' },
    thighF: { parent: 'hips', joint: 'hipF', ang: 'fT', side: 'f', name: '먼 허벅지' },
    shinF: { parent: 'thighF', joint: 'knee', ang: 'fS', side: 'f', name: '먼 정강이' },
  },
  front: {
    hips: { parent: null, side: 'c', name: '엉덩이 (뿌리)' },
    torso: { parent: 'hips', joint: 'waist', side: 'c', name: '몸통' },
    head: { parent: 'torso', joint: 'neck', side: 'c', name: '머리' },
    headBack: { parent: 'torso', joint: 'neck', side: 'c', name: '뒷머리' },
    cape: { parent: 'torso', joint: 'cape', side: 'c', name: '망토' },
    tail: { parent: 'hips', joint: 'tail', side: 'c', name: '꼬리' },
    upperArm: { parent: 'torso', joint: 'shoulderL', side: 'n', name: '왼 위팔 (칼 팔)' },
    foreArm: { parent: 'upperArm', joint: 'elbow', side: 'n', name: '왼 아래팔' },
    upperArmR: { parent: 'torso', joint: 'shoulderR', side: 'f', name: '오른 위팔' },
    handOpen: { parent: 'upperArmR', joint: 'elbow', side: 'f', name: '오른 아래팔·손' },
    thigh: { parent: 'hips', joint: 'hipL', side: 'n', name: '왼 허벅지' },
    shin: { parent: 'thigh', joint: 'knee', side: 'n', name: '왼 정강이' },
    thighR: { parent: 'hips', joint: 'hipR', side: 'f', name: '오른 허벅지' },
    shinR: { parent: 'thighR', joint: 'knee', side: 'f', name: '오른 정강이' },
  },
};
export const childrenOf = (kind, part, joint) => Object.keys(HIER[kind]).filter(k => HIER[kind][k].parent === part && (!joint || HIER[kind][k].joint === joint));
export function patchDef(base, patch = {}) {
  const def = withAliases(base);
  for (const k of ['scale', 'neckDrop', 'order']) if (patch[k] != null) def[k] = structuredClone(patch[k]);
  for (const [name, q] of Object.entries(patch.parts || {})) {
    const a = def.parts[name]; if (!a) continue;
    if (q.pivot) a.pivot = [...q.pivot];
    if (q.file) a.file = q.file;
    if (q.adj) a.adj = { ...q.adj };
    for (const [j, v] of Object.entries(q.joints || {})) a.joints = { ...a.joints, [j]: [...v] };
  }
  return def;
}

// 큰 원본을 반씩 줄여 목표 크기로 (한 번에 줄이면 계단이 생김)
function downscale(img, w, h) {
  let cur = img, cw = img.width, ch = img.height;
  while (cw / 2 > w && ch / 2 > h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw / 2); c.height = Math.ceil(ch / 2);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, c.width, c.height);
    cur = c; cw = c.width; ch = c.height;
  }
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high';
  x.drawImage(cur, 0, 0, c.width, c.height);
  return c;
}

function tint(c, rgba) {
  const d = document.createElement('canvas'); d.width = c.width; d.height = c.height;
  const x = d.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba; x.fillRect(0, 0, d.width, d.height);
  return d;
}

const DEF_CACHE = {};
export async function loadRig(dir, patch) {
  const raw = DEF_CACHE[dir] ??= await (await fetch(`${dir}/rig.json`, { cache: 'no-store' })).json();
  const def = patchDef(raw, patch), base = withAliases(raw);
  const K = def.scale * SS;
  const P = { def, base, K, kind: rigKind(def) };
  await Promise.all(Object.entries(def.parts).map(async ([name, a]) => {
    const img = await loadImage(a.file.startsWith('art/') ? `${dir.split('/art/')[0]}/${a.file}` : `${dir}/${a.file}`);
    const c = downscale(img, img.width * K, img.height * K);
    const j = {};
    for (const k in a.joints || {}) j[k] = [(a.joints[k][0] - a.pivot[0]) * K, (a.joints[k][1] - a.pivot[1]) * K];
    P[name] = { name, img: c, px: a.pivot[0] * K, py: a.pivot[1] * K, j, w: c.width, h: c.height, z: a.z, adj: a.adj, K };
  }));
  rebake(P);
  // 엉덩이 높이 = 허벅지(엉덩이→무릎) + 정강이(무릎→발바닥) 세로 길이
  P.hipH = (P.thigh.j.knee[1] + P.shin.j.sole[1] + (P.hips.j.hipN?.[1] ?? 0)) / SS;
  return P;
}

// 셰이더 값을 바꾸면 다시 굽기
export function rebake(P) {
  for (const k in P) {
    const p = P[k]; if (!p?.img) continue;
    p.lit = bakePart(p.img);
    p.farLit = p.lit.map(c => tint(c, 'rgba(30,26,70,0.28)'));   // 먼 쪽 팔다리 = 조금 어둡게
    p.farFlat = tint(p.img, 'rgba(30,26,70,0.28)');
    p.white = tint(p.img, '#ffffff');                              // 피격 번쩍
    p.ghost = tint(p.img, 'rgb(70,110,230)');                      // 대시 잔상 (남색)
  }
}

// 칼: 마지막으로 그린 칼의 손잡이·칼끝 (월드 px). 칼끝 잔상이 이걸 따라감
export const blade = { grip: null, tip: null };
export const sockets = {};

export function tipOf(p) {
  if (p.tip) return p.tip;
  const c = p.img, d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  let best = 0, tip = [0, -p.h];
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
    if (d[(y * c.width + x) * 4 + 3] < 128) continue;
    const dd = (x - p.px) ** 2 + (y - p.py) ** 2;
    if (dd > best) { best = dd; tip = [x - p.px, y - p.py]; }
  }
  return (p.tip = tip);
}
const xf = (m, q) => [m.a * q[0] + m.c * q[1] + m.e, m.b * q[0] + m.d * q[1] + m.f];

// 그리지 않고 칼 손잡이·칼끝의 월드 자리만 계산 (drawRig 와 같은 변환 순서). 칼 궤적을 프레임 사이 자세로 잘게 채울 때 씀
export function bladeAt(P, pose, ax, ay, facing) {
  const m = new DOMMatrix();
  m.translateSelf(ax, ay).scaleSelf(facing, 1);
  if (pose.rot) m.translateSelf(0, -P.hipH * 0.6).rotateSelf(pose.rot).translateSelf(0, P.hipH * 0.6);
  m.translateSelf(pose.x, pose.y);
  if (pose.sq) m.scaleSelf(1 + pose.sq * 0.5, 1 - pose.sq);
  m.scaleSelf(1 / SS, 1 / SS).translateSelf(0, -P.hipH * SS);
  m.translateSelf(...P.hips.j.waist).rotateSelf(pose.torso);
  m.translateSelf(...P.torso.j.shoulderN);
  const s = m.transformPoint(new DOMPoint(0, 0));   // 어깨 (경로 베기에서 팔을 겨눌 때 씀)
  m.rotateSelf(-pose.nU);
  m.translateSelf(...P.upperArm.j.elbow).rotateSelf(-pose.nF);
  m.translateSelf(...P.foreArm.j.hand).rotateSelf(-pose.sw).scaleSelf(1, pose.swL);
  const g = m.transformPoint(new DOMPoint(0, 0)), t = m.transformPoint(new DOMPoint(...tipOf(P.sword)));
  return { g: [g.x, g.y], t: [t.x, t.y], s: [s.x, s.y] };
}

// 리그 덮어쓰기 adj 위에 프레임별 adj 를 더함 (옮기기·각도는 더하고 배율은 곱함)
const mergeAdj = (a, b) => !b ? a : !a ? b : { dx: (a.dx || 0) + (b.dx || 0), dy: (a.dy || 0) + (b.dy || 0), rot: (a.rot || 0) + (b.rot || 0), sc: (a.sc || 1) * (b.sc || 1) };

// 빛이 오는 쪽 (화면 기준): 왼쪽 위 앞
export const LIGHT = { ang: Math.atan2(-0.85, -0.5) };

export const ZERO = { x: 0, y: 0, rot: 0, torso: 0, head: 0, nU: 0, nF: 0, fU: 0, fF: 0, sw: 0, swL: 1, swBack: 0, sheath: 0, nT: 0, nS: 0, fT: 0, fS: 0, cape: 0, tail: 0, sq: 0 };
export const lerpPose = (a, b, t) => { const o = {}; for (const k in ZERO) o[k] = (a[k] ?? ZERO[k]) + ((b[k] ?? ZERO[k]) - (a[k] ?? ZERO[k])) * t; return o; };

// ctx 는 월드 좌표(1 = 화면 px) 변환이 걸린 상태. (ax, ay) = 발 기준점, facing 1 오른쪽 / -1 왼쪽
// opt.flash = 0~1 흰색 번쩍, opt.ghost = 잔상용(명암 없이 단색)
export const SHEATH = { ang: 160, dx: -10, dy: -20 };   // 자루는 목 뒤, 칼날은 등을 따라 비스듬히 (몸에 붙어 보이게)   // 등에 꽂은 칼: 몸통 기준 각도·자리(부위 그림 px)
export function drawRig(ctx, P, pose, ax, ay, facing, opt = {}) {
  blade.grip = blade.tip = null;
  const S = 1 / SS;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.scale(facing, 1);
  // 쓰러지기·회전: 엉덩이 높이 축
  if (pose.rot) { ctx.translate(0, -P.hipH * 0.6); ctx.rotate(R(-pose.rot)); ctx.translate(0, P.hipH * 0.6); }
  ctx.translate(pose.x, pose.y);
  // 눌림·늘어남: 발 기준
  if (pose.sq) ctx.scale(1 + pose.sq * 0.5, 1 - pose.sq);
  ctx.scale(S, S);
  ctx.translate(0, -P.hipH * SS);

  const put = (p, far) => {
    if (opt.capture) opt.capture.push({ p, far, m: ctx.getTransform() });   // 본·관절 보기: 부위 축 자리의 변환 기록 (캐릭터 테스트 도구)
    const a = mergeAdj(p.adj, opt.adj?.[p.name]); if (a) { ctx.save(); ctx.translate((a.dx || 0) * p.K, (a.dy || 0) * p.K); ctx.rotate(R(-(a.rot || 0))); ctx.scale(a.sc || 1, a.sc || 1); }   // 부위 그림만 옮기기·돌리기·키우기 (리그 덮어쓰기 + 프레임별)
    if (opt.ghost) { ctx.globalAlpha = opt.ghost; ctx.drawImage(p.ghost, -p.px, -p.py); ctx.globalAlpha = 1; }
    else {
      const im = SHADE.on ? (far ? p.farLit : p.lit)[variantFor(ctx, LIGHT.ang)] : (far ? p.farFlat : p.img);
      ctx.drawImage(im, -p.px, -p.py);
      if (opt.flash) { ctx.globalAlpha = opt.flash; ctx.drawImage(p.white, -p.px, -p.py); ctx.globalAlpha = 1; }
    }
    if (a) ctx.restore();
  };
  // 망토: 위·가운데·아래 세 조각 사슬. 조각마다 관절이 따로 꺾이고 시간 위상이 밀린 파동을 얹어 바람에 휘날리듯 꼬리가 늦게 따라오게 함
  const putCape = () => {
    if (!P.capeB) return put(P.cape, false);
    const T = (opt.t ?? performance.now() / 1000) * 5.2;
    const flare = Math.min(1, Math.abs(pose.cape) / 70), dir = pose.cape < 0 ? -1 : 1;
    const amp = 3 + 14 * flare;                                   // 휘날림 정도: 달릴수록 크게
    put(P.cape, false);
    ctx.translate(...P.cape.j.next); ctx.rotate(R(Math.sin(T - 0.9) * amp * 0.5 + dir * flare * 7));
    put(P.capeB, false);
    ctx.translate(...P.capeB.j.next); ctx.rotate(R(Math.sin(T - 1.9) * amp * 0.8 + dir * flare * 11));
    put(P.capeC, false);
  };
  const torsoFrame = fn => {
    ctx.save();
    ctx.translate(...P.hips.j.waist);
    ctx.rotate(-R(pose.torso));
    fn();
    ctx.restore();
  };
  const arm = (shoulder, u, f, far, what) => torsoFrame(() => {
    const UA = far ? P.upperArmF || P.upperArm : P.upperArm, FA = far ? P.foreArmF || P.foreArm : P.foreArm;   // 먼 팔 = 따로 된 부위
    ctx.translate(...P.torso.j[shoulder]);
    ctx.rotate(R(u));
    if (what === 'upper') return put(UA, far);
    ctx.translate(...UA.j.elbow);
    ctx.rotate(R(f));
    if (what === 'fore') { put(FA, far); sockets[far ? 'handF' : 'hand'] = xf(ctx.getTransform(), FA.j.hand); return; }
    if (pose.sheath > 0.5) return;   // 칼을 등에 꽂고 다닐 땐 손에 칼 없음
    ctx.translate(...FA.j.hand);
    ctx.rotate(R(pose.sw));
    // 칼 길이 배율: 화면 안쪽/바깥쪽으로 겨누면 짧아 보임, 음수 = 반대쪽으로 넘어감(가로 베기의 깊이 표현)
    ctx.scale(1, pose.swL);
    const m = ctx.getTransform(), t = tipOf(P.sword);
    blade.grip = [m.e, m.f]; blade.tip = xf(m, t);
    put(P.sword, false);
    if (opt.bladeWhite) ctx.drawImage(P.sword.white, -P.sword.px, -P.sword.py);   // 칼빛이 흰 동안 칼도 흰색
  });
  const leg = (hip, t, s, far) => {
    const TH = far ? P.thighF || P.thigh : P.thigh, SH = far ? P.shinF || P.shin : P.shin;   // 먼 다리 = 따로 된 부위
    ctx.save();
    ctx.translate(...P.hips.j[hip]);
    ctx.rotate(R(t));
    put(TH, far);
    ctx.translate(...TH.j.knee);
    ctx.rotate(R(s));
    put(SH, far);
    ctx.restore();
  };

  // 레이어 (뒤 → 앞, 순서는 def.order 로 바꿀 수 있음). 칼이 몸 뒤로 넘어간 순간(swBack)은 가까운 팔·칼을 몸 뒤에
  const back = pose.swBack > 0.5;
  const nearArm = () => { arm('shoulderN', pose.nU, pose.nF, false, 'upper'); arm('shoulderN', pose.nU, pose.nF, false, 'sword'); arm('shoulderN', pose.nU, pose.nF, false, 'fore'); };
  const STEP = {
    tail: () => { if (P.tail) { ctx.save(); ctx.translate(...P.hips.j.tail); ctx.rotate(R(pose.tail)); put(P.tail, false); ctx.restore(); } },
    cape: () => { if (P.cape) torsoFrame(() => { ctx.save(); ctx.translate(...P.torso.j.cape); ctx.rotate(R(pose.cape + pose.torso)); ctx.scale(1, 1 + Math.min(0.2, Math.max(0, -pose.cape) / 300)); putCape(); ctx.restore(); }); },
    // 칼을 등에 꽂음(sheath): 어깨 뒤에서 자루가 위로 삐죽, 칼날은 등을 따라 비스듬히 아래 뒤로 (망토 위, 몸 뒤)
    sheath: () => { if (pose.sheath > 0.5) torsoFrame(() => { ctx.translate(...P.torso.j.shoulderN); ctx.translate(SHEATH.dx, SHEATH.dy); ctx.rotate(R(SHEATH.ang)); put(P.sword, false); }); },
    farArm: () => { arm('shoulderF', pose.fU, pose.fF, true, 'upper'); arm('shoulderF', pose.fU, pose.fF, true, 'fore'); },
    farLeg: () => leg('hipF', pose.fT, pose.fS, true),
    nearArmBack: () => { if (back) nearArm(); },
    hips: () => put(P.hips, false),
    torso: () => torsoFrame(() => put(P.torso, false)),
    nearLeg: () => leg('hipN', pose.nT, pose.nS, false),
    // neckDrop = 머리를 몸통 쪽으로 내려 박음 (원본 그림엔 목이 없어 머리가 기울면 턱과 어깨 사이가 떠 보임)
    head: () => torsoFrame(() => { ctx.translate(P.torso.j.neck[0], P.torso.j.neck[1] + (P.def.neckDrop || 0)); ctx.rotate(-R(pose.head)); put(P.head, false); }),
    nearArm: () => { if (!back) nearArm(); },
  };
  for (const k of P.def.order || DRAW_ORDER) STEP[k]?.();
  ctx.restore();
}
export const DRAW_ORDER = ['tail', 'cape', 'sheath', 'farArm', 'farLeg', 'nearArmBack', 'hips', 'torso', 'nearLeg', 'head', 'nearArm'];
export const ORDER_NAME = { tail: '꼬리', cape: '망토', sheath: '등에 멘 칼', farArm: '먼 팔', farLeg: '먼 다리', nearArmBack: '가까운 팔 (칼이 몸 뒤일 때)', hips: '엉덩이', torso: '몸통', nearLeg: '가까운 다리', head: '머리', nearArm: '가까운 팔·칼' };


// ---------- 정면·뒷모습 리그 (art/knight/rig_front) ----------
// 부위는 정면 그림 기준, 팔다리 0 = 아래로 늘어짐. 각도 + = 몸 바깥쪽으로 벌어짐 (L = 보는 사람 왼쪽 = 칼 든 팔, R = 빈손)
// pose: { torso, head, aL, eL, aR, eR, tL, sL, tR, sR, cape, tail, y, sq } · 뒷모습(back)은 좌우를 뒤집고 머리 = headBack, 망토를 몸 위에 그림
export const FZERO = { torso: 0, head: 0, aL: 20, eL: 0, aR: 12, eR: 6, tL: 4, sL: -4, tR: 4, sR: -4, cape: 0, tail: 0, y: 0, sq: 0 };
// 그리기 전에도 같은 시각의 손 위치 계산. 이전 프레임의 frontHand를 궤적 샘플에 재사용하지 않음.
export function frontGripAt(P, pose, ax, ay, facing, view) {
  const q = { ...FZERO, ...pose }, back = view === 'back', th = P.thigh.j.knee[1], sh = P.shin.j.sole[1];
  const legH = (t, s) => th * Math.cos(t * Math.PI / 180) + sh * Math.cos((t + s) * Math.PI / 180);
  const hipNow = Math.max(legH(q.tL, q.sL), legH(q.tR, q.sR)) + P.hips.j.hipL[1];
  const m = new DOMMatrix();
  m.translateSelf(ax, ay).scaleSelf(facing * (back ? -1 : 1), 1).translateSelf(0, q.y);
  if (q.sq) m.scaleSelf(1 + q.sq * 0.5, 1 - q.sq);
  m.scaleSelf(1 / SS, 1 / SS).translateSelf(0, -hipNow).translateSelf(...P.hips.j.waist).rotateSelf(q.torso);
  m.translateSelf(...P.torso.j.shoulderL).rotateSelf(q.aL).translateSelf(...P.upperArm.j.elbow).rotateSelf(q.eL);
  const h = m.transformPoint(new DOMPoint(...P.foreArm.j.hand));
  return [h.x, h.y];
}
export function drawFront(ctx, P, pose, ax, ay, facing, view, opt = {}) {
  const q = { ...FZERO, ...pose };
  const S = 1 / SS, back = view === 'back';
  const put = p => {
    if (!p) return;
    if (opt.capture) opt.capture.push({ p, far: false, m: ctx.getTransform() });
    const a = mergeAdj(p.adj, opt.adj?.[p.name]); if (a) { ctx.save(); ctx.translate((a.dx || 0) * p.K, (a.dy || 0) * p.K); ctx.rotate(R(-(a.rot || 0))); ctx.scale(a.sc || 1, a.sc || 1); }
    if (opt.ghost) { ctx.globalAlpha = opt.ghost; ctx.drawImage(p.ghost, -p.px, -p.py); ctx.globalAlpha = 1; }
    else {
      const im = SHADE.on ? p.lit[variantFor(ctx, LIGHT.ang)] : p.img;
      ctx.drawImage(im, -p.px, -p.py);
      if (opt.flash) { ctx.globalAlpha = opt.flash; ctx.drawImage(p.white, -p.px, -p.py); ctx.globalAlpha = 1; }
    }
    if (a) ctx.restore();
  };
  // 다리를 접은 만큼 엉덩이가 내려옴: 허벅지·정강이 세로 길이로 엉덩이 높이를 다시 잼
  const th = P.thigh.j.knee[1], sh = P.shin.j.sole[1], hipY = P.hips.j.hipL[1];
  const legH = t => th * Math.cos(t * Math.PI / 180);
  const hipNow = Math.max(legH(q.tL) + sh * Math.cos((q.tL + q.sL) * Math.PI / 180), legH(q.tR) + sh * Math.cos((q.tR + q.sR) * Math.PI / 180)) + hipY;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.scale(facing * (back ? -1 : 1), 1);   // 뒷모습 = 정면을 거울로 (칼 든 손이 반대쪽)
  ctx.translate(0, q.y);
  if (q.sq) ctx.scale(1 + q.sq * 0.5, 1 - q.sq);
  ctx.scale(S, S);
  ctx.translate(0, -hipNow);
  const torsoFrame = fn => { ctx.save(); ctx.translate(...P.hips.j.waist); ctx.rotate(R(-q.torso)); fn(); ctx.restore(); };
  const leg = (side, t, s) => { ctx.save(); const k = side === 'L' ? 1 : -1, TH = side === 'L' ? P.thigh : P.thighR || P.thigh, SH = side === 'L' ? P.shin : P.shinR || P.shin; ctx.translate(...P.hips.j['hip' + side]); ctx.rotate(R(-k * t)); put(TH); ctx.translate(...TH.j.knee); ctx.rotate(R(-k * s)); put(SH); ctx.restore(); };
  const arm = (side, a, e, hand) => torsoFrame(() => {
    const k = side === 'L' ? 1 : -1;
    const UA = side === 'L' ? P.upperArm : P.upperArmR || P.upperArm;
    ctx.translate(...P.torso.j['shoulder' + side]); ctx.rotate(R(-k * a)); put(UA);
    ctx.translate(...UA.j.elbow); ctx.rotate(R(-k * e));
    if (side === 'L') {
      const m = ctx.getTransform(), h = P.foreArm.j.hand;
      frontHand.at = [m.a * h[0] + m.c * h[1] + m.e, m.b * h[0] + m.d * h[1] + m.f];
      opt.weapon?.(frontHand.at);
    }
    put(hand);
  });
  const cape = () => torsoFrame(() => { ctx.save(); ctx.translate(...P.torso.j.cape); ctx.rotate(R(q.cape * 0.2)); put(P.cape); ctx.restore(); });
  const tail = () => { ctx.save(); ctx.translate(...P.hips.j.tail); ctx.rotate(R(q.tail)); put(P.tail); ctx.restore(); };
  if (!back) { cape(); tail(); }
  leg('L', q.tL, q.sL); leg('R', q.tR, q.sR);
  put(P.hips);
  torsoFrame(() => put(P.torso));
  if (back) { tail(); cape(); }
  torsoFrame(() => { ctx.translate(...P.torso.j.neck); ctx.rotate(R(-q.head)); put(back ? P.headBack : P.head); });
  arm('R', q.aR, q.eR, P.handOpen); arm('L', q.aL, q.eL, P.foreArm);
  ctx.restore();
}
export const frontHand = { at: null };   // 마지막으로 그린 정면 칼 든 손 (화면 변환 좌표) — 칼을 여기서 그림

// 컷아웃 리그 (옆모습 전용). 구조는 언더월드 프로토 rig.js 를 따름: 부위 PNG 를 뼈 각도대로 쌓아 그린다.
// 각도는 도(deg). 팔다리는 0 = 아래로 늘어짐, + = 보는 쪽(앞)으로 돌아감. 몸통·머리는 + = 앞으로 숙임.
// art/knight/rig.json: { scale, parts: { 이름: { file, pivot:[x,y], joints:{...} } } }  (좌표 = 부위 그림 px)
import { bakePart, variantFor, SHADE } from './shade.js';

export const SS = 2;   // 부위를 화면 크기의 SS 배로 미리 줄여 둠 (확대·줌에서도 선명하게)

const R = d => -d * Math.PI / 180;

function loadImage(src) {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error('이미지 로드 실패 ' + src));
    im.src = globalThis.__ASSETS?.[src] ?? src;
  });
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

export async function loadRig(dir) {
  const def = await (await fetch(`${dir}/rig.json`, { cache: 'no-store' })).json();
  const K = def.scale * SS;
  const P = { def };
  await Promise.all(Object.entries(def.parts).map(async ([name, a]) => {
    const img = await loadImage(`${dir}/${a.file}`);
    const c = downscale(img, img.width * K, img.height * K);
    const j = {};
    for (const k in a.joints || {}) j[k] = [(a.joints[k][0] - a.pivot[0]) * K, (a.joints[k][1] - a.pivot[1]) * K];
    P[name] = { img: c, px: a.pivot[0] * K, py: a.pivot[1] * K, j, w: c.width, h: c.height, z: a.z };
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
    if (opt.ghost) { ctx.globalAlpha = opt.ghost; ctx.drawImage(p.ghost, -p.px, -p.py); ctx.globalAlpha = 1; return; }
    const im = SHADE.on ? (far ? p.farLit : p.lit)[variantFor(ctx, LIGHT.ang)] : (far ? p.farFlat : p.img);
    ctx.drawImage(im, -p.px, -p.py);
    if (opt.flash) { ctx.globalAlpha = opt.flash; ctx.drawImage(p.white, -p.px, -p.py); ctx.globalAlpha = 1; }
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
    ctx.translate(...P.torso.j[shoulder]);
    ctx.rotate(R(u));
    if (what === 'upper') return put(P.upperArm, far);
    ctx.translate(...P.upperArm.j.elbow);
    ctx.rotate(R(f));
    if (what === 'fore') { put(P.foreArm, far); sockets[far ? 'handF' : 'hand'] = xf(ctx.getTransform(), P.foreArm.j.hand); return; }
    if (pose.sheath > 0.5) return;   // 칼을 등에 꽂고 다닐 땐 손에 칼 없음
    ctx.translate(...P.foreArm.j.hand);
    ctx.rotate(R(pose.sw));
    // 칼 길이 배율: 화면 안쪽/바깥쪽으로 겨누면 짧아 보임, 음수 = 반대쪽으로 넘어감(가로 베기의 깊이 표현)
    ctx.scale(1, pose.swL);
    const m = ctx.getTransform(), t = tipOf(P.sword);
    blade.grip = [m.e, m.f]; blade.tip = xf(m, t);
    put(P.sword, false);
  });
  const leg = (hip, t, s, far) => {
    ctx.save();
    ctx.translate(...P.hips.j[hip]);
    ctx.rotate(R(t));
    put(P.thigh, far);
    ctx.translate(...P.thigh.j.knee);
    ctx.rotate(R(s));
    put(P.shin, far);
    ctx.restore();
  };

  // 레이어 (뒤 → 앞). 칼이 몸 뒤로 넘어간 순간(swBack)은 가까운 팔·칼을 몸 뒤에
  const back = pose.swBack > 0.5;
  if (P.tail) { ctx.save(); ctx.translate(...P.hips.j.tail); ctx.rotate(R(pose.tail)); put(P.tail, false); ctx.restore(); }
  if (P.cape) torsoFrame(() => { ctx.save(); ctx.translate(...P.torso.j.cape); ctx.rotate(R(pose.cape + pose.torso)); ctx.scale(1, 1 + Math.min(0.2, Math.max(0, -pose.cape) / 300)); putCape(); ctx.restore(); });
  // 칼을 등에 꽂음(sheath): 어깨 뒤에서 자루가 위로 삐죽, 칼날은 등을 따라 비스듬히 아래 뒤로 (망토 위, 몸 뒤)
  if (pose.sheath > 0.5) torsoFrame(() => { ctx.translate(...P.torso.j.shoulderN); ctx.translate(SHEATH.dx, SHEATH.dy); ctx.rotate(R(SHEATH.ang)); put(P.sword, false); });
  arm('shoulderF', pose.fU, pose.fF, true, 'upper'); arm('shoulderF', pose.fU, pose.fF, true, 'fore');
  leg('hipF', pose.fT, pose.fS, true);
  if (back) { arm('shoulderN', pose.nU, pose.nF, false, 'upper'); arm('shoulderN', pose.nU, pose.nF, false, 'sword'); arm('shoulderN', pose.nU, pose.nF, false, 'fore'); }
  put(P.hips, false);
  torsoFrame(() => put(P.torso, false));
  leg('hipN', pose.nT, pose.nS, false);
  // neckDrop = 머리를 몸통 쪽으로 내려 박음 (원본 그림엔 목이 없어 머리가 기울면 턱과 어깨 사이가 떠 보임)
  torsoFrame(() => { ctx.translate(P.torso.j.neck[0], P.torso.j.neck[1] + (P.def.neckDrop || 0)); ctx.rotate(-R(pose.head)); put(P.head, false); });
  if (!back) { arm('shoulderN', pose.nU, pose.nF, false, 'upper'); arm('shoulderN', pose.nU, pose.nF, false, 'sword'); arm('shoulderN', pose.nU, pose.nF, false, 'fore'); }
  ctx.restore();
}


// ---------- 정면·뒷모습 리그 (art/knight/rig_front) ----------
// 부위는 정면 그림 기준, 팔다리 0 = 아래로 늘어짐. 각도 + = 몸 바깥쪽으로 벌어짐 (L = 보는 사람 왼쪽 = 칼 든 팔, R = 빈손)
// pose: { torso, head, aL, eL, aR, eR, tL, sL, tR, sR, cape, tail, y, sq } · 뒷모습(back)은 좌우를 뒤집고 머리 = headBack, 망토를 몸 위에 그림
export const FZERO = { torso: 0, head: 0, aL: 20, eL: 0, aR: 12, eR: 6, tL: 4, sL: -4, tR: 4, sR: -4, cape: 0, tail: 0, y: 0, sq: 0 };
export function drawFront(ctx, P, pose, ax, ay, facing, view, opt = {}) {
  const q = { ...FZERO, ...pose };
  const S = 1 / SS, back = view === 'back';
  const put = p => {
    if (!p) return;
    if (opt.ghost) { ctx.globalAlpha = opt.ghost; ctx.drawImage(p.ghost, -p.px, -p.py); ctx.globalAlpha = 1; return; }
    const im = SHADE.on ? p.lit[variantFor(ctx, LIGHT.ang)] : p.img;
    ctx.drawImage(im, -p.px, -p.py);
    if (opt.flash) { ctx.globalAlpha = opt.flash; ctx.drawImage(p.white, -p.px, -p.py); ctx.globalAlpha = 1; }
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
  const leg = (side, t, s) => { ctx.save(); const k = side === 'L' ? 1 : -1; ctx.translate(...P.hips.j['hip' + side]); ctx.rotate(R(-k * t)); put(P.thigh); ctx.translate(...P.thigh.j.knee); ctx.rotate(R(-k * s)); put(P.shin); ctx.restore(); };
  const arm = (side, a, e, hand) => torsoFrame(() => {
    const k = side === 'L' ? 1 : -1;
    ctx.translate(...P.torso.j['shoulder' + side]); ctx.rotate(R(-k * a)); put(P.upperArm);
    ctx.translate(...P.upperArm.j.elbow); ctx.rotate(R(-k * e)); put(hand);
    if (side === 'L') { const m = ctx.getTransform(), h = P.foreArm.j.hand; frontHand.at = [m.a * h[0] + m.c * h[1] + m.e, m.b * h[0] + m.d * h[1] + m.f]; }
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

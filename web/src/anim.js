// 모션: 자세(pose) = 뼈 각도 묶음 (rig.js ZERO 참고). 시간 t(초) → 자세.
// 옆모습 각도 메모 (언더월드 anim.js 와 같은 약속): 팔 절대 각도 = nU - torso, 아래팔 = 팔 + nF. 0 아래 · 90 앞 · 180 위 · -90 뒤.
// 칼 그림은 위를 향해 있으니 칼 절대 각도 A = 180 + (nU - torso) + nF + sw.
//
// ★ 가로 베기 = 깊이 각 θ: 칼이 몸을 수평으로 감아 도는 각도. 0 = 앞 · 90 = 카메라 쪽(몸 앞을 가로지름) · 180 = 뒤 · -90 = 몸 뒤쪽(먼 쪽).
//   옆모습에선 칼 길이(swL) = cos θ 로 줄었다 늘었다 하고, 칼끝 높이는 sin θ 만큼 살짝 내려와 납작한 타원을 그림.
//   sin θ < 0 (먼 쪽)이면 팔·칼을 몸 뒤에 그림 (swBack).
import { ZERO, lerpPose } from './rig.js';

const P = o => ({ ...ZERO, ...o });
const easeOut = t => 1 - (1 - t) ** 3;
const easeIn = t => t * t * t;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = t => Math.max(0, Math.min(1, t));

// 칼 절대 각도 A 를 맞추는 sw
export function aim(p, A) { p.sw = A - 180 - (p.nU - p.torso) - p.nF; return p; }

// 깊이 각 θ(도)로 가까운 팔·칼 자세를 채움. tilt = 칼끝 높이(+ 위로), dip = 몸 앞을 지날 때 칼끝이 내려오는 정도
export function sweep(p, th, tilt = 0, dip = 14) {
  const r = th * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  p.nU = p.torso + 22 + 68 * c;            // 앞 = 90 · 뒤 = -46 · 몸 앞/뒤 = 22
  p.nF = 18 * s * s + 8;
  const L = Math.sign(c || 1) * Math.max(0.2, Math.abs(c));
  p.swL = L;
  p.swBack = s < -0.15 ? 1 : 0;
  // 칼끝 높이 e (+ = 위). 몸 앞을 지날 땐 dip 만큼 내려와 납작한 타원의 아래 반을 그림.
  // 칼이 뒤로 넘어가면(L<0) 그림이 뒤집혀 그려지니 각도 부호도 뒤집음
  const e = tilt - dip * s;
  return aim(p, 90 + Math.sign(L) * e);
}

// 통그림 자세 (rig.json rest): 통그림 비교 보기에서 이 자세로 그려 원본과 겹쳐 봄
export let REST = P({});
export const setRest = o => { REST = P(o); };

// ---------- 낮은 자세 (스컬 돌진처럼) ----------
// 앞다리는 앞으로 접고 뒷다리는 뒤로 길게 뻗어 엉덩이를 바닥 가까이 떨어뜨림. 상체는 앞으로 확 숙이되 머리는 들어 앞을 봄
const LOW = { nT: 88, nS: -108, fT: -74, fS: -8 };
export function crouch(p, k) {
  if (!(k > 0)) return p;
  const q = { ...p };
  for (const key in LOW) q[key] = p[key] + (LOW[key] - p[key]) * k;
  q.y = p.y + 11 * k; q.torso = p.torso + 26 * k; q.head = p.head - 22 * k; q.cape = p.cape - 30 * k; q.tail = p.tail - 15 * k;
  return q;
}

// ---------- 대기 ----------
// 대기: 간츠처럼 큰 칼을 등에 비스듬히 둘러멘 채 (손은 등 뒤 엉덩이 쪽에서 자루를 쥠, 칼날은 어깨 너머 위·뒤로). 공격할 때 뽑아 휘두름
// 귀엽게: 몸을 곧게 세우고 큰 칼을 어깨에 척 걸쳐 멤 (손은 가슴 앞, 칼날은 어깨 너머 뒤 위로)
// 큰 칼: 어깨에 척 걸쳐 멤 (칼날이 어깨 위에 거의 수평으로 얹혀 뒤로, 턱 밑을 지나 얼굴을 가리지 않게). 한손검일 땐 펜싱 자세(nU 62 · nF 18 · fU -135 · fF 60 · 칼 100)
export const IDLE = P({ torso: 6, head: -2, y: 2, nU: 34, nF: 104, fU: 18, fF: 40, nT: 22, nS: -28, fT: -18, fS: -10, cape: 10, tail: 0 });
const IDLE_SW = 266;
aim(IDLE, IDLE_SW);
export function idle(t) {
  // 귀엽게: 숨 쉴 때 몸이 말랑하게 눌렸다 늘어나고(sq), 머리가 살짝 갸웃, 꼬리·망토가 살랑
  const b = Math.sin(t * 2.6);
  const p = { ...IDLE };
  p.y = 0.8 + b * 1.2; p.sq = b * 0.04;
  p.torso += b * 1.5; p.head -= b * 2 + Math.sin(t * 0.9) * 3;
  p.fU -= b * 3;
  p.cape = 10 + Math.sin(t * 1.7) * 10 + Math.sin(t * 3.1) * 4; p.tail = Math.sin(t * 1.9) * 12;
  return aim(p, IDLE_SW + b * 2);
}

// ---------- 달리기 (8프레임 느낌, 진폭 큰 SD 달리기) ----------
export function run(ph) {   // ph = 걸음 위상(라디안)
  // 큰 칼은 등에 꽂은 채(sheath) 두 팔을 번갈아 흔들며 낮게 달림. 걸음마다 몸이 통통 눌렸다 펴지고(sq), 머리는 반대로 살짝 까딱, 망토·꼬리가 펄럭임
  const s = Math.sin(ph), c = Math.cos(ph), bob = Math.pow(Math.abs(c), 0.7), lag = Math.sin(2 * ph - 0.9);
  const T = 26;
  const p = P({
    torso: T + 3 * bob, head: -16 + 4 * bob, y: -2.2 * bob + 3, sq: 0.05 * (bob - 0.5),
    nT: 46 * s, fT: -46 * s, nS: -14 - 80 * Math.max(0, c), fS: -14 - 80 * Math.max(0, -c),
    fU: 55 * s + 6, fF: 40 + 25 * Math.max(0, s),
    nU: -52 * s + 6, nF: 40 + 25 * Math.max(0, -s), sheath: 1,   // 칼은 등에 꽂고 두 팔을 번갈아 흔듦
    cape: -60 + 14 * Math.sin(2 * ph - 1.2) - Math.abs(s) * 8, tail: -20 + s * 14,
  });
  return p;
}

// ---------- 점프 ----------
export const JUMP_UP = aim(P({ torso: 6, head: -10, nU: 40, nF: 70, fU: -40, fF: 40, nT: 70, nS: -100, fT: -10, fS: -40, cape: 30, tail: 30, sq: -0.06 }), 150);
export const FALL = aim(P({ torso: 0, head: 6, nU: 70, nF: 50, fU: 120, fF: 30, nT: 30, nS: -20, fT: -20, fS: -30, cape: 70, tail: 40, sq: 0.03 }), 130);
export const LAND = aim(P({ torso: 24, head: -14, y: 6, nU: 20, nF: 60, fU: 10, fF: 30, nT: 60, nS: -90, fT: -30, fS: -60, cape: -10, tail: -10, sq: 0.14 }), 110);
export const CROUCH = aim(P({ torso: 18, head: -8, y: 4, nU: 10, nF: 50, fU: 0, fF: 30, nT: 50, nS: -80, fT: -30, fS: -50, cape: 0, tail: -6, sq: 0.1 }), 120);
export function air(vy) {   // vy: + 아래로 떨어짐
  return lerpPose(JUMP_UP, FALL, clamp01((vy + 200) / 600));
}

// ---------- 대시 (스컬식: 바로 튀어 나가 낮게 숙이고, 끝에 브레이크) ----------
export const DASH_T = 0.24;
const DASH = aim(crouch(P({ torso: 38, head: -18, y: 2, nU: -62, nF: 14, fU: -60, fF: 20, cape: -70, tail: -20, sq: -0.06 }), 1), 262);   // 바닥에 붙듯 낮게 깔리고 칼은 뒤로 수평
const BRAKE = aim(crouch(P({ torso: -6, head: 6, y: 3, nU: 30, nF: 60, fU: 30, fF: 40, nT: 40, nS: -20, fT: -30, fS: -40, cape: 30, tail: 20, sq: 0.08 }), 0.45), 140);
export function dash(t) {
  if (t < 0.03) return lerpPose(IDLE, DASH, easeOut(t / 0.03));
  if (t < 0.15) { const p = { ...DASH }; p.head += Math.sin(t * 90) * 1.5; p.cape += Math.sin(t * 120) * 6; return p; }
  const u = clamp01((t - 0.15) / (DASH_T - 0.15));
  return u < 0.5 ? lerpPose(DASH, BRAKE, easeOut(u / 0.5)) : lerpPose(BRAKE, IDLE, easeInOut((u - 0.5) / 0.5));
}

// ---------- 공격: 전부 가로 베기 ----------
// wind = 예비 동작 · act = 휘두르기 · rec = 회복(앞 40% 는 끝 자세 버팀).
// th = [젖힌 θ, 끝 θ] (몸을 감아 도는 칼), body W/S = 몸통·다리·빈손 (칼 팔은 sweep 이 채움)
// hitAt = act 중 판정 순간(0~1) · lunge = 앞으로 내딛는 거리(px) · fx = 칼 궤적 그림 / big = 초승달 덧씌움
const body = o => P(o);
// 언더월드 칼 그림은 아래팔 방향으로 뻗어(sw 0 = 아래팔과 나란) 우리 칼 그림(칼날이 위 = sw 0 에서 반대)과 180° 다름 → 포팅한 자세는 sw 에 180 을 더함
const bodyU = o => P({ ...o, sw: (o.sw || 0) + 180 });
export const ATTACKS = {
  // ★ 언더월드 프로토 방식: 예비(W) 자세 → 타격(S) 자세를 '자세째로' 보간. 칼은 평면 안에서 큰 호를 그리며 휘두르고,
  //   칼 궤적(잔상)은 그 보간 중 실제 칼(손잡이~칼끝) 자리가 쓸고 간 면으로 그림. 포즈 각도 약속은 같음 (옆모습: 0 아래 · 90 앞 · 180 위 · -90 뒤).
  // path = 칼끝이 지나갈 자리 조절점 [앞 x, 위 -y, 몸 뒤(1)] (발 기준). 휘두르는 동안 칼끝을 이 길로 끌고 가고 궤적이 칼끝에 붙어 따라옴
  // 평타 (이나리처럼): 몸 앞에서 짧고 날카롭게 끊어 치는 호. circle = 어깨 둘레 타원 (각도 0 아래 · 90 앞 · 180 위)
  // 평타 (사용자 그림대로): 1타 크게 수평 베기 → 끝에서 칼끝이 앞 위로 말려 올라가는 갈고리 / 2타 묵직하게 올려 쳐 머리 위를 넘어 등 뒤까지 / 3타 그 자세 그대로 몸을 돌려 회오리 베기
  // slash1 = 강공격 1타(heavy1) 그대로 + 기울기만 위로 (아래 ATTACKS.slash1 에서 만듦, 사용자 지시 2026-10-28)
  slash2: { // 묵직하게: 낮게 웅크려 힘을 모았다가(긴 젖히기) 발밑 앞에서 머리 위를 넘어 등 뒤까지 크게 올려 침, 히트스톱 길게. 회복은 짧게(그 자세로 3타)
    uw: true, wind: 0.18, act: 0.06, rec: 0.4, ease: 'heavy', endFlip: true, lean: -10, low: 1, lowK: [1, 1, 0.2], lunge: 70, dmg: 12, kb: 220, stop: 0.13, shake: 8, hitAt: 0.62, range: [10, 200], h: [-170, 0], fxAhead: 70, hitUp: 55,   // endFlip = 뒤로 돈 자세 그대로 대기 (끝나면 보는 쪽이 바뀜) · rec 길게 = 3타 입력 기다림
    path: [[-40, -8, 0], [45, 2, 0], [110, -42, 0], [100, -112, 0], [30, -148, 0], [-50, -128, 1], [-88, -80, 1]],
    turn: [[0.25, 'front'], [0.6, 'flip'], [99, 'side']],   // 진행 u = 휘두르기 시작부터 (act 단위, 1 넘으면 회복 중): 정면을 잠깐 거쳐 회복 내내 반대쪽을 봄 → 3타가 그 자세에서 돎   // 올려 치며 뒤돌기: 칼이 머리 위를 넘을 때 정면을 거쳐 반대쪽을 봄 (다음 3타 회전으로 이어짐)
    W: bodyU({ cape: -10, torso: 30, head: -16, y: 6, fU: 40, fF: 30, nT: 30, nS: -45, fT: -25, fS: -20, sq: 0.1 }),
    S: bodyU({ cape: -30, torso: -22, head: 12, y: -2, x: 5, fU: -32, fF: 15, nT: 20, nS: -10, fT: -30, fS: -5, sq: -0.1 }),   // 다 올려 치면 몸이 뒤로 젖혀지며 쭉 늘어남
    trail: 'thick', ell: { cx: 46, cy: -80, rx: 118, ry: 38 }, sfx: '쿵!',
  },
  slash3: { // 회오리 베기: 2타 끝(칼이 등 뒤 위)에서 그 자세 그대로 몸을 수평으로 한 바퀴 돌리며 크게 한 번 휘둘러 벰
    uw: true, wind: 0.08, act: 0.24, rec: 0.3, lean: 12, low: 0.7, lowK: [0.6, 0.7, 0.8], lunge: 80, dmg: 18, kb: 320, stop: 0.11, shake: 8, hitAt: 0.75, range: [-60, 200], h: [-180, 0], fin: true, big: true, fxAhead: 70,   // 칼빛은 1타처럼 칼에 붙는 리본 (예전 flatFx 수평 띠는 사용자 요청으로 뺌)
    orbit: { cx: 18, cy: -58, rx: 160, ry: 32, lean: 6, a0: 160, a1: -190 }, turn: 'orbit', windView: 'flip',   // 2타의 뒤로 돈 자세에서 앞으로 한 바퀴 돌며 벰 → 칼이 등 뒤로 간 채 끝남 (다음 1타가 그 칼을 앞으로 베어 넘김). turn = 칼 각도 따라 몸이 옆 → 정면 → 반대 옆 → 뒷모습으로 돎
    W: bodyU({ cape: -30, torso: -10, head: 6, y: 0, fU: -40, fF: 20, nT: 30, nS: -30, fT: -35, fS: -10 }),
    S: bodyU({ cape: -90, torso: 20, head: -10, y: 4, x: 8, fU: -60, fF: 20, nT: 60, nS: -60, fT: -55, fS: -10, sq: 0.08 }),
    trail: 'thick', ell: { cx: 60, cy: -78, rx: 160, ry: 50 }, sfx: '휘리릭!!',
  },
  // 강공격 (우클릭): ① 칼을 몸 옆에서 세로로 한 바퀴 휙 돌리며(위 → 앞 → 아래 → 뒤) 낮은 돌진 자세로 가라앉아 칼을 뒤로 보냄
  //   → ② 곧바로(next) 뒤 아래에서 바닥을 스치듯 앞 위로 강하게 베어 넘기고, 그 추진력으로 앞으로 돌진. circle = 어깨 둘레 세로 타원(각도 0 아래 · 90 앞 · 180 위 · -90 뒤)
  // 강공격 (이나리 데모 2:09.7~2:11 참고): 짧게 웅크림 → 제자리에서 칼을 수평으로 한 바퀴 휙(넓게 감기는 소용돌이, 흰빛 → 붉게 식음) → 곧바로 적을 꿰뚫고 지나가는 직선 돌진 베기(긴 가로 칼선)
  heavy1: {   // (돌진 공격에선 뺌 — 사용자 지시 2026-10-28. 1타가 이 궤도를 물려받아 씀)
    uw: true, wind: 0.14, act: 0.06, rec: 0.08, lean: 4, low: 1, lunge: 10, dmg: 10, kb: 80, stop: 0.04, shake: 3, hitAt: 0.5, range: [-80, 170], h: [-170, 0], next: 'heavyC', fxAhead: 70,
    orbit: { cx: 10, cy: -54, rx: 128, ry: 28, lean: 4, a0: 170, a1: -190 },   // 수평 한 바퀴
    W: bodyU({ torso: 30, head: -14, y: 4, fU: -40, fF: 30, cape: -20, tail: -10, sq: 0.1 }),
    S: bodyU({ torso: 20, head: -10, y: 4, fU: -60, fF: 20, cape: -70, tail: -30 }),
    trail: 'thick', ell: { cx: 46, cy: -80, rx: 118, ry: 38 }, sfx: '휙!',
  },
  heavyC: { // ①-② 도약 준비 (사용자 지시 2026-10-28): 칼을 등 뒤로 빼며 낮게 웅크려 기를 모음 — 빛이 몸으로 빨려 들어오고 화면이 당겨짐(charge), 칼끝에 섬광(glint) → heavy2 에서 번쩍하며 튀어 나감
    uw: true, wind: 0.34, act: 0.02, rec: 0, lean: 20, low: 1, lowK: [1, 1, 1], lunge: 0, dmg: 0, kb: 0, stop: 0, shake: 0, hitAt: 1, range: [9999, 9999], h: [0, 0], next: 'heavy2', charge: true, glint: true, noTrail: true,
    path: [[-72, -48, 1], [-74, -48, 1], [-75, -48, 1]],   // 칼끝은 등 뒤로 (heavy2 시작 자리와 같게)
    W: bodyU({ torso: 52, head: -32, y: 9, fU: -70, fF: 15, cape: -50, tail: -30, sq: 0.14 }),
    S: bodyU({ torso: 52, head: -32, y: 9, fU: -70, fF: 15, cape: -55, tail: -32, sq: 0.15 }),
    trail: 'thick', ell: { cx: 60, cy: -78, rx: 160, ry: 50 },
  },
  heavy2: { // ② 돌진: 칼은 뒤로 빼 들고 낮게 튀어 나감 — 몸 뒤로 섬광 줄기가 따라붙음(dashFx), 판정 없음 → 곧바로 heavy3
    uw: true, wind: 0.06, act: 0.14, rec: 0.01, lean: 22, lunge: 360, flash: true, dashFx: true, dmg: 0, kb: 0, stop: 0, shake: 0, hitAt: 1, range: [9999, 9999], h: [0, 0], next: 'heavy3',
    path: [[-70, -50, 1], [-75, -48, 1], [-78, -48, 1]], low: 0.9, lowK: [1, 1, 0.9],   // 칼끝은 등 뒤로 빼 둠
    W: bodyU({ torso: 48, head: -28, y: 6, fU: -70, fF: 15, cape: -95, tail: -30, sq: -0.05 }),
    S: bodyU({ torso: 50, head: -30, y: 7, x: 10, fU: -80, fF: 10, cape: -100, tail: -40, sq: -0.08 }),
    trail: 'thick', ell: { cx: 60, cy: -78, rx: 160, ry: 50 },
  },
  heavy3: { // ③ 돌진 끝에서 뒤로 빼 둔 칼을 몸 앞을 가로질러 전방으로 크게 수평으로 베어 넘김 (마무리)
    uw: true, wind: 0.02, act: 0.06, rec: 0.36, lean: 16, lunge: 70, dmg: 20, kb: 360, stop: 0.12, shake: 9, hitAt: 0.5, range: [-80, 230], h: [-190, 0], fin: true, big: true,
    orbit: { cx: 30, cy: -60, rx: 175, ry: 30, lean: 6, a0: 200, a1: -150 }, low: 0.8, lowK: [0.9, 0.8, 0.6], fxAhead: 90, noCres: true,   // 칼빛을 도착 자리 앞으로 밀어 그림(몸을 가로지르지 않게), 반달 그림 없음   // 납작한 수평 고리: 등 뒤 → 몸 앞(카메라 쪽) → 앞끝 → 먼 쪽까지 돌아 옆에서 납작한 타원으로 보임 (앞끝에서 멈추면 찌르기처럼 일직선) + 앞에 납작한 초승달
    W: bodyU({ torso: 40, head: -22, y: 6, fU: -70, fF: 15, cape: -90, tail: -30 }),
    S: bodyU({ torso: 10, head: -4, y: 2, x: 12, fU: -120, fF: 30, cape: -60, tail: -20, sq: 0.08 }),
    trail: 'thick', ell: { cx: 60, cy: -78, rx: 160, ry: 50 }, sfx: '서걱!!',
  },
  air: { // 공중 세로 회전 베기 (사용자 지시 2026-10-28): 살짝 튀어 오르며(airHop) 다리를 공처럼 접고 앞으로 한 바퀴 공중제비(flip) — 칼끝은 어깨 둘레 세로 원(위 → 앞 → 아래 → 뒤)을 그려 칼빛이 세로 바퀴로 남음
    uw: true, wind: 0.06, act: 0.18, rec: 0.2, lean: 0, low: 0, hang: true, airHop: 560, flip: 360, linear: true, lunge: 0, dmg: 8, kb: 140, stop: 0.05, shake: 4, hitAt: 0.5, range: [-130, 150], h: [-190, 190], hitUp: -30, airOnly: true, sweep: true,
    // ↑ 제다이 점프처럼 웅크렸다 약 80px 솟아올라 공처럼 말고 한 바퀴 → 펴며 내려옴. sweep = 도는 내내 판정 (칼이 몸 둘레를 다 쓸어서 위·아래·뒤 적도 맞음)
    circle: { cx: 4, cy: -52, rx: 70, ry: 70, a0: 200, a1: -170 },
    // 도는 동안은 Codex 통그림 (몸을 공처럼 맒): 9 말기 → 10 공을 통째로 돌림 → 12 펴며 내려옴 (그림 없으면 리그 그대로). [시작 초, 끝 초, 프레임, 각도0, 각도1, 'c' = 가운데 기준 회전]
    // 각도는 그림 속 칼 방향(9: 위 앞 -41° · 10: 정면 0° · 12: 아래 앞 +44°)을 빼서 칼 방향이 끊기지 않고 1¼바퀴 이어지게 맞춤
    frames: [[0.06, 0.088, 9, 0, 20, 'c'], [0.088, 0.212, 10, -21, 380, 'c'], [0.212, 0.32, 12, 336, 360, 'c']],
    W: bodyU({ torso: 16, head: -12, y: 4, fU: 40, fF: 50, nT: 60, nS: -90, fT: -10, fS: -60, cape: 20, tail: 10, sq: 0.1 }),   // 튀어 오르기 전 웅크림
    S: bodyU({ torso: 48, head: -34, y: -14, fU: 70, fF: 110, nT: 125, nS: -155, fT: 115, fS: -155, cape: 70, tail: 60, sq: 0.14 }),   // 공처럼 맒: 등을 둥글게, 머리 숙이고 무릎을 가슴까지, 빈손은 무릎을 감쌈
    trail: 'thick', ell: { cx: 24, cy: -80, rx: 130, ry: 44 }, sfx: '촤악!',
  },
  plunge: { // 내려찍기 (공중 ↓ + 공격): 살짝 떠오르며 칼을 머리 위로 들었다가 → 앞으로 크게 돌려 아래로 꽂고 급강하. 아래 적은 옆으로 밀어내며 땅까지 꽂힘, 땅에 꽂히면 충격파 (main 의 plunge 처리)
    uw: true, wind: 0.1, act: 0.07, rec: 0.22, lean: 0, low: 0, plunge: true, noTrail: true, lunge: 0, dmg: 10, kb: 320, stop: 0.07, shake: 6, hitAt: 0, range: [-60, 60], h: [-220, 160], hitUp: -70, sfx: '쾅!',
    W: aim(body({ torso: -10, head: 6, nU: 160, nF: 10, nT: 90, nS: -120, fT: 70, fS: -110, fU: 120, fF: 30, cape: 50, tail: 40, sq: -0.04 }), 175),
    S: aim(body({ torso: 10, head: -6, nU: 10, nF: 0, nT: 80, nS: -110, fT: 60, fS: -100, fU: 20, fF: 20, cape: 85, tail: 60, sq: -0.1 }), 2),   // 칼끝이 발밑을 향해 곧게
  },
};
// 1타: 강공격 1타(제자리 수평 한 바퀴)를 그대로 쓰고, 궤도만 앞이 높게 기울여(lean 양수 = 뒤 낮고 앞 높음) 아래에서 위로 올려 침.
// 강공격처럼 다음 동작으로 넘어가지 않고(next 없음) 평타 회복·판정 세기를 씀
{
  const h = ATTACKS.heavy1;
  ATTACKS.slash1 = { ...h, orbit: { ...h.orbit, cy: -38, lean: 28 }, next: undefined, wind: 0.11, act: 0.05, rec: 0.26, dmg: 9, kb: 150, stop: 0.065, shake: 4, hitUp: 22, sfx: '챙!', fxAhead: 150,   // 칼빛 고리를 통째로 캐릭터 앞에
    // 몸은 예전 1타처럼: 바닥까지 숙이며 앞으로 날듯 살짝 돌진 (칼빛은 그만큼 낮게: cy -38)
    lean: 16, low: 1, lowK: [0.8, 1, 0.8], lunge: 90,
    W: bodyU({ torso: 20, head: -10, y: 4, fU: -40, fF: 30, nT: 40, nS: -45, fT: -34, fS: -28, cape: 0, tail: 10, sq: 0.1 }),
    S: bodyU({ torso: 40, head: -22, y: 10, x: 14, fU: -80, fF: 20, nT: 85, nS: -90, fT: -75, fS: -12, cape: -85, tail: -40, sq: 0.14 }) };
}
export const COMBO = ['slash1', 'slash2', 'slash3'];

// ---------- 경로 베기 ----------
// 칼끝 자리 = [앞 x, y, 몸 뒤(1)]. u = 휘두르기 진행 0~1 (pathEase 로 처음이 빠르고 끝이 감기며 느려짐)
export const isPath = c => !!(c.path || c.orbit || c.circle);
export const pathEase = u => 1 - (1 - Math.max(0, Math.min(1, u))) ** 2.2;
// 육중한 칼: 앞 40% 동안은 칼이 무거워 바닥을 끌며 조금만 나가다가(경로 15%) 나머지에서 확 폭발하듯 휘둘러 올라감
export const heavyEase = u => { u = Math.max(0, Math.min(1, u)); return u < 0.4 ? 0.15 * (u / 0.4) ** 2 : 0.15 + 0.85 * (1 - (1 - (u - 0.4) / 0.6) ** 2.5); };
export const PATH_K = { k: 1.3 };   // 경로 전체 배율 — 리그의 칼 길이에 맞춰 main 이 정함 (칼은 늘리지 않음)
export function pathAt(c, u) {
  const K = PATH_K.k;
  if (c.circle) {   // 어깨 둘레 세로 타원: 몸 옆 평면에서 돌아 늘 몸 앞(카메라 쪽)
    const o = c.circle, a = (o.a0 + (o.a1 - o.a0) * u) * Math.PI / 180;
    return [(o.cx + o.rx * Math.sin(a)) * K, (o.cy + o.ry * Math.cos(a)) * K, 0];
  }
  if (c.orbit) {   // sin > 0 = 아래(몸 앞, 카메라 쪽) · sin < 0 = 위(몸 뒤 먼 쪽)
    const o = c.orbit, a = (o.a0 + (o.a1 - o.a0) * u) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    return [(o.cx + o.rx * ca) * K, (o.cy + o.ry * sa - o.lean * ca + (o.rise || 0) * u) * K, sa < -0.2 ? 1 : 0];   // rise = 돌면서 위로 (회오리)
  }
  // 조절점을 캣멀롬으로 매끈하게 이음
  const Q = c.path, n = Q.length - 1, f = Math.min(n - 1e-6, Math.max(0, u) * n), i = Math.floor(f), k = f - i;
  const p0 = Q[Math.max(0, i - 1)], p1 = Q[i], p2 = Q[i + 1], p3 = Q[Math.min(n, i + 2)];
  const cr = j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * k + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * k * k + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * k * k * k);
  return [cr(0) * K, cr(1) * K, k < 0.5 ? p1[2] : p2[2]];
}
export const ATTACK_FPS = 40;   // 휘두르는 순간은 프레임을 살짝 끊어 '탁' 끊기는 맛

// 공격 자세 + 지금 θ. ret.th = 깊이 각, ret.phase = 'wind'|'act'|'rec'
export function attack(c, t, from) {
  const tq = Math.floor(t * ATTACK_FPS) / ATTACK_FPS;
  if (c.uw) {   // 언더월드식: 예비(W) → 타격(S) 자세 보간 → 회복(앞 45% 는 타격 자세를 버팀)
    if (tq < c.wind) return { pose: lerpPose(from, c.W, easeOut(tq / c.wind)), th: 0, phase: 'wind' };
    if (t < c.wind + c.act) {   // 칼 절대 각도를 일정하게 돌려(원호) 칼끝이 직선으로 꺾이지 않고 둥근 호를 그리게 함. 몸·팔은 자세 보간
      const u = (t - c.wind) / c.act, e = easeOut(u), A = q => 180 + (q.nU - q.torso) + q.nF + q.sw;
      const pose = lerpPose(c.W, c.S, e), a0 = A(c.W), a1 = A(c.S);
      aim(pose, a0 + (a1 - a0) * e);
      return { pose, th: 0, phase: 'act', u };
    }
    const k = clamp01(((tq - c.wind - c.act) / c.rec - 0.45) / 0.55);
    const q = lerpPose(c.S, IDLE, easeInOut(k));
    if (k > 0 && k < 0.25) q.y -= 1.5;   // 회복 시작에 튕김
    return { pose: q, th: 0, phase: 'rec' };
  }
  const [th0, th1] = c.th;
  let p, th, phase;
  const tw = c.tiltW ?? c.tilt;   // 젖힌 순간의 칼 기울기 (+ = 칼끝이 위로: 어깨 위로 들어 젖힘)
  if (tq < c.wind) {   // 젖히기: 몸을 W로, 칼은 젖힌 θ 쪽으로 (멈춤 직전 살짝 더 감음)
    const u = easeOut(tq / c.wind);
    p = lerpPose(from, c.W, u); th = th0 + (th0 - th1) * 0.04 * u; phase = 'wind';
    const q = sweep({ ...p }, th, tw, c.dip);
    // 칼 팔은 대기 자세 → 젖힌 자세로 (칼 길이는 1 → 젖힌 길이로 넘어감)
    for (const k of ['nU', 'nF', 'sw', 'swL']) p[k] = from[k] + (q[k] - from[k]) * u;
    p.swBack = u > 0.5 ? q.swBack : 0;
    if (Math.sign(p.swL) !== Math.sign(q.swL) && u > 0.5) p.swL = q.swL;
    return { pose: p, th, phase };
  }
  if (t < c.wind + c.act) {   // 휘두르기: θ 를 매끈하게 (잔상이 끊기지 않게 원래 시간 사용)
    const u = (t - c.wind) / c.act, e = easeOut(u);
    p = lerpPose(c.W, c.S, Math.min(1, e * 1.4));
    th = th0 + (th1 - th0) * e; phase = 'act';
    sweep(p, th, tw + (c.tilt - tw) * Math.min(1, e * 2), c.dip);
    return { pose: p, th, phase, u };
  }
  const k = clamp01(((tq - c.wind - c.act) / c.rec - 0.4) / 0.6);
  const end = sweep({ ...c.S }, th1, c.tilt, c.dip);
  p = lerpPose(end, IDLE, easeInOut(k));
  p.swBack = k < 0.5 ? end.swBack : 0;
  if (k > 0 && k < 0.2) p.y -= 1.5;   // 회복 시작에 튕김
  return { pose: p, th: th1, phase: 'rec' };
}
function sweepBlend(p, q, u) { return { sw: p.sw + (q.sw - p.sw) * u, swL: 1 + (q.swL - 1) * u }; }

// ---------- 패링 · 슈퍼점프 (2026-10-30 새 능력, 임시 자세) ----------
// 패링: 칼을 몸 앞에 비스듬히 세워 막음 → 받아넘긴 뒤 풀림
const GUARD = aim(P({ torso: 14, head: -8, y: 3, x: 4, nU: 70, nF: 60, fU: 40, fF: 50, nT: 40, nS: -60, fT: -30, fS: -30, cape: -20, tail: -10, sq: 0.06 }), 160);
export function parry(t, T = 0.3) {
  if (t < 0.04) return lerpPose(IDLE, GUARD, easeOut(t / 0.04));
  if (t < T * 0.55) return GUARD;
  return lerpPose(GUARD, IDLE, easeInOut(clamp01((t - T * 0.55) / (T * 0.45))));
}
// 슈퍼점프 웅크림: 깊이 눌렸다가 솟구침 (솟은 뒤는 점프 자세)
const SJ_LOW = aim(crouch(P({ torso: 20, head: -16, y: 8, nU: -30, nF: 30, fU: -40, fF: 30, cape: 20, tail: 20, sq: 0.2 }), 1), 230);
export function sjump(t, T = 0.16) { return lerpPose(IDLE, SJ_LOW, easeOut(clamp01(t / T))); }

// ---------- 피격 · 사망 ----------
export const HURT_T = 0.3;
const HURT = aim(P({ torso: -18, head: 16, x: -6, y: 1, nU: 60, nF: 60, fU: 90, fF: 40, nT: -10, nS: -20, fT: 10, fS: -20, cape: 50, tail: 40, sq: -0.05 }), 150);
export function hurt(t) {
  const u = t / HURT_T;
  if (u < 0.2) return lerpPose(IDLE, HURT, easeOut(u / 0.2));
  return lerpPose(HURT, IDLE, easeInOut(clamp01((u - 0.4) / 0.6)));
}
export const DEATH_T = 1.4;
const D_KNEEL = aim(P({ torso: 34, head: 28, y: 14, nU: 20, nF: 10, fU: 20, fF: 10, nT: 90, nS: -130, fT: 60, fS: -110, cape: 10, tail: -10 }), 135);   // 칼이 바닥을 뚫지 않게 위쪽 각도 유지
const D_LIE = aim(P({ rot: 88, torso: -6, head: 10, y: 6, nU: 160, nF: 10, fU: 150, fF: 10, nT: 20, nS: -20, fT: 10, fS: -10, cape: 80, tail: 60 }), 170);
export function death(t) {
  if (t < 0.12) return lerpPose(IDLE, HURT, easeOut(t / 0.12));
  if (t < 0.45) return lerpPose(HURT, D_KNEEL, easeInOut((t - 0.12) / 0.33));
  if (t < 0.8) return lerpPose(D_KNEEL, D_LIE, easeIn((t - 0.45) / 0.35));
  const p = { ...D_LIE }; if (t < 0.9) p.y -= Math.sin((t - 0.8) / 0.1 * Math.PI) * 3; return p;
}

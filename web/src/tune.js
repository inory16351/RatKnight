// 튜닝 데이터 (캐릭터 테스트 도구 chartest.html 에서 고치고 data/tune.json 으로 저장 → 게임도 같은 값을 읽음)
// keys    = 동작 → 키 코드 목록 (조작 키 변경)
// fxOff   = 이펙트 종류별 끄기
// motions = 동작(공격 이름 · dash · parry …)마다 프레임(FPS 기준)별 수정
//   time = 동작 길이 수정: 공격은 { wind, act, rec } 초, 그 밖(대시·패링·피격 …)은 { scale } 배 (프레임 수 = 원래 길이 × scale), 패링은 { win } 받아넘김 창 초
//   frames[i] = { pose: {뼈: 더할 각도/값}, inv, hit: 'on'|'off', cancel, speed, trail: false, trailW, ghost: false, fx: [{ type, dx, dy, s, text }] }
//   pose 는 키 프레임: 두 키 사이는 선형 보간, 키 바깥은 0 (한 키만 있으면 그 프레임만)
import { ZERO } from './rig.js';

export const FPS = 40;   // 편집 프레임 = 공격 자세를 끊는 박자(anim.js ATTACK_FPS)와 같게
export const ACTIONS = {
  left: '왼쪽', right: '오른쪽', up: '위', down: '아래', jump: '점프', atk: '공격', heavy: '대시 · 충전 돌진(길게)', dash: '대시',
  parry: '패링 (b)', sjump: '슈퍼점프 (d)', phase: '벽통과 (e)', esc: '닫기', enter: '확인',
  hurt: '피격 (디버그)', die: '사망 (디버그)', slow: '슬로우 (디버그)', shade: '셰이더 (디버그)', compare: '통그림 비교 (디버그)',
};
export const DEFAULT_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['KeyZ', 'Space'], atk: ['KeyA', 'KeyX', 'KeyJ'],
  heavy: ['KeyF'], dash: ['KeyC', 'ShiftLeft', 'ShiftRight'], parry: ['KeyS'], sjump: ['KeyD'], phase: ['KeyE'], esc: ['Escape'], enter: ['Enter'],
  hurt: ['KeyH'], die: ['KeyK'], slow: ['KeyT'], shade: ['KeyG'], compare: ['KeyV'],
};
export const FX_KINDS = {
  trail: '칼빛 줄기', ghost: '잔상', dust: '먼지', hit: '타격 섬광', sfx: '효과음 글자', dmg: '데미지 숫자', slices: '속도선',
  spin: '회전·초승달', charge: '기 모으기·섬광', spark: '칼끝 불티', focus: '집중선', shake: '화면 흔들림', flash: '화면 번쩍',
  impact: '반전 컷', hitstop: '히트스톱', zoom: '줌·슬로우',
};
export const BONES = Object.keys(ZERO);
// 프레임 이벤트로 넣을 수 있는 이펙트 (dx·dy = 발 기준, 앞이 +x)
export const FX_EVENTS = { dust: '먼지', hit: '타격 섬광', slices: '속도선', sfx: '효과음 글자', charge: '기 모으기', spark: '불티', crescent: '초승달', spin: '회전 이펙트', flash: '화면 번쩍', shake: '흔들림', ghost: '잔상 1장', focus: '집중선' };

export const TUNE = { keys: structuredClone(DEFAULT_KEYS), fxOff: {}, motions: {} };

export function setTune(o) {
  TUNE.keys = { ...structuredClone(DEFAULT_KEYS), ...(o?.keys || {}) };
  TUNE.fxOff = { ...(o?.fxOff || {}) };
  TUNE.motions = structuredClone(o?.motions || {});
}
export const actionOf = code => { for (const a in TUNE.keys) if (TUNE.keys[a].includes(code)) return a; return null; };
export const fxOn = k => !TUNE.fxOff[k];
export const timeOf = key => TUNE.motions[key]?.time;
export const frameOf = t => Math.floor(t * FPS + 1e-6);
export const frameData = (key, i) => TUNE.motions[key]?.frames?.[i];
export function frameSet(key, i) {
  const m = TUNE.motions[key] ??= { frames: {} };
  return m.frames[i] ??= {};
}
// 비어 있는 프레임·동작 정리 (저장 크기 줄이기)
export function prune() {
  for (const k in TUNE.motions) {
    const F = TUNE.motions[k].frames;
    for (const i in F) {
      const f = F[i];
      if (f.pose && !Object.keys(f.pose).length) delete f.pose;
      if (f.radj) { for (const p in f.radj) if (!Object.keys(f.radj[p]).length) delete f.radj[p]; if (!Object.keys(f.radj).length) delete f.radj; }
      if (f.fx && !f.fx.length) delete f.fx;
      if (!Object.keys(f).length) delete F[i];
    }
    if (!Object.keys(F).length && !TUNE.motions[k].time) delete TUNE.motions[k];
  }
}
// 키 프레임 보간 (field = 'pose' | 'radj'): 두 키 사이는 선형, 키 바깥은 없음 (한 키만 있으면 그 프레임만). 값 = { 이름: 수 } 평평한 묶음
function keyed(key, t, field, flat, unflat) {
  const F = TUNE.motions[key]?.frames; if (!F) return null;
  const keys = Object.keys(F).filter(i => F[i][field]).map(Number).sort((a, b) => a - b);
  if (!keys.length) return null;
  const f = t * FPS;
  let a = null, b = null;
  for (const k of keys) { if (k <= f + 1e-6) a = k; if (k >= f - 1e-6 && b == null) b = k; }
  if (a != null && b != null) {
    const u = b === a ? 0 : (f - a) / (b - a), A = flat(F[a][field]), B = flat(F[b][field]), d = {};
    for (const n of new Set([...Object.keys(A), ...Object.keys(B)])) { const va = A[n] ?? flat.zero(n), vb = B[n] ?? flat.zero(n); d[n] = va + (vb - va) * u; }
    return unflat(d);
  }
  if (a != null && Math.floor(f) === a) return F[a][field];
  return null;
}
const poseFlat = Object.assign(o => o, { zero: () => 0 });
// 지금 시각의 자세 더하기 값 (도구가 새 키를 찍을 때 시작값)
export const poseDelta = (key, t) => keyed(key, t, 'pose', poseFlat, d => d) || {};
export function applyPose(key, t, p) {
  const d = keyed(key, t, 'pose', poseFlat, d => d); if (!d) return p;
  const q = { ...p };
  for (const bone in d) q[bone] = (q[bone] ?? ZERO[bone]) + d[bone];
  return q;
}
const radjFlat = Object.assign(o => { const d = {}; for (const p in o) for (const k in o[p]) d[p + '.' + k] = o[p][k]; return d; }, { zero: n => n.endsWith('.sc') || n.endsWith('.len') ? 1 : 0 });
const radjUnflat = d => { const o = {}; for (const n in d) { const [p, k] = n.split('.'); (o[p] ??= {})[k] = d[n]; } return o; };
// 프레임별 부위 위치 { 부위: { dx, dy, rot, sc } } (리그 덮어쓰기 위에 더해짐)
export const radjAt = (key, t) => key ? keyed(key, t, 'radj', radjFlat, radjUnflat) : null;

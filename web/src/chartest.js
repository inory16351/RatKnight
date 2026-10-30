// 캐릭터 테스트 도구 (web/chartest.html): 능력 켜고 끄기 · 조작 키 · 프레임별 자세/상태/이펙트 · 리깅 · 이펙트 색·그림 · 저장본 비교 · 게임 적용
// 게임 본체(main.js)를 테스트장 방으로 띄우고 __game 으로 조작.
// 편집 중인 것 = 저장본 한 묶음(튜닝 + 리그 덮어쓰기 + 이펙트) → 브라우저(rk_bundle)에 바로 저장. 이름 붙여 data/saves/<이름>.json, 게임 적용 = data/active.json
const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const k in attrs) k.startsWith('on') ? e[k] = attrs[k] : k === 'style' ? e.style.cssText = attrs[k] : e.setAttribute(k, attrs[k]); for (const k of kids.flat()) e.append(k?.nodeType ? k : String(k ?? '')); return e; };
const toast = t => { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.display = 'none', 1600); };

while (!globalThis.__game) await new Promise(r => setTimeout(r, 50));
globalThis.__onError = e => toast('오류: ' + (e?.message || e));   // 게임 화면 오류를 알림으로 (화면은 계속 돎)
addEventListener('unhandledrejection', e => toast('오류: ' + (e.reason?.message || e.reason)));
const g = __game, { TU, ABIL, P, G, PREVIEW, opt } = g;
const T = TU.TUNE;
const live = { b: null, a: null };   // 실제 조작에 B 저장본을 잠깐 적용 중이면 b = 이름, a = 되돌릴 편집본
const save = () => { if (live.b) return; try { localStorage.setItem('rk_bundle', JSON.stringify(g.captureBundle())); localStorage.removeItem('rk_tune'); } catch (e) {} };

// ---------- 탭 ----------
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.id === 't-' + b.dataset.t));
  if (!['mo', 'rig', 'cmp'].includes(b.dataset.t) && PREVIEW.on) setPreview(false);
  ({ rig: renderRig, cmp: renderCmp, file: renderFile, fx: renderFx })[b.dataset.t]?.();
});

// ---------- 능력 ----------
const AB_KEY = 'rk_ab';
try { for (const k of JSON.parse(localStorage.getItem(AB_KEY) || '[]')) G.ab.add(k); } catch (e) {}
const saveAb = () => { try { localStorage.setItem(AB_KEY, JSON.stringify([...G.ab])); } catch (e) {} };
const god = { on: false };
setInterval(() => { if (god.on && P.state !== 'dead') P.hp = G.maxHp; }, 100);
const SPOTS = [['출발', 200], ['① 가시밭', 820], ['③ 선반', 1420], ['② 패링 갱', 1950], ['④ 절벽', 2700], ['⑤ 두꺼운 벽', 3400], ['⑥ 벽 차기', 4200], ['⑦ 적', 4800]];
const COMBOS = [];
for (const t1 of [['dash3', 'parry'], ['dash3', 'dj'], ['parry', 'dj']]) for (const t2 of ['sjump', 'phase']) COMBOS.push([...t1, t2]);
function renderAb() {
  const el = $('#t-ab'); el.innerHTML = '';
  el.append(h('h4', {}, '보유 능력 (켜면 바로 조작 가능)'));
  for (const k in ABIL) {
    const a = ABIL[k], on = G.ab.has(k);
    el.append(h('label', { class: 'ab', style: `--c:${a.color}` },
      h('input', { type: 'checkbox', ...(on ? { checked: '' } : {}), onchange: e => { e.target.checked ? G.ab.add(k) : G.ab.delete(k); saveAb(); } }),
      h('b', {}, `${a.id ? a.id + ' · ' : ''}${a.name}${a.tier ? ` (${a.tier}티어)` : ''}`), h('small', {}, a.desc)));
  }
  el.append(h('div', { class: 'row' },
    h('button', { class: 'b', onclick: () => { for (const k in ABIL) G.ab.add(k); saveAb(); renderAb(); } }, '전부 켜기'),
    h('button', { class: 'b', onclick: () => { G.ab.clear(); saveAb(); renderAb(); } }, '전부 끄기')));
  el.append(h('h4', {}, '선택 조합 12가지 중 하나 (1티어 2 + 2티어 1, 벽 차기·레벨 기술 포함)'));
  const sel = h('select', { onchange: e => { const c = COMBOS[e.target.value]; if (!c) return; G.ab.clear(); for (const k of [...c, 'wall', 'plunge', 'charge']) G.ab.add(k); saveAb(); renderAb(); } },
    h('option', { value: '' }, '조합 고르기'), COMBOS.map((c, i) => h('option', { value: i }, c.map(k => `${ABIL[k].id} ${ABIL[k].name}`).join(' + '))));
  el.append(sel);
  el.append(h('h4', {}, '시험 구간으로 이동'));
  el.append(h('div', { class: 'row' }, SPOTS.map(([n, x]) => h('button', { class: 'b', onclick: () => { setPreview(false); P.x = x; P.y = 600; P.vx = 0; P.vy = 0; g.respawnHere(); } }, n))));
  el.append(h('h4', {}, '보기 · 편의'));
  el.append(h('div', { class: 'row' },
    h('label', {}, h('input', { type: 'checkbox', ...(god.on ? { checked: '' } : {}), onchange: e => god.on = e.target.checked }), '체력 고정'),
    h('label', {}, h('input', { type: 'checkbox', ...(opt.colliders ? { checked: '' } : {}), onchange: e => opt.colliders = e.target.checked }), '판정 도형 보기'),
    h('label', {}, h('input', { type: 'checkbox', ...(opt.slow ? { checked: '' } : {}), onchange: e => opt.slow = e.target.checked }), '슬로우 ×0.25')));
  el.append(h('p', { class: 'hint' }, '기본 키: ← → 이동 · Z 점프 · A 공격 · C 대시 · F 길게 충전 돌진 · S 패링 · D 슈퍼점프 · E 벽통과. ', h('br'),
    '가시에 찔리면 마지막으로 안전하게 섰던 자리로 돌아감. 패링 창 안에 가시·적 공격이 닿으면 튕김·받아넘김.'));
}

// ---------- 조작 키 ----------
let capture = null;
addEventListener('keydown', e => {
  if (!capture) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.code !== 'Escape') {
    for (const a in T.keys) if (a !== capture) { const i = T.keys[a].indexOf(e.code); if (i >= 0) { T.keys[a].splice(i, 1); toast(`${e.code} 를 '${TU.ACTIONS[a]}' 에서 뺐음`); } }
    if (!T.keys[capture].includes(e.code)) T.keys[capture].push(e.code);
    save();
  }
  capture = null; globalThis.__keyCapture = false; renderKeys();
}, true);
function renderKeys() {
  const el = $('#t-keys'); el.innerHTML = '';
  el.append(h('h4', {}, '동작별 키 (여러 개 가능, + 누른 뒤 원하는 키 입력 · Esc 취소)'));
  const tb = h('table');
  for (const a in TU.ACTIONS) {
    tb.append(h('tr', {}, h('td', {}, TU.ACTIONS[a]), h('td', {},
      (T.keys[a] || []).map(code => h('span', { class: 'key' }, code.replace(/^Key|^Digit/, ''), h('i', { onclick: () => { T.keys[a] = T.keys[a].filter(c => c !== code); save(); renderKeys(); } }, '×'))),
      h('button', { class: 'b' + (capture === a ? ' on' : ''), onclick: () => { capture = a; globalThis.__keyCapture = true; renderKeys(); } }, capture === a ? '키 입력…' : '+'))));
  }
  el.append(tb);
  el.append(h('div', { class: 'row' }, h('button', { class: 'b warn', onclick: () => { T.keys = structuredClone(TU.DEFAULT_KEYS); save(); renderKeys(); toast('기본 키로 되돌림'); } }, '기본 키로 되돌리기')));
}

// ---------- 프레임 편집 ----------
const BONE_R = { x: [-60, 60, 1], y: [-60, 60, 1], swL: [-1, 1, 0.02], swBack: [-1, 1, 1], sheath: [-1, 1, 1], sq: [-0.5, 0.5, 0.01] };
const BONE_NAME = { x: '몸 x', y: '몸 y', rot: '몸 기울기', torso: '몸통', head: '머리', nU: '칼팔 위', nF: '칼팔 아래', fU: '빈팔 위', fF: '빈팔 아래', sw: '칼 각도', swL: '칼 길이', swBack: '칼 뒤로', sheath: '칼 등에', nT: '앞 허벅지', nS: '앞 정강이', fT: '뒤 허벅지', fS: '뒤 정강이', cape: '망토', tail: '꼬리', sq: '눌림' };
let cur = 0, clip = null;
function setPreview(on) {
  PREVIEW.on = on;
  if (!on) { PREVIEW.play = false; P.state = 'move'; P.t = 0; P.ground = false; }
  renderMo();
}
const nFrames = () => Math.max(1, Math.round(g.motionLen(PREVIEW.key) * TU.FPS) + 1);
function goFrame(i) { cur = Math.max(0, Math.min(nFrames() - 1, i)); PREVIEW.t = cur / TU.FPS; PREVIEW.play = false; if (!PREVIEW.on) PREVIEW.on = true; renderMo(); renderBar(); }
function phaseOf(key, t) { const c = g.atkDef(key); if (!c) return ''; return t < c.wind ? 'wind' : t < c.wind + c.act ? 'act' : 'rec'; }
function marks(f) {
  if (!f) return '';
  return (f.pose ? '●' : '') + (f.radj ? '◇' : '') + (f.inv ? '무' : '') + (f.hit === 'on' ? '판' : f.hit === 'off' ? '✕' : '') + (f.cancel ? 'C' : '') + (f.fx?.length ? '✦' : '') + (f.trail === false || f.trailW != null ? '칼' : '') + (f.ghost === false ? '잔' : '') + (f.speed != null ? '속' : '') + (f.parry ? '패' : '');
}
// 길이를 바꿀 때 프레임 키를 비율대로 옮김 (겹치면 뒤에 온 것과 합침)
let remapKeys = false;
function remapFrames(key, n0, n1) {
  const F = T.motions[key]?.frames; if (!F || n0 < 2) return;
  const out = {};
  for (const i of Object.keys(F).map(Number).sort((a, b) => a - b)) { const j = Math.round(i * (n1 - 1) / (n0 - 1)); out[j] = { ...(out[j] || {}), ...F[i] }; }
  T.motions[key].frames = out;
}
// 되돌리기: frame = 이 프레임 · motion = 이 동작 · rig = 리그 덮어쓰기(옆·정면) · allMotions = 모든 동작의 자세·부위 위치 키
async function resetRig(scope) {
  const key = PREVIEW.key, strip2 = f => { delete f.pose; delete f.radj; };
  const msg = { frame: `${key} ${cur}프레임의 리깅(자세·부위 위치)`, frameAll: `${key} ${cur}프레임의 모든 수정`, motion: `${key} 모든 프레임의 리깅`, motionAll: `${key}의 모든 수정(길이 포함)`, rig: '전체 리깅(리그 뼈대·그림 수정, 옆·정면 모두)', allMotions: '모든 동작의 프레임별 리깅' }[scope];
  if (!confirm(`${msg}을(를) 원래대로 되돌릴까요?`)) return;
  if (scope === 'frame') { const f = TU.frameData(key, cur); if (f) strip2(f); }
  else if (scope === 'frameAll') { if (T.motions[key]) delete T.motions[key].frames[cur]; }
  else if (scope === 'motionAll') { delete T.motions[key]; cur = Math.min(cur, nFrames() - 1); }
  else if (scope === 'motion') { for (const f of Object.values(T.motions[key]?.frames || {})) strip2(f); }
  else if (scope === 'allMotions') { for (const m of Object.values(T.motions)) for (const f of Object.values(m.frames || {})) strip2(f); }
  else { rigEdit.side = {}; rigEdit.front = {}; await g.setRigPatch('side', {}); await g.setRigPatch('front', {}); }
  TU.prune(); save(); renderMo(); renderRig(); renderBar(); toast('되돌림');
}
function upd(fn) { fn(TU.frameSet(PREVIEW.key, cur)); TU.prune(); save(); renderMo(); }
// ---------- 화면 조각 도우미: 드롭다운 · 접히는 카드 · 표시 칩 ----------
// 하나만 고를 수 있는 묶음 = 드롭다운(pick) · 관련 기능 묶음 = 카드(card, 접힘 상태 기억) · 상태 표시 = 칩(chip)
const pick = (label, items, value, on, title = '') => h('label', { class: 'pick', title }, label ? h('span', {}, label) : '',
  h('select', { onchange: e => on(e.target.value) }, items.map(([v, n]) => h('option', { value: v, ...(String(v) === String(value) ? { selected: '' } : {}) }, n))));
const OPEN = JSON.parse(localStorage.getItem('rk_cards') || '{}');
function card(id, title, color, body, { open = true, tools = [] } = {}) {
  const d = h('details', { class: 'card', style: `--cc:${color}`, ...((OPEN[id] ?? open) ? { open: '' } : {}) },
    h('summary', {}, h('span', { class: 'ct' }, title), h('span', { class: 'ctools', onclick: e => e.stopPropagation() }, tools)));
  d.addEventListener('toggle', () => { OPEN[id] = d.open; try { localStorage.setItem('rk_cards', JSON.stringify(OPEN)); } catch (e) {} });
  d.append(...[body].flat().filter(Boolean)); return d;
}
const chip = (text, color, title = '') => h('span', { class: 'chip', style: `--k:${color}`, title }, text);
const PHASE = { wind: ['예비', '#5b74c4'], act: ['휘두르기', '#e0a92c'], rec: ['회복', '#4a5080'] };
const MOTION_NAME = { slash1: '1타', slash2: '2타', slash3: '3타 회전', heavy1: '강공격 1 (안 씀)', heavyC: '충전 (모으기)', heavy2: '충전 돌진', heavy3: '돌진 마무리', air: '공중 회전', plunge: '내려찍기', dash: '대시', parry: '패링', sjump: '슈퍼점프', hurt: '피격', death: '사망' };
const motionName = k => MOTION_NAME[k] ? `${MOTION_NAME[k]} (${k})` : k;
// 프레임에 걸린 수정 → 칩들 (타임라인·박스와 같은 색)
function frameChips(f) {
  if (!f) return [chip('수정 없음', '#5a6396')];
  return [f.pose && chip('● 자세 키', '#ff3d7f'), f.radj && chip('◇ 부위 위치', '#ffb347'), f.inv && chip('무적', '#7ee2a8'), f.hit && chip(f.hit === 'on' ? '판정 켬' : '판정 끔', f.hit === 'on' ? '#7ee2a8' : '#ff5d73'),
    f.cancel && chip('캔슬', '#2fe6ff'), f.speed != null && chip(`속도 ×${f.speed}`, '#c79bff'), f.fx?.length && chip(`이펙트 ${f.fx.length}`, '#c79bff'), (f.trail === false || f.trailW != null) && chip('칼빛', '#c79bff'),
    f.ghost === false && chip('잔상 끔', '#c79bff'), f.parry != null && chip(f.parry ? '패링 창 켬' : '패링 창 끔', '#2f9e5b')].filter(Boolean);
}
// 뼈 묶음 (몸 부위별)
const BONE_GROUP = [['몸 전체', '#e8e6f4', ['x', 'y', 'rot', 'sq']], ['몸통 · 머리', '#e8e6f4', ['torso', 'head']], ['칼 팔 (가까운)', '#2fe6ff', ['nU', 'nF']], ['칼', '#f2b33d', ['sw', 'swL', 'swBack', 'sheath']],
  ['빈 팔 (먼)', '#9b8cff', ['fU', 'fF']], ['가까운 다리', '#2fe6ff', ['nT', 'nS']], ['먼 다리', '#9b8cff', ['fT', 'fS']], ['망토 · 꼬리', '#e8e6f4', ['cape', 'tail']]];

function renderMo() {
  const el = $('#t-mo'), key = PREVIEW.key; el.innerHTML = '';
  const fd = TU.frameData(key, cur) || {}, ph = phaseOf(key, cur / TU.FPS);
  renderStrip();
  // 머리: 지금 동작 · 프레임 · 단계 · 걸린 수정
  el.append(h('div', { class: 'head' },
    h('div', { class: 'big' }, motionName(key)),
    h('div', { class: 'row' }, h('b', { style: 'font-size:15px' }, `${cur}`), h('span', { class: 'hint' }, `/ ${nFrames() - 1} 프레임 · ${(cur / TU.FPS).toFixed(3)}초`), ph ? chip(PHASE[ph][0], PHASE[ph][1]) : '',
      PREVIEW.on ? chip('미리보기', '#f2b33d') : chip('실제 조작 중', '#7ee2a8')),
    h('div', { class: 'row' }, frameChips(TU.frameData(key, cur)))));

  // 자세 (키 프레임)
  const pose = fd.pose || {}, sliders = [];
  for (const [gname, gcol, bones] of BONE_GROUP) {
    sliders.push(h('div', { class: 'bgrp', style: `--gc:${gcol}` }, gname));
    for (const b of bones) {
      const [lo, hi, st] = BONE_R[b] || [-180, 180, 1], v = pose[b] || 0;
      const set = val => upd(f => { f.pose = f.pose || {}; if (Math.abs(val) < 1e-9) delete f.pose[b]; else f.pose[b] = val; });
      const num = h('input', { type: 'number', step: st, value: Math.round(v * 100) / 100, onchange: e => set(+e.target.value) });
      const fill = (x) => `--a:${(Math.min(0, x) - lo) / (hi - lo) * 100}%;--b:${(Math.max(0, x) - lo) / (hi - lo) * 100}%`;
      const rng = h('input', { type: 'range', min: lo, max: hi, step: st, value: v, style: fill(v), oninput: e => { num.value = e.target.value; rng.setAttribute('style', fill(+e.target.value)); TU.frameSet(key, cur).pose = { ...(TU.frameData(key, cur)?.pose || {}), [b]: +e.target.value }; }, onchange: e => set(+e.target.value) });
      sliders.push(h('div', { class: 'bone' + (v ? ' set' : '') }, h('span', {}, BONE_NAME[b] || b), rng, num, h('button', { class: 'mini', title: '0 으로', onclick: () => set(0), ...(v ? {} : { disabled: '' }) }, '↺')));
    }
  }
  el.append(card('pose', '자세 (이 프레임 키) — 원래 자세에 더함 · 키 사이 보간', '#ff3d7f', sliders, {
    tools: [h('button', { class: 'mini', title: '지금 보간된 값 그대로 키를 찍음 (보간 끝점)', onclick: () => upd(f => { f.pose = { ...TU.poseDelta(key, cur / TU.FPS) }; }) }, '+ 키'), h('button', { class: 'mini warn', onclick: () => upd(f => { delete f.pose; }) }, '키 지움')] }));

  // 상태
  el.append(card('state', '상태 (이 프레임)', '#7ee2a8', [
    h('div', { class: 'row' },
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', ...(fd.inv ? { checked: '' } : {}), onchange: e => upd(f => { e.target.checked ? f.inv = true : delete f.inv; }) }), '무적'),
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', ...(fd.cancel ? { checked: '' } : {}), onchange: e => upd(f => { e.target.checked ? f.cancel = true : delete f.cancel; }) }), '캔슬 가능 (점프·대시·다음 타)')),
    h('div', { class: 'row' },
      pick('공격 판정', [['', '자동'], ['on', '켜기'], ['off', '끄기']], fd.hit || '', v => upd(f => { v ? f.hit = v : delete f.hit; })),
      h('label', { class: 'pick' }, h('span', {}, '이동 속도 ×'), h('input', { type: 'number', step: 0.1, value: fd.speed ?? '', placeholder: '1', onchange: e => upd(f => { e.target.value === '' ? delete f.speed : f.speed = +e.target.value; }) }))),
    key === 'parry' ? h('div', { class: 'row' }, pick('패링 창', [['', '자동 (동작 길이 설정)'], ['on', '켜기'], ['off', '끄기']], fd.parry == null ? '' : fd.parry ? 'on' : 'off', v => upd(f => { v === '' ? delete f.parry : f.parry = v === 'on'; }))) : null]));

  // 이펙트 (이 프레임)
  const evs = (fd.fx || []).map((ev, j) => {
    const edit = (k, v) => upd(f => { f.fx[j][k] = v; });
    return h('div', { class: 'ev row' },
      pick('', Object.entries(TU.FX_EVENTS), ev.type, v => edit('type', v)),
      'x', h('input', { type: 'number', value: ev.dx || 0, onchange: e => edit('dx', +e.target.value) }),
      'y', h('input', { type: 'number', value: ev.dy || 0, onchange: e => edit('dy', +e.target.value) }),
      '크기', h('input', { type: 'number', step: 0.1, value: ev.s ?? 1, onchange: e => edit('s', +e.target.value) }),
      ev.type === 'sfx' ? h('input', { type: 'text', value: ev.text || '', placeholder: '글자', onchange: e => edit('text', e.target.value) }) : '',
      h('button', { class: 'mini warn', onclick: () => upd(f => { f.fx.splice(j, 1); }) }, '×'));
  });
  el.append(card('fx', '이펙트 (이 프레임)', '#c79bff', [
    h('div', { class: 'row' },
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', ...(fd.trail === false ? { checked: '' } : {}), onchange: e => upd(f => { e.target.checked ? f.trail = false : delete f.trail; }) }), '칼빛 끄기'),
      h('label', { class: 'pick' }, h('span', {}, '칼빛 굵기 ×'), h('input', { type: 'number', step: 0.1, value: fd.trailW ?? '', placeholder: '1', onchange: e => upd(f => { e.target.value === '' ? delete f.trailW : f.trailW = +e.target.value; }) })),
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', ...(fd.ghost === false ? { checked: '' } : {}), onchange: e => upd(f => { e.target.checked ? f.ghost = false : delete f.ghost; }) }), '잔상 끄기')),
    ...evs,
    h('div', { class: 'row' }, h('button', { class: 'b', onclick: () => upd(f => { (f.fx ||= []).push({ type: 'dust', dx: 0, dy: 0, s: 1 }); }) }, '+ 이펙트 이벤트'), h('span', { class: 'hint' }, 'x·y = 발 기준 (앞 +x, 위 -y)'))]));

  // 동작 길이 (프레임 수)
  { const base = g.A.ATTACKS[key], tm = T.motions[key]?.time || {}, F = TU.FPS, fr = s => Math.round(s * F);
    const setT = (k, v) => {
      const n0 = nFrames(), m = T.motions[key] ??= { frames: {} };
      m.time = { ...(m.time || {}), [k]: v }; if (v == null) delete m.time[k]; if (!Object.keys(m.time).length) delete m.time;
      const n1 = nFrames(); if (remapKeys && n0 !== n1) remapFrames(key, n0, n1);
      TU.prune(); save(); cur = Math.min(cur, n1 - 1); PREVIEW.t = cur / F; renderMo(); renderBar();
    };
    const body = [];
    if (base) {
      const segs = [['wind', '예비'], ['act', '휘두르기'], ['rec', '회복']], tot = segs.reduce((s, [k]) => s + fr(tm[k] ?? base[k]), 0) || 1;
      body.push(h('div', { class: 'lenbar' }, segs.map(([k, n]) => h('div', { style: `flex:${fr(tm[k] ?? base[k]) || 0.001};background:${PHASE[k][1]}`, title: `${n} ${fr(tm[k] ?? base[k])}프레임` }, fr(tm[k] ?? base[k]) / tot > 0.12 ? `${n} ${fr(tm[k] ?? base[k])}` : ''))));
      body.push(h('div', { class: 'row' }, ...segs.map(([k, n]) => h('label', { class: 'pick' }, h('span', { style: `color:${PHASE[k][1]}` }, n), h('input', { type: 'number', step: 1, min: 0, value: fr(tm[k] ?? base[k]), title: `원래 ${fr(base[k])}프레임 (${base[k]}초)`, onchange: e => setT(k, e.target.value === '' || +e.target.value === fr(base[k]) ? null : Math.max(0, +e.target.value) / F) })))));
    } else {
      const b0 = g.motionBase(key);
      body.push(h('div', { class: 'row' }, h('label', { class: 'pick' }, h('span', {}, '전체'), h('input', { type: 'number', step: 1, min: 2, value: nFrames(), onchange: e => { const n = Math.max(2, Math.round(+e.target.value)), sc = ((n - 1) / F) / b0; setT('scale', Math.abs(sc - 1) < 1e-6 ? null : sc); } }), h('span', {}, '프레임')),
        h('span', { class: 'hint' }, `원래 ${Math.round(b0 * F) + 1}프레임`)));
      if (key === 'parry') body.push(h('div', { class: 'row' }, h('label', { class: 'pick' }, h('span', { style: 'color:#2f9e5b' }, '받아넘김 창'), h('input', { type: 'number', step: 1, min: 0, value: fr(tm.win ?? 0.14 * (tm.scale || 1)), onchange: e => setT('win', e.target.value === '' ? null : Math.max(0, +e.target.value) / F) }), h('span', {}, '프레임')), h('span', { class: 'hint' }, '처음부터')));
    }
    body.push(h('div', { class: 'row' }, h('label', { class: 'tog', title: '길이를 바꿀 때 이미 찍은 프레임 키를 새 길이에 맞춰 비율대로 옮김' }, h('input', { type: 'checkbox', ...(remapKeys ? { checked: '' } : {}), onchange: e => remapKeys = e.target.checked }), '키를 비율대로 옮기기')));
    el.append(card('len', `동작 길이 — 지금 ${nFrames()}프레임`, '#5b74c4', body, { open: false,
      tools: Object.keys(tm).length ? [h('button', { class: 'mini warn', onclick: () => { const n0 = nFrames(); if (T.motions[key]) delete T.motions[key].time; const n1 = nFrames(); if (remapKeys && n0 !== n1) remapFrames(key, n0, n1); TU.prune(); save(); cur = Math.min(cur, n1 - 1); PREVIEW.t = cur / TU.FPS; renderMo(); } }, '원래 길이')] : [] })); }

  // 복사 · 되돌리기
  let target = 'frame';
  el.append(card('reset', '복사 · 되돌리기', '#ff5d73', [
    h('div', { class: 'row' },
      h('button', { class: 'b', onclick: () => { clip = structuredClone(TU.frameData(key, cur) || {}); toast(`${cur}프레임 복사`); } }, '이 프레임 복사'),
      h('button', { class: 'b', ...(clip ? {} : { disabled: '' }), onclick: () => { if (clip) upd(f => Object.assign(f, structuredClone(clip))); } }, '붙여넣기')),
    h('div', { class: 'row' }, pick('되돌릴 것', [['frame', '이 프레임 리깅 (자세·부위 위치)'], ['frameAll', '이 프레임 모든 수정'], ['motion', '이 동작 리깅'], ['motionAll', '이 동작 모든 수정 (길이 포함)'], ['rig', '전체 리깅 (리그 뼈대·그림)'], ['allMotions', '모든 동작 리깅']], target, v => target = v),
      h('button', { class: 'b warn', onclick: () => resetRig(target) }, '되돌리기'))], { open: false }));
}

// ---------- 그림 올리기: art/overrides/ 아래에 저장하고 프로젝트 기준 경로를 돌려줌 ----------
const pickFile = () => new Promise(ok => { const i = h('input', { type: 'file', accept: 'image/png,image/webp' }); i.onchange = () => ok(i.files[0] || null); i.click(); });
async function upload(file, tag) {
  const path = `art/overrides/${tag}_${Date.now()}.${file.name.endsWith('.webp') ? 'webp' : 'png'}`;
  const r = await fetch(`/__art?path=${encodeURIComponent(path)}`, { method: 'POST', body: file });
  if (!r.ok) { toast('그림 올리기 실패'); return null; }
  return path;
}
const thumb = (src, size = 44) => { const c = h('canvas', { width: size, height: size, style: `background:#0e1024;border-radius:4px;flex:none` }); if (src?.width) { const k = Math.min(size / src.width, size / src.height); c.getContext('2d').drawImage(src, (size - src.width * k) / 2, (size - src.height * k) / 2, src.width * k, src.height * k); } return c; };

// ---------- 리깅 ----------
// 부위마다 축(pivot) · 관절 자리 · 그림만 옮기기/돌리기/키우기 · 그림 바꾸기, 전체 크기 · 목 내림 · 겹침 순서. 값은 원본 그림 px 기준
const RIG_LABEL = { head: '머리', headHurt: '머리(아픔)', headBack: '뒷머리', torso: '몸통', hips: '엉덩이', cape: '망토 위', capeB: '망토 가운데', capeC: '망토 아래', upperArm: '위팔', foreArm: '아래팔·손', handOpen: '펼친 손', thigh: '허벅지', shin: '정강이', sword: '칼', tail: '꼬리' };
const JOINT_LABEL = { neck: '목', shoulderN: '가까운 어깨', shoulderF: '먼 어깨', shoulderL: '왼 어깨', shoulderR: '오른 어깨', cape: '망토 고리', waist: '허리', hipN: '가까운 엉덩이', hipF: '먼 엉덩이', hipL: '왼 엉덩이', hipR: '오른 엉덩이', tail: '꼬리 뿌리', elbow: '팔꿈치', hand: '손', knee: '무릎', sole: '발바닥', next: '다음 조각' };
let rigWhich = 'side', rigPart = 'head';
const rigEdit = { side: null, front: null };
let rigT = 0;
const rigNow = () => rigWhich === 'side' ? g.rig : g.frig;
function rigApply() { clearTimeout(rigT); rigT = setTimeout(async () => { await g.setRigPatch(rigWhich, rigEdit[rigWhich]); save(); renderRig(); }, 150); }
function renderRig() {
  const el = $('#t-rig'); el.innerHTML = '';
  if (live.b) el.append(h('p', { class: 'hint', style: 'color:#ff9a8a' }, `지금 실제 조작에 B(${live.b})가 적용 중 — [비교] 탭에서 A로 되돌린 뒤 편집하세요`));
  const R = rigNow(); if (!R) { el.append(h('p', { class: 'hint' }, '이 리그가 없음')); return; }
  const E = rigEdit[rigWhich] ??= structuredClone(g.RIGPATCH[rigWhich] || {});
  const def = R.def, base = R.base;
  if (!def.parts[rigPart]) rigPart = Object.keys(def.parts)[0];
  el.append(h('div', { class: 'row' }, pick('리그', [['side', '옆모습'], ['front', '정면 · 뒷모습 (몸이 돌 때)']], rigWhich, v => { rigWhich = v; renderRig(); }),
    chip(EDIT.scope === 'frame' ? '끌기 = 이 프레임만' : '끌기 = 전체 리깅', EDIT.scope === 'frame' ? '#ff3d7f' : '#f2b33d'), chip(EDIT.kids ? '자식 같이' : '자식 제자리', '#2fe6ff')));
  el.append(h('p', { class: 'hint' }, '값을 바꾸면 바로 다시 그림. 정면 리그는 3타 회전처럼 몸이 돌 때 보임. 좌표 = 원본 부위 그림 px.'));
  el.append(h('h4', {}, '전체'));
  el.append(h('div', { class: 'row' },
    '크기', h('input', { type: 'number', step: 0.001, value: def.scale, onchange: e => { E.scale = +e.target.value; rigApply(); } }),
    rigWhich === 'side' ? ['목 내림', h('input', { type: 'number', step: 1, value: def.neckDrop || 0, onchange: e => { E.neckDrop = +e.target.value; rigApply(); } })] : '',
    h('button', { class: 'b warn', onclick: () => { if (confirm('이 리그의 수정을 전부 지울까요?')) { rigEdit[rigWhich] = {}; rigApply(); } } }, '리그 전체 원래대로')));
  if (rigWhich === 'side') {
    el.append(h('h4', {}, '겹침 순서 (위 = 뒤, 아래 = 앞)'));
    const order = E.order || def.order || [...g.DRAW_ORDER];
    order.forEach((k, i) => el.append(h('div', { class: 'row' }, h('span', { style: 'width:170px' }, g.ORDER_NAME[k] || k),
      h('button', { class: 'b', onclick: () => { if (!i) return; const o = [...order]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; E.order = o; rigApply(); } }, '↑'),
      h('button', { class: 'b', onclick: () => { if (i === order.length - 1) return; const o = [...order]; [o[i + 1], o[i]] = [o[i], o[i + 1]]; E.order = o; rigApply(); } }, '↓'))));
    if (E.order) el.append(h('button', { class: 'b warn', onclick: () => { delete E.order; rigApply(); } }, '순서 원래대로'));
  }
  el.append(h('h4', {}, '부위 계층 (부모 → 자식, FK) — 하늘 = 가까운/왼 · 보라 = 먼/오른 · 흰 = 가운데'));
  const HH = g.HIER[rigWhich] || {}, SIDE = { n: '#2fe6ff', f: '#9b8cff', c: '#e8e6f4' };
  const tree = h('div', { style: 'font-size:12px;line-height:1.9' });
  const branch = (part, depth) => {
    if (!def.parts[part]) return;
    const hh = HH[part] || {}, on = part === rigPart, edited = E.parts?.[part] || TU.frameData(PREVIEW.key, cur)?.radj?.[part];
    tree.append(h('div', { style: `padding-left:${depth * 16}px;cursor:pointer;${on ? 'background:#3a3420;border-radius:3px' : ''}`, onclick: () => { rigPart = part; renderRig(); } },
      depth ? h('span', { style: 'color:#5a6396' }, '└ ') : '', h('b', { style: `color:${SIDE[hh.side || 'c']}` }, hh.name || part),
      h('span', { class: 'hint' }, `  ${part}${hh.joint ? ' @' + hh.joint : ''}${hh.ang ? ' · 돌림 ' + hh.ang : ''}`), edited ? h('span', { style: 'color:var(--gold)' }, ' *') : ''));
    for (const k of g.childrenOf(rigWhich, part)) branch(k, depth + 1);
  };
  for (const root of Object.keys(HH).filter(k => !HH[k].parent)) branch(root, 0);
  for (const k of Object.keys(def.parts).filter(k => !HH[k])) tree.append(h('div', { style: 'cursor:pointer', onclick: () => { rigPart = k; renderRig(); } }, h('b', {}, k), h('span', { class: 'hint' }, ' (계층 밖)')));
  el.append(tree);
  { const hh = HH[rigPart] || {}, kids = g.childrenOf(rigWhich, rigPart);
    el.append(h('div', { class: 'hint', style: 'margin-top:4px' }, `고른 부위: ${hh.name || rigPart} · 부모 ${hh.parent ? (HH[hh.parent]?.name || hh.parent) + ' (' + hh.joint + ' 관절)' : '없음 (뿌리)'} · 자식 ${kids.map(k => HH[k]?.name || k).join(', ') || '없음'}`)); }
  if (EDIT.scope === 'frame') {   // 이 프레임만: 부위 그림 위치 (키 프레임, 보간)
    const fr = TU.frameData(PREVIEW.key, cur)?.radj?.[rigPart] || {}, setF = (k, v) => { const f = frameStart(); f.radj[rigPart] = { dx: 0, dy: 0, rot: 0, sc: 1, len: 1, ...(f.radj[rigPart] || {}), [k]: v }; TU.prune(); save(); renderRig(); renderStrip(); };
    const n2 = (v, st, on) => h('input', { type: 'number', step: st, value: Math.round(v * 100) / 100, onchange: e => on(+e.target.value) });
    el.append(h('h4', {}, `이 프레임만 (${PREVIEW.key} · ${cur}프레임) — 부위 그림 위치`));
    el.append(h('div', { class: 'row' }, '본 길이 ×', n2(fr.len || 1, 0.05, v => setF('len', v)), h('span', { class: 'hint' }, '붙은 자식이 따라감')));
    el.append(h('div', { class: 'row' }, '파츠 크기 ×', n2(fr.len || 1, 0.05, v => { const f = frameStart(); f.radj[rigPart] = { dx: 0, dy: 0, rot: 0, sc: 1, len: 1, ...(f.radj[rigPart] || {}), len: v, sc: v }; TU.prune(); save(); renderRig(); renderStrip(); }), h('span', { class: 'hint' }, '본 길이 + 그림 배율 함께')));
    el.append(h('div', { class: 'row' }, '그림 x', n2(fr.dx || 0, 1, v => setF('dx', v)), 'y', n2(fr.dy || 0, 1, v => setF('dy', v)), '각도', n2(fr.rot || 0, 1, v => setF('rot', v)), '배율', n2(fr.sc || 1, 0.01, v => setF('sc', v)),
      h('button', { class: 'b warn', onclick: () => { const f = TU.frameData(PREVIEW.key, cur); if (f?.radj) delete f.radj[rigPart]; TU.prune(); save(); renderRig(); renderStrip(); } }, '지우기')));
    el.append(h('p', { class: 'hint' }, '아래 [프레임별] 상태에서 화면의 관절을 끌면 이 프레임 자세(각도) 키가 찍힘. 아래 전체 리깅 값은 모든 동작에 적용됨.'));
  }
  el.append(h('h4', {}, `전체 리깅 — ${RIG_LABEL[rigPart] || HH[rigPart]?.name || rigPart} (모든 동작·프레임)`));
  const a = def.parts[rigPart], b0 = base.parts[rigPart], q = () => ((E.parts ??= {})[rigPart] ??= {});
  g.CHARVIEW.sel = rigPart;
  const num = (v, step, on) => h('input', { type: 'number', step, value: Math.round(v * 100) / 100, onchange: e => on(+e.target.value) });
  el.append(h('div', { class: 'row' }, thumb(R[rigPart]?.img, 64), h('div', {},
    h('div', {}, `그림: ${a.file}`), h('div', { class: 'row' },
      h('button', { class: 'b', onclick: async () => { const f = await pickFile(); if (!f) return; const path = await upload(f, `rig_${rigWhich}_${rigPart}`); if (path) { q().file = path; rigApply(); toast('그림 바꿈 — 축·관절은 새 그림 px 로 다시 맞추세요'); } } }, '그림 바꾸기'),
      E.parts?.[rigPart]?.file ? h('button', { class: 'b warn', onclick: () => { delete q().file; rigApply(); } }, '원래 그림') : ''))));
  el.append(h('div', { class: 'row' }, '축 x', num(a.pivot[0], 1, v => { q().pivot = [v, a.pivot[1]]; rigApply(); }), 'y', num(a.pivot[1], 1, v => { q().pivot = [a.pivot[0], v]; rigApply(); }),
    h('span', { class: 'hint' }, `원래 ${Math.round(b0.pivot[0])}, ${Math.round(b0.pivot[1])}`)));
  for (const [j, v] of Object.entries(a.joints || {})) el.append(h('div', { class: 'row' }, h('span', { style: 'width:84px' }, JOINT_LABEL[j] || j),
    'x', num(v[0], 1, x => { (q().joints ??= {})[j] = [x, v[1]]; rigApply(); }), 'y', num(v[1], 1, y => { (q().joints ??= {})[j] = [v[0], y]; rigApply(); }),
    h('span', { class: 'hint' }, `원래 ${Math.round(b0.joints[j][0])}, ${Math.round(b0.joints[j][1])}`)));
  const adj = a.adj || {}, setAdj = (k, v) => { q().adj = { ...(q().adj || {}), [k]: v }; rigApply(); };
  el.append(h('h4', {}, '그림만 옮기기 · 돌리기 · 키우기 (붙은 관절은 그대로)'));
  el.append(h('div', { class: 'row' }, 'x', num(adj.dx || 0, 1, v => setAdj('dx', v)), 'y', num(adj.dy || 0, 1, v => setAdj('dy', v)), '각도', num(adj.rot || 0, 1, v => setAdj('rot', v)), '배율', num(adj.sc || 1, 0.01, v => setAdj('sc', v))));
  if (Object.keys(a.joints || {}).length) {   // 본 길이: 축에서 관절까지 거리를 한꺼번에 늘이고 줄임 (방향은 그대로) · 그림도 같이 = 그림 배율에도 곱함
    const f = h('input', { type: 'number', step: 0.05, value: 1 }), withImg = h('input', { type: 'checkbox' });
    el.append(h('div', { class: 'row' }, '본 길이 ×', f, h('label', {}, withImg, '그림도 같이 (= 파츠 크기)'), h('button', { class: 'b', onclick: () => {
      const k = +f.value || 1, J = (q().joints ??= {});
      for (const [j, v] of Object.entries(a.joints)) J[j] = [a.pivot[0] + (v[0] - a.pivot[0]) * k, a.pivot[1] + (v[1] - a.pivot[1]) * k];
      if (withImg.checked) q().adj = { ...(q().adj || {}), sc: (a.adj?.sc || 1) * k };
      rigApply(); } }, '적용')));
  }
  el.append(h('p', { class: 'hint' }, '화면 아래 [본·관절 보기]를 켜면 관절·축을 화면에서 직접 끌어 고칠 수 있음.'));
  if (E.parts?.[rigPart]) el.append(h('button', { class: 'b warn', onclick: () => { delete E.parts[rigPart]; rigApply(); } }, `${RIG_LABEL[rigPart] || rigPart} 원래대로`));
}

// ---------- 이펙트 ----------
function renderFx() {
  const el = $('#t-fx'); el.innerHTML = '';
  el.append(h('h4', {}, '이펙트 종류별 켜기 · 끄기'));
  el.append(h('div', {}, Object.keys(TU.FX_KINDS).map(k => h('label', { style: 'display:inline-flex;gap:4px;width:48%;margin:2px 0' }, h('input', { type: 'checkbox', ...(TU.fxOn(k) ? { checked: '' } : {}), onchange: e => { e.target.checked ? delete T.fxOff[k] : T.fxOff[k] = true; save(); } }), TU.FX_KINDS[k]))));
  el.append(h('div', { class: 'row' },
    h('button', { class: 'b', onclick: () => { T.fxOff = {}; save(); renderFx(); } }, '전부 켜기'),
    h('button', { class: 'b', onclick: () => { for (const k in TU.FX_KINDS) T.fxOff[k] = true; save(); renderFx(); } }, '전부 끄기'),
    h('button', { class: 'b on', onclick: () => { setPreview(false); P.state = 'move'; g.startAttack('slash1'); } }, '1타 휘둘러 보기')));
  const C = g.F.FXCOL, color = (v, on) => h('input', { type: 'color', value: v, onchange: e => { on(e.target.value); save(); } });
  el.append(h('h4', {}, '칼빛 색 · 크기'));
  el.append(h('div', { class: 'row' }, '나타날 때', color(C.white, v => C.white = v), '본색', color(C.base, v => C.base = v), '식을 때', color(C.cool[0], v => C.cool[0] = v), color(C.cool[1], v => C.cool[1] = v)));
  el.append(h('div', { class: 'row' }, '굵기 ×', h('input', { type: 'number', step: 0.1, value: C.trailW, onchange: e => { C.trailW = +e.target.value; save(); } }),
    '남는 시간 ×', h('input', { type: 'number', step: 0.1, value: C.trailLife, onchange: e => { C.trailLife = +e.target.value; save(); } }),
    h('button', { class: 'b warn', onclick: () => { Object.assign(C, structuredClone(g.F.FXCOL_DEFAULT)); save(); renderFx(); } }, '원래대로')));
  el.append(h('h4', {}, '데미지 숫자 색 [채움 · 어긋난 판]'));
  const D = g.F.DMG_STYLE, DN = { normal: '보통', crit: '빈틈', fin: '막타', boss: '보스' };
  for (const k in D) el.append(h('div', { class: 'row' }, h('span', { style: 'width:40px' }, DN[k] || k), color(D[k][0], v => D[k][0] = v), color(D[k][1], v => D[k][1] = v)));
  el.append(h('button', { class: 'b warn', onclick: () => { for (const k in D) D[k] = [...g.F.DMG_DEFAULT[k]]; save(); renderFx(); } }, '숫자 색 원래대로'));
  el.append(h('h4', {}, '이펙트 그림 바꾸기'));
  el.append(h('p', { class: 'hint' }, '같은 크기·같은 방향(오른쪽 보기)의 투명 PNG 로. 바꾼 그림은 art/overrides/ 에 저장되고 저장본에 경로가 남음.'));
  for (const k of Object.keys(g.F.IMG).sort()) {
    const changed = g.FXIMG[k];
    el.append(h('div', { class: 'row', style: 'margin:3px 0' }, thumb(g.F.IMG[k], 40), h('span', { style: 'width:110px' + (changed ? ';color:var(--gold)' : '') }, k),
      h('button', { class: 'b', onclick: async () => { const f = await pickFile(); if (!f) return; const path = await upload(f, `fx_${k}`); if (!path) return; g.FXIMG[k] = path; await g.F.replaceImg(k, '../' + path); save(); renderFx(); } }, '바꾸기'),
      changed ? h('button', { class: 'b warn', onclick: async () => { delete g.FXIMG[k]; await g.F.replaceImg(k, null); save(); renderFx(); } }, '원래대로') : ''));
  }
  el.append(h('p', { class: 'hint' }, '프레임마다 이펙트를 더하거나 칼빛·잔상을 끄는 건 [프레임] 탭에서.'));
}

// ---------- 저장본 목록 · 게임 적용 ----------
let saves = [];
const safeName = s => s.trim().replace(/[^\w가-힣-]+/g, '_').slice(0, 40);
async function listSaves() { try { saves = (await (await fetch('/__list?dir=saves', { cache: 'no-store' })).json()).sort((a, b) => b.time - a.time); } catch (e) { saves = []; } return saves; }
const loadSave = async name => (await fetch(`../data/saves/${encodeURIComponent(name)}.json`, { cache: 'no-store' })).json();
let activeName = g.activeSave;
async function setActive(name) {
  const r = name ? await fetch('/__data?name=active.json', { method: 'POST', body: JSON.stringify({ save: name }) }) : await fetch('/__data?name=active.json', { method: 'DELETE' });
  activeName = name; toast(name ? `게임에 '${name}' 적용 — index.html 을 새로 열면 반영` : '게임 적용 해제 (기본값 · data/tune.json)'); renderFile();
}
async function renderFile() {
  const el = $('#t-file'); el.innerHTML = '';
  el.append(h('p', { class: 'hint' }, '편집 중인 것(프레임 · 키 · 이펙트 · 리깅)은 브라우저에 바로 저장됨. 이름을 붙여 저장본으로 남기고, 그중 하나를 게임에 적용.'));
  const name = h('input', { type: 'text', placeholder: '저장본 이름', value: '' }), note = h('input', { type: 'text', placeholder: '메모 (선택)', style: 'width:100%' });
  el.append(h('h4', {}, '지금 편집 중인 것을 저장본으로'));
  el.append(h('div', { class: 'row' }, name, h('button', { class: 'b on', onclick: async () => {
    const n = safeName(name.value); if (!n) return toast('이름을 넣어 주세요');
    if (saves.some(s => s.name === n) && !confirm(`'${n}' 저장본을 덮어쓸까요?`)) return;
    TU.prune(); const b = { ...g.captureBundle(), name: n, note: note.value, savedAt: new Date().toISOString() };
    const r = await fetch(`/__data?dir=saves&name=${encodeURIComponent(n)}.json`, { method: 'POST', body: JSON.stringify(b, null, 1) });
    toast(r.ok ? `data/saves/${n}.json 저장됨` : '저장 실패'); renderFile(); } }, '저장')), note);
  el.append(h('h4', {}, '저장본'));
  el.append(h('div', { class: 'row' }, h('span', {}, '게임 적용 중: ', h('b', { style: 'color:var(--gold)' }, activeName || '없음 (기본값)')),
    activeName ? h('button', { class: 'b warn', onclick: () => setActive(null) }, '적용 해제') : ''));
  await listSaves();
  if (!saves.length) el.append(h('p', { class: 'hint' }, '아직 없음'));
  for (const s of saves) el.append(h('div', { class: 'ev' },
    h('div', {}, h('b', {}, s.name), s.name === activeName ? h('span', { style: 'color:var(--gold)' }, '  · 게임 적용 중') : '', h('span', { class: 'hint' }, '  ' + new Date(s.time).toLocaleString('ko-KR'))),
    h('div', { class: 'row' },
      h('button', { class: 'b', onclick: async () => { if (!confirm(`'${s.name}' 을 불러와 지금 편집 중인 것을 바꿀까요? (안 저장한 편집은 사라짐)`)) return; await g.applyBundle(await loadSave(s.name)); rigEdit.side = rigEdit.front = null; save(); renderAll(); toast(`'${s.name}' 불러옴`); } }, '편집으로 불러오기'),
      h('button', { class: 'b' + (s.name === activeName ? ' on' : ''), onclick: () => setActive(s.name) }, '게임에 적용'),
      h('button', { class: 'b', onclick: () => { cmpB = s.name; document.querySelector('[data-t=cmp]').click(); } }, 'B로 비교'),
      h('button', { class: 'b warn', onclick: async () => { if (!confirm(`'${s.name}' 저장본을 지울까요? (되돌릴 수 없음)`)) return; await fetch(`/__data?dir=saves&name=${encodeURIComponent(s.name)}.json`, { method: 'DELETE' }); if (s.name === activeName) await setActive(null); renderFile(); } }, '삭제'))));
  el.append(h('h4', {}, '지금 편집 중인 것 (JSON)'));
  const ta = h('textarea', { style: 'width:100%;height:200px;background:#12152b;color:var(--ink);border:1px solid var(--line);font:11px monospace' });
  ta.value = JSON.stringify(g.captureBundle(), null, 1);
  el.append(ta, h('div', { class: 'row' },
    h('button', { class: 'b', onclick: async () => { try { await g.applyBundle(JSON.parse(ta.value)); rigEdit.side = rigEdit.front = null; save(); renderAll(); toast('적용함'); } catch (e) { toast('JSON 오류'); } } }, '이 JSON 적용'),
    h('button', { class: 'b warn', onclick: async () => { if (confirm('편집 중인 것(키·이펙트·프레임·리깅)을 전부 기본값으로?')) { await g.applyBundle({}); rigEdit.side = rigEdit.front = null; setPreview(false); save(); renderAll(); renderBar(); toast('전부 기본값으로 — 실제 조작으로 돌아감'); } } }, '전부 기본값으로')));
}

// ---------- 비교 ----------
// A = 지금 편집 중인 것 · B = 고른 저장본. 차이 목록 + 미리보기에서 나란히/겹쳐 그리기 + 실제 조작에 B 를 잠깐 적용(Tab 으로 A↔B)
let cmpB = null, cmpMode = 'side';
const GROUP = { tune: '튜닝', rig: '리깅', fx: '이펙트' };
function flat(o, pre = '', out = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) { for (const k in o) flat(o[k], pre ? pre + '.' + k : k, out); return out; }
  out[pre] = JSON.stringify(o); return out;
}
function diffList(a, b) {
  const A = flat({ tune: a.tune, rig: a.rig, fx: a.fx }), B = flat({ tune: b.tune || {}, rig: b.rig || {}, fx: b.fx || {} }), out = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (A[k] !== B[k]) out.push([k, A[k], B[k]]);
  return out.sort((x, y) => x[0].localeCompare(y[0]));
}
const pretty = k => k.replace(/^tune\.motions\.(\w+)\.frames\.(\d+)\./, '$1 · $2프레임 · ').replace(/^tune\./, '튜닝 · ').replace(/^rig\.side\./, '옆 리그 · ').replace(/^rig\.front\./, '정면 리그 · ').replace(/^fx\./, '이펙트 · ');
async function liveSwap() {
  if (!cmpB) return toast('B 저장본을 먼저 고르세요');
  if (!live.b) { live.a = g.captureBundle(); live.b = cmpB; await g.applyBundle(await loadSave(cmpB)); toast(`실제 조작 = B (${cmpB})`); }
  else { const a = live.a; live.b = null; live.a = null; await g.applyBundle(a); toast('실제 조작 = A (편집 중)'); }
  renderCmp();
}
addEventListener('keydown', e => { if (e.code === 'Tab' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); liveSwap(); } });
async function renderCmp() {
  const el = $('#t-cmp'); el.innerHTML = '';
  await listSaves();
  el.append(h('div', { class: 'row' }, 'A = 지금 편집 중 · B =', h('select', { onchange: e => { cmpB = e.target.value || null; if (g.COMPARE.on) startCmp(); renderCmp(); } }, h('option', { value: '' }, '저장본 고르기'), saves.map(s => h('option', { value: s.name, ...(s.name === cmpB ? { selected: '' } : {}) }, s.name)))));
  if (!cmpB) { el.append(h('p', { class: 'hint' }, '[저장] 탭에서 저장본을 하나 이상 만든 뒤 고르세요.')); return; }
  el.append(h('h4', {}, '미리보기에서 나란히 보기 (자세 · 리깅)'));
  el.append(h('div', { class: 'row' },
    h('button', { class: 'b' + (g.COMPARE.on ? ' on' : ''), onclick: async () => { if (g.COMPARE.on) { await g.setCompare(null); } else await startCmp(); renderCmp(); } }, g.COMPARE.on ? '비교 끄기' : '비교 켜기'),
    h('select', { onchange: e => { cmpMode = e.target.value; g.COMPARE.mode = cmpMode; } }, h('option', { value: 'side', ...(cmpMode === 'side' ? { selected: '' } : {}) }, '나란히'), h('option', { value: 'overlay', ...(cmpMode === 'overlay' ? { selected: '' } : {}) }, '겹쳐서 (B = 파란 반투명)'))));
  el.append(h('p', { class: 'hint' }, '[프레임] 탭에서 동작·프레임을 고르고 ▶ 재생하면 A·B 가 같은 시간으로 움직임.'));
  el.append(h('h4', {}, '실제 조작으로 비교 (이펙트 · 손맛)'));
  el.append(h('div', { class: 'row' }, h('button', { class: 'b' + (live.b ? ' on' : ''), onclick: liveSwap }, live.b ? `지금 B (${live.b}) — A로 되돌리기` : 'B 적용해 조작해 보기'), h('span', { class: 'hint' }, '단축키 Tab')));
  if (live.b) el.append(h('p', { class: 'hint', style: 'color:#ff9a8a' }, 'B 적용 중엔 편집이 저장되지 않음. A로 되돌린 뒤 편집하세요.'));
  const d = diffList(live.a || g.captureBundle(), await loadSave(cmpB));
  el.append(h('h4', {}, `차이 ${d.length}건 (A → B)`));
  const tb = h('table');
  let last = '';
  for (const [k, a, b] of d.slice(0, 400)) {
    const grp = GROUP[k.split('.')[0]]; if (grp !== last) { tb.append(h('tr', {}, h('td', { colspan: 3, style: 'color:var(--gold);padding-top:8px' }, grp))); last = grp; }
    tb.append(h('tr', {}, h('td', { style: 'width:auto;color:var(--ink)' }, pretty(k)), h('td', { style: 'color:#ffe14a;width:70px' }, a ?? '—'), h('td', { style: 'color:#2fe6ff;width:70px' }, b ?? '—')));
  }
  el.append(d.length ? tb : h('p', { class: 'ok' }, '같음'));
}
async function startCmp() { if (!cmpB) return; await g.setCompare(await loadSave(cmpB), cmpMode); if (!PREVIEW.on) setPreview(true); }

// ---------- 보기: 인게임 뷰 / 캐릭터 확대 뷰 · 본·관절 보기 · 화면에서 끌어 고치기 ----------
// 관절(원) 끌기 = 그 관절 자리 옮김(붙은 부위가 따라 움직임) · 축(네모)이나 그림 끌기 = 축 자리 바꿈(그림이 관절에 대해 움직임)
// 끄는 동안은 리그를 바로 고치고(liveRig), 놓으면 리그 덮어쓰기에 적어 다시 만듦. 확대 뷰: 휠 = 배율, 가운데 버튼 끌기 = 화면 이동
const CVW = g.CHARVIEW, cvEl = document.getElementById('cv');
const EDIT = { scope: 'rig', kids: true, act: 'move' };   // act = 끌기 동작: rotate 회전 · move 이동 · length 본 길이 · scale 파츠 크기 (본 + 그림)
const ACTS = { rotate: '회전', move: '이동', length: '본 길이', scale: '파츠 크기 (본 + 그림)' };
// 아래 독 = 보기 · 동작 · 재생 막대 / 프레임 박스(타임라인 칸에 맞춤) / 타임라인
const dock = h('div', { id: 'dock' }), bar = h('div', { id: 'viewbar' }), bar2 = h('div', { id: 'viewbar2' }), strip = h('div', { id: 'strip' }), tl = h('canvas', { id: 'tl' });
dock.append(bar, bar2, strip, tl); document.body.append(dock);
// 독 높이(막대가 여러 줄로 접히면 커짐)만큼 게임 화면을 위로 줄임
new ResizeObserver(() => { const hh = dock.offsetHeight; if (globalThis.__bottomH === hh) return; globalThis.__bottomH = hh; $('#wrap').style.bottom = hh + 'px'; dispatchEvent(new Event('resize')); }).observe(dock);
const TL = { left: 74, keysOnly: false, rows: [['자세', '#ff3d7f'], ['무적', '#7ee2a8'], ['판정', '#ffd23a'], ['캔슬', '#2fe6ff'], ['이펙트', '#c79bff']] };
const keyFrames = () => Object.keys(T.motions[PREVIEW.key]?.frames || {}).filter(i => T.motions[PREVIEW.key].frames[i].pose || T.motions[PREVIEW.key].frames[i].radj).map(Number).sort((a, b) => a - b);
const editedFrames = () => Object.keys(T.motions[PREVIEW.key]?.frames || {}).map(Number).sort((a, b) => a - b);
function jumpKey(dir, list = keyFrames()) { const k = dir > 0 ? list.find(i => i > cur) : [...list].reverse().find(i => i < cur); if (k == null) return toast(dir > 0 ? '뒤에 키프레임 없음' : '앞에 키프레임 없음'); goFrame(k); }
const tlGeom = () => { const n = nFrames(); return { n, x0: TL.left, fw: Math.max(4, (tl.clientWidth - TL.left - 10) / n) }; };
function renderStrip() {
  strip.innerHTML = ''; strip.style.paddingLeft = TL.left + 'px';
  const { n, fw } = tlGeom(), key = PREVIEW.key;
  for (let i = 0; i < n; i++) {
    const f = TU.frameData(key, i), isKey = !!(f?.pose || f?.radj), wide = fw > 22;
    strip.append(h('div', { class: (i === cur ? 'cur ' : '') + 'ph-' + phaseOf(key, i / TU.FPS) + (isKey ? ' key' : '') + (TL.keysOnly && !isKey ? ' dim' : ''), 'data-i': i, title: `${i}프레임 ${marks(f)}`, style: `width:${fw - 2}px`, onclick: () => goFrame(i) },
      wide || i % 5 === 0 ? i : '', h('span', { class: 'm' }, wide ? marks(f) : isKey ? '◆' : f ? '•' : '')));
  }
}
function drawTL() {
  const d = devicePixelRatio || 1, W = tl.clientWidth, H = tl.clientHeight; if (!W || !H) return;
  if (tl.width !== Math.round(W * d) || tl.height !== Math.round(H * d)) { tl.width = Math.round(W * d); tl.height = Math.round(H * d); }
  const c = tl.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
  const { n, x0, fw } = tlGeom(), key = PREVIEW.key, A = g.atkDef(key), X = i => x0 + i * fw, rowH = Math.max(10, (H - 30) / TL.rows.length);
  c.fillStyle = '#12152b'; c.fillRect(0, 0, W, H);
  // 단계 띠 (예비 · 휘두르기 · 회복) + 자동 판정 순간
  for (let i = 0; i < n; i++) { const ph = phaseOf(key, i / TU.FPS); c.fillStyle = PHASE[ph]?.[1] || '#2a2f55'; c.fillRect(X(i), 0, fw - 1, 8); }
  if (A) {
    const sw = A.lunge >= 300 || A.sweep; c.fillStyle = 'rgba(255,93,115,0.18)';
    if (sw) c.fillRect(X(A.wind * TU.FPS), 8, A.act * TU.FPS * fw, H - 8);
    else { c.fillStyle = '#ff5d73'; c.fillRect(X((A.wind + A.act * A.hitAt) * TU.FPS) - 1, 8, 2, H - 8); }
  }
  // 범례 (단계 색)
  c.font = '10px "Noto Sans KR", sans-serif'; c.textBaseline = 'top';
  if (A) Object.values(PHASE).forEach(([n, col], k) => { c.fillStyle = col; c.fillRect(4, 2 + k * 8, 6, 6); c.fillStyle = '#8d8fb0'; c.font = '8px "Noto Sans KR", sans-serif'; c.fillText(n, 13, 1 + k * 8); });
  c.font = '10px "Noto Sans KR", sans-serif';
  // 눈금
  for (let i = 0; i <= n; i++) { const big = i % 5 === 0; c.fillStyle = big ? '#8d8fb0' : '#3d4580'; c.fillRect(X(i), 8, 1, big ? 10 : 5); if (big && i < n) { c.fillStyle = '#8d8fb0'; c.fillText(i % 10 === 0 ? `${i} · ${(i / TU.FPS).toFixed(2)}s` : String(i), X(i) + 2, 10); } }
  // 줄: 자세 키 ◆ · 무적 · 판정(켜기 초록 / 끄기 빨강) · 캔슬 · 이펙트
  TL.rows.forEach(([name, col], r) => {
    const y = 26 + r * rowH, cy = y + rowH / 2;
    c.fillStyle = r % 2 ? '#161a36' : '#14172e'; c.fillRect(0, y, W, rowH);
    c.fillStyle = '#8d8fb0'; c.textBaseline = 'middle'; c.fillText(name, 6, cy);
    for (let i = 0; i < n; i++) {
      const f = TU.frameData(key, i); if (!f) continue; const x = X(i);
      if (r === 0 && (f.pose || f.radj)) { c.fillStyle = f.pose ? col : '#ffb347'; c.beginPath(); c.moveTo(x + fw / 2, cy - 5); c.lineTo(x + fw / 2 + 5, cy); c.lineTo(x + fw / 2, cy + 5); c.lineTo(x + fw / 2 - 5, cy); c.fill(); }
      if (r === 1 && f.inv) { c.fillStyle = col; c.fillRect(x, cy - 3, fw, 6); }
      if (r === 2 && f.hit) { c.fillStyle = f.hit === 'on' ? '#7ee2a8' : '#ff5d73'; c.fillRect(x, cy - 3, fw, 6); }
      if (r === 3 && f.cancel) { c.fillStyle = col; c.fillRect(x, cy - 3, fw, 6); }
      if (r === 4 && (f.fx?.length || f.trail === false || f.trailW != null || f.ghost === false)) { c.fillStyle = col; c.beginPath(); c.arc(x + fw / 2, cy, 3.5, 0, 7); c.fill(); }
    }
    if (r === 0) { const K = keyFrames(); c.strokeStyle = 'rgba(255,61,127,0.5)'; c.lineWidth = 1; for (let k = 1; k < K.length; k++) { c.beginPath(); c.moveTo(X(K[k - 1]) + fw / 2, cy); c.lineTo(X(K[k]) + fw / 2, cy); c.stroke(); } }   // 보간 구간
  });
  c.fillStyle = 'rgba(242,179,61,0.18)'; c.fillRect(X(cur), 0, fw, H);                                       // 고른 프레임
  const t = PREVIEW.on ? PREVIEW.t : g.motionKey() === key ? g.fclock() : null;                                     // 재생 위치
  if (t != null) { const x = x0 + t * TU.FPS * fw; c.fillStyle = '#2fe6ff'; c.fillRect(x - 1, 0, 2, H); }
  const liveI = t != null ? TU.frameOf(t) : -1;
  strip.querySelectorAll('div').forEach(dv => dv.classList.toggle('live', +dv.dataset.i === liveI));
}
setInterval(drawTL, 50);
// 화면 왼쪽 위 상태 배지: 미리보기/조작 · 동작 · 프레임 · 단계 · 끌기 설정 · 고른 부위
const badge = h('div', { id: 'badge' }); document.body.append(badge);
setInterval(() => {
  const k = PREVIEW.on ? PREVIEW.key : g.motionKey(), t = PREVIEW.on ? PREVIEW.t : g.fclock(), ph = k && phaseOf(k, t);
  const parts = [PREVIEW.on ? chip('미리보기 · 게임 멈춤 (조작 키 = 실제 조작)', '#f2b33d') : chip('실제 조작', '#7ee2a8'), k ? h('b', {}, `${MOTION_NAME[k] || k} · ${TU.frameOf(t)}f`) : h('span', { class: 'hint' }, '대기'), ph ? chip(PHASE[ph][0], PHASE[ph][1]) : ''];
  if (CVW.bones) parts.push(chip(EDIT.scope === 'frame' ? '끌기: 이 프레임' : '끌기: 전체 리깅', EDIT.scope === 'frame' ? '#ff3d7f' : '#f2b33d'), chip(EDIT.kids ? '자식 같이' : '자식 제자리', '#2fe6ff'), CVW.sel ? h('span', {}, `부위: ${g.HIER[CVW.rig || 'side']?.[CVW.sel]?.name || CVW.sel}`) : '');
  if (live.b) parts.push(chip(`B 적용 중: ${live.b}`, '#ff5d73'));
  badge.replaceChildren(...parts.filter(Boolean));
}, 150);
const tip = h('div', { id: 'tltip' }); document.body.append(tip);
tl.addEventListener('mousemove', e => {
  const r = tl.getBoundingClientRect(), { n, x0, fw } = tlGeom(), i = Math.floor((e.clientX - r.left - x0) / fw);
  if (i < 0 || i >= n) { tip.style.display = 'none'; return; }
  const ph = phaseOf(PREVIEW.key, i / TU.FPS);
  tip.replaceChildren(h('b', {}, `${i}프레임 · ${(i / TU.FPS).toFixed(3)}초`), ph ? chip(PHASE[ph][0], PHASE[ph][1]) : '', h('div', { class: 'row' }, frameChips(TU.frameData(PREVIEW.key, i))));
  tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 240, e.clientX + 12) + 'px'; tip.style.top = (r.top - 70) + 'px';
});
tl.addEventListener('mouseleave', () => tip.style.display = 'none');
addEventListener('resize', () => renderStrip());
let scrub = false;
const scrubTo = e => { const r = tl.getBoundingClientRect(), { n, x0, fw } = tlGeom(), i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - x0) / fw))); cur = i; PREVIEW.on = true; PREVIEW.play = false; PREVIEW.t = i / TU.FPS; renderStrip(); };
tl.addEventListener('mousedown', e => { scrub = true; scrubTo(e); });
addEventListener('mousemove', e => { if (scrub) scrubTo(e); });
addEventListener('mouseup', () => { if (scrub) { scrub = false; renderMo(); renderBar(); } });
// 미리보기(게임 멈춤) 중 게임 조작 키를 누르면 바로 실제 조작으로
addEventListener('keydown', e => {
  if (!PREVIEW.on || capture || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const a = TU.actionOf(e.code);
  if (['left', 'right', 'jump', 'atk', 'dash', 'heavy', 'parry', 'sjump', 'phase'].includes(a)) { setPreview(false); renderBar(); toast('실제 조작으로 전환 (미리보기 = 게임 멈춤)'); }
});
// 단축키: , . = 앞뒤 프레임 · [ ] = 앞뒤 키프레임 (입력칸 밖에서)
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || capture) return;
  if (e.code === 'Comma') goFrame(cur - 1); else if (e.code === 'Period') goFrame(cur + 1);
  else if (e.code === 'BracketLeft') jumpKey(-1); else if (e.code === 'BracketRight') jumpKey(1);
});
function renderBar() {
  // 윗줄 = 화면 보기 · 표시 / 끌어서 고치기 설정 · 아랫줄(bar2) = 동작 · 재생 (타임라인 바로 위)
  const tg = (label, on, fn, title = '') => h('label', { class: 'tg' + (on ? ' on' : ''), title }, h('input', { type: 'checkbox', ...(on ? { checked: '' } : {}), onchange: e => { fn(e.target.checked); renderBar(); } }), label);
  bar.innerHTML = '';
  bar.append(
    h('div', { class: 'grp' }, h('span', { class: 'gl' }, '보기'),
      pick('', [['game', '인게임 뷰'], ['zoom', '캐릭터 확대']], CVW.zoom ? 'zoom' : 'game', v => { CVW.zoom = v === 'zoom'; CVW.dx = CVW.dy = 0; renderBar(); }),
      CVW.zoom ? [h('button', { class: 'mini', onclick: () => { CVW.k = Math.max(1.5, CVW.k / 1.25); renderBar(); } }, '−'), h('span', { class: 'num' }, `×${CVW.k.toFixed(1)}`), h('button', { class: 'mini', onclick: () => { CVW.k = Math.min(14, CVW.k * 1.25); renderBar(); } }, '+')] : ''),
    h('div', { class: 'grp' }, h('span', { class: 'gl' }, '표시'),
      tg('본·관절', CVW.bones, v => CVW.bones = v, '원 = 관절 · 네모 = 축 · 쐐기 = 본(부모 → 자식)'),
      CVW.bones ? [tg('이름', CVW.labels, v => CVW.labels = v), h('input', { type: 'range', class: 'sz', min: 0.5, max: 2.5, step: 0.1, value: CVW.size, title: '본·관절 크기', oninput: e => CVW.size = +e.target.value })] : '',
      tg('어니언 스킨', PREVIEW.onion, v => PREVIEW.onion = v, '미리보기에서 이전 프레임 = 파랑, 다음 프레임 = 핑크 (40%)'),
      tg('판정 도형', opt.colliders, v => opt.colliders = v), tg('도트화', g.PIX.on, v => g.PIX.on = v)),
    h('div', { class: 'grp' + (CVW.bones ? '' : ' off'), title: CVW.bones ? '' : '본·관절을 켜면 화면에서 끌어 고칠 수 있음' }, h('span', { class: 'gl' }, '끌어서 고치기'),
      pick('범위', [['rig', '전체 리깅 (모든 동작)'], ['frame', '이 프레임만 (키)']], EDIT.scope, v => { EDIT.scope = v; EDIT.act = v === 'frame' ? 'rotate' : 'move'; if (v === 'frame') { CVW.bones = true; if (!PREVIEW.on) setPreview(true); } renderBar(); renderRig(); },
        '전체 리깅 = 리그 자체를 고침 · 이 프레임만 = 관절 끌기 = 그 부위 돌리기 · Shift + 관절 끌기 = 본 길이 · Alt 끌기 = 그림 위치'),
      pick('동작', Object.entries(ACTS), EDIT.act, v => { EDIT.act = v; renderBar(); renderRig(); }, '끌어서 할 일 (Shift = 본 길이 · Alt = 이동 으로 잠깐 바꿀 수 있음)'),
      pick('자식', [['with', '같이 움직임'], ['stay', '제자리 (개별)']], EDIT.kids ? 'with' : 'stay', v => { EDIT.kids = v === 'with'; renderBar(); })));
  // 아랫줄: 동작 · 상태 · 재생
  const ms = h('select', { onchange: e => { PREVIEW.key = e.target.value; cur = 0; PREVIEW.t = 0; PREVIEW.on = true; renderMo(); renderBar(); } },
    h('optgroup', { label: '공격' }, g.MOTIONS().filter(k => g.A.ATTACKS[k]).map(k => h('option', { value: k, ...(k === PREVIEW.key ? { selected: '' } : {}) }, motionName(k)))),
    h('optgroup', { label: '이동 · 그 밖' }, g.MOTIONS().filter(k => !g.A.ATTACKS[k]).map(k => h('option', { value: k, ...(k === PREVIEW.key ? { selected: '' } : {}) }, motionName(k)))));
  const ph = phaseOf(PREVIEW.key, cur / TU.FPS);
  bar2.innerHTML = '';
  bar2.append(
    h('div', { class: 'grp' }, h('span', { class: 'gl' }, '동작'), ms,
      pick('', [['preview', '미리보기 (멈춤)'], ['live', '실제 조작']], PREVIEW.on ? 'preview' : 'live', v => { setPreview(v === 'preview'); renderBar(); }, '미리보기 = 게임을 멈추고 고른 프레임 자세를 봄')),
    h('div', { class: 'grp' }, h('span', { class: 'gl' }, '재생'),
      h('button', { class: 'mini', title: '이전 키프레임 ( [ )', onclick: () => jumpKey(-1) }, '◆◀'), h('button', { class: 'mini', title: '이전 프레임 ( , )', onclick: () => goFrame(cur - 1) }, '◀'),
      h('button', { class: 'b' + (PREVIEW.play ? ' on' : ''), style: 'min-width:64px', onclick: () => { PREVIEW.on = true; PREVIEW.play = !PREVIEW.play; renderBar(); } }, PREVIEW.play ? '■ 정지' : '▶ 재생'),
      h('button', { class: 'mini', title: '다음 프레임 ( . )', onclick: () => goFrame(cur + 1) }, '▶'), h('button', { class: 'mini', title: '다음 키프레임 ( ] )', onclick: () => jumpKey(1) }, '▶◆'),
      pick('', [0.1, 0.25, 0.5, 1].map(v => [v, `×${v}`]), PREVIEW.speed, v => PREVIEW.speed = +v, '재생 속도'),
      tg('키프레임만', TL.keysOnly, v => { TL.keysOnly = v; renderStrip(); }, '키프레임이 아닌 칸을 흐리게')),
    h('div', { class: 'grp now' }, h('b', {}, `${cur}`), h('span', { class: 'hint' }, `/ ${nFrames() - 1}`), ph ? chip(PHASE[ph][0], PHASE[ph][1]) : '', h('span', { class: 'hint' }, ', . 프레임 · [ ] 키프레임')));
}
renderBar();
const dev = e => { const r = cvEl.getBoundingClientRect(); return [(e.clientX - r.left) * cvEl.width / r.width, (e.clientY - r.top) * cvEl.height / r.height]; };
function hitBone(x, y) {
  const s = CVW.size * (devicePixelRatio || 1), caps = CVW.cap;
  const order = [...caps].sort((a, b) => (b.name === CVW.sel) - (a.name === CVW.sel) || a.far - b.far);
  let best = null, bd = 1e9;   // 겹친 관절 중 가장 가까운 것 (고른 부위 · 가까운 쪽 부위를 조금 우대)
  for (const c of order) {
    const jl = c.j, bias = (c.name === CVW.sel ? -3 : 0) + (c.far ? 2 : 0);
    for (const [jn, j] of Object.entries(jl)) { const q = c.m.transformPoint(new DOMPoint(j[0], j[1])), d = Math.hypot(q.x - x, q.y - y); if (d < 9 * s && d + bias < bd) { bd = d + bias; best = { kind: 'joint', c, jn }; } }
    const q = c.m.transformPoint(new DOMPoint(0, 0)), d = Math.hypot(q.x - x, q.y - y); if (d < 8 * s && d + (c.far ? 2 : 0) + 4 < bd) { bd = d + (c.far ? 2 : 0) + 4; best = { kind: 'pivot', c }; }   // 관절과 자식 축이 겹치면 관절(본 끝)이 먼저
  }
  if (best) return best;
  for (const c of [...caps].reverse()) { if (c.far) continue; const l = c.m.inverse().transformPoint(new DOMPoint(x, y)); if (l.x >= -c.p.px && l.x <= c.p.w - c.p.px && l.y >= -c.p.py && l.y <= c.p.h - c.p.py) return { kind: 'image', c }; }
  return null;
}
// 편집 범위: scope = 'rig' 전체 리깅(리그 덮어쓰기, 모든 동작·프레임) | 'frame' 프레임별(지금 동작의 고른 프레임에 키)
// kids = true 자식과 함께 | false 개별 (자식은 화면에서 제자리에 남도록 보정)
// 프레임별: 관절·그림 끌기 = 그 부위를 축 둘레로 돌림(FK 자세 키) · 엉덩이 = 몸 위치 · Alt 끌기(또는 돌릴 값 없는 부위·정면 리그) = 이 프레임만 부위 그림 위치
const lin = (m, x, y) => [m.a * x + m.c * y, m.b * x + m.d * y];                       // 변환의 선형 부분
const linInv = (m, x, y) => { const d = m.a * m.d - m.b * m.c; return [(m.d * x - m.c * y) / d, (-m.b * x + m.a * y) / d]; };
const angOf = m => Math.atan2(m.b, m.a) * 180 / Math.PI;
const wrapD = a => ((a % 360) + 540) % 360 - 180;
let bdrag = null;
function frameStart() {   // 프레임별 편집 시작: 지금 프레임의 보간된 값을 키로 고정 (끼어든 프레임이 튀지 않게)
  const key = PREVIEW.key, t = cur / TU.FPS, f = TU.frameSet(key, cur);
  f.pose = { ...TU.poseDelta(key, t) };
  f.radj = structuredClone(TU.radjAt(key, t) || {});
  return f;
}
cvEl.addEventListener('mousedown', e => {
  const [x, y] = dev(e);
  if (e.button === 1 && CVW.zoom) { e.preventDefault(); bdrag = { pan: true, x, y, dx: CVW.dx, dy: CVW.dy }; return; }
  if (e.button !== 0 || !CVW.bones || live.b) return;
  const hit = hitBone(x, y); if (!hit) return;
  const which = CVW.rig, R = which === 'front' ? g.frig : g.rig, part = hit.c.name, a = R.def.parts[part], H = g.HIER[which] || {};
  rigWhich = which; rigPart = part; CVW.sel = part;
  const base = { ...hit, which, part, K: R.K, m: hit.c.m, l0: hit.c.m.inverse().transformPoint(new DOMPoint(x, y)), x0: x, y0: y, moved: false };
  const act = e.shiftKey ? 'length' : e.altKey ? 'move' : EDIT.act, pv = hit.c.m.transformPoint(new DOMPoint(0, 0)), d0 = Math.hypot(x - pv.x, y - pv.y) || 1;
  if (EDIT.scope === 'frame') {
    if (!PREVIEW.on) { setPreview(true); toast('프레임별 편집은 미리보기(멈춘 프레임)에서 — 다시 끌어 주세요'); return; }
    const ang = H[part]?.ang;
    if (act === 'length' || act === 'scale') {   // 본 길이 · 파츠 크기: 축에서 마우스까지 거리 비율
      const f = frameStart();
      bdrag = { ...base, mode: act === 'scale' ? 'fscale' : 'flen', pv, d0, start: { dx: 0, dy: 0, rot: 0, sc: 1, len: 1, ...(f.radj[part] || {}) } };
    } else if (act === 'move' || which === 'front' || (!ang && part !== 'hips')) {
      const f = frameStart(); bdrag = { ...base, mode: 'fadj', start: { dx: 0, dy: 0, rot: 0, sc: 1, ...(f.radj[part] || {}) } };
    } else if (part === 'hips') {
      const f = frameStart(); bdrag = { ...base, mode: 'fbody', start: { ...f.pose }, wk: g.wmat.a, face: P.view === 'flip' ? -P.facing : P.facing };
    } else {
      const f = frameStart(), m0 = g.captureAt(P.pose)[part], m1 = g.captureAt({ ...P.pose, [ang]: (P.pose[ang] || 0) + 1 })[part];
      const d = wrapD(angOf(m1) - angOf(m0)); if (Math.abs(d) < 1e-4) return;
      const kids = EDIT.kids ? [] : g.childrenOf(which, part).filter(k => H[k].ang).map(k => {   // 개별: 자식은 화면 각도를 그대로 두게 반대로 돌림
        const c0 = g.captureAt(P.pose)[k], c1 = g.captureAt({ ...P.pose, [H[k].ang]: (P.pose[H[k].ang] || 0) + 1 })[k];
        return { k, ang: H[k].ang, d: wrapD(angOf(c1) - angOf(c0)) };
      }).filter(c => Math.abs(c.d) > 1e-4);
      const pv = m0.transformPoint(new DOMPoint(0, 0));
      bdrag = { ...base, mode: 'frot', ang, d, kids, pv, a0: Math.atan2(y - pv.y, x - pv.x) * 180 / Math.PI, start: { ...f.pose } };
    }
  } else if (act !== 'move') {
    // 전체 리깅 · 회전/길이/크기: 축 둘레로 관절(자식 자리)과 그림을 돌리거나 늘림. 회전에서 ‘개별’이면 그림만 돌림
    bdrag = { ...base, mode: { rotate: 'grot', length: 'glen', scale: 'gscale' }[act], pv, d0, a0: Math.atan2(base.l0.y, base.l0.x), pivot0: [...a.pivot], joints0: structuredClone(a.joints || {}), adj0: { dx: 0, dy: 0, rot: 0, sc: 1, ...(a.adj || {}) } };
  } else {
    // 전체 리깅: 관절 끌기 = 관절 자리 · 축/그림 끌기 = 축 자리. 개별이면 붙은 자식(관절)·자기 관절(축)을 보정
    const kidsAt = hit.kind === 'joint' && !EDIT.kids ? g.childrenOf(which, part, hit.jn).map(k => ({ k, m: CVW.cap.find(c => c.name === k)?.m, pivot0: [...R.def.parts[k].pivot] })).filter(c => c.m) : [];
    bdrag = { ...base, mode: hit.kind === 'joint' ? 'joint' : 'pivot', pivot0: [...a.pivot], joints0: structuredClone(a.joints || {}), jl0: hit.kind === 'joint' ? [...hit.c.j[hit.jn]] : null, kidsAt };
  }
  if (document.querySelector('#t-rig.on')) renderRig();
});
addEventListener('mousemove', e => {
  const [x, y] = dev(e);
  if (bdrag?.pan) { const k = cvEl.width / 1280 * CVW.k; CVW.dx = bdrag.dx - (x - bdrag.x) / k; CVW.dy = bdrag.dy - (y - bdrag.y) / k; return; }
  if (!bdrag) {
    if (e.target !== cvEl || !CVW.bones) return;
    const hit = hitBone(x, y); CVW.hot = hit?.kind === 'joint' ? hit.c.name + ':' + hit.jn : hit ? hit.c.name + ':' : null;
    cvEl.style.cursor = hit ? (hit.kind === 'joint' ? 'grab' : 'move') : 'crosshair'; return;
  }
  const d = bdrag, l = d.m.inverse().transformPoint(new DOMPoint(x, y)), K = d.K;
  d.moved = true;
  if (d.mode === 'frot') {   // FK: 축 둘레로 돌린 화면 각도 → 자세 값
    const dth = wrapD(Math.atan2(y - d.pv.y, x - d.pv.x) * 180 / Math.PI - d.a0), dp = dth / d.d, f = TU.frameSet(PREVIEW.key, cur);
    f.pose = { ...d.start, [d.ang]: (d.start[d.ang] || 0) + dp };
    for (const c of d.kids) f.pose[c.ang] = (d.start[c.ang] || 0) - dth / c.d;
  } else if (d.mode === 'fbody') {
    const f = TU.frameSet(PREVIEW.key, cur);
    f.pose = { ...d.start, x: (d.start.x || 0) + (x - d.x0) / d.wk * d.face, y: (d.start.y || 0) + (y - d.y0) / d.wk };
  } else if (d.mode === 'flen' || d.mode === 'fscale') {   // 이 프레임: 본 길이(len) · 파츠 크기(len + 그림 sc)
    const f = TU.frameSet(PREVIEW.key, cur), k = Math.max(0.2, Math.min(4, Math.hypot(x - d.pv.x, y - d.pv.y) / d.d0)), r2 = v => Math.round(v * 100) / 100;
    f.radj = { ...(f.radj || {}), [d.part]: { ...d.start, len: r2(d.start.len * k), ...(d.mode === 'fscale' ? { sc: r2(d.start.sc * k) } : {}) } };
  } else if (d.mode === 'grot' || d.mode === 'glen' || d.mode === 'gscale') {   // 전체 리깅: 관절을 축 둘레로 돌리기 · 늘리기 (+ 그림)
    const k = Math.max(0.2, Math.min(4, Math.hypot(x - d.pv.x, y - d.pv.y) / d.d0)), da = d.mode === 'grot' ? Math.atan2(l.y, l.x) - d.a0 : 0, c = Math.cos(da), s2 = Math.sin(da), kk = d.mode === 'grot' ? 1 : k;
    g.liveRig(d.which, d.part, a => {
      if (d.mode !== 'grot' || EDIT.kids) for (const j in d.joints0) { const vx = d.joints0[j][0] - d.pivot0[0], vy = d.joints0[j][1] - d.pivot0[1]; a.joints[j] = [d.pivot0[0] + (vx * c - vy * s2) * kk, d.pivot0[1] + (vx * s2 + vy * c) * kk]; }
      if (d.mode !== 'glen') a.adj = { ...d.adj0, ...(d.mode === 'grot' ? { rot: d.adj0.rot + da * 180 / Math.PI } : { sc: d.adj0.sc * k }) };
    });
  } else if (d.mode === 'fadj') {
    const f = TU.frameSet(PREVIEW.key, cur);
    f.radj = { ...(f.radj || {}), [d.part]: { ...d.start, dx: d.start.dx + (l.x - d.l0.x) / K, dy: d.start.dy + (l.y - d.l0.y) / K } };
  } else if (d.mode === 'joint') {
    g.liveRig(d.which, d.part, a => { a.joints[d.jn] = [a.pivot[0] + l.x / K, a.pivot[1] + l.y / K]; });
    const sv = lin(d.m, l.x - d.jl0[0], l.y - d.jl0[1]);   // 관절이 화면에서 움직인 만큼
    for (const c of d.kidsAt) { const v = linInv(c.m, sv[0], sv[1]); g.liveRig(d.which, c.k, a => { a.pivot = [c.pivot0[0] + v[0] / K, c.pivot0[1] + v[1] / K]; }); }
  } else {
    const dp = [-(l.x - d.l0.x) / K, -(l.y - d.l0.y) / K];
    g.liveRig(d.which, d.part, a => {
      a.pivot = [d.pivot0[0] + dp[0], d.pivot0[1] + dp[1]];
      if (!EDIT.kids) for (const j in d.joints0) a.joints[j] = [d.joints0[j][0] + dp[0], d.joints0[j][1] + dp[1]];   // 개별: 관절(=자식 자리)은 화면에 그대로
    });
  }
});
addEventListener('mouseup', () => {
  const d = bdrag; bdrag = null; if (!d || d.pan || !d.moved) return;
  if (d.mode.startsWith('f')) { TU.prune(); save(); renderMo(); renderStrip(); if (document.querySelector('#t-rig.on')) renderRig(); return; }
  const R = d.which === 'front' ? g.frig : g.rig, E = rigEdit[d.which] ??= structuredClone(g.RIGPATCH[d.which] || {});
  const put = (part, fn) => fn((E.parts ??= {})[part] ??= {}, R.def.parts[part]);
  const r1 = v => v.map(n => Math.round(n * 10) / 10);
  if (d.mode === 'grot' || d.mode === 'glen' || d.mode === 'gscale') put(d.part, (q, a) => { for (const j in a.joints) (q.joints ??= {})[j] = r1(a.joints[j]); if (a.adj) q.adj = { ...a.adj, rot: Math.round((a.adj.rot || 0) * 10) / 10, sc: Math.round((a.adj.sc || 1) * 1000) / 1000 }; });
  else if (d.mode === 'joint') { put(d.part, (q, a) => { (q.joints ??= {})[d.jn] = r1(a.joints[d.jn]); }); for (const c of d.kidsAt) put(c.k, (q, a) => { q.pivot = r1(a.pivot); }); }
  else put(d.part, (q, a) => { q.pivot = r1(a.pivot); if (!EDIT.kids) for (const j in a.joints) (q.joints ??= {})[j] = r1(a.joints[j]); });
  rigApply();
});
cvEl.addEventListener('wheel', e => { if (!CVW.zoom) return; e.preventDefault(); CVW.k = Math.max(1.5, Math.min(14, CVW.k * Math.exp(-e.deltaY * 0.0015))); renderBar(); }, { passive: false });

function renderAll() { renderAb(); renderKeys(); renderMo(); renderRig(); renderFx(); renderFile(); }
renderAll();

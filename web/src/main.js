// 기사쥐 액션 모션 프로토: 단색 테스트장 + 허수아비. 모션·타격감 확정용.
import { loadRig, drawRig, bladeAt, rebake, LIGHT, tipOf, drawFront, frontHand, lerpPose } from './rig.js';
import { SHADE, bakePart, variantFor } from './shade.js';
import * as A from './anim.js';
import * as F from './fx.js';
import { makeToad, TOAD } from './boss.js';

const W = 1280, H = 720, GROUND = 600;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let dpr = 1, view = 1;
function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  dpr = devicePixelRatio || 1;
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
  view = s * dpr;
}
addEventListener('resize', resize); resize();

// ---------- 테스트장 ----------
// ---------- 메트로베니아 월드 (프로토: 방 3개) ----------
// 방마다 발판·허수아비·출구(L/R)·아이템. 한 번 점프 높이 ≈ 100px → 바닥에서 180px 높은 선반은 이단 점프(+100px)가 있어야 오름.
// 출구 high = 높은 선반 위에서만 나갈 수 있음 (이단 점프 잠금), x/y = 다음 방 도착 자리
// shelter = 쉼터 촛불 x (닿으면 저장·체력 회복, 죽으면 여기서 부활) · foes = 방에 들어올 때마다 새로 생기는 적
const ROOMS = [
  { name: '밤의 뒷골목', theme: 'city', w: 1800, plats: [{ x: 300, y: 520, w: 200 }, { x: 650, y: 440, w: 180 }], dummy: 1100, items: [], shelter: 200,
    foes: [{ type: 'crawler', x: 1480 }],
    R: { to: 1, x: 70 } },
  { name: '네온 골목', theme: 'city', w: 1900, plats: [{ x: 1500, y: 420, w: 400 }], dummy: null, items: [{ id: 'dj', x: 980, label: '이단 점프' }],
    foes: [{ type: 'crawler', x: 520 }, { type: 'flyer', x: 1050, y: GROUND - 200 }, { type: 'crawler', x: 1300 }],
    L: { to: 0, x: 1730 }, R: { to: 2, x: 70, high: true } },
  { name: '비상계단 아래', theme: 'city', w: 1400, plats: [], dummy: null, items: [{ id: 'sword', x: 1150, label: '명검' }], shelter: 200,
    foes: [{ type: 'flyer', x: 560, y: GROUND - 220 }, { type: 'crawler', x: 720 }, { type: 'flyer', x: 860, y: GROUND - 160 }],
    L: { to: 1, x: 1830, y: 420 }, R: { to: 3, x: 110 } },
  // 보스 투기장: 하수도. 들어가면 출구가 잠기고(보스가 살아 있는 동안) 양쪽 파이프 발판
  { name: '하수도 — 개굴대왕의 웅덩이', theme: 'sewer', w: 1500, plats: [{ x: 210, y: GROUND - 150, w: 190 }, { x: 1100, y: GROUND - 150, w: 190 }], dummy: null, items: [],
    boss: { type: 'toad', x: 1050 }, L: { to: 2, x: 1330 } },
];
let room = 0, PLATS = ROOMS[0].plats, WORLD_W = ROOMS[0].w, fade = 0;
const got = { dj: false, sword: false };

// ---------- 성장: 레벨 · 경험치(치즈) · 기술 해금 ----------
// 기본 3타·공중 회전·짧은 대시는 처음부터. 레벨이 오르면 연계 기술이 열림 (사용자 지시 2026-10-28)
const G = { lv: 1, xp: 0, maxHp: 5, save: { room: 0, x: 200 }, lit: new Set(['0:200']) };
const LV_XP = [0, 0, 12, 30, 55, 85];   // 이 경험치에 닿으면 그 레벨 (최대 Lv5)
const UNLOCK = { 2: ['plunge', '내려찍기 해금 — 공중에서 ↓ + 공격'], 3: ['charge', '충전 돌진 해금 — F 를 길게 눌러 모았다가 떼기'], 4: ['hp', '최대 체력 +1'], 5: ['hp', '최대 체력 +1'] };
const has = k => k === 'plunge' ? G.lv >= 2 : k === 'charge' ? G.lv >= 3 : true;
let E = [], CH = [];   // 지금 방의 적 · 떨어진 치즈
let BOSS = null;       // 지금 방의 보스 (boss.js)
const bossApi = {
  P: null, GROUND, fx: F, time: () => time, roomW: () => WORLD_W,
  hurt: x => hurtPlayer(x), shake: v => { shake = Math.max(shake, v); }, hitstop: v => { hitstop = Math.max(hitstop, v); }, impact: () => { impactT = 0.04; },
  banner: (t, s) => showBanner(t, s),
  onDefeat: b => {   // 처치: 큰 치즈 + 출구 열림 + 막타 연출
    G.bossDown = true; slowT = 0.6; zoomTgt = 1.15; flashScreen = 1;
    dropCheese(b.x, b.y - 140, 40);
    showBanner('개굴대왕을 쓰러뜨렸다! 큰 치즈를 얻고 길이 열렸다', 5);
    document.getElementById('bossbar').style.opacity = 0;
  },
};

// ---------- 입력 ----------
const keys = {}, pressed = {};
const KEYMAP = { KeyF: 'heavy', ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', KeyZ: 'jump', Space: 'jump', KeyA: 'atk', KeyX: 'atk', KeyJ: 'atk', KeyC: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyH: 'hurt', KeyK: 'die', KeyT: 'slow', KeyG: 'shade', KeyV: 'compare' };
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true; });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
// 우클릭 = 강공격 (메뉴는 막음)
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => { if (e.button === 2) { e.preventDefault(); if (!keys.heavy) pressed.heavy = true; keys.heavy = true; } });
addEventListener('mouseup', e => { if (e.button === 2) keys.heavy = false; });

// ---------- 상태 ----------
const opt = { slow: false, compare: false };
const P = {
  x: 420, y: GROUND, vx: 0, vy: 0, facing: 1, ground: true, coyote: 0, jumpBuf: 0, hasDJ: false, djAvail: true, djT: 9, hp: 5, inv: 0,
  state: 'move', t: 0, combo: 0, atkBuf: 0, atk: null, airDash: true, airAtk: true, atkId: 0, hit: false,
  runPh: 0, landT: 9, flash: 0, ghosts: [], trail: null, pose: A.IDLE,
};
const D = { x: 820, y: GROUND, hp: 3, tilt: 0, vt: 0, flash: 0, cut: null, respawn: 0 };
const SMEAR = [];
let time = 0, hitstop = 0, shake = 0, slowT = 0, zoom = 1, zoomTgt = 1, flashScreen = 0, impactT = 0, wmat = null;
let rig, dummyImg = {}, fullImg;

const RUN = 300, ACC = 2600, AIR_ACC = 1700, JUMP_V = 780, GRAV = 2000, DASH_V = 760;   // 점프 ≈ 152px (높은 출구 180px 은 여전히 이단 점프 필요)

function groundAt(x, yPrev, y) {
  // 위에서 떨어질 때만 발판에 섬
  for (const p of PLATS) if (x > p.x && x < p.x + p.w && yPrev <= p.y + 1 && y >= p.y) return p.y;
  return y >= GROUND ? GROUND : null;
}

// ---------- 방 이동 · 아이템 ----------
function loadRoom(i) {
  room = i; PLATS = ROOMS[i].plats; WORLD_W = ROOMS[i].w;
  D.x = ROOMS[i].dummy ?? -9999; D.hp = 3; D.cut = null; D.tilt = 0; D.vt = 0;
  E = (ROOMS[i].foes || []).map(spawnFoe); CH = [];
  const bs = ROOMS[i].boss;
  bossApi.P = P; BOSS = bs && !G.bossDown ? makeToad(bossApi, bs.x) : null;
  const bar = document.getElementById('bossbar'); if (bar) bar.style.opacity = BOSS ? 1 : 0;
  if (BOSS) showBanner('하수도의 왕 — 개굴대왕', 2.5);
  F.streakEnd(P.trail); P.trail = null; F.FX.streaks.length = 0; F.FX.sprites.length = 0; F.FX.flips = []; P.ghosts = [];
  document.getElementById('room').textContent = ROOMS[i].name;
}
function go(e) {
  loadRoom(e.to);
  P.x = e.x; P.y = e.y ?? GROUND; P.vx = 0; P.vy = 0; fade = 1; camY = Math.min(0, (P.y - GROUND) * 0.55);
  if (P.state === 'attack' || P.state === 'dash') P.state = 'move';
}
const HIGH_Y = GROUND - 120;   // 이만큼 높이 올라와 있어야 high 출구를 쓸 수 있음 (이단 점프 필요)
function checkExits() {
  if (P.state === 'dead') return;
  if (BOSS && BOSS.state !== 'dead') return;   // 보스전 중엔 출구 잠김
  const R = ROOMS[room];
  if (P.x <= 32 && R.L && (!R.L.high || P.y <= HIGH_Y)) go(R.L);
  else if (P.x >= WORLD_W - 32 && R.R && (!R.R.high || P.y <= HIGH_Y)) go(R.R);
}
let bannerT = 0;
function showBanner(text, sec = 3) { const b = document.getElementById('banner'); b.textContent = text; b.style.opacity = 1; bannerT = sec; }
function checkItems() {
  for (const it of ROOMS[room].items) {
    if (got[it.id] || Math.abs(P.x - it.x) > 44 || P.y < GROUND - 60) continue;
    got[it.id] = true;
    F.sfx(it.id === 'dj' ? '획득!' : '번쩍!', it.x, GROUND - 120, 1, true); flashScreen = 0.6;
    if (it.id === 'dj') { P.hasDJ = true; showBanner('이단 점프 획득 — 공중에서 점프를 한 번 더. 높은 비상계단에 오를 수 있다'); }
    else showBanner('명검의 기운이 느껴진다… (프로토 여기까지)', 5);
  }
}
function drawItems() {
  for (const it of ROOMS[room].items) {
    if (got[it.id]) continue;
    const y = GROUND - 62 + Math.sin(time * 3) * 6, r = 16 + Math.sin(time * 5) * 2, col = it.id === 'dj' ? '#7ee8ff' : '#ffd23a';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(it.x, y, r * 2.4, 0, 7); ctx.fill();   // 임시 표시 (아이템 그림 나오면 교체)
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(it.x, y, r * 0.6, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(it.x, y, r, 0, 7); ctx.stroke();
    ctx.restore();
  }
}

// ---------- 적 (Codex 그림: art/enemy) ----------
// crawler = 바닥을 기다 가까이 오면 몸을 젖혔다(wind) 돌진(charge) · flyer = 공중에서 맴돌다 젖혔다(wind) 플레이어 쪽으로 급강하(dive) 후 제자리로(back)
// y = 몸 아래 끝(발) · hh = 몸 반높이 · hw = 몸 반너비 (판정·몸통 박치기)
const FOE = {
  crawler: { hp: 24, xp: 6, hh: 20, hw: 32, w: 72, frames: ['walk0', 'walk1', 'wind', 'charge', 'hurt', 'dead'] },
  flyer: { hp: 16, xp: 4, hh: 20, hw: 24, w: 58, frames: ['fly0', 'fly1', 'wind', 'dive', 'hurt', 'dead'] },
};
const FOE_IMG = { crawler: {}, flyer: {} }, PROP = {};
function spawnFoe(s) {
  const d = FOE[s.type], y = s.y ?? GROUND;
  return { type: s.type, x: s.x, y, x0: s.x, y0: y, hp: d.hp, hh: d.hh, hw: d.hw, dir: -1, state: s.type === 'crawler' ? 'walk' : 'hover', t: 0, cd: 0.5, vx: 0, vy: 0, flash: 0, ph: Math.random() * 6 };
}
function updateFoes(dt) {
  for (const e of E) {
    e.t += dt; e.flash = Math.max(0, e.flash - dt * 8);
    if (e.state === 'dead') {   // 튕겨 날아가 떨어지고 잠시 뒤 사라짐
      e.vy += GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.pow(0.2, dt);
      if (e.y >= GROUND) { e.y = GROUND; e.vy *= -0.25; }
      continue;
    }
    const dx = P.x - e.x, ad = Math.abs(dx), see = P.state !== 'dead';
    if (e.state === 'hurt') {
      e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.pow(0.01, dt); e.vy *= Math.pow(0.01, dt);
      if (e.t > 0.32) { e.state = e.type === 'crawler' ? 'walk' : 'back'; e.t = 0; e.cd = 0.5; e.x0 = e.x; }
    } else if (e.type === 'crawler') {
      if (e.state === 'walk') {
        e.x += e.dir * 55 * dt; e.cd -= dt;
        if (Math.abs(e.x - e.x0) > 140) e.dir = Math.sign(e.x0 - e.x);
        if (see && e.cd <= 0 && ad < 290 && Math.abs(P.y - e.y) < 80) { e.dir = Math.sign(dx) || 1; e.state = 'wind'; e.t = 0; }
      } else if (e.state === 'wind') { if (e.t > 0.6) { e.state = 'charge'; e.t = 0; e.vx = e.dir * 380; F.dust(e.x, e.y, -e.dir, 0.9); } }   // 젖힘 0.6초 = 보고 피할 틈
      else if (e.state === 'charge') { e.x += e.vx * dt; if (Math.random() < 0.3) F.dust(e.x, e.y, -e.dir, 0.4); if (e.t > 0.42) { e.state = 'walk'; e.t = 0; e.cd = 1.1; e.x0 = e.x; } }
      e.x = Math.max(40, Math.min(WORLD_W - 40, e.x));
    } else {
      if (e.state === 'hover') {
        e.dir = Math.sign(dx) || 1; if (ad > 140) e.x += e.dir * 40 * dt;
        e.y = e.y0 + Math.sin(time * 3 + e.ph) * 12; e.cd -= dt;
        if (see && e.cd <= 0 && ad < 330 && P.y - e.y < 280) { e.state = 'wind'; e.t = 0; }
      } else if (e.state === 'wind') {
        e.y -= 40 * dt;
        if (e.t > 0.4) { const tx = P.x, ty = P.y - 20, d = Math.hypot(tx - e.x, ty - e.y) || 1; e.vx = (tx - e.x) / d * 470; e.vy = (ty - e.y) / d * 470; e.dir = Math.sign(e.vx) || e.dir; e.state = 'dive'; e.t = 0; }
      } else if (e.state === 'dive') {
        e.x += e.vx * dt; e.y = Math.min(GROUND - 4, e.y + e.vy * dt);
        if (e.t > 0.55) { e.state = 'back'; e.t = 0; }
      } else if (e.state === 'back') {
        e.y += (e.y0 - e.y) * Math.min(1, dt * 3);
        if (e.t > 0.8) { e.state = 'hover'; e.t = 0; e.cd = 1.3; }
      }
      e.x = Math.max(40, Math.min(WORLD_W - 40, e.x));
    }
    // 몸통 박치기: 적이 공격하는 순간(돌진·급강하)에만 아픔 — 걷거나 떠 있는 적에겐 내딛으며 베어 들어갈 수 있게. 충전 돌진·내려찍기로 꿰뚫는 중엔 무적
    const dashing = P.state === 'attack' && (P.atkName === 'heavy2' || P.atk.plunge);
    const attacking = e.state === 'charge' || e.state === 'dive';
    if (attacking && !dashing && Math.abs(P.x - e.x) < e.hw + 12 && P.y > e.y - 2 * e.hh - 6 && P.y - 64 < e.y) hurtPlayer(e.x);
  }
  E = E.filter(e => !(e.state === 'dead' && e.t > 1.4));
}
function hitFoe(e, c) {
  const fin = !!c.fin;
  e.hp -= c.dmg || 8; e.flash = 1;
  hitstop = Math.max(hitstop, c.stop || 0.05); shake = Math.max(shake, c.shake || 3); impactT = fin ? 0.05 : 0.03;
  F.hitBurst(e.x + P.facing * 18, e.y - e.hh, P.facing, fin || c.big, c.hitUp ?? 0);   // 적 반대쪽에서 터짐
  if (c.sfx) F.sfx(c.sfx, e.x + P.facing * 16, e.y - 2 * e.hh - 50, P.facing, fin);
  const kb = (c.kb || 120) * (e.type === 'flyer' ? 1.2 : 1);
  if (e.hp <= 0) {
    e.state = 'dead'; e.t = 0; e.vx = P.facing * kb * 1.3; e.vy = -420;
    dropCheese(e.x, e.y - e.hh, FOE[e.type].xp);
    if (fin) { slowT = 0.22; zoomTgt = 1.1; }
  } else { e.state = 'hurt'; e.t = 0; e.vx = P.facing * kb; e.vy = e.type === 'flyer' ? -80 : 0; }
}
// 치즈 = 경험치. 튀어 나와 떨어졌다가 잠시 뒤 플레이어에게 빨려 옴
function dropCheese(x, y, xp) {
  for (let v = xp; v > 0; v -= 2) CH.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -260 - Math.random() * 200, v: Math.min(2, v), t: 0 });
}
function updateCheese(dt) {
  for (const c of CH) {
    c.t += dt;
    if (c.t < 0.45) { c.vy += GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > GROUND - 6) { c.y = GROUND - 6; c.vy *= -0.4; c.vx *= 0.6; } }
    else { const tx = P.x, ty = P.y - 40, d = Math.hypot(tx - c.x, ty - c.y) || 1, sp = 300 + (c.t - 0.45) * 1400; c.x += (tx - c.x) / d * Math.min(d, sp * dt); c.y += (ty - c.y) / d * Math.min(d, sp * dt); if (d < 24) { c.got = true; gainXp(c.v); } }
  }
  CH = CH.filter(c => !c.got);
}
function gainXp(v) {
  G.xp += v;
  while (G.lv < 5 && G.xp >= LV_XP[G.lv + 1]) {
    G.lv++;
    const [k, text] = UNLOCK[G.lv];
    if (k === 'hp') G.maxHp++;
    P.hp = G.maxHp;   // 레벨이 오르면 체력도 다 참
    showBanner(`레벨 업! Lv${G.lv} — ${text}`, 4);
    F.sfx('LEVEL UP!', P.x, P.y - 140, P.facing, true); flashScreen = 0.5; P.flash = 1;
  }
}
// ---------- 체력 · 사망 · 쉼터 ----------
function hurtPlayer(sx) {
  if (P.inv > 0 || P.state === 'dead') return;
  P.hp--; P.inv = 1.0; P.flash = 1; shake = Math.max(shake, 7); hitstop = 0.08; impactT = 0.03;
  F.streakEnd(P.trail); P.trail = null;
  if (P.hp <= 0) { P.state = 'dead'; P.t = 0; P.vx = 0; P.dying = true; showBanner('쓰러졌다… 마지막 쉼터로', 2); return; }
  P.state = 'hurt'; P.t = 0; P.vx = Math.sign(P.x - sx || 1) * 280; P.vy = -260; P.ground = false;
}
function respawn() {
  loadRoom(G.save.room);
  P.x = G.save.x; P.y = GROUND; P.vx = 0; P.vy = 0; P.hp = G.maxHp; P.state = 'move'; P.dying = false; P.inv = 1; fade = 1;
}
function checkShelter() {
  const s = ROOMS[room].shelter;
  if (s == null || !P.ground || Math.abs(P.x - s) > 40 || P.state === 'dead') return;
  const key = room + ':' + s, first = !G.lit.has(key), moved = G.save.room !== room || G.save.x !== s;
  if (first || moved || P.hp < G.maxHp) {
    G.lit.add(key); G.save = { room, x: s }; P.hp = G.maxHp;
    if (first || moved) { showBanner('쉼터 — 촛불을 밝혔다. 쓰러지면 여기서 다시 시작'); flashScreen = 0.3; }
  }
}
function drawFoes(c) {
  for (const e of E) {
    const d = FOE[e.type], I = FOE_IMG[e.type];
    let fi = e.type === 'crawler'
      ? { walk: Math.floor(time * 8) % 2, wind: 2, charge: 3, hurt: 4, dead: 5 }[e.state]
      : { hover: Math.floor(time * 18) % 2, back: Math.floor(time * 18) % 2, wind: 2, dive: 3, hurt: 4, dead: 5 }[e.state];
    if (e.state === 'wind') { c.save(); c.translate((Math.random() - 0.5) * 3, 0); }   // 젖힐 때 부르르
    const im = I[d.frames[fi]];
    const face = e.state === 'hurt' || e.state === 'dead' ? -Math.sign(e.vx || 1) : e.dir;
    c.save(); c.translate(e.x, e.y);
    if (e.state === 'dead') c.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - 0.9) / 0.5);
    if (im) {
      const k = d.w / I[d.frames[0]].width;
      c.scale(face * k, k);
      if (e.flash > 0.4) c.filter = 'brightness(0) invert(1)';   // 맞은 순간 하얗게
      c.drawImage(im, -im.width / 2, -im.height);
    } else { c.fillStyle = e.flash > 0.4 ? '#fff' : '#5a3a28'; c.beginPath(); c.ellipse(0, -e.hh, e.hw, e.hh, 0, 0, 7); c.fill(); }   // 그림 없을 때 임시
    c.restore();
    if (e.state === 'wind') c.restore();
  }
}
function drawCheese(c) {
  for (const ch of CH) {
    const im = PROP.crumb;
    if (im) { const k = 18 / im.width; c.drawImage(im, ch.x - 9, ch.y - im.height * k / 2, 18, im.height * k); }
    else { c.fillStyle = '#ffd23a'; c.fillRect(ch.x - 6, ch.y - 6, 12, 12); }
  }
}
function drawShelter() {
  const s = ROOMS[room].shelter; if (s == null) return;
  const lit = G.lit.has(room + ':' + s), im = lit ? PROP.candle_on : PROP.candle_off;
  if (lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,60,${0.16 + Math.sin(time * 9) * 0.03})`; ctx.beginPath(); ctx.arc(s, GROUND - 70, 120, 0, 7); ctx.fill(); ctx.restore(); }   // 촛불 빛
  if (im) { const k = 64 / PROP.candle_off.height; ctx.drawImage(im, s - im.width * k / 2, GROUND - im.height * k + 4, im.width * k, im.height * k); }
  else { ctx.fillStyle = '#f3e6c4'; ctx.fillRect(s - 10, GROUND - 50, 20, 50); }
}

// F(돌진 키): 짧게 = 잔상 대시(공중 가능) · 길게 = 웅크려 충전 → 뗄 때 돌진. 충전 k(0~1) 만큼 돌진 거리·마무리 베기 칼빛·판정이 커짐
const F_TAP = 0.16, CH_MAX = 1.0;
function chargeMod(name, k) {
  const c = A.ATTACKS[name];
  if (name === 'heavy2') return { lunge: c.lunge * (1 + 1.3 * k), act: c.act * (1 + 0.5 * k) };
  if (name === 'heavy3') return { fxScale: 1 + 0.8 * k, fxAhead: c.fxAhead * (1 + 0.6 * k), orbit: { ...c.orbit, rx: c.orbit.rx * (1 + 0.45 * k) },
    range: [c.range[0], c.range[1] * (1 + 0.5 * k)], shake: c.shake + 7 * k, stop: c.stop + 0.06 * k, dmg: c.dmg * (1 + k) };
  return null;
}
function startAttack(name, mod = null) {
  const c = mod ? { ...A.ATTACKS[name], ...mod } : A.ATTACKS[name];
  P.state = 'attack'; P.t = 0; P.atk = c; P.atkName = name; P.atkId++; P.hit = false; P.atkFrom = P.pose; P.seqOn = false; P.halfOn = false; P.hzFx = false; P.hopped = false; P.flashed = false; P.glinted = false; P.cresOn = false;
  F.streakEnd(P.trail); P.trail = null;
  if (name === 'heavyC') P.chargeK = 0;
}
function startDash() {
  P.state = 'dash'; P.t = 0; P.vy = 0; P.vx = P.facing * DASH_V;
  if (!P.ground) P.airDash = false;
  F.streakEnd(P.trail); P.trail = null;
  F.speedSlices(P.x, P.y - 60, P.facing);
  if (P.ground) F.dust(P.x, P.y, P.facing, 1.2);
}

function update(dt) {
  // 입력 버퍼
  if (pressed.jump) P.jumpBuf = 0.12;
  if (pressed.atk) P.atkBuf = 0.2;
  if (pressed.slow) toggle('slow');
  if (pressed.shade) toggle('shade');
  if (pressed.compare) toggle('compare');
  if (pressed.hurt && P.state !== 'dead') { P.state = 'hurt'; P.t = 0; P.vx = -P.facing * 260; P.flash = 1; shake = 6; hitstop = 0.06; }
  if (pressed.die) { P.state = P.state === 'dead' ? 'move' : 'dead'; P.t = 0; P.vx = 0; }
  P.jumpBuf -= dt; P.atkBuf -= dt;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  // F 누름 길이: 짧게 떼면 대시, F_TAP 넘게 누르고 있으면(땅) 충전 시작, 떼는 순간 충전만큼 돌진
  if (pressed.heavy) { P.fOn = true; P.fT = 0; P.fCh = false; }
  if (P.fOn) {
    P.fT += dt;
    const free = P.state === 'move' || (P.state === 'attack' && !P.atk.next && P.atkName !== 'heavy3' && P.t > P.atk.wind + P.atk.act);
    if (!P.fCh && keys.heavy && P.fT >= F_TAP && P.ground && free && has('charge')) { P.fCh = true; P.chT = 0; P.chFull = false; P.chargeK = 0; startAttack('heavyC'); }   // 충전 돌진은 Lv3 부터 (그 전엔 길게 눌러도 대시)
    if (!keys.heavy) {
      P.fOn = false;
      if (P.fCh && P.state === 'attack' && P.atkName === 'heavyC') {
        P.chargeK = Math.min(1, P.chT / CH_MAX);
        startAttack('heavy2', chargeMod('heavy2', P.chargeK)); shake = Math.max(shake, 4 + 6 * P.chargeK);
      } else if (!P.fCh) pressed.dash = true;   // 짧게 = 대시 (아래 대시 처리로)
      P.fCh = false;
    }
  }

  P.t += dt;
  if (P.state === 'move') {
    if (dir) P.facing = dir;
    const acc = P.ground ? ACC : AIR_ACC;
    const tgt = dir * RUN;
    P.vx += Math.sign(tgt - P.vx) * Math.min(Math.abs(tgt - P.vx), acc * dt);
    if (P.jumpBuf > 0 && (P.ground || P.coyote > 0)) { P.vy = -JUMP_V; P.ground = false; P.coyote = 0; P.jumpBuf = 0; F.dust(P.x, P.y, P.facing, 0.8); }
    else if (P.jumpBuf > 0 && !P.ground && P.hasDJ && P.djAvail) {   // 이단 점프 (아이템 획득 후): 공중에서 한 번 더, 앞으로 한 바퀴 돌며
      P.vy = -JUMP_V * 0.92; P.djAvail = false; P.djT = 0; P.jumpBuf = 0;
      F.dust(P.x, P.y - 6, -1, 0.7); F.dust(P.x, P.y - 6, 1, 0.7); shake = Math.max(shake, 2);
    }
    if (!keys.jump && P.vy < -200) P.vy += GRAV * 1.6 * dt;   // 짧게 누르면 낮게
    if (P.atkBuf > 0) {
      P.atkBuf = 0;
      if (!P.ground) { if (keys.down && has('plunge')) startAttack('plunge'); else if (P.airAtk) { P.airAtk = false; startAttack('air'); } }   // 공중: ↓ + 공격 = 내려찍기, 그냥 = 세로 회전 베기
      else { P.combo = 0; startAttack(A.COMBO[0]); }
    }
    if (pressed.dash && (P.ground || P.airDash)) startDash();
  } else if (P.state === 'attack') {
    const c = P.atk, tot = c.wind + c.act + c.rec;
    if (dir && P.t < c.wind * 0.5) P.facing = dir;   // 젖히는 초반엔 방향 바꿈 허용
    // 뛰어오르기(hop): 휘두르기 시작 순간 살짝 튀어 올라 공중에서 휘두름 (아케이드식 손맛)
    if (c.hop && P.ground && !P.hopped && P.t >= c.wind) { P.hopped = true; P.vy = -c.hop; P.ground = false; P.vx = P.facing * c.lunge / (c.act + 0.1); F.dust(P.x, P.y, -P.facing, 1.2); }
    // 도약 준비(glint): 웅크린 동안 칼끝에 가는 섬광이 맺힘
    if (c.glint && !P.glinted && P.t >= c.wind * 0.25) { P.glinted = true; F.edgeGlint(() => bladeAt(rig, P.pose, P.x, P.y, P.facing).t, c.wind * 0.75); }
    // 기 모으기(charge): 웅크린 동안 빛줄기가 몸으로 빨려 들어오고 살짝 떨림 (줌은 tick 에서)
    // F 를 누르고 있는 동안은 웅크린 자세(젖히기 끝)에서 멈춰 계속 모음 — 오래 모을수록 빛줄기가 잦아지고 떨림이 커짐, 다 차면 한 번 번쩍
    if (c.charge && P.fCh) {
      P.chT += dt; if (P.t > c.wind) P.t = c.wind;
      const k = Math.min(1, P.chT / CH_MAX);
      if (k >= 1 && !P.chFull) { P.chFull = true; P.flash = 1; flashScreen = 0.35; F.sfx('MAX!', P.x, P.y - 130, P.facing); }
      shake = Math.max(shake, 1 + 2.5 * k);
      for (let i = 0; i < 1 + 2 * k; i++) if (Math.random() < 0.6 + 0.4 * k) F.chargeIn(P.x - P.facing * 10, P.y - 52);
    } else if (c.charge && P.t < c.wind) { shake = Math.max(shake, 1.5); if (Math.random() < 0.7) F.chargeIn(P.x - P.facing * 10, P.y - 52); }
    // 섬광 돌진(flash): 젖히기가 끝나 튀어 나가는 순간 화면·몸이 번쩍하고 흔들림
    if (c.flash && !P.flashed && P.t >= c.wind) { P.flashed = true; flashScreen = 0.8; P.flash = 1; shake = Math.max(shake, 6); F.dust(P.x, P.y, -P.facing, 1.6); }
    // 내딛기: 휘두르는 동안 앞으로 미끄러짐
    if (c.plunge) {   // 내려찍기: 젖히는 동안 살짝 떠 칼을 듦 → 급강하(착지할 때까지 꽂은 자세 유지) · 공중에서 적에 꽂히면 튕겨 오름
      if (P.t < c.wind) { P.vy = Math.min(P.vy, -60); P.vx *= Math.pow(0.02, dt); }
      else if (!P.ground) {
        P.vy = 1000; P.vx = 0; if (P.t > c.wind + c.act) P.t = c.wind + c.act;
        P.ghosts.push({ pose: P.pose, x: P.x, y: P.y, f: P.facing, t: 0 });
        const under = (!D.cut && Math.abs(D.x - P.x) < 50 && P.y > D.y - 190 && P.y < D.y - 10)
          || E.some(e => e.state !== 'dead' && Math.abs(e.x - P.x) < e.hw + 24 && P.y > e.y - 2 * e.hh - 14 && P.y < e.y + 6)
          || (BOSS && BOSS.state !== 'dead' && Math.abs(BOSS.x - P.x) < 150 && P.y > BOSS.y - BOSS.pose.lift - 250 && P.y < BOSS.y - BOSS.pose.lift - 30);   // 보스 머리 위로 내려찍으면 튕겨 오름
        if (under) {
          tryHit(true);
          if (P.hit) {   // 튕겨 오름: 공중 기술 전부 회복
            P.state = 'move'; P.vy = -JUMP_V * 0.95; P.airAtk = true; P.airDash = true; P.djAvail = true;
            F.dust(P.x, P.y, -1, 1); F.dust(P.x, P.y, 1, 1);
          }
        }
      }
    } else if (P.ground) {
      const inAct = P.t >= c.wind * 0.6 && P.t < c.wind + c.act * 1.2;
      P.vx = inAct ? P.facing * c.lunge / (c.wind * 0.4 + c.act * 1.2) : P.vx * Math.pow(0.0005, dt);
    } else {
      if (c.airHop && !P.hopped && P.t >= c.wind) { P.hopped = true; P.vy = -c.airHop; }   // 세로 회전: 휘두르는 순간 살짝 튀어 오름
      P.vx += dir * AIR_ACC * 0.5 * dt; P.vx = Math.max(-RUN, Math.min(RUN, P.vx));
      if (c.hang && !c.airHop && P.t < c.wind + c.act + 0.04) P.vy = Math.min(P.vy, 40);   // 공중 베기: 휘두르는 동안 잠깐 떠 있음
      if (c.hang && c.airHop && P.t >= c.wind + c.act * 0.6 && P.t < c.wind + c.act + 0.05) P.vy *= Math.pow(0.02, dt);   // 쭉 솟아오르다 회전 끝 무렵 꼭대기에 잠깐 걸림
    }
    // 콤보 이어가기: 회복 중 버퍼가 있으면 다음 타
    const nextOk = P.t > c.wind + c.act + c.rec * 0.15;
    if (P.atkBuf > 0 && nextOk && (P.ground || P.hopped) && P.atkName !== 'air') {
      const i = A.COMBO.indexOf(P.atkName);
      if (i >= 0) { P.atkBuf = 0; P.combo = (i + 1) % A.COMBO.length; startAttack(A.COMBO[P.combo]); }   // 3타 뒤엔 다시 1타 (뒤에 남은 칼을 앞으로 베어 넘김)
    }
    if (!P.ground && P.atkBuf > 0 && keys.down && has('plunge') && P.atkName === 'air' && P.t > c.wind + c.act) { P.atkBuf = 0; startAttack('plunge'); }   // 공중 회전 끝에서 바로 내려찍기
    else if (pressed.dash && P.t > c.wind + c.act && (P.ground || P.airDash)) startDash();
    else if (c.next && P.t >= tot) startAttack(c.next, chargeMod(c.next, P.chargeK || 0));   // 강공격 ① → ② 돌진 마무리로 바로 이어짐 (충전만큼 키움)
    else if (P.t >= tot) { P.state = 'move'; F.streakEnd(P.trail); P.trail = null; if (c.endFlip) P.facing = -P.facing; }   // 뒤로 돈 채 끝나는 공격(2타): 그 쪽을 보고 대기
  } else if (P.state === 'dash') {
    if (P.t < A.DASH_T * 0.6) { P.vy = 0; P.ghosts.push({ pose: P.pose, x: P.x, y: P.y, f: P.facing, t: 0 }); }   // 매 프레임 잔상
    else P.vx *= Math.pow(0.002, dt);
    if (P.t >= A.DASH_T) P.state = 'move';
  } else if (P.state === 'hurt') {
    P.vx *= Math.pow(0.01, dt);
    if (P.t >= A.HURT_T) P.state = 'move';
  } else if (P.state === 'dead') {
    P.vx *= Math.pow(0.001, dt);
  }

  // 물리
  if (!(P.state === 'dash' && P.t < A.DASH_T * 0.6)) P.vy += GRAV * dt;
  P.vy = Math.min(P.vy, 1100);
  const yPrev = P.y;
  P.x += P.vx * dt; P.y += P.vy * dt;
  P.x = Math.max(30, Math.min(WORLD_W - 30, P.x));
  const g = P.vy >= 0 ? groundAt(P.x, yPrev, P.y) : null;
  const wasGround = P.ground;
  if (g !== null) {
    P.y = g; P.vy = 0; P.ground = true; P.airDash = true; P.airAtk = true; P.djAvail = true;
    if (!wasGround) {
      P.landT = 0; F.dust(P.x, P.y, -1, 0.7); F.dust(P.x, P.y, 1, 0.7);
      if (P.state === 'attack' && P.atk.plunge && P.t >= P.atk.wind) {   // 내려찍기 착지: 충격파 — 양옆으로 큰 먼지·흔들림, 둘레 적에게 판정
        P.t = P.atk.wind + P.atk.act + 0.001; shake = Math.max(shake, 10); flashScreen = 0.3; impactT = 0.03;
        for (const s of [-1, 1]) { F.dust(P.x + s * 20, P.y, s, 2); F.dust(P.x + s * 60, P.y, s, 1.4); }
        F.hitBurst(P.x, P.y - 10, P.facing, true, -10);
        const c0 = P.atk; P.atk = { ...c0, range: [-150, 150], h: [-260, 160] }; P.hit = false; tryHit(true); P.atk = c0;
      }
    }
  } else {
    if (wasGround) P.coyote = 0.08;
    P.ground = false;
  }
  P.coyote -= dt; P.landT += dt; P.djT += dt; P.inv = Math.max(0, P.inv - dt);
  checkExits(); checkItems(); checkShelter();
  updateFoes(dt); updateCheese(dt); if (BOSS) BOSS.update(dt);
  if (P.state === 'dead' && P.dying && P.t > 2.2) respawn();   // 쓰러지면 잠시 뒤 마지막 쉼터에서
  // 땅에서 미끄러질 때 먼지
  if (P.ground && P.state === 'attack' && Math.abs(P.vx) > 200 && Math.random() < 0.25) F.dust(P.x, P.y, P.facing, 0.5);

  // 자세
  pose(dt);
  sampleBlade(P.t - dt, P.t);

  // 순차 이펙트: 휘두르기 시작 프레임에 생성 (궤적 타원 중심, 몸을 따라감)
  // 이나리식 평타 이펙트: 휘두르는 순간 몸 앞에 큰 초승달 한 장이 생겨(생김→최대→찢어짐) 캐릭터를 따라다니며 사라짐
  if (P.state === 'attack' && ((P.atk.big && !A.isPath(P.atk)) || P.atk.ring) && !P.seqOn && P.t >= P.atk.wind - 0.01) {
    P.seqOn = true;
    const c = P.atk, e = c.ell, f = P.facing, fol = () => [P.x + e.cx * f * 0.4 + f * (c.fxAhead || 0), P.y + e.cy];
    F.spinFx(...fol(), f, e.rx * 2.4, { follow: fol, life: c.act + 0.32, heat: true });   // 칼빛 줄기와 같은 박자: 흰빛 0.07초 → 노랑 → 0.23초쯤부터 주황으로 부서짐
  }

  // 수평 베어 넘기기 그림(cres): 휘두르는 순간 몸 앞에 납작한 초승달 한 장 (초반 시트 cres_a~c: 생김 → 최대 → 찢어짐), 몸을 따라감
  if (P.state === 'attack' && P.atk.cres && !P.cresOn && P.t >= P.atk.wind) {
    P.cresOn = true;
    // 도착 자리(남은 내딛기만큼 앞) 앞에 고정해서 띄움 — 캐릭터를 가로지르지 않게
    const f = P.facing, x0 = P.x + f * (P.atk.lunge + 110);
    F.crescent(x0, P.y - 62, f, 460, 0, { life: 0.32 });
  }
  // 수평 베기 맛내기: 휘두르는 동안 잔상(몸 겹그림)·속도선·바닥 먼지 + 시작 순간 몸 쏠림
  if (P.state === 'attack' && (P.atk.hz || A.isPath(P.atk))) {
    const c = P.atk, t0 = c.wind, t1 = c.wind + c.act;
    if (P.t >= t0 && P.t <= t1 + 0.04 && Math.floor(P.t * 60) !== P._gf) {
      P._gf = Math.floor(P.t * 60);
      P.ghosts.push({ pose: P.pose, frame: P.frame, x: P.x, y: P.y, f: P.facing, t: 0 });
    }
    if (!P.hzFx && P.t >= t0) {
      P.hzFx = true;
      F.dust(P.x, P.y, -P.facing, 1.4); F.dust(P.x, P.y, P.facing, 0.8);
      shake = Math.max(shake, 3);
    }
  }

  // 수평 베기: 회전 베기 이펙트의 앞쪽 절반만 잘라 몸 중심에서 전방으로 가르는 반원 소용돌이
  if (false && P.state === 'attack' && P.atk.hz && !P.halfOn) {
    P.halfOn = true;
    const c = P.atk, e = c.ell, f = P.facing, fol = () => [P.x + 120 * f, P.y + e.cy + 36];
    F.spinFx(...fol(), f, e.rx * 2.0, { follow: fol, life: c.act + c.rec * 0.4, half: true });
  }

  // 판정
  if (P.state === 'attack' && !P.hit) {
    const c = P.atk;
    // 돌진 베기(lunge 큰 공격)·공중 회전(sweep)은 휘두르는 내내 지나가며 닿는 순간 맞음, 나머지는 hitAt 한 순간
    const sw = c.lunge >= 300 || c.sweep;
    if (sw ? (P.t >= c.wind && P.t <= c.wind + c.act) : P.t >= c.wind + c.act * c.hitAt) tryHit(sw);
  }

  // 허수아비
  D.vt += (-D.tilt * 160 - D.vt * 9) * dt; D.tilt += D.vt * dt;   // 스프링으로 흔들
  D.flash = Math.max(0, D.flash - dt * 12);
  if (D.cut) {
    const c = D.cut; c.vy += GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
    if (c.y > 0) { c.y = 0; c.vy *= -0.3; c.vx *= 0.6; c.vr *= 0.5; }
    D.respawn -= dt; if (D.respawn <= 0) { D.cut = null; D.hp = 3; }
  }
  for (const gh of P.ghosts) gh.t += dt;
  P.ghosts = P.ghosts.filter(gh => gh.t < 0.22);
  P.flash = Math.max(0, P.flash - dt * 6);
  for (const k in pressed) pressed[k] = false;
}

// 경로 베기(path · orbit): 칼끝을 공격표의 경로로 끌고 감 — 팔은 그 자리로 뻗고, 칼은 손에서 그 자리를 겨누며 길이(swL)로 닿게 함.
// 몸통·다리는 공격 자세(W → S) 그대로. 젖히는 동안은 경로 첫 자리로 감아 두고, 회복 앞부분은 끝 자리를 버틴 뒤 대기로 풀림
const ARM = ['nU', 'nF', 'sw', 'swL'];
const deg = (dx, dy) => Math.atan2(dx, dy) * 180 / Math.PI;   // 칼·팔 각도 약속: 0 아래 · 90 앞 · 180 위
const wrap = a => ((a % 360) + 540) % 360 - 180;
function reach(pose, [tx, ty, back]) {
  const p = { ...pose, nF: 14, swL: 1 };
  const s = bladeAt(rig, p, 0, 0, 1).s;
  p.nU = p.torso + deg(tx - s[0], ty - s[1]) - 6;
  let b = bladeAt(rig, p, 0, 0, 1);
  const want = deg(tx - b.g[0], ty - b.g[1]);
  A.aim(p, want);
  b = bladeAt(rig, p, 0, 0, 1);
  p.sw += wrap(want - deg(b.t[0] - b.g[0], b.t[1] - b.g[1]));   // 칼 그림의 칼끝이 축에서 살짝 비껴 있는 만큼 바로잡음
  b = bladeAt(rig, p, 0, 0, 1);
  p.swL = Math.max(0.45, Math.min(1.12, Math.hypot(tx - b.g[0], ty - b.g[1]) / (Math.hypot(b.t[0] - b.g[0], b.t[1] - b.g[1]) || 1)));
  p.swBack = back;
  return p;
}
// a 의 몸에 팔·칼만 b 쪽으로 k 만큼 (각도는 가까운 쪽으로 돌게). 칼은 팔과 따로 섞으면 중간에 엉뚱하게 꺾이니 칼 절대 각도로 섞음
const bladeAng = q => 180 + (q.nU - q.torso) + q.nF + q.sw;
function blendArm(a, b, k) {
  const p = { ...a };
  for (const key of ARM) { const d = key === 'swL' ? b[key] - a[key] : wrap(b[key] - a[key]); p[key] = a[key] + d * k; }
  A.aim(p, bladeAng(a) + wrap(bladeAng(b) - bladeAng(a)) * k);
  p.swBack = k < 0.5 ? a.swBack : b.swBack;
  return p;
}
// 몸 쏠림(pose.rot, + = 진행 방향으로 숙임): 젖힐 때 살짝 뒤로 버텼다가 휘두르는 순간 앞으로 확 숙이고, 회복하며 다시 섬
function leanAt(c, t) {
  const L = c.lean ?? 10, end = c.wind + c.act;
  if (t < c.wind) return -L * 0.3 * Math.sin(Math.min(1, t / c.wind) * Math.PI / 2);
  if (t < end) return -L * 0.3 + L * 1.3 * Math.min(1, (t - c.wind) / c.act / 0.35) ** 0.6;
  const k = Math.min(1, (t - end) / c.rec);
  return L * (1 - k * k * (3 - 2 * k));
}
// 낮은 자세 정도 0~1: lowK = [젖히기 끝, 휘두르기 시작, 휘두르기 끝] (기본은 젖히며 가라앉아 휘두르는 내내 낮게), 회복하며 일어섬
function lowAt(c, t) {
  const [kw, k0, k1] = c.lowK || [0.6, 1, 1], s = c.low ?? 0.85, end = c.wind + c.act;
  if (t < c.wind) return s * kw * Math.sin(Math.min(1, t / c.wind) * Math.PI / 2);
  if (t < end) return s * (k0 + (k1 - k0) * (t - c.wind) / c.act);
  const k = Math.min(1, (t - end) / c.rec);
  return s * k1 * (1 - k * k * (3 - 2 * k));
}
// ---------- 뒤돌기 (정면·뒷모습) ----------
// turn: 'orbit' = 칼끝 각도(몸통 둘레)에 맞춰 몸이 돎 (앞 = 옆, 카메라 쪽 = 정면, 뒤 = 반대 옆, 먼 쪽 = 뒷모습) · [[진행, 보는 쪽]...] = 휘두르기 진행에 따라 차례로
// 'flip' 은 옆모습 리그를 좌우로 뒤집어 그리고(목표도 거울), 'front'·'back' 은 턴어라운드 몸 그림(v6) + 손에서 칼끝으로 칼을 그림
function viewAt(c, t) {
  if (!c.turn || t < c.wind) return 'side';
  const end = c.wind + c.act, u = (t - c.wind) / c.act;
  if (c.turn === 'orbit') {
    if (t >= end) return 'side';
    const o = c.orbit, a = ((o.a0 + (o.a1 - o.a0) * u) % 360 + 360) % 360;
    return a < 45 || a >= 315 ? 'side' : a < 135 ? 'front' : a < 225 ? 'flip' : 'back';
  }
  let v = 'side';
  for (const [k, name] of c.turn) if (u >= k) v = name;
  return v;
}
function atkPose(c, t, from) {
  const r = A.attack(c, t, from);
  // flip = 휘두르는 동안 몸 전체를 앞으로 한 바퀴 돌림 (공중제비, + = 앞으로)
  const fl = c.flip && t >= c.wind ? c.flip * (1 - Math.cos(Math.PI * Math.min(1, (t - c.wind) / c.act))) / 2 : 0;
  r.low = lowAt(c, t);
  r.pose = A.crouch({ ...r.pose, rot: (r.pose.rot || 0) + leanAt(c, t) + fl }, r.low);
  if (!A.isPath(c)) return r;
  const end = c.wind + c.act;
  if (t < c.wind) {   // windView = 젖히는 동안 보는 쪽 (3타: 2타의 뒤로 돈 자세를 그대로 이어받음)
    const q = A.pathAt(c, 0); r.view = c.windView;
    r.pose = blendArm(r.pose, reach(r.pose, r.view === 'flip' ? [-q[0], q[1], q[2]] : q), 1 - (1 - t / c.wind) ** 3);
  }
  else if (t < end) {
    const uu = (t - c.wind) / c.act, q = A.pathAt(c, c.turn === 'orbit' || c.linear ? uu : (c.ease === 'heavy' ? A.heavyEase : A.pathEase)(uu));
    r.view = viewAt(c, t);
    r.pose = reach(r.pose, r.view === 'flip' ? [-q[0], q[1], q[2]] : q);   // 반대 옆을 볼 땐 거울 목표 (그림도 뒤집어 그림)
    r.tipL = q;   // 정면·뒷모습에서 칼끝 자리 (몸 기준, 앞 +x)
  }
  else {
    const k = Math.min(1, Math.max(0, ((t - end) / c.rec - 0.4) / 0.6));
    r.view = viewAt(c, t); r.tipL = A.pathAt(c, 1);
    const q = r.tipL;
    r.pose = blendArm(reach(r.pose, r.view === 'flip' ? [-q[0], q[1], q[2]] : q), r.pose, k * k * (3 - 2 * k));   // 반대 옆을 보며 회복할 땐 거울 목표 (휘두르기와 같은 약속)
  }
  return r;
}

// ---------- 통그림 프레임 (극한 순간만) ----------
// 공격표 frames = [[시작 초, 끝 초, 프레임 번호, 각도0, 각도1, 'c'(가운데 기준 = 공 회전)]]. 그 시간 동안은 리그 대신 통그림을 그림.
// 칼끝 궤적은 리그 자세(보이지 않음)의 칼끝 = 경로를 그대로 따르니 이펙트는 그대로 이어짐
const FR = [];             // art/knight/v5/frames/f0~f8.png
const FRAME = { k: 0.1, cy: 40, meta: {}, ks: {} };   // ks = 프레임별 배율 (따로 뽑은 시트)
const FRL = [];            // 셰이더로 구운 통그림 (빛 각도별) — 지금은 공중 회전(9~12)만   // meta = 프레임마다 그림 속 칼 손잡이·칼끝 (tools/frame_blade.py)   // 그림 px → 게임 px, 공 회전의 중심 높이
function frameAt(c, t) {
  for (const [t0, t1, i, r0 = 0, r1 = r0, mode] of c.frames || []) {
    if (t < t0 || t >= t1) continue;
    const u = (t - t0) / (t1 - t0);
    return { i, rot: r0 + (r1 - r0) * u, center: mode === 'c' };
  }
  return null;
}
// 통그림 속 칼 자리 → 월드 좌표 (drawFrame 과 같은 변환). 그림 속 칼을 칼끝 궤적이 그대로 따라가게
// 그림의 기준점: 공 회전은 그림 가운데, 나머지는 발(meta.foot, 없으면 아래 가운데)
function frameOrigin(fr) {
  const m = FRAME.meta['f' + fr.i], im = FR[fr.i];
  if (fr.center) return m?.center || [im.width / 2, im.height / 2];   // meta.center = 칼을 뺀 몸통 중심 (공이 제자리에서 돌게)
  return m?.foot || [im.width / 2, im.height];
}
function frameBlade(fr, x, y, f) {
  const m = FRAME.meta['f' + fr.i]; if (!m) return null;
  const k = FRAME.ks[fr.i] ?? FRAME.k, a = fr.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const [ox, oy] = frameOrigin(fr), by = fr.center ? y - FRAME.cy : y;
  const w = q => { const lx = (q[0] - ox) * k, ly = (q[1] - oy) * k; return [x + f * (lx * ca - ly * sa), by + lx * sa + ly * ca]; };
  return { t: w(m.tip), g: w(m.grip) };
}
// 정면·뒷모습 = 정면 리그(rig_front, 옆 리그와 같은 부위·셰이더) — 웅크림(low)만큼 무릎을 벌려 낮추고, 칼 든 팔은 칼끝 자리를 겨눔, 칼은 그 손에서 칼끝으로
let frig = null;
function frontPose(v, x, y, f, tipL, low = 0.7, air = false) {
  const back = v === 'back', mir = f * (back ? -1 : 1);
  let aL = 70;
  if (tipL) {   // 칼 든 팔(보는 사람 왼쪽): 어깨에서 칼끝 쪽으로
    const lx = (f * tipL[0]) * mir, ly = tipL[1] + 57;
    aL = Math.max(-40, Math.min(170, Math.atan2(-(lx + 13), ly) * 180 / Math.PI));
  }
  // 옆모습처럼 낮게: 무릎을 바깥으로 크게 벌려(허벅지 벌림 + 정강이 안으로) 엉덩이를 내림. 몸은 칼 쪽으로 기울고 머리는 반대로, 빈손은 들어 균형
  const lean = Math.max(-1, Math.min(1, (aL - 70) / 90));
  if (air) return { aL, eL: -10, aR: 70, eR: 40, tL: 55, sL: -115, tR: 40, sR: -100, torso: 4, head: -4, cape: -40, tail: 25, sq: 0 };   // 공중: 다리를 접어 끌어올림
  return { aL, eL: -10, aR: 55 + 25 * low, eR: 35, tL: 22 + 42 * low, sL: -26 - 72 * low, tR: 22 + 42 * low, sR: -26 - 72 * low,
    torso: 6 + 8 * lean, head: -4 - 6 * lean, cape: -30, tail: 18, sq: 0.06 * low };
}
function drawView(c, v, x, y, f, tipL, opt = {}) {
  const m0 = c.getTransform(), back = v === 'back';
  const sword = () => {   // 손(frontHand, 이 판의 화면 좌표)에서 칼끝으로
    if (!tipL || !frontHand.at) return;
    const sp = rig.sword, tv = tipOf(sp), t = m0.transformPoint(new DOMPoint(x + f * tipL[0], y + tipL[1])), h = frontHand.at;
    const k = m0.a / 2, ang = Math.atan2(t.y - h[1], t.x - h[0]) - Math.atan2(tv[1], tv[0]);
    const s = Math.min(1.12, Math.hypot(t.x - h[0], t.y - h[1]) / (Math.hypot(tv[0], tv[1]) * k));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(h[0], h[1]); c.rotate(ang); c.scale(s * k, s * k); c.drawImage(sp.lit ? sp.lit[0] : sp.img, -sp.px, -sp.py); c.restore();
    P.vhand = (() => { const w = m0.inverse().transformPoint(new DOMPoint(h[0], h[1])); return [w.x, w.y]; })();
  };
  const pose = frontPose(v, x, y, f, tipL, opt.low ?? 0.7, opt.air);
  if (back) { drawFront(c, frig, pose, x, y, f, v, opt); c.save(); c.globalCompositeOperation = 'destination-over'; sword(); c.restore(); }
  else { drawFront(c, frig, pose, x, y, f, v, opt); sword(); }
}
function viewHand(v, x, y) { return P.vhand || [x, y - 55]; }
function drawFrame(c, fr, x, y, f, alpha) {
  const k = FRAME.ks[fr.i] ?? FRAME.k;
  c.save();
  c.translate(x, fr.center ? y - FRAME.cy : y); c.scale(f, 1); c.rotate(fr.rot * Math.PI / 180);
  // 리그와 같은 셰이더: 구워 둔 빛 각도판 중 지금 회전에 맞는 것 (공이 돌아도 빛은 화면 기준 그대로)
  const im = SHADE.on && FRL[fr.i] ? FRL[fr.i][variantFor(c, LIGHT.ang)] : FR[fr.i];
  c.globalAlpha = alpha;
  if (alpha < 1) c.filter = 'brightness(0) invert(0.75) sepia(1) hue-rotate(190deg) saturate(3)';   // 잔상은 푸른 단색
  const [ox, oy] = frameOrigin(fr);
  c.drawImage(im, -ox * k, -oy * k, im.width * k, im.height * k);
  c.restore();
}

function pose(dt) {
  let p;
  P.view = 'side';
  P.frame = P.state === 'attack' ? frameAt(P.atk, P.t) : null;
  if (P.state === 'attack') {
    const r = atkPose(P.atk, P.t, P.atkFrom);
    p = r.pose; P.th = r.th; P.phase = r.phase; P.view = r.view || 'side'; P.tipL = r.tipL; P.low = r.low;
  } else if (P.state === 'dash') p = A.dash(P.t);
  else if (P.state === 'hurt') p = A.hurt(P.t);
  else if (P.state === 'dead') p = A.death(P.t);
  else if (!P.ground) {
    p = A.air(P.vy);
    if (P.djT < 0.34) p = { ...p, rot: (p.rot || 0) + 360 * (1 - (1 - P.djT / 0.34) ** 2) };   // 이단 점프: 앞으로 한 바퀴 공중제비
  }
  else if (Math.abs(P.vx) > 30) { P.runPh += dt * (8 + Math.abs(P.vx) / 40); p = A.run(P.runPh); }
  else p = A.idle(time);
  if (P.ground && P.landT < 0.14 && P.state === 'move') p = lerpPose(A.LAND, p, P.landT / 0.14);
  // 칼 메기·뽑기: 달리기 시작하면 손을 어깨 뒤로 넘겨 칼을 등에 꽂고(carry 'back'), 멈추면 등에서 뽑아 어깨에 걸침('hand'). 공격·대시는 늘 손에
  // 방향을 바꿀 때 속도가 잠깐 0 을 지나도 칼이 손↔등을 오가며 덜그럭거리지 않게: 방향키를 누르고 있거나 움직이면 등, 멈춘 지 0.2초가 지나야 손
  const moving = P.state === 'move' && P.ground && (Math.abs(P.vx) > 30 || keys.left || keys.right);
  P.stillT = moving ? 0 : (P.stillT || 0) + dt;
  const want = moving ? 'back' : P.stillT > 0.2 ? 'hand' : (P.carry || 'hand');
  if (P.state !== 'move') { P.carry = 'hand'; P.carryT = 9; }
  else if (want !== P.carry) { P.carry = want; P.carryT = 0; }
  P.carryT = (P.carryT ?? 9) + dt;
  // (칼 메기·뽑기 짧은 동작은 사용자 요청으로 뺌) 아직 등에 멘 상태(carry 'back')로 잠깐 서 있는 순간엔 칼은 등에 둔 채 팔만 편히 내림 → 방향 바꿀 때 칼이 어깨로 튀지 않음
  if (P.state === 'move' && P.carry === 'back' && !(p.sheath > 0.5)) p = { ...p, sheath: 1, nU: 8, nF: 18 };
  P.pose = p;
}

// 판정: 공격 범위(range = 앞뒤, h = 위아래) 안의 적·허수아비를 모두 벰. 한 공격(atkId)에 같은 적은 한 번만
function tryHit(sweep = false) {
  const c = P.atk;
  const inR = (x, cy) => { const dx = (x - P.x) * P.facing, dy = cy - P.y; return dx >= c.range[0] && dx <= c.range[1] && dy >= c.h[0] - 40 && dy <= c.h[1] + 40; };
  let hit = false;
  for (const e of E) if (e.state !== 'dead' && e.lastHit !== P.atkId && inR(e.x, e.y - e.hh)) { e.lastHit = P.atkId; hitFoe(e, c); hit = true; }
  if (!D.cut && inR(D.x, D.y - 60)) { hitDummy(c); hit = true; }
  if (BOSS && BOSS.hitBy(c, P.atkId, inR)) hit = true;
  if (hit || !sweep) P.hit = true;   // 돌진 베기는 빗나가도 계속 판정
  return hit;
}
function hitDummy(c) {
  const fin = !!c.fin;   // 마무리 (3타 dashcut · 강공격 heavy2)
  hitstop = c.stop; shake = Math.max(shake, c.shake);
  D.flash = 1; D.vt += P.facing * (fin ? 9 : 5);
  F.hitBurst(D.x + P.facing * 34, D.y - 84, P.facing, fin || c.big, c.hitUp ?? 0);   // 적을 베고 나간 반대쪽에서 터짐
  if (c.sfx) F.sfx(c.sfx, D.x + P.facing * 20, D.y - 150, P.facing, fin);
  impactT = fin ? 0.05 : 0.03;   // 임팩트 컷: 화면 반전
  D.hp--;
  if (fin || D.hp <= 0) {
    // 막타: 허리가 가로로 베임 + 슬로우 줌 + 화면 번쩍
    D.cut = { x: 0, y: 0, vx: P.facing * 380, vy: -520, r: 0, vr: P.facing * 7 };
    D.respawn = 1.6;
    slowT = 0.35; zoomTgt = 1.18; flashScreen = 1;
    if (wmat) { const q = wmat.transformPoint(new DOMPoint(D.x, D.y - 80)); F.focusLines(q.x, q.y, 0.32); }
  }
}

// ---------- 그리기 ----------
function cam() {
  const cx = Math.max(W / 2, Math.min(WORLD_W - W / 2, P.x));
  const sx = (Math.random() - 0.5) * shake * 2, sy = (Math.random() - 0.5) * shake * 2;
  return { x: cx - W / 2 - sx, y: sy };
}


// ---------- 도트 굽기 (언더월드 pixfx 방식: 낮은 해상도로 그린 뒤 반투명을 없애고 색을 몇 단계로 끊어 최근접으로 키움) ----------
// PIX = 도트 한 칸이 화면 몇 px 인지. 이펙트(잔상·초승달·충격·먼지)를 전부 한 장의 낮은 해상도 판에 그려 한꺼번에 굽는다.
const PIX = { on: true, n: 2 };
let pixBuf = null, pixCtx = null;
function pixLayer(draw, step = 51) {
  if (!PIX.on) { draw(ctx); return; }
  const w = Math.ceil(cv.width / PIX.n), h = Math.ceil(cv.height / PIX.n);
  if (!pixBuf || pixBuf.width !== w || pixBuf.height !== h) { pixBuf = document.createElement('canvas'); pixBuf.width = w; pixBuf.height = h; pixCtx = pixBuf.getContext('2d', { willReadFrequently: true }); }
  const m = ctx.getTransform();
  pixCtx.setTransform(1, 0, 0, 1, 0, 0); pixCtx.clearRect(0, 0, w, h);
  pixCtx.setTransform(m.a / PIX.n, m.b / PIX.n, m.c / PIX.n, m.d / PIX.n, m.e / PIX.n, m.f / PIX.n);
  pixCtx.imageSmoothingEnabled = true;
  draw(pixCtx);
  pixCtx.setTransform(1, 0, 0, 1, 0, 0);
  const d = pixCtx.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 120) { p[i + 3] = 0; continue; }          // 반투명(번짐)은 없앰
    p[i + 3] = 255;
    p[i] = Math.round(p[i] / step) * step; p[i + 1] = Math.round(p[i + 1] / step) * step; p[i + 2] = Math.round(p[i + 2] / step) * step;   // 색 6단계
  }
  pixCtx.putImageData(d, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixBuf, 0, 0, w * PIX.n, h * PIX.n);
  ctx.restore();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a2f52'; ctx.fillRect(0, 0, cv.width, cv.height);
  const c = cam();
  // 줌: 플레이어 가슴 기준
  const fx = P.x - c.x, fy = P.y - camY - 70;
  ctx.setTransform(view * zoom, 0, 0, view * zoom, view * (fx - fx * zoom), view * (fy - fy * zoom + c.y));
  ctx.translate(-c.x, -camY);

  if (theme()) drawStage(c);
  else {
  // 배경: 단색 + 먼 기둥 (테스트장)
  ctx.fillStyle = '#323862';
  for (let x = 0; x < WORLD_W; x += 240) ctx.fillRect(x + 40 + c.x * 0.3, 140, 60, GROUND - 140);
  ctx.fillStyle = '#4a4f7e'; ctx.fillRect(-200, GROUND, WORLD_W + 400, H);
  ctx.fillStyle = '#5c6294'; ctx.fillRect(-200, GROUND, WORLD_W + 400, 6);
  for (const p of PLATS) { ctx.fillStyle = '#4a4f7e'; ctx.fillRect(p.x, p.y, p.w, 18); ctx.fillStyle = '#5c6294'; ctx.fillRect(p.x, p.y, p.w, 5); }
  for (let x = 0; x < WORLD_W; x += 100) { ctx.fillStyle = '#41467a'; ctx.fillRect(x, GROUND + 10, 2, 12); }
  }

  // 그림자 (발밑 타원)
  shadow(P.x, groundBelow(P.x, P.y), 34);
  shadow(D.x, D.y, 40);

  // 쉼터 · 허수아비 · 아이템 · 적 · 치즈
  drawShelter(); drawDummy(); drawItems();
  for (const e of E) shadow(e.x, e.type === 'crawler' ? e.y : GROUND, e.hw * 0.8);
  pixLayer(c => {
    if (BOSS) BOSS.draw(c, (x, y, r) => { c.fillStyle = 'rgba(20,18,46,0.35)'; c.beginPath(); c.ellipse(x, y + 2, r, Math.max(6, r * 0.14), 0, 0, 7); c.fill(); });
    drawFoes(c); drawCheese(c);
  }, 24);

  // 뒤쪽 이펙트
  pixLayer(c => { F.drawSprites(c, false); F.drawTrails(c, time, false); F.drawFlips(c, false); });
  // (빛 번짐 drawGlow 는 사용자 요청으로 뺌 — 납작하게)


  // 기사쥐
  if (opt.compare && fullImg) {
    drawRig(ctx, rig, A.REST || P.pose, P.x, P.y, 1);
    const k = rig.def.scale;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(fullImg, P.x - rig.def.foot[0] * k, P.y - rig.def.foot[1] * k, fullImg.width * k, fullImg.height * k);
    ctx.globalAlpha = 1;
  } else pixLayer(c => {
    for (const gh of P.ghosts) {
      if (gh.frame && FR[gh.frame.i]) drawFrame(c, gh.frame, gh.x, gh.y, gh.f, 0.35 * (1 - gh.t / 0.22));
      else drawRig(c, rig, gh.pose, gh.x, gh.y, gh.f, { ghost: 0.28 * (1 - gh.t / 0.22) });
    }
    if (P.inv > 0 && P.state !== 'dead' && Math.floor(time * 20) % 2) return;   // 맞은 뒤 무적 동안 깜빡임
    if (P.frame && FR[P.frame.i]) drawFrame(c, P.frame, P.x, P.y, P.facing, 1);
    else if ((P.view === 'front' || P.view === 'back') && frig) drawView(c, P.view, P.x, P.y, P.facing, P.tipL, { flash: P.flash, low: P.low, air: !P.ground });
    else drawRig(c, rig, P.pose, P.x, P.y, P.view === 'flip' ? -P.facing : P.facing, { flash: P.flash });
  }, 24);   // 몸도 도트로 (색 약 10단계)

  // 앞쪽 이펙트
  wmat = ctx.getTransform();
  drawFG(c);   // 캐릭터 앞을 스치는 흐린 앞 판 (이펙트는 그 위)
  pixLayer(c => { F.drawTrails(c, time, true); F.drawFlips(c, true); F.drawSprites(c, true); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  F.drawFocus(ctx, cv.width, cv.height);
  // 임팩트 컷: 1~2프레임 색 반전 (젠존제식 타격 순간)
  if (impactT > 0) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over'; }

  if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(10,8,20,${fade})`; ctx.fillRect(0, 0, cv.width, cv.height); }   // 방 이동 페이드
  // 화면 번쩍 (막타)
  if (flashScreen > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,240,200,${flashScreen * 0.35})`; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}
// ---------- 무대: 방마다 테마 (city 밤의 뒷골목 · sewer 하수도 · forest 보관용 숲) — art/bg/<테마> ----------
// (부엌 → 시골 숲 → 2026-10-28 사용자 결정으로 현대 도시 + 팝아트. 인간 도시에서 기사도의 낭만을 꿈꾸는 생쥐)
// 원근: 먼 판일수록 흐리고(blur) 안개색이 섞여 옅고 카메라를 느리게 따라감(p) → 앞의 캐릭터가 선명. 앞 판(fg)은 흐리고 어둡게, 카메라보다 빠르게.
// 깊이 3단: 단마다 그 깊이의 바닥 띠를 깔고 물건을 그 위에 세움 (허공에 뜨지 않게). 그림은 플랫 → 흐림·안개 → 픽셀화를 불러올 때 한 번 구움.
// haze = [하늘, 먼 판, 1단, 2단, 3단] 안개색 · floor.top = 바닥 띠 그림에서 서는 선 높이(px) · farBottom = 먼 판 그림에서 건물·나무 밑동 높이(px)
const THEMES = {
  forest: { back: 'back.png', far: 'far_keyed.png', farBottom: 714, fg: 'fg_keyed.png', objs: ['root', 'scarecrow', 'wheel', 'sign', 'mushroom', 'rock'],
    floor: { src: 'floor_keyed.png', top: 330, s: 0.3, cell: 10 }, haze: ['#7a6fa0', '#5d7590', '#5d7590', '#536a80', '#4f6478'], shade: '#2a1d24' },
  city: { back: 'back.png', far: 'far_keyed.png', farBottom: 756, fg: 'fg_keyed.png', objs: ['trashcan', 'crates', 'cone', 'hydrant', 'soda', 'neon'],
    floor: { src: 'floor_keyed.png', top: 200, s: 0.3, cell: 10 }, haze: ['#3b2f6e', '#3a2f5c', '#40305e', '#3a2c58', '#352a50'], shade: '#15121f' },
  sewer: { back: 'back.png', far: null, fg: null, objs: [],
    floor: { src: 'floor_keyed.png', top: 250, s: 0.3, cell: 10 }, haze: ['#1f3a36', '#24403b', '#24403b', '#24403b', '#24403b'], shade: '#0f1a18' },
};
const TIERS = [   // 깊이 단 모양 (모든 테마 공통): p = 카메라 따라가는 정도 · base = 그 단의 땅선 · a = 안개 진하기
  { p: 0.36, s: 0.2, base: GROUND - 42, blur: 3, a: 0.46, bright: 0.6, cell: 9, gap: [150, 300] },
  { p: 0.56, s: 0.28, base: GROUND - 24, blur: 1.8, a: 0.3, bright: 0.68, cell: 8, gap: [230, 420] },
  { p: 0.78, s: 0.36, base: GROUND - 9, blur: 0.8, a: 0.16, bright: 0.76, cell: 7, gap: [380, 680] },
];
const FG = { p: 1.35, blur: 9, bright: 0.38, cell: 12, s: 0.5 };
const TH = {};   // 구워 둔 테마 { back, far, fg, floor, tiers:[{ground, obj}] }
const theme = () => TH[ROOMS[room].theme] || TH.forest;
let camY = 0;   // 카메라 세로: 높이 뛰면 살짝 따라 올라감 (레이어마다 p 만큼만 → 위아래 시차)
async function loadTheme(name) {
  const D = THEMES[name], dir = `../art/bg/${name}/`, t = { def: D, tiers: [] };
  const floorIm = await loadImg(dir + D.floor.src); if (!floorIm) return;   // 바닥이 없으면 이 테마는 아직 없음 (숲으로 대신)
  t.floor = pixelate(floorIm, D.floor.cell);
  const back = await loadImg(dir + D.back);
  if (back) t.back = { b: bakeLayer(back, 5, [D.haze[0], 0.2], 0.72, 6), cell: 6, s: (GROUND + 120) / back.height, y: 0, p: 0.06 };
  const far = D.far && await loadImg(dir + D.far);
  if (far) { const s = (GROUND - 8) / (D.farBottom || far.height); t.far = { b: bakeLayer(far, 3.5, [D.haze[1], 0.38], 0.68, 5), cell: 5, s, y: 0, p: 0.28 }; }
  const fg = D.fg && await loadImg(dir + D.fg); if (fg) t.fg = bakeLayer(fg, FG.blur, null, FG.bright, FG.cell);
  const objs = {}; for (const n of D.objs) objs[n] = await loadImg(`${dir}obj/${n}.png`);
  t.objs = D.objs.filter(n => objs[n]);
  TIERS.forEach((T, i) => {
    const o = {}; for (const n of t.objs) o[n] = bakeLayer(objs[n], T.blur, [D.haze[2 + i], T.a], T.bright, T.cell);
    t.tiers.push({ obj: o, ground: bakeLayer(floorIm, T.blur, [D.haze[2 + i], T.a], T.bright, D.floor.cell) });
  });
  TH[name] = t;
}
function decoFor(i) {   // 방 i 의 단별 물건 자리 (한 번 만들어 둠, 그 방 테마의 물건으로)
  const R = ROOMS[i], names = (TH[R.theme] || TH.forest)?.objs || [];
  if (R.deco) return R.deco;
  if (!names.length) return (R.deco = TIERS.map(() => []));
  let seed = 7 + i * 101;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  R.deco = TIERS.map(T => {
    const out = [];
    for (let x = -W + rnd() * T.gap[0]; x < R.w * T.p + W * 1.5; x += T.gap[0] + rnd() * (T.gap[1] - T.gap[0])) out.push({ x, n: names[Math.floor(rnd() * names.length)], flip: rnd() < 0.5 });
    return out;
  });
  return R.deco;
}
function drawTiers(c) {
  const th = theme(), F0 = th.def.floor, deco = decoFor(room);
  TIERS.forEach((T, ti) => {
    const L = th.tiers[ti], gs = F0.s * (0.45 + 0.4 * T.p), oy = camY * (1 - T.p);
    if (L.ground) tileLayer(L.ground, F0.cell, gs, T.base - F0.top * gs, T.p, c);   // 이 깊이의 땅
    for (const it of deco[ti]) {
      const b = L.obj[it.n]; if (!b) continue;
      const w = b.width * T.cell * T.s, h = b.height * T.cell * T.s, x = it.x + c.x * (1 - T.p);
      if (x + w < c.x - 50 || x - w > c.x + W + 50) continue;
      ctx.save(); ctx.translate(x, T.base + 4 + oy); if (it.flip) ctx.scale(-1, 1);
      ctx.drawImage(b, -w / 2, -h, w, h); ctx.restore();
    }
  });
}
function bakeLayer(im, blur, haze, bright, cell) {
  if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.filter = `blur(${blur}px) brightness(${bright})`; x.drawImage(im, 0, 0); x.filter = 'none';
  if (haze) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = haze[1]; x.fillStyle = haze[0]; x.fillRect(0, 0, c.width, c.height); }   // 멀수록 안개색
  return pixelate(c, cell);
}
// 한 레이어를 가로로 이어 붙임: 화면에서 카메라의 p 만큼만 움직이게 (월드 좌표 = 화면 좌표 + 카메라)
function tileLayer(b, cell, s, y, p, c) {
  const dw = b.width * cell * s, dh = b.height * cell * s, base = c.x * (1 - p);
  y += camY * (1 - p);   // 세로도 카메라의 p 만큼만
  for (let x = base + Math.floor((c.x - base) / dw) * dw - dw; x < c.x + W + dw; x += dw) ctx.drawImage(b, x, y, dw + 1, dh);
}
function drawFG(c) {
  const fg = theme()?.fg; if (!fg) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const h = fg.height * FG.cell * FG.s;
  tileLayer(fg, FG.cell, FG.s, GROUND + 130 - h, FG.p, c);
  ctx.restore();
}
// 플랫하게 뽑은 그림을 코드로 픽셀화: cell 배 작게 줄여(평균색) 색을 step 단위로 끊고, 그릴 때 최근접으로 키움. 불러올 때 한 번만 굽는다
function pixelate(im, cell, step = 24) {
  if (!im) return null;
  const w = Math.max(1, Math.round(im.width / cell)), h = Math.max(1, Math.round(im.height / cell));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 128) { p[i + 3] = 0; continue; }
    p[i + 3] = 255;
    for (let k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] / step) * step;
  }
  x.putImageData(d, 0, 0);
  return c;
}
function drawStage(c) {
  const th = theme(), FLOOR = th.def.floor;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (const L of [th.back, th.far]) if (L) tileLayer(L.b, L.cell, L.s, L.y, L.p, c);   // 먼 판부터 (흐리고 옅게 구워 둠)
  drawTiers(c);   // 깊이 3단 땅 + 물건
  ctx.filter = 'brightness(0.85)';   // 바닥은 선명하게, 칼빛이 튀도록 살짝만 누름
  const fl = th.floor, s = FLOOR.s * FLOOR.cell, w = fl.width * s, h = fl.height * s, y0 = GROUND - FLOOR.top * FLOOR.s;   // 구운 판은 cell 배 작음
  for (let x = Math.floor((c.x - 200) / w) * w; x < c.x + W + w; x += w) ctx.drawImage(fl, x, y0, w + 1, h);
  ctx.fillStyle = th.def.shade; ctx.fillRect(c.x - 200, y0 + h, W + 400, H + 300);   // 띠 아래는 그늘
  for (const p of PLATS) {   // 발판: 띠를 반 높이로 잘라 얹음
    const t = FLOOR.top * FLOOR.s * 0.6;
    ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y - t, p.w, h * 0.35); ctx.clip();
    for (let x = p.x; x < p.x + p.w; x += w * 0.6) ctx.drawImage(fl, x, p.y - t, w * 0.6, h * 0.6);
    ctx.restore();
  }
  ctx.restore();
}
function groundBelow(x, y) { let g = GROUND; for (const p of PLATS) if (x > p.x && x < p.x + p.w && p.y >= y - 1 && p.y < g) g = p.y; return g; }
function shadow(x, y, r) { ctx.fillStyle = 'rgba(20,18,46,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, r, 6, 0, 0, Math.PI * 2); ctx.fill(); }

const DUMMY_H = 170;
function drawDummy() {
  const st = dummyImg.stand; if (!st) return;
  const k = DUMMY_H / st.height;
  ctx.save(); ctx.translate(D.x, D.y);
  if (D.cut) {
    // 아랫동강은 제자리, 윗동강은 날아감
    const b = dummyImg.cut_bot, t = dummyImg.cut_top;
    ctx.drawImage(b, -b.width * k / 2 + 6 * k, -b.height * k, b.width * k, b.height * k);
    const c = D.cut;
    ctx.translate(c.x, -DUMMY_H * 0.5 + c.y); ctx.rotate(c.r);
    ctx.drawImage(t, -t.width * k / 2, -t.height * k * 0.75, t.width * k, t.height * k);
  } else {
    ctx.rotate(D.tilt * 0.25);
    const im = Math.abs(D.tilt) > 0.6 ? dummyImg.tilt : st;
    ctx.scale(D.tilt < -0.6 ? -1 : 1, 1);
    ctx.drawImage(im, -im.width * k / 2, -im.height * k, im.width * k, im.height * k);
    if (D.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = D.flash * 0.45; ctx.drawImage(dummyImg.white, -im.width * k / 2, -im.height * k, im.width * k, im.height * k); }
  }
  ctx.restore();
}

// 칼끝 기록 → 리본. 휘두르는 구간(act + 회복 앞부분)만
// 휘두르는 구간(act)만: 지난 프레임 ~ 지금 사이를 1/240초로 쪼개 그 시각의 자세로 칼 자리를 계산
// (칼이 한두 프레임 만에 몸 앞을 가로지르니 프레임 자리만 이으면 궤적이 머리 위로 돌아 보임)
const FX_BIG = 1.5;   // 칼빛 크기 배율 (칼 길이 대비)
function sampleBlade(t0, t1) {
  if (P.state !== 'attack' || opt.compare) { if (P.trail) { F.streakEnd(P.trail); P.trail = null; } return; }
  const c = P.atk, path = A.isPath(c), a = c.wind, b = c.wind + c.act + (path ? 0 : 0.03);
  if (c.noTrail) return;   // 칼빛 줄기 없이 그림 이펙트만 (강공격 마무리)
  if (c.spin && !path) return;   // 회전 베기는 회전 이펙트만
  if (t1 < a) return;
  if (!P.trail) {
    P.trail = F.streakStart(P.atkId); P.trail.f = P.facing; P.trail.life = c.act;
    if (c.dashFx) F.FX.streaks = F.FX.streaks.filter(s => s === P.trail);   // 돌진 섬광만 남김 (앞 회전의 칼빛 꼬리와 겹쳐 두 갈래로 보이지 않게)
    if (c.flatFx) P.trail.wFix = c.flatFx;   // 수평 회전 베기: 어느 자리든 같은 굵기의 얇은 띠
    if (c.fxScale) P.trail.wMul = c.fxScale;   // 충전 돌진 마무리: 모은 만큼 칼빛이 굵어짐
    if (path) P.trail.span = c.act * 0.75 + 0.2;   // 한 번에 나타난 칼빛이 잠깐 머물렀다 부서짐   // 경로 베기: 꼬리가 휘두르는 도중부터 차례로 먹혀 들어가 칼끝만 남고 사라짐
  }
  const s0 = Math.max(a, t0), s1 = Math.min(b, t1), f = P.facing, e = c.ell;
  for (let ts = s0; ts <= s1 + 1e-6; ts += 1 / 240) {
    if (c.dashFx) {   // 돌진 섬광: 칼끝 대신 몸통 가운데가 줄기 머리 → 지나온 길이 몸 뒤로 따라붙는 빛 줄기 (칼빛은 다음 베어 넘기기에서)
      const cx = P.x + P.facing * 6, cy = P.y - 46;
      F.streakPush(P.trail, cx, cy, time - (t1 - ts), cx, cy + 34, cx, cy);
      continue;
    }
    const r = atkPose(c, ts, P.atkFrom), fr = frameAt(c, ts);
    const vf = r.view === 'flip' ? -f : f;
    const bl = (fr && FR[fr.i] && frameBlade(fr, P.x, P.y, f))
      || ((r.view === 'front' || r.view === 'back') && frig && r.tipL ? { g: viewHand(r.view, P.x, P.y), t: [P.x + f * r.tipL[0], P.y + r.tipL[1]] } : null)
      || bladeAt(rig, r.pose, P.x, P.y, vf);   // 통그림 구간은 그림 속 칼, 정면·뒷모습은 손 → 칼끝 자리
    let out = bl.t, g2 = bl.g;
    if (c.hz && !path) {   // 수평 베기: 칼끝이 몸을 가로지르는 가슴 높이 경로(몸통 둘레 납작한 타원)를 꼬리가 따라감
      const th = r.th * Math.PI / 180, ct = Math.cos(th), cx = P.x + r.pose.x * f + e.cx * f, cy = P.y + r.pose.y + e.cy - 4;
      out = [cx + ct * e.rx * (ct > 0 ? 1.3 : 1) * f, cy + Math.sin(th) * e.ry * (c.wrap ? 1.25 : 0.7)];
      const kb = c.wrap ? 0.12 : 0.45;
      out = [out[0] + (bl.t[0] - out[0]) * kb, out[1] + (bl.t[1] - out[1]) * kb];   // 실제 칼끝 쪽으로 끌어와 칼에 붙어 보이게
      const pf = P.trail.pts[P.trail.pts.length - 1];
      if (!c.wrap && pf && (out[0] - pf.x) * f < 0) { out[0] = pf.x; out[1] = pf.y; }
      g2 = [out[0], out[1] + 80];
    }
    if (c.flatFx) g2 = [out[0], out[1] + 14];   // 칼끝 길 바로 아래로 얇게: 두께가 칼 각도에 따라 부풀지 않는 수평 띠
    else if (path) {   // 칼빛을 칼보다 크게: 손잡이에서 칼끝 방향으로 FX_BIG 배 더 뻗은 자리를 칼빛 머리로 (강조)
      const k = FX_BIG * (c.fxScale || 1);
      out = [g2[0] + (out[0] - g2[0]) * k, g2[1] + (out[1] - g2[1]) * k];
    }
    if (c.fxAhead) { out = [out[0] + f * c.fxAhead, out[1]]; g2 = [g2[0] + f * c.fxAhead, g2[1]]; }   // 칼빛을 앞으로 밀어 그림
    F.streakPush(P.trail, out[0], out[1], time - (t1 - ts), g2[0], g2[1], out[0], out[1]);
    P.tip = out;
    if (Math.random() < 0.12) F.tipSpark(out[0], out[1], f);
  }
  if (t1 >= b) {   // 끝나도 칼끝이 관성으로 조금 더 나가며 꼬리가 이어짐
    const Q = P.trail.pts, n = Q.length;
    if (path) { /* 경로 베기는 경로 끝이 곧 마무리 (관성 꼬리 없음) */ }
    else if (c.hz && !c.wrap && n >= 1) {   // (사용 안 함) 1타: 전방을 베어 넘긴 끝에서 이펙트가 몸을 크게 한 바퀴 감아 돎 (위 → 뒤 → 아래로 둥글게, 다음 타의 몸 돌리기로 연결)
      const b2 = Q[n - 1], f = P.facing, C = [P.x + 4 * f, P.y + e.cy - 6];
      const Rx = Math.max(70, (b2.x - C[0]) * f), Ry = 74;
      let at = b2.at;
      for (let k = 1; k <= 90; k++) {
        const u = k / 90, ph = u * 330 * Math.PI / 180, sh = 1 - 0.28 * u;
        const x = C[0] + f * Rx * sh * Math.cos(ph), y = C[1] - Ry * sh * Math.sin(ph);
        at += 1 / 230;
        F.streakPush(P.trail, x, y, at, C[0], C[1], x, y);
      }
    } else if (n >= 2) {
      const a2 = Q[n - 2], b2 = Q[n - 1];
      let vx = (b2.x - a2.x) * 1.5, vy = (b2.y - a2.y) * 0.6, x = b2.x, y = b2.y, at = b2.at;
      const dx = (b2.gx ?? b2.x) - b2.x, dy = (b2.gy ?? b2.y) - b2.y;
      for (let k = 0; k < 48; k++) { vx *= 0.955; vy *= 0.955; x += vx; y += vy; at += 1 / 240; F.streakPush(P.trail, x, y, at, x + dx, y + dy, b2.rx, b2.ry); }
    }
    F.streakEnd(P.trail); P.trail = null;
  }
}

// ---------- 루프 ----------
let last = performance.now(), manual = false;
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!manual) tick(dt);
  requestAnimationFrame(frame);
}
function tick(dt) {
  impactT -= dt;   // 임팩트 컷은 실제 시간 (슬로우에 안 늘어남)
  fade = Math.max(0, fade - dt * 2.5);
  camY += (Math.min(0, (P.y - GROUND) * 0.55) - camY) * Math.min(1, dt * 5);   // 높이 뛰면 카메라가 반쯤 따라 올라감
  if (bannerT > 0 && (bannerT -= dt) <= 0) document.getElementById('banner').style.opacity = 0;
  if (BOSS) { const f = document.getElementById('bossfill'); if (f) f.style.width = (BOSS.hp / BOSS.max * 100) + '%'; }   // 보스 체력 막대
  // HUD: 체력 하트 · 레벨 · 다음 레벨까지 치즈 막대 (바뀔 때만 다시 씀)
  const nx = LV_XP[G.lv + 1], hud = `${P.hp}|${G.maxHp}|${G.lv}|${G.xp}`;
  if (hud !== tick.hud) {
    tick.hud = hud;
    const pct = nx ? Math.min(100, (G.xp - LV_XP[G.lv]) / (nx - LV_XP[G.lv]) * 100) : 100;
    document.getElementById('stat').innerHTML = `<span style="color:#ff5d73;font-size:20px;letter-spacing:2px">${'♥'.repeat(Math.max(0, P.hp))}<span style="color:#5a4a66">${'♥'.repeat(Math.max(0, G.maxHp - P.hp))}</span></span><br>`
      + `<b style="color:#f2b33d">Lv${G.lv}</b> <span style="display:inline-block;width:120px;height:8px;background:#2b2a44;border-radius:4px;vertical-align:middle"><span style="display:block;width:${pct}%;height:100%;background:#ffd23a;border-radius:4px"></span></span> <span style="color:#c9c6dc;font-size:12px">${nx ? `${G.xp} / ${nx}` : 'MAX'}</span>`;
  }
  if (opt.slow) dt *= 0.25;
  if (slowT > 0) { slowT -= dt; dt *= 0.3; }
  zoomTgt = slowT > 0 ? zoomTgt : P.state === 'attack' && P.atk.charge ? 1.08 + 0.14 * Math.min(1, (P.chT || 0) / CH_MAX) : 1;   // 기 모으는 동안 화면이 당겨짐 (오래 모을수록 더)
  zoom += (zoomTgt - zoom) * Math.min(1, dt * (slowT > 0 ? 18 : 5));
  flashScreen = Math.max(0, flashScreen - dt * 9);
  shake = Math.max(0, shake - dt * 40);
  if (hitstop > 0) hitstop -= dt;   // 히트스톱: 시뮬레이션 멈춤, 그리기는 계속
  else { time += dt; update(dt); F.update(dt, time); F.smearPrune(SMEAR, time); }
  render();
  document.getElementById('state').textContent = `${P.state}${P.atkName && P.state === 'attack' ? ' · ' + P.atkName : ''} · ${P.ground ? '지상' : '공중'}`;
}

// 필름: 자동 진행을 멈추고 dt 씩 넘기며 플레이어 둘레를 잘라 한 줄로 저장 (docs/shots/<name>.png)
async function film(name, setup, n = 12, dt = 1 / 60, every = 1, box = [-160, -230, 330, 260]) {
  manual = true;
  setup?.();
  const fr = [];
  for (let i = 0; i < n * every; i++) {
    tick(dt);
    if (i % every) continue;
    // 지난 그리기의 월드→캔버스 변환으로 자름 (줌·흔들림 포함)
    const q = wmat.transformPoint(new DOMPoint(P.x + box[0], P.y + box[1])), s = view;
    const sx = q.x, sy = q.y;
    const g = document.createElement('canvas'); g.width = box[2] * s; g.height = box[3] * s;
    g.getContext('2d').drawImage(cv, sx, sy, box[2] * wmat.a, box[3] * wmat.a, 0, 0, g.width, g.height);
    fr.push(g);
  }
  manual = false;
  const out = document.createElement('canvas'); out.width = fr[0].width * fr.length; out.height = fr[0].height;
  const x = out.getContext('2d'); fr.forEach((g, i) => x.drawImage(g, i * g.width, 0));
  x.fillStyle = '#fff'; x.font = '14px sans-serif'; fr.forEach((g, i) => x.fillText(String(i * every), i * g.width + 4, 16));
  const b = await new Promise(r => out.toBlob(r, 'image/png'));
  await fetch(`/__save?name=${name}.png`, { method: 'POST', body: b });
  return name;
}

// ---------- 패널 ----------
function toggle(k) {
  if (k === 'shade') SHADE.on = !SHADE.on;
  else if (k === 'glow') F.FX.glow = !F.FX.glow;
  else if (k === 'ink') F.FX.ink = !F.FX.ink;
  else if (k === 'halftone') { SHADE.halftone = !SHADE.halftone; rebake(rig); }
  else opt[k] = !opt[k];
  const on = { shade: SHADE.on, glow: F.FX.glow, ink: F.FX.ink, halftone: SHADE.halftone }[k] ?? opt[k];
  document.querySelector(`[data-tog=${k}]`)?.classList.toggle('on', on);
}
document.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => toggle(b.dataset.tog));
let comboQ = 0;
document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if (P.state === 'dead' && a !== 'death') P.state = 'move';
  if (A.ATTACKS[a]) { P.ground ? startAttack(a) : 0; }
  else if (a === 'combo') { startAttack('slash1'); comboQ = 2; }
  else if (a === 'dash') startDash();
  else if (a === 'hurt') pressed.hurt = true;
  else if (a === 'death') { P.state = 'dead'; P.t = 0; }
  b.blur();
});
// 3타 연속 버튼: 회복에 들어가면 자동으로 다음 타 입력
setInterval(() => { if (comboQ > 0 && P.state === 'attack' && P.t > P.atk.wind + P.atk.act) { P.atkBuf = 0.2; if (P.atkName === 'slash3' || --comboQ <= 0) comboQ = Math.max(0, comboQ); } }, 30);
for (const [id, key] of [['shA', 'shadowA'], ['hiA', 'lightA']]) {
  const el = document.getElementById(id); el.value = SHADE[key];
  el.oninput = () => { SHADE[key] = +el.value; rebake(rig); };
}

// ---------- 확인용 캡처: 자세 여러 개를 크게 그려 docs/shots/<name>.png 로 저장 ----------
// poses = [{ pose, label, compare }] · compare = 통그림을 반투명으로 겹침
async function shot(name, poses, k = 3) {
  const cw = 300, ch = 260, c = document.createElement('canvas');
  c.width = cw * k * poses.length; c.height = ch * k;
  const x = c.getContext('2d');
  x.fillStyle = '#e9e7f2'; x.fillRect(0, 0, c.width, c.height);
  poses.forEach((q, i) => {
    x.setTransform(k, 0, 0, k, cw * k * i, 0);
    x.fillStyle = '#c9c6dc'; x.fillRect(0, 220, cw, 2);
    drawRig(x, rig, q.pose, 150, 220, q.facing ?? 1);
    if (q.compare && fullImg) {
      const s = rig.def.scale; x.globalAlpha = 0.4;
      x.drawImage(fullImg, 150 - rig.def.foot[0] * s, 220 - rig.def.foot[1] * s, fullImg.width * s, fullImg.height * s);
      x.globalAlpha = 1;
    }
    if (q.frame != null && FR[q.frame]) {   // 통그림과 겹쳐 비교 (리그 자세를 통그림에 맞출 때)
      const im = FR[q.frame], s = FRAME.k; x.globalAlpha = 0.45;
      const [ox, oy] = frameOrigin({ i: q.frame });
      x.drawImage(im, 150 - ox * s, 220 - oy * s, im.width * s, im.height * s); x.globalAlpha = 1;
    }
    if (q.draw) q.draw(x);
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#333'; x.font = `${14 * k}px sans-serif`; x.fillText(q.label || '', cw * k * i + 8, 18 * k);
  });
  const b = await new Promise(r => c.toBlob(r, 'image/png'));
  await fetch(`/__save?name=${name}.png`, { method: 'POST', body: b });
  return name;
}

// ---------- 시작 ----------
const loadImg = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = globalThis.__ASSETS?.[src] ?? src; });
(async () => {
  const RIG_DIR = new URLSearchParams(location.search).get('rig') === 'old' ? '../art/knight/rig' : '../art/knight/rig_v4';   // 기본 = 새 치비판 (예전 리그는 ?rig=old)
  rig = await loadRig(RIG_DIR);
  for (let i = 0; i < 9; i++) FR[i] = await loadImg(`../art/knight/v5/frames/f${i}.png`);
  try { FRAME.meta = await (await fetch('../art/knight/v5/frames/meta.json')).json(); } catch (e) {}
  // 공중 세로 회전 통그림 (Codex, art/knight/v6spin): f9 몸 말기 · f10 공 · f11 공(칼 뒤) · f12 펴기
  const toCanvas = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c; };   // 셰이더 굽기는 canvas 를 받음
  for (let i = 9; i <= 12; i++) { const im = await loadImg(`../art/knight/v6spin/frames/f${i}.png`); if (im) { FR[i] = toCanvas(im); FRL[i] = bakePart(FR[i]); } }
  try { Object.assign(FRAME.meta, await (await fetch('../art/knight/v6spin/frames/meta.json')).json()); } catch (e) {}
  if (FR[11]) for (let i = 9; i <= 12; i++) FRAME.ks[i] = 62 / 300;   // 공 몸통(칼 뺀 지름 약 300px) ≈ 게임 62px, 네 장 같은 배율
  try { frig = await loadRig('../art/knight/rig_front'); } catch (e) { console.warn('정면 리그 없음', e); }
  for (const name in THEMES) await loadTheme(name);   // 그림이 없는 테마는 건너뜀 → 숲으로 대신 그림
  await TOAD.load(loadImg);   // 보스 부위 그림 (없으면 임시 도형)
  // 적 · 소품 그림 (Codex, 플랫 → 그릴 때 몸처럼 도트로 구움)
  for (const t in FOE) for (const n of FOE[t].frames) FOE_IMG[t][n] = await loadImg(`../art/enemy/${t}/cut/${n}.png`);
  for (const n of ['candle_off', 'candle_on', 'crumb', 'wedge']) PROP[n] = await loadImg(`../art/props/cut/${n}.png`);
  if (FR[8]) FRAME.k = 92 / FR[8].height;   // 준비 자세(8) 키 = 게임 약 92px 에 맞춰 모든 프레임 같은 배율
  { const p = { ...A.IDLE, nU: 90, nF: 0, swL: 1, torso: 0 }; A.aim(p, 90); const b = bladeAt(rig, p, 0, 0, 1); A.PATH_K.k = Math.hypot(b.t[0] - b.s[0], b.t[1] - b.s[1]) / 118; }   // 칼을 늘리지 않고 닿게 경로를 리그 크기에 맞춤
  await F.loadFx('../art/fx/cut');
  await F.loadPix('../art/fx/pixel/cut');
  await F.loadFlat('../art/fx/flat/cut');
  await F.loadBold('../art/fx/bold/cut');
  await F.loadV2('../art/fx/v2stage/cut');
  await F.loadSeq('../art/fx/seq_pop', { hslash: 3, ring: 3 });
  for (const n of ['stand', 'tilt', 'cut_top', 'cut_bot']) dummyImg[n] = await loadImg(`../art/dummy/cut/${n}.png`);
  if (dummyImg.stand) {   // 피격 번쩍용 흰 그림
    const s = dummyImg.stand, c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
    const x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    dummyImg.white = c;
  }
  fullImg = await loadImg(RIG_DIR + '/full_keyed.png');
  if (rig.def.rest) A.setRest(rig.def.rest);
  loadRoom(0);
  globalThis.__game = { ROOMS, got, go, loadRoom, G, get E() { return E; }, get BOSS() { return BOSS; },
    get CH() { return CH; }, PIX, P, D, A, F, rig, opt, SHADE, LIGHT, shot, film, startAttack, startDash, FR, FRAME, drawView, get frig() { return frig; }, get D2() { return D; },
    step: (n, dt = 1 / 60) => { manual = true; for (let i = 0; i < n; i++) tick(dt); manual = false; },   // 테스트: 저장 없이 프레임만 넘김
  };
  requestAnimationFrame(frame);
})();

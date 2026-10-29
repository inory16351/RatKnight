// 보스: 하수도의 왕 개굴대왕 (거대 두꺼비). 사양은 사용자와 하나씩 확정 (2026-10-28):
//  · 혀: 눈이 번쩍이며 0.6초 조준 → 일직선으로 쏨. 맞으면 입 앞으로 끌려와 한 번 더 맞음, 빗나가면 혀가 바닥에 박혀 1초 빈틈
//  · 짓누르기: 화면 위로 사라졌다 플레이어 자리에 그림자가 커지며 쿵 → 양옆으로 충격파 (점프로 피함)
//  · 물방울: 볼을 부풀렸다 포물선 3발, 떨어진 자리에 잠깐 웅덩이
//  · 2페이즈: 체력 50% 이하에서 울부짖고 붉어지며 빨라지고, 짓누르기 뒤 곧바로 혀
//  · 빈틈: 언제든 때릴 수 있고, 혀가 박혔을 때·착지 직후엔 피해 2배, 박힌 혀를 베면 휘청
// 몸은 컷아웃 리그(부위 그림 + 관절). 그림이 오기 전엔 같은 관절 구조를 임시 도형으로 그림.
import { rect, body, area, line, grow, touches, GRACE } from './hitbox.js';
import { SHADE, bakeLit, ringed } from './shade.js';
const LIGHT_ANG = Math.atan2(-0.85, -0.5);   // rig.js LIGHT 와 같은 빛 (화면 기준, 왼쪽 위)
export const BOSS_SHADE = { halftone: false, soft: 0.02, shadowA: 0.42 };   // 보스 명암: 망점 없이 또렷한 2톤 셀 (레일 지네도 씀)
const HP = 260, TONGUE_MAX = 560, G2 = 1600;
// ---------- 컷아웃 리그 (art/boss/toad/cut, Codex 부위 시트) ----------
// 좌표 = 리그 공간(그림 px, 원점 = 발밑 가운데, 왼쪽을 봄) × K. at = 부모 공간에서 관절 자리, piv = 부위 그림 속 관절 자리
// v2 (2026-10-29, 보라 독두꺼비 시안 A): 부위 시트를 통 그림(art/boss/toad/v2/full.png, 시트의 1.21배)에 겹쳐 보며 조립한 자리.
// img = 다른 부위 그림을 빌려 씀 · rot = 기본 각도 · s = 기본 크기 · dim = 어둡게(먼 쪽 다리)
const K = 0.4;   // 게임 키 약 300px (v1 보다 큼 — 얼굴·눈이 도트 4px 판에서 읽히게)
const RIG = {
  arm2: { img: 'arm', at: [-208, -274], piv: [188, 50], rot: 10, dim: true },   // 먼 쪽 앞팔 (시트엔 한 쌍뿐이라 같은 그림을 어둡게)
  hand2: { img: 'hand', at: [-276, -160], piv: [216, 24], dim: true },
  foot: { at: [394, -153], piv: [249, 39] },             // 뒷발: 발꿈치 관절, 발가락은 앞(왼쪽)으로
  belly: { img: 'throatBig', at: [-68, -248], s: 1.25 },   // 다리 사이로 보이는 아랫배 (몸통 그림의 배 밑이 통 그림보다 높아 메움)
  body: { at: [-459, -754], piv: [0, 0] },               // 몸통+머리(윗턱)+왕관+망토
  thigh: { at: [428, -140], piv: [308, 209] },           // 뒷다리: 엉덩이 아래 혹을 축으로 접힘
  jaw: { at: [-102, -501], piv: [348, 30] },             // 아래턱+목주머니: 입꼬리를 축으로 벌어짐
  throatBig: { at: [-260, -390], piv: [154, 28] },       // 부푼 목주머니 (물방울 뱉기 전)
  arm: { at: [68, -290], piv: [188, 50] },               // 앞팔: 어깨
  hand: { at: [-20, -184], piv: [216, 24] },             // 앞손: 손목
  lidA: { at: [-235, -578], s: 0.65 }, lidB: { at: [-410, -578], s: 0.5 },   // 눈꺼풀 (눈 가운데)
  mouth: [-446, -506],                                   // 혀가 나오는 입끝
};
export const TOAD = {
  rig: null,
  // 부위 그림 → 화면 도트 2칸당 1텍셀로 미리 줄이고(고품질) → 코드 셰이더 명암(왼쪽/오른쪽을 볼 때 빛 방향 각각) 을 한 번 구움.
  // 실제 도트화는 그릴 때 보스 전용 pixLayer(도트 4px, 배경 굵기)에서 한꺼번에 → 돌아가는 부위도 같은 격자로 끊김
  async load(loadImg) {
    const im = {}, f = K / 4 * 2;
    for (const n of ['body', 'jaw', 'arm', 'hand', 'thigh', 'foot', 'lidA', 'lidB', 'tip', 'tseg', 'throatBig']) {
      const raw = await loadImg(`../art/boss/toad/cut/${n}.png`); if (!raw) continue;
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(raw.width * f)); c.height = Math.max(1, Math.round(raw.height * f));
      const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(raw, 0, 0, c.width, c.height);
      // 명암을 구운 뒤 부위마다 짙은 테두리(3텍셀 ≈ 도트 1칸)를 둘러 겹친 부위(팔·턱·다리)가 도트판에서 한 덩어리로 뭉개지지 않게.
      // 원본 그림엔 외곽선이 없어 배경(짙은 테두리)과 따로 놀았음. 망점은 4px 격자와 어긋나 얼룩이 되니 보스는 2톤 셀만
      const pad = 3, s = raw.width / c.width;   // 그릴 때 크기(W·H)도 테두리만큼 키워 부위 자리가 그대로이게
      im[n] = { W: (c.width + pad * 2) * s, H: (c.height + pad * 2) * s, pad: pad * s, flat: ringed(c, pad),
        L: ringed(bakeLit(c, LIGHT_ANG, BOSS_SHADE), pad), R: ringed(bakeLit(c, Math.PI - LIGHT_ANG, BOSS_SHADE), pad) };
    }
    if (im.body) TOAD.rig = im;
  },
  mouth: () => [RIG.mouth[0] * K, RIG.mouth[1] * K],
  draw(c, p, B) {   // c 는 이미 (발밑, 보는 쪽, 몸 쏠림·눌림) 변환됨
    const I = TOAD.rig, R = Math.PI / 180;
    const side = B.dir < 0 ? 'L' : 'R', pick = im => SHADE.on ? im[side] : im.flat;   // 리그는 왼쪽을 보는 그림 → 오른쪽을 볼 땐 뒤집혀 그려지니 빛도 뒤집어 구운 쪽
    const put = (n, ang = 0, s = 1) => { const r = RIG[n], im = I[r.img || n]; if (!im) return; c.save(); c.translate(r.at[0], r.at[1]); c.rotate((ang + (r.rot || 0)) * R); c.scale(s * (r.s || 1), s * (r.s || 1)); if (r.dim) c.filter = (c.filter === 'none' ? '' : c.filter + ' ') + 'brightness(0.62)'; c.drawImage(pick(im), -(r.piv ? r.piv[0] + im.pad : im.W / 2), -(r.piv ? r.piv[1] + im.pad : im.H / 2), im.W, im.H); c.restore(); };
    c.save(); c.scale(K, K);
    if (B.flash > 0.3) c.filter = 'brightness(0) invert(1)';   // 맞은 순간 하얗게
    else if (B.tint > 0.05) c.filter = `sepia(${0.5 * B.tint}) saturate(${1 + 1.2 * B.tint}) hue-rotate(${-28 * B.tint}deg)`;   // 2페이즈: 붉게 달아오름
    put('arm2', p.arm * 0.6); put('hand2', p.arm * 0.4);
    put('foot', p.thigh * 0.5);
    put('belly');
    put('body');
    put('thigh', p.thigh);
    if (p.throat > 0.05) put('throatBig', 0, 0.35 + 0.75 * p.throat);
    if (p.jaw > 4) {   // 입속: 윗입술 선 아래로 벌어진 만큼 짙은 입 안 (몸통 그림엔 턱 밑이 그려져 있어 아래턱만 돌리면 벌린 티가 안 남)
      const [hx, hy] = RIG.jaw.at, open = Math.sin(p.jaw * R) * 300;
      c.fillStyle = B.flash > 0.3 ? '#fff' : '#5a1f2c';
      const [mx, my] = RIG.mouth;
      c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo((mx + hx) / 2, (my + hy) / 2 + 12, hx, hy); c.lineTo(mx, my + open); c.closePath(); c.fill();
    }
    put('jaw', -p.jaw);
    put('arm', p.arm); put('hand', p.arm * 0.6);
    if (p.blink) { put('lidA'); put('lidB'); }
    c.restore();
  },
  drawTongue(c, mx, my, tx, ty) {   // 혀 띠를 입끝 → 끝까지 늘이고 끝 그림
    const I = TOAD.rig, len = Math.hypot(tx - mx, ty - my), a = Math.atan2(ty - my, tx - mx);
    c.save(); c.translate(mx, my); c.rotate(a);
    if (I.tseg) c.drawImage(I.tseg.L, 0, -13, len, 26);
    if (I.tip) c.drawImage(I.tip.L, len - 26, -25, 52, 50);
    c.restore();
  },
};

export function makeToad(api, x) {
  const B = {
    x, y: api.GROUND, dir: -1, hp: HP, max: HP, phase: 1, state: 'intro', t: 0, last: '', vuln: false,
    flash: 0, tint: 0, lastHit: -1, shadowX: null, target: x,
    tongue: { len: 0, ang: 0 }, drops: [], waves: [], puddles: [], cols: [],
    pose: { lift: 0, sx: 1, sy: 1, rot: 0, jaw: 0, throat: 0, thigh: 0, arm: 0, blink: 0 },
  };
  const spd = () => (B.phase === 2 ? 0.75 : 1);   // 2페이즈: 모든 예비 동작이 짧아짐
  // 입끝: 리그는 왼쪽(-x)을 보는 그림이라 mx 가 음수 → 왼쪽을 볼 땐 그대로, 오른쪽을 볼 땐 뒤집음 (x = B.x - dir·mx)
  const mouth = () => { if (TOAD.rig) { const [mx, my] = TOAD.mouth(); return [B.x - B.dir * mx, B.y + my - B.pose.lift]; } return [B.x + B.dir * 118, B.y - 112 - B.pose.lift]; };
  const tip = () => { const [mx, my] = mouth(), a = B.tongue.ang; return [mx + Math.cos(a) * B.tongue.len * B.dir, my + Math.sin(a) * B.tongue.len]; };
  const go = s => { B.state = s; B.t = 0; };
  const P = api.P;
  const attack = (shape, feet = false) => { B.cols.push(shape); return api.attack(shape, B.x, feet); };

  function choose() {
    const dx = Math.abs(P.x - B.x);
    if (B.phase === 2 && B.last === 'jump') return 'tongueAim';   // 2페이즈 연계: 짓누르기 → 바로 혀
    const r = Math.random();
    if (dx < 520) return r < 0.45 ? 'tongueAim' : r < 0.8 ? 'jumpCrouch' : 'spitInflate';
    return r < 0.45 ? 'spitInflate' : r < 0.9 ? 'jumpCrouch' : 'tongueAim';
  }

  B.update = dt => {
    B.cols = [];
    B.t += dt; B.flash = Math.max(0, B.flash - dt * 6);
    B.tint += ((B.phase === 2 ? 1 : 0) - B.tint) * Math.min(1, dt * 3);
    const p = B.pose, s = spd(), breathe = Math.sin(api.time() * 3);
    p.blink = (api.time() % 3.2) < 0.12 ? 1 : 0;
    B.vuln = false;
    if (B.state !== 'jumpUp' && B.state !== 'jumpHang' && B.state !== 'jumpDrop' && B.state !== 'dead') B.dir = Math.sign(P.x - B.x) || B.dir;

    switch (B.state) {
      case 'intro':
        p.sy = 1 + breathe * 0.02; p.jaw = B.t > 0.5 && B.t < 1.3 ? 26 : 0;
        if (B.t > 0.5 && !B.roared) { B.roared = true; api.fx.sfx('개굴!!', B.x, B.y - 300, B.dir, true); api.shake(10); }
        if (B.t > 1.6) go('idle');
        break;
      case 'idle':
        p.sy = 1 + breathe * 0.03; p.sx = 1 - breathe * 0.015; p.jaw = 0; p.throat = Math.max(0, breathe) * 0.15; p.lift = 0; p.rot = 0;
        if (B.t > (B.phase === 2 ? 0.45 : 0.9)) { const n = choose(); B.last = n.startsWith('jump') ? 'jump' : n.startsWith('tongue') ? 'tongue' : 'spit'; go(n); }
        break;
      case 'roar':   // 2페이즈 진입: 울부짖음 (무적)
        p.jaw = 34; p.sy = 1.06; api.shake(6);
        if (B.t > 1.0) go('idle');
        break;
      // ----- 혀 -----
      case 'tongueAim': {
        p.jaw = 6; p.rot = -4; p.sy = 0.96;
        const [mx, my] = mouth();
        const a = Math.atan2(P.y - 30 - my, Math.abs(P.x - mx) + 1);
        B.tongue.ang = Math.max(-0.6, Math.min(0.6, a));
        if (B.t > 0.6 * s) { go('tongueOut'); B.tongue.len = 0; }
        break;
      }
      case 'tongueOut': {
        p.jaw = 30; p.rot = 4;
        const previous = tip();
        B.tongue.len = Math.min(TONGUE_MAX, B.tongue.len + 1700 * dt / s);
        const [tx, ty] = tip();
        if (attack(line(previous[0], previous[1], tx, ty, 34))) { go('tongueGrab'); break; }
        if (ty >= api.GROUND - 4 || tx < 20 || tx > api.roomW() - 20 || B.tongue.len >= TONGUE_MAX) { go('tongueStuck'); api.fx.dust(tx, Math.min(ty, api.GROUND), B.dir, 0.8); }
        break;
      }
      case 'tongueGrab': {   // 잡힘: 혀 끝에 붙어 입 앞으로 끌려옴 → 한 번 더 깨물림 → 뱉어 냄
        p.jaw = 30;
        B.tongue.len = Math.max(0, B.tongue.len - 1300 * dt);
        const [tx, ty] = tip(); P.x = tx; P.y = Math.min(api.GROUND, ty + 30); P.vx = 0; P.vy = 0; P.state = 'hurt'; P.t = 0;
        if (B.tongue.len <= 40) {
          P.inv = 0; attack(area(tx, ty, 38));   // 잡힌 쥐가 입에 닿을 때 깨물기 콜라이더
          P.vx = B.dir * 520; P.vy = -380; P.ground = false;   // 보스 앞쪽으로 뱉어 냄
          api.fx.sfx('꿀꺽!', B.x + B.dir * 120, B.y - 220, B.dir, true); api.shake(8);
          B.tongue.len = 0; go('idle');
        }
        break;
      }
      case 'tongueStuck':   // 빗나감: 혀가 박혀 1초 빈틈 (피해 2배, 혀를 베면 휘청)
        p.jaw = 30; B.vuln = true;
        if (B.t > 1.0) go('tongueBack');
        break;
      case 'tongueBack':
        p.jaw = 18; B.tongue.len = Math.max(0, B.tongue.len - 2400 * dt);
        if (B.tongue.len <= 0) go('idle');
        break;
      case 'stagger':   // 박힌 혀를 베였거나 큰 피해: 휘청 (피해 2배)
        B.vuln = true; p.rot = Math.sin(B.t * 30) * 4; p.jaw = 20; B.tongue.len = Math.max(0, B.tongue.len - 2400 * dt);
        if (B.t > 0.7) go('idle');
        break;
      // ----- 짓누르기 -----
      case 'jumpCrouch':
        p.sy = 0.82; p.sx = 1.1; p.thigh = 18;
        if (B.t > 0.4 * s) { go('jumpUp'); B.vy = -1800; api.fx.dust(B.x, B.y, -1, 1.6); api.fx.dust(B.x, B.y, 1, 1.6); }
        break;
      case 'jumpUp':
        p.sy = 1.15; p.sx = 0.9; p.thigh = -30; B.vy += G2 * 0.4 * dt; p.lift = Math.max(0, p.lift - B.vy * dt);   // 위로 솟구침 (lift = 바닥에서 떠오른 높이)
        if (p.lift > 900) { go('jumpHang'); B.target = P.x; }
        break;
      case 'jumpHang':   // 화면 밖: 플레이어 자리에 그림자가 커짐, 떨어지기 0.2초 전에 자리 고정
        if (B.t < 0.55 * s - 0.2) B.target = P.x;
        B.shadowX = B.target;
        if (B.t > 0.55 * s) { go('jumpDrop'); B.x = Math.max(160, Math.min(api.roomW() - 160, B.target)); }
        break;
      case 'jumpDrop':
        p.sy = 1.12; p.sx = 0.92; p.thigh = -20; p.lift = Math.max(0, p.lift - 2600 * dt);
        if (p.lift <= 0) {
          p.lift = 0; B.shadowX = null; go('land');
          api.shake(14); api.impact(); api.fx.dust(B.x, B.y, -1, 2.4); api.fx.dust(B.x, B.y, 1, 2.4);
          api.fx.sfx('쿠웅!!', B.x, B.y - 260, B.dir, true);
          B.waves.push({ x: B.x - 120, d: -1, t: 0 }, { x: B.x + 120, d: 1, t: 0 });
          attack(body(B.x, B.y, 150, 180));   // 착지 순간 짓누르기 콜라이더
        }
        break;
      case 'land':   // 착지 직후 빈틈 (피해 2배)
        p.sy = 0.86 + Math.min(1, B.t / 0.3) * 0.14; p.sx = 1.08 - Math.min(1, B.t / 0.3) * 0.08; p.thigh = 10; B.vuln = true;
        if (B.t > (B.phase === 2 ? 0.5 : 0.7)) go('idle');
        break;
      // ----- 물방울 -----
      case 'spitInflate':
        p.throat = Math.min(1, B.t / (0.55 * s)); p.sy = 1 + p.throat * 0.04;
        if (B.t > 0.55 * s) {
          const [mx, my] = mouth(), T = 0.9;
          for (const off of [-140, 0, 140]) { const tx = Math.max(30, Math.min(api.roomW() - 30, P.x + off)); B.drops.push({ x: mx, y: my, vx: (tx - mx) / T, vy: (api.GROUND - my - 0.5 * G2 * T * T) / T }); }
          api.fx.sfx('퉤!', mx, my - 40, B.dir); go('spitRec');
        }
        break;
      case 'spitRec':
        p.throat = Math.max(0, 1 - B.t / 0.15); p.jaw = 22;
        if (B.t > 0.4 * s) go('idle');
        break;
      case 'dead':
        p.rot = Math.min(80, B.t * 120); p.sy = 1 - Math.min(0.2, B.t * 0.2); p.jaw = 30; p.blink = 1;
        break;
    }
    // 리그 2차 동작: 상태마다 앞팔 목표 각도로 따라감 (몸통 동작에 팔이 늦게 끌려오는 맛)
    const ARM = { idle: breathe * 5, intro: -18, roar: -30, tongueAim: -10, tongueOut: 14, tongueGrab: 10, tongueStuck: 18, stagger: 25, jumpCrouch: -28, jumpUp: 38, jumpHang: 38, jumpDrop: -34, land: 16, spitInflate: -12, spitRec: 8, dead: 42 };
    p.arm += ((ARM[B.state] ?? 0) - p.arm) * Math.min(1, dt * 14);
    // 물방울 → 웅덩이
    for (const d of B.drops) {
      const previous = [d.x, d.y];
      d.vy += G2 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (attack(line(previous[0], previous[1], d.x, d.y, 22))) d.dead = true;
      if (d.y >= api.GROUND) { d.dead = true; B.puddles.push({ x: d.x, t: 0 }); api.fx.dust(d.x, api.GROUND, 1, 0.6); }
    }
    B.drops = B.drops.filter(d => !d.dead);
    for (const w of B.puddles) { w.t += dt; if (w.t < 1.6) attack(rect(w.x - 34, w.x + 34, api.GROUND - 7, api.GROUND + 3), true); }
    B.puddles = B.puddles.filter(w => w.t < 1.6);
    // 충격파: 바닥을 타고 퍼짐 — 땅에 서 있으면 맞음
    for (const w of B.waves) {
      const previous = w.x; w.t += dt; w.x += w.d * 560 * dt;
      attack(rect(Math.min(previous, w.x) - 16, Math.max(previous, w.x) + 16, api.GROUND - 46 * (1 - w.t / 0.9) - 10, api.GROUND + 3), true);
    }
    B.waves = B.waves.filter(w => w.t < 0.9);
  };

  B.hurtBoxes = () => {
    if (['dead', 'intro', 'roar', 'jumpUp', 'jumpHang'].includes(B.state)) return [];
    const boxes = [grow(body(B.x, B.y - B.pose.lift, 180 * B.pose.sx, 265 * B.pose.sy), GRACE.hurt)];
    if (B.tongue.len > 60) { const [mx, my] = mouth(), [tx, ty] = tip(); boxes.push(line(mx, my, tx, ty, 30 + GRACE.hurt * 2)); }
    return boxes;
  };
  // 몸과 혀도 실제 면적 콜라이더. 한 공격에 한 번만 피해.
  B.hitBy = (c, atkId, attackBox) => {
    if (B.state === 'dead' || B.state === 'intro' || B.state === 'roar' || B.lastHit === atkId) return false;
    if (B.state === 'jumpUp' || B.state === 'jumpHang') return false;   // 화면 밖
    const by = B.y - B.pose.lift;
    const boxes = B.hurtBoxes(), onBody = touches(attackBox, boxes[0]);
    const onTongue = !onBody && touches(attackBox, boxes[1]);
    if (!onBody && !onTongue) return false;
    B.lastHit = atkId;
    const dmg = api.dmgOf(c) * (B.vuln ? 2 : 1);
    B.hp -= dmg; B.flash = 1;
    const [hx, hy] = onTongue ? tip() : [B.x + (P.x < B.x ? 90 : -90), by - 110];   // 몸 반대쪽(벤 칼이 빠져나간 쪽)에서 터짐
    api.fx.damage(dmg, hx, hy - 120, B.vuln ? 'crit' : c.fin ? 'fin' : 'boss');
    api.fx.hitBurst(hx, hy, P.facing, B.vuln || c.fin, c.hitUp ?? 0);
    api.hitstop(Math.max(c.stop || 0.05, B.vuln ? 0.1 : 0)); api.shake(B.vuln ? 8 : 4); api.impact();
    if (onTongue && B.state === 'tongueStuck') go('stagger');
    if (B.hp <= 0) { B.hp = 0; go('dead'); B.tongue.len = 0; B.drops = []; B.waves = []; B.puddles = []; B.cols = []; api.onDefeat(B); }
    else if (B.phase === 1 && B.hp <= B.max / 2) { B.phase = 2; go('roar'); B.tongue.len = 0; api.banner('개굴대왕이 분노했다!', 2); api.fx.sfx('개구울!!!', B.x, B.y - 320, B.dir, true); }
    return true;
  };

  // 그리기: 그림자 · 몸(리그 또는 임시 도형) · 혀 · 물방울 · 웅덩이 · 충격파
  B.draw = (c, shadow) => {
    if (B.shadowX != null) { const k = Math.min(1, B.t / 0.55); shadow(B.shadowX, api.GROUND, 40 + 110 * k); }
    else if (B.pose.lift < 400) shadow(B.x, api.GROUND, 130 * (1 - B.pose.lift / 500));
    for (const w of B.puddles) { c.fillStyle = `rgba(90,200,150,${0.6 * (1 - w.t / 1.6)})`; c.beginPath(); c.ellipse(w.x, api.GROUND - 2, 34, 7, 0, 0, 7); c.fill(); }
    for (const w of B.waves) { const a = 1 - w.t / 0.9; c.fillStyle = `rgba(200,240,210,${a})`; c.beginPath(); c.moveTo(w.x - 16, api.GROUND); c.quadraticCurveTo(w.x, api.GROUND - 46 * a - 10, w.x + 16, api.GROUND); c.fill(); }
    if (B.state === 'dead' && B.t > 1.6) return;
    const p = B.pose, by = B.y - p.lift;
    c.save();
    if (B.state === 'dead') c.globalAlpha = Math.max(0, 1 - (B.t - 1.0) / 0.6);
    c.translate(B.x, by); c.scale(-B.dir, 1); c.rotate(p.rot * Math.PI / 180); c.scale(p.sx, p.sy);   // 리그는 왼쪽(-x)을 보는 그림 → 오른쪽을 볼 땐 뒤집음
    if (TOAD.rig) drawRig(c, p); else drawShapes(c, p);
    c.restore();
    if (B.tongue.len > 0 && TOAD.rig) { const [mx, my] = mouth(), [tx, ty] = tip(); TOAD.drawTongue(c, mx, my, tx, ty); }
    else if (B.tongue.len > 0) {   // 혀(임시): 입에서 끝까지 굵은 분홍 띠 + 끝 동그라미
      const [mx, my] = mouth(), [tx, ty] = tip();
      c.strokeStyle = '#e8708a'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx, my); c.lineTo(tx, ty); c.stroke();
      c.fillStyle = '#ff8fa8'; c.beginPath(); c.arc(tx, ty, 17, 0, 7); c.fill();
    }
    for (const d of B.drops) { c.fillStyle = '#7fe0b0'; c.beginPath(); c.arc(d.x, d.y, 11, 0, 7); c.fill(); c.fillStyle = '#e8fff4'; c.beginPath(); c.arc(d.x - 3, d.y - 4, 3.5, 0, 7); c.fill(); }
  };

  // 임시 도형 (부위 그림이 오기 전): 리그와 같은 관절 — 몸통·아래턱(목주머니)·앞다리·뒷다리·눈꺼풀. 좌표는 왼쪽을 보는 기준(입 = -x)
  function drawShapes(c, p) {
    const red = B.tint, flash = B.flash > 0.3;
    const col = (a, b) => flash ? '#ffffff' : mix(a, b, red);
    // 뒷다리
    c.save(); c.translate(70, -40); c.rotate((p.thigh) * Math.PI / 180);
    c.fillStyle = col('#5f7a2e', '#8a3a2a'); c.beginPath(); c.ellipse(10, 0, 70, 46, 0.3, 0, 7); c.fill();
    c.fillStyle = col('#4d6526', '#702f22'); c.beginPath(); c.ellipse(-30, 34, 60, 14, 0, 0, 7); c.fill(); c.restore();
    // 몸통
    c.fillStyle = col('#6f8f34', '#a8443a'); c.beginPath(); c.ellipse(0, -110, 150, 105, 0, 0, 7); c.fill();
    c.fillStyle = col('#58732a', '#86352d'); for (const [x, y, r] of [[30, -170, 14], [70, -140, 10], [-10, -190, 9], [90, -100, 12]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    // 목주머니(아래턱) — 벌리면 아래로 돎, 부풀면 커짐
    c.save(); c.translate(-60, -105); c.rotate(-p.jaw * Math.PI / 180);
    const tr = 1 + p.throat * 0.9;
    c.fillStyle = col('#f2dc8a', '#f2b08a'); c.beginPath(); c.ellipse(-30, 18, 80 * tr, 34 * tr, 0, 0, 7); c.fill(); c.restore();
    // 입선
    c.strokeStyle = flash ? '#fff' : '#2d3a14'; c.lineWidth = 5; c.beginPath(); c.moveTo(-148, -108); c.quadraticCurveTo(-90, -96, -30, -112); c.stroke();
    // 앞다리
    c.save(); c.translate(-70, -60); c.rotate(p.arm * Math.PI / 180);
    c.fillStyle = col('#6a8a30', '#9c4036'); c.beginPath(); c.ellipse(-10, 30, 26, 48, -0.2, 0, 7); c.fill();
    c.fillStyle = col('#58732a', '#86352d'); c.beginPath(); c.ellipse(-26, 72, 34, 12, 0, 0, 7); c.fill(); c.restore();
    // 눈 (조준 중엔 번쩍)
    const aim = B.state === 'tongueAim' && Math.floor(B.t * 16) % 2 === 0;
    for (const [ex, ey] of [[-70, -205], [-20, -212]]) {
      c.fillStyle = col('#6f8f34', '#a8443a'); c.beginPath(); c.arc(ex, ey, 30, 0, 7); c.fill();
      c.fillStyle = flash ? '#fff' : aim ? '#ffffff' : '#ffc93c'; c.beginPath(); c.arc(ex - 4, ey, 22, 0, 7); c.fill();
      if (!p.blink) { c.fillStyle = '#1d1a12'; c.beginPath(); c.ellipse(ex - 10, ey, 6, 13, 0, 0, 7); c.fill(); }
      else { c.fillStyle = col('#58732a', '#86352d'); c.beginPath(); c.arc(ex - 4, ey, 23, 0, 7); c.fill(); }
    }
    // 병뚜껑 왕관
    c.fillStyle = flash ? '#fff' : '#ffd23a'; c.beginPath(); c.moveTo(-70, -240); for (let i = 0; i <= 6; i++) c.lineTo(-70 + i * 10, -240 - (i % 2 ? 0 : 16)); c.lineTo(-10, -232); c.closePath(); c.fill();
  }
  function drawRig(c, p) { TOAD.draw(c, p, B); }
  return B;
}
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

// 보스: 종착역의 주인 레일 지네 (거대 지네). 버려진 지하철역 끝 (2026-10-29, 개굴대왕과 같은 틀: 3패턴 + 2페이즈 + 빈틈)
//  · 레일 돌진: 바라보던 쪽 화면 밖으로 빠졌다가, 화면 끝에 전조등 두 개가 번쩍(빠앙!) → 바닥을 타고 반대편까지 관통. 몸이 낮아 점프로 넘김
//  · 천장 낙하: 위로 기어올라 사라짐 → 플레이어 자리에 돌가루가 떨어지고 그림자가 커짐 → 머리부터 수직 낙하. 머리가 바닥에 박혀 빈틈
//  · 집게 내려치기: 다가와 앞몸을 높이 세움(눈 번쩍) → 앞으로 내려찍음 + 바닥을 타는 불꽃 충격파(점프로 피함). 내려찍은 뒤 빈틈
//  · 2페이즈: 체력 50% 이하에서 울부짖고 붉어지며 빨라짐. 돌진은 왕복 2번, 낙하 때 천장 돌덩이 3개, 내려치기는 2연속. 금 간 마디가 늘어남
//  · 마디 판정: 금 간 마디(약점) 1.5배 · 머리·꼬리 1배 · 단단한 마디 0.5배(팅!). 머리가 박혔을 때·내려찍은 뒤엔 전부 2배
// 몸은 사슬 리그: 머리가 지나간 길(trail)을 마디가 일정 간격으로 따라감. 마디마다 다리 두 쌍이 걸음에 맞춰 흔들림.
// 부위 그림(art/boss/centipede/cut)이 있으면 코드 셰이더로 구워 쓰고, 없으면 같은 관절 구조를 임시 도형으로 그림.
import { rect, area, line, touches, GRACE } from './hitbox.js';
import { SHADE, bakePart, variantFor, ringed } from './shade.js';
import { BOSS_SHADE } from './boss.js';
const HP = 320, N = 12, SP = 46, SEG_R = 30, HEAD_R = 44, G2 = 1800;
const LIGHT_ANG = Math.atan2(-0.85, -0.5);
const SIZE = { head: 124, headOpen: 124, seg: 80, segWeak: 80, tail: 100, mandible: 74, antenna: 110, leg: 30 };   // 부위를 게임 px 너비로 맞춤
const PIV = { mandible: [0.88, 0.5], antenna: [0.9, 0.92], leg: [0.5, 0.06] };   // 부위 그림 속 관절 자리 (비율). 없으면 가운데
export const CENTI = {
  rig: null,
  async load(loadImg) {
    const im = {};
    for (const n of Object.keys(SIZE)) {
      const raw = await loadImg(`../art/boss/centipede/cut/${n}.png`); if (!raw) continue;
      const k = SIZE[n] / raw.width * 0.5;   // 도트 4px 판에 그리니 2배 해상도면 충분
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(raw.width * k)); c.height = Math.max(1, Math.round(raw.height * k));
      const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(raw, 0, 0, c.width, c.height);
      // 개굴대왕과 같게: 부위마다 짙은 테두리(약 도트 1칸) + 망점 없는 2톤 셀 (마디·다리가 겹쳐도 도트판에서 한 덩어리로 안 뭉개짐)
      const pad = 3, ow = c.width + pad * 2, oh = c.height + pad * 2;
      const pv = PIV[n] || [0.5, 0.5], s = SIZE[n] / c.width;   // 관절 자리도 테두리만큼 옮김
      im[n] = { c: ringed(c, pad), lit: bakePart(c, BOSS_SHADE).map(v => ringed(v, pad)), w: ow * s, h: oh * s, pv: [(pv[0] * c.width + pad) / ow, (pv[1] * c.height + pad) / oh] };
    }
    if (im.head && im.seg) CENTI.rig = im;
  },
};

export function makeCentipede(api, x) {
  const P = api.P, GY = api.GROUND - 50;   // 기어갈 때 머리·마디 중심 높이
  const B = {
    x, y: api.GROUND, hx: api.roomW() + 160, hy: GY, hdir: -1, dir: -1, hp: HP, max: HP, phase: 1, state: 'intro', t: 0, last: '', n: 0,
    flash: 0, tint: 0, vuln: false, lastHit: -1, trail: [], cols: [], waves: [], rocks: [], dust: [], shadowX: null, side: 1,
    jaw: 0, weak: new Set([3, 7]), dead: 0,
  };
  const L = (N + 2) * SP;
  const spd = () => (B.phase === 2 ? 0.72 : 1);
  const go = s => { B.state = s; B.t = 0; };
  const attack = (shape, feet = false) => { B.cols.push(shape); return api.attack(shape, B.hx, feet); };
  // ---------- 사슬 ----------
  function resetTrail(dx, dy) { B.trail = [{ x: B.hx, y: B.hy }, { x: B.hx + dx * L, y: B.hy + dy * L }]; }
  function moveHead(nx, ny) {
    const d = Math.hypot(nx - B.trail[0].x, ny - B.trail[0].y);
    B.hx = nx; B.hy = ny;
    if (d > 3) B.trail.unshift({ x: nx, y: ny }); else { B.trail[0].x = nx; B.trail[0].y = ny; }
    let acc = 0;
    for (let i = 1; i < B.trail.length; i++) { acc += Math.hypot(B.trail[i].x - B.trail[i - 1].x, B.trail[i].y - B.trail[i - 1].y); if (acc > L) { B.trail.length = i + 1; break; } }
  }
  resetTrail(1, 0);
  // 머리에서 길을 따라 i 번째 마디 자리 (a = 머리 쪽을 향하는 각도)
  function segs() {
    const out = [], T = B.trail;
    let want = SP, acc = 0, i = 1;
    let prev = T[0];
    while (out.length < N + 1 && i < T.length) {
      const cur = T[i], d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      if (acc + d >= want) {
        const u = (want - acc) / (d || 1), x = prev.x + (cur.x - prev.x) * u, y = prev.y + (cur.y - prev.y) * u;
        out.push({ x, y, a: Math.atan2(prev.y - cur.y, prev.x - cur.x) });
        want += SP;
      } else { acc += d; prev = cur; i++; continue; }
    }
    while (out.length < N + 1) { const l = out[out.length - 1] || { x: B.hx, y: B.hy, a: Math.PI }; out.push({ x: l.x - Math.cos(l.a) * SP, y: l.y - Math.sin(l.a) * SP, a: l.a }); }
    return out;   // 0..N-1 = 몸 마디, N = 꼬리
  }
  B.segs = segs;
  const headAng = () => { const s = segs()[0]; return Math.atan2(B.hy - s.y, B.hx - s.x); };
  // 몸 전체 공격 콜라이더 (돌진·낙하·내려치기 중): 머리 원 + 마디를 잇는 캡슐
  function bodyAttack(prev) {
    let hit = attack(prev ? line(prev[0], prev[1], B.hx, B.hy, HEAD_R * 2) : area(B.hx, B.hy, HEAD_R));
    const S = segs(); let a = { x: B.hx, y: B.hy };
    for (const s of S) { if (!hit) hit = attack(line(a.x, a.y, s.x, s.y, SEG_R * 1.7)); a = s; }
    return hit;
  }
  const onScreenX = () => Math.max(-200, Math.min(api.roomW() + 200, B.hx));
  function choose() {
    const dx = Math.abs(P.x - B.hx), r = Math.random();
    let n = dx < 420 ? (r < 0.45 ? 'slam' : r < 0.75 ? 'drop' : 'charge') : (r < 0.45 ? 'charge' : r < 0.8 ? 'drop' : 'slam');
    if (n === B.last && Math.random() < 0.6) n = n === 'charge' ? 'drop' : n === 'drop' ? 'slam' : 'charge';
    B.last = n; B.n = 0;
    return { charge: 'burrow', drop: 'climb', slam: 'approach' }[n];
  }

  B.update = dt => {
    B.cols = [];
    B.t += dt; B.flash = Math.max(0, B.flash - dt * 6);
    B.tint += ((B.phase === 2 ? 1 : 0) - B.tint) * Math.min(1, dt * 3);
    const s = spd(), now = api.time();
    B.vuln = false; B.shadowX = null;
    const prev = [B.hx, B.hy];
    switch (B.state) {
      case 'intro':   // 터널에서 기어 나와 울부짖음
        if (B.hx > x) { moveHead(B.hx - 300 * dt, GY + Math.sin(now * 8) * 3); B.t = 0; }
        else { B.jaw = Math.min(1, B.t * 4); if (!B.roared) { B.roared = true; api.fx.sfx('끼기긱!!', B.hx, B.hy - 160, -1, true); api.shake(10); } if (B.t > 1.1) { B.jaw = 0; go('idle'); } }
        break;
      case 'idle': {
        B.jaw = Math.max(0, B.jaw - dt * 4);
        moveHead(B.hx + B.hdir * 30 * dt * Math.sin(now * 2), GY + Math.sin(now * 5) * 4);
        if (B.t > (B.phase === 2 ? 0.45 : 0.85)) go(choose());
        break;
      }
      case 'rage':   // 2페이즈 진입: 앞몸을 세우고 울부짖음 (무적)
        B.jaw = 1; moveHead(B.hx, GY - Math.sin(Math.min(1, B.t / 0.4) * Math.PI / 2) * 160); api.shake(6);
        if (B.t > 1.1) go('settle');
        break;
      case 'settle':   // 세운 몸을 바닥으로
        B.jaw = 0; moveHead(B.hx + B.hdir * 120 * dt, Math.min(GY, B.hy + 600 * dt));
        if (B.hy >= GY) go('idle');
        break;
      // ----- 레일 돌진 -----
      case 'burrow':   // 바라보는 쪽 화면 밖으로 빠짐 (이 달리기에도 몸통 판정)
        moveHead(B.hx + B.hdir * 760 * dt, GY);
        bodyAttack(prev);
        if (B.hx < -L - 80 || B.hx > api.roomW() + L + 80) { B.side = B.phase === 2 ? -Math.sign(B.hx) || 1 : Math.random() < 0.5 ? -1 : 1; enterEdge(B.side); go('warn'); }
        break;
      case 'warn':   // 화면 끝 전조등: 빠앙!
        if (B.t === dt || B.t < dt * 1.5) api.fx.sfx('빠앙!', B.side < 0 ? 120 : api.roomW() - 120, api.GROUND - 180, -B.side, true);
        if (B.t > 0.8 * s) { go('charge'); api.shake(5); }
        break;
      case 'charge':
        moveHead(B.hx + B.hdir * 1000 / Math.sqrt(s) * dt, GY + Math.sin(now * 30) * 2);
        bodyAttack(prev);
        if (Math.random() < 0.5) api.fx.dust(B.hx, api.GROUND, -B.hdir, 0.8);
        if ((B.hdir > 0 && B.hx > api.roomW() + L + 80) || (B.hdir < 0 && B.hx < -L - 80)) {
          B.n++;
          if (B.phase === 2 && B.n < 2) { B.side = -B.side; enterEdge(B.side); go('warn'); }   // 2페이즈: 되돌아 한 번 더
          else { B.side = P.x < api.roomW() / 2 ? 1 : -1; enterEdge(B.side); go('enter'); }
        }
        break;
      case 'enter': {   // 화면 밖에서 기어 들어와 자리 잡음
        const tx = B.side < 0 ? 300 : api.roomW() - 300;
        moveHead(B.hx + B.hdir * 520 * dt, GY);
        if ((B.hdir > 0 && B.hx >= tx) || (B.hdir < 0 && B.hx <= tx)) go('idle');
        break;
      }
      // ----- 천장 낙하 -----
      case 'climb':
        moveHead(B.hx, B.hy - 1150 * dt);
        if (B.hy < -700) { B.target = P.x; go('hang'); }
        break;
      case 'hang':   // 위에서 노림: 플레이어 자리 돌가루 + 커지는 그림자, 떨어지기 0.2초 전에 자리 고정
        if (B.t < 0.75 * s - 0.2) B.target = Math.max(120, Math.min(api.roomW() - 120, P.x));
        B.shadowX = B.target;
        if (Math.random() < 0.35) B.dust.push({ x: B.target + (Math.random() - 0.5) * 70, y: -40, vy: 300 + Math.random() * 200, t: 0 });
        if (B.t > 0.75 * s) { B.hx = B.target; B.hy = -260; resetTrail(0, -1); B.hdir = P.x < B.hx ? -1 : 1; go('drop'); }
        break;
      case 'drop':
        B.shadowX = B.hx;
        moveHead(B.hx, Math.min(api.GROUND - 46, B.hy + 1500 * dt));
        bodyAttack(prev);
        if (B.hy >= api.GROUND - 46) {
          go('stuck'); api.shake(14); api.impact(); api.fx.sfx('쾅!!', B.hx, api.GROUND - 200, B.hdir, true);
          api.fx.dust(B.hx, api.GROUND, -1, 2.2); api.fx.dust(B.hx, api.GROUND, 1, 2.2);
          attack(area(B.hx, api.GROUND - 30, 90));   // 박히는 순간 둘레
          if (B.phase === 2) for (let i = 0; i < 3; i++) B.rocks.push({ x: 140 + Math.random() * (api.roomW() - 280), y: -60 - i * 140, vy: 0 });   // 천장 돌덩이
        }
        break;
      case 'stuck':   // 머리가 박혀 빈틈 (피해 2배)
        B.vuln = true; B.jaw = 0.4 + Math.sin(B.t * 20) * 0.2;
        moveHead(B.hx + Math.sin(B.t * 26) * 1.5, api.GROUND - 46);
        if (B.t > (B.phase === 2 ? 0.95 : 1.25)) go('pull');
        break;
      case 'pull':
        moveHead(B.hx, B.hy - 1000 * dt);
        if (B.hy < -700) { B.side = P.x < api.roomW() / 2 ? 1 : -1; enterEdge(B.side); go('enter'); }
        break;
      // ----- 집게 내려치기 -----
      case 'approach': {
        const dx = P.x - B.hx;
        if (Math.sign(dx) !== B.hdir && Math.abs(dx) > 60) { B.turn0 = [B.hx, B.hy]; go('turn'); break; }
        moveHead(B.hx + B.hdir * 340 * dt, GY + Math.sin(now * 9) * 3);
        if (Math.abs(dx) < 300 || B.t > 1.4) { B.r0 = [B.hx, B.hy]; go('rear'); }
        break;
      }
      case 'turn': {   // 제 몸 위로 넘어가며 돌아섬: 앞으로 솟아 꼭대기에서 뒤로 넘어가 바닥으로
        const [x0, y0] = B.turn0, u = Math.min(1, B.t / 0.55), R = 80;
        if (u < 0.6) { const th = Math.PI / 2 - (u / 0.6) * Math.PI; moveHead(x0 + B.hdir * R * Math.cos(th), y0 - R + R * Math.sin(th)); }
        else { const v = (u - 0.6) / 0.4; moveHead(x0 - B.hdir * 150 * v, y0 - 2 * R * (1 - v)); }
        if (u >= 1) { B.hdir = -B.hdir; go('approach'); }
        break;
      }
      case 'rear': {   // 앞몸을 높이 세움 (눈 번쩍, 집게 벌림)
        const [x0, y0] = B.r0, u = Math.min(1, B.t / (0.6 * s)), e = 1 - (1 - u) * (1 - u);
        B.jaw = e;
        moveHead(x0 - B.hdir * 40 * e, y0 - 300 * e);
        if (u >= 1) { B.s0 = [B.hx, B.hy]; B.s1 = [Math.max(60, Math.min(api.roomW() - 60, B.hx + B.hdir * 300)), api.GROUND - 34]; go('slam'); }
        break;
      }
      case 'slam': {
        const u = Math.min(1, B.t / 0.16), [x0, y0] = B.s0, [x1, y1] = B.s1, cx = x0 + (x1 - x0) * 0.5 + B.hdir * 120, cy = y0;
        const q = (a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
        moveHead(q(x0, cx, x1), q(y0, cy, y1)); B.jaw = 1 - u * 0.6;
        attack(line(prev[0], prev[1], B.hx, B.hy, 96));
        if (u >= 1) {
          api.shake(11); api.impact(); api.fx.sfx('콰직!', B.hx, api.GROUND - 190, B.hdir, true); api.fx.dust(B.hx, api.GROUND, B.hdir, 2);
          B.waves.push({ x: B.hx + B.hdir * 40, d: B.hdir, t: 0 });   // 바닥을 타는 불꽃 충격파
          B.n++;
          if (B.phase === 2 && B.n < 2) { B.r0 = [B.hx, GY]; go(Math.sign(P.x - B.hx) === B.hdir ? 'rear' : 'recover'); }
          else go('recover');
        }
        break;
      }
      case 'recover':   // 내려찍은 뒤 빈틈 (피해 2배)
        B.vuln = true; B.jaw = Math.max(0, B.jaw - dt * 3);
        moveHead(B.hx, Math.min(GY, B.hy + 200 * dt));
        if (B.t > 0.8 * s) go('idle');
        break;
      case 'dead':
        B.jaw = 1; B.dead += dt;
        if (B.hy < api.GROUND - 30) moveHead(B.hx, Math.min(api.GROUND - 30, B.hy + 900 * dt));
        break;
    }
    if (B.state !== 'dead') B.dir = B.hdir;
    // 바닥 불꽃 충격파: 땅에 서 있으면 맞음 (점프로 피함)
    for (const w of B.waves) {
      const p0 = w.x; w.t += dt; w.x += w.d * 640 * dt;
      attack(rect(Math.min(p0, w.x) - 18, Math.max(p0, w.x) + 18, api.GROUND - 40 * (1 - w.t / 0.8) - 10, api.GROUND + 3), true);
      if (Math.random() < 0.4) api.fx.dust(w.x, api.GROUND, w.d, 0.5);
    }
    B.waves = B.waves.filter(w => w.t < 0.8);
    for (const r of B.rocks) {
      const p0 = r.y; r.vy += G2 * dt; r.y += r.vy * dt;
      if (attack(line(r.x, p0, r.x, r.y, 36))) r.dead = true;
      if (r.y >= api.GROUND - 14) { r.dead = true; api.fx.dust(r.x, api.GROUND, 1, 1); api.fx.dust(r.x, api.GROUND, -1, 1); }
    }
    B.rocks = B.rocks.filter(r => !r.dead);
    for (const d of B.dust) { d.t += dt; d.y += d.vy * dt; }
    B.dust = B.dust.filter(d => d.y < api.GROUND);
  };
  // 화면 끝(side) 밖에 머리를 두고 몸은 더 바깥쪽으로 곧게 → 안쪽을 봄
  function enterEdge(side) {
    B.hdir = -side; B.hx = side < 0 ? -140 : api.roomW() + 140; B.hy = GY; resetTrail(side, 0);
  }

  // ---------- 판정 ----------
  B.hurtBoxes = () => {
    if (['dead', 'intro', 'rage', 'hang'].includes(B.state)) return [];
    const S = segs();
    return [area(B.hx, B.hy, HEAD_R + GRACE.hurt), ...S.map((p, i) => area(p.x, p.y, (i === N ? SEG_R * 1.1 : SEG_R) + GRACE.hurt))];
  };
  B.hitBy = (c, atkId, box) => {
    if (B.lastHit === atkId || ['dead', 'intro', 'rage', 'hang'].includes(B.state)) return false;
    const boxes = B.hurtBoxes(); let best = -1, bestK = 0;
    boxes.forEach((b, i) => {
      if (!touches(box, b)) return;
      const k = i === 0 || i === N + 1 ? 1 : B.weak.has(i - 1) ? 1.5 : 0.5;   // 머리 · 꼬리 1, 금 간 마디 1.5, 단단한 마디 0.5
      if (k > bestK) { bestK = k; best = i; }
    });
    if (best < 0) return false;
    B.lastHit = atkId;
    const k = bestK * (B.vuln ? 2 : 1), dmg = Math.max(1, Math.round(api.dmgOf(c) * k));
    B.hp -= dmg; B.flash = 1;
    const hb = boxes[best], kind = bestK < 1 && !B.vuln ? 'normal' : k >= 1.5 ? 'crit' : c.fin ? 'fin' : 'boss';
    api.fx.hitBurst(hb.x, hb.y, P.facing, k >= 1.5 || c.fin, c.hitUp ?? 0);
    api.fx.damage(dmg, hb.x, hb.y - 130, kind);
    if (bestK < 1 && !B.vuln) api.fx.sfx('팅!', hb.x, hb.y - 90, P.facing);   // 단단한 마디: 튕겨 나옴
    api.hitstop(Math.max(c.stop || 0.05, k >= 1.5 ? 0.1 : 0)); api.shake(k >= 1.5 ? 8 : 4); api.impact();
    if (B.hp <= 0) { B.hp = 0; go('dead'); B.waves = []; B.rocks = []; B.cols = []; api.onDefeat(B); }
    else if (B.phase === 1 && B.hp <= B.max / 2 && !['burrow', 'warn', 'charge', 'climb', 'hang', 'drop', 'pull'].includes(B.state)) {
      B.phase = 2; B.weak = new Set([2, 5, 7, 10]); go('rage');
      api.banner('레일 지네가 껍질을 터뜨렸다! 금 간 마디를 노려라', 2.4); api.fx.sfx('끼에에엑!!!', B.hx, B.hy - 220, B.hdir, true);
    }
    return true;
  };

  // ---------- 그리기 ----------
  B.draw = (c, shadow) => {
    for (const d of B.dust) { c.fillStyle = '#b9b2a2'; c.fillRect(d.x - 3, d.y - 3, 6, 6); }
    if (B.shadowX != null) { const k = B.state === 'hang' ? Math.min(1, B.t / 0.75) : 1; shadow(B.shadowX, api.GROUND, 30 + 70 * k); }
    for (const r of B.rocks) { shadow(r.x, api.GROUND, 22); c.fillStyle = '#111'; c.beginPath(); c.arc(r.x, r.y, 20, 0, 7); c.fill(); c.fillStyle = '#7d7468'; c.beginPath(); c.arc(r.x, r.y, 16, 0, 7); c.fill(); c.fillStyle = '#a49a8a'; c.beginPath(); c.arc(r.x - 5, r.y - 5, 6, 0, 7); c.fill(); }
    for (const w of B.waves) {   // 불꽃 충격파: 노랑·흰 톱니
      const a = 1 - w.t / 0.8, h = 40 * a + 10;
      c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(w.x - 22, api.GROUND); for (let i = 0; i <= 4; i++) c.lineTo(w.x - 22 + i * 11, api.GROUND - (i % 2 ? h : h * 0.45)); c.lineTo(w.x + 22, api.GROUND); c.fill();
      c.fillStyle = '#fff'; c.fillRect(w.x - 4, api.GROUND - h * 0.6, 8, h * 0.6);
    }
    if (B.state === 'warn') {   // 전조등: 화면 끝에서 빛줄기 두 개
      const ex = B.side < 0 ? 0 : api.roomW(), blink = Math.floor(B.t * 10) % 2;
      c.fillStyle = '#ffe14a';   // 빛줄기 = 망점 (도트 판에서 반투명은 지워지니 불투명 점 크기로 옅어짐을 표현)
      for (let d = 30; d < 720; d += 20) {
        const k = d / 700, top = GY - 30 - 90 * k, bot = GY + 20 + 30 * k, r = (1 - k) * (5 + 2 * blink);
        if (r < 1) continue;
        for (let y = top; y < Math.min(api.GROUND, bot); y += 16) { c.beginPath(); c.arc(ex - B.side * d, y + ((d / 20) % 2) * 8, r, 0, 7); c.fill(); }
      }
      c.fillStyle = blink ? '#fff' : '#ffe14a'; for (const dy of [-22, 8]) { c.beginPath(); c.arc(ex - B.side * 16, GY + dy, 16, 0, 7); c.fill(); }
    }
    if (B.state === 'dead' && B.dead > 2.2) return;
    if (B.state !== 'climb' && B.state !== 'pull' && B.state !== 'drop' && B.state !== 'stuck') for (const p of segs()) if (p.y > GY - 30) shadow(p.x, api.GROUND, 26);
    c.save();
    if (B.state === 'dead') c.globalAlpha = Math.max(0, 1 - (B.dead - 1.4) / 0.8);
    const fl = B.flash > 0.3, red = B.tint;
    if (fl) c.filter = 'brightness(0) invert(1)';
    else if (red > 0.05) c.filter = `sepia(${0.4 * red}) saturate(${1 + red}) hue-rotate(${-20 * red}deg)`;
    if (CENTI.rig) drawRig(c); else drawShapes(c, fl);
    c.restore();
  };
  // 마디 하나 그리기 좌표계: 원점 = 마디 가운데, +x = 머리 쪽, 배가 아래 (머리가 왼쪽을 볼 땐 위아래 뒤집어 배를 아래로)
  function frame(c, p, a) { c.translate(p.x, p.y); c.rotate(a); if (Math.cos(a) < 0) c.scale(1, -1); }
  function legAng(i, side) { const walk = ['charge', 'burrow', 'enter', 'approach', 'intro'].includes(B.state) ? 16 : B.state === 'stuck' || B.state === 'dead' ? 4 : 7; return Math.sin(api.time() * walk + i * 1.1 + side * Math.PI) * 0.45 + (B.state === 'dead' ? 1.2 : 0); }
  function drawRig(c) {
    const I = CENTI.rig, S = segs(), ha = headAng();
    const put = (n, p, a, ang = 0, flipX = false, sc = 1, off = [0, 0]) => {   // off = 마디 좌표계 안에서 관절 자리
      const im = I[n]; if (!im) return;
      c.save(); frame(c, p, a); c.translate(off[0], off[1]);
      c.rotate(ang); if (flipX) c.scale(-1, 1); c.scale(sc, sc);
      const pv = im.pv, src = SHADE.on ? im.lit[variantFor(c, LIGHT_ANG)] : im.c;
      c.drawImage(src, -im.w * pv[0], -im.h * pv[1], im.w, im.h);
      c.restore();
    };
    // 먼 쪽 다리 → 마디(꼬리부터) → 가까운 쪽 다리 → 머리
    for (let i = N - 1; i >= 0; i--) put('leg', S[i], S[i].a, legAng(i, 1) + 0.25, false, 0.9, [4, 10]);
    put('tail', S[N], S[N].a, 0, true);   // 꼬리 그림은 집게가 오른쪽 → 뒤집어 집게를 머리 반대쪽(-x)으로
    for (let i = N - 1; i >= 0; i--) put(B.weak.has(i) && I.segWeak ? 'segWeak' : 'seg', S[i], S[i].a, 0, true);   // 마디 그림은 머리가 왼쪽 → +x 를 머리 쪽으로 뒤집음
    for (let i = N - 1; i >= 0; i--) put('leg', S[i], S[i].a, legAng(i, 0), false, 1, [-4, 14]);
    const hp = { x: B.hx, y: B.hy };
    put('antenna', hp, ha, 0.5 + Math.sin(api.time() * 6) * 0.15, true, 1, [26, -28]);
    put('mandible', hp, ha, -0.15 - B.jaw * 0.6, true, 0.92, [40, 10]);
    put(B.jaw > 0.5 && I.headOpen ? 'headOpen' : 'head', hp, ha, 0, true);
    put('mandible', hp, ha, 0.2 + B.jaw * 0.6, true, 1, [40, 18]);
  }
  // 임시 도형: 같은 관절 — 마디(진보라 껍질 + 겨자 노선 띠 + 리벳) · 다리(노랑 끝) · 강철 머리(전조등 눈) · 집게 · 더듬이
  function drawShapes(c, fl) {
    const S = segs(), ha = headAng(), col = k => fl ? '#fff' : k;
    const leg = (p, a, ang, near) => { c.save(); frame(c, p, a); c.rotate(ang); c.strokeStyle = col(near ? '#2a1830' : '#1a1020'); c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 8); c.lineTo(-8, 30); c.lineTo(-2, 48); c.stroke(); c.fillStyle = col('#ffe14a'); c.beginPath(); c.arc(-2, 48, 5, 0, 7); c.fill(); c.restore(); };
    for (let i = N - 1; i >= 0; i--) leg(S[i], S[i].a, legAng(i, 1) + 0.25, false);
    { const p = S[N]; c.save(); frame(c, p, p.a); c.fillStyle = col('#111'); c.beginPath(); c.ellipse(-6, 0, 30, 24, 0, 0, 7); c.fill(); c.fillStyle = col('#5a2346'); c.beginPath(); c.ellipse(-6, 0, 26, 20, 0, 0, 7); c.fill();
      c.strokeStyle = col('#111'); c.lineWidth = 7; c.lineCap = 'round'; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(-26, sy * 8); c.quadraticCurveTo(-58, sy * 14, -66, sy * 34); c.stroke(); } c.restore(); }
    for (let i = N - 1; i >= 0; i--) {
      const p = S[i], weak = B.weak.has(i);
      c.save(); frame(c, p, p.a);
      c.fillStyle = col('#111'); c.beginPath(); c.ellipse(0, 0, SEG_R + 4, SEG_R, 0, 0, 7); c.fill();
      c.fillStyle = col('#5a2346'); c.beginPath(); c.ellipse(0, 0, SEG_R, SEG_R - 4, 0, 0, 7); c.fill();
      c.fillStyle = col('#3a1530'); c.beginPath(); c.ellipse(0, 8, SEG_R - 4, SEG_R - 14, 0, 0, 7); c.fill();
      c.fillStyle = col('#e8b93a'); c.fillRect(-SEG_R + 4, -8, SEG_R * 2 - 8, 7);
      if (weak) { c.fillStyle = col('#ff9a1f'); c.beginPath(); c.moveTo(-10, -22); c.lineTo(4, -12); c.lineTo(-4, -2); c.lineTo(12, 10); c.lineTo(-2, 4); c.lineTo(-14, -8); c.fill(); c.fillStyle = col('#ffe14a'); c.beginPath(); c.arc(0, -6, 6, 0, 7); c.fill(); }
      c.fillStyle = col('#c9c2d8'); for (const rx of [-16, 0, 16]) c.fillRect(rx - 2, -20, 4, 4);
      c.restore();
    }
    for (let i = N - 1; i >= 0; i--) leg({ x: S[i].x, y: S[i].y + 6 }, S[i].a, legAng(i, 0), true);
    c.save(); frame(c, { x: B.hx, y: B.hy }, ha);
    c.strokeStyle = col('#2b2b33'); c.lineWidth = 4; c.lineCap = 'round';
    for (const k of [0, 1]) { c.beginPath(); c.moveTo(18, -26 + k * 6); c.lineTo(46 + k * 10, -70 + Math.sin(api.time() * 6 + k) * 8); c.lineTo(80 + k * 6, -84); c.stroke(); }
    const mand = s => { c.save(); c.translate(36, 14 * s); c.rotate(s * (0.25 + B.jaw * 0.7)); c.fillStyle = col('#111'); c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(46, -4 * s - 2, 54, 22 * s); c.quadraticCurveTo(34, 6 * s, 0, 7); c.fill(); c.restore(); };
    mand(-1);
    c.fillStyle = col('#111'); c.beginPath(); c.roundRect(-34, -40, 82, 78, 22); c.fill();
    c.fillStyle = col('#7b6d63'); c.beginPath(); c.roundRect(-30, -36, 74, 70, 18); c.fill();
    c.fillStyle = col('#5b4f48'); c.fillRect(-30, 14, 74, 8);
    const glow = B.state === 'rear' || B.state === 'warn' ? Math.floor(B.t * 16) % 2 : 0;
    c.fillStyle = col(glow ? '#ffffff' : '#ffe14a'); for (const ey of [-16, 6]) { c.beginPath(); c.arc(22, ey, 11, 0, 7); c.fill(); }
    c.fillStyle = col('#111'); for (const ey of [-16, 6]) { c.beginPath(); c.arc(26, ey, 3.5, 0, 7); c.fill(); }
    if (B.jaw > 0.3) { c.fillStyle = col('#3a0f1e'); c.beginPath(); c.ellipse(44, 26, 10, 6 + B.jaw * 8, 0, 0, 7); c.fill(); }
    mand(1);
    c.restore();
  }
  return B;
}

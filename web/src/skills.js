// 스킬 노드 (그물형, 사용자 결정 2026-10-29): 레벨이 오르면 노드 포인트 1. 쉼터 촛불 앞에서 ↑ 로 창을 열어 찍음 (창이 열린 동안 게임 멈춤).
// 노드는 연결선(links, 양방향)으로 이어진 이웃 중 하나라도 배웠고, 요구 레벨(lv) 이상이고, 포인트가 남아 있으면 배울 수 있음.
// 추가 액션(내려찍기·충전 돌진·벽 차기)은 전부 노드. 벽 차기는 Lv4 부터 → 지하철역 수직갱과 앞 지역 지름길의 열쇠.
export const NODES = {
  root: { name: '기사의 다짐', desc: '모든 길의 시작', at: [0, 0], links: [], lv: 1 },
  plunge: { name: '내려찍기', desc: '공중에서 ↓ + 공격. 적에 꽂히면 튕겨 오름', at: [-1, 1], links: ['root'], lv: 2, kind: 'act' },
  atk1: { name: '날 세우기', desc: '공격력 +20%', at: [0, 1], links: ['root'], lv: 2, kind: 'stat' },
  hp1: { name: '병뚜껑 덧대기', desc: '최대 체력 +1', at: [1, 1], links: ['root'], lv: 2, kind: 'stat' },
  charge: { name: '충전 돌진', desc: 'F 를 길게 눌러 모았다가 떼면 돌진 베기', at: [-1, 2], links: ['plunge', 'atk1'], lv: 3, kind: 'act' },
  wall: { name: '벽 차기', desc: '공중에서 벽 쪽으로 누르면 붙어 미끄러지고, 점프로 박차 오름', at: [1, 2], links: ['hp1', 'atk1'], lv: 4, kind: 'act' },
  atk2: { name: '기사의 일격', desc: '공격력 +20%', at: [0, 3], links: ['charge', 'wall'], lv: 5, kind: 'stat' },
  hp2: { name: '캔 조각 흉갑', desc: '최대 체력 +1', at: [1, 3], links: ['wall'], lv: 5, kind: 'stat' },
};
const near = id => Object.keys(NODES).filter(k => NODES[k].links.includes(id) || NODES[id].links.includes(k));
export function canLearn(G, id) {
  const n = NODES[id];
  if (G.skills.has(id)) return 'learned';
  if (!near(id).some(k => G.skills.has(k))) return 'locked';
  if (G.lv < n.lv) return 'level';
  if (G.sp <= 0) return 'point';
  return 'ok';
}
export function learn(G, P, id) {
  if (canLearn(G, id) !== 'ok') return false;
  G.skills.add(id); G.sp--;
  if (id === 'hp1' || id === 'hp2') { G.maxHp++; P.hp = G.maxHp; }
  if (id === 'atk1' || id === 'atk2') G.atkMul = (G.atkMul || 1) + 0.2;
  return true;
}

// ---------- 창 (HTML 덮개) ----------
const UI = { open: false, sel: 'root', el: null, onLearn: null };
export const skillUI = UI;
const CELL = 128, OX = 230, OY = 70;
function build() {
  const el = document.createElement('div');
  el.id = 'skills';
  el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,8,24,.72);z-index:20;font-family:"Noto Sans KR",sans-serif';
  el.innerHTML = `<div style="position:relative;width:640px;height:600px;background:#1b1838;border:3px solid #111;box-shadow:8px 8px 0 #ff3d7f;border-radius:6px;overflow:hidden">
    <div style="position:absolute;inset:0;background-image:radial-gradient(#ffffff14 1.4px,transparent 1.6px);background-size:12px 12px"></div>
    <div style="position:absolute;left:20px;top:14px;font-family:'Black Han Sans',sans-serif;font-size:30px;color:#ffe14a;text-shadow:3px 3px 0 #ff3d7f,-1px -1px 0 #111">기사 수련 노드</div>
    <div id="skPts" style="position:absolute;right:20px;top:22px;font-size:15px;color:#fff"></div>
    <svg id="skLines" width="640" height="600" style="position:absolute;left:0;top:0"></svg>
    <div id="skNodes"></div>
    <div id="skInfo" style="position:absolute;left:20px;right:20px;bottom:16px;min-height:62px;padding:10px 14px;background:#111;border:2px solid #2fe6ff;color:#fff;font-size:14px;line-height:1.5"></div>
  </div>`;
  document.body.appendChild(el);
  return el;
}
const pos = id => [OX + NODES[id].at[0] * CELL, OY + 30 + NODES[id].at[1] * CELL * 0.72];
export function render(G) {
  const el = UI.el || (UI.el = build());
  el.style.display = UI.open ? 'flex' : 'none';
  if (!UI.open) return;
  el.querySelector('#skPts').innerHTML = `Lv<b style="color:#ffe14a">${G.lv}</b> · 노드 포인트 <b style="color:#ff3d7f;font-size:20px">${G.sp}</b>`;
  let lines = '';
  for (const id in NODES) for (const k of NODES[id].links) {
    const [x0, y0] = pos(id), [x1, y1] = pos(k), on = G.skills.has(id) && G.skills.has(k);
    lines += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${on ? '#ffe14a' : '#4a4570'}" stroke-width="${on ? 7 : 5}" stroke-linecap="round"/>`;
  }
  el.querySelector('#skLines').innerHTML = lines;
  el.querySelector('#skNodes').innerHTML = Object.keys(NODES).map(id => {
    const n = NODES[id], [x, y] = pos(id), st = canLearn(G, id), sel = UI.sel === id;
    const bg = st === 'learned' ? '#ffe14a' : st === 'ok' ? '#2fe6ff' : '#2b2850', fg = st === 'learned' || st === 'ok' ? '#111' : '#8d88b8';
    const shape = n.kind === 'act' ? 'border-radius:50%' : 'border-radius:8px;transform:rotate(45deg)';
    return `<div data-id="${id}" style="position:absolute;left:${x - 34}px;top:${y - 34}px;width:68px;height:68px;cursor:pointer">
      <div style="position:absolute;inset:0;background:${bg};border:4px solid ${sel ? '#ff3d7f' : '#111'};${shape};box-shadow:${sel ? '0 0 0 4px #fff' : '4px 4px 0 #111'}"></div>
      <div style="position:absolute;left:-30px;right:-30px;top:72px;text-align:center;font-size:12px;font-weight:700;color:${st === 'learned' ? '#ffe14a' : '#fff'};text-shadow:0 1px 2px #000">${n.name}</div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Black Han Sans',sans-serif;font-size:18px;color:${fg}">${n.kind === 'act' ? '技' : n.kind === 'stat' ? '+' : '★'}</div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-id]').forEach(d => d.onclick = () => { UI.sel = d.dataset.id; UI.onLearn?.(UI.sel); });
  const n = NODES[UI.sel], st = canLearn(G, UI.sel);
  const why = { learned: '배움', ok: 'Z / A / Enter 로 배우기', locked: '이어진 노드를 먼저 배워야 함', level: `Lv${n.lv} 필요`, point: '노드 포인트 부족' }[st];
  el.querySelector('#skInfo').innerHTML = `<b style="color:#ffe14a;font-size:16px">${n.name}</b> <span style="color:#2fe6ff">${n.kind === 'act' ? '기술' : n.kind === 'stat' ? '능력치' : ''}</span> · 요구 Lv${n.lv}<br>${n.desc}<br><span style="color:${st === 'ok' ? '#2fe6ff' : '#ff9a1f'}">${why}</span> <span style="color:#8d88b8;float:right">방향키 이동 · Esc / C 닫기</span>`;
}
// 방향키로 그 쪽에 가장 가까운 노드로 이동
export function move(dx, dy) {
  const [x0, y0] = pos(UI.sel);
  let best = null, bd = 1e9;
  for (const id in NODES) {
    if (id === UI.sel) continue;
    const [x, y] = pos(id), vx = x - x0, vy = y - y0, along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const d = along + Math.abs(vx * dy - vy * dx) * 2;
    if (d < bd) { bd = d; best = id; }
  }
  if (best) UI.sel = best;
}

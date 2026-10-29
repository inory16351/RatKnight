// 스킬 노드 (그물형, 사용자 결정 2026-10-29): 레벨이 오르면 노드 포인트 1. 쉼터 촛불 앞에서 ↑ 로 창을 열어 찍음 (창이 열린 동안 게임 멈춤).
// 노드는 연결선(links, 양방향)으로 이어진 이웃 중 하나라도 배웠고, 요구 레벨(lv) 이상이고, 포인트가 남아 있으면 배울 수 있음.
// 추가 액션(내려찍기·충전 돌진·벽 차기)은 전부 노드. 벽 차기는 Lv4 부터 → 지하철역 수직갱과 앞 지역 지름길의 열쇠.
export const NODES = {
  root: { name: '기사의 다짐', desc: '모든 길의 시작', at: [0, 0], links: [], lv: 1 },
  plunge: { name: '내려찍기', desc: '공중에서 ↓ + 공격. 땅까지 꽂히며 아래 적을 밀어냄', at: [-1, 1], links: ['root'], lv: 2, kind: 'act' },
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

// ---------- 창 상태 (그리기는 hud.js drawSkills, 게임 캔버스 위) ----------
const UI = { open: false, sel: 'root', onLearn: null };
export const skillUI = UI;
const CELL = 150, ROW = 106, OX = 320, OY = 112;   // 창(640×600) 안 노드 자리 (이름 글자가 아래 줄 선과 안 겹치게 줄 간격 넉넉히)
export const pos = id => [OX + NODES[id].at[0] * CELL, OY + NODES[id].at[1] * ROW];
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

// 능력 (docs/map-structure-plan.md §4, 사용자 결정 2026-10-30)
// a·b·c = 1티어 (서로 다른 2개 선택) · d·e = 2티어 (1개 선택) · 벽 차기 = 첫 번째 초반 맵 보스 공용 보상 (맵 안 숨은 길용)
// 내려찍기·충전 돌진 = 레벨업 자동 해금 (스킬 노드 폐지)
export const BLOCK = 48;   // 지형 1블럭 (px)
export const ABIL = {
  dash3: { id: 'a', tier: 1, name: '3연속 대시', color: '#e5484d', desc: '대시를 3번 이어서 (공중 가능), 대시 내내 무적' },
  parry: { id: 'b', tier: 1, name: '패링', color: '#2f9e5b', desc: '적 공격을 받아넘김 · 가시를 패링해 튕겨 오름' },
  dj: { id: 'c', tier: 1, name: '이단 점프', color: '#26a9d8', desc: '공중에서 한 번 더 점프' },
  sjump: { id: 'd', tier: 2, name: '수직 슈퍼점프', color: '#9b4dca', desc: '땅에서만, 웅크렸다가 아주 높이 솟구침' },
  phase: { id: 'e', tier: 2, name: '단거리 벽통과', color: '#4c4fd6', desc: '앞쪽 5~7블럭 안에 빈 자리가 있으면 순간이동' },
  wall: { id: null, tier: 0, name: '벽 차기', color: '#c9a227', desc: '벽에 붙어 미끄러지다 점프로 박차 오름 (공용 보상)' },
  plunge: { id: null, tier: 0, name: '내려찍기', color: '#8d8fb0', desc: 'Lv2 자동 해금' },
  charge: { id: null, tier: 0, name: '충전 돌진', color: '#8d8fb0', desc: 'Lv3 자동 해금' },
};
export const byId = id => Object.keys(ABIL).find(k => ABIL[k].id === id);
// 레벨업 자동 해금: 그 레벨에 닿으면 얻는 것
export const LEVEL_UNLOCK = { 2: ['plunge'], 3: ['charge'], 4: ['hp'], 5: ['hp'] };

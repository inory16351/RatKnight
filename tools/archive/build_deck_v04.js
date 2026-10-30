// 보관: 이전 환경의 v0.4 생성기. 현재 생성기는 ../build_deck.mjs 사용.
const pptxgen = require('pptxgenjs');
const path = require('path');
const { applyTheme } = require('C:/Users/user/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/local-agent-mode-sessions/skills-plugin/b39660a9-f1be-45da-8de6-766f8855a1e0/e5243304-a181-4739-b899-a73ad172fad3/skills/pptx/scripts/apply_theme.js');

const ROOT = 'C:/Project/RatKnight';
const img = p => path.join(ROOT, p);
const OUT = path.join(ROOT, 'docs', '컨셉 기획서 v0.4.pptx');

const THEME = {
  name: 'RatKnight Dusk',
  headFontFace: 'Noto Sans KR', bodyFontFace: 'Noto Sans KR',
  colors: { dk1: '1F1A33', lt1: 'FFFFFF', dk2: '3B2F5C', lt2: 'EFEAF7', accent1: 'F2A65A', accent2: '3E6B6A', accent3: 'F2C14E', accent4: 'E0607E', accent5: '7A6FA0', accent6: '9BC28B', hlink: '3E6B6A', folHlink: '7A6FA0' },
};

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';   // 10 x 5.625
  pres.author = '정승운'; pres.title = '기사쥐 컨셉 기획서 v0.4';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  // ---------- 레이아웃 ----------
  pres.defineSlideMaster({
    title: 'CONTENT', background: { color: 'FFFFFF' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.28, w: 9, h: 0.62, fontSize: 26, bold: true, color: C.text2, valign: 'middle', margin: 0 }, text: '' } },
      { text: { text: '기사쥐 · 컨셉 기획서 v0.4', options: { x: 0.5, y: 5.22, w: 5, h: 0.25, fontSize: 9, color: '7A6FA0', margin: 0 } } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.28, fontSize: 9, color: '7A6FA0', align: 'right' },
  });
  pres.defineSlideMaster({
    title: 'DARK', background: { color: '1F1A33' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.28, w: 9, h: 0.62, fontSize: 26, bold: true, color: C.background1, valign: 'middle', margin: 0 }, text: '' } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.28, fontSize: 9, color: 'B8B0D6', align: 'right' },
  });

  // ---------- 도우미 ----------
  let nObj = 0;
  const name = s => `${s}_${++nObj}`;
  const card = (slide, x, y, w, h, fill = C.background2) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name('card') });
  const badge = (slide, x, y, label, fill = C.accent1, color = C.background1, d = 0.42) => {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name('badge') });
    slide.addText(label, { x, y, w: d, h: d, fontSize: 13, bold: true, color, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: name('badgeText') });
  };
  const text = (slide, t, o) => slide.addText(t, { isTextBox: true, margin: 0, valign: 'top', fontSize: 14, color: C.text1, objectName: name('text'), ...o });
  const bullets = (slide, items, o) => slide.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })), { isTextBox: true, margin: 0, valign: 'top', fontSize: 14, color: C.text1, objectName: name('bullets'), ...o });
  const section = t => pres.addSection({ title: t });
  const content = (sec, title) => { const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec }); s.addText(title, { placeholder: 'title' }); return s; };

  // ===== 1. 표지 =====
  section('표지');
  {
    const s = pres.addSlide({ masterName: 'DARK', sectionTitle: '표지' });
    s.background = { path: img('기획서/ppt/title_bg.jpg') };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: '1F1A33', transparency: 35 }, line: { color: '1F1A33', width: 0 }, objectName: 'shade' });
    s.addImage({ path: img('기획서/ppt/hero.png'), x: 6.7, y: 1.05, w: 412 / 719 * 3.9, h: 3.9, objectName: 'hero' });
    text(s, '기사쥐', { x: 0.7, y: 1.35, w: 6, h: 1.0, fontSize: 54, bold: true, color: C.background1 });
    text(s, 'RatKnight', { x: 0.72, y: 2.3, w: 6, h: 0.4, fontSize: 18, color: C.accent3, charSpacing: 4 });
    text(s, '기사를 꿈꾸는 시골 생쥐가 왕국을 향해 떠나는 메트로베니아 액션', { x: 0.7, y: 2.85, w: 6.0, h: 0.7, fontSize: 15, color: C.background1 });
    text(s, '컨셉 기획서  ·  작성자 정승운  ·  작성일 2026-10-28  ·  버전 v0.4', { x: 0.7, y: 4.55, w: 6, h: 0.3, fontSize: 11, color: 'D9D2EE' });
    s.addNotes('찍!찍!!찍!!! IP 확장 작품 기사쥐의 컨셉 기획서 v0.4. 이번 판에서 장르를 메트로베니아로 바꾸고 세계관을 시골·버려진 숲으로 다시 잡음.');
  }

  // ===== 2. 목차 =====
  section('개요');
  {
    const s = content('개요', '목차');
    const items = ['기획의도', '원페이지 기획서', '스토리 · 세계관', '캐릭터', '비주얼 가이드', '액션 모션', '이펙트 가이드', '게임 루프 · 성장', '적 · 월드', '제작 파이프라인'];
    items.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 0.5 + col * 4.6, y = 1.15 + row * 0.78;
      card(s, x, y, 4.4, 0.62);
      badge(s, x + 0.12, y + 0.1, String(i + 1).padStart(2, '0'), i % 2 ? C.accent2 : C.accent5);
      text(s, t, { x: x + 0.7, y: y + 0.1, w: 3.5, h: 0.42, fontSize: 15, bold: true, valign: 'middle' });
    });
  }

  // ===== 3. 기획의도 =====
  {
    const s = content('개요', '기획의도');
    bullets(s, [
      '원작 「찍!찍!!찍!!!」 기사쥐 초필살기의 시원한 베기를 한 판 내내 손으로 느끼게 하는 것이 목표',
      '귀여운 겉모습과 날카로운 손맛의 대비. 보기엔 동글동글, 치면 묵직함',
      '탐험과 성장이 엮인 메트로베니아 구조로 전환. 새 기술·능력이 새 길을 엶',
      '레퍼런스: 할로우 나이트(탐험·성장), 카타나 제로(한 획 베기), 이나리(웅크린 회전 → 관통 돌진)',
    ], { x: 0.5, y: 1.2, w: 4.3, h: 3.6, fontSize: 14 });
    s.addImage({ path: img('기획서/ppt/scene.png'), x: 5.1, y: 1.2, w: 4.4, h: 4.4 * 580 / 1120, objectName: 'scene' });
    text(s, '웹 프로토 실제 화면 — 버려진 숲', { x: 5.1, y: 1.2 + 4.4 * 580 / 1120 + 0.08, w: 4.4, h: 0.3, fontSize: 10, color: '7A6FA0' });
  }

  // ===== 4. 원페이지 =====
  {
    const s = content('개요', '원페이지 기획서');
    const H = { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 12, valign: 'middle' };
    const K = { bold: true, color: C.text2, fill: { color: C.background2 }, fontSize: 12, valign: 'middle' };
    const V = { color: C.text1, fontSize: 12, valign: 'middle' };
    const rows = [
      ['장르', '2D 횡스크롤 메트로베니아 액션 플랫포머'],
      ['플랫폼', 'PC (웹 프로토 → 웹 빌드 → 유니티 본편)'],
      ['핵심 재미', '몸을 가로지르는 베기의 손맛, 끊김 없는 이동·베기·대시·공중 연계'],
      ['주인공', '기사를 꿈꾸는 시골 견습 생쥐. 한손검(아밍소드) 한 자루'],
      ['목표', '버려진 숲길에서 출발해 왕국에 닿고, 최강의 명검을 손에 넣는 여정'],
      ['성장', '레벨업으로 연계 기술 해금, 능력 아이템으로 새 길 해금'],
      ['차별점', '플랫 그림 + 코드 셰이더·픽셀화, 칼끝을 따라 휘는 칼빛, 원근 레이어 배경'],
    ];
    s.addTable([[{ text: '항목', options: H }, { text: '내용', options: H }], ...rows.map(([k, v]) => [{ text: k, options: K }, { text: v, options: V }])],
      { x: 0.5, y: 1.15, w: 9, colW: [1.6, 7.4], rowH: 0.43, border: { type: 'solid', color: 'FFFFFF', pt: 2 }, fill: { color: 'FFFFFF' }, margin: [0, 0.12, 0, 0.12], objectName: 'onepage' });
    text(s, '한 줄 요약 — 기사를 꿈꾸는 생쥐가 베는 맛 하나로 왕국까지 끌고 가는 액션 플랫포머', { x: 0.5, y: 4.75, w: 9, h: 0.3, fontSize: 13, bold: true, color: C.accent2 });
  }

  // ===== 5. 스토리 =====
  section('세계관 · 캐릭터');
  {
    const s = content('세계관 · 캐릭터', '스토리 · 세계관');
    s.addImage({ path: img('기획서/ppt/title_bg.jpg'), x: 0.5, y: 1.15, w: 4.6, h: 2.3, objectName: 'world' });
    text(s, '지평선 너머 왕국 성 — 여정의 목표가 늘 화면 뒤에 보임', { x: 0.5, y: 3.52, w: 4.6, h: 0.3, fontSize: 10, color: '7A6FA0' });
    bullets(s, [
      '시골 마을 끝자락에 사는 작은 생쥐. 매일 밤 기사가 되는 꿈',
      '오래 버려진 숲길에서 모험 시작. 낡은 허수아비, 부서진 수레바퀴, "왕국으로" 표지판',
      '숲 → 언덕 → 왕국으로 이어지는 연결된 지역을 탐험',
      '끝에서 기다리는 최강의 명검. 손에 넣으면 칼이 커지는 강화 상태(후속)',
    ], { x: 5.4, y: 1.15, w: 4.1, h: 3.0, fontSize: 13 });
    const regions = ['마을 끝 들길', '버려진 숲', '잊힌 기사의 언덕', '…', '왕국'];
    regions.forEach((r, i) => {
      const x = 0.5 + i * 1.84;
      card(s, x, 4.2, 1.6, 0.55, i === 4 ? C.accent1 : C.background2);
      text(s, r, { x, y: 4.2, w: 1.6, h: 0.55, fontSize: 12, bold: true, align: 'center', valign: 'middle', color: i === 4 ? C.background1 : C.text2 });
      if (i < 4) text(s, '→', { x: x + 1.6, y: 4.2, w: 0.24, h: 0.55, fontSize: 14, align: 'center', valign: 'middle', color: '7A6FA0' });
    });
  }

  // ===== 6. 캐릭터 =====
  {
    const s = content('세계관 · 캐릭터', '캐릭터 — 견습 기사쥐');
    card(s, 0.5, 1.15, 3.0, 3.85, C.background2);
    s.addImage({ path: img('기획서/ppt/hero.png'), x: 0.5 + (3.0 - 412 / 719 * 3.5) / 2, y: 1.3, w: 412 / 719 * 3.5, h: 3.5, objectName: 'heroCard' });
    const rows = [
      ['비율', '실크송·스컬풍 꼬마 치비(약 2.2등신). 큰 머리 + 굵은 팔다리'],
      ['색', '남색 망토 + 금색 장식. 흰·노랑·주황 칼빛이 남색 몸 위에서 가장 잘 보이는 조합'],
      ['무기', '확정 방향은 기사 한손검(아밍소드). 지금 프로토 리그는 큰 칼 — 한손검 그림으로 교체 예정'],
      ['그림', '완전 플랫(명암·외곽선 없음)으로 생성. 명암은 코드 셰이더, 도트는 코드 픽셀화'],
      ['애니', '컷아웃 리그 + 극한 순간만 통그림 프레임 (예: 공처럼 몸을 만 공중 회전)'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 1.15 + i * 0.78;
      text(s, k, { x: 3.8, y, w: 0.9, h: 0.6, fontSize: 13, bold: true, color: C.accent2 });
      text(s, v, { x: 4.7, y, w: 4.8, h: 0.7, fontSize: 13 });
    });
  }

  // ===== 7. 비주얼 가이드 =====
  section('비주얼 · 액션');
  {
    const s = content('비주얼 · 액션', '비주얼 가이드');
    s.addImage({ path: img('기획서/ppt/scene.png'), x: 0.5, y: 1.15, w: 5.2, h: 5.2 * 580 / 1120, objectName: 'sceneBig' });
    const pts = [
      ['플랫 → 코드 픽셀화', '캐릭터·배경·적 모두 플랫하게 생성하고 픽셀화는 코드에서. 그림 규칙 통일'],
      ['셰이더 명암', '실루엣 쿠션 법선 → 셀 2단 + 망점. 빛 각도 24방향 미리 구워 회전해도 빛 유지'],
      ['원근 레이어', '하늘·먼 숲·중간 판은 멀수록 흐리고 안개색, 카메라를 느리게 따라감. 앞 판은 흐리고 어둡게 빠르게'],
    ];
    pts.forEach(([h, b], i) => {
      const y = 1.15 + i * 1.12;
      badge(s, 6.0, y, String(i + 1), [C.accent5, C.accent2, C.accent1][i]);
      text(s, h, { x: 6.55, y: y - 0.02, w: 3.0, h: 0.32, fontSize: 14, bold: true, color: C.text2 });
      text(s, b, { x: 6.55, y: y + 0.32, w: 3.0, h: 0.75, fontSize: 11, color: C.text1 });
    });
    text(s, '연출 톤: 팝아트 + 젠레스 존 제로 — 효과음 글자, 임팩트 컷(화면 반전), 집중선, 슬로우 줌', { x: 0.5, y: 4.0, w: 5.2, h: 0.6, fontSize: 12, color: C.accent2, bold: true });
  }

  // ===== 8. 기본 모션 =====
  {
    const s = content('비주얼 · 액션', '기본 모션');
    const m = [
      ['대기', '펜싱 자세, 숨쉬기·망토·꼬리 흔들림'],
      ['달리기', '큰 보폭 치비 달리기, 칼은 등에'],
      ['점프 · 낙하', '약 122px, 짧게 누르면 낮게'],
      ['이단 점프', '능력 아이템. 앞으로 공중제비'],
      ['대시', 'F 짧게. 매 프레임 잔상, 공중 1회'],
      ['피격', '뒤로 밀리며 흰 번쩍, 1초 무적 깜빡임'],
      ['사망', '무릎 → 쓰러짐, 마지막 쉼터에서 부활'],
      ['목 보정', '머리를 몸통 쪽으로 내려 뜬 느낌 제거'],
    ];
    m.forEach(([h, b], i) => {
      const col = i % 4, row = Math.floor(i / 4), x = 0.5 + col * 2.28, y = 1.2 + row * 1.85;
      card(s, x, y, 2.1, 1.6);
      text(s, h, { x: x + 0.18, y: y + 0.18, w: 1.8, h: 0.4, fontSize: 15, bold: true, color: C.text2 });
      text(s, b, { x: x + 0.18, y: y + 0.65, w: 1.8, h: 0.85, fontSize: 12 });
    });
  }

  // ===== 9. 평타 콤보 =====
  {
    const s = content('비주얼 · 액션', '평타 3타 — 끊기지 않는 루프');
    const steps = [
      ['1타', '돌진 공격 1타의 수평 회전을 위로 기울인 올려 베기. 몸을 숙이며 살짝 돌진, 칼빛은 캐릭터 앞에', '기획서/ppt/slash1.png', 590 / 310],
      ['2타', '크게 올려치며 칼이 머리 위를 넘어 등 뒤로. 그 회전으로 뒤돌아선 자세 그대로 대기', null],
      ['3타', '뒤로 돈 자세에서 앞으로 한 바퀴 돌며 벰. 칼이 등 뒤에 남은 채 끝 → 다시 1타가 그 칼을 앞으로 베어 넘김', '기획서/ppt/slash3.png', 640 / 360],
    ];
    steps.forEach(([h, b, im, ar], i) => {
      const x = 0.5 + i * 3.08, w = 2.85;
      card(s, x, 1.15, w, 3.2);
      badge(s, x + 0.15, 1.3, h, [C.accent1, C.accent5, C.accent2][i], C.background1, 0.55);
      if (im) s.addImage({ path: img(im), x: x + 0.15, y: 1.98, w: w - 0.3, h: (w - 0.3) / ar, objectName: name('combo') });
      else { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 1.98, w: w - 0.3, h: 1.4, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF', width: 0 }, objectName: name('turn') });
        text(s, '↺  뒤돌기', { x: x + 0.15, y: 1.98, w: w - 0.3, h: 1.4, fontSize: 26, bold: true, align: 'center', valign: 'middle', color: C.accent5 }); }
      text(s, b, { x: x + 0.18, y: 3.5, w: w - 0.36, h: 0.8, fontSize: 12 });
    });
    text(s, '3타 다음 공격은 다시 1타 — 뒤로 넘어간 칼을 앞으로 베어 넘기며 끊김 없이 반복', { x: 0.5, y: 4.55, w: 9, h: 0.4, fontSize: 13, bold: true, color: C.accent2 });
  }

  // ===== 10. 공중 · 특수 =====
  {
    const s = content('비주얼 · 액션', '공중 · 특수 기술');
    card(s, 0.5, 1.15, 3.1, 3.9, C.background2);
    s.addImage({ path: img('art/knight/v6spin/frames/f10.png'), x: 0.65, y: 1.6, w: 2.8, h: 2.8 * 304 / 597, objectName: 'ball' });
    text(s, '공중 세로 회전 — Codex 통그림 프레임, 리그와 같은 셰이더', { x: 0.7, y: 3.35, w: 2.7, h: 0.9, fontSize: 11, color: C.text2 });
    const sk = [
      ['공중 세로 회전', '공중 공격. 살짝 솟아오르며 몸을 공처럼 말고 앞으로 한 바퀴(제다이 점프). 칼빛이 세로 바퀴로 남음', '기본'],
      ['내려찍기', '공중 ↓ + 공격. 급강하해 적에 꽂히면 튕겨 오르며 공중 기술 회복, 땅에 꽂히면 충격파', 'Lv2'],
      ['충전 돌진', 'F 길게. 칼을 뒤로 빼며 웅크려 기 모음(빛줄기·줌·섬광) → 떼면 돌진 + 마무리 베기. 충전량만큼 거리·칼빛·판정 증가', 'Lv3'],
    ];
    sk.forEach(([h, b, lv], i) => {
      const y = 1.15 + i * 1.32;
      text(s, h, { x: 3.9, y, w: 4.4, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: y + 0.02, w: 0.75, h: 0.3, rectRadius: 0.15, fill: { color: lv === '기본' ? C.accent6 : C.accent3 }, line: { color: 'FFFFFF', width: 0 }, objectName: name('lv') });
      text(s, lv, { x: 8.75, y: y + 0.02, w: 0.75, h: 0.3, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: C.text1 });
      text(s, b, { x: 3.9, y: y + 0.4, w: 5.6, h: 0.85, fontSize: 12 });
    });
  }

  // ===== 11. 이펙트 =====
  {
    const s = content('비주얼 · 액션', '이펙트 가이드');
    s.addImage({ path: img('기획서/ppt/slash3.png'), x: 5.0, y: 1.15, w: 4.5, h: 4.5 * 360 / 640, objectName: 'fx' });
    text(s, '3타 회전 베기 — 칼에 붙는 리본, 칼 쪽이 두껍고 꼬리는 바늘 끝', { x: 5.0, y: 1.15 + 4.5 * 360 / 640 + 0.08, w: 4.5, h: 0.4, fontSize: 10, color: '7A6FA0' });
    bullets(s, [
      '칼빛 = 칼끝 길을 따라 휘는 4겹 리본. 나타날 때 흰 단색 → 노랑 → 부서지며 주황',
      '칼에 붙는 머리가 꼬리보다 두껍게, 꼬리부터 차례로 사라짐',
      '평타 칼빛은 공격 방향 앞쪽에. 공중 회전은 몸 중심',
      '타격 = 적 반대쪽에서 섬광·빛줄기·파편이 베기 방향으로 뻗어 나감',
      '효과음 글자, 임팩트 컷(화면 반전), 히트스톱, 막타 슬로우 줌',
      '기 모으기 = 빛줄기가 몸으로 빨려 듦 + 화면 줌 + 다 차면 MAX 섬광',
    ], { x: 0.5, y: 1.15, w: 4.2, h: 3.9, fontSize: 12 });
  }

  // ===== 12. 게임 루프 =====
  section('시스템');
  {
    const s = content('시스템', '기본 게임 루프');
    const loop = [['탐험', '연결된 방, 출구로 이동'], ['전투', '벌레 적과 싸움'], ['치즈 획득', '쓰러진 적이 경험치를 떨굼'], ['레벨업', '연계 기술 해금, 체력 회복'], ['쉼터', '촛불에 저장·회복, 쓰러지면 부활'], ['새 길', '능력 아이템으로 막힌 곳 돌파']];
    const cx = 5, cy = 3.1, rx = 3.3, ry = 1.55;
    loop.forEach(([h, b], i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / loop.length, x = cx + rx * Math.cos(a) - 1.05, y = cy + ry * Math.sin(a) - 0.4;
      card(s, x, y, 2.1, 0.8, i % 2 ? C.background2 : 'F7E8DA');
      text(s, h, { x: x + 0.12, y: y + 0.07, w: 1.9, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
      text(s, b, { x: x + 0.12, y: y + 0.38, w: 1.9, h: 0.38, fontSize: 10 });
    });
    text(s, '↻', { x: cx - 0.6, y: cy - 0.6, w: 1.2, h: 1.2, fontSize: 54, align: 'center', valign: 'middle', color: C.accent1 });
  }

  // ===== 13. 성장 =====
  {
    const s = content('시스템', '성장 · 해금');
    const H = { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 12, valign: 'middle', align: 'center' };
    const V = o => ({ fontSize: 12, valign: 'middle', color: C.text1, ...o });
    const rows = [['Lv1', '0', '기본 3타 · 공중 세로 회전 · 대시'], ['Lv2', '12', '내려찍기'], ['Lv3', '30', '충전 돌진'], ['Lv4', '55', '최대 체력 +1'], ['Lv5', '85', '최대 체력 +1']];
    s.addTable([[{ text: '레벨', options: H }, { text: '치즈', options: H }, { text: '해금', options: H }], ...rows.map(r => [{ text: r[0], options: V({ bold: true, align: 'center', color: C.text2 }) }, { text: r[1], options: V({ align: 'center' }) }, { text: r[2], options: V({}) }])],
      { x: 0.5, y: 1.15, w: 5.2, colW: [0.9, 0.9, 3.4], rowH: 0.48, border: { type: 'solid', color: 'FFFFFF', pt: 2 }, fill: { color: C.background2 }, margin: [0, 0.12, 0, 0.12], objectName: 'lvTable' });
    card(s, 6.0, 1.15, 3.5, 1.65, 'F7E8DA');
    s.addImage({ path: img('art/props/cut/crumb.png'), x: 6.15, y: 1.3, w: 0.55, h: 0.55 * 299 / 338, objectName: 'crumb' });
    text(s, '치즈 = 경험치', { x: 6.85, y: 1.3, w: 2.5, h: 0.4, fontSize: 14, bold: true, color: C.text2 });
    text(s, '쓰러진 적이 치즈 조각을 떨구고, 잠시 뒤 플레이어에게 빨려 옴. 딱정벌레 6 · 날파리 4', { x: 6.15, y: 1.9, w: 3.2, h: 0.85, fontSize: 11 });
    card(s, 6.0, 3.0, 3.5, 2.05, C.background2);
    text(s, '능력 아이템 — 새 길', { x: 6.15, y: 3.12, w: 3.2, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
    bullets(s, ['이단 점프: 높은 나무뿌리 위 출구(바닥에서 180px)를 엶', '후속: 명검 강화(칼이 커짐), 벽 차기 등'], { x: 6.15, y: 3.55, w: 3.2, h: 1.4, fontSize: 11 });
  }

  // ===== 14. 적 · 월드 =====
  {
    const s = content('시스템', '적 · 월드 구성');
    const foes = [
      ['딱정벌레', 'art/enemy/crawler/cut/walk0.png', 455 / 317, '바닥을 기다 다가오면 0.6초 몸을 젖혔다가 돌진. 체력 24'],
      ['날파리', 'art/enemy/flyer/cut/fly0.png', 419 / 416, '공중에서 맴돌다 젖히고 플레이어 쪽으로 급강하. 체력 16'],
    ];
    foes.forEach(([h, im, ar, b], i) => {
      const x = 0.5 + i * 2.6;
      card(s, x, 1.15, 2.4, 3.0);
      const iw = Math.min(1.9, 1.3 * ar);
      s.addImage({ path: img(im), x: x + (2.4 - iw) / 2, y: 1.35, w: iw, h: iw / ar, objectName: name('foe') });
      text(s, h, { x: x + 0.18, y: 2.85, w: 2.1, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
      text(s, b, { x: x + 0.18, y: 3.22, w: 2.1, h: 0.9, fontSize: 11 });
    });
    text(s, '몸통 박치기는 적이 공격하는 순간(돌진·급강하)에만 피해. 걷는 적에겐 내딛으며 베어 들어갈 수 있음', { x: 0.5, y: 4.3, w: 5.0, h: 0.7, fontSize: 11, color: C.accent2, bold: true });
    card(s, 5.9, 1.15, 3.6, 3.85, 'F7E8DA');
    s.addImage({ path: img('art/props/cut/candle_on.png'), x: 6.05, y: 1.3, w: 0.75, h: 0.75 * 522 / 477, objectName: 'candle' });
    text(s, '쉼터 촛불', { x: 6.95, y: 1.35, w: 2.4, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
    text(s, '닿으면 불이 켜지며 저장·체력 회복', { x: 6.95, y: 1.72, w: 2.4, h: 0.5, fontSize: 11 });
    const rooms = [['마을 끝 들길', '쉼터 · 딱정벌레 · 훈련 허수아비'], ['버려진 숲', '딱정벌레 2 · 날파리 · 이단 점프'], ['잊힌 기사의 언덕', '쉼터 · 날파리 2 · 딱정벌레 · 명검의 기운']];
    rooms.forEach(([h, b], i) => {
      const y = 2.55 + i * 0.78;
      text(s, h, { x: 6.05, y, w: 3.3, h: 0.3, fontSize: 12, bold: true, color: C.accent2 });
      text(s, b, { x: 6.05, y: y + 0.3, w: 3.3, h: 0.4, fontSize: 11 });
    });
  }

  // ===== 15. 파이프라인 =====
  section('제작');
  {
    const s = content('제작', '제작 파이프라인');
    const st = [['웹 프로토', '모션·이펙트·루프를 코드 표로 확정'], ['웹 빌드', '공유·피드백'], ['유니티 이식', '리그 구조·모션 표를 그대로 옮김']];
    st.forEach(([h, b], i) => {
      const x = 0.5 + i * 3.08;
      card(s, x, 1.15, 2.85, 1.25, i === 0 ? 'F7E8DA' : C.background2);
      badge(s, x + 0.15, 1.3, String(i + 1), [C.accent1, C.accent5, C.accent2][i]);
      text(s, h, { x: x + 0.7, y: 1.32, w: 2.0, h: 0.4, fontSize: 15, bold: true, color: C.text2 });
      text(s, b, { x: x + 0.18, y: 1.82, w: 2.55, h: 0.5, fontSize: 11 });
      if (i < 2) text(s, '→', { x: x + 2.85, y: 1.15, w: 0.23, h: 1.25, fontSize: 16, align: 'center', valign: 'middle', color: '7A6FA0' });
    });
    text(s, '그림 제작', { x: 0.5, y: 2.75, w: 9, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
    const art = [['생성', 'Codex로 플랫하게 생성'], ['키잉', '자홍을 빼고 덩어리별로 자름'], ['리그', '통그림에 맞춰 부위·칼 자리 기록'], ['마감', '코드 셰이더 명암 + 픽셀화']];
    art.forEach(([h, t], i) => {
      const x = 0.5 + i * 2.3;
      card(s, x, 3.2, 2.1, 1.05);
      text(s, h, { x: x + 0.15, y: 3.3, w: 1.8, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
      text(s, t, { x: x + 0.15, y: 3.62, w: 1.85, h: 0.55, fontSize: 11 });
    });
    text(s, '그림 규칙: 픽셀아트로 뽑지 않고 플랫하게 → 픽셀화는 코드. 리그로 힘든 극한 자세만 통그림 프레임', { x: 0.5, y: 4.45, w: 9, h: 0.5, fontSize: 12, color: C.accent2, bold: true });
  }

  // ===== 16. 다음 단계 =====
  {
    const s = pres.addSlide({ masterName: 'DARK', sectionTitle: '제작' });
    s.addText('다음 단계', { placeholder: 'title' });
    const nx = [['UI 그림', '체력 하트·레벨 배지·경험치 막대·알림 띠를 Codex로 생성 (지금은 코드 HUD)'], ['보스 · 지역', '숲의 수호자 보스, 왕국까지 이어지는 지역 확장'], ['명검 강화', '명검을 얻으면 한시적으로 기를 모아 칼이 커지는 강화 상태'], ['유니티 이식', '확정된 모션 표·리그·루프를 유니티로']];
    nx.forEach(([h, b], i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 0.5 + col * 4.6, y = 1.3 + row * 1.85;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.6, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: C.text2, width: 0 }, objectName: name('next') });
      badge(s, x + 0.2, y + 0.2, String(i + 1), [C.accent1, C.accent3, C.accent4, C.accent6][i], C.text1);
      text(s, h, { x: x + 0.8, y: y + 0.22, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.background1 });
      text(s, b, { x: x + 0.25, y: y + 0.75, w: 3.95, h: 0.8, fontSize: 12, color: 'D9D2EE' });
    });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('written', OUT);
})().catch(e => { console.error(e); process.exit(1); });

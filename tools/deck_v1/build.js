// 기사쥐 컨셉 기획서 V1 빌드
//   cd tools/deck_v1 && npm install && node build.js
// 결과: 기획서/컨셉 기획서 V<버전>.pptx
// 픽토그램: 기획서/picto/codex/<키>.png (Codex 생성본) 우선, 없으면 game-icons 배지 자동 생성
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pptxgen = require('pptxgenjs');
const { COL, loadPictos } = require('./picto');

const VERSION = 'V1.1';
const DATE = '2026-10-30';
const AUTHOR = '정승운';
const HISTORY = [
  [VERSION, DATE, '신규 컨셉 기획서 초안. 버전 관리·목차, 원페이지 기획서, 맵 구성·이동 구조·진행 흐름, 성장 구조(보스 처치 = 이동 스킬, 탐험 = 전투 스킬, 스탯 성장 제외) 작성', AUTHOR],
];

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, `기획서/컨셉 기획서 ${VERSION}.pptx`);
const HEAD = 'Black Han Sans';
const BODY = 'Noto Sans KR';
const W = 13.333, H = 7.5;

// 하수구 · 팝아트 도시 팔레트
const C = {
  ...COL,
  night: '1C1830',   // 어두운 표지·간지 바탕
  sewer: '22332F',   // 하수구 청록
  paper: 'F0F2EC',   // 콘크리트 밝은 바탕
  card: 'FFFFFF',
  mute: '5E6670',
  line: 'C9D1C8',
};
const AB = { a: C.red, b: C.green, c: C.sky, d: C.purple, e: C.blue };
const ABNAME = { a: '벽타기', b: '수영·잠수', c: '사슬팔', d: '대포알 탑승', e: '낙하산' };

const b64 = (buf, mime = 'image/png') => `${mime};base64,` + buf.toString('base64');

// ---------- 그림 준비 ----------
function halftoneSvg(w, h, base, dot, corner, maxR, step) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` + (base ? `<rect width="${w}" height="${h}" fill="#${base}"/>` : '');
  const [cx, cy] = corner === 'br' ? [w, h] : corner === 'bl' ? [0, h] : corner === 'tr' ? [w, 0] : [0, 0];
  const reach = Math.hypot(w, h) * 0.55;
  for (let y = 0, row = 0; y <= h + step; y += step * 0.866, row++) {
    for (let x = row % 2 ? step / 2 : 0; x <= w + step; x += step) {
      const t = 1 - Math.hypot(x - cx, y - cy) / reach;
      if (t <= 0) continue;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(maxR * t).toFixed(2)}" fill="#${dot}"/>`;
    }
  }
  return Buffer.from(s + '</svg>');
}

async function keyMagenta(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.min(r, b) - g; // 자홍 정도
    if (m > 120) data[i + 3] = 0;
    else if (m > 60) data[i + 3] = Math.round(255 * (120 - m) / 60);
  }
  return sharp(data, { raw: info }).trim().png().toBuffer();
}

async function prepAssets() {
  const A = {};
  A.bgLight = b64(await sharp(halftoneSvg(1600, 900, C.paper, 'E1E6DA', 'br', 7, 18)).png().toBuffer());
  A.bgDark = b64(await sharp(halftoneSvg(1600, 900, C.night, '2B3D38', 'bl', 9, 20)).png().toBuffer());
  A.dotsPink = b64(await sharp(halftoneSvg(600, 600, null, 'FF7FB2', 'tr', 9, 20)).png().toBuffer());
  A.hero = b64(await sharp(path.join(ROOT, 'art/knight/v7/concept/hero.png')).trim().png().toBuffer());
  A.city = b64(await sharp(path.join(ROOT, '기획서/ppt/city_depth.png')).jpeg({ quality: 88 }).toBuffer(), 'image/jpeg');
  A.sewer = b64(await sharp(path.join(ROOT, '기획서/ppt/sewer_depth.png')).jpeg({ quality: 88 }).toBuffer(), 'image/jpeg');
  A.toad = b64(await keyMagenta(path.join(ROOT, 'art/boss/toad/full.png')));
  A.centi = b64(await keyMagenta(path.join(ROOT, 'art/boss/centipede/full.png')));
  return A;
}

// ---------- 공통 도형 ----------
const shadow = (o = 4) => ({ type: 'outer', blur: 0, offset: o, angle: 45, color: C.ink, opacity: 1 });

function card(s, x, y, w, h, fill = C.card, o = {}) {
  s.addShape('roundRect', {
    x, y, w, h, rectRadius: o.r ?? 0.12, fill: { color: fill }, line: { color: C.ink, width: o.lw ?? 1.75 },
    shadow: o.flat ? undefined : shadow(o.sh ?? 4), objectName: o.name,
  });
}

function text(s, t, x, y, w, h, o = {}) {
  s.addText(t, {
    x, y, w, h, isTextBox: true, margin: o.margin ?? 0, fontFace: o.head ? HEAD : BODY,
    fontSize: o.size ?? 12, color: o.color ?? C.ink, bold: o.bold ?? false, align: o.align ?? 'left',
    valign: o.valign ?? 'top', lineSpacingMultiple: o.ls ?? 1.15, paraSpaceAfter: o.psa, charSpacing: o.cs,
    objectName: o.name, fit: 'none',
  });
}

function pill(s, t, x, y, w, fill, o = {}) {
  const h = o.h ?? 0.3;
  s.addShape('roundRect', { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { color: C.ink, width: 1.25 } });
  text(s, t, x, y, w, h, { size: o.size ?? 10.5, bold: true, align: 'center', valign: 'middle', color: o.color ?? C.ink });
}

function picto(s, P, key, x, y, d) {
  s.addImage({ data: P[key].data, x, y, w: d, h: d, altText: key });
}

// 선(화살표). (x1,y1) → (x2,y2)
function arrow(s, x1, y1, x2, y2, color, o = {}) {
  const dx = x2 - x1, dy = y2 - y1;
  s.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(dx), 0.001), h: Math.max(Math.abs(dy), 0.001),
    flipH: dx < 0, flipV: dy < 0,
    line: { color, width: o.width ?? 3, dashType: o.dash ?? 'solid', endArrowType: o.noEnd ? undefined : 'triangle', beginArrowType: o.both ? 'triangle' : undefined },
  });
}
// 두 원 사이 연결: 원 둘레에서 끊어 그림
function link(s, a, b, color, o = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const ra = (a.r ?? 0.5) + 0.06, rb = (b.r ?? 0.5) + 0.06;
  arrow(s, a.x + ux * ra, a.y + uy * ra, b.x - ux * rb, b.y - uy * rb, color, o);
}

// 팝아트 큰 글씨: 어긋난 색판 + 본 글자
function popText(s, t, x, y, w, h, size, fg, back, off = 0.05, align = 'left') {
  text(s, t, x + off, y + off, w, h, { head: true, size, color: back, align, valign: 'middle', ls: 1 });
  text(s, t, x, y, w, h, { head: true, size, color: fg, align, valign: 'middle', ls: 1 });
}

// ---------- 슬라이드 ----------
function defineLayouts(pres, A) {
  const footer = (dark) => ([
    { text: { text: `RAT KNIGHT · 컨셉 기획서 ${VERSION}`, options: { x: 0.6, y: 7.08, w: 6, h: 0.25, fontFace: BODY, fontSize: 9, color: dark ? '9AA3A0' : C.mute, margin: 0 } } },
  ]);
  pres.defineSlideMaster({
    title: 'CONTENT', background: { data: A.bgLight },
    objects: footer(false),
    slideNumber: { x: 12.2, y: 7.05, w: 0.55, h: 0.3, fontFace: BODY, fontSize: 9, color: C.mute, align: 'right' },
  });
  pres.defineSlideMaster({
    title: 'DARK', background: { data: A.bgDark },
    objects: footer(true),
    slideNumber: { x: 12.2, y: 7.05, w: 0.55, h: 0.3, fontFace: BODY, fontSize: 9, color: '9AA3A0', align: 'right' },
  });
}

function head(s, chapter, title) {
  pill(s, chapter, 0.6, 0.38, 1.3, C.yellow, { h: 0.28, size: 10 });
  text(s, title, 0.6, 0.72, 10, 0.62, { head: true, size: 30, valign: 'middle', ls: 1, name: 'title' });
}

function cover(pres, A) {
  const s = pres.addSlide({ masterName: 'DARK' });
  s.addImage({ data: A.city, x: 0, y: 0, w: W, h: H });
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.night, transparency: 30 }, line: { type: 'none' } });
  s.addImage({ data: A.hero, x: 8.75, y: 0.75, w: 3.85, h: 6.0, sizing: { type: 'contain', w: 3.85, h: 6.0 } });
  card(s, 0.7, 1.3, 7.3, 4.9, C.paper, { sh: 7, lw: 2.5 });
  s.addImage({ data: A.dotsPink, x: 5.6, y: 1.33, w: 2.35, h: 2.35, transparency: 40 });
  pill(s, '컨셉 기획서', 1.15, 1.75, 1.45, C.pink, { color: C.white, size: 11 });
  popText(s, '기사쥐', 1.1, 2.15, 6, 1.35, 72, C.ink, C.yellow, 0.07);
  text(s, 'RAT KNIGHT', 1.15, 3.5, 5, 0.4, { head: true, size: 20, color: C.pink, cs: 4 });
  text(s, '하수구 쥐 마을의 꼬마쥐가 쓰레기로 만든 기사 장비를 입고\n전설의 명검을 찾아 도시를 누비는 픽셀 팝아트 액션 메트로배니아', 1.15, 4.1, 6.5, 0.9, { size: 14, ls: 1.3 });
  text(s, `${VERSION}  |  ${DATE}  |  ${AUTHOR}`, 1.15, 5.45, 6, 0.35, { size: 12, color: C.mute, bold: true });
}

function versions(pres) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '버전 관리', '문서 변경 이력');
  const hdr = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.ink }, align: 'center' } });
  const rows = [[hdr('버전'), hdr('날짜'), hdr('변경 내용'), hdr('작성자')]];
  HISTORY.forEach((r, i) => rows.push([
    { text: r[0], options: { bold: true, align: 'center', fill: { color: i === 0 ? 'FFF3B0' : C.white } } },
    { text: r[1], options: { align: 'center', fill: { color: i === 0 ? 'FFF3B0' : C.white } } },
    { text: r[2], options: { fill: { color: i === 0 ? 'FFF3B0' : C.white } } },
    { text: r[3], options: { align: 'center', fill: { color: i === 0 ? 'FFF3B0' : C.white } } },
  ]));
  s.addTable(rows, {
    x: 0.6, y: 1.7, w: 12.13, colW: [1.1, 1.5, 8.13, 1.4], fontFace: BODY, fontSize: 12, color: C.ink,
    border: { type: 'solid', pt: 1, color: C.ink }, valign: 'middle', margin: [0.08, 0.12, 0.08, 0.12], rowH: [0.42, 0.75],
  });
  card(s, 0.6, 3.55, 12.13, 1.05, C.white, { sh: 3 });
  text(s, '버전 규칙', 0.85, 3.7, 2, 0.3, { size: 13, bold: true, color: C.pink });
  text(s, 'V1.x  내용 추가·수정마다 소수점 버전 +0.1 (V1.1 → V1.2 → …)\nV2.0  문서 구조를 크게 바꿀 때 앞자리 올림. 최신 버전이 표 맨 위', 0.85, 4.0, 11.5, 0.55, { size: 12, ls: 1.25 });
}

function toc(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, 'CONTENTS', '목차');
  const cols = [
    ['01', '개요', 'toc_overview', C.yellow, ['1.1  원페이지 기획서']],
    ['02', '월드 · 맵', 'toc_world', C.slime, ['2.1  맵 구성', '2.2  맵 이동 구조', '2.3  진행 흐름 · 엔딩']],
    ['03', '성장 시스템', 'toc_growth', C.pink, ['3.1  성장 구조', '3.2  이동 스킬 (보스 보상)', '3.3  전투 스킬 (탐험 보상)']],
  ];
  const cw = 3.85, gap = 0.29;
  cols.forEach(([n, t, key, col, items], i) => {
    const x = 0.6 + i * (cw + gap), y = 1.7;
    card(s, x, y, cw, 4.95, C.white);
    s.addShape('roundRect', { x: x + 0.2, y: y + 0.2, w: cw - 0.4, h: 1.75, rectRadius: 0.1, fill: { color: col }, line: { color: C.ink, width: 1.25 } });
    popText(s, n, x + 0.42, y + 0.35, 1.5, 0.9, 48, C.ink, C.white, 0.05);
    picto(s, P, key, x + cw - 1.45, y + 0.42, 1.05);
    text(s, t, x + 0.42, y + 1.27, 3, 0.5, { head: true, size: 22, valign: 'middle', ls: 1 });
    text(s, items.join('\n'), x + 0.42, y + 2.3, cw - 0.7, 2.4, { size: 13, ls: 1.9 });
  });
}

function divider(pres, P, n, title, items, key, art) {
  const s = pres.addSlide({ masterName: 'DARK' });
  popText(s, n, 0.9, 1.35, 3, 1.6, 110, C.yellow, C.pink, 0.09);
  picto(s, P, key, 3.25, 1.75, 0.95);
  text(s, title, 0.95, 3.15, 6, 0.8, { head: true, size: 40, color: C.white, valign: 'middle', ls: 1 });
  text(s, items.join('\n'), 0.98, 4.2, 5.5, 1.8, { size: 14, color: 'D9DED8', ls: 1.9 });
  card(s, 7.3, 1.05, 5.2, 5.4, C.paper, { sh: 7, lw: 2.5 });
  art(s);
}

function onePage(pres, P, A) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '01 개요', '1.1 원페이지 기획서');
  // 한 줄 요약
  card(s, 0.6, 1.55, 12.13, 0.62, C.ink, { sh: 3 });
  pill(s, '한 줄 요약', 0.8, 1.71, 1.25, C.yellow);
  text(s, '쓰레기로 무장한 하수구 꼬마쥐가 보스를 쓰러뜨리며 전설의 명검을 찾아 도시를 누비는 팝아트 액션 메트로배니아', 2.25, 1.55, 10.3, 0.62, { size: 13, color: C.white, bold: true, valign: 'middle' });

  // 기본 정보
  const x1 = 0.6, y1 = 2.42, w1 = 5.55;
  card(s, x1, y1, w1, 2.42, C.white, { sh: 3 });
  text(s, '기본 정보', x1 + 0.2, y1 + 0.12, 3, 0.3, { size: 13, bold: true, color: C.pink });
  const info = [
    ['장르', '2D 횡스크롤 액션 메트로배니아'],
    ['플랫폼', 'PC (웹 프로토 → 유니티 본편)'],
    ['타겟 유저', '할로우 나이트·실크송류 탐험 액션 유저'],
    ['플레이 목표', '보스마다 명검 부품 1개, 모두 모아 명검 완성'],
    ['레퍼런스', '할로우 나이트, 카타나 제로, 산나비(사슬팔)'],
  ];
  s.addTable(info.map(([k, v]) => [
    { text: k, options: { bold: true, fill: { color: 'EDEFE8' }, align: 'center' } },
    { text: v },
  ]), {
    x: x1 + 0.2, y: y1 + 0.5, w: w1 - 0.4, colW: [1.35, w1 - 1.75], fontFace: BODY, fontSize: 11.5, color: C.ink,
    border: { type: 'solid', pt: 0.75, color: C.line }, valign: 'middle', margin: [0.03, 0.1, 0.03, 0.1], rowH: 0.35,
  });

  // 게임 특징
  const x2 = 6.4, w2 = 6.33;
  card(s, x2, y1, w2, 2.42, C.white, { sh: 3 });
  text(s, '게임 특징', x2 + 0.2, y1 + 0.12, 3, 0.3, { size: 13, bold: true, color: C.pink });
  const feats = [
    ['feat_slash', '베는 손맛', '몸을 감아 도는 3타 베기, 히트스톱, 팝아트 타격 연출'],
    ['feat_route', '고르는 길', '보스를 잡을 때마다 이동 스킬을 골라 다음 지역 결정 (12가지 경로)'],
    ['feat_rat', '쥐의 눈으로 본 도시', '병뚜껑 견갑·파이프 검. 인간의 쓰레기가 쥐에겐 보물'],
  ];
  feats.forEach(([k, t, d], i) => {
    const y = y1 + 0.52 + i * 0.62;
    picto(s, P, k, x2 + 0.22, y, 0.52);
    text(s, t, x2 + 0.9, y + 0.0, 4.5, 0.26, { size: 12.5, bold: true });
    text(s, d, x2 + 0.9, y + 0.26, w2 - 1.1, 0.26, { size: 11, color: C.mute });
  });

  // 비주얼 컨셉
  const y3 = 5.07, h3 = 1.8;
  card(s, x1, y3, w1, h3, C.white, { sh: 3 });
  text(s, '비주얼 컨셉', x1 + 0.2, y3 + 0.12, 3, 0.3, { size: 13, bold: true, color: C.pink });
  s.addImage({ data: A.hero, x: x1 + 0.3, y: y3 + 0.48, w: 0.85, h: 1.25, sizing: { type: 'contain', w: 0.85, h: 1.25 } });
  s.addImage({ data: A.sewer, x: x1 + 1.35, y: y3 + 0.5, w: 2.0, h: 1.125 });
  s.addShape('rect', { x: x1 + 1.35, y: y3 + 0.5, w: 2.0, h: 1.125, fill: { type: 'none' }, line: { color: C.ink, width: 1.25 } });
  text(s, '그림체 = 픽셀\n감성 = 팝아트\n\n플랫 원본 → 코드로\n명암·망점·도트화', x1 + 3.5, y3 + 0.48, 1.95, 1.25, { size: 11, ls: 1.15 });

  // 핵심 루프
  card(s, x2, y3, w2, h3, C.white, { sh: 3 });
  text(s, '핵심 루프', x2 + 0.2, y3 + 0.12, 3, 0.3, { size: 13, bold: true, color: C.pink });
  const loop = [['loop_explore', '탐험', '전투 스킬 발견'], ['loop_boss', '보스 처치', '명검 부품 획득'], ['loop_skill', '이동 스킬', '보스 보상 선택'], ['loop_map', '새 지역', '막힌 길 개방']];
  loop.forEach(([k, t, d], i) => {
    const x = x2 + 0.3 + i * 1.53;
    picto(s, P, k, x + 0.28, y3 + 0.45, 0.62);
    text(s, t, x - 0.05, y3 + 1.1, 1.25, 0.26, { size: 12, bold: true, align: 'center' });
    text(s, d, x - 0.1, y3 + 1.36, 1.35, 0.24, { size: 10, color: C.mute, align: 'center' });
    if (i < 3) arrow(s, x + 1.0, y3 + 0.76, x + 1.71, y3 + 0.76, C.ink, { width: 2 });
  });
  text(s, '↺ 반복', x2 + w2 - 0.95, y3 + 0.12, 0.75, 0.3, { size: 10.5, bold: true, color: C.mute, align: 'right' });
}

const MAPS = [
  { n: 0, name: '하수구 쥐 마을', key: 'map0', role: '시작 맵', desc: '쥐들이 모여 사는 하수구 마을. 시작 보스를 잡고 첫 이동 스킬 선택', entry: '시작' },
  { n: 1, name: '번화가 뒷골목', key: 'map1', role: '초반 지역', desc: '네온 간판·전선·배관 고리가 얽힌 좁은 골목', entry: 'c' },
  { n: 2, name: '도심 하천과 공원', key: 'map2', role: '초반 지역', desc: '배수구에서 흘러나온 하천과 물에 잠긴 공원', entry: 'b' },
  { n: 3, name: '버려진 아파트 단지', key: 'map3', role: '초반 지역', desc: '높은 외벽과 무너진 계단이 이어진 빈 아파트', entry: 'a' },
  { n: 4, name: '버려진 지하철역', key: 'map4', role: '후반 지역', desc: '끊어진 선로와 깊은 터널, 거대한 간격', entry: 'd' },
  { n: 5, name: '도시 외곽 뒷산', key: 'map5', role: '후반 지역', desc: '절벽과 상승기류가 부는 높은 산비탈', entry: 'e' },
];

function mapsSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '02 월드 · 맵', '2.1 맵 구성');
  const cw = 3.85, ch = 2.25, gx = 0.29, gy = 0.3;
  MAPS.forEach((m, i) => {
    const x = 0.6 + (i % 3) * (cw + gx), y = 1.6 + Math.floor(i / 3) * (ch + gy);
    card(s, x, y, cw, ch, C.white);
    picto(s, P, m.key, x + 0.22, y + 0.25, 0.95);
    popText(s, String(m.n), x + cw - 0.85, y + 0.12, 0.7, 0.75, 40, C.ink, m.n === 0 ? C.concrete : m.n <= 3 ? C.slime : C.purple, 0.04, 'right');
    pill(s, m.role, x + 1.35, y + 0.3, 1.15, m.n === 0 ? C.concrete : m.n <= 3 ? C.slime : 'D9C4FF', { h: 0.27, size: 10 });
    text(s, m.name, x + 1.35, y + 0.68, 2.4, 0.4, { head: true, size: 18, valign: 'middle', ls: 1 });
    text(s, m.desc, x + 0.25, y + 1.38, cw - 0.5, 0.5, { size: 11.5, ls: 1.2 });
    if (m.entry === '시작') {
      text(s, '게임 시작 지점 · 이후 되돌아올 수 없음', x + 0.25, y + 1.9, cw - 0.5, 0.28, { size: 10.5, color: C.mute, bold: true });
    } else {
      pill(s, `${m.entry} ${ABNAME[m.entry]}`, x + 0.25, y + 1.88, 1.45, AB[m.entry], { h: 0.28, size: 10, color: ['d', 'e'].includes(m.entry) ? C.white : C.ink });
      text(s, m.n <= 3 ? '0번 맵에서 진입' : '초반 지역에서 진입', x + 1.82, y + 1.88, 1.9, 0.28, { size: 10.5, color: C.mute, valign: 'middle' });
    }
  });
  text(s, '맵 이름·테마는 가안. 1·2·3의 보스 역할(스토리 보스 / 진엔딩 보스)은 고정이 아니라 플레이 진행 순서로 정해짐', 0.6, 6.62, 12, 0.28, { size: 10.5, color: C.mute });
}

function routeSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '02 월드 · 맵', '2.2 맵 이동 구조');
  // 다이어그램 판
  card(s, 0.6, 1.55, 8.15, 5.35, C.white);
  const R = 0.46;
  const N = {
    0: { x: 1.45, y: 4.2, r: R }, 2: { x: 3.6, y: 4.2, r: R }, 1: { x: 5.35, y: 2.65, r: R },
    3: { x: 5.35, y: 5.75, r: R }, 4: { x: 7.75, y: 2.65, r: R }, 5: { x: 7.75, y: 5.75, r: R },
  };
  // 초반 지역 묶음
  s.addShape('roundRect', { x: 2.75, y: 1.8, w: 3.45, h: 4.88, rectRadius: 0.2, fill: { color: 'F2FBE3' }, line: { color: C.ink, width: 1.25, dashType: 'dash' } });
  text(s, '초반 지역', 2.92, 1.88, 1.5, 0.28, { size: 11, bold: true, color: '3F6B10' });
  s.addShape('roundRect', { x: 7.05, y: 1.8, w: 1.42, h: 4.88, rectRadius: 0.2, fill: { color: 'F1EBFF' }, line: { color: C.ink, width: 1.25, dashType: 'dash' } });
  text(s, '후반 지역', 7.05, 1.88, 1.42, 0.28, { size: 11, bold: true, color: '5B2DB3', align: 'center' });

  // 연결
  link(s, N[0], N[1], AB.c, { width: 3.5 });
  link(s, N[0], N[2], AB.b, { width: 3.5 });
  link(s, N[0], N[3], AB.a, { width: 3.5 });
  link(s, N[1], N[2], AB.a, { width: 3.5, both: true });
  link(s, N[1], N[3], AB.b, { width: 3.5, both: true });
  link(s, N[2], N[3], AB.c, { width: 3.5, both: true });
  // 초반 → 후반 (대표 화살표)
  arrow(s, 6.2, 2.42, 7.05, 2.42, AB.d, { width: 4.5 });
  arrow(s, 6.2, 5.98, 7.05, 5.98, AB.e, { width: 4.5 });
  // 후반 ↔ 후반, 후반 → 초반 귀환
  link(s, N[4], N[5], C.mute, { width: 2.5, both: true, dash: 'dash' });
  arrow(s, 7.05, 4.2, 6.2, 4.2, C.mute, { width: 2.5, dash: 'dash' });

  // 노드
  Object.entries(N).forEach(([k, n]) => {
    s.addShape('ellipse', { x: n.x - R, y: n.y - R, w: 2 * R, h: 2 * R, fill: { color: C.white }, line: { color: C.ink, width: 2 }, shadow: shadow(3) });
    picto(s, P, 'map' + k, n.x - R + 0.04, n.y - R + 0.04, 2 * R - 0.08);
    s.addShape('ellipse', { x: n.x + R - 0.32, y: n.y - R - 0.08, w: 0.36, h: 0.36, fill: { color: C.ink }, line: { color: C.white, width: 1 } });
    text(s, k, n.x + R - 0.32, n.y - R - 0.08, 0.36, 0.36, { size: 12, bold: true, color: C.white, align: 'center', valign: 'middle' });
    const m = MAPS[+k];
    const lw = m.name.length * 0.15 + 0.2;
    s.addShape('roundRect', { x: n.x - lw / 2, y: n.y + R + 0.05, w: lw, h: 0.25, rectRadius: 0.06, fill: { color: C.white }, line: { type: 'none' } });
    text(s, m.name, n.x - 0.9, n.y + R + 0.05, 1.8, 0.25, { size: 9.5, bold: true, align: 'center', valign: 'middle' });
  });

  // 길 위 능력 표시
  const tag = (t, x, y, col, white) => {
    s.addShape('ellipse', { x: x - 0.17, y: y - 0.17, w: 0.34, h: 0.34, fill: { color: col }, line: { color: C.ink, width: 1.25 } });
    text(s, t, x - 0.17, y - 0.17, 0.34, 0.34, { size: 11, bold: true, align: 'center', valign: 'middle', color: white ? C.white : C.ink });
  };
  tag('c', 3.15, 3.1, AB.c); tag('b', 2.55, 4.2, AB.b); tag('a', 3.15, 5.3, AB.a);
  tag('a', 4.48, 3.42, AB.a); tag('b', 5.35, 4.2, AB.b); tag('c', 4.48, 4.98, AB.c);
  tag('d', 6.62, 2.42, AB.d, true); tag('e', 6.62, 5.98, AB.e, true);
  text(s, '자유 귀환', 6.2, 3.83, 0.85, 0.25, { size: 9, bold: true, color: C.mute, align: 'center' });
  text(s, '자유 왕복', 7.8, 4.08, 0.65, 0.25, { size: 9, bold: true, color: C.mute });

  // 오른쪽: 범례 + 규칙
  const rx = 9.0, rw = 3.73;
  card(s, rx, 1.55, rw, 2.62, C.white, { sh: 3 });
  text(s, '길을 여는 이동 스킬', rx + 0.2, 1.67, 3, 0.3, { size: 13, bold: true, color: C.pink });
  ['a', 'b', 'c', 'd', 'e'].forEach((k, i) => {
    const y = 2.05 + i * 0.41;
    picto(s, P, 'ab_' + k, rx + 0.2, y, 0.36);
    text(s, `${k}  ${ABNAME[k]}`, rx + 0.68, y, 1.8, 0.36, { size: 11.5, bold: true, valign: 'middle' });
    text(s, k <= 'c' ? '1티어 · 초반 이동' : '2티어 · 후반 진입', rx + 2.1, y, 1.5, 0.36, { size: 10, color: C.mute, valign: 'middle' });
  });
  card(s, rx, 4.4, rw, 2.5, C.white, { sh: 3 });
  text(s, '이동 규칙', rx + 0.2, 4.52, 3, 0.3, { size: 13, bold: true, color: C.pink });
  text(s, [
    { text: '0 → 1·2·3 단방향. 0으로는 돌아오지 않음', options: { bullet: true, breakLine: true } },
    { text: '1·2·3 사이는 같은 스킬로 양방향', options: { bullet: true, breakLine: true } },
    { text: '1·2·3 어디서든 d → 4, e → 5', options: { bullet: true, breakLine: true } },
    { text: '4 ↔ 5, 4·5 → 1·2·3은 스킬 없이 이동', options: { bullet: true, breakLine: true } },
    { text: '남은 초반 맵 1곳은 4·5에 처음 들어갈 때까지 스토리 잠금', options: { bullet: true } },
  ], rx + 0.2, 4.88, rw - 0.35, 1.95, { size: 11, ls: 1.15, psa: 4 });
}

function flowSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '02 월드 · 맵', '2.3 진행 흐름 · 엔딩');
  const steps = [
    ['loop_boss', '0 · 시작 맵', '시작 보스 처치', '1티어 a·b·c 중 1개 선택', C.concrete],
    ['loop_boss', '첫 번째 초반 맵', '스토리 보스 처치', '남은 1티어 1개 선택\n→ 두 번째 맵·진엔딩 지역 확정', C.slime],
    ['loop_boss', '두 번째 초반 맵', '스토리 보스 처치', '2티어 d·e 중 1개 선택', C.slime],
    ['loop_skill', '4 또는 5', '후반 지역 첫 진입', '남은 초반 맵 잠금 영구 해제', 'D9C4FF'],
    ['end_normal', '4 · 5 · 전 지역', '노말 엔딩 + 전 맵 탐험', '두 조건 모두 충족 시\n진엔딩 보스 개방', 'D9C4FF'],
    ['end_true', '남겨 둔 초반 맵', '진엔딩 보스 처치', '진엔딩 · 명검 완성', C.pink],
  ];
  const cw = 1.86, gap = 0.195;
  steps.forEach(([k, where, ev, res, col], i) => {
    const x = 0.6 + i * (cw + gap), y = 1.6;
    card(s, x, y, cw, 2.75, C.white);
    s.addShape('roundRect', { x: x + 0.12, y: y + 0.12, w: cw - 0.24, h: 0.32, rectRadius: 0.08, fill: { color: col }, line: { color: C.ink, width: 1 } });
    text(s, `STEP ${i + 1}`, x + 0.12, y + 0.12, cw - 0.24, 0.32, { size: 10.5, bold: true, align: 'center', valign: 'middle', color: i === 5 ? C.white : C.ink });
    picto(s, P, k, x + (cw - 0.7) / 2, y + 0.58, 0.7);
    text(s, where, x + 0.1, y + 1.36, cw - 0.2, 0.25, { size: 10, color: C.mute, align: 'center', bold: true });
    text(s, ev, x + 0.1, y + 1.6, cw - 0.2, 0.3, { size: 12, bold: true, align: 'center' });
    text(s, res, x + 0.1, y + 1.95, cw - 0.2, 0.7, { size: 10.5, align: 'center', ls: 1.15 });
    if (i < 5) arrow(s, x + cw + 0.01, y + 0.93, x + cw + gap - 0.01, y + 0.93, C.ink, { width: 2 });
  });

  // 예시 경로
  const ey = 4.6;
  card(s, 0.6, ey, 6.4, 2.3, C.white, { sh: 3 });
  text(s, '예시: c → a → d 선택', 0.8, ey + 0.12, 4, 0.3, { size: 13, bold: true, color: C.pink });
  const ex = [['0', C.concrete], ['1', C.slime], ['2', C.slime], ['4', 'D9C4FF']];
  const via = [['c', AB.c], ['a', AB.a], ['d', AB.d]];
  ex.forEach(([n, col], i) => {
    const x = 0.9 + i * 1.3;
    s.addShape('ellipse', { x, y: ey + 0.6, w: 0.7, h: 0.7, fill: { color: col }, line: { color: C.ink, width: 1.75 } });
    text(s, n, x, ey + 0.6, 0.7, 0.7, { head: true, size: 22, align: 'center', valign: 'middle', ls: 1 });
    if (i < 3) {
      arrow(s, x + 0.76, ey + 0.95, x + 1.24, ey + 0.95, via[i][1], { width: 3.5 });
      text(s, via[i][0], x + 0.8, ey + 0.58, 0.4, 0.3, { size: 12, bold: true, align: 'center', color: C.ink });
    }
  });
  s.addShape('line', { x: 5.72, y: ey + 0.55, w: 0, h: 0.8, line: { color: C.line, width: 1.25 } });
  picto(s, P, 'lock', 5.95, ey + 0.6, 0.7);
  text(s, '3번 맵 잠김', 5.6, ey + 1.32, 1.4, 0.25, { size: 10, bold: true, align: 'center', color: C.mute });
  text(s, '4 첫 진입 → 3번 잠금 해제 → 전 지역 탐험 → 노말 엔딩 → 3번 맵에서 진엔딩 보스\n1티어 순서 6가지 × 2티어 2가지 = 12가지 진행 경로', 0.8, ey + 1.62, 6.1, 0.6, { size: 11, ls: 1.25 });

  // 엔딩 조건
  const qx = 7.25, qw = 5.48;
  card(s, qx, ey, qw, 2.3, C.ink, { sh: 3 });
  text(s, '엔딩 조건', qx + 0.2, ey + 0.12, 3, 0.3, { size: 13, bold: true, color: C.yellow });
  const box = (k, t, x) => {
    s.addShape('roundRect', { x, y: ey + 0.55, w: 1.3, h: 1.25, rectRadius: 0.1, fill: { color: C.white }, line: { color: C.ink, width: 1 } });
    picto(s, P, k, x + 0.33, ey + 0.63, 0.64);
    text(s, t, x + 0.05, ey + 1.3, 1.2, 0.45, { size: 10, bold: true, align: 'center', ls: 1.05 });
  };
  box('end_normal', '노말 엔딩\n(4 또는 5)', qx + 0.25);
  text(s, '+', qx + 1.58, ey + 0.8, 0.4, 0.6, { head: true, size: 30, color: C.yellow, align: 'center', valign: 'middle' });
  box('explore_all', '1~5 맵\n탐험 완료', qx + 2.0);
  text(s, '=', qx + 3.33, ey + 0.8, 0.4, 0.6, { head: true, size: 30, color: C.yellow, align: 'center', valign: 'middle' });
  box('end_true', '진엔딩 보스\n도전 가능', qx + 3.78);
  text(s, '맵 0과 진엔딩 보스 처치는 탐험 완료 조건에서 제외', qx + 0.25, ey + 1.92, qw - 0.4, 0.28, { size: 10, color: 'C9CFD6' });
}

function growthSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '03 성장 시스템', '3.1 성장 구조');
  const cols = [
    { k: 'loop_boss', t: '이동 스킬', sub: '보스 처치 보상', col: C.slime, lines: ['보스를 잡으면 이동 스킬 선택', '다른 지역으로 넘어가는 열쇠', '최종 보유 3개 (1티어 2, 2티어 1)', '명검 부품 1개 함께 획득'] },
    { k: 'loop_explore', t: '전투 스킬', sub: '탐험 보상', col: C.yellow, lines: ['숨은 방·보물 상자·탐험 목표에서 발견', '새 공격 기술과 연계 추가', '전투 방식을 넓히는 보상', '길을 막는 조건으로는 쓰지 않음'] },
    { k: 'stat', t: '스탯 성장', sub: '제외', col: C.concrete, lines: ['레벨·경험치(치즈) 제외', '공격력·체력 능력치 노드 제외', '성장은 수치가 아니라', '할 수 있는 행동으로 표현'] },
  ];
  const cw = 3.85, gap = 0.29;
  cols.forEach((c, i) => {
    const x = 0.6 + i * (cw + gap), y = 1.6, out = i === 2;
    card(s, x, y, cw, 4.25, out ? 'E7EAE4' : C.white);
    s.addShape('roundRect', { x: x + 0.2, y: y + 0.2, w: cw - 0.4, h: 1.45, rectRadius: 0.1, fill: { color: c.col }, line: { color: C.ink, width: 1.25 } });
    picto(s, P, c.k, x + 0.4, y + 0.38, 1.1);
    text(s, c.t, x + 1.7, y + 0.42, 2, 0.5, { head: true, size: 24, valign: 'middle', ls: 1 });
    pill(s, c.sub, x + 1.72, y + 0.98, 1.6, out ? C.ink : C.white, { h: 0.3, size: 10.5, color: out ? C.white : C.ink });
    text(s, c.lines.map((l, j) => ({ text: l, options: { bullet: true, breakLine: j < c.lines.length - 1 } })), x + 0.3, y + 1.95, cw - 0.55, 2.1, { size: 12.5, ls: 1.2, psa: 8, color: out ? C.mute : C.ink });
    if (out) {
      // 팝아트 X 도장
      s.addShape('line', { x: x + 0.45, y: y + 0.35, w: 1.05, h: 1.15, line: { color: C.red, width: 7 } });
      s.addShape('line', { x: x + 0.45, y: y + 0.35, w: 1.05, h: 1.15, flipH: true, line: { color: C.red, width: 7 } });
    }
  });
  card(s, 0.6, 6.12, 12.13, 0.72, C.ink, { sh: 3 });
  picto(s, P, 'sword_part', 0.78, 6.2, 0.56);
  text(s, '성장 원칙  보스 = 갈 수 있는 곳이 넓어짐 · 탐험 = 싸우는 방법이 늘어남 · 모든 보스의 명검 부품을 모아 전설의 명검 완성', 1.5, 6.12, 11.1, 0.72, { size: 13, bold: true, color: C.white, valign: 'middle' });
}

function moveSkillSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '03 성장 시스템', '3.2 이동 스킬 (보스 보상)');
  const SK = [
    ['a', '벽타기', '벽을 이용한 수직 이동', '지정된 거친 벽을 붙잡고 오르기. 벽 점프 포함'],
    ['b', '수영·잠수', '수중 통로 탐험', '수면 이동은 기본, 획득 시 잠수와 빠른 유영 해금'],
    ['c', '사슬팔', '고리 사이 이동·스윙', '가까운 고리 자동 조준. 매달리기·당기기·놓기로 단순 조작'],
    ['d', '대포알 탑승', '거대한 간격·높이 돌파', '맵에 설치된 대포에 들어가 조준 후 발사'],
    ['e', '낙하산', '높은 곳에서 긴 활강', '완만한 하강과 방향 조절. 상승기류로 고도 확보'],
  ];
  const cw = 2.27, gap = 0.195;
  SK.forEach(([k, name, role, desc], i) => {
    const x = 0.6 + i * (cw + gap), y = 1.6, t2 = k > 'c';
    card(s, x, y, cw, 3.55, C.white);
    s.addShape('roundRect', { x: x + 0.15, y: y + 0.15, w: cw - 0.3, h: 1.5, rectRadius: 0.1, fill: { color: AB[k] }, line: { color: C.ink, width: 1.25 } });
    picto(s, P, 'ab_' + k, x + (cw - 1.2) / 2, y + 0.3, 1.2);
    pill(s, t2 ? '2티어' : '1티어', x + 0.15, y + 1.8, 0.75, t2 ? C.ink : C.white, { h: 0.27, size: 10, color: t2 ? C.white : C.ink });
    text(s, k, x + cw - 0.5, y + 1.76, 0.35, 0.34, { head: true, size: 18, align: 'right', valign: 'middle', color: AB[k], ls: 1 });
    text(s, name, x + 0.15, y + 2.15, cw - 0.3, 0.38, { head: true, size: 17, valign: 'middle', ls: 1 });
    text(s, role, x + 0.15, y + 2.55, cw - 0.3, 0.27, { size: 11, bold: true, color: C.pink });
    text(s, desc, x + 0.15, y + 2.83, cw - 0.3, 0.65, { size: 10.5, ls: 1.15 });
  });
  // 획득 규칙
  const y = 5.4;
  card(s, 0.6, y, 12.13, 1.5, C.white, { sh: 3 });
  text(s, '획득 규칙', 0.8, y + 0.12, 3, 0.3, { size: 13, bold: true, color: C.pink });
  const rules = [
    ['loop_boss', '보스를 잡아야만 획득', '시작 보스 → 1티어 · 초반 보스 1 → 1티어 · 초반 보스 2 → 2티어'],
    ['feat_route', '고른 스킬이 길을 정함', '1티어는 a·b·c 중 서로 다른 2개, 2티어는 d·e 중 1개만'],
    ['loop_skill', '한 번 얻으면 계속 보유', '이동해도 소모되지 않음. 재방문 추가 획득 없음'],
  ];
  rules.forEach(([k, t, d], i) => {
    const x = 0.8 + i * 4.02;
    picto(s, P, k, x, y + 0.55, 0.6);
    text(s, t, x + 0.72, y + 0.52, 3.15, 0.3, { size: 12, bold: true });
    text(s, d, x + 0.72, y + 0.82, 3.15, 0.55, { size: 10.5, color: C.mute, ls: 1.15 });
  });
}

function combatSkillSlide(pres, P) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  head(s, '03 성장 시스템', '3.3 전투 스킬 (탐험 보상)');
  // 기본기
  card(s, 0.6, 1.6, 4.1, 3.6, C.white);
  pill(s, '처음부터 사용', 0.8, 1.78, 1.55, C.concrete);
  const base = [['cb_combo', '3타 베기', '올려 베기 → 뒤돌기 → 회전 베기 루프'], ['cb_spin', '공중 회전 베기', '공중에서 몸을 말아 세로 한 바퀴'], ['cb_dash', '대시', '예비 동작 없이 튀어 나감. 공중 1회']];
  base.forEach(([k, t, d], i) => {
    const y = 2.3 + i * 0.95;
    picto(s, P, k, 0.85, y, 0.7);
    text(s, t, 1.7, y + 0.06, 2.9, 0.3, { size: 13, bold: true });
    text(s, d, 1.7, y + 0.37, 2.9, 0.3, { size: 10.5, color: C.mute });
  });
  arrow(s, 4.78, 3.4, 5.22, 3.4, C.ink, { width: 3 });

  // 탐험으로 발견
  card(s, 5.3, 1.6, 7.43, 3.6, C.white);
  pill(s, '탐험으로 발견', 5.5, 1.78, 1.55, C.yellow);
  const found = [['cb_plunge', '내려찍기', '공중 ↓ + 공격. 발밑으로 꽂고 충격파'], ['cb_charge', '충전 돌진', '길게 눌러 모았다 섬광과 함께 돌진 베기'], [null, '추가 기술', '지역마다 1~2개 배치 예정']];
  found.forEach(([k, t, d], i) => {
    const x = 5.5 + i * 2.37, y = 2.3;
    s.addShape('roundRect', { x, y, w: 2.2, h: 2.7, rectRadius: 0.1, fill: { color: k ? 'FFF6D6' : 'EEF0EA' }, line: { color: C.ink, width: 1, dashType: k ? 'solid' : 'dash' } });
    if (k) picto(s, P, k, x + 0.6, y + 0.2, 1.0);
    else {
      s.addShape('ellipse', { x: x + 0.6, y: y + 0.2, w: 1.0, h: 1.0, fill: { color: C.white }, line: { color: C.ink, width: 2, dashType: 'dash' } });
      text(s, '?', x + 0.6, y + 0.2, 1.0, 1.0, { head: true, size: 36, align: 'center', valign: 'middle', color: C.mute, ls: 1 });
    }
    text(s, t, x + 0.1, y + 1.35, 2.0, 0.35, { size: 13.5, bold: true, align: 'center' });
    text(s, d, x + 0.15, y + 1.72, 1.9, 0.8, { size: 10.5, align: 'center', color: C.mute, ls: 1.15 });
  });

  // 어디서 얻나 + 원칙
  const y = 5.42;
  card(s, 0.6, y, 12.13, 1.48, C.white, { sh: 3 });
  const where = [
    ['secret', '숨은 방', '부서지는 벽·좁은 틈 너머'],
    ['chest', '보물 상자', '이동 스킬로 닿는 외진 곳'],
    ['explore_all', '탐험 목표', '맵별 탐험 목표 달성 보상'],
  ];
  where.forEach(([k, t, d], i) => {
    const x = 0.8 + i * 2.75;
    picto(s, P, k, x, y + 0.42, 0.62);
    text(s, t, x + 0.75, y + 0.42, 1.9, 0.3, { size: 12.5, bold: true });
    text(s, d, x + 0.75, y + 0.72, 1.95, 0.5, { size: 10.5, color: C.mute, ls: 1.1 });
  });
  text(s, '획득 장소', 0.8, y + 0.1, 3, 0.28, { size: 12, bold: true, color: C.pink });
  s.addShape('line', { x: 9.0, y: y + 0.2, w: 0, h: 1.08, line: { color: C.line, width: 1.25 } });
  text(s, '원칙', 9.2, y + 0.1, 3, 0.28, { size: 12, bold: true, color: C.pink });
  text(s, '전투 스킬은 길을 막지 않음. 맵 잠금은 이동 스킬만 담당하고, 전투 스킬은 싸우는 방법을 넓히는 선택 보상', 9.2, y + 0.42, 3.4, 0.95, { size: 11, ls: 1.2 });
}

async function main() {
  const A = await prepAssets();
  const P = await loadPictos();
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = `기사쥐 컨셉 기획서 ${VERSION}`;
  pres.author = AUTHOR;
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
  defineLayouts(pres, A);

  cover(pres, A);
  versions(pres);
  toc(pres, P);
  divider(pres, P, '01', '개요', ['1.1  원페이지 기획서'], 'toc_overview', (s) => {
    s.addImage({ data: A.hero, x: 8.5, y: 1.35, w: 2.8, h: 4.8, sizing: { type: 'contain', w: 2.8, h: 4.8 } });
  });
  onePage(pres, P, A);
  divider(pres, P, '02', '월드 · 맵', ['2.1  맵 구성', '2.2  맵 이동 구조', '2.3  진행 흐름 · 엔딩'], 'toc_world', (s) => {
    s.addImage({ data: A.sewer, x: 7.55, y: 1.3, w: 4.7, h: 2.64 });
    s.addImage({ data: A.city, x: 7.55, y: 3.6, w: 4.7, h: 2.64 });
    s.addShape('rect', { x: 7.55, y: 1.3, w: 4.7, h: 4.94, fill: { type: 'none' }, line: { color: C.ink, width: 1.5 } });
  });
  mapsSlide(pres, P);
  routeSlide(pres, P);
  flowSlide(pres, P);
  divider(pres, P, '03', '성장 시스템', ['3.1  성장 구조', '3.2  이동 스킬 (보스 보상)', '3.3  전투 스킬 (탐험 보상)'], 'toc_growth', (s) => {
    s.addImage({ data: A.centi, x: 7.65, y: 1.3, w: 4.5, h: 2.0, sizing: { type: 'contain', w: 4.5, h: 2.0 } });
    s.addImage({ data: A.toad, x: 8.8, y: 3.55, w: 2.7, h: 2.7, sizing: { type: 'contain', w: 2.7, h: 2.7 } });
  });
  growthSlide(pres, P);
  moveSkillSlide(pres, P);
  combatSkillSlide(pres, P);

  await pres.writeFile({ fileName: OUT });
  const codex = Object.values(P).filter((p) => p.codex).length;
  console.log(`저장: ${OUT}\n픽토그램: Codex ${codex} / 자동 ${Object.keys(P).length - codex}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

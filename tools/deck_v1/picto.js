// 기획서 V1 픽토그램 목록과 배지 생성
//  - 기획서/picto/codex/<키>.png 가 있으면 그 그림(Codex 생성본)을 그대로 씀
//  - 없으면 game-icons(react-icons/gi) 아이콘으로 팝아트 배지를 만들어 기획서/picto/auto/<키>.png 에 저장
const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const gi = require('react-icons/gi');
const sharp = require('sharp');

const COL = {
  ink: '17131F', red: 'FF4A3D', green: '3DDC6A', sky: '4FD1FF', purple: 'A35CFF', blue: '2F6BFF',
  slime: 'B6F23A', pink: 'FF3D8B', yellow: 'FFD83A', orange: 'FF8A1F', concrete: 'C9D1C8', white: 'FFFFFF',
};

// 키: [아이콘, 배지 색, Codex 프롬프트용 설명]
const PICTOS = {
  toc_overview: ['GiScrollUnfurled', 'yellow', 'an unrolled parchment scroll (game overview document)'],
  toc_world: ['GiTreasureMap', 'slime', 'a folded treasure map with a dotted route'],
  toc_growth: ['GiSwordsPower', 'pink', 'a small sword glowing with power lines (character growth)'],
  ab_a: ['GiMountainClimbing', 'red', 'a tiny figure climbing a rough brick wall (wall climbing ability)'],
  ab_b: ['GiSwimfins', 'green', 'swim fins over water waves (swimming / diving ability)'],
  ab_c: ['GiGrapple', 'sky', 'a grappling hook on a chain (chain-arm swing ability)'],
  ab_d: ['GiHumanCannonball', 'purple', 'a figure shot out of a cannon (cannonball ride ability)'],
  ab_e: ['GiParachute', 'blue', 'an open parachute gliding down (parachute glide ability)'],
  map0: ['GiPipes', 'concrete', 'sewer pipes with a round drain (sewer rat village)'],
  map1: ['GiStreetLight', 'pink', 'a street lamp in a narrow downtown back alley'],
  map2: ['GiRiver', 'sky', 'a city river with a park bench'],
  map3: ['GiDamagedHouse', 'orange', 'an abandoned cracked apartment block'],
  map4: ['GiSubway', 'purple', 'an abandoned subway train'],
  map5: ['GiMountains', 'blue', 'hills on the outskirts of the city'],
  feat_slash: ['GiSwordSpin', 'yellow', 'a sword spinning with a slash arc'],
  feat_route: ['GiSplitArrows', 'slime', 'a path splitting into several arrows (choice of route)'],
  feat_rat: ['GiRat', 'concrete', 'a small rat seen from the side'],
  loop_explore: ['GiMagnifyingGlass', 'yellow', 'a magnifying glass (exploration)'],
  loop_boss: ['GiCrownedSkull', 'pink', 'a crowned skull (boss)'],
  loop_skill: ['GiPadlockOpen', 'slime', 'an open padlock (ability unlocks a new path)'],
  loop_map: ['GiTreasureMap', 'sky', 'a folded map (new region)'],
  lock: ['GiPadlock', 'concrete', 'a closed padlock'],
  end_normal: ['GiLevelEndFlag', 'yellow', 'a goal flag (normal ending)'],
  end_true: ['GiSwordInStone', 'pink', 'a legendary sword stuck in a stone (true ending)'],
  explore_all: ['GiFootprint', 'slime', 'small footprints (all regions explored)'],
  sword_part: ['GiSwordHilt', 'yellow', 'a sword hilt piece (legendary sword part)'],
  cheese: ['GiCheeseWedge', 'yellow', 'a cheese wedge (experience points)'],
  stat: ['GiMuscleUp', 'concrete', 'a flexing arm (stat increase)'],
  chest: ['GiOpenTreasureChest', 'orange', 'an open treasure chest'],
  secret: ['GiSecretDoor', 'purple', 'a hidden door in a wall'],
  cb_combo: ['GiSaberSlash', 'yellow', 'a three-hit slash combo arc'],
  cb_spin: ['GiSpinningSword', 'yellow', 'a sword spinning in the air'],
  cb_dash: ['GiFireDash', 'yellow', 'a quick dash with speed lines'],
  cb_plunge: ['GiHammerDrop', 'pink', 'a downward plunge strike hitting the ground'],
  cb_charge: ['GiSupersonicArrow', 'pink', 'a charged straight dash attack'],
};

const ROOT = path.resolve(__dirname, '../..');
const CODEX_DIR = path.join(ROOT, '기획서/picto/codex');
const AUTO_DIR = path.join(ROOT, '기획서/picto/auto');

function iconSvg(name, color) {
  const Icon = gi[name];
  if (!Icon) throw new Error('아이콘 없음: ' + name);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: '#' + color, size: 512 }));
}

// 원형 배지: 색 바탕 + 45도 망점 + 굵은 잉크 테두리 + 잉크 아이콘
async function badge(key) {
  const [icon, colorKey] = PICTOS[key];
  const fill = COL[colorKey];
  const S = 512, R = 236;
  let dots = '';
  for (let y = 0; y < S; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < S; x += 22) {
    const r = Math.max(0, 6.5 * (1 - (x + y) / (S * 1.25)));
    if (r > 0.6) dots += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="#ffffff" fill-opacity="0.55"/>`;
  }
  const inner = iconSvg(icon, COL.ink).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs><clipPath id="c"><circle cx="256" cy="256" r="${R}"/></clipPath></defs>
    <circle cx="256" cy="256" r="${R}" fill="#${fill}"/>
    <g clip-path="url(#c)">${dots}</g>
    <circle cx="256" cy="256" r="${R}" fill="none" stroke="#${COL.ink}" stroke-width="22"/>
    <g transform="translate(116 116) scale(0.546875)">${inner}</g>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// 키 → { data: 'image/png;base64,...', codex: bool }
async function loadPictos() {
  fs.mkdirSync(AUTO_DIR, { recursive: true });
  const out = {};
  for (const key of Object.keys(PICTOS)) {
    const codex = path.join(CODEX_DIR, key + '.png');
    let buf, fromCodex = false;
    if (fs.existsSync(codex)) {
      // 자홍 배경 키잉 후 512 정사각으로
      const { data, info } = await sharp(codex).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += 4) {
        const m = Math.min(data[i], data[i + 2]) - data[i + 1];
        if (m > 120) data[i + 3] = 0; else if (m > 60) data[i + 3] = Math.round(255 * (120 - m) / 60);
      }
      buf = await sharp(data, { raw: info }).trim().resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      fromCodex = true;
    } else {
      buf = await badge(key);
      fs.writeFileSync(path.join(AUTO_DIR, key + '.png'), buf);
    }
    out[key] = { data: 'image/png;base64,' + buf.toString('base64'), codex: fromCodex };
  }
  return out;
}

module.exports = { PICTOS, COL, loadPictos, iconSvg };

// Codex CLI로 기획서 픽토그램 생성 → docs/picto/codex/<키>.png
//   node gen_picto.js            (없는 것만 생성)
//   node gen_picto.js ab_a map3  (지정한 키만 다시 생성)
// CODEX 환경변수로 실행 명령 지정 가능 (기본: codex). 예) CODEX="bash C:/Project/NKK_PROJECT/Tools/codex.sh"
// 생성 뒤 node build.js 하면 자동 배지 대신 Codex 그림이 들어감
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PICTOS, COL } = require('./picto');

const ROOT = path.resolve(__dirname, '../..');
const DIR = path.join(ROOT, 'docs/picto/codex');
const CODEX = process.env.CODEX || 'codex';
const REF = path.join(ROOT, 'art/knight/v7/concept/hero.png');
fs.mkdirSync(DIR, { recursive: true });

const only = process.argv.slice(2);
const keys = only.length ? only : Object.keys(PICTOS).filter((k) => !fs.existsSync(path.join(DIR, k + '.png')));

for (const key of keys) {
  const [, colorKey, what] = PICTOS[key];
  const prompt = `Use your built-in image generation tool to create ONE image and save it as PNG to: ${key}.png (in the current working directory). Do not write code to draw it; it must be a generated illustration. After saving, reply only with the file name.

Attached: ref.png = the hero of our cute 2D pixel/pop-art action game (a tiny mouse knight living in a city sewer). Use it ONLY as the style reference.

Draw a single PICTOGRAM icon for a game design document: ${what}.
Style: bold pop-art badge. A perfect circle filled with flat color #${COL[colorKey]}, light Ben-Day halftone dots in the upper-left of the circle, a thick near-black (#${COL.ink}) outline ring, and the subject drawn as a simple near-black (#${COL.ink}) silhouette pictogram centered inside the circle (about 60% of the circle). Flat colors only, no gradients, no text, no letters, no numbers.
Background outside the circle: solid pure magenta #FF00FF (it will be keyed out). Square 1024x1024 canvas.`;
  fs.writeFileSync(path.join(DIR, `prompt_${key}.txt`), prompt);
  fs.copyFileSync(REF, path.join(DIR, 'ref.png'));
  console.log('생성:', key);
  try {
    execSync(`${CODEX} exec --skip-git-repo-check --sandbox workspace-write -i ref.png - < prompt_${key}.txt`, { cwd: DIR, stdio: 'inherit', shell: true });
  } catch (e) {
    console.error('실패:', key);
  }
}

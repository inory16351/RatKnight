// 현재 기획서 생성기. 기존 node tools/build_deck.js 명령 호환.
import('./build_deck.mjs').catch(error => { console.error(error); process.exitCode = 1; });

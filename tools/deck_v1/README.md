# 컨셉 기획서 V1 빌드

```
cd tools/deck_v1
npm install
node build.js          # → docs/컨셉 기획서 V1.x.pptx
node gen_picto.js      # (선택) Codex CLI로 픽토그램 생성 → docs/picto/codex/
```

- 버전 올리기: `build.js` 위쪽 `VERSION`·`DATE`를 바꾸고 `HISTORY` 맨 위에 한 줄 추가.
- 픽토그램: `docs/picto/codex/<키>.png`가 있으면 그 그림을, 없으면 game-icons 아이콘으로 만든 팝아트 배지(`docs/picto/auto/`)를 씀. 키 목록은 `picto.js`.
- 글꼴: 제목 Black Han Sans(`art/fonts/BlackHanSans-Regular.ttf`, OFL), 본문 Noto Sans KR. PC에 설치되어 있어야 슬라이드가 의도대로 보임.

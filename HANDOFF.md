# 기사쥐 (RatKnight) — 인수인계

마지막 갱신: 2026-10-28 21:30. 다음 에이전트가 바로 이어받을 수 있게 정리.

## 0. 꼭 지킬 규칙 (사용자 지시)
- NKK(찍!찍!!찍!!!) IP 확장 2D 액션. 순서 = 웹에서 모션·루프 확정 → 웹빌드 → 유니티 이식.
- **결정할 게 생기면 추측하지 말고 전부 선택지로 질문** (AskUserQuestion). 보스 패턴도 하나씩 질문해서 확정.
- **그림체 = 픽셀, 감성 = 팝아트** (2026-10-28 최종 정리). 그림은 플랫하게 생성 → 픽셀화는 코드(`pixelate`). 픽셀아트로 직접 뽑지 말 것.
- 세계관 = **현대 인간 도시에서 기사도의 낭만을 꿈꾸는 생쥐 기사**. 시작 = 밤의 뒷골목, 첫 보스 = 하수도의 왕 개굴대왕. (예전 부엌·시골 숲 설정은 폐기, 숲 그림은 `art/bg/forest/` 에 보관만)
- 기획서 어투 = 명사형 마무리, 폰트 Noto Sans KR, 작성자 정승운.
- 그림 생성 = Codex CLI (`bash C:/Project/NKK_PROJECT/Tools/codex.sh exec --skip-git-repo-check --sandbox workspace-write -i <참고.png> - < prompt.txt`), 자홍 #FF00FF 배경 → 키잉. 시트는 반드시 칸을 나눠서(물건이 붙으면 잘리지 않음).
- ChatGPT(앱 브라우저)는 CSP 때문에 그림을 파일로 못 옮김 → Codex 우선. 한도 걸리면 `tools/gen_queue.sh <HH:MM>` 로 풀리는 시각에 묶음 생성.
- **코드 실수 주의**: 한 줄짜리 객체/조건 중간에 `// 주석` 을 끼워 뒤 코드를 날린 사고가 4번 있었음. 주석은 줄 끝에만. 고친 뒤 `cp file.js $TMPDIR/x.mjs && node --check $TMPDIR/x.mjs` 로 ES 모듈 검사.

## 1. 실행 · 확인
```bash
node tools/serve.js     # http://localhost:5330/web/index.html?rig=v4
```
- Python = `C:/Project/underworld-proto/.venv/Scripts/python.exe -I` (numpy · Pillow · scipy).
- 콘솔 `__game`: `step(n)`(저장 없이 프레임 진행 — 테스트는 이걸로, `film` 반복은 느려서 타임아웃), `go({to, x})`, `loadRoom`, `G`(레벨·경험치), `E`(적), `BOSS`, `film(이름, setup, n, dt, 간격, [x,y,w,h])` → `docs/shots/이름.png`, `shot(...)`.
- 앱 브라우저 창이 작으면 캡처가 흐림 → `resize_window 1280x720` 후 캡처, 끝나면 desktop 으로.

## 2. 파일
| 경로 | 내용 |
|---|---|
| `web/src/main.js` | 게임 루프·입력·판정·방/테마 배경·적·치즈·레벨·쉼터·HUD·보스 연결 |
| `web/src/boss.js` | 개굴대왕: 패턴 상태 기계 + 컷아웃 리그(`RIG`, `TOAD.draw`), 사양은 파일 머리 주석 |
| `web/src/anim.js` | 자세·모션·공격표 `ATTACKS` (slash1~3, heavyC/2/3, air, plunge) |
| `web/src/fx.js` | 칼빛 리본·타격(적 반대쪽 터짐)·기 모으기·효과음 글자 등 |
| `web/src/rig.js` · `shade.js` | 기사쥐 리그(neckDrop 목 보정)·코드 셰이더 |
| `art/bg/city/` | 뒷골목: back · far · fg · floor(서는 선 200px) · obj/(쓰레기통·상자·고깔·소화전·캔·입간판) |
| `art/bg/sewer/` | 하수도: back · floor(서는 선 250px) — **far·obj·fg 없음 (프롬프트만 써 둠)** |
| `art/boss/toad/` | full.png · parts.png → cut/(body·jaw·arm·hand·thigh·foot·lidA·lidB·tip·tseg·throatBig) |
| `art/enemy/` · `art/props/` | 딱정벌레·날파리 6프레임씩 · 촛불(쉼터)·치즈 |
| `art/knight/v6spin/` | 공중 회전 공 프레임(f9~f12, 리그와 같은 셰이더로 구움) |
| `art/ui/` | UI 프롬프트(팝아트 도시판) — 생성 중이었음 (아래 4번) |
| `tools/gen_queue.sh` | Codex 묶음 생성 (시각 대기) |
| `tools/build_deck.js` | 컨셉 기획서 PPT 생성 스크립트 (pptx 스킬·pptxgenjs 경로에 의존) |
| `docs/컨셉 기획서 v0.4.pptx` | 기획서 16장 — **세계관이 아직 '시골·숲' 버전, 도시로 고쳐야 함** |

## 3. 지금 상태 (동작 확인됨)
- 모션: 평타 3타 루프(1타 올려베기 → 2타 올려치며 뒤돌아 대기 → 3타 회전 → 다시 1타), 공중 세로 회전(통그림 공 프레임), 내려찍기+튕겨 오르기, F 짧게 = 잔상 대시(공중 가능) / 길게 = 충전 돌진(충전량 비례).
- 루프: 레벨업 해금(Lv2 내려찍기 · Lv3 충전 돌진 · Lv4·5 체력+1), 치즈 경험치, 쉼터 촛불 저장·부활, 적 2종(공격 순간에만 몸통 피해), 이단 점프 아이템으로 높은 출구 해금.
- 방: 0 밤의 뒷골목 → 1 네온 골목 → 2 비상계단 아래 → 3 하수도(보스). 방마다 `theme`(city/sewer), 그림 없는 테마는 숲으로 대체.
- 배경: 테마별 원근 레이어(하늘 p0.06 · 먼 판 p0.28 · 깊이 3단 땅+물건 p0.36/0.56/0.78 · 바닥 · 앞 판 p1.35), 멀수록 흐림·안개, 카메라 세로 따라가기(`camY`).
- 보스 개굴대왕: 혀(조준→발사→잡기/박힘 빈틈) · 짓누르기(그림자→충격파→착지 빈틈) · 물방울 3발+웅덩이 · 2페이즈(50%) · 빈틈 2배 · 박힌 혀 베면 휘청 · 처치 시 큰 치즈+출구. 프레임 시험으로 전 패턴 확인, **직접 플레이 손맛·난이도는 미확인**.

## 4. 다음 할 일 (우선순위)
1. **배경을 레이어로 전체적으로 나눠 원근감 강화 (사용자 요청 2026-10-28 마지막)** — 뒤에 깔리는 배경 전체를 더 여러 겹으로 나눠 카메라 따라 깊이가 잘 느껴지게. 하늘·스카이라인·먼 건물·중간 건물·깊이 물건 단·바닥·앞 판처럼 층을 늘리고, 층마다 흐림·안개·시차를 단계적으로. 지금 도시는 `back`(하늘+스카이라인 한 장) · `far`(건물 한 장)뿐이라 하늘과 스카이라인을 분리, 중간 건물 층 추가 등 그림을 더 뽑아야 함.
2. **하수도도 레이어로**: `art/bg/sewer/prompt_far.txt · prompt_obj.txt · prompt_fg.txt` 이미 써 둠 → Codex 실행 → `far_keyed`·`fg_keyed` 키잉, obj 시트는 `tools/cut.py --grow 3 --min 20000` 으로 자르고 이름 붙이기 → `main.js THEMES.sewer` 에 `far`·`farBottom`·`fg`·`objs` 채우기.
3. **보스 도트화**: 보스 부위 그림을 원본 해상도로 그려서 혼자 매끈함(사용자 지적). `TOAD.load` 에서 부위마다 `pixelate`(main.js 에 있음, boss.js 로 넘기거나 api 로 전달)로 구워 배경과 같은 굵기(화면 약 3~4px)로. `K=0.43` 이니 cell ≈ 8. 그릴 때 `imageSmoothingEnabled=false`.
4. **UI 그림**: `art/ui/prompt.txt`(팝아트 도시판 8종: 하트 찬/빈 · 레벨 배지 · 알림 띠 · 경험치 막대 틀/채움 · 보스 막대 틀/채움) 로 생성 완료 → `art/ui/sheet.png` (아직 안 봄·안 자름) 확인 → 자르기 → 게임 캔버스 위 HUD 로 그리기(코드 픽셀화, 레벨 숫자·문구는 코드 글자). 지금 HUD 는 HTML(`#stat`·`#bossbar`·`#banner`).
5. 두꺼비 입속: 지금은 코드로 짙은 색을 칠함(임시) → 입속 그림을 부위로 뽑아 교체. 두꺼비가 도시 그림보다 팝아트 맛이 약함(외곽선·망점 없음) → 필요하면 같은 부위 구조로 다시 생성.
6. 기사쥐 무기: 확정은 한손검(아밍소드)인데 리그(`rig_v4/sword.png`)는 큰 칼 → 교체.
7. 기획서 PPT 를 도시·보스 버전(v0.5)으로 갱신 (`tools/build_deck.js`).
8. 보스전·루프 직접 플레이 피드백 받아 수치 조정.

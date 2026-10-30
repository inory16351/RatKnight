# 기사쥐 (RatKnight) — 인수인계

마지막 갱신: 2026-10-30 (Claude). **맨 위 §00 이 최신.** 그 아래 §0~§6 은 이전 기록 — 스킬 노드 관련 내용은 폐지됨.

## 00. 2026-10-30 작업 (Claude) — 맵 구조 계획 · 캐릭터 테스트 도구 · 맵 제작 도구
- 작업 경로 = `C:/NKK/RatUprising/RatKnight` (아래 기록의 `C:/Dev/RatKnight` 는 이전 환경).
- 맵 구조 기준: `docs/map-structure-handoff.md`(사용자 승인 규칙) + `docs/map-structure.png`(구조도, 원래 이름 AAAAAElFTkSuQmCC.png) → 적용 계획·결정 기록 = **`docs/map-structure-plan.md`** (능력 a~e 확정, 블럭 48px, 단방향 표현, 저장, 엔딩 후 처리, 도구 현황, world.json 형식).
- 사용자 결정 요약: a=3연속 대시 · b=패링 · c=이단 점프 · d=수직 슈퍼점프 · e=단거리 벽통과, 벽 차기 = 첫 번째 초반 맵 보스 공용 보상(맵 안 숨은 길용). **스킬 노드 폐지** → 레벨업 자동 해금(Lv2 내려찍기 · Lv3 충전 돌진 · Lv4·5 체력). 기존 방 8개는 참고용, 맵은 새로 설계.
- 새 파일: `web/chartest.html`·`src/chartest.js`(캐릭터 테스트), `web/mapedit.html`·`src/mapedit.js`(맵 제작), `src/tune.js`(키·이펙트·프레임 튜닝), `src/abilities.js`(능력 정의·블럭 크기), `data/tune.json`·`data/world.json`(도구 저장 결과). `tools/serve.js` 에 `POST /__data?name=x.json` → `data/` 저장 추가.
- `main.js`: 능력 5종·가시·테스트장·튜닝 훅(프레임별 자세/무적/판정/캔슬/속도/칼빛/잔상/이펙트 이벤트, 이펙트 종류별 끄기, 키 배치)·프레임 미리보기. `fx.js` 점별 칼빛 굵기(`wk`). `hud.js` 노드 창 제거, `skills.js` 삭제.
- 검증: 브라우저에서 3연속 대시 가시밭 통과(능력 없으면 피해) · 이단 점프 선반 도달 · 슈퍼점프 627px · 벽통과 3490→3734 · 바닥/벽 가시 패링 튕김 · 프레임 무적·자세 키·이펙트 이벤트·키 바꾸기·이펙트 끄기 · 파일 저장 확인. 기존 전투 검사 20개를 앱 브라우저에서 돌려 19개 통과, **1개(보스 착지 판정 top 440 기대) 실패 = 이번 변경 전부터 boss.js 값이 420 이라 생긴 오래된 테스트 기대값** (boss.js 는 이번에 안 건드림).
- `tools/verify_combat.cjs`·`inspect_action.cjs` 의 Playwright 경로(`C:/Users/asdzx/...`)는 이 PC 에 없음 → 그대로는 실행 안 됨.
- 2차: 캐릭터 테스트에 저장본(튜닝+리그 덮어쓰기+이펙트 색·그림) · 리깅 탭 · 비교 탭 · 게임 적용(`data/active.json` → `data/saves/<이름>.json`) 추가. `rig.js` = `loadRig(dir, patch)`·`patchDef`·부위 `adj`·겹침 순서 `def.order`, `fx.js` = `FXCOL`·`replaceImg`, `serve.js` = `GET /__list?dir=saves`·`DELETE /__data`. 내용은 plan §5.
- 3~5차: 캐릭터 테스트 확대 뷰·본/관절 끌기·하단 타임라인·좌우 부위 분리(`rig.js ALIAS`)·계층(`HIER`)·편집 범위(전체 리깅/프레임별)·자식과 함께/개별·되돌리기·동작 길이. 맵 제작은 거대한 맵 한 장(청크 격자 + 지역 색)으로 다시 만듦 (plan §5·§6).
- 커밋 안 함. 다음 = 게임이 `data/world.json` 을 읽는 그레이박스 (plan §5 다음 단계).

## 0. 꼭 지킬 규칙 (사용자 지시)
- NKK(찍!찍!!찍!!!) IP 확장 2D 액션. 순서 = 웹에서 모션·루프 확정 → 웹빌드 → 유니티 이식.
- 사용자 의도가 애매하거나 새 기획 결정이 필요한 경우 질문. 이미 확정된 요청과 통상적인 구현·검증은 계속 진행. 기존 모션 유지, 1·2타 FX 유지 등 아래 확정 사항 우선.
- **그림체 = 픽셀, 감성 = 팝아트** (2026-10-28 최종 정리). 그림은 플랫하게 생성 → 픽셀화는 코드(`pixelate`). 픽셀아트로 직접 뽑지 말 것.
- 세계관 = **현대 인간 도시에서 기사도의 낭만을 꿈꾸는 생쥐 기사**. 시작 = 밤의 뒷골목, 첫 보스 = 하수도의 왕 개굴대왕. (예전 부엌·시골 숲 설정은 폐기, 숲 그림은 `art/bg/forest/` 에 보관만)
- 기획서 어투 = 명사형 마무리, 폰트 Noto Sans KR, 작성자 정승운.
- 그림 생성 = **Codex CLI** (사용자 지시 2026-10-29). `bash C:/Dev/NKK_PROJECT/Tools/codex.sh exec --skip-git-repo-check --sandbox workspace-write -i <참고.png> - < prompt.txt` (폴더 안에서 실행). 묶음은 `tools/gen_subway.sh` 참고. 무명암 플랫 원본, 자홍 배경 → 키잉·`tools/cut.py --names` 로 자르기. 명암과 픽셀화는 코드 셰이더 후처리.
- ChatGPT(앱 브라우저)는 CSP 때문에 그림을 파일로 못 옮김 → Codex 우선. 한도 걸리면 `tools/gen_queue.sh <HH:MM>` 로 풀리는 시각에 묶음 생성.
- **코드 실수 주의**: 한 줄짜리 객체/조건 중간에 `// 주석` 을 끼워 뒤 코드를 날린 사고가 4번 있었음. 주석은 줄 끝에만. 고친 뒤 `cp file.js $TMPDIR/x.mjs && node --check $TMPDIR/x.mjs` 로 ES 모듈 검사.

## 1. 실행 · 확인
```bash
node tools/serve.js     # http://localhost:5330/web/index.html?rig=v4
```
- 현재 작업 경로 = `C:/Dev/RatKnight`. `C:/Project/...` 경로는 이전 환경 기록. 시스템 `py`에 numpy·Pillow·scipy 있음. 번들 Python은 Pillow는 있으나 scipy 없음.
- 콘솔 `__game`: `step(n)`(저장 없이 프레임 진행 — 테스트는 이걸로, `film` 반복은 느려서 타임아웃), `go({to, x})`, `loadRoom`, `G`(레벨·경험치), `E`(적), `BOSS`, `film(이름, setup, n, dt, 간격, [x,y,w,h])` → `docs/shots/이름.png`, `shot(...)`.
- 이번 검증은 번들 Playwright + 시스템 Edge 헤드리스 사용. 실행·권한·재현 주의 사항은 §6 참고.

## 2. 파일
| 경로 | 내용 |
|---|---|
| `web/src/main.js` | 게임 루프·입력·판정·방/테마 배경·적·치즈·레벨·쉼터·HUD·보스 연결 |
| `web/src/boss.js` | 개굴대왕: 패턴 상태 기계 + 컷아웃 리그(`RIG`, `TOAD.draw`), 사양은 파일 머리 주석 |
| `web/src/anim.js` | 자세·모션·공격표 `ATTACKS` (slash1~3, heavyC/2/3, air, plunge) |
| `web/src/fx.js` | 칼빛 리본·타격(적 반대쪽 터짐)·기 모으기·효과음 글자 등 |
| `web/src/rig.js` · `shade.js` | 기사쥐 리그(neckDrop 목 보정)·코드 셰이더 |
| `art/bg/city/` | 뒷골목: back · far · fg · floor(서는 선 200px) · obj/(쓰레기통·상자·고깔·소화전·캔·입간판) |
| `art/bg/sewer/` | 하수도: back · floor · far · mid · front_tall · obj/6종. 이번에 원근 레이어와 소품 추가 |
| `art/boss/toad/` | full.png · parts.png → cut/(body·jaw·arm·hand·thigh·foot·lidA·lidB·tip·tseg·throatBig) |
| `art/enemy/` · `art/props/` | 딱정벌레·날파리 6프레임씩 · 촛불(쉼터)·치즈 |
| `art/knight/v6spin/` | 공중 회전 공 프레임(f9~f12, 리그와 같은 셰이더로 구움) |
| `art/ui/` | UI 프롬프트(팝아트 도시판) — 생성 중이었음 (아래 4번) |
| `tools/gen_queue.sh` | Codex 묶음 생성 (시각 대기) |
| `tools/build_deck.js` · `tools/build_deck.mjs` | v0.4를 Artifact Tool로 가져와 수정하는 v0.5 빌더. 이전 빌더는 `tools/archive/build_deck_v04.js` 보존 |
| `docs/컨셉 기획서 v0.4.pptx` | 원본 16장 보존. v0.5는 18장 후보 생성까지 완료, 최종 검증·저장 미완료 (§6) |

## 3. 지금 상태 (동작 확인됨)
- 모션: 평타 3타 루프(1타 올려베기 → 2타 올려치며 뒤돌아 대기 → 3타 회전 → 다시 1타), 공중 세로 회전(통그림 공 프레임), 내려찍기+튕겨 오르기, F 짧게 = 잔상 대시(공중 가능) / 길게 = 충전 돌진(충전량 비례).
- 루프: 레벨업 해금(Lv2 내려찍기 · Lv3 충전 돌진 · Lv4·5 체력+1), 치즈 경험치, 쉼터 촛불 저장·부활, 적 2종(공격 순간에만 몸통 피해), 이단 점프 아이템으로 높은 출구 해금.
- 방: 0 밤의 뒷골목 → 1 네온 골목 → 2 비상계단 아래 → 3 하수도(보스). 방마다 `theme`(city/sewer), 그림 없는 테마는 숲으로 대체.
- 배경: 테마별 원근 레이어(하늘 p0.06 · 먼 판 p0.28 · 깊이 3단 땅+물건 p0.36/0.56/0.78 · 바닥 · 앞 판 p1.35), 멀수록 흐림·안개, 카메라 세로 따라가기(`camY`).
- 보스 개굴대왕: 혀(조준→발사→잡기/박힘 빈틈) · 짓누르기(그림자→충격파→착지 빈틈) · 물방울 3발+웅덩이 · 2페이즈(50%) · 빈틈 2배 · 박힌 혀 베면 휘청 · 처치 시 큰 치즈+출구. 프레임 시험으로 전 패턴 확인, **직접 플레이 손맛·난이도는 미확인**.

## 4. 다음 할 일 (우선순위)
0. **타격 판정을 콜라이더 생성형으로 교체 (사용자 지시)** — 지금 `main.js tryHit` 는 공격표 `range`(앞뒤)·`h`(위아래) 안에 적의 점 몇 개가 들어오는지만 봄(보스는 몸 4점 + 혀 점들). 언더월드 프로토(`C:/Project/underworld-proto/src/hitbox.js`)를 뜯어 같은 방식으로: 공격 순간 공격 범위 모양(`rect`·`area` 원·`wedge` 부채꼴·`line` 돌진 띠·`ring`)으로 **공격 콜라이더를 만들고**, 적마다 그림이 차지하는 몸 **피격 콜라이더**(`body`/`rect`, `GRACE.hurt` 만큼 넉넉히)와 `touches` 로 겹침 검사. 적의 공격 → 플레이어는 발밑 작은 원 `foot`(`GRACE.player`, 작게)과 `hitsFoot`. 디버그로 콜라이더를 잠깐 그려 보여 주는 것도 언더월드처럼(`drawBox`, boss.js 의 `this.cols`). 사용처 참고: 언더월드 `main.js` 1104줄~ `hurtBoxOf`·`foes()`, `skills.js`, `enemies.js`, `boss.js` 1099줄. 단 언더월드는 쿼터뷰(바닥 깊이 띠 g0..g1)라 우리 옆모습 게임에선 깊이 띠를 빼고 2D 사각형·원으로.
1. **배경을 레이어로 전체적으로 나눠 원근감 강화 (사용자 요청 2026-10-28 마지막)** — 뒤에 깔리는 배경 전체를 더 여러 겹으로 나눠 카메라 따라 깊이가 잘 느껴지게. 하늘·스카이라인·먼 건물·중간 건물·깊이 물건 단·바닥·앞 판처럼 층을 늘리고, 층마다 흐림·안개·시차를 단계적으로. 지금 도시는 `back`(하늘+스카이라인 한 장) · `far`(건물 한 장)뿐이라 하늘과 스카이라인을 분리, 중간 건물 층 추가 등 그림을 더 뽑아야 함.
2. **하수도도 레이어로**: `art/bg/sewer/prompt_far.txt · prompt_obj.txt · prompt_fg.txt` 이미 써 둠 → Codex 실행 → `far_keyed`·`fg_keyed` 키잉, obj 시트는 `tools/cut.py --grow 3 --min 20000` 으로 자르고 이름 붙이기 → `main.js THEMES.sewer` 에 `far`·`farBottom`·`fg`·`objs` 채우기.
3. **보스 도트화**: 보스 부위 그림을 원본 해상도로 그려서 혼자 매끈함(사용자 지적). `TOAD.load` 에서 부위마다 `pixelate`(main.js 에 있음, boss.js 로 넘기거나 api 로 전달)로 구워 배경과 같은 굵기(화면 약 3~4px)로. `K=0.43` 이니 cell ≈ 8. 그릴 때 `imageSmoothingEnabled=false`.
4. **UI 그림**: `art/ui/prompt.txt`(팝아트 도시판 8종: 하트 찬/빈 · 레벨 배지 · 알림 띠 · 경험치 막대 틀/채움 · 보스 막대 틀/채움) 로 생성 완료 → `art/ui/sheet.png` (아직 안 봄·안 자름) 확인 → 자르기 → 게임 캔버스 위 HUD 로 그리기(코드 픽셀화, 레벨 숫자·문구는 코드 글자). 지금 HUD 는 HTML(`#stat`·`#bossbar`·`#banner`).
5. 두꺼비 입속: 지금은 코드로 짙은 색을 칠함(임시) → 입속 그림을 부위로 뽑아 교체. 두꺼비가 도시 그림보다 팝아트 맛이 약함(외곽선·망점 없음) → 필요하면 같은 부위 구조로 다시 생성.
6. 기사쥐 무기: 확정은 한손검(아밍소드)인데 리그(`rig_v4/sword.png`)는 큰 칼 → 교체.
7. 기획서 PPT 를 도시·보스 버전(v0.5)으로 갱신 (`tools/build_deck.js`).
8. 보스전·루프 직접 플레이 피드백 받아 수치 조정.

## 5. 이번 작업 반영 상태 (2026-10-29)

### 사용자 확정 사항
- 현대 인간 도시에서 낭만을 쫓는 꼬마 기사쥐. 시작 장비는 하수구에서 주운 병뚜껑·캔 조각·파이프·철사·테이프. 이후 점진적인 장비 업그레이드.
- 모션 구현 유지. `web/src/anim.js` 변경 없음. 타이밍·콤보·정면/뒷모습 전환·공중 회전 프레임 구간 유지.
- 원본은 무명암 플랫. 픽셀 이미지를 생성해 넣는 방식 금지. 셰이더에서 명암·망점·팔레트 양자화·픽셀화 적용.
- 실크송처럼 화면 전체 높이를 쓰는 세로 풍경 판을 여러 깊이로 겹침. 낮은 소품 줄만 늘리는 해석 금지. 앞쪽으로 올수록 선명하게.
- 1·2타 이펙트는 현재 방향 유지. 수정 대상은 3타 회전베기의 중간 윗윤곽과 칼끝 부착. 이나리는 모션보다 이펙트 구현 방식 참고. 색은 1·2타와 동일한 흰빛·노랑·주황 변화.
- 손잡이를 제대로 쥔 느낌이 들도록 무기 피벗과 손의 겹침 순서 보정.
- 플레이어와 몬스터 모두 공격 순간 도형 콜라이더 생성 후 상대 피격 영역과 겹침 검사.

### 구현
- 시작 장비: `art/knight/rig_urban/`, `rig_front_urban/`, `v7/spin/`. 원본 v4·v6 보존. 기본 URL과 `?rig=v4` 모두 도시 스킨, 비교 원안은 `?rig=classic`.
- `tools/build_urban_rig.py`: 기존 부위 캔버스와 뼈 구조에 새 스킨 맞춤. 망토 3분절 유지. 무기 피벗을 테이프 손잡이 중심으로 보정.
- 정면·뒷모습 무기는 손보다 뒤에 그림. `frontGripAt`으로 그리기 없이 같은 시각의 손 좌표 계산.
- 3타 리본: 앞쪽 밀기와 칼끝 1.5배 확장을 3타에서만 제거. 실시간 칼끝에 머리 부착, 96개 호 길이 샘플·폭 벡터 보간·윗곡면 보정. 1·2타의 기존 강조와 색 변화 함수 유지.
- 배경: 도시 하늘 p0.02, 스카이라인 p0.11, 원경 건물 p0.28, 중경 구조물 p0.5, 소품 p0.62/0.78/0.92, 플레이 바닥 p1, 높이형 전경 p1.12, 바닥 전경 p1.18. 하수도도 먼 아치·중간 배관·소품·높이형 전경 분리.
- `web/src/hitbox.js`: 2D 사각형·원·캡슐·부채꼴·고리와 공통 `touches`, `hitsFoot`, `drawBox`. 쿼터뷰 깊이 띠 없음.
- 기본 베기 사각형, 공중 회전 원형, 내려찍기 캡슐, 착지 범위 원형. 적의 몸 영역을 넉넉하게 검사, 공격 ID별 대상 한 번 피해. 연속 이동 공격은 활성 구간 동안 다른 대상을 계속 검사.
- 적 돌진·급강하 및 보스 혀·물방울은 이전 위치부터 현재 위치까지 캡슐 검사. 착지·웅덩이·충격파도 도형 생성. 바닥 위험은 작은 발 원 검사로 점프 회피. 보스 처치 시 잔여 위험 삭제.
- 디버그 패널의 `공격·피격 콜라이더`: 실제 공격 노랑/빨강, 몸 피격 시안, 발 흰색.
- 기획서 Markdown v0.5: 도시 서사·장비·풍경 깊이·현재 성장 루프·보스·양방향 판정 갱신. 제작/드랍/스킬 노드는 후속 미구현 기획으로 구분.
- 원작 확인 경로는 `C:/Dev/NKK_PROJECT` (`C:/Project` 아님). RatTable의 기사쥐 설명, UltExcalibur의 바위째 뽑아 휘두르는 우직한 개그, GachaIntro와 SuperUlt 아트 확인.

### 확인 방법
- `node tools/serve.js` → `http://localhost:5330/web/index.html`.
- `node tools/verify_combat.cjs`: 공통 도형·양방향 공격·중복 피해·보스 위험·점프 회피 20개 브라우저 검증.
- `node tools/inspect_action.cjs slash3 slash3_final`: 3타 프레임 스트립, 도시/하수도 전체 화면, 콜라이더 화면 생성. 시스템 Edge 헤드리스 필요.
- 테스트 캡처는 `docs/shots/` (Git 제외). 기획서용 선택 캡처는 `docs/ppt/`에 별도 보존.
- 실제 플레이를 통한 난이도·손맛 평가는 여전히 사용자 피드백 대상.

### 남은 별도 작업
- UI 시트 적용, 보스 입속 전용 아트, 장비 업그레이드 획득/등급 설계. 이번 요청의 장비 외형·깊이·판정과 구분.

## 6. 다음 에이전트 시작점 — 사용자 요청에 따른 작업 중단·인계

### 마지막 사용자 지시
- 완료하면 옆 패널에 게임을 띄워 직접 테스트하려 했으나, 곧바로 **다른 에이전트로 작업하겠으니 핸드오프 갱신 후 인계**로 변경.
- 따라서 이번 인계에서는 게임 패널을 열지 않았고 추가 구현도 중단. 다음 에이전트는 사용자의 후속 요청에 따라 진행.
- 현재 변경은 로컬 작업 트리에만 있음. 커밋·푸시 없음. 새 코드·아트·캡처에 untracked 파일이 많으므로 정리 명목으로 삭제하지 말 것.

### 완료 및 검증 범위
- 게임: 도시 스킨·손잡이 보정·3타 칼끝 부착 FX·높이형 배경 깊이·플레이어/일반 적/보스 양방향 도형 판정 구현 완료.
- `node tools/verify_combat.cjs`의 20개 브라우저 검사 통과: 가장자리 겹침, 분리 영역, 이동 캡슐, 원/고리/부채꼴, 동일 공격 중복 방지, 적 몸통 공격, 무적 시간, 점프 시 바닥 위험 회피, 보스 몸/혀/웅덩이/물방울/착지/충격파 등.
- 수정 JS 문법 검사와 `git diff --check` 통과. `web/src/anim.js`는 변경 없음.
- 3타 프레임 스트립과 도시·하수도·콜라이더 스크린샷 시각 확인. 마지막 스킨 팔레트의 보라색을 남색으로 정리한 뒤 아트 재빌드했고, 이 작은 색 보정 이후 기획서용 게임 캡처를 다시 찍지는 않았음.
- 실제 사용자 조작에 의한 손맛·난이도 검증은 아직 없음.
- `컨셉 기획서.md` v0.5 갱신 완료. 생성 프롬프트와 소스 경로는 `art/urban-v7-prompts.md`.

### 가장 먼저 이어서 할 미완료 작업: PPT 최종 저장
- `tools/build_deck.mjs`는 기존 v0.4 디자인을 유지하며 도시 서사·장비·빌드 캡처 갱신, 원근 레이어/콜라이더 설명 2장 추가. 총 18장.
- 후보 파일: `.codex-build/candidate.pptx`. 슬라이드 렌더: `.codex-build/deck-after/1.png`~`18.png`. 원본 렌더: `.codex-build/deck-before/`.
- **`docs/컨셉 기획서 v0.5.pptx`는 아직 없음. 후보 파일을 검증 완료 최종본이라고 전달하지 말 것.**
- 마지막 실패는 첫 번째 단계의 패키지 작성 실패가 아니라 finalizer의 Artifact Tool 재가져오기 검증에 필요한 런타임 환경변수 누락:
  `Error: RUNTIME_NODE_MODULES or CODEX_PRIMARY_RUNTIME_NODE_MODULES is required.`
- 다음 조치: `tools/build_deck.mjs`의 finalizer 호출 전에 `process.env.RUNTIME_NODE_MODULES` 또는 실행 환경에 아래 모듈 경로 설정 후 재실행. 필요 시 스킬 runtime_helpers의 나머지 요구 환경변수도 확인.
  `C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`
- Node 실행 파일: `C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.
- Python 실행 파일: `C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.
- `node tools/build_deck.mjs`는 자식 Python 실행 때문에 sandbox에서 EPERM이 있었음. 승인된 escalated 실행에서는 환경변수 누락 단계까지 진행함. 자동 승인 거절이었던 것은 아님.
- 작업 시작 marker는 최초 PPT 편집 전에 **이미 1회 실행**함. 같은 편집 작업을 이어갈 때 다시 찍지 말 것.
- 프레젠테이션 스킬 위치: `C:/Users/asdzx/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations/SKILL.md`. 이어받는 에이전트도 필요한 지침을 직접 읽고 finalizer·18장 렌더 시각 QA 완료 후 전달.
- 원본 16장은 모두 확인했고 수정본 일부(1·4·5·6·7·16·17·18)를 확인했으나, 마지막 재빌드 결과 **전체 18장 최종 QA는 아직 완료하지 않음**. 최종 receipt 예정 위치 `.codex-build/deck-validation.json`.

### 알려진 작은 미해결 사항
- `main.js`가 도시 리그에서도 `rig_urban/full_keyed.png` 비교용 통그림을 요청하지만 해당 파일은 없어 404 한 건 발생. 일반 게임 리그 렌더링에는 영향 없음. 비교 모드 로딩을 분기하거나 적절한 비교 이미지를 준비하는 후속 수정 필요. 잘못된 원본 크기/발 피벗의 이미지를 단순 대입하지 말 것.
- 초기 생성 소스에는 약한 명암/그라데이션이 남은 파일이 있어 최종 소스에서 팔레트 정리함. 앞으로도 픽셀 그림을 직접 생성하지 말고 무명암 플랫 원본 → 코드 셰이더 방침 유지.

### 재현 도구 주의
- `tools/inspect_action.cjs`, `tools/verify_combat.cjs`: 번들 Playwright를 직접 require하고 시스템 Edge (`channel: 'msedge'`) 사용. 헤드리스 브라우저 시작은 sandbox 밖 실행이 필요했음.
- 결정적 프레임 테스트는 초기 스크립트에서 RAF를 끔. 이때 `waitForFunction`은 반드시 `polling: 100` 등 시간 폴링 사용 (기본 RAF 폴링은 멈춤).
- 페이지 로딩은 `domcontentloaded`, Google Fonts 요청 차단. 앱 브라우저 자동화는 이번 환경에서 매우 느려 테스트는 헤드리스로 진행했음.
- 로컬 서버를 앞선 작업에서 띄웠으나 인계 시 계속 살아 있다고 가정하지 말고 포트 5330 확인 후 필요할 때 `node tools/serve.js` 실행.
- 사용자가 다시 테스트 화면 요청 시 `http://localhost:5330/web/index.html`을 Codex 오른쪽 브라우저 패널에 열면 됨. 새 도시 리그가 기본. `?rig=v4`도 새 도시 리그, `?rig=classic`만 보존된 원안.

## 6. 이번 작업 (2026-10-29 새벽) — 보스 도트화 · 지하철역 · 스킬 노드 · 데미지 숫자

### 사용자 결정 (선택지로 확정)
- 새 지역 = 버려진 지하철역. 몬스터 = 바퀴벌레 + 비둘기. 보스 = 지하철 거대 지네(레일 지네). 패턴은 개굴대왕과 같은 틀(3패턴 + 2페이즈 + 빈틈)로 에이전트가 설계.
- 메트로베니아 잠금 = 벽 차기. 추가 액션은 **레벨로 얻는 포인트로 찍는 그물형 스킬 노드**. 기존 자동 해금(내려찍기·충전 돌진·체력)도 전부 노드로 옮김. 노드 창은 **쉼터 촛불에서만**. 벽 차기 노드는 **Lv4 이상**.
- 데미지 숫자: 0~9 숫자 글꼴을 따로 뽑아 색을 바꿔 팝아트 데미지로.
- 그림은 Codex CLI 로.

### 구현
- 개굴대왕: `boss.js TOAD.load` 에서 부위를 화면 도트 2칸당 1텍셀로 줄인 뒤 `shade.js bakeLit`(빛 각도 하나, 왼쪽/오른쪽 볼 때 각각) 로 명암·망점을 구움. 그릴 때 보스 전용 `pixLayer(…, 24, 4)` (도트 4px = 배경 굵기) 에서 한꺼번에 도트화 → 돌아가는 부위도 같은 격자. 상태별 앞팔 2차 동작 추가. `pixelate` 는 `shade.js` 로 옮김(공용), `pixLayer` 는 도트 크기 n 인자.
- 데미지 숫자: `fx.js damage(v, x, y, kind)` · `art/ui/digits/cut/0~9.png`(Codex). 흰 채움만 색으로 물들이고 위쪽에 밝은 망점, 뒤에 어긋난 색판. kind = normal · crit(빈틈·약점) · fin(막타) · boss. 그림이 없으면 글꼴로 구운 대체 숫자.
- 공격력: `dmgOf(c)` = 공격표 dmg × `G.atkMul`(노드). 보스는 `api.dmgOf`.
- 스킬 노드: `web/src/skills.js` (NODES · canLearn · learn · HTML 창). 레벨업마다 `G.sp`+1, Lv8 까지(`LV_XP`). 쉼터에서 ↑ → 창(게임 정지), 방향키 이동 · Z/A/Enter 배우기 · Esc/C 닫기. `has(k)` = `G.skills.has(k)`.
- 벽 차기: 방 `blocks`(벽 덩어리, 윗면은 발판, 옆면 충돌, 밑면 머리 막힘) + 출구 없는 방 끝. 공중에서 벽 쪽 입력 → 미끄러짐(낙하 150 제한), 점프 → 반대쪽 위로(vx 420, 0.16초 입력 잠금), 공중 대시·회전·이단 점프 다시 채움.
- 출구: `L`/`R` 에 배열 가능, `high` = true(이단 점프) 또는 y 숫자(그보다 위). 아이템 `y` 지원, `heart*` = 최대 체력 +1.
- 방 (총 8): 0 뒷골목 · 1 네온 골목(간판 위 체력 조각 = 벽 차기) · 2 비상계단 아래(오른쪽 위 = 수직갱 지름길) · 3 하수도 보스(처치 후 오른쪽 → 4) · 4 버려진 승강장(쉼터) · 5 환기 수직갱(양쪽 위 출구 벽 차기 전용, 입장 안내) · 6 폐선로(쉼터) · 7 종착역 보스.
- 적: `roach`(천장 `ceil` 배치 → 낙하 덮침, 멈칫/질주/속임수 꺾기/체력 반 이하 도약) · `pigeon`(거리 유지, 깃털 3개 부채꼴 `SHOTS` ↔ U자 훑기 번갈아). 그림 `art/enemy/roach|pigeon/cut`, 없으면 임시 도형.
- 보스 레지스트리 `BOSSES`(main.js): 이름·보스 막대 이름·처치 치즈·처치 문구. 처치 기록 `G.down[type]` (예전 `G.bossDown` 대체).
- 레일 지네 `web/src/centipede.js`: 사슬 리그(머리 길 trail 을 12마디가 간격 46 으로 따라감, 마디마다 다리 2개 걸음 흔들림, 집게 벌림 jaw, 더듬이). 부위 그림 `art/boss/centipede/cut`(head · headOpen · mandible · antenna · seg · segWeak · leg · tail) 을 `bakePart`(24 빛 각도) 로 구워 `variantFor` 로 고름. 패턴·수치는 파일 머리 주석.
- 지하철 테마 `THEMES.subway`(back · far_keyed · mid_keyed · front_tall_keyed · floor_keyed(서는 선 180px) · obj 6종). 그림이 없으면 `fallback: 'sewer'`.

### 확인
- `node tools/verify_combat.cjs` 20개 통과.
- 브라우저: 개굴대왕 도트화, 지하철 승강장·종착역 화면, 지네 세우기·내려치기·전조등 경고·돌진·낙하·박힘, 바퀴벌레 낙하·질주, 비둘기 깃털, 스킬 노드 창(배우기·이동), 벽 차기로 수직갱 3회 박차 390px 발판 도달, 데미지 숫자 4색.
- **직접 플레이 손맛·난이도는 미확인** (지네 돌진을 점프로 넘는 여유, 바퀴벌레 속임수 빈도, 비둘기 깃털 속도 등).

### 남은 일
- 지네 부위 관절 미세 조정(집게·더듬이 자리 `centipede.js PIV`·off 값), 박힘 때 머리 연출.
- 벽 미끄러짐 전용 자세(지금은 공중 자세 그대로), 벽 덩어리 전용 그림(지금은 코드 도형).
- 스킬 노드 창은 HTML — 유니티 이식 때 UI 시트(§4-4)와 함께 정리.
- 지하철 이후 연결(종착역 너머)·장비 업그레이드.

# 도시 시작 장비와 높이형 풍경 에셋

생성 방식: 내장 ImageGen. 생성본 `_generated.png`는 보존, 게임에서는 플랫 팔레트 사용본만 참조. 픽셀화·조명·안개는 게임 코드 후처리.

## 공통 최종 프롬프트

`Use case: stylized-concept / precise-object-edit. Production 2D game source art. Strict unlit flat vector-like cutout illustration. Every material region uses one uniform solid fill. No gradients, shadows, highlights, gloss, surface texture, glow, halftone or pixel art. No text, logos or watermark. Code applies lighting, halftone, depth haze and pixelation later. Preserve all reference poses, proportions and part placement.`

## 캐릭터

- 기준: 기존 `full_side.png`, `v4/parts_side.png`, `v4/parts_front.png`, `v6spin/spin_sheet.png`.
- 주제: 현대 인간 도시에서 기사도의 낭만을 꿈꾸는 꼬마쥐. 시작 장비는 주운 쓰레기로 만든 기사 장비.
- 재료: 병뚜껑 견갑, 캔 조각 흉갑, 캔 따개 고리 걸쇠·가드, 철사와 전기테이프 결속, 남색 천 조각 망토, 시안 병 라벨 허리띠, 깨진 파이프 검.
- 보존: 얼굴과 큰 귀·꼬리, 현재 치비 비율, 부위별 관절, 3단 망토, 공격 자세와 타이밍.
- 시트: 옆/정면 4열 3행의 12부위. 공중 회전은 기존과 같은 2열 2행 4자세, 칼 각도와 프레임 배치 유지.
- 배경: 균일한 #FF00FF, 부위 사이 충분한 간격.
- 결과: `knight/v7/`, `knight/rig_urban/`, `knight/rig_front_urban/`.
- 후처리 도구: `tools/cut.py`, `tools/build_urban_rig.py`. 픽셀 이미지를 원본으로 만들지 않음.

## 도시 풍경 판

- 하늘: 건물 없는 남색·보라 단색 띠 밤하늘, 달과 별, 가로 타일. 2048×1024 지향.
- 스카이라인: 높이가 다른 먼 고층 건물과 물탱크·안테나. 바닥에서 전체 높이의 35~90%까지, 구조물 사이 투명 틈.
- 원경 건물: 좁고 높은 건물과 옥외 계단. 전체 면적의 약 60%를 투명한 틈으로 비움. 별도 달·하늘 없음.
- 중경: 비상계단, 벽체, 배수관, 실외기, 전선, 추상 네온 간판이 화면 전체 높이에 분산. 넓은 세로 개구부.
- 전경: 양쪽 가장자리의 좁은 배관·전주, 위쪽 전선, 바닥의 상자·병 일부. 중앙 플레이 공간과 전체 면적 80% 이상 개방.
- 결과: `bg/city/sky.png`, `skyline.png`, `architecture.png`, `mid.png`, `front_tall.png`.

## 하수도 풍경 판

- 원경: 높이형 벽돌 아치와 좁은 교각, 체인, 배관. 전체 높이까지 뻗으며 틈으로 깊은 터널 노출.
- 중경: 녹슨 수직·곡선 배수관, 밸브, 사다리, 케이블. 넓은 투명 세로 틈. 플랫 청록·녹·황토 재료색.
- 소품: 3열 2행. 밸브 파이프, 찌그러진 드럼통, 벽돌 더미, 병, 종이 왕관 고무오리, 젖은 골판지. 각 칸 독립, 배경 투명.
- 결과: `bg/sewer/far.png`, `mid.png`, `obj.png`, `obj/`. 높이형 전경은 도시 배관 판을 안개색으로 통일해 공유.
- 후처리 도구: `tools/flatten_source.py`. 원본의 미세한 색 변화와 반투명 번짐을 정리하고 셰이더 입력용 단색 팔레트·선명한 알파 생성.

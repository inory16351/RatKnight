import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {FileBlob, PresentationFile} from 'file:///C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const SKILL='C:/Users/asdzx/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations';
const PYTHON='C:/Users/asdzx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const SOURCE=path.join(ROOT,'docs/컨셉 기획서 v0.4.pptx');
const BUILD=path.join(ROOT,'.codex-build/deck-after');
const FINAL=path.join(ROOT,'docs/컨셉 기획서 v0.5.pptx');
await fs.mkdir(BUILD,{recursive:true});
const p=await PresentationFile.importPptx(await FileBlob.load(SOURCE));
const info=await p.inspect({select:'$.slides[*]',include:['id','index','elements.id','elements.kind','elements.text','elements.position']});
const records=info.records;
const replacePairs=[
 ['v0.4','v0.5'],
 ['기사를 꿈꾸는 시골 생쥐가 왕국을 향해 떠나는 메트로베니아 액션','현대 도시에서 낭만을 좇는 꼬마쥐의 메트로베니아 액션'],
 ['웹 프로토 실제 화면 — 버려진 숲','웹 프로토 실제 화면: 밤의 뒷골목'],
 ['한 줄 요약 — 기사를 꿈꾸는 생쥐가 베는 맛 하나로 왕국까지 끌고 가는 액션 플랫포머','한 줄 요약: 쓰레기로 무장한 꼬마쥐가 도시에서 기사도의 낭만을 좇는 여정'],
 ['지평선 너머 왕국 성 — 여정의 목표가 늘 화면 뒤에 보임','인간이 버린 물건이 작은 쥐에게는 보물이 되는 도시'],
 ['시골 마을 끝자락에 사는 작은 생쥐. 매일 밤 기사가 되는 꿈','현대 인간 도시에서 기사를 꿈꾸는 꼬마쥐'],
 ['오래 버려진 숲길에서 모험 시작. 낡은 허수아비, 부서진 수레바퀴, "왕국으로" 표지판','병뚜껑과 캔 조각으로 무장하고, 파이프 검을 들고 뒷골목에서 출발'],
 ['숲 → 언덕 → 왕국으로 이어지는 연결된 지역을 탐험','네온 골목과 비상계단 아래를 지나 하수도로 이어지는 탐험'],
 ['끝에서 기다리는 최강의 명검. 손에 넣으면 칼이 커지는 강화 상태(후속)','원작 기사쥐의 우직함과 엑스칼리버 모티프 계승. 장비는 모험과 함께 점진적 업그레이드'],
 ['마을 끝 들길','밤의 뒷골목'],['버려진 숲','네온 골목'],['잊힌 기사의 언덕','비상계단 아래'],['왕국','명검의 낭만'],
 ['실크송·스컬풍 꼬마 치비(약 2.2등신). 큰 머리 + 굵은 팔다리','현재 치비 비율과 얼굴 유지. 큰 귀와 꼬리 실루엣, 기존 리그 관절 유지'],
 ['남색 망토 + 금색 장식. 흰·노랑·주황 칼빛이 남색 몸 위에서 가장 잘 보이는 조합','남색 천 조각과 시안 라벨. 병뚜껑 견갑, 캔 조각 흉갑, 철사와 테이프 결속'],
 ['확정 방향은 기사 한손검(아밍소드). 지금 프로토 리그는 큰 칼 — 한손검 그림으로 교체 예정','시작 무기: 납작하게 찌그러진 파이프 검. 캔 따개 고리 가드와 테이프 손잡이'],
 ['컷아웃 리그 + 극한 순간만 통그림 프레임 (예: 공처럼 몸을 만 공중 회전)','기존 모션 표와 타이밍 유지. 옆모습·정면 리그 및 공중 회전 에셋만 교체'],
 ['하늘·먼 숲·중간 판은 멀수록 흐리고 안개색, 카메라를 느리게 따라감. 앞 판은 흐리고 어둡게 빠르게','화면 전체 높이의 건물·배관 판을 겹침. 먼 층은 느리고 흐리게, 가까운 층은 빠르고 선명하게'],
 ['약 122px, 짧게 누르면 낮게','약 152px, 짧게 누르면 낮게'],
 ['이단 점프: 높은 나무뿌리 위 출구(바닥에서 180px)를 엶','이단 점프: 높은 비상계단 출구(바닥에서 180px) 해금'],
 ['후속: 명검 강화(칼이 커짐), 벽 차기 등','후속: 장비 업그레이드와 벽 차기 등'],
 ['Codex로 플랫하게 생성','무명암 플랫 원본 생성'],
 ['공중 세로 회전 — Codex 통그림 프레임, 리그와 같은 셰이더','공중 세로 회전: 새 장비 프레임, 기존 타이밍과 셰이더 유지'],
 ['레퍼런스: 할로우 나이트(탐험·성장), 카타나 제로(한 획 베기), 이나리(웅크린 회전 → 관통 돌진)','레퍼런스: 실크송의 풍경 깊이, 이나리의 칼끝에 붙는 리본 이펙트 구현 방식'],
 ['숲의 수호자 보스, 명검의 낭만까지 이어지는 지역 확장','하수도의 왕 개굴대왕 구현. 혀·착지·물방울·웅덩이, 체력 절반에서 2페이즈'],
 ['명검을 얻으면 한시적으로 기를 모아 칼이 커지는 강화 상태','쓰레기 장비에서 더 정교한 기사 장비로 성장. 재료 등급과 획득 순서는 후속 기획'],
 ['평타 칼빛은 공격 방향 앞쪽에. 공중 회전은 몸 중심','1·2타의 칼빛 유지. 3타는 실제 칼끝에 머리를 부착하고 곡면 꼬리로 연결'],
 ['쉼터 · 날파리 2 · 딱정벌레 · 명검의 기운','쉼터, 벌레 적, 하수도 보스방으로 연결'],
];
for(const rec of records) for(const e of rec.elements||[]) if(e.kind==='textbox'&&e.text){
 let t=e.text;for(const [a,b] of replacePairs)t=t.split(a).join(b);
 if(t!==e.text)p.resolve(e.id).text.replace(e.text,t);
}
for(const layout of [...(p.layouts.items||[]),...(p.masters.items||[])]) for(const shape of layout.shapes?.items||[]){
 shape.text?.replace?.('v0.4','v0.5');
}
p.slides.items[0].speakerNotes.text='찍!찍!!찍!!! 기사쥐 IP 확장. 현대 도시의 꼬마쥐와 주운 쓰레기 장비, 화면 높이형 원근 레이어, 양방향 생성형 콜라이더 반영. 작성자 정승운. 원작 근거: C:/Dev/NKK_PROJECT/Unity_Making/NKK_Project/Assets/Data/RatTable.json, Scripts/Ults/UltExcalibur.cs.';
p.slides.items[10].speakerNotes.text='이펙트 방향은 사용자 제공 파란 윤곽 참고 이미지와 INARI 구현 방식 설명을 기준으로 확정. INARI 공식 페이지: https://store.steampowered.com/app/3910680/INARI/';
const table=p.resolve('tb/fu5cvqds');
table.getCell(4,1).value='도시의 꼬마 기사쥐. 병뚜껑 견갑과 파이프 검으로 시작';
table.getCell(5,1).value='뒷골목과 하수도를 탐험하며 전설의 명검과 기사도의 낭만을 좇는 여정';
const bytes=async rel=>new Uint8Array(await fs.readFile(path.join(ROOT,rel)));
async function image(id,rel){const im=p.resolve(id),frame=im.frame;im.replace({blob:await bytes(rel),contentType:'image/png',fit:'contain'});im.frame=frame;im.crop={left:0,top:0,right:0,bottom:0};}
await image('im/pgr2tcf2','art/knight/v7/concept/hero.png');
await image('im/9k7m1w3i','art/knight/v7/concept/hero.png');
await image('im/7ut4nih0','docs/ppt/city_depth.png');
await image('im/tkjutw7u','docs/ppt/sewer_depth.png');
await image('im/wnalgv6x','docs/ppt/city_depth.png');
await image('im/4r6187e9','docs/ppt/slash1_city.png');
await image('im/s76psvu9','docs/ppt/slash3_city.png');
await image('im/dw3y5wz6','docs/ppt/slash3_city.png');
await image('im/6xgry54n','art/knight/v7/spin/f10.png');
p.slides.items[0].background.fill='#19172f';
function text(slide,value,x,y,w,h,size=18,color='#1f1a33',bold=false){const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});s.text=value;s.text.style={fontFamily:'Noto Sans KR',fontSize:size,color,bold};return s;}
async function extra(title,shot,body){
 const s=p.slides.add();s.background.fill='#ffffff';
 text(s,title,48,30,864,60,32,'#3b2f5c',true);
 s.images.add({blob:await bytes(shot),contentType:'image/png',fit:'contain',position:{left:48,top:110,width:510,height:287}});
 text(s,body,588,110,324,360,18);
 text(s,'기사쥐 · 컨셉 기획서 v0.5',48,500,500,25,12,'#7a6fa0');
 text(s,String(p.slides.items.length),864,500,48,25,12,'#7a6fa0');
 return s;
}
await extra('풍경 전체 높이를 쓰는 원근 레이어','docs/ppt/city_depth.png',[
 '밤하늘과 스카이라인 분리',
 '원경 건물과 중경 비상계단·배관을 화면 높이로 겹치는 구성',
 '소품 3단과 플레이 바닥, 최전경 기둥과 전선 추가',
 '시차 비율 0.02에서 1.18까지 단계화',
 '멀수록 안개와 흐림 증가, 앞쪽으로 올수록 대비와 선명도 증가',
 '모든 원본은 무명암 플랫, 명암과 픽셀화는 코드 후처리',
].join('\n\n'));
await extra('공격 콜라이더와 피격 콜라이더','docs/ppt/combat_colliders.png',[
 '공격 순간 도형 생성 후 몸 영역과 겹침 검사',
 '기본 베기 사각형, 공중 회전 원형, 내려찍기와 이동 공격 캡슐',
 '일반 적의 돌진·급강하도 동일한 판정 모듈 사용',
 '개굴대왕의 혀·물방울·착지·웅덩이·충격파에도 적용',
 '한 공격은 대상별 한 번 피해, 바닥 위험은 공중 회피',
 '노랑·빨강은 공격, 시안은 몸, 흰색은 발 피격 영역',
].join('\n\n'));
for(let i=0;i<p.slides.items.length;i++){
 const s=p.slides.items[i];
 await fs.writeFile(path.join(BUILD,`${i+1}.png`),new Uint8Array(await (await s.export({format:'png',scale:1})).arrayBuffer()));
}
const draft=path.join(ROOT,'.codex-build/candidate.pptx');await(await PresentationFile.exportPptx(p)).save(draft);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const final=await finalizePresentation({workspaceDir:ROOT,candidatePath:draft,finalPath:FINAL,pythonExecutable:PYTHON,
 integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','4','--require-native-table-slide','13'],
 explicitTotalSlideCount:18,requiredNativeTableOwnerSlides:[4,13],fontPolicy:{basis:'user_request',families:['Noto Sans KR']},verifyArtifactToolImport:true,
 receiptPath:path.join(ROOT,'.codex-build/deck-validation.json')});
console.log(JSON.stringify(final));

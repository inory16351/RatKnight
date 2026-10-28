#!/usr/bin/env bash
# 지하철역 확장 그림 묶음 (Codex CLI). 폴더마다 prompt_<이름>.txt / prompt.txt → png. 로그는 log_*.txt
#   bash tools/gen_subway.sh            전부
#   bash tools/gen_subway.sh <단계>     1 = 숫자·적·지네 전신 / 2 = 배경 3장·지네 부위 / 3 = 바닥·물건·전경
cd "$(dirname "$0")/.." || exit 1
CODEX="bash C:/Dev/NKK_PROJECT/Tools/codex.sh"
run() {   # run <폴더> <프롬프트> <결과> <참고그림>
  (cd "$1" && $CODEX exec --skip-git-repo-check --sandbox workspace-write -i "$4" - < "$2" > "log_${3%.png}.txt" 2>&1; echo "$1/$3: $(ls "$3" 2>/dev/null || echo FAIL)")
}
step() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]; }
ONLY=$1
if step 1; then
  run art/ui/digits prompt.txt sheet.png ref_style.png &
  run art/enemy/roach prompt.txt sheet.png ref_style.png &
  run art/enemy/pigeon prompt.txt sheet.png ref_style.png &
  run art/boss/centipede prompt_full.txt full.png ref_char.png &
  wait
fi
if step 2; then
  for n in back far mid; do run art/bg/subway prompt_$n.txt $n.png ref_char.png & done
  [ -f art/boss/centipede/full.png ] && run art/boss/centipede prompt_parts.txt parts.png full.png &
  wait
fi
if step 3; then
  for n in floor obj front_tall; do run art/bg/subway prompt_$n.txt $n.png ref_char.png & done
  wait
fi
echo done

#!/usr/bin/env bash
# Codex 그림 생성 묶음: 폴더마다 prompt_<이름>.txt → <이름>.png. 한도가 풀릴 시각까지 기다렸다가 돌림
#   bash tools/gen_queue.sh [HH:MM]
# 순서: 도시 5장 · 하수도 2장 · 두꺼비 전신 (병렬) → 두꺼비 부위 시트 (전신을 참고 그림으로)
cd "$(dirname "$0")/.." || exit 1
CODEX="bash C:/Project/NKK_PROJECT/Tools/codex.sh"
if [ -n "$1" ]; then
  while [ "$(date +%H:%M)" \< "$1" ]; do sleep 30; done
fi
run() {   # run <폴더> <이름> <참고그림>
  (cd "$1" && $CODEX exec --skip-git-repo-check --sandbox workspace-write -i "$3" - < "prompt_$2.txt" > "log_$2.txt" 2>&1; echo "$1/$2: $(ls "$2.png" 2>/dev/null || echo FAIL)")
}
for n in back far obj fg floor; do run art/bg/city $n ref_char.png & done
for n in back floor; do run art/bg/sewer $n ref_char.png & done
run art/boss/toad full ref_char.png &
wait
[ -f art/boss/toad/full.png ] && run art/boss/toad parts full.png
echo done

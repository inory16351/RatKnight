# 필름 줄 그림 → 격자로 크게 (확인용): python tools/film_grid.py <이름> <칸 폭> <칸 높이> <열 수> [프레임 번호들 콤마]
import sys
from PIL import Image
name, w, h, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
im = Image.open(f'docs/shots/{name}.png')
n = im.width // w
idx = [int(x) for x in sys.argv[5].split(',')] if len(sys.argv) > 5 else list(range(n))
rows = (len(idx) + cols - 1) // cols
out = Image.new('RGB', (w * cols, h * rows))
for k, i in enumerate(idx): out.paste(im.crop((i * w, 0, (i + 1) * w, h)), ((k % cols) * w, (k // cols) * h))
out.save(f'docs/shots/_{name}_grid.png')

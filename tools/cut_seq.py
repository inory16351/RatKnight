# 순차 프레임 시트 → art/fx/seq/<이름>_<번호>.png
#   python tools/cut_seq.py <시트.png> <열 수> <줄 이름들 콤마>   예) ... 6 hslash,ring,hit
# 칸을 똑같은 크기로 잘라 그대로 저장 (덩어리 테두리로 자르면 프레임마다 기준점이 달라져 재생할 때 흔들림)
# 배경이 투명이 아니면 자홍/흰 배경을 키잉
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut import key_magenta

src, cols, names = sys.argv[1], int(sys.argv[2]), sys.argv[3].split(',')
im = Image.open(src)
rgba = np.array(im.convert('RGBA'))
if (rgba[..., 3] < 20).mean() < 0.2:
    rgb = rgba[..., :3]
    if (np.abs(rgb.astype(int) - [255, 0, 255]).sum(-1) < 90).mean() > 0.2: rgba = key_magenta(rgb)
    else:   # 흰 배경: 밝고 채도 낮은 곳을 투명으로
        mx, mn = rgb.max(-1).astype(int), rgb.min(-1).astype(int)
        bg = (mn > 235) & (mx - mn < 18)
        rgba = np.dstack([rgb, np.where(bg, 0, 255).astype(np.uint8)])
H, W = rgba.shape[:2]
rows = len(names)
out = os.path.join(os.path.dirname(__file__), '..', 'art', 'fx', 'seq')
os.makedirs(out, exist_ok=True)
for r, n in enumerate(names):
    for c in range(cols):
        x0, x1 = W * c // cols, W * (c + 1) // cols
        y0, y1 = H * r // rows, H * (r + 1) // rows
        Image.fromarray(rgba[y0:y1, x0:x1]).save(os.path.join(out, f'{n}_{c}.png'))
    print(n, cols, 'frames', x1 - x0, 'x', y1 - y0)

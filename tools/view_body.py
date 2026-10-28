# 턴어라운드 정면·뒷모습(v4/view_front·view_back)에서 손에 든 칼을 지워 회전용 몸 그림을 만듦 → art/knight/v6/{front,back}_body.png + view_meta.json
# 옆모습 리그의 통그림(full_side_2x)과 같은 배율이 되게 2배로 키움. 칼 자리는 사각형으로 지정하고 주먹(원) 안만 남김 (자동 찾기는 칼끝 이 빠진 자리·가드에서 자꾸 남음)
#   python tools/view_body.py
import os, json, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut import key_magenta

R = os.path.join(os.path.dirname(__file__), '..', 'art', 'knight')
# 2배 그림 좌표: 칼 사각형 (x0, y0, x1, y1), 주먹 가운데·반지름
# 칼 = 날·가드·폼멜 세 사각형 (한 사각형으로 지우면 귀·팔이 잘림)
DOTS = {'front': [(262, 1140, 42)], 'back': [(772, 1140, 42)]}   # 가드 끝에 남는 금색 점
SWORD = {'front': ([(100, 180, 250, 1135), (30, 1105, 255, 1195), (110, 1345, 250, 1500)], (180, 1272), 74),
         'back': ([(800, 180, 950, 1135), (790, 1105, 1030, 1195), (790, 1345, 930, 1500)], (860, 1272), 74)}
meta = {}
for v, (boxes, fist, fr) in SWORD.items():
    im = Image.open(os.path.join(R, 'v4', f'view_{v}.png')).convert('RGB')
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    a = key_magenta(np.array(im))
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    box = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in boxes: box |= (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    keep = np.hypot(xx - fist[0], yy - fist[1]) < fr
    for cx, cy, rr in DOTS[v]: box |= np.hypot(xx - cx, yy - cy) < rr
    a[box & ~keep, 3] = 0
    ys, xs = np.where(a[..., 3] > 128)
    foot = [float(xs[ys > ys.max() - 40].mean()), int(ys.max())]
    Image.fromarray(a).save(os.path.join(R, 'v6', f'{v}_body.png'))
    meta[v] = {'w': W, 'h': H, 'foot': [round(foot[0], 1), foot[1]], 'hand': list(fist)}
    print(v, meta[v])
json.dump(meta, open(os.path.join(R, 'v6', 'view_meta.json'), 'w'), indent=1)

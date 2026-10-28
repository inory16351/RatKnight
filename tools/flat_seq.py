# 순차 이펙트 시트 → 플랫 노랑 플립북 (art/fx/seq/<이름>_<번호>.png)
#   python tools/flat_seq.py art/fx/seq_sheet.png hslash,ring,hit 6
# 1) 자홍 키잉 2) 줄마다 덩어리 6개를 열 투영으로 찾아 '덩어리 중심' 기준 같은 크기 칸으로 자름 (칸 경계에 걸려 잘리지 않게)
# 3) 색을 흰 / 연노랑 / 노랑 3톤으로 단순화, 어두운 잉크·번짐은 제거, 알파는 딱 떨어지게 (그라데이션·글로우 없음)
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut import key_magenta

src, names, cols = sys.argv[1], sys.argv[2].split(','), int(sys.argv[3])
rgb = np.array(Image.open(src).convert('RGB'))
rgba = key_magenta(rgb)
H, W = rgba.shape[:2]
lum = rgba[..., :3] @ np.array([0.3, 0.59, 0.11])
out = np.zeros_like(rgba)
a = rgba[..., 3] > 140
white = a & (lum > 232)
pale = a & (lum > 190) & ~white
yel = a & (lum > 120) & ~white & ~pale
out[white] = (255, 255, 255, 255); out[pale] = (255, 233, 120, 255); out[yel] = (255, 196, 32, 255)
solid = out[..., 3] > 0
D = os.path.join(os.path.dirname(__file__), '..', 'art', 'fx', 'seq')
os.makedirs(D, exist_ok=True)
rows = len(names)
PAD = 14
for r, n in enumerate(names):
    y0, y1 = H * r // rows, H * (r + 1) // rows
    band = solid[y0:y1]
    # 조각(연결 덩어리, 약간 부풀려 흩어진 파편도 묶음)을 가장 가까운 칸 중심에 배정 → 이웃 칸으로 번져도 안 섞임
    from scipy import ndimage as ndi
    lab, nl = ndi.label(ndi.binary_dilation(band, iterations=6))
    centers = [(W * (c + 0.5)) / cols for c in range(cols)]
    own = np.full(lab.shape, -1)
    for l in range(1, nl + 1):
        ys, xs = np.nonzero(lab == l)
        if len(xs) < 150: continue
        own[lab == l] = int(np.argmin([abs(xs.mean() - c) for c in centers]))
    own[~band] = -1
    boxes = []
    for c in range(cols):
        ys, xs = np.nonzero(own == c)
        boxes.append((xs.min(), y0 + ys.min(), xs.max() + 1, y0 + ys.max() + 1))
    masks = [own == c for c in range(cols)]
    cw = max(b[2] - b[0] for b in boxes) + PAD * 2; ch = max(b[3] - b[1] for b in boxes) + PAD * 2
    # 줄 안 모든 프레임이 같은 기준(그림 세로 중심 = 줄 중심)이 되도록 세로는 줄 공통 중심
    cyy = (min(b[1] for b in boxes) + max(b[3] for b in boxes)) // 2
    ch = max(ch, max(b[3] for b in boxes) - min(b[1] for b in boxes) + PAD * 2)
    for i, b in enumerate(boxes):
        cx = (b[0] + b[2]) // 2
        cell = np.zeros((ch, cw, 4), np.uint8)
        xa, ya = cx - cw // 2, cyy - ch // 2
        sx0, sy0 = max(0, xa), max(0, ya); sx1, sy1 = min(W, xa + cw), min(H, ya + ch)
        m = np.zeros((H, W), bool); m[y0:y1] = masks[i]
        piece = np.where(m[..., None], out, 0).astype(np.uint8)
        cell[sy0 - ya:sy1 - ya, sx0 - xa:sx1 - xa] = piece[sy0:sy1, sx0:sx1]
        Image.fromarray(cell).save(os.path.join(D, f'{n}_{i}.png'))
    print(n, len(boxes), 'frames', cw, 'x', ch)

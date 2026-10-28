# 통그림 프레임마다 칼의 손잡이(가드)·칼끝 자리를 찾아 frames/meta.json 에 적음 → 게임에서 통그림을 그릴 때 칼끝 궤적이 그림 속 칼을 따라감
#   python tools/frame_blade.py art/knight/v5/frames
# 칼날 = 채도 낮은 밝은 회색의 가늘고 긴 덩어리(어깨 갑옷도 회색이라 '가장 길쭉한' 덩어리를 고름), 가드 = 칼날 근처 금색 픽셀 무리.
# 칼끝 = 칼날 덩어리에서 가드로부터 가장 먼 점
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

d = sys.argv[1]
meta = {}
for n in sorted(f for f in os.listdir(d) if f.startswith('f') and f.endswith('.png')):
    a = np.array(Image.open(os.path.join(d, n)).convert('RGBA')).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    grey = (al > 128) & (mn > 140) & (mx - mn < 28)
    gold = (al > 128) & (r > 190) & (g > 140) & (g < 215) & (b < 120)
    lab, k = ndimage.label(grey)
    best = None
    for i in range(1, k + 1):
        ys, xs = np.where(lab == i)
        if len(xs) < 80: continue
        P = np.stack([xs, ys], 1).astype(float); c = P.mean(0)
        ev = np.linalg.eigvalsh(np.cov((P - c).T))
        elong = np.sqrt(ev[1] / max(ev[0], 1e-3))
        L = np.sqrt(ev[1]) * 3.4
        score = elong * L
        if best is None or score > best[0]: best = (score, P, c)
    if best is None: print(n, 'no blade'); continue
    _, P, c = best
    gy, gx = np.where(gold)
    G = np.stack([gx, gy], 1).astype(float)
    # 칼날 덩어리 양 끝 중 금색(가드)에 더 가까운 쪽이 손잡이
    u = np.linalg.eigh(np.cov((P - c).T))[1][:, 1]
    t = (P - c) @ u; e0, e1 = P[np.argmin(t)], P[np.argmax(t)]
    if len(G):
        d0, d1 = np.min(np.hypot(*(G - e0).T)), np.min(np.hypot(*(G - e1).T))
        hilt, tip = (e0, e1) if d0 < d1 else (e1, e0)
        near = G[np.hypot(*(G - hilt).T) < 60]
        grip = near.mean(0) if len(near) else hilt
    else: hilt, tip, grip = e0, e1, e0
    h, w = a.shape[:2]
    # 발 = 맨 아래 8% 줄들의 불투명 픽셀 가운데 (칼·망토 끝이 아닌 몸 아래) → 그림을 이 점에 세움
    op = (al > 128) & ~grey
    ys = np.where(op.any(1))[0]; y1 = ys[-1]; band = op[max(0, y1 - int(h * 0.08)):y1 + 1]
    fx = float(np.where(band.any(0))[0].mean())
    meta[n[:-4]] = {'w': w, 'h': h, 'foot': [round(fx, 1), int(y1)], 'tip': [round(float(tip[0]), 1), round(float(tip[1]), 1)], 'grip': [round(float(grip[0]), 1), round(float(grip[1]), 1)]}
    print(n, meta[n[:-4]])
json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), indent=1)

# 통그림 기준 리그 맞추기: 부위 시트에서 자른 부위를 통그림(full_keyed.png) 위에서 크기·각도·위치를 찾아 겹치고,
# 그 결과로 관절 좌표와 기본 자세(rest)를 만든다 → 리그를 rest 자세로 그리면 통그림과 겹침.
#   python tools/fit_rig.py            → art/knight/rig/ (부위 PNG · rig.json · _fit.png 비교 그림)
# 부위 그림은 시트에서 '아래로 늘어진' 모양 (팔다리 0도 = 아래, 몸통·머리 0도 = 똑바로). 위쪽 끝 = 부모 관절.
import json, os
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'art', 'knight')
# RIG_V=v4 → 새 치비 비율 (art/knight/v4/parts_side · v4/full_keyed.png → rig_v4/). 기본은 예전 판 (parts · rig/)
V4 = os.environ.get('RIG_V') == 'v4'
PARTS = os.path.join(ROOT, 'v4', 'parts_side') if V4 else os.path.join(ROOT, 'parts')
OUT = os.path.join(ROOT, 'rig_v4' if V4 else 'rig')
full = np.array(Image.open(os.path.join(ROOT, 'v4' if V4 else 'rig', 'full_keyed.png')).convert('RGBA')).astype(np.float32)

# 찾을 자리: (부위 그림, 통그림 안 범위 x0,y0,x1,y1, 크기 범위, 각도 범위(도, 화면 시계 방향 +))
JOBS = {
    'head':     ('head',     (150, 80, 830, 700),    (1.35, 1.75), (-12, 12)),
    'torso':    ('torso',    (400, 610, 740, 1000),  (1.1, 1.45),  (-10, 10)),
    'hips':     ('hips',     (400, 880, 740, 1200),  (1.0, 1.35),  (-8, 8)),
    'cape':     ('cape',     (220, 610, 640, 1150),  (1.2, 1.5),   (-15, 15)),
    'upperArm': ('upperArm', (440, 670, 680, 1000),  (1.0, 1.35),  (-25, 25)),
    'foreArm':  ('foreArm',  (600, 840, 880, 1040),  (0.9, 1.25),  (-120, -50)),
    'thighN':   ('thigh',    (520, 1040, 700, 1320), (0.7, 1.05),  (-15, 15)),
    'thighF':   ('thigh',    (440, 1040, 640, 1320), (0.7, 1.05),  (-5, 25)),
    'shinN':    ('shin',     (520, 1180, 780, 1460), (0.9, 1.25),  (-10, 10)),
    'shinF':    ('shin',     (400, 1180, 660, 1460), (0.9, 1.25),  (-10, 15)),
    'tail':     ('tail',     (60, 1000, 520, 1260),  (0.95, 1.15), (-15, 15)),
    'sword':    ('sword',    (700, 470, 930, 1130),  (1.1, 1.5),   (-6, 6)),
}

# 새 치비판 (full_side_2x = 턴어라운드 옆모습 2배): 부위 시트가 통그림보다 작게 그려져 크기 범위가 큼. 칼은 시트에서 더 짧게 그려짐
if V4: JOBS = {
    'head':     ('head',     (60, 470, 820, 1150),   (1.6, 1.85), (-8, 8)),
    'torso':    ('torso',    (340, 1060, 740, 1420), (1.0, 1.35), (-10, 10)),
    'hips':     ('hips',     (370, 1290, 740, 1580), (0.85, 1.15), (-8, 8)),
    'cape':     ('cape',     (180, 1060, 660, 1580), (1.1, 1.5),  (-15, 15)),
    'upperArm': ('upperArm', (360, 1100, 620, 1400), (0.6, 1.3),  (-30, 30)),
    'foreArm':  ('foreArm',  (500, 1160, 930, 1420), (0.6, 1.3),  (-120, -50)),
    'thighN':   ('thigh',    (520, 1480, 720, 1700), (0.3, 0.8),  (-15, 15)),
    'thighF':   ('thigh',    (400, 1480, 600, 1700), (0.3, 0.8),  (-5, 25)),
    'shinN':    ('shin',     (500, 1560, 800, 1790), (0.6, 1.2),  (-10, 10)),
    'shinF':    ('shin',     (370, 1560, 620, 1790), (0.6, 1.2),  (-10, 15)),
    'tail':     ('tail',     (30, 1280, 540, 1680),  (1.05, 1.4), (-20, 20)),
    'sword':    ('sword',    (620, 170, 1020, 1540), (1.9, 2.8),  (-6, 6)),
}

def load(n):
    return np.array(Image.open(os.path.join(PARTS, n + '.png')).convert('RGBA')).astype(np.float32)

def xform(img, s, ang):
    # 크기 s 배, 그림 중심 둘레로 ang 도(화면 시계 방향) 회전. 반환: 변환 그림, 원본→변환 2x3 행렬
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), -ang, s)
    c, si = abs(M[0, 0]), abs(M[0, 1])
    W, H = int(w * c + h * si) + 2, int(w * si + h * c) + 2
    M[0, 2] += W / 2 - w / 2; M[1, 2] += H / 2 - h / 2
    out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    return out, M

def fit(part, roi, srng, arng):
    x0, y0, x1, y1 = roi
    R = full[y0:y1, x0:x1]
    Rc, Ra = R[..., :3], (R[..., 3] > 128).astype(np.float32)
    best = None
    for coarse, ss, sa in ((True, 0.05, 3), (False, 0.012, 1)):
        if coarse: S = np.arange(srng[0], srng[1] + 1e-6, ss); A = np.arange(arng[0], arng[1] + 1e-6, sa)
        else: S = np.arange(best[1] - 0.04, best[1] + 0.041, ss); A = np.arange(best[2] - 3, best[2] + 3.1, sa)
        for s in S:
            for a in A:
                t, M = xform(part, s, a)
                if t.shape[0] >= R.shape[0] or t.shape[1] >= R.shape[1]: continue
                m = (t[..., 3] > 128).astype(np.float32)
                if m.sum() < 50: continue
                # 색 차이(가려진 곳이 있어 색 + 실루엣 둘 다) — 템플릿 안쪽 픽셀만
                d = np.zeros((R.shape[0] - t.shape[0] + 1, R.shape[1] - t.shape[1] + 1), np.float32)
                for ch in range(3):
                    d += cv2.matchTemplate(Rc[..., ch], t[..., ch], cv2.TM_SQDIFF, mask=m)
                # 실루엣이 통그림 밖으로 나가면 벌점 (배경 위에 놓인 부분)
                out = cv2.matchTemplate(1 - Ra, m, cv2.TM_CCORR)
                cost = (d / 3 + out * 255 * 255 * 0.6) / m.sum()
                yx = np.unravel_index(np.argmin(cost), cost.shape)
                c = cost[yx]
                if best is None or c < best[0]: best = (c, s, a, (x0 + yx[1], y0 + yx[0]), M, t.shape)
    return best

if __name__ == '__main__':
    res = {}
    for k, (pn, roi, sr, ar) in JOBS.items():
        b = fit(load(pn), roi, sr, ar)
        res[k] = {'part': pn, 'cost': float(b[0]), 's': float(b[1]), 'ang': float(b[2]), 'at': [int(b[3][0]), int(b[3][1])], 'M': b[4].tolist()}
        print(k, pn, 'cost %.0f s %.3f ang %.1f at %s' % (b[0], b[1], b[2], b[3]))
    os.makedirs(OUT, exist_ok=True)
    json.dump(res, open(os.path.join(OUT, 'fit.json'), 'w'), indent=1)

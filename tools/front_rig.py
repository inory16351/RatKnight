# 정면 리그 (옆 리그와 같은 형식): 정면 부위(v6/front)를 칼 지운 정면 그림(v6/front_body.png, 턴어라운드 2배 = 옆 리그 통그림과 같은 배율)에 맞춰
# art/knight/rig_front/ (부위 PNG + rig.json) 로 만듦. 자동 맞춤은 정면 부위가 그림과 비율이 달라 엉뚱하게 맞아서, 격자(_grid_front.png)로 읽은 자리에 직접 맞춤:
#   몸 부위 = 그림 속 사각형(가로세로 따로 늘림), 팔다리 = 위 끝 → 아래 끝을 관절 사이 길이에 맞춤(똑바로 늘어진 모양으로 저장, 0도 = 아래)
#   python tools/front_rig.py
import json, os
import numpy as np, cv2
from PIL import Image

R = os.path.join(os.path.dirname(__file__), '..', 'art', 'knight')
SRC, OUT = os.path.join(R, 'v6', 'front'), os.path.join(R, 'rig_front')
os.makedirs(OUT, exist_ok=True)
WORLD = 0.087   # 옆 리그와 같은 배율 (그림 px → 게임 px)
load = lambda n: np.array(Image.open(os.path.join(SRC, n + '.png')).convert('RGBA'))

def bbox(a):
    ys, xs = np.where(a[..., 3] > 128); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def ends(a):
    m = a[..., 3] > 128; ys = np.where(m.any(1))[0]; y0, y1 = ys[0], ys[-1]
    rc = lambda y: ((np.where(m[y])[0][0] + np.where(m[y])[0][-1]) / 2, (np.where(m[y])[0][-1] - np.where(m[y])[0][0]) / 2)
    cx0, r0 = rc(min(y1, y0 + 6)); cx1, r1 = rc(max(y0, y1 - 6))
    return [cx0, y0 + r0 * 0.9], [cx1, y1 - r1 * 0.9]

parts = {}
def save(name, src, sx, sy):
    a = load(src); x0, y0, x1, y1 = bbox(a); a = a[y0:y1, x0:x1]
    W, H = max(1, round(a.shape[1] * sx)), max(1, round(a.shape[0] * sy))
    Image.fromarray(cv2.resize(a, (W, H), interpolation=cv2.INTER_AREA)).save(os.path.join(OUT, name + '.png'))
    return a
def body(name, src, box, pivot, joints={}):   # box = 그림 속 자리 (x0, y0, x1, y1)
    a = load(src); x0, y0, x1, y1 = bbox(a)
    sx, sy = (box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0)
    save(name, src, sx, sy)
    L = lambda p: [p[0] - box[0], p[1] - box[1]]
    parts[name] = {'file': name + '.png', 'pivot': L(pivot), 'joints': {k: L(v) for k, v in joints.items()}}
def limb(name, src, length, joint):            # 위 끝 = 피벗, 아래 끝 = joint
    a = load(src); x0, y0, x1, y1 = bbox(a); a = a[y0:y1, x0:x1]
    e0, e1 = ends(a); s = length / np.hypot(e1[0] - e0[0], e1[1] - e0[1])
    save(name, src, s, s)
    parts[name] = {'file': name + '.png', 'pivot': [e0[0] * s, e0[1] * s], 'joints': {joint: [e1[0] * s, e1[1] * s]}}

# 정면 그림 좌표 (front_body.png)
NECK, WAIST = (550, 1105), (560, 1340)
SH_L, SH_R, HIP_L, HIP_R = (405, 1192), (715, 1200), (430, 1520), (655, 1520)
d = lambda p, q: float(np.hypot(p[0] - q[0], p[1] - q[1]))
HEAD = 0.88   # 옆 리그(build_rig HEAD)와 같게 머리를 줄임 — 목 기준
hb = lambda b: tuple(NECK[i % 2] + (v - NECK[i % 2]) * HEAD for i, v in enumerate(b))
body('head', 'head', hb((245, 535, 945, 1112)), NECK)
body('headBack', 'headBack', hb((245, 535, 945, 1112)), NECK)
body('torso', 'torso', (385, 1105, 735, 1350), WAIST, {'neck': NECK, 'shoulderL': SH_L, 'shoulderR': SH_R, 'cape': (550, 1160), 'waist': WAIST})
body('hips', 'hips', (330, 1310, 760, 1530), WAIST, {'waist': WAIST, 'hipL': HIP_L, 'hipR': HIP_R, 'hipN': HIP_L, 'tail': (690, 1470)})
body('cape', 'cape', (270, 1150, 800, 1520), (550, 1160))
body('tail', 'tail', (700, 1420, 1010, 1640), (704, 1474))
limb('upperArm', 'upperArm', (d(SH_L, (260, 1280)) + d(SH_R, (775, 1360))) / 2, 'elbow')
limb('foreArm', 'foreArm', 112, 'hand')
limb('handOpen', 'handOpen', 140, 'hand')
limb('thigh', 'thigh', 92, 'knee')
limb('shin', 'shin', 165, 'sole')
foot = [(HIP_L[0] + HIP_R[0]) / 2, 1765]
json.dump({'scale': WORLD, 'foot': foot, 'parts': parts, 'rest': {}}, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
print('ok', list(parts))

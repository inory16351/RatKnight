# 팔다리·칼은 통그림에서 읽은 관절 좌표로 길이·각도를 정확히 맞춤 (자동 탐색은 부위 시트와 통그림 비율이 달라 길이가 어긋남)
#   python tools/fit_manual.py   → fit_auto.json (자동 탐색 결과) 위에 덮어써 fit.json 생성
# 부위는 시트에서 '아래로 늘어진' 모양: 위 끝 → 아래 끝 벡터를 통그림의 (위 관절 → 아래 관절)에 맞춤.
# 길이는 목표 길이, 굵기는 자동 탐색한 크기(s)를 씀 (가로세로 따로 → 'ly' = 길이배율 / 굵기배율)
import json, os, math
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'art', 'knight')
V4 = os.environ.get('RIG_V') == 'v4'   # 새 치비판: rig_v4/fit_auto.json · v4/parts_side · 통그림 = v4/full_side_2x.png
OUT = os.path.join(ROOT, 'rig_v4' if V4 else 'rig')
fit = json.load(open(os.path.join(OUT, 'fit_auto.json')))
def load(n): return np.array(Image.open(os.path.join(ROOT, 'v4', 'parts_side', n + '.png') if V4 else os.path.join(ROOT, 'parts', n + '.png')).convert('RGBA'))

def ends(a):
    m = a[..., 3] > 128
    ys = np.where(m.any(1))[0]; y0, y1 = ys[0], ys[-1]
    def row_c(y):
        xs = np.where(m[y])[0]; return (xs[0] + xs[-1]) / 2, (xs[-1] - xs[0]) / 2
    cx0, r0 = row_c(min(y1, y0 + 6)); cx1, r1 = row_c(max(y0, y1 - 6))
    return np.array([cx0, y0 + r0 * 0.9]), np.array([cx1, y1 - r1 * 0.9]), y0, y1

def tip_ends(a):    # 칼·신발: 맨 위 / 맨 아래 픽셀
    m = a[..., 3] > 128; ys = np.where(m.any(1))[0]
    cx = lambda y: np.where(m[y])[0].mean()
    return np.array([cx(ys[0] + 3), ys[0]]), np.array([cx(ys[-1] - 3), ys[-1]])

# 키 = fit 이름, (부위, 위 관절, 아래 관절, 끝 종류)   좌표 = 통그림(full_side_v3.png) 픽셀
T = {
    'upperArm': ('upperArm', (545, 735), (632, 884), 'ends'),
    'foreArm':  ('foreArm',  (610, 893), (785, 955), 'ends'),
    'thighN':   ('thigh',    (605, 1092), (612, 1248), 'ends'),
    'thighF':   ('thigh',    (515, 1088), (492, 1244), 'ends'),
    'shinN':    ('shin',     (612, 1250), (612, 1385), 'sole'),
    'shinF':    ('shin',     (492, 1245), (492, 1415), 'sole'),
    'sword':    ('sword',    (858, 497), (800, 1045), 'tip'),
}
if V4: T = {   # full_side_2x.png 좌표 (격자 _grid.png 로 읽음)
    'upperArm': ('upperArm', (478, 1164), (511, 1304), 'ends'),
    'foreArm':  ('foreArm',  (511, 1304), (824, 1287), 'ends'),
    'thighN':   ('thigh',    (610, 1518), (610, 1600), 'ends'),
    'thighF':   ('thigh',    (494, 1518), (486, 1600), 'ends'),
    'shinN':    ('shin',     (610, 1600), (618, 1765), 'sole'),
    'shinF':    ('shin',     (486, 1600), (470, 1757), 'sole'),
    'sword':    ('sword',    (791, 216), (841, 1477), 'tip'),   # 큰 칼 (한손검은 (803, 528) · parts_side/sword_arming.png)
}
# 같은 그림을 두 번 쓰는 부위(허벅지·정강이)는 길이를 평균으로 통일
def seg(k): return math.dist(T[k][1], T[k][2])
avg = {'thigh': (seg('thighN') + seg('thighF')) / 2, 'shin': (seg('shinN') + seg('shinF')) / 2}
for k, (pn, a, b, kind) in T.items():
    img = load(pn); e0, e1, _, _ = ends(img)
    if kind == 'sole': _, e1 = tip_ends(img)[0], tip_ends(img)[1]; e1 = np.array([e0[0], tip_ends(img)[1][1]])
    if kind == 'tip': e0, e1 = tip_ends(img)
    L0 = math.dist(e0, e1)
    L = avg.get(pn, seg(k))
    sl = L / L0
    sw = fit[k]['s'] if pn != 'sword' else sl   # 칼은 가로세로 같은 배율(그림 비율 유지)
    if pn in ('thigh', 'shin'): sw = (fit[pn + 'N' if False else k[:-1] + 'N']['s'] + fit[k[:-1] + 'F']['s']) / 2
    d = np.array(b, float) - np.array(a, float)
    ang = math.degrees(math.atan2(-d[0], d[1]))      # 부위 '아래' 벡터(0,1) → 목표 방향, 화면 시계 방향 +
    r = math.radians(ang); R = np.array([[math.cos(r), -math.sin(r)], [math.sin(r), math.cos(r)]])
    S = np.diag([sw, sl])
    A = R @ S
    off = np.array(a, float) - A @ e0
    M = np.hstack([A, off[:, None]])
    fit[k] = {'part': pn, 'cost': 0.0, 's': float(sw), 'ly': float(sl / sw), 'ang': float(ang), 'at': [0, 0], 'M': M.tolist()}
    print(k, 'sw %.3f sl %.3f ang %.1f' % (sw, sl, ang))
json.dump(fit, open(os.path.join(OUT, 'fit.json'), 'w'), indent=1)

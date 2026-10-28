# fit.json(통그림 맞춤) → art/knight/rig/ 부위 PNG + rig.json
# 부위 그림은 맞춤 크기(s)로 줄여 통그림 px 단위로 저장. 관절은 통그림 좌표에서 정한 뒤 각 부위 기준으로 바꿈
# → 리그를 rest 자세로 그리면 통그림과 겹친다. 각도는 rig.js 약속(팔다리 + = 앞으로, 몸통 + = 숙임)으로 바꿔 rest 에 적음.
import json, os
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'art', 'knight')
V4 = os.environ.get('RIG_V') == 'v4'   # 새 치비판 → rig_v4/ (부위 = v4/parts_side)
OUT = os.path.join(ROOT, 'rig_v4' if V4 else 'rig')
fit = json.load(open(os.path.join(OUT, 'fit.json')))
WORLD = 0.085        # 통그림 px → 게임 화면 px (키 약 160px)
SWORD_LONG = 1.0      # 칼을 통그림보다 더 길게
SHORT = {'torso': 0.85, 'hips': 0.9, 'thigh': 0.8, 'shin': 0.85}   # 몸·다리를 더 짧게 (SD 비율)
SWORD_STRETCH = fit['sword'].get('ly', 1.0) * SWORD_LONG  # 시트 칼이 통그림보다 짧게 그려져 날 길이 방향만 늘림
# 팔다리 굵기 (가로 배율): 생성 그림이 너무 앙상해서 실크송·언더월드처럼 단단하게
WIDEN = {}
if V4:   # 치비 그림이 이미 SD 비율이라 줄이지 않음. 통그림 키 약 1264px → 게임 약 110px
    WORLD, SHORT = 0.087, {}

def load(n): return np.array(Image.open(os.path.join(ROOT, 'v4', 'parts_side', n + '.png') if V4 else os.path.join(ROOT, 'parts', n + '.png')).convert('RGBA'))

def ends(a):
    # 세로로 늘어진 부위의 위 끝·아래 끝 관절 (끝에서 반지름만큼 안쪽)
    m = a[..., 3] > 128
    ys = np.where(m.any(1))[0]; y0, y1 = ys[0], ys[-1]
    def row_c(y):
        xs = np.where(m[y])[0]; return (xs[0] + xs[-1]) / 2, (xs[-1] - xs[0]) / 2
    cx0, r0 = row_c(min(y1, y0 + 6)); cx1, r1 = row_c(max(y0, y1 - 6))
    return [cx0, y0 + r0 * 0.9], [cx1, y1 - r1 * 0.9]

def fwd(k, p):
    # 시트 부위 좌표 → 통그림 좌표 (fit 의 변환)
    f = fit[k]; M = np.array(f['M'])
    q = M @ np.array([p[0], p[1], 1.0])
    return [q[0] + f['at'][0], q[1] + f['at'][1]]

def inv(k, q):
    f = fit[k]; M = np.array(f['M']); A = M[:, :2]; b = M[:, 2]
    p = np.linalg.solve(A, np.array([q[0] - f['at'][0], q[1] - f['at'][1]]) - b)
    return [float(p[0]), float(p[1])]

# ---- 통그림 좌표의 관절 ----
J = {}
J['shoulderN'], J['elbow'] = [fwd('upperArm', p) for p in ends(load('upperArm'))]
J['elbowF'], J['hand'] = [fwd('foreArm', p) for p in ends(load('foreArm'))]
J['hipN'], J['kneeN'] = [fwd('thighN', p) for p in ends(load('thigh'))]
J['hipF'], J['kneeF'] = [fwd('thighF', p) for p in ends(load('thigh'))]
J['kneeN2'], _ = [fwd('shinN', p) for p in ends(load('shin'))]
# 발바닥 = 신발 맨 아래, 가로는 다리 기둥 가운데 (신발 앞코 폭 때문에 ends 로는 높게 잡힘)
_sh = load('shin'); _m = _sh[..., 3] > 128; _ys = np.where(_m.any(1))[0]
J['soleN'] = fwd('shinN', [ends(_sh)[0][0], _ys[-1]])
J['kneeF2'], _ = [fwd('shinF', p) for p in ends(load('shin'))]
t = load('tail'); ys, xs = np.where(t[..., 3] > 128); rx = xs.max()
root_y = ys[xs > rx - 12].mean()
J['tail'] = fwd('tail', [rx - 12, root_y])
c = load('cape'); ys, xs = np.where(c[..., 3] > 128); top = ys.min()
J['cape'] = fwd('cape', [xs[ys < top + 25].mean(), top + 18])
J['neck'] = [544, 1106] if V4 else [585, 640]
J['waist'] = [560, 1345] if V4 else [590, 905]
for k, v in J.items(): print(k, [round(x) for x in v])

# ---- 부위 저장 (크기 s) ----
def save(name, src, s, sy=None):
    a = load(src)
    h, w = a.shape[:2]
    W, H = max(1, round(w * s)), max(1, round(h * (sy or s)))
    Image.fromarray(cv2.resize(a, (W, H), interpolation=cv2.INTER_AREA)).save(os.path.join(OUT, name + '.png'))
    return s, sy or s

parts = {}
# 비율 (실크송풍 SD): 머리 크게 · 다리 짧게. 통그림 겹침 비교는 이 값만큼 어긋남
HEAD, LEG = (0.88 if V4 else 1.0), {'thigh': 1.0, 'shin': 1.0}
def put(name, key, joints_full, pivot_full, src=None, scale=None, ly=None):
    if ly is None: ly = fit[key].get('ly', 1.0)
    ly *= SHORT.get(name, 1.0)
    src = src or fit[key]['part']
    s = (scale or fit[key]['s']) * (HEAD if name.startswith('head') else 1)
    sx, sy = save(name, src, s, s * ly)
    L = lambda q: (lambda p: [p[0] * sx, p[1] * sy])(inv(key, q))
    parts[name] = {'file': name + '.png', 'pivot': L(pivot_full), 'joints': {k: L(v) for k, v in joints_full.items()}}

put('head', 'head', {}, [J['neck'][0], J['neck'][1]])
put('torso', 'torso', {'neck': J['neck'], 'shoulderN': J['shoulderN'], 'shoulderF': [J['shoulderN'][0] + 14, J['shoulderN'][1] + 4], 'cape': J['cape']}, J['waist'])
put('hips', 'hips', {'waist': J['waist'], 'hipN': J['hipN'], 'hipF': J['hipF'], 'tail': J['tail']}, J['waist'])
CAPE_BIG = 1.5 if V4 else 1.6      # 망토를 크게 → 꼬마쥐(몬스터가 더 큰 세계) 느낌
put('cape', 'cape', {}, J['cape'], scale=fit['cape']['s'] * CAPE_BIG)
put('tail', 'tail', {}, J['tail'])
# 망토를 위·가운데·아래 세 조각으로 나눔 (바람에 조각마다 따로 꺾이며 휘날림). 이어지는 끝은 겹쳐 잘라 꺾여도 틈이 안 보이게
def split_cape():
    cp = parts['cape']; im = Image.open(os.path.join(OUT, cp['file'])).convert('RGBA'); W, H = im.size
    px, py = cp['pivot']
    cuts = [(0, 0.52), (0.36, 0.82), (0.66, 1.0)]       # 각 조각의 세로 범위(비율)
    mids = [0.46, 0.76]                                   # 관절(조각 사이 꺾이는 자리)
    names = ['cape', 'capeB', 'capeC']
    for i, (a, b) in enumerate(cuts):
        y0, y1 = int(H * a), int(H * b)
        Image.fromarray(np.array(im)[y0:y1]).save(os.path.join(OUT, names[i] + '.png'))
        piv = [px, py - y0] if i == 0 else [px, H * mids[i - 1] - y0]
        joints = {}
        if i < 2: joints['next'] = [px, H * mids[i] - y0]
        parts[names[i]] = {'file': names[i] + '.png', 'pivot': piv, 'joints': joints}
split_cape()
put('upperArm', 'upperArm', {'elbow': J['elbow']}, J['shoulderN'])
put('foreArm', 'foreArm', {'hand': J['hand']}, J['elbowF'])
s_th = (fit['thighN']['s'] + fit['thighF']['s']) / 2
put('thigh', 'thighN', {'knee': J['kneeN']}, J['hipN'], scale=s_th)
put('shin', 'shinN', {'sole': J['soleN']}, J['kneeN2'])
put('handOpen', 'foreArm', {'hand': J['hand']}, J['elbowF'], src='handOpen')
put('headHurt', 'head', {}, [J['neck'][0], J['neck'][1]], src='headHurt')

# 칼: 날 방향(세로)만 늘림. 쥔 자리 = 손 관절
f = fit['sword']; s = f['s']
SWORD_WIDE = 1.2 if V4 else 2.3      # 칼을 캐릭터 키만큼 크게 (큰 칼)
#     # 칼 굵기(가로)도 키워 캐릭터에 비해 커 보이게
sx, sy = save('sword', 'sword', s * SWORD_WIDE, s * SWORD_WIDE * SWORD_STRETCH)
p = inv('sword', J['hand'])
# 늘린 만큼 손잡이 기준으로 맞춤: 시트 칼의 손잡이 가운데(가드 아래)를 쥔 자리로
a = load('sword'); m = a[..., 3] > 128; ys, xs = np.where(m)
gy = ys.min() + (ys.max() - ys.min()) * (0.77 if V4 else 0.74)   # 손잡이 = 아래쪽 20% 근처
parts['sword'] = {'file': 'sword.png', 'pivot': [(xs.min() + xs.max()) / 2 * sx, gy * sy], 'joints': {}}

# ---- rest 자세 (통그림 각도) ----
cw = {k: fit[k]['ang'] for k in fit}
rest = {
    'torso': cw['torso'], 'head': cw['head'] - cw['torso'],
    'nU': cw['torso'] - cw['upperArm'], 'nF': cw['upperArm'] - cw['foreArm'],
    'sw': cw['foreArm'] - cw['sword'],
    'nT': -cw['thighN'], 'nS': cw['thighN'] - cw['shinN'],
    'fT': -cw['thighF'], 'fS': cw['thighF'] - cw['shinF'],
    'fU': cw['torso'] - cw['upperArm'] - 6, 'fF': cw['upperArm'] - cw['foreArm'],
    'cape': -cw['cape'], 'tail': -cw['tail'], 'swL': 1,
}
# 발 기준점: 엉덩이 높이(다리를 곧게 폈을 때) 만큼 waist 아래
th, sh, hp = parts['thigh'], parts['shin'], parts['hips']
hipH = (th['joints']['knee'][1] - th['pivot'][1]) + (sh['joints']['sole'][1] - sh['pivot'][1]) + (hp['joints']['hipN'][1] - hp['pivot'][1])
rig = {'scale': WORLD, 'neckDrop': 16 if V4 else 0, 'foot':[J['waist'][0], J['waist'][1] + hipH], 'parts': parts, 'rest': {k: round(v, 2) for k, v in rest.items()}}
json.dump(rig, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
print('rest', rig['rest'])

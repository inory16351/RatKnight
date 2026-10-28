# fit.json 결과를 통그림 위에 겹쳐 보기: 왼쪽 = 부위만 합성, 오른쪽 = 통그림 + 부위 테두리
import json, os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from fit_rig import xform, load, ROOT, OUT, V4
fit = json.load(open(os.path.join(OUT, 'fit.json')))
full = Image.open(os.path.join(ROOT, 'v4' if V4 else 'rig', 'full_keyed.png')).convert('RGBA')
comp = Image.new('RGBA', full.size, (255, 255, 255, 255))
over = Image.new('RGBA', full.size, (255, 255, 255, 255)); over.alpha_composite(full)
ov = np.array(over)
order = ['tail', 'cape', 'thighF', 'shinF', 'hips', 'torso', 'thighN', 'shinN', 'head', 'upperArm', 'sword', 'foreArm']
cols = [(255,0,0),(0,160,0),(0,0,255),(255,0,255),(0,200,200),(255,140,0)]
for i, k in enumerate(order):
    f = fit[k]
    t, _ = xform(load(f['part']), f['s'], f['ang'])
    comp.alpha_composite(Image.fromarray(t.astype(np.uint8)), tuple(f['at']))
    m = (t[..., 3] > 128).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs: cv2.drawContours(ov, [c + np.array(f['at'])], -1, cols[i % 6] + (255,), 2)
out = Image.new('RGB', (full.width * 2, full.height), 'white')
out.paste(comp.convert('RGB'), (0, 0)); out.paste(Image.fromarray(ov).convert('RGB'), (full.width, 0))
out.crop((0, 0, full.width * 2, full.height)).resize((full.width, full.height // 2)).save(os.path.join(OUT, '_fit.png'))

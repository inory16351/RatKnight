# 사각형으로 잘라 키잉: python tools/crop_rects.py <시트> <출력 폴더> 이름=x0,y0,x1,y1 ...
# 이름 끝이 * 면 그 사각형 안의 덩어리를 따로따로 (이름0, 이름1 …)
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
from cut import key_magenta

sheet, out = sys.argv[1], sys.argv[2]
rgba = key_magenta(np.array(Image.open(sheet).convert('RGB')))
os.makedirs(out, exist_ok=True)
def save(name, a):
    m = a[..., 3] > 20
    ys, xs = np.where(m)
    a = a[max(0, ys.min() - 4):ys.max() + 5, max(0, xs.min() - 4):xs.max() + 5]
    Image.fromarray(a).save(os.path.join(out, name + '.png')); print(name, a.shape[1], a.shape[0])
for arg in sys.argv[3:]:
    name, r = arg.split('=')
    x0, y0, x1, y1 = map(int, r.split(','))
    a = rgba[y0:y1, x0:x1].copy()
    if name.endswith('*'):
        lab, n = ndimage.label(ndimage.binary_dilation(a[..., 3] > 40, iterations=3))
        objs = sorted([s for s in ndimage.find_objects(lab)], key=lambda s: (s[0].start, s[1].start))
        k = 0
        for i, s in enumerate(objs):
            if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) < 600: continue
            b = a[s].copy(); save(f'{name[:-1]}{k}', b); k += 1
    else:
        save(name, a)

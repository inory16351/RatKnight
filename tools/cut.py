# 시트 자르기: 자홍(#FF00FF) 배경을 투명으로 바꾸고 덩어리마다 잘라 저장.
#   python tools/cut.py <시트.png> <출력 폴더> [--grow 12] [--names a,b,c] [--min 400]
# 덩어리 = 알파를 grow px 만큼 부풀려 붙은 것끼리 한 덩어리 (가까운 파편 무리는 하나로). 위→아래, 왼→오른 순서.
# --names 를 주면 그 순서대로 이름, 없으면 00.png, 01.png … + _index.png(번호 붙은 미리보기)
import sys, os, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def key_magenta(rgb):
    # 자홍과의 거리로 알파 + 가장자리 자홍 번짐 제거
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    mag = np.minimum(r, b) - g                      # 자홍 정도 (0~255)
    a = np.clip(1 - (mag - 40) / 120, 0, 1)         # 40 밑 = 불투명, 160 위 = 투명
    # 번짐 제거: 자홍 성분만큼 r·b 를 g 쪽으로 당김
    spill = np.clip(mag, 0, None) * (1 - a)
    r2 = np.clip(r - spill * 0.9, 0, 255); b2 = np.clip(b - spill * 0.9, 0, 255)
    out = np.dstack([r2, g, b2, a * 255]).astype(np.uint8)
    # 반투명 가장자리의 남은 자홍기: 알파 낮은 곳은 색을 안쪽 이웃 색으로
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('out')
    ap.add_argument('--grow', type=int, default=12)
    ap.add_argument('--min', type=int, default=400)
    ap.add_argument('--pad', type=int, default=6)
    ap.add_argument('--names', default='')
    ap.add_argument('--rowtol', type=int, default=120)
    a = ap.parse_args()
    src = Image.open(a.sheet)
    im = np.array(src.convert('RGB'))
    al = np.array(src.convert('RGBA'))[..., 3]
    # 이미 투명 배경이면(ChatGPT 결과) 그 알파를 그대로, 아니면 자홍 키잉
    rgba = np.dstack([im, al]) if (al < 20).mean() > 0.2 else key_magenta(im)
    mask = rgba[..., 3] > 40
    grown = ndimage.binary_dilation(mask, iterations=a.grow)
    lab, n = ndimage.label(grown)
    objs = ndimage.find_objects(lab)
    items = []
    for i, sl in enumerate(objs):
        m = (lab[sl] == i + 1) & mask[sl]
        if m.sum() < a.min: continue
        items.append((sl, i + 1))
    # 줄 단위 정렬: 세로 중심이 rowtol 안이면 같은 줄
    items.sort(key=lambda it: (it[0][0].start + it[0][0].stop) / 2)
    rows, cur = [], []
    for it in items:
        cy = (it[0][0].start + it[0][0].stop) / 2
        if cur and abs(cy - (cur[0][0][0].start + cur[0][0][0].stop) / 2) > a.rowtol: rows.append(cur); cur = []
        cur.append(it)
    if cur: rows.append(cur)
    order = [it for r in rows for it in sorted(r, key=lambda it: it[0][1].start)]
    names = [s for s in a.names.split(',') if s] if a.names else []
    os.makedirs(a.out, exist_ok=True)
    prev = Image.fromarray(rgba).convert('RGBA'); dr = ImageDraw.Draw(prev)
    for k, (sl, lb) in enumerate(order):
        y0, y1 = max(0, sl[0].start - a.pad), min(im.shape[0], sl[0].stop + a.pad)
        x0, x1 = max(0, sl[1].start - a.pad), min(im.shape[1], sl[1].stop + a.pad)
        crop = rgba[y0:y1, x0:x1].copy()
        keep = ndimage.binary_dilation(lab[y0:y1, x0:x1] == lb, iterations=1)
        crop[..., 3] = (crop[..., 3] * keep).astype(np.uint8)
        name = names[k] if k < len(names) else f'{k:02d}'
        if name.startswith('-'): continue
        Image.fromarray(crop).save(os.path.join(a.out, name + '.png'))
        dr.rectangle([x0, y0, x1, y1], outline=(255, 0, 0, 255), width=3); dr.text((x0 + 4, y0 + 4), name, fill=(255, 0, 0, 255))
        print(name, x0, y0, x1 - x0, y1 - y0)
    bg = Image.new('RGBA', prev.size, (60, 60, 70, 255)); bg.alpha_composite(prev)
    bg.convert('RGB').save(os.path.join(a.out, '_index.png'))


if __name__ == '__main__':
    main()

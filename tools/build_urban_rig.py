"""시작 장비 스킨을 기존 리그 캔버스·관절에 맞춤. 모션 표와 뼈 길이는 유지."""
import json
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'art/knight/rig_v4'
SRC = ROOT / 'art/knight/v7/parts_raw'
OUT = ROOT / 'art/knight/rig_urban'
PALETTE = ['#a79785', '#eab2aa', '#253d70', '#444255', '#a2a8ac', '#d3d4c9', '#616d78', '#906444', '#bd8147', '#3aa2b8', '#eee4c7', '#332a30']


def flat(im):
    a = np.asarray(im.convert('RGBA')).copy()
    # 생성 이미지의 점 같은 표면 질감은 재료의 단색 면으로 통합.
    rgb = np.asarray(im.convert('RGB').filter(ImageFilter.MedianFilter(5))).astype(float)
    p = np.array([tuple(bytes.fromhex(s[1:])) for s in PALETTE], dtype=float)
    idx = ((rgb[:, :, None] - p) ** 2).sum(3).argmin(2)
    a[:, :, :3] = p[idx].astype(np.uint8)
    navy = (rgb[:, :, 2] > rgb[:, :, 1] * 1.05) & (rgb[:, :, 2] > rgb[:, :, 0] * .85) & (rgb.max(2) < 140)
    a[navy, :3] = (37, 61, 112)
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a)


def main():
    OUT.mkdir(exist_ok=True)
    definition = json.loads((OLD / 'rig.json').read_text())
    from cut import key_magenta
    full_source = ROOT / 'art/knight/v7/full_side_generated.png'
    full = flat(Image.fromarray(key_magenta(np.asarray(Image.open(full_source).convert('RGB')))))
    full.save(ROOT / 'art/knight/v7/full_side.png')
    concept = ROOT / 'art/knight/v7/concept'
    concept.mkdir(exist_ok=True)
    full.crop(full.getbbox()).save(concept / 'hero.png')
    keep = {'head', 'headHurt', 'tail', 'thigh'}
    for n, part in definition['parts'].items():
        if n.startswith('cape'):
            continue
        if n in keep:
            shutil.copy2(OLD / part['file'], OUT / part['file'])
            continue
        old = Image.open(OLD / part['file'])
        new = flat(Image.open(SRC / f'{n}.png'))
        new = new.resize(old.size, Image.Resampling.LANCZOS)
        new.save(OUT / part['file'])
    # 기존 망토 분절의 원본 높이와 겹침 범위를 그대로 재사용.
    cape = flat(Image.open(SRC / 'cape.png')).resize((401, 514), Image.Resampling.LANCZOS)
    for n, lo, hi in [('cape', 0, .52), ('capeB', .36, .82), ('capeC', .66, 1)]:
        old = Image.open(OLD / f'{n}.png')
        cape.crop((0, int(514 * lo), 401, int(514 * hi))).resize(old.size).save(OUT / f'{n}.png')
    # 손의 중심과 자루 한가운데를 같은 소켓으로 맞춤.
    definition['parts']['foreArm']['joints']['hand'] = [76, 365]
    definition['parts']['sword']['pivot'] = [73 / 147 * 542, 351 / 439 * 1644]
    (OUT / 'rig.json').write_text(json.dumps(definition, indent=2), encoding='utf-8')
    front_old = ROOT / 'art/knight/rig_front'
    front_out = ROOT / 'art/knight/rig_front_urban'
    front_out.mkdir(exist_ok=True)
    front_def = json.loads((front_old / 'rig.json').read_text())
    for n, part in front_def['parts'].items():
        if n in keep or n == 'headBack':
            shutil.copy2(front_old / part['file'], front_out / part['file'])
        else:
            old = Image.open(front_old / part['file'])
            flat(Image.open(ROOT / 'art/knight/v7/front_raw' / f'{n}.png')).resize(old.size, Image.Resampling.LANCZOS).save(front_out / part['file'])
    (front_out / 'rig.json').write_text(json.dumps(front_def, indent=2), encoding='utf-8')
    spin_old = ROOT / 'art/knight/v6spin/frames'
    spin_out = ROOT / 'art/knight/v7/spin'
    spin_out.mkdir(exist_ok=True)
    for i in range(9, 13):
        old = Image.open(spin_old / f'f{i}.png')
        flat(Image.open(ROOT / 'art/knight/v7/spin_raw' / f'f{i}.png')).resize(old.size, Image.Resampling.LANCZOS).save(spin_out / f'f{i}.png')
    shutil.copy2(spin_old / 'meta.json', spin_out / 'meta.json')
    print(OUT)


if __name__ == '__main__':
    main()

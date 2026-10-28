# 생성 원본의 미세한 그라데이션·광택을 제거해 셰이더 입력용 플랫 팔레트 PNG로 정리.
# 사용: python tools/flatten_source.py 입력.png 출력.png [색상 수]
import sys
from PIL import Image


def main():
    src, out = sys.argv[1], sys.argv[2]
    colors = int(sys.argv[3]) if len(sys.argv) > 3 else 16
    im = Image.open(src).convert('RGBA')
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    rgb = im.convert('RGB')
    flat = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    result = flat.convert('RGBA')
    result.putalpha(alpha)
    result.save(out)
    print(out, result.size, colors)


if __name__ == '__main__':
    main()

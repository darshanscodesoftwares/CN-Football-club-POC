#!/usr/bin/env python3
"""
Prepares the About section's image from ../replace-image/about/beach-sunset.png:

1. Builds the background mask (the image's plain white surround) with build-blend-mask.mjs, the
   one the page uses to lay its own colour and pattern over that surround.
2. Colour-grades the photo into the site's palette: a gradient map from deep navy through royal
   blue and aqua to the kit's lime highlights, with white staying white, laid over the original so
   part of the photo's own colour survives. The grade is applied to the photo only:
   the surround keeps its original neutral whites (blended by the mask), so it still melts into
   the page instead of showing as a tinted box.

The original is only read. Needs numpy + opencv-python-headless (the .venv). From the project root:
  .venv/bin/python scripts/build-about-image.py
"""
import os, subprocess
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'replace-image', 'about', 'beach-sunset.png')
OUT = os.path.join(ROOT, 'public', 'media', 'about')
# luminance -> colour stops (navy shadows, royal blue, aqua mids, lime highlights, white)
STOPS = [(0.0, '#0b1f3a'), (0.38, '#2a5bd7'), (0.66, '#5fd1c4'), (0.86, '#d4f56a'), (0.96, '#f7fde8'), (1.0, '#ffffff')]
# how much of the original colour survives under the map (0 = pure gradient map, 1 = untouched)
KEEP = 0.4


def bgr(hex_colour):
    h = hex_colour.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (4, 2, 0)]


def main():
    os.makedirs(OUT, exist_ok=True)
    matte_path = os.path.join(OUT, 'beach-matte.png')
    subprocess.run(['node', os.path.join(ROOT, 'scripts', 'build-blend-mask.mjs'), '--input', SRC, '--output', matte_path,
                    '--seed', 'top,left,bottom,right'], check=True)

    img = cv2.imread(SRC, cv2.IMREAD_COLOR).astype(np.float32) / 255
    lum = 0.0722 * img[:, :, 0] + 0.7152 * img[:, :, 1] + 0.2126 * img[:, :, 2]
    xs = [s for s, _ in STOPS]
    mapped = np.dstack([np.interp(lum, xs, [bgr(c)[ch] for _, c in STOPS]) for ch in range(3)]).astype(np.float32)
    graded = KEEP * img + (1 - KEEP) * mapped

    # the surround keeps its original whites: feathered mask so the grade fades out at its edge
    surround = cv2.imread(matte_path, cv2.IMREAD_UNCHANGED)[:, :, 3].astype(np.float32) / 255
    surround = cv2.GaussianBlur(surround, (0, 0), 6)[:, :, None]
    out = graded * (1 - surround) + img * surround
    path = os.path.join(OUT, 'beach-graded.jpg')
    cv2.imwrite(path, (out * 255).clip(0, 255).astype(np.uint8),
                [cv2.IMWRITE_JPEG_QUALITY, 92, cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])
    print(f'{os.path.relpath(path, ROOT)} {os.path.getsize(path) // 1024} KB, mask {os.path.relpath(matte_path, ROOT)}')


if __name__ == '__main__':
    main()

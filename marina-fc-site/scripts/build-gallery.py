#!/usr/bin/env python3
"""
Prepares the "Life at <club>" gallery photos from ../replace-image/gallery (free Pexels photos):
web-sized JPEGs (longest side 1600 px) and the 180x132 thumbnails for the rail. A three-photo
slide's thumbnail is the three photos side by side, split by 1 px white lines, each cropped
around its own subject (the same focus the slide uses). The originals are only read.

Needs numpy + opencv-python-headless (the same .venv as build-team.py). From the project root:
  .venv/bin/python scripts/build-gallery.py
Captions and alt text live in src/sections/gallery/galleryData.ts; keep the two in step.
"""
import glob, os
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'replace-image', 'gallery')
OUT = os.path.join(ROOT, 'public', 'media', 'gallery')
LONG_SIDE = 1600
QUALITY = 82
THUMB_W, THUMB_H = 180, 132

# slide id -> photos as (output name, source file, focus x, focus y); focus is 0..1 in the photo
SLIDES = [
    ('01-squad', [('01-squad', 'pexels-sagarsintan-17390395.jpg', 0.5, 0.72)]),
    ('02-squads', [('02-senior-squad', 'pexels-535150482-16543116.jpg', 0.5, 0.5),
                   ('02-youth-squad', 'pexels-kyi-htetlinn-2160738647-37173194.jpg', 0.5, 0.55),
                   ('02-walking-out', 'pexels-kampus-8941571.jpg', 0.58, 0.45)]),
    ('03-dribbling', [('03-dribbling', 'pexels-rdne-7187841.jpg', 0.52, 0.6)]),
    ('04-goalkeeping', [('04-high-catch', 'pexels-davide-gargiulo-1110686865-23365812.jpg', 0.48, 0.4),
                        ('04-diving-save', 'pexels-franco-monsalvo-252430633-32205615.jpg', 0.54, 0.45),
                        ('04-full-stretch', 'pexels-nicu-ene-461475639-31067777.jpg', 0.45, 0.55)]),
    ('05-training', [('05-training', 'pexels-omar-ramadan-1739260-30726603.jpg', 0.5, 0.45)]),
    ('06-match-day', [('06-on-the-ball', 'pexels-franco-monsalvo-252430633-38116721.jpg', 0.5, 0.55),
                      ('06-into-the-tackle', 'pexels-franco-monsalvo-252430633-38116836.jpg', 0.5, 0.55),
                      ('06-shielding', 'pexels-franco-monsalvo-252430633-38454980.jpg', 0.52, 0.55)]),
    ('07-grassroots', [('07-grassroots', 'pexels-havi3-2151430069-33660564.jpg', 0.5, 0.7)]),
    ('08-drills', [('08-warm-up', 'pexels-franco-monsalvo-252430633-32205424.jpg', 0.45, 0.5),
                   ('08-pole-drill', 'pexels-franco-monsalvo-252430633-39423285.jpg', 0.5, 0.33),
                   ('08-recovery', 'pexels-laura-rincon-318039951-24279972.jpg', 0.45, 0.6)]),
]


def cover(img, w, h, fx, fy):
    """Scale to cover w x h, then crop around the focus point."""
    ih, iw = img.shape[:2]
    s = max(w / iw, h / ih)
    img = cv2.resize(img, (max(w, round(iw * s)), max(h, round(ih * s))), interpolation=cv2.INTER_AREA)
    ih, iw = img.shape[:2]
    x = min(max(round(fx * iw - w / 2), 0), iw - w)
    y = min(max(round(fy * ih - h / 2), 0), ih - h)
    return img[y:y + h, x:x + w]


def save(path, img):
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, QUALITY, cv2.IMWRITE_JPEG_PROGRESSIVE, 1,
                            cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])


def main():
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, '*.jpg')) + glob.glob(os.path.join(OUT, '*.webp')):
        os.remove(old)
    total = 0
    for slide, photos in SLIDES:
        strips = []
        widths = [THUMB_W] if len(photos) == 1 else [59, 59, 60]
        for (name, file, fx, fy), sw in zip(photos, widths):
            img = cv2.imread(os.path.join(SRC, file), cv2.IMREAD_COLOR)
            ih, iw = img.shape[:2]
            s = min(1, LONG_SIDE / max(iw, ih))
            web = cv2.resize(img, (round(iw * s), round(ih * s)), interpolation=cv2.INTER_AREA)
            path = os.path.join(OUT, f'{name}.jpg')
            save(path, web)
            total += os.path.getsize(path)
            strips.append(cover(img, sw, THUMB_H, fx, fy))
            print(f'{name:22s} {web.shape[1]}x{web.shape[0]}  {os.path.getsize(path) // 1024} KB')
        gap = np.full((THUMB_H, 1, 3), 255, np.uint8)
        thumb = strips[0] if len(strips) == 1 else np.hstack([strips[0], gap, strips[1], gap, strips[2]])
        save(os.path.join(OUT, f'{slide}-thumb.jpg'), thumb)
    print(f'total {total / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()

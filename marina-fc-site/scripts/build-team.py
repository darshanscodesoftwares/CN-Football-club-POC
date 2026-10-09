#!/usr/bin/env python3
"""
Prepares the "Our coaches" section from the client's files in Reference/coaches:
the team portrait, one transparent cutout per person and their content cards.

1. Aligns each cutout to its person in the portrait (SIFT features + RANSAC similarity
   transform: scale, rotation, position), so the cutout can sit exactly over them.
2. Builds the hover outlines from the aligned silhouettes. Where people overlap, the one standing
   in front wins (measured: Masthan is in front of Mohan, Vijay in front of Sathish). Along the
   Masthan/Vijay strip it alternates (his arm is in front, Vijay's shirt beside it), so there each
   pixel goes to whichever cutout matches the portrait better, smoothed into clean shapes.
3. Trims the cutouts' transparent margins (no visible change) and saves web copies:
   portrait as full-colour JPEG, cutouts as WebP with alpha. The originals are only read.
4. Writes src/sections/team/teamLayout.json for the component.

Needs numpy + opencv-python-headless (e.g. python3 -m venv .venv && .venv/bin/pip install
numpy opencv-python-headless), plus ffmpeg-static from node_modules. Run from the project root:
  .venv/bin/python scripts/build-team.py
"""
import json, os, subprocess, sys, tempfile
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'Reference(can_refer_for_design)', 'coaches')
OUT_MEDIA = os.path.join(ROOT, 'public', 'media', 'team')
OUT_JSON = os.path.join(ROOT, 'src', 'sections', 'team', 'teamLayout.json')
FFMPEG = os.path.join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')

PORTRAIT = 'Marina FC Team Portrait.png'
BACK_TO_FRONT = ['mohan', 'sathish', 'vijay', 'masthan']
PEOPLE = [  # left to right in the portrait
    ('mohan', 'Mohan/P-4.png'),
    ('masthan', 'Masthan Maharaj/P-3.png'),
    ('vijay', 'Vijay/P-2.png'),
    ('sathish', 'Sathish/P_1.png'),
]


def run(args):
    subprocess.run(args, check=True)


def align(base_gray, cut):
    sift = cv2.SIFT_create(nfeatures=20000)
    kb, db = sift.detectAndCompute(base_gray, None)
    gray = cv2.cvtColor(cut[:, :, :3], cv2.COLOR_BGR2GRAY)
    mask = cv2.erode((cut[:, :, 3] > 200).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    kc, dc = sift.detectAndCompute(gray, mask)
    good = [a for a, b in cv2.BFMatcher().knnMatch(dc, db, k=2) if a.distance < 0.75 * b.distance]
    src = np.float32([kc[g.queryIdx].pt for g in good])
    dst = np.float32([kb[g.trainIdx].pt for g in good])
    M, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=20000, confidence=0.999)
    pts = src[inliers.ravel() == 1]
    err = np.linalg.norm((M[:, :2] @ pts.T).T + M[:, 2] - dst[inliers.ravel() == 1], axis=1)
    return M, int(inliers.sum()), float(np.median(err))


def polygon_from_mask(mask, W, H, eps=1.6):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    poly = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
    return ', '.join(f'{x / W * 100:.2f}% {y / H * 100:.2f}%' for x, y in poly), len(poly)


def main():
    os.makedirs(OUT_MEDIA, exist_ok=True)
    base = cv2.imread(os.path.join(SRC, PORTRAIT), cv2.IMREAD_COLOR)
    H, W = base.shape[:2]
    base_gray = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY)
    base_i = base.astype(int)

    layout = {'portrait': {'src': '/media/team/portrait.jpg', 'matte': '/media/team/portrait-matte.png', 'width': W, 'height': H}, 'people': {}}
    warped_alpha, diff = {}, {}
    tmp = tempfile.mkdtemp()
    for pid, rel in PEOPLE:
        cut = cv2.imread(os.path.join(SRC, rel), cv2.IMREAD_UNCHANGED)
        M, n_in, err = align(base_gray, cut)
        s = float(np.hypot(M[0, 0], M[1, 0]))
        angle = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
        # trim transparent margins (alpha > 0 keeps every visible pixel)
        ys, xs = np.where(cut[:, :, 3] > 0)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        trimmed = cut[y0:y1, x0:x1]
        png = os.path.join(tmp, f'{pid}.png')
        cv2.imwrite(png, trimmed)
        run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '90',
             '-compression_level', '6', '-pix_fmt', 'yuva420p', os.path.join(OUT_MEDIA, f'{pid}.webp')])
        # where the trimmed cutout's top-left lands in the portrait
        px, py = (M[:, :2] @ np.array([x0, y0])) + M[:, 2]
        tw, th = x1 - x0, y1 - y0
        warped = cv2.warpAffine(cut, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        warped_alpha[pid] = warped[:, :, 3]
        diff[pid] = np.abs(warped[:, :, :3].astype(int) - base_i).mean(axis=2)
        layout['people'][pid] = {
            'cutout': {'src': f'/media/team/{pid}.webp', 'width': tw, 'height': th},
            'place': {
                'left': round(px / W * 100, 3), 'top': round(py / H * 100, 3),
                'width': round(s * tw / W * 100, 3), 'rotate': round(angle, 3),
            },
        }
        print(f'{pid:8s} scale {s:.4f} rotate {angle:+.3f} at ({px:.1f}, {py:.1f}) inliers {n_in} reprojection {err:.2f}px trimmed {tw}x{th}')

    # ownership: back-to-front painting, then the mixed Masthan/Vijay strip by smoothed best match
    ids = [p for p, _ in PEOPLE]
    solid = {p: warped_alpha[p] > 128 for p in ids}
    owner = np.full((H, W), -1, np.int8)
    for p in BACK_TO_FRONT:
        owner[solid[p]] = ids.index(p)
    strip = solid['masthan'] & solid['vijay']
    lead = cv2.blur((diff['masthan'] - diff['vijay']).astype(np.float32), (31, 31))
    owner[strip & (lead > 0)] = ids.index('vijay')
    owner[strip & (lead <= 0)] = ids.index('masthan')
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    for i, p in enumerate(ids):
        region = (owner == i).astype(np.uint8)
        region = cv2.morphologyEx(region, cv2.MORPH_OPEN, kernel)
        region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, kernel)
        poly, n = polygon_from_mask(region, W, H)
        ys, xs = np.where(region > 0)
        layout['people'][p]['hit'] = f'polygon({poly})'
        layout['people'][p]['box'] = {
            'left': round(xs.min() / W * 100, 2), 'right': round(xs.max() / W * 100, 2),
            'top': round(ys.min() / H * 100, 2), 'bottom': round(ys.max() / H * 100, 2),
        }
        print(f'{p:8s} outline {n} points, box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}')

    run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', os.path.join(SRC, PORTRAIT), '-pix_fmt', 'yuvj444p', '-q:v', '3',
         os.path.join(OUT_MEDIA, 'portrait.jpg')])
    # Matte: the portrait's plain white background only. The flood fill would leak into the bright
    # white shirt, so every aligned silhouette (plus a few px) is cut out of it.
    raw = os.path.join(tmp, 'matte.png')
    run(['node', os.path.join(ROOT, 'scripts', 'build-blend-mask.mjs'), '--input', os.path.join(SRC, PORTRAIT),
         '--output', raw, '--seed', 'top,left,right'])
    matte = cv2.imread(raw, cv2.IMREAD_UNCHANGED)[:, :, 3]
    people = np.zeros((H, W), np.uint8)
    for p in ids:
        people |= (warped_alpha[p] > 24).astype(np.uint8)
    people = cv2.dilate(people, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    matte[people > 0] = 0
    out = np.zeros((H, W, 4), np.uint8)
    out[:, :, 3] = matte
    cv2.imwrite(os.path.join(OUT_MEDIA, 'portrait-matte.png'), out, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print(f'matte: background {matte.astype(bool).mean() * 100:.1f}% of the portrait (people excluded)')
    with open(OUT_JSON, 'w') as f:
        json.dump(layout, f, indent=2)
        f.write('\n')
    print('layout ->', os.path.relpath(OUT_JSON, ROOT))


if __name__ == '__main__':
    sys.exit(main())

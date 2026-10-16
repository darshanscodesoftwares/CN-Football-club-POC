# CN Football Club website (pitch template, based on the Marina FC demo)

Interactive demo site for Marina Football Club, Chennai: "Grassroots to Competitive".
Built with Vite, React and TypeScript, using Lenis smooth scrolling, Anime.js, React Bits
components (with GSAP and Motion) and Three.js.

The app is in [`marina-fc-site/`](marina-fc-site).

## Run it

```bash
cd marina-fc-site
npm install
npm run dev        # local dev server
npm run dev:lan    # also reachable from a phone on the same Wi-Fi
npm run build      # type-check, then production build into dist/
npm run lint
```

## What's on the page

- Hero: scroll-scrubbed video with three switchable versions (round button next to "Skip intro",
  or open `?video=google-vis` / `?video=gemini-new`).
- About, the "Life at Marina FC" gallery, "Our coaches" and the footer.
- A small 3D football cursor on mouse and trackpad devices.

## Media and source files

Everything the site loads is committed under `marina-fc-site/public/media` (about 190 MB,
mostly the hero's video frames).

The source material is **not** in this repo: client references, the original videos and the
coach photos live in the local folders next to `marina-fc-site/` (see `.gitignore`). The scripts
that rebuild media from them only work where those folders exist:

- `npm run frames:hero` rebuilds the hero video frames.
- `npm run matte:about` and `npm run matte:footer` rebuild the background-colour masks.
- `scripts/build-team.py` rebuilds the coaches layout and cutouts (needs Python with numpy and
  opencv-python-headless).

## Placeholders still waiting on the client

The crest is a vector stand-in for the official logo, and venue names are generic. The email
address needs confirming, the social, privacy and terms links point to `#`, and the goalkeeping
gallery slide uses stills from the hero video.

# VectorGalaxy

VectorGalaxy is a lightweight browser arcade shooter optimized for Vercel deployment.

## Vercel-optimized setup

- Root entry point is `index.html` for reliable static hosting.
- Original source file `vector-galaxy.html` is kept in-repo.
- Serverless leaderboard API at `api/highscores.js`.
- Optional Vercel KV-backed global high scores.
- Open Graph and Twitter tags included for social previews.
- SVG favicon and OG image at `/favicon.svg` and `/og-image.svg`.

## Deploy on Vercel

1. Import this repository into Vercel.
2. (Optional but recommended) Add **Vercel KV** and configure:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Deploy.

If KV is not configured, gameplay still works and keeps a local best score in the browser.

## Local run

Open `index.html` directly, or run any static file server and open the app.

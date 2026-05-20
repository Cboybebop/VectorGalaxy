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
2. Deploy once so the project is created.

## Create the high score database (Vercel KV)

1. In Vercel, open your project dashboard.
2. Go to **Storage** → **Create Database**.
3. Choose **KV** (not Blob / Postgres), pick a name (for example `vector-galaxy-kv`), then create it.
4. In the KV database page, click **Connect Project** and select this project/environment(s).
5. Confirm the KV environment variables are available in your project:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
6. Redeploy the project so the function uses the new environment variables.

After this, highscores are persisted globally through `/api/highscores`.

### Using `vercil_`-prefixed env keys

If you already created variables named:
- `vercil_KV_REST_API_URL`
- `vercil_KV_REST_API_TOKEN`

this project now supports them directly as a fallback. You can keep those names, though the standard Vercel KV names are still recommended (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).


If KV is not configured, gameplay still works and keeps a local best score in the browser.

## Local run

Open `index.html` directly, or run any static file server and open the app.

> Note: Vercel Blob and Vercel KV are different products. This high score API uses **Vercel KV REST**.

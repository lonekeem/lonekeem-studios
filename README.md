# Lone Keem Studios — demo

Create your own character, then make and watch short AI-generated series
(episodes made of 5–25 s clips). **This build is a demo:** no accounts, no API
keys, no payments. "Generating" a clip shows a short progress animation and
returns one of the bundled sample clips.

**Live:** https://lonekeem.github.io/lonekeem-studios/

## What's in the demo

| Screen | What works |
| --- | --- |
| **Watch** | Vertical swipe feed, auto-plays the visible episode, multi-clip episodes play in order, like, report (with reasons) + block, "AI-generated" label on every video |
| **Create** | Scene prompt, model picker (Auto recommended + choose your own, labelled by strength), length 5/10 s (15/20/25 s locked), quality 480p (720p/1080p locked), character lock / voice lock / co-star toggles, live credit cost, fake progress, cancel = refund |
| **Dance copy** | *Coming soon* demo: pick a reference video (stays on device), audio-removed notice, consent checkbox |
| **Character** | Name, @handle, look description, optional avatar photo (resized and stored locally) |
| **My series** | Clip library, create series, build episodes from clips (reorder), publish to the Watch feed, play an episode or a whole series in order |
| **Settings** | Earn credits (notifications, invite a friend, join the community — each once), Rate us (no reward), language, fade UI, blocked users, Free plan, merge accounts, feedback/terms/privacy placeholders, log out, delete account |
| **Credits** | 500 demo credits to start, +50 free every day, history in the credits sheet |

Everything is stored in the browser's `localStorage` (key `lks-demo-v1`).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/lonekeem-studios/
npm run build      # static site in dist/
```

Deploys automatically to GitHub Pages on every push to `main`
(`.github/workflows/deploy.yml`). `vite.config.js` sets the base path to
`/<repo-name>/`; set `BASE_PATH=/` when hosting at a domain root (e.g. Vercel).

## Switching from demo to real generation

All generation goes through **one function**: `generateClip()` in
[`src/lib/generateClip.js`](src/lib/generateClip.js):

```js
generateClip({ prompt, model, length, quality, character, options, onProgress, signal })
  // → { id, url, prompt, model, length, quality, createdAt, demo }
```

It already has a `real` mode that calls `POST /api/generate` and then polls
`GET /api/status?id=…` on your own backend. The provider key must stay on the
server — never put it in a `VITE_*` variable (those end up in the public JS).

Recommended path (**Vercel + fal.ai**):

1. Create a fal.ai account and an API key.
2. Create a Vercel project from this repo. Copy `api-example/api/` to `api/` at
   the repo root (Vercel turns each file into a serverless function).
3. In Vercel → Settings → Environment Variables add `FAL_KEY` (and optionally
   `ALLOWED_ORIGIN=https://lonekeem.github.io`). For Grok Imagine, add
   `XAI_API_KEY` and call xAI's video API in `generate.js`.
4. Build the frontend with:
   ```
   VITE_GEN_MODE=real
   VITE_API_BASE=https://<your-project>.vercel.app
   ```
   (either as GitHub Actions env vars in the build step, or host the whole thing on
   Vercel with `BASE_PATH=/` and `VITE_API_BASE=` empty.)
5. Check the model endpoint ids in `api-example/api/generate.js` against
   fal.ai's current model list, and tune prices in `src/lib/models.js`.

Before going public with real generation you also need: real accounts/auth,
server-side credit balances (the localStorage balance is only for the demo),
prompt + output moderation, rate limits, and real Terms/Privacy pages.

## Sample media

The eight clips in `public/clips/` are abstract placeholder videos generated
for this project with FFmpeg's built-in test sources (gradients, fractal,
cellular automata). They contain no third-party footage and may be used freely.

## Notes

Model names (Seedance, MiniMax, Wan, Kling, Grok Imagine) appear as plain text
labels only, for comparison; no logos are used and no models are called in the demo.

# Lone Keem Studios — demo

Create your own character, then make and watch short AI-generated series
(episodes made of 5–25 s clips). **This build is a demo:** no accounts, no API
keys, no payments. "Generating" a clip shows a short progress animation and
returns one of the bundled sample clips.

**Live:** https://lonekeem.github.io/lonekeem-studios/

## What's in the demo

*Your character. Your series.* The violet **LKS** monogram is the brand mark.

**Look: a movie studio.** Bold condensed Anton headlines over a clean Manrope body (both self-hosted via Fontsource), squared ticket-stub chips, a bottom dock with a raised clapperboard **Action** button, director's slates, camera-lens cards, film strips with sprocket holes, and a letterboxed, film-grain "Now showing" feed. The currency is **Reels**.

| Screen | What works |
| --- | --- |
| **Welcome + Casting file** | First-run welcome, then your lead's **Casting file**: one scrolling dossier with an ID card (photo, name, @handle, Draft/Cast stamp, an index) and four numbered sections on a film-perforated edge. **01 Headshot**: describe and generate a portrait (45 reels), switch styles or upload a photo with consent, and flip between takes. **02 Voice reel**: browser voices on a tape-deck player with a waveform (30 reels to save). **03 Backstory**: a guided Q&A with eight questions (Origin Story → Fears), each with a **Punch it up / Write one for me** button. **04 Profile**: name, unique @handle, up to 3 traits, bio and collab setting. +100 welcome reels. |
| **Showing (feed)** | Vertical swipe feed of letterboxed "Now showing" cards with a marquee, **S1 · E3** episode codes, film grain, an "AI-generated" label and a bottom action bar (like, remix, episodes, report). Tap the series name for its page, **Previously on…** on episode 2+ for a quick catch-up, and **Remix** to put your own character in the scene. |
| **Action → Single shot** | A director's slate (production, roll, scene, take), your starring lead, the action prompt, **Pick your camera** (a grid of lens cards; **Director's pick** matches one to your scene), running time, film stock, **Lock my lead / Lock the voice / Cast a co-star**, a live reel budget, and **Cut!** = refund. Remixes credit "Remix of @creator" on the clip. |
| **Action → Storyboard** | A film-strip timeline of 3–6 frames (Opening → Build → Twist → Cliffhanger). Tap a frame to edit its prompt, length, camera and mood, drag it by its handle (touch works) or use the arrows to reorder. **Outline it** fills empty frames. **Roll all scenes** renders every scene and publishes the episode into a new or existing series. |
| **Library** | **Continue watching** (resume, next episode, or new from series you follow), Following, Discover, My clips and My series. Each series page has a cover, a follow button, Play/Continue and an episode list with progress bars. |
| **Episode viewer** | Episode 2+ starts with a "Previously on…" recap (skippable). At the end there's an "Up next" card, and watch progress is saved. |
| **Cast** | Your lead's profile, versions and a **Share card**: a 1080×1350 card (portrait, name, @handle, traits, bio) to download or send with the phone's share sheet. |
| **Remix rules** | Each creator's collab setting is respected: **Allow** = remix right away, **Request** = send a request, **Private** = remixes off. |
| **Studio (settings)** | Free reels, language, fade UI, blocked users, plan, feedback, log out, delete account. |
| **Polish** | Skeleton loaders, page transitions, haptic taps (on phones that support it) and friendly empty states. |

### What's demo / fake

- Clips are bundled sample videos; no AI model runs.
- Portraits are drawn on a canvas from your description.
- The voice is your browser's built-in text-to-speech.
- "Punch it up" is a template writing pass, not an AI model.
- Reels aren't real money.
- Remix requests auto-approve after 4 seconds.
- Recaps are put together from episode prompts.
- Other creators and series are seed data.
- Nothing leaves your device.

Everything is stored in the browser's `localStorage` (key `lks-demo-v1`).

## Android app (Capacitor)

The same app ships as an Android app (`com.lonekeemstudios.app`, "Lone Keem Studios") using [Capacitor](https://capacitorjs.com). It works offline: the web build is bundled inside the app.

- **Look:** purple LKS adaptive icon and splash (sources in `assets/`, generated with `@capacitor/assets`), dark purple status and navigation bars, portrait only.
- **Back button:** closes the open sheet or player first, then steps up a screen (an episode goes back to Library, sub-screens to their tab, other tabs to Showing). On Showing it exits the app.
- **Sharing:** the character card uses Android's share sheet, and Download saves it to *Documents › Lone Keem Studios*.
- The native build uses base `/`, while the website keeps `/lonekeem-studios/`.

Needs Node 22+, JDK 21 and the Android SDK (`ANDROID_HOME`):

```bash
npm run android:debug     # → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:release   # → android/app/build/outputs/bundle/release/app-release.aab (signed)
npx cap open android      # optional: open in Android Studio
```

**Release signing.** `android/app/build.gradle` reads an upload keystore from a `keystore.properties` file *outside the repo* (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Set `LKS_KEYSTORE_PROPS=/path/to/keystore.properties` to point at it. Keystores and `keystore.properties` are git-ignored, so never commit them. Without the file, `bundleRelease` produces an unsigned bundle.

To regenerate icons and splash after editing `assets/`: `npx capacitor-assets generate --android --iconBackgroundColor '#0f0a1a' --splashBackgroundColor '#0f0a1a' --splashBackgroundColorDark '#0f0a1a'`.

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

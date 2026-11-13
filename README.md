# FrameForge Renderer

Cloud renderer for FrameForge 60-second vertical stickman shorts (1080×1920, 30 FPS, 1,800 frames).
Each film renders as six independent, verified 300-frame chunks on free standard GitHub-hosted Linux runners, then is assembled losslessly into one H.264/AAC MP4 with its soundtrack added once.

**Run:** Actions → *Render 60-second short (six chunks)* → *Run workflow* → project file (e.g. `production/ba5390/render-project.json`).
Verified chunks are reused automatically; re-running only renders what is missing. Download the `complete-*` artifact when finished.

Current project: *British Airways Flight 5390* (`src/ba5390`, `public/ba5390`).

© FrameForge Studio. All rights reserved. Source is visible for rendering transparency only; no licence is granted.

## Workflows (all manual except the audit; free standard `ubuntu-24.04` runners only)

| Workflow | What it does |
|---|---|
| *Render 60-second short (six chunks)* | Final 1080×1920 render. Reuses every verified chunk; only missing chunks render. |
| *Build Blender assets (manual)* | Runs the project's `blenderScript` in Blender 4.2.3 and commits the GLBs to the film branch (never `main`). |
| *Preview render (manual, low-res)* | 360×640 motion preview of the real timeline, full-HD key stills, a contact sheet and a joined preview with sound. Artifacts only. |
| *Keep a finished video permanently* | Copies a verified `complete-*` artifact into a draft release, which does not expire and is visible only to collaborators. |
| *Public repository privacy audit* | On every push: no-reply commit identities only, no emails/tokens/keys in files, temporary import secrets absent. |

### Adding a film
1. Add `src/<film>/`, `public/<film>/`, `scripts/<film>/` and register the composition in `src/Root.tsx`.
2. Add `production/<film>/render-project.json` with `composition`, a unique `artifactPrefix` (`claude-<film>-chunk`),
   `assetDirectories`, `sourceDirectories: ["src/<film>"]`, `soundtrack`, `outputFilename` and optionally `blenderScript`.
   `sourceDirectories` keeps each film's chunk key independent of other films.
3. Build assets → preview → final render, each started manually on the film branch.

## BA5390 history

Chunks 0–3 were imported and verified in [run 43347999624](https://github.com/yanusmag-cpu/frameforge-renderer/actions/runs/43347999624);
chunks 4–5 rendered and the film was assembled and verified in [run 43348256215](https://github.com/yanusmag-cpu/frameforge-renderer/actions/runs/43348256215).
The one-time importer and its expiring artifact-URL secrets have been removed. No personal access token was ever installed here.

The renderer uses standard `ubuntu-24.04` runners in this public repository,
with at most two chunk jobs running together. No paid runner or paid service is enabled.
No account spending limit was changed; public standard GitHub-hosted runners are free.

On iPhone: open **Actions → Render 60-second short (six chunks) → the latest run**.
When assembly succeeds, open its **Artifacts** section and download `complete-*`.
Unzip in Files and open `British-Airways-Flight-5390-60s.mp4`.
Assembly checks all 1,800 decoded frames in order, the five joins, H.264/AAC,
1080×1920, 30 FPS, 60 seconds, and the complete soundtrack added once.

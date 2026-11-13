# FrameForge Renderer

Cloud renderer for FrameForge 60-second vertical stickman shorts (1080×1920, 30 FPS, 1,800 frames).
Each film renders as six independent, verified 300-frame chunks on free standard GitHub-hosted Linux runners, then is assembled losslessly into one H.264/AAC MP4 with its soundtrack added once.

**Run:** Actions → *Render 60-second short (six chunks)* → *Run workflow* → project file (e.g. `production/ba5390/render-project.json`).
Verified chunks are reused automatically; re-running only renders what is missing. Download the `complete-*` artifact when finished.

Current project: *British Airways Flight 5390* (`src/ba5390`, `public/ba5390`).

© FrameForge Studio. All rights reserved. Source is visible for rendering transparency only; no licence is granted.

## BA5390 imported chunks and safe retries

The first four chunks (frames 0–1199) were imported and fully verified in
[import run 43347999624](https://github.com/yanusmag-cpu/frameforge-renderer/actions/runs/43347999624).
The public renderer's BA5390 source and assets match the source used for these chunks.
Only chunks 4 and 5 (frames 1200–1799) need rendering. Leave `force_chunk` at `none`.
If an imported chunk cannot be verified, the workflow stops instead of rerendering it.
Retry failed jobs; successful chunks are also reusable across workflow runs while their artifacts remain available.

The one-time import used four expiring, read-only artifact URLs stored as secrets.
No private-repository personal token or App token was installed in this repository.
The transfer grants are removed after import. The importer requires fresh grants to run again.
Only the intended movie segments and integrity manifests were published.

The renderer uses standard `ubuntu-24.04` runners in this public repository,
with at most two chunk jobs running together. No paid runner or paid service is enabled.
No account spending limit was changed; public standard GitHub-hosted runners are free.

On iPhone: open **Actions → Render 60-second short (six chunks) → the latest run**.
When assembly succeeds, open its **Artifacts** section and download `complete-*`.
Unzip in Files and open `British-Airways-Flight-5390-60s.mp4`.
Assembly checks all 1,800 decoded frames in order, the five joins, H.264/AAC,
1080×1920, 30 FPS, 60 seconds, and the complete soundtrack added once.

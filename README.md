# FrameForge Renderer

Cloud renderer for FrameForge 60-second vertical stickman shorts (1080×1920, 30 FPS, 1,800 frames).
Each film renders as six independent, verified 300-frame chunks on free standard GitHub-hosted Linux runners, then is assembled losslessly into one H.264/AAC MP4 with its soundtrack added once.

**Run:** Actions → *Render 60-second short (six chunks)* → *Run workflow* → project file (e.g. `production/ba5390/render-project.json`).
Verified chunks are reused automatically; re-running only renders what is missing. Download the `complete-*` artifact when finished.

Current project: *British Airways Flight 5390* (`src/ba5390`, `public/ba5390`).

© FrameForge Studio. All rights reserved. Source is visible for rendering transparency only; no licence is granted.

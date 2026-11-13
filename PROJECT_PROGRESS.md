# Public renderer handoff — BA5390

## Completed and verified

- Existing Claude renderer preserved; BA5390 source/assets match the private source used for the completed segments (17 files checked).
- Imported chunks 0, 1, 2, 3: frames 0–1199, four 300-frame H.264 1080×1920/30 FPS segments.
- Import run **43347999624** succeeded for all four jobs. Original file SHA256 and all decoded frame hashes verified before re-keying.
- Public render fingerprint: `0aef223de43bb12c7b88b0dd`.
- No new personal token required. Transfer used artifact-specific expiring download URLs; all four temporary secrets have been deleted.
- Public pipeline checks (TypeScript, lint, tests) passed.
- All four imported chunks were reused in run **43348256215**, with the actual render steps skipped.
- Full original 60-second stereo 48 kHz soundtrack present: measured −15.98 LUFS, −1.87 dBTP before AAC encoding.
- Only standard public Ubuntu runners, bounded concurrency 2; no paid service enabled or spending limit changed.

## Running / pending — do not restart completed chunks

[Render and assembly run 43348256215](https://github.com/yanusmag-cpu/frameforge-renderer/actions/runs/43348256215)

This run renders only chunks 4 and 5 (frames 1200–1799). Then the existing assembly job automatically joins all six segments, adds the soundtrack once, verifies every decoded frame and all joins, and uploads one complete movie.

The final movie has **not yet been verified or delivered** at this checkpoint. Check this run before dispatching anything else. If a job fails, inspect its error and retry failed jobs; do not force rerender imported chunks.

Expected final file: `British-Airways-Flight-5390-60s.mp4` in the run's `complete-*` artifact. On iPhone, download the ZIP from Actions → run → Artifacts, then unzip in Files.

The missing private-run jobs were never started because GitHub reported billing/spending restrictions. This public run avoids private-runner minutes without raising any spending limit.

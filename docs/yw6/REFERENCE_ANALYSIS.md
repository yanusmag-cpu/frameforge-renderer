# Reference analysis — two uploaded screen recordings (internal)

Method: ffprobe metadata; every frame decoded at 10 fps (235 + 231 frames) and analysed in numpy (frame-to-frame
difference, colour-histogram distance for cuts, phase correlation for camera translation, caption-strip changes);
contact sheets at 0.5 s and full-resolution crops for character measurement; audio decoded to 16 kHz mono and measured
(EBU R128, astats, STFT band energy, autocorrelation pitch, envelope syllable peaks). Phone UI (status bar, side buttons,
handle/title, control-centre screens at the end of each clip) was ignored. I measured the audio numerically; I cannot listen.

## Container facts
| | Recording A ("prisoner tunnels into a bank") | Recording B ("samurai camp, bomb") |
|---|---|---|
| Duration | 23.60 s | 23.12 s |
| Video | HEVC 1170×2532, variable frame rate, 985 frames (avg 41.9 fps, nominal 59.94) | HEVC 1170×2532, VFR, 990 frames (avg 42.9 fps) |
| Audio | AAC 44.1 kHz stereo | AAC 44.1 kHz stereo |
| Video area | 9:16 picture 1170×2080 starting ~5.5 % from the top | same |

Both are excerpts (≈23 s) of ~60 s Shorts; the last ~1 s of each is the phone's control centre.

## Shot breakdown (cuts = histogram jump > 0.3 or frame difference > 30; times in the recording)
**A** · 0.0–1.5 cell corner, prisoner with head-lamp and shovel, window sun-shaft; slow push-in · 1.5–3.2 down into the
dug hole (debris, transition through the floor) · 3.2–4.7 cutaway cross-section of a street: buildings above, coloured
soil strata, tunnel line below; slow lateral track · 4.7–6.7 pops up through the vault floor: low angle, gold vault
door with gauges, lid/coin lifted; fast push to face · 6.7–10.2 vault wide, lamp, money; character walks/turns ·
10.2–11.5 back to street cutaway, tracking along the tunnel · 11.5–13.8 prison canteen, three inmates at a round table
(cards, chips, TV) · 14.0–17.2 corridor, guards behind bars, strong window light, money-filled bunk reveal · 17.2–20.3 vault
again, grabbing cash · 20.3–22.7 night cell, big close character in foreground, glowing hole with loot below (payoff/loop).
**B** · 0.0–0.3 close character (end of previous beat) · 0.3–3.0 black bomb rolls in foreground, night camp behind
(low angle, moon) · 3.0–6.0 campfire bench with three samurai, smoke column · 6.0–8.6 aerial wide: castle town, army
camp ("10,000") · 8.6–11.9 rampart in moonlight, samurai holds bomb · 11.9–15.2 close-ups, bomb presented · 15.2–18.6
tent interior: captain and soldier on patterned carpet, armour stand, lanterns · 18.6–19.1 gatehouse interior with
paper lanterns · 19.1–22.3 runs out under the moon, back to the camp with the bomb rolling toward the fire.

Pacing: ~9 shots per 23 s in each → **mean shot ≈ 2.6 s** (range 0.5–4.5 s). Only 1 (A) and 6 (B) of ~230 sampled frames are
near-static (mean pixel change < 1/255): **the camera or a character is always moving**. Camera translation detected in 41 % of
A's frame pairs (tracking/dolly) and 12 % of B's (B uses more locked-off staging with character motion).

## How the look is built
- 3D environments with physically-lit materials (brass, steel, brick, canvas, carpet) and real perspective; 2D flat-shaded
  characters standing inside them with contact shadows. Sets are dense: 15–40 distinct props visible per wide shot.
- Lighting: one strong motivated key (window shaft / moon / lanterns / campfire) + coloured ambient; warm highlights
  (#ffc27a–#ffe2a8) against cool shadows (blue-violet #3a3f7a–#5a5e9a); never neutral grey. Practical lights glow.
- Depth: foreground objects (bars, bunk, bomb, table) frequently frame the subject; distant layers desaturated by haze.
  Mild depth of field on close shots.
- Characters: round head ≈ torso width; head ≈ 40–45 % of figure height; capsule/bean torso carries the costume (stripes,
  sash, buttons, collar); limbs are thin lines; outline ≈ 3 % of head diameter; faces are minimal (brow, eyes, mouth,
  accessories like shades, head-lamp, goatee, hats carry identity).
- Captions: 1–2 words at a time, heavy white sans with dark stroke, ~70 % down the 9:16 frame, pop on each word.
- Transitions: hard cuts on narration beats; "travel" transitions (into a hole, along a tunnel) instead of effects.

## Audio (measured)
| | A | B |
|---|---|---|
| Integrated loudness | −14.0 LUFS | −13.6 LUFS |
| Loudness range | 1.8 LU | 2.0 LU |
| True-ish peak / RMS | −2.3 dBFS / −17.0 dB | −1.2 dBFS / −16.6 dB |
| Syllable rate | 4.1 /s (≈ 2.7 words/s) | 4.2 /s (≈ 2.8 words/s) |
| Narrator pitch median, p10–p90 | 208 Hz, 138–302 Hz = **13.6 semitones** | 195 Hz, 132–286 Hz = **13.3 semitones** |
| Silence > 150 ms | none (music/ambience bed is continuous; floor −34 dB) | none (floor −37 dB) |
| Low band (30–200 Hz) vs voice band | −1.7 dB | +0.2 dB |
| Air band (5–8 kHz) vs voice band | −11 dB | −9 dB |

Reading: a fast, very animated delivery (wide pitch swings), heavily compressed and loud, with a continuous bed under it.
Tail/reverb could not be isolated numerically because the bed fills every gap.

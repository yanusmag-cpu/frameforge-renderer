# YunoWorld STYLE BIBLE (v6 direction)

The old thin-limbed stickman in a red hoodie is retired for all new videos. Targets below are measured from the reference
recordings (see REFERENCE_ANALYSIS.md) and adapted into an original look; nothing is traced or copied.

## 1. Characters — "YunoWorld Folk" (original)
| Spec | Target |
|---|---|
| Height | 4.5 rig units (1 unit = 0.417 m on set) |
| Head | rounded "squircle" 1.55 u wide × 1.45 u tall, centre 3.75 u above ground → **head ≈ 34 % of height** (a bit less chibi than the reference's 40–45 %, so bodies read) |
| Skin | real skin tones (peach / tan / brown), soft cheek blush, small ears and a button nose — the reference uses white heads with no nose |
| Torso | rounded bean 1.1 u wide at the hips, costume on the torso: collar, buttons, belts, sashes, pockets, 2–3 fold lines |
| Limbs | full tapered limbs, never sticks: upper arm 0.27 u → forearm 0.22 u, thigh 0.31 u → shin 0.25 u; sleeves and trousers coloured; elbows/knees bend by 2-bone IK |
| Hands | 4 shapes (fist, open, point, hold) + thumb; mitten silhouette readable at phone size |
| Outline | 0.075 u dark brown-black (#1b140f) ≈ 4.8 % of head width; inner lines 60 % of that |
| Shading | flat base + one cel shadow on the side away from the key (−22 % value) + optional warm rim on the key side |
| Face | eyes = white ovals with large dark pupils and a catch-light; upper/lower lids; thick rounded brows; 8+ mouth shapes (smile, grin with teeth, O, open shout, grimace, wavy, frown, smirk); blink every 2.5–5 s; sweat, tears, shock lines, blush, ? mark |
| Emotions required | terror, confusion, excitement, anger, suspicion, relief, shock (+ the 37 shared expression presets) |
| Silhouette test | every character identifiable by hat + outfit colour as a solid black shape at 120 px tall |

## 2. Environments
- Real 3D sets, scene-specific architecture and props, 20+ distinct objects in every wide shot; foreground / midground /
  background layers in every composition; haze on the far layer.
- Materials: wood, canvas, metal, foliage with colour variation and texture; avoid untextured flat boxes for anything near camera.
- Vegetation: layered (canopy, palms, ferns, grass tufts, vines), wind sway.

## 3. Colour and light
- One motivated key per shot (sun shaft, lamp, fire, window), warm (#ffc27a–#ffe2a8); shadows/ambient cool (#3a3f7a–#6a74c0).
- Practical lights glow (bloom threshold ~1.3). Grade: saturation 1.12–1.2, contrast 1.06–1.1, lifted violet shadows, vignette 0.2–0.28.
- Never flat grey; every shot has a focal point with the strongest contrast on the face or story prop.

## 4. Camera and editing
- Average shot 2.5–3 s (reference mean 2.6 s); every shot moves (push, dolly, track, crane) or has a strong character action.
- Mix: establishing wide → medium reaction → close-up on the payoff; at least one low angle and one high/overhead per film.
- Cuts land on narration beats; "travel" transitions (through objects, along a path) instead of spins or effects. Shake only on impacts.

## 5. Animation
- Anticipation (2–6 frames) before big moves, overshoot/settle after (settle curve), secondary motion on hats/sashes/props.
- Walks with weight (body bob, arm swing); hands land on props; characters look at what matters (gaze leads turns by 3–5 frames).

## 6. Captions
- 1–2 words at a time, bold white with a dark stroke, ~65–70 % down the frame; numbers and names highlighted in yellow.

## 7. Narration and mix
| Spec | Target |
|---|---|
| Voice | one original synthetic storyteller (no cloning of any real or identifiable narrator) |
| Pace | 2.5–2.8 words/s with short dramatic pauses (0.25–0.6 s) at reveals |
| Expressiveness | pitch range ≥ 8 semitones p10–p90 per line (reference ≈ 13) |
| Sound | dry, close-mic: high-pass 75 Hz, gentle low-mid cut, light presence, de-ess, 2–3:1 compression; **no reverb, no doubling, no stereo widening** |
| Loudness | master −14 LUFS integrated (reference −13.6 / −14.0), peaks ≤ −1 dBFS; narration ≥ 8 dB above the bed while speaking |
| Bed | continuous ambience + music; SFX on exact actions; no constant loud music, no stock whooshes on every cut |

## 8. Format
1080×1920, 30 fps, 1800 frames, H.264 + AAC 48 kHz, rendered in six 300-frame chunks.

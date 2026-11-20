#!/usr/bin/env python3
"""Write the timestamped storyboard + script for each YunoWorld v3 film (docs/yw4/<film>_storyboard.md) from the cue table."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; C = json.load(open(ROOT / 'scripts/yw4/cues.json')); S = json.load(open(ROOT / 'scripts/yw-tts4/scripts.json'))
STY = {'c': 'curious', 'u': 'urgent', 'n': 'setup', 's': 'suspense (slower)', 'x': 'excited reveal', 'm': 'somber', 'h': 'haunting'}
B = {
 'peigneur': ('The Day an Entire Lake Disappeared — Lake Peigneur, Louisiana, 20 Nov 1980', [
  (0, 'COLD OPEN · rig deck at dawn. Stickman (red hoodie, hard hat) at the rail; the calm lake starts to turn; camera tilts down to the forming whirlpool.'),
  (1, 'Aerial: the funnel opens beside the barge rig, foam lanes spiral, the deck lurches; he runs. Whip-pan out.'),
  (2, 'SMASH CUT — flashback, golden morning: lake, Jefferson Island oaks and garden house, the rig on glassy water. Title card.'),
  (3, 'Cutaway block: a 10-ft lake sitting on a salt dome with three mine levels. Camera slides down the strata.'),
  (4, 'Drill floor: the pipe binds and stops; driller reacts. Chip: “Drill stuck · ~1,200 ft down”.'),
  (5, 'Cutaway close: the bit breaks into the 1,300-ft level room; water starts to stream.'),
  (6, 'Inside the mine: water floods between the salt pillars, miners react → cutaway: pillars dissolve, rooms fill.'),
  (7, 'High aerial: the crater widens, the lake drains, barges start to circle.'),
  (8, 'Low, dramatic: the rig tilts and is swallowed with the tug and barges; spray and foam.'),
  (9, 'The Delcambre canal pours over the crater rim — a 164-ft waterfall.'),
  (10, 'Close on the stickman on the bank: terror turns to disbelief.'),
  (11, 'The crew on the bank — 7 rig crew, 55 miners: everybody escaped.'),
  (12, 'Golden-hour aerial of the refilled (now salt-water) lake. End card.')]),
 'molasses': ('The Day a City Was Flooded With Molasses — Boston North End, 15 Jan 1919', [
  (0, 'COLD OPEN · sunny lunchtime walk under the elevated railway; a metallic crack; he turns — a brown wave fills the street.'),
  (1, 'The glossy lip rolls at the lens. Hook word “MOLASSES”.'),
  (2, 'SMASH CUT — flashback: aerial over the North End and harbour; title card.'),
  (3, 'Low angle on the tank: 50 ft tall, 90 ft wide, 2.3 million US gallons.'),
  (4, 'Close on the seams: leak streaks; “painted brown to hide them”.'),
  (5, 'Rivets pop like gunfire, seams glow, the tank bursts apart; panels fly.'),
  (6, 'Tracking down Commercial Street ahead of the wave: up to 25 ft high, ~35 mph.'),
  (7, 'A wooden building is shoved off its foundation; the El span twists.'),
  (8, 'Macro on the slowing, glossy surface: the cold thickens it like glue.'),
  (9, 'A wagon mired to the axles, a hat on the surface (no people shown).'),
  (10, 'Sailors, police and Red Cross nurses wade in.'),
  (11, 'Dusk on the ruined street: 21 died, about 150 injured.'),
  (12, 'Harbour sunset; end card: it was real, and it changed building safety rules.')]),
 'sinkhole': ('The Man Whose Bedroom Disappeared — Seffner, Florida, 28 Feb 2013', [
  (0, 'COLD OPEN · the viewer’s “imagine” moment: asleep, lamp glowing; rumble, rattling, cracks race across the floor; it drops — CUT TO BLACK.'),
  (1, 'Night exterior: quiet street, the blue one-storey house; title card.'),
  (2, 'Hallway: getting ready for bed; a crash, dust bursts from the bedroom doorway.'),
  (3, 'Jeremy runs to his brother’s room → at the doorway: the room is gone.'),
  (4, 'Over his shoulder into the void: ~30 ft across. (Jeff is never shown.)'),
  (5, 'Jeremy at the edge, digging, calling his brother’s name.'),
  (6, 'The floor keeps collapsing; a sheriff’s deputy pulls him out.'),
  (7, 'Transition: the camera sinks into the ground → cutaway.'),
  (8, 'Rain seeps through sand and clay; limestone dissolves; a hidden cavern grows.'),
  (9, 'The soil arch holds… then a cover collapse funnels to the surface.'),
  (10, 'Rescue scene, lights and crews; the search is called off — ground too unstable.'),
  (11, 'Today: a fenced, empty lot and a memorial; the ground opens again — 2015, 2023. In memory of Jeff Bush.')]),
}
out = ROOT / 'docs/yw4'; out.mkdir(parents=True, exist_ok=True)
for film, (title, beats) in B.items():
    cs = C[film]; L = S['lines'][film]; st = S['style'][film]
    md = [f'# {title}', '', '60 s · 1080×1920 · 30 fps. Narration: AI text-to-speech (Chatterbox, open source) with a synthetic YunoWorld narrator voice — not a human recording.', '', '| Time | Shot | Narration (delivery) |', '|---|---|---|']
    for k, (i, shot) in enumerate(beats):
        a = cs[i]; b = cs[i + 1] if i + 1 < len(cs) else 60.0
        md.append(f'| {a:05.2f}–{b:05.2f} | {shot} | “{L[i]}” ({STY[st[i]]}) |')
    md += ['', f'Words: {sum(len(x.split()) for x in L)}.']
    (out / f'{film}_storyboard.md').write_text('\n'.join(md) + '\n'); print(film, 'ok')

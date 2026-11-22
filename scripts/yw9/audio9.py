#!/usr/bin/env python3
"""YunoWorld v9 sound: NARRATION (Blaze, one continuous take per passage, dry) + short original synthesized effects ONLY on
visible actions. No music, no ambience, no wind/room tone, no loops; silence between effects; no reverb/echo on the voice.
Usage: audio9.py <film>  ->  public/yw9-<film>-sound/bed.flac"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw6'))
import audio_common as AC  # noqa: E402
from audio_common import SR, N, T, noise, lp, hp, bp, env, gate, load_mono, lufs, write, ROOT, clack, chirp, limit, norm_lufs   # noqa: E402
film = sys.argv[1]
WORDS = json.load(open(ROOT / f'public/yw9-vo-{film}/words.json'))
def w(word, n=1, fb=0.0):
    c = 0
    for x in WORDS:
        if re.sub(r"[^a-z0-9']", '', x['w'].lower()) == word:
            c += 1
            if c == n: return x['s']
    return fb
ss = lambda a, b, t: float(np.clip((t - a) / (b - a), 0, 1))
CHAIN = ('highpass=f=80:poles=2,equalizer=f=250:t=q:w=1.1:g=-2.5,equalizer=f=3200:t=q:w=1.1:g=2.0,highshelf=f=9000:g=1.5,'
         'deesser=i=0.35:m=0.5:f=0.5:s=o,acompressor=threshold=0.13:ratio=2.0:attack=8:release=140:knee=4')
out = ROOT / f'public/yw9-{film}-sound'; out.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / f'public/yw9-vo-{film}/vo.wav'), '-af', CHAIN, '-ar', str(SR), '-ac', '1', str(out / 'vo.wav')], check=True)
v = load_mono(out / 'vo.wav'); v *= 10 ** ((-18.5 - lufs(v)) / 20); VO = np.zeros(N); VO[:min(N, len(v))] = v[:N]; (out / 'vo.wav').unlink()
SFX = np.zeros(N); R = np.random.default_rng(9)
def put(at, sig, g=1.0):
    i = int(at * SR); m = min(len(sig), N - i)
    if i >= 0 and m > 0: SFX[i:i + m] += sig[:m] * g
def step(surface='wood', g=.05):
    d = .14; x = T(d); k = R.uniform(.85, 1.15); body = lp(noise(d), 260 * k) * env(d, .002, .045)
    if surface == 'stone': top = bp(noise(d), 2500 * k, 7000) * env(d, .0005, .02) * .6
    elif surface == 'wood': top = bp(noise(d), 600 * k, 2200) * env(d, .001, .03) * .8 + np.sin(2 * np.pi * 190 * k * x) * np.exp(-x * 60) * .5
    else: top = bp(noise(d), 1200 * k, 4000) * env(d, .002, .05) * .4
    return (body + top) * g
def steps(t0, t1, every, surface='wood', g=.05):
    t = t0
    while t < t1: put(t + R.uniform(-.02, .02), step(surface, g)); t += every
def thud(g=.25, f=110): d = .3; x = T(d); return (lp(noise(d), 500) * env(d, .001, .07) + np.sin(2 * np.pi * f * x) * np.exp(-x * 14) * .8) * g
def clang(g=.3, f=310):
    d = .9; x = T(d); s = sum(np.sin(2 * np.pi * f * r * x + p) * np.exp(-x * (4 + r * 2.5)) * a for r, a, p in ((1, 1, 0), (2.76, .5, 1), (5.4, .3, 2)))
    return (s * .5 + hp(noise(d), 2000) * env(d, .0005, .02) * .6) * g
def click(g=.12, f=3000): d = .05; return (bp(noise(d), f * .6, f * 1.8) * env(d, .0003, .008) + np.sin(2 * np.pi * f * T(d)) * env(d, .0003, .01) * .3) * g
def flap(g=.12): d = .18; return bp(noise(d), 300, 2500) * env(d, .002, .05) * g
def flutter(t0, n=5, g=.09):
    for i in range(n): put(t0 + i * .07 + R.uniform(-.01, .01), flap(g * R.uniform(.7, 1)))
def coo(g=.05, f=430):
    d = .55; x = T(d); fm = f * (1 + .06 * np.sin(2 * np.pi * 7 * x)) * (1 - .12 * x / d); s = np.sin(2 * np.pi * np.cumsum(fm) / SR)
    return lp(s * gate(d, .05, .25) * (.6 + .4 * np.sin(np.pi * x / d)), 1400) * g
def peck(g=.07): d = .04; x = T(d); return (bp(noise(d), 1800, 6500) * env(d, .0002, .006) + np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 400) * .4) * g
def servo(g=.04): d = .22; x = T(d); f = 900 + 500 * x / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * gate(d, .02, .08) * .5 * g
def whistle_fall(d=1.5, g=.05):
    x = T(d); f = 1400 - 700 * (x / d) ** 1.4; s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + bp(noise(d), 600, 2400) * .3
    return s * gate(d, .3, .03) * (.4 + .6 * x / d) * g
def boom(g=.4): d = 1.4; x = T(d); return (lp(noise(d), 180) * np.exp(-x * 3.2) * (1 - np.exp(-x * 60)) + hp(noise(d), 1200) * env(d, .001, .05) * .5 + np.sin(2 * np.pi * 48 * x) * np.exp(-x * 5) * .7) * g
def stamp(g=.35): d = .35; x = T(d); return (lp(noise(d), 700) * env(d, .0008, .06) + np.sin(2 * np.pi * 95 * x) * np.exp(-x * 22) * .9 + hp(noise(d), 2500) * env(d, .0003, .01) * .5) * g
def paper(d=.8, g=.035): return bp(noise(d), 1500, 7000) * gate(d, .05, .3) * (1 + .4 * np.sin(2 * np.pi * 13 * T(d))) * g
def roll(d=1.4, g=.045): x = T(d); return lp(noise(d), 260) * (.7 + .3 * np.sin(2 * np.pi * 11 * x)) * gate(d, .15, .3) * g

def gunshot(g=.5): d = .5; x = T(d); return (hp(noise(d), 1500) * env(d, .0003, .02) * 1.2 + lp(noise(d), 400) * env(d, .001, .09) + np.sin(2 * np.pi * 90 * x) * np.exp(-x * 30) * .6) * g
def shatter(g=.3):
    d = 1.0; o = hp(noise(d), 2500) * env(d, .0005, .06) * .8
    for k in range(14): i = int(R.uniform(.02, .7) * SR); c = np.sin(2 * np.pi * R.uniform(3500, 7500) * T(.12)) * np.exp(-T(.12) * 40) * .3; o[i:i + len(c)] += c[:len(o) - i]
    return o * g
def ping(g=.12): d = .7; x = T(d); f = 3800 - 2600 * (x / d) ** .6; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 5) + hp(noise(d), 4000) * env(d, .0005, .01)) * g
def scrape2(g=.06): d = .4; return bp(noise(d), 500, 2600) * gate(d, .02, .2) * g
def splash(g=.15): d = .8; return (bp(noise(d), 400, 6000) * gate(d, .01, .5)) * g
def blub(g=.06): d = .35; x = T(d); f = 300 + 900 * x / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .005, .08) * g
def crackle(d=.8, g=.05):
    o = np.zeros(int(d * SR))
    for k in range(int(d * 40)): i = int(R.uniform(0, d - .02) * SR); c = click(1, R.uniform(3000, 7000)); o[i:i + len(c)] += c[:len(o) - i] * R.uniform(.3, 1)
    return o * g
def icecrack(g=.25): d = .5; return (bp(noise(d), 1200, 7000) * env(d, .0005, .05) + lp(noise(d), 300) * env(d, .001, .08) * .6) * g
def creak(g=.05): d = .5; x = T(d); f = 180 + 60 * np.sin(2 * np.pi * 3 * x); return bp(np.sin(2 * np.pi * np.cumsum(f) / SR) + .5 * noise(d), 300, 2000) * gate(d, .05, .2) * g
def ratchet(t0, t1, every=.12, g=.07):
    t = t0
    while t < t1: put(t, click(g, 2600)); t += every
def fire_burst(d=1.2, g=.08): return lp(noise(d), 1400) * (.6 + .4 * np.sin(2 * np.pi * 7 * T(d)) ** 2) * gate(d, .15, .4) * g
def keys(t0, t1, g=.03):
    t = t0
    while t < t1: put(t, click(g, R.uniform(2500, 4200))); t += R.uniform(.07, .16)
def clink(g=.06): d = .25; x = T(d); return (np.sin(2 * np.pi * 2900 * x) + .5 * np.sin(2 * np.pi * 4700 * x)) * np.exp(-x * 30) * g
def peaks(fn, t0, t1):
    ts = np.arange(t0, t1, 1 / 600); v = np.array([fn(t) for t in ts]); out_ = []
    for i in range(1, len(v) - 1):
        if v[i] > v[i - 1] and v[i] >= v[i + 1] and v[i] > .5: out_.append(ts[i])
    return out_
def peck_cycle(t, rate, amp=1.0):
    p = (t * rate) % 1
    return amp * (1 - (1 - p / .35) ** 3 if p < .35 else 1 - ((lambda k: k * k * (3 - 2 * k))((p - .35) / .65)))
if film == 'pigeon':
    A = dict(no=w('no', 1, 3.2), wants=w('wants', 1, 5.7), war=w('world', 1, 8.9), so=w('so', 1, 12.4), officials=w('officials', 1, 16.6), trick=w("here's", 1, 21.9),
             pecks=w('pecks', 1, 26.4), drifts=w('drifts', 1, 28.6), one=w('one', 1, 33.3), but=w('but', 2, 37.3), see=w('see', 1, 41.0), amused=w('amused', 1, 47.0),
             after=w('after', 1, 51.0), ran=w('kept', 1, 54.4), cancelled=w('cancelled', 1, 0) or w('canceled', 1, 49.5))
    flutter(.35, 4, .07); put(1.1, coo(.035))                                              # the pigeon wriggles in Skinner's hands
    put(A['wants'] + .3, clang(.16, 520)); put(A['wants'] + .32, click(.12, 1800))        # hatch snaps shut
    put(A['war'], whistle_fall(1.5, .05)); put(A['war'] + 1.5, boom(.34))                 # bomb whistles down and misses
    wk1 = A['officials'] - 1.0; steps(A['so'], wk1, 1 / 1.6 / 2, 'wood', .045)          # Skinner walks in carrying the box
    put(A['officials'] - .45, thud(.14, 150)); put(A['officials'] - .2, coo(.04, 470))    # box set on the table; a coo from inside
    put(A['officials'] + 2.1, paper(min(1.4, A['trick'] - A['officials'] - 2.6), .035))     # contract slides across the felt
    for tt in peaks(lambda t: peck_cycle(t, 1.3) * .3 / .3, A['trick'] + .2, A['pecks']): put(tt, peck(.035))
    for tt in peaks(lambda t: peck_cycle(t, 2.2), A['pecks'], A['drifts']): put(tt, peck(.07))
    u0 = A['drifts']; du = A['one'] - A['drifts']; put(u0 + du * .3, servo(.05)); put(u0 + du * .55, servo(.05)); put(u0 + du * .75, servo(.04))   # fins kick
    one, but = A['one'], A['but']
    for tt in peaks(lambda t: peck_cycle(t, 2.5 + 4.5 * min(1, max(0, (t - one) / (but - one)))), one, but): put(tt, peck(.065))
    put(A['but'] + .5, coo(.04, 380))                                                       # the confused pigeon
    steps(A['see'] + 3.4, A['amused'], .36, 'stone', .045)                                   # the traveller walks off
    put(A['cancelled'], stamp(.34))
    fl = A['after'] + 1.0; flutter(fl, 6, .09); put(A['after'] + .6, coo(.045, 450))          # Navy pigeon flaps
    put(A['ran'] + .2, roll(1.4, .05)); put(A['ran'] + 1.6, clack(.12)); put(A['ran'] + 2.4, coo(.035, 520))   # console rolls in, docks
elif film == 'ice':
    A = dict(fires=w('fires', 1, 2.0), shatters=w('shatters', 1, 3.6), fires2=w('fires', 2, 5.0), bounces=w('bounces', 1, 6.6), so=w('so', 1, 17.0), story=w('story', 1, 24.0),
             see=w('see', 1, 35.4), torpedo=w('torpedo', 1, 42.0), actually=w('actually', 1, 47.6), then3=w('then', 3, 53.2), remains=w('remains', 1, 55.6),
             canc=w('cancelled', 1, 0) or w('canceled', 1, 54.0), war=w('world', 1, 12.0))
    put(A['fires'], gunshot(.42)); put(A['shatters'] - .15, shatter(.3))                     # first shot, plain ice shatters
    put(A['fires2'], gunshot(.42)); put(A['bounces'] - .2, ping(.13))                         # second shot ricochets
    put(A['bounces'] + .15, scrape2(.07)); put(A['bounces'] + .3, scrape2(.06))               # admirals dive, chairs scrape
    k = (A['war'], A['so']); put(k[0] + (k[1] - k[0]) * .35, splash(.08))                      # the U-boat breaks the surface
    put(A['so'] + 1.6, scrape2(.06)); put(A['so'] + 1.9, paper(.5, .035))                     # Pyke leaps up with the plan
    put(A['story'] + .5, blub(.05)); put(A['story'] + 1.4, blub(.04))                          # the block bobs in the bath
    put(A['see'] + (A['torpedo'] - A['see']) * .35, icecrack(.22)); put(A['see'] + (A['torpedo'] - A['see']) * .55, thud(.12, 160))   # crack runs, then stops
    tt = A['torpedo']; dt = A['actually'] - tt; put(tt + dt * .25, splash(.1)); put(tt + dt * .5, crackle(min(1.2, dt * .4), .05))
    put(A['canc'], stamp(.32))
    put(A['remains'] + 1.1, splash(.12)); put(A['remains'] + 1.5, blub(.05)); put(A['remains'] + 1.8, blub(.04))   # the camera dives in
elif film == 'turk':
    A = dict(legend=w('legend', 1, 3.2), sweeps=w('sweeps', 1, 5.6), this=w('this', 1, 8.6), so=w('so', 1, 21.0), nothing=w('nothing', 1, 25.4), then=w('then', 1, 27.0),
             see=w('see', 1, 32.2), as2=w('as', 1, 38.4), magnets=w('magnets', 1, 40.6), inn=w('1854', 1, 45.0), later=w('later', 1, 48.0), today=w('today', 1, 52.0), name=w('name', 1, 57.0), usually=w('usually', 1, 30.6))
    put(A['legend'] + .9, clink(.05))                                                        # Napoleon moves a piece
    sw = A['sweeps'] - .15
    for i in range(12): put(sw + .05 + i * .045, clink(.05 * R.uniform(.6, 1)))               # pieces scatter
    put(sw + .7, thud(.08, 200))
    for i in range(3): put(A['so'] + .6 + i * .45, creak(.05))                               # doors open
    ratchet(A['then'] + .1, A['then'] + 1.0, .1, .06)                                         # wound with a key
    dt = A['see'] - A['then']; put(A['then'] + dt * .6, clink(.06))                           # the arm moves a piece
    put(A['as2'] + .1, scrape2(.05))                                                          # the hidden seat slides
    for i in range(3): put(A['as2'] + i * .35, creak(.035))
    put(A['magnets'] + .1, click(.06, 1500)); put(A['magnets'] + .5, click(.05, 1300))
    put(A['inn'] + .2, fire_burst(1.6, .08)); put(A['inn'] + 1.4, fire_burst(1.2, .06))      # the museum burns
    put(A['later'] + .3, paper(.6, .025))                                                     # pen on paper
    keys(A['today'] + .3, 58.2, .022)                                                         # people typing at their screens
    put(A['name'] + .6, clink(.06)); put(A['name'] + .65, thud(.05, 180))                     # the title lands like a chess move
elif film == 'mail':
    A = dict(coat=w('coat', 1, 4.0), mailed=w('mailed', 1, 5.5), her=w('her', 2, 7.4), its=w("it's", 1, 11.3), year=w('year', 1, 14.2), rules=w('rules', 1, 19.6), very=w('very', 1, 22.6),
             sounds=w('sounds', 1, 27.7), may=w('may', 1, 29.5), letters=w('letters', 1, 32.3), guess=w('guess', 1, 35.1), clerk=w('clerk', 1, 37.0), see=w('see', 1, 39.0), under=w('under', 1, 43.5),
             stamped=w('stamped', 1, 44.7), addressed=w('addressed', 1, 45.6), so=w('so', 1, 46.6), when=w('when', 1, 49.5), banned=w('banned', 1, 51.6), but=w('but', 1, 53.0), just=w('just', 2, 59.0))
    put(1.2, creak(.03)); put(2.8, creak(.025))                                               # the windmill turns
    steps(A['her'] + .4, A['its'] - .3, .42, 'dirt', .035)                                    # May walks down the path
    AC_ = AC.chuff(A['year'] - A['its'], .06); put(A['its'], AC_)                             # the train steams in
    put(A['its'] + .2, AC.steamwhistle(1.2, .035))
    for i in range(8): put(A['year'] + .3 + i * .32, paper(.12, .02))                         # letters into pigeonholes
    for i in range(3): put(A['rules'] + .25 + i * .35, click(.035, 2200))                      # ticks on the list
    steps(A['very'] + .1, A['sounds'] - .1, .5, 'dirt', .035)                                 # the carrier walks the lane
    put(A['may'], AC.chuff(A['letters'] - A['may'], .06))                                     # running alongside the train
    put(A['letters'] + .3, paper(.5, .02))
    put(A['clerk'] - .2, scrape2(.03))
    ratchet(A['under'] - 1.2, A['under'], .1, .04)                                            # scale needle
    for k in ('under', 'stamped', 'addressed'): put(A[k] + .05, click(.04, 2400))
    put(A['so'] + .1, stamp(.18))
    put(A['when'] + .4, paper(.6, .025)); put(A['banned'] - .02, stamp(.36))                  # BANNED
    put(A['but'], AC.chuff(60 - A['but'], .05)); put(A['but'] + .3, AC.steamwhistle(1.6, .03))
    put(A['just'] + .1, AC.coin(.06, 3100))
elif film == 'ears':
    A = dict(they=w('they', 1, 4.2), listen=w('listen', 1, 7.1), back=w('back', 1, 9.1), so=w('so', 1, 15.2), tucker=w('tucker', 1, 16.5), hear=w('hear', 1, 19.9), it=w('it', 1, 20.6),
             a20=w('20', 1, 26.6), a30=w('30', 1, 28.0), f200=w('200', 1, 31.0), gathers=w('gathers', 1, 36.3), where=w('where', 1, 39.2), a=w('listener', 1, 40.7) - .2, inn=w('in', 2, 44.4),
             warning=w('warning', 1, 46.7), butp=w('but', 3, 47.2), then=w('then', 2, 51.3), yet=w('yet', 2, 54.1))
    pl = A['listen'] + .2; put(pl + .8, AC.airflow(2.2, .025))                                 # a bomber crosses the sky
    dur = A['so'] - A['back']; put(A['back'] + .5, AC.airflow(dur - .6, .05))                  # the formation drones past
    put(A['tucker'] + .3, click(.04, 1400))                                                     # chalk tap as the idea lands
    put(A['hear'] - .3, scrape2(.02))
    for i in range(6): put(A['gathers'] + .2 + i * .45, AC.chirp(.012, 2600 - i * 200))          # the wavefronts arrive
    put(A['where'] + .2, ping(.05))                                                             # focus: one bright point
    for i in range(6): put(A['a'] + .3 + i * .55, click(.015, 900 + i * 60))                     # needles twitch
    for i in range(int((A['butp'] - A['inn']) / .5)): put(A['inn'] + i * .5, click(.03, 2600))   # the clock ticks
    put(A['butp'] + .2, AC.airflow(A['then'] - A['butp'] - .4, .07))                            # fast planes roar past
    put(A['then'] + .3, AC.chirp(.02, 1800)); put(A['then'] + 1.3, AC.chirp(.02, 1800))          # radar mast lamps blip
elif film == 'xray':
    A = dict(andd=w('and', 1, 4.2), this=w('this', 2, 7.7), youd=w("you'd", 1, 14.7), look=w('look', 1, 17.2), and2=w('and', 2, 18.7), kids=w('kids', 1, 21.5), but=w('but', 1, 28.2),
             tube=w('tube', 1, 31.1), thin=w('thin', 1, 31.8), you=w('you', 1, 35.2), staff=w('and', 4, 40.0), worst=w('worst', 1, 44.5), ban=w('ban', 1, 50.7), by=w('by', 1, 51.5),
             so=w('so', 2, 54.2), fired=w('fired', 1, 58.8))
    put(A['andd'] - .3, servo(.03))                                                             # the machine hums on
    steps(A['this'] + .2, A['this'] + 2.2, .42, 'stone', .04)                                   # family walks to the shop
    put(A['youd'] + .4, scrape2(.05))                                                           # shoes slide into the slot
    put(A['look'] + .3, creak(.025))
    put(A['and2'] - .2, servo(.03))
    steps(A['kids'] + .2, A['kids'] + 3.6, .3, 'stone', .04)                                    # the girl drags her mum along
    put(A['tube'] - .2, servo(.05)); put(A['thin'], ping(.04))
    put(A['you'] + .2, AC.hiss(2.4, .02))                                                       # the beam floods up
    for i in range(10): put(A['staff'] + .3 + i * .34, click(.025, 1900))                        # time-lapse: customers flick by
    put(A['worst'] + 1.5, thud(.05, 220))
    put(A['ban'] - .05, stamp(.3))                                                              # the gavel
    put(A['fired'] - .05, servo(.05)); put(A['fired'] + .1, AC.hiss(.8, .03))
elif film == 'knock':
    A = dict(paying=w('paying', 1, 5.4), before=w('before', 1, 7.2), human=w('human', 1, 10.4), see=w('see', 1, 17.3), until=w('until', 1, 23.6), customers=w('customers', 1, 27.0),
             daughter=w('daughter', 1, 32.6), nobody=w('nobody', 1, 39.6), most=w('most', 1, 40.6))
    for tp in (.9, 2.4, 3.6):                                                             # puff -> pea hits the glass
        put(tp, bp(noise(.06), 600, 2400) * env(.06, .002, .03) * .05); put(tp + .55, click(.05, 3600))
    put(A['paying'] - .1, creak(.04))                                                     # he bolts upright, bed creaks
    steps(A['before'] + .3, A['human'] - .2, .48, 'stone', .03)                            # workers trudge to work
    steps(A['human'] + .1, A['see'] - .2, .46, 'stone', .035)                              # her boots on the cobbles
    for i in range(14): put(A['see'] + .3 + i * .42 + .05, click(.04, 3400 + (i % 3) * 300))   # pea after pea on the glass
    put(A['until'] + .5, scrape2(.05))                                                    # the sash flies up
    for tp in (A['daughter'] + 1.6,): put(tp, bp(noise(.06), 600, 2400) * env(.06, .002, .03) * .05); put(tp + .55, click(.05, 3600))
elif film == 'pigcam':
    A = dict(fly=w('fly', 1, 4.6), medicine=w('medicine', 1, 11.0), see=w('see', 1, 15.2), leaked=w('leaked', 1, 19.4), click=w('click', 1, 23.4), high=w('high', 1, 25.2),
             photos=w('photos', 1, 30.0), dresden=w('dresden', 1, 33.4))
    put(1.0, click(.035, 2400)); put(1.5, click(.03, 2000))                               # harness buckle clicks
    flutter(A['fly'] - .05, 6, .08)                                                       # take-off
    flutter(A['medicine'] - .8, 4, .06); put(A['medicine'] - .1, coo(.03))               # a pigeon lands on the sill
    for i in range(6): put(A['see'] + .6 + i * .16, AC.airflow(.12, .03))                 # pumping the ball
    put(A['leaked'], hp(noise(1.6), 3000) * gate(1.6, .1, .6) * .012)                     # slow hiss of escaping air
    put(A['click'] - .02, click(.12, 2600)); put(A['click'] + .02, click(.06, 1500))      # the shutter fires
    flutter(A['high'] + .1, 5, .05)
    put(A['photos'] - .05, paper(.4, .04)); put(A['photos'] + .05, thud(.06, 180))        # photos slap on the desk
    put(A['photos'] + 1.0, stamp(.25))                                                    # PATENT GRANTED
    for i in range(3): flutter(A['dresden'] + .4 + i * .7, 3, .05)                        # birds land on the loft
elif film == 'bath':
    A = dict(this=w('this', 1, 5.6), back=w('back', 1, 8.0), changed=w('changed', 1, 14.0), once=w('once', 1, 17.5), canvas=w('canvas', 1, 23.4), andd=w('and', 3, 27.0),
             dippers=w('dippers', 1, 31.0), twist=w('twist', 1, 40.6), when=w('when', 1, 46.4))
    t = .1
    while t < A['this'] - .2: put(t, thud(.035, 140)); t += .46                          # hooves on wet sand
    put(.3, creak(.04)); put(1.6, creak(.035)); put(2.8, splash(.06)); put(3.6, splash(.08))   # wheels creak, surf
    steps(A['back'] + .4, A['changed'] - .6, .5, 'wood', .04)                             # up the wooden steps
    put(A['changed'] + .2, creak(.04)); put(A['changed'] + 1.3, creak(.035))
    put(A['once'] + 1.2, creak(.05)); put(A['once'] + 1.9, splash(.07))                   # door opens, she steps in
    put(A['canvas'] + .1, paper(.9, .03))                                                 # canvas hood unrolls
    put(A['dippers'] + 1.1, splash(.14)); put(A['dippers'] + 2.1, splash(.12)); put(A['dippers'] + 2.3, blub(.04))   # DUNK
    put(A['twist'], AC.airflow(.3, .05))                                                  # whip pan
elif film == 'spit':
    A = dict(inn=w('in', 2, 5.6), somebody=w('somebody', 1, 9.6), so=w('so', 1, 12.6), see=w('see', 1, 14.6), there=w('there', 1, 26.2), kitchens=w('kitchens', 2, 31.4), then=w('then', 1, 34.6), only=w('only', 1, 41.0))
    def trot(t0, t1, every=.11, g=.018):
        t = t0
        while t < t1: put(t, click(g * R.uniform(.7, 1), 900)); t += every
    def wheelclack(t0, t1, every=.36, g=.025):
        t = t0
        while t < t1: put(t, clack(g)); t += every
    trot(0, A['inn']); wheelclack(0, A['inn'])                                            # paws on the treads + wheel slats
    put(1.2, crackle(.6, .03)); put(3.4, crackle(.6, .03))                                # the fire under the roast (visible)
    ratchet(A['inn'] + .6, A['so'] - .2, .42, .03)                                        # the boy cranks by hand
    put(A['so'] + .6, thud(.03, 260)); trot(A['so'] + .7, A['see']); wheelclack(A['so'] + .7, A['see'])   # hops in, trots
    trot(A['see'], A['there']); wheelclack(A['see'], A['there']); ratchet(A['see'] + 2.5, A['there'], .5, .02)   # chain links
    trot(A['there'], A['kitchens'] + .2); put(A['kitchens'] + .9, thud(.03, 240))         # hops out by the hearth
    ratchet(A['then'] + .1, A['only'] - .2, .09, .022)                                    # clockwork jack ticking
elif film == 'lick':
    A = dict(handed=w('handed', 1, 3.2), this=w('this', 2, 7.4), here=w("here's", 1, 14.2), wipe=w('wipe', 1, 24.6), banned=w('banned', 1, 32.4), agnes=w('agnes', 1, 37.0), edible=w('edible', 1, 39.6))
    put(.5, bp(noise(.3), 2000, 6000) * gate(.3, .05, .1) * .02)                          # a long lick
    put(A['handed'] + .4, clink(.05)); put(A['handed'] + 1.3, scrape2(.03)); put(A['handed'] + 1.6, clink(.04))   # glass back, scoop, glass out
    steps(A['this'] + .2, A['here'] - .3, .5, 'stone', .02)                               # shoppers on the cobbles
    put(A['here'] + .2, ping(.03))                                                        # the glass catches the light
    put(A['wipe'], bp(noise(.5), 400, 1800) * gate(.5, .05, .2) * .04)                    # rag wipe
    put(A['banned'] - .02, stamp(.34))
    put(A['agnes'] + .4, paper(.5, .03))                                                  # the recipe page
    put(A['edible'] + .3, bp(noise(.12), 1500, 5000) * env(.12, .002, .05) * .04)         # crunchy cone
mix = VO + SFX; END_S = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
fade = np.minimum(1, np.arange(N) / SR / .05) * (1 - np.clip((np.arange(N) / SR - (END_S - .5)) / .5, 0, 1)); mix *= fade
mix = np.stack([mix[:int(END_S * SR)], mix[:int(END_S * SR)]], 1)
for _ in range(6): mix = limit(norm_lufs(mix, -14.0), .74)
write(out / 'bed.wav', mix); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'bed.wav'), '-c:a', 'flac', str(out / 'bed.flac')], check=True); (out / 'bed.wav').unlink()
print(film, 'lufs', round(lufs(mix), 2), 'peak', round(float(np.abs(mix).max()), 3))

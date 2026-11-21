# Free TTS shoot-out (run on a free GitHub runner, CPU)

Same three story lines through every candidate; scored automatically. Word error counts spelling differences such as Lt./Lieutenant and II/Two, so small non-zero values are expected.

| Candidate | UTMOS (naturalness) | Pitch range p10–p90 (st) | Words/s | Word error |
|---|---|---|---|---|
| cbx-fenrirref-e07 | 4.47 | 11.7 | 2.87 | 0.12 |
| cbx-builtin-e065 | 4.46 | 7.8 | 2.89 | 0.09 |
| kokoro-am_puck | 4.45 | 9.0 | 2.84 | 0.06 |
| kokoro-am_fenrir | 4.43 | 11.0 | 2.73 | 0.06 |
| cbx-puckref-e09 | 4.43 | 11.1 | 2.63 | 0.06 |
| cbx-puckref-e05 | 4.39 | 7.8 | 2.84 | 0.06 |
| cbx-fableref-e07 | 4.37 | 11.3 | 2.93 | 0.12 |
| kokoro-am_michael | 4.34 | 7.9 | 2.50 | 0.06 |
| cbx-puckref-e07 | 4.32 | 9.7 | 2.78 | 0.06 |
| kokoro-bm_fable | 4.30 | 17.5 | 2.34 | 0.03 |
| piper-en_US-ryan-high | 4.29 | 7.1 | 3.22 | 0.16 |
| kokoro-bm_george | 4.23 | 12.3 | 2.37 | 0.03 |

Chosen: **Chatterbox TTS (MIT) prompted with a synthetic Kokoro am_fenrir reference (Apache-2.0)** — the highest naturalness score with the widest pitch movement (closest to the reference recordings’ ~13 st). No real person is imitated or cloned.

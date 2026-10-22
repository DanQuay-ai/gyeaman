# Balance sims

Serve the repo (`python3 -m http.server 4190`), then:

- `node tools/sim/rr.mjs 2 10 3 3` round-robin Arena duels (reps, level, stars, skill level).
- `node tools/sim/pve.mjs 6 2 2 4,9,14` each hero alone on Journey stages.

Uses Playwright with a fake clock, so a full round-robin takes about 15 minutes.

# Incursion development instructions

- Read `GAME_SPEC.md` first; it is the authoritative user-approved design. Read `DEVELOPMENT.md` for current deviations and evidence.
- Preserve standalone static hosting and native ES modules. No mandatory build process, package install or backend. The first local implementation uses native WebGL temporarily; restore the specified pinned local Three.js implementation when dependency transfer is possible.
- Keep simulation independent of renderer and UI, fixed at 20 Hz; all gameplay changes must pass validated commands. Preserve the agreed 3 frigates / 10 ships per fleet, combat counter matrix, energy flow rules, two tower classes and energy wall behavior.
- Run the native browser suite at `/tests/`; use `node tests/run.mjs` optionally for headless simulation tests. Run a normal match and document tested browser/hardware, failures and actual timings. Never claim performance or mobile coverage without measurement.
- Keep tuning grouped in `src/config.js`; document changes and assumptions in `DEVELOPMENT.md`. Do not add deferred mechanics or silently change the approved design.
- Do not overwrite `GAME_SPEC.md` when integrating this package.

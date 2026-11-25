# Development report — first playable build

## Delivery and blockers

The GitHub connector could read `ktmorris21/incursion` and `GAME_SPEC.md` from main at `ab048a13bf5e9da51c6267fa5152e68f21a56113`. Both contents creation and Git blob creation returned HTTP 403, `Resource not accessible by integration`; direct Git networking was unavailable. No repository files were modified. The delivered ZIP is the local source tree; retain the existing `GAME_SPEC.md` when merging it into the repo.

The pinned Three.js r170 source was readable via the connector but could not be written to the repo or transferred to the local build runtime. The renderer therefore uses native WebGL triangle geometry and Canvas tactical effects with no runtime network dependency. This does NOT satisfy the specified Three.js and GLB-loader requirement. The game simulation is renderer-independent so this can be replaced.

## Implemented

Seeded map preview and four named terrain-density archetypes, bounded generation retries and fallback, two nearby/two exposed equal-yield deposits, four potential portal sites, weighted grid A*, nebula modifiers, fog, minimap; all approved units and structures, command slots, capacity reservations, reinforcement transit, command loss and physical collection, mining, proportional energy allocation, serial queues, constructors, two weapon towers and explicit barrier lines; escalating automatic waves, recovery gating, relocation, device lifecycle, terminal results, statistics; native menu, fleet/context panels, tutorial, settings, keyboard/mouse/touch input, procedural WebGL models, combat effects and synthesized audio.

## Tuning

The accepted 2× / 0.75× counter matrix, 3 frigates / 10 subordinate slots, base combat statistics and charge durations remain unchanged. The provisional baseline command station income was increased from 60 to 90 E/s after scripted strategies repeatedly lost before charge completion at 60. Deposit yield stays 20 E/s; aggregate exposed yield remains exactly 50%. Duration scaling is applied to income and nominal work rates. This change is provisional and needs human balance review; it does not establish equivalent difficulty across presets.

## Verified simulation results

- Node v22.16.0, local Linux execution environment: native test suite passed (see test output). The suite checks 1,000 reproducible map seeds, combat matrix, six counter duel fixtures, shield overflow and destruction, common allocation, regen, mining, construction, wall links and crossing, queue limits, reinforcement loss, collection, fog, wave sequencing, relocation, device drop/recovery/deployment, and terminal/pause precedence.
- Baseline 60 E/s: multiple scripted 10-minute Commander and Cadet matches reached defeat; no successful delivery was observed.
- Adjusted 90 E/s: `node tests/scenario.mjs sector-01 10` (Cadet) reached victory at 620.20 simulation seconds, six waves defeated, 55 hostile losses, 66 structures built, 279 accepted ordinary commands and zero rejected commands; HQ hull 1,200. Runtime approximately 11.6 seconds in the local Node environment. A second seed, `cadet-1`, reached defeat after 10 defeated waves and 113 hostile losses, with device dropped. No claim of broad balance or guaranteed victory.
- Chromium launch succeeded, but navigation to the local HTTP server failed with `ERR_BLOCKED_BY_ADMINISTRATOR` due to managed browser policy. Thus the native browser page and actual rendering/interaction could not be executed in this environment. JavaScript syntax and simulation were tested under Node only. No mobile device, frame rate, visual screenshot or browser performance evidence is available.

## Outstanding acceptance work

This is an integrated playable development candidate, not full specification compliance or production readiness. Remaining known gaps include:

- Restore pinned local Three.js and GLB asset registry/fallback; visual polish (true curved enemy hulls, fuller carrier recovery animations, trails, debris, welding/assembly, portal effects, reduced-flash option) and richer differentiated audio. Graphics quality currently mainly affects resolution.
- A* respects dense terrain and hostile wall intersections, but uses basic waypoint routing, partial-route/breach fallback and formation offsets rather than fully validated smooth paths, local separation, staggered group-route sharing, or a measured stuck detector. Map validation checks reachability and yield split, not measured corridor diversity or a guaranteed >3 approach corridor archetype. Enemy groups have secondary objective assignment but not advanced tactical route splitting/weighted breach planning. No 200-entity performance target has been verified.
- UI includes functional tactical overlays, health bars, queues, civilian and roster panels, minimap and tutorial, but richer placement feedback, per-consumer live breakdowns, relocation/device map markers, alert coverage, accessibility and landscape touch ergonomics need a browser pass. Diagnostic panel is intentionally basic (selection state, timing, reserve/wave/charge/relocation/damage/step actions); full spawn/reset/drop controls and all path/influence overlays remain outstanding.
- Native tests are meaningful but do not cover every acceptance case in the specification: e.g. precise targeting tie-break fixtures, compression and breach scenarios, clock across render rates, persistence/hidden-tab/reset UI behavior, mobile devices, and full manual normal-mode match. Browser acceptance, performance measurements, and balance tuning across all difficulties/durations remain necessary.

Adopted assumptions: A1/A2 no line-of-sight weapon obstruction and neutral classes; A3 explicit linked wall posts, physical sequential initiation; A4 vulnerable started projects, pending footprint reservation; A5 25% spent refund and pending-only reordering; A6 storage cap clamping; A7 reinforcement invulnerability and physical collection; A8 movement precedence; A9 unique device and interrupted deployment reset; A10 complete-wave gating; A11 protected region radius 350 units; A12 completed structure influence; A13 20 history entries and hidden-tab pause; A14 orthographic-style angled view; A15 no explicit population cap.

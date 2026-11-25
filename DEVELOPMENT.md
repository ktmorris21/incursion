# Development log — spec 1.1

## Milestone 1 — Application foundation (ready for human review)

### Implemented

Fresh source, replacing the preceding WebGL-based development build. Native Canvas 2D and ES modules only. No third-party dependencies or runtime assets. Fixed oblique orthographic projection (0.65 vertical compression), cursor-anchored zoom, pan, fit, picking, stable depth ordering, CSS/backing-store coordinate separation and DPR/quality cap. Deterministic 20 Hz clock with interpolation, bounded catch-up, pause, explicit resume on visibility loss and three simulation speeds. Plain-data entity records, validated debug lifecycle commands, original cached 24-heading-frame shaded sprite artwork, layered parallax starfield, inspector and diagnostics.

The demo contains 11 representative entities (including a scripted moving frigate); it is not a starting roster or tactical encounter. Hostile samples are only the three primary combat classes. The display ground anchors and ellipse picking sizes are provisional visual values, not physical hitboxes.

### Executed test evidence

- Node.js 22.16.0: **16/16 core test groups passed**, including 800 world/screen round trips over desktop/portrait/landscape sizes, zoom anchoring, stable depth ties, DPR caps, entity IDs, single destruction events, invalid/paused command rejection, fixed step/speed, pause/catch-up, deterministic state at 30/60/144 render FPS, interpolation, atlas metadata/fallback and reset.
- Chromium 144.0.7559.96 (headless Linux environment, software/disabled GPU, isolated local document): **19/19 native browser test groups passed** (the same core tests plus three Canvas integration groups). Actual Canvas drawing, 40 directional sprite samples, overlapping picking, DPR resizing, and rendering independence were verified.
- Separate app interaction checks in the same Chromium environment: desktop launch, selection/focus, paused clock, one-tick debug advance, debug spawn/removal, speed change, middle-mouse pan, cursor wheel zoom, quality switch, DPR 2 desktop resize to landscape, reset, and synthetic visibility-change pause with explicit resume. Emulated 844×390 touch viewport at device DPR 3: auto quality capped backing DPR at 1.5, tap selection, two-finger pinch and one-finger pan preserved selection. No uncaught page errors in the final run.
- An initial browser smoke test caught an invalid hostile constructor debug spawn caused by inherited property lookup. Fixed faction validation and own-property lookup, then reran the suites and interaction checks.
- Reviewed captured desktop and emulated landscape screenshots for representative sprite readability and overall layout.

### Verification limits

The environment blocked ordinary local HTTP browser navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. The actual app and native test modules were exercised in an isolated `about:blank` document by substituting local module import specifiers with in-memory data URLs and inlining the existing CSS; no application behavior was substituted. The ordinary static-server launch and relative module loading remain to be confirmed by the reviewer on their machine or host. Real Android/iOS hardware, Safari/Firefox/Edge, actual browser tab switching and sustained device performance have not been validated. Visibility handling was tested via a synthetic event. No FPS target or 200-entity stress claim is made at this gate. The debug panel reports observed frame/step timings for local review; performance profiling is deferred to the appropriate milestone.

### Decisions / assumptions

- Follow spec 1.1 projection compression 0.65, 1,800×1,800 world, 20 Hz fixed steps, and 0.5×/1×/2× speeds. No combat/economy tuning changed; those systems do not yet exist.
- Camera zoom 0.22–3.0, 24 cached heading frames, DPR limit 2.0, touch auto-quality medium (1.5 cap), desktop high (2.0 cap). These are provisional display choices. Quality controls do not alter authoritative simulation.
- A 0.25-second real frame cap and 10-step catch-up cap discard excessive backlog; diagnostic counter reports dropped simulation seconds. Pause clears accumulation; hidden-tab time is never replayed.
- The starfield and colored atmospheric shading are decorative, not gameplay nebulae. The fixture motion exists only to demonstrate time scaling/interpolation. No pathfinding, combat or orders are implied.
- Labels are suppressed at very low zoom to preserve readability. The inspector can collapse; touch targets and compact landscape layout are initial versions. External artwork supports local PNG/WebP/SVG/atlas descriptors, with cached procedural fallback. Actual external custom assets have not yet been integrated.

### Review steps

1. Serve the source root and launch the scene; visit `/tests/` and confirm all tests pass.
2. Pan, zoom, inspect and focus ships, assess silhouette, lighting and faction distinction. Resize and try touch if available.
3. Pause; confirm the motion fixture stops and camera navigation still works. Switch speed and resume; observe fixture motion. Switch browser tabs and confirm explicit resume is required.
4. Open `/?debug`; check the world/screen grid and pointer coordinates, single step while paused, spawn/remove while running, reset and inspect the timing indicators.
5. Provide feedback on artwork, sprite size, fixed camera feel and initial UI direction.

### Deferred

Milestone 2 combat sandbox (targeting, counter matrix, shields/hull, destruction effects, regeneration, controlled battles and weapon spectacle); Milestones 3–8 battlefield generation, fleet control, economy, enemy waves, full match, audio and polish. Do not proceed past this gate until the user approves or requests continuation.


## Milestone 2 — Combat sandbox (ready for human review)

Milestone 1 approved; visual feedback incorporated. The new increment retains Canvas 2D and the 20 Hz fixed-step simulation, adds shield/hull damage, deterministic nearest eligible targeting, class counters, automatic open-space approach, combat destruction, repair, mixed-fleet and three duel presets, configurable starting range, empty sandbox, class/faction placement, positioning, health bars, inspection and combat-event effects. The renderer shows fighter runs and blaster bolts, curved missile salvos, solid beams, frigate bolts, engine trails, shield ripples, hull impacts and explosions. Effects are bounded and cosmetic. All artwork is original; supplied screenshots were visual inspiration only.

### Changes and assumptions

- User-directed provisional visual tuning: ship display scale .52 (station .72), camera vertical compression .65 → .84, 24 → 36 directional frames, near-black background, muted neutral metallic palettes and reduced hull glow. Weapon effects retain intense bright contrast.
- Common normal movement speed 60 → 90 world units/s per user feedback; same speed for all combat classes and factions. No changes to spec damage, interval, HP, range, costs, or 2× / .75× counter multipliers.
- Default sandbox overview is capped at 1.0 zoom with room for side panels. Manual zoom/focus remains available. Moved diagnostics to the right and added compact landscape battle status.
- Sandbox-only positioning and strategic approach use global awareness in open space; actual shots require local sensor and weapon range eligibility. Simultaneous movement proposals and stable sequential ID attack order. Dead ships do not retaliate later in the tick. No fleet command leashes, terrain, fog system or pathfinding yet.
- Shared finite 3000 E friendly repair fixture, no income. Repair uses the same proportional factor; enemies restore shields only, for free. Weapons and movement cost no energy. Full economy remains deferred. Combat ends at elimination of a faction; repair and clock may continue until pause/reset. Actual match terminal rules are deferred.
- Missile and fighter visuals are cosmetic, so authoritative damage can precede the animated impact. Visual frame counts, scale, quality and effects do not change combat state.

### Executed tests

- Node.js 22.16.0: **25/25 core groups passed** against a checksum-verified local copy of the branch. Includes all 16 retained foundation groups, matrix, shield overflow, friendly-fire rejection, single destruction, range/detection and stable target ties, immunity exclusion, regeneration delay/cost/asymmetry, common repair factor, no movement/firing energy cost, paused commands, positioning and deterministic combat across 30/60/144 FPS schedules.
- **12/12 intended counter duels won** at equal cost: each class counter at 90-unit and 440-unit starting separation, tested with both faction assignments. Friendly victories: carrier over cruiser 4.55/6.40 s; cruiser over destroyer 12.05/13.25 s; destroyer over carrier 4.05/6.10 s (close/approach simulation time). Reversing faction assignment produces corresponding hostile victories. This is controlled sandbox evidence, not universal balance.
- Chromium 144.0.7559.96, headless Linux, software/disabled GPU: **29/29 native browser groups passed**, including the retained 40 directional sprite samples, actual Canvas DPR/picking/resize, optional asset fallback, and a new full mixed-fleet comparison at low/medium/high graphics quality. All four weapon families emitted events, destruction occurred and final authoritative state matched exactly across qualities.
- Separate isolated Chromium app integration passed: launched 13-ship default sandbox; engaged and reached friendly victory, paused and confirmed frozen ticks, switched quality while paused without changing state, changed speed, loaded close-range duel and reached friendly victory, selected/inspected/focused ship, reset to empty scenario, placed both factions, positioned a ship, rejected paused actions and resized to 844×390 landscape. No uncaught page errors. The first run found camera auto-fit zoom could place ships behind panels; corrected overview framing and reran tests.
- Actual HTTP navigation to the local server was attempted but blocked by the environment (ERR_BLOCKED_BY_ADMINISTRATOR). As with Milestone 1, native source modules were loaded in an isolated Chromium document using an import map of data URLs and inlined existing CSS. Git blob hashes of local application and test code matched branch source; test logic was not substituted. Real hosted launch, physical touchscreen testing, additional browsers and sustained hardware performance remain unverified. No FPS or 200-entity target claim.
- Visual inspection of captured setup and combat screenshots confirms darker field and bright colored combat effects. Labels can overlap on dense formations; the existing labels toggle and selection inspection remain available. Art style, effect timing and tactical readability are provisional and subject to human feedback.

### Review steps

1. Serve the source root and run /tests/ (29 groups); optional Node core runner: node tests/run.mjs.
2. Load mixed fleet, Engage, watch weapons and explosions at 1× and 0.5×, zoom or toggle labels as desired.
3. Run all three counter presets at both starting ranges; inspect remaining shield/hull.
4. Try custom compositions in Empty range, place ships and reposition them before engagement. Test graphics quality, pause, camera and debug controls.
5. Review smaller, faster vessels, darker background, more overhead perspective and battle spectacle.

### Deferred

Milestone 3 battlefield generation/navigation/fog/minimap and all later milestones: fleet command, economy/construction, waves, match objective, complete UI, audio and polish. Stop at this review gate until explicit user approval or continuation.

### Milestone 2 visual refinement

User requested less cartoonish ships and removal of circular background artifacts. Muted hull palettes, reduced emissive accents and edge highlights, added subtle hull seams and hatch details. Removed large radial background clouds; replaced them with faint oblique dust bands over the near-black starfield. No combat, camera, ship speed, scale or simulation changes. Local core suite rerun: 25/25 passed. Browser visual review and native Canvas tests for this refinement remain outstanding. Remain at Milestone 2.

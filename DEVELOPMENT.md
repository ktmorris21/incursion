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

# Incursion — Milestone 2: Combat sandbox

A staged implementation of **GAME_SPEC.md v1.1**, following the approved Canvas 2D foundation. This is a combat test range, not a complete playable match.

## Run

Serve the repository root with any static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/ in a modern browser. No build step, dependency installation, backend, CDN or WebGL required. Native ES modules require HTTP serving; file:// is not supported.

## Review the combat sandbox

- Mixed fleet battle is the default setup. Click **Engage** to begin automatic approach, targeting and combat. The result remains visible; repair can continue after the battle.
- Select a counter duel or Empty range and click **Load scenario**. For duels, toggle **Start duel in range** to compare close and approach engagements.
- Choose class and faction, click **Place ship**, then click/tap a battlefield position. Select any vessel and use **Position ship** to move it to a chosen point. These are sandbox controls, not future individual combat-ship orders.
- Inspect shield/hull and weapon stats, pause/resume, change speed or graphics quality, pan using drag/WASD/arrows, zoom using wheel/pinch, and double-click or Focus selection to inspect closer. Fit scene provides a smaller, unobstructed default overview; manual zoom remains available. A hidden tab pauses and requires explicit resume.
- Open /?debug for diagnostics, projection grid, single-step, controlled spawn/removal and observed timings. Reset reloads the selected scenario; pause rejects sandbox mutations.

Combat triangle: light carrier counters missile cruiser; missile cruiser counters destroyer; destroyer counters light carrier. Initial class HP, damage, intervals and range follow the spec. Common speed is provisionally 90 world units/s in response to visual feedback. Friendly repair uses a shared finite 3000 E test reserve with proportional shortage behavior and no income; hostile shields regenerate for free. No terrain, fleet leashes, production or match objectives yet.

## Tests

Open /tests/ for the native browser harness (29 test groups). Optional headless core runner on Node 22+:

```sh
node tests/run.mjs
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for results, limitations, decisions and review criteria.

## Architecture

- src/config.js: centralized settings for world, camera, clock, visuals and combat.
- src/core/: plain-data state and lifecycle, validated commands, deterministic 20 Hz clock, combat/repair logic.
- src/rendering/: invertible oblique camera, cached directional sprites and optional local sprite assets, depth sort, Canvas 2D rendering and event-driven cosmetic effects.
- src/ui/input.js: mouse, keyboard and touch input.
- src/main.js: application orchestration and DOM panels.
- tests/: dependency-free native browser harness and optional Node runner.

Original procedural art only. External transparent PNG/WebP/SVG/atlas artwork can be registered through SpriteRegistry; failed/pending loads use procedural fallback. Art and cosmetic effects do not change damage, range, collision or simulation state.

**Next gate: Milestone 3 — Battlefield generation. Do not begin until the user approves Milestone 2 or explicitly requests continuation.**

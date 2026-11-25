# Incursion — Milestone 1: Application foundation

A fresh implementation following **GAME_SPEC.md v1.1 (2.5D rendering and staged implementation)**. This is the first review increment, not a playable combat or match build.

## Run

Serve the repository root with any static HTTP server. For example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. No dependency installation, build step, backend, CDN or WebGL is required. Use a modern browser with Canvas 2D and native ES modules. Opening the file directly with `file://` is not supported.

## Review the foundation

- Inspect the representative friendly/hostile ship silhouettes and command station on the demo battlefield. The additional moving frigate is a deterministic animation fixture, not a gameplay fleet.
- Click/tap to inspect a sprite; double-click or use **Focus selection** to focus it.
- Drag with the left or middle mouse button, use WASD/arrows, or drag with one finger to pan. Wheel/pinch and the zoom buttons zoom. **Fit scene** restores a useful overview.
- Pause/resume with Space or the toolbar. Try 0.5×, 1× and 2× speed. Camera navigation and inspection remain available while paused.
- Change quality, toggle labels, resize the browser, and try landscape touch controls. A hidden tab automatically pauses; resume explicitly.
- Open `/?debug` for developer diagnostics, the optional projection grid, entity counts, camera/pointer coordinates, backing-store size, timing, and controlled spawn/remove/single-step actions. Spawn/remove and reset are disabled or rejected during pause; single-step is an explicit debug exception.

## Tests

Open `/tests/` for the native browser suite (19 test groups; no external dependencies). Optional core-only test invocation on Node 22+:

```sh
node tests/run.mjs
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the executed tests, limitations and review criteria.

## Architecture

- `src/config.js`: grouped foundation settings, units and initial defaults.
- `src/core/`: plain-data state, lifecycle, validated debug commands, deterministic demo and fixed-step clock; no DOM or rendering imports.
- `src/rendering/`: invertible oblique camera, directional sprite registry, Canvas 2D rendering, depth sort and picking.
- `src/ui/input.js`: mouse, keyboard and multi-touch camera input adapter.
- `src/main.js`: application orchestration and DOM panels.
- `tests/`: native browser harness, shared assertions and optional Node runner.

All initial artwork is original procedural 2D artwork, cached in directional frames. Replacement local PNG/WebP/SVG assets or atlases can be registered through `SpriteRegistry.register(kind, faction, descriptor)`. The descriptor provides `url`, `frames`, `columns`, `scale`, normalized `anchor`, `headingOffset` (radians), and `attachmentPoints`. Failed/pending loads use procedural artwork. Visual sizes and attachment points do not define gameplay collision or damage. No third-party assets are used.

**Next gate:** Milestone 2 — Combat sandbox. Do not begin it until Milestone 1 is approved or continuation is explicitly requested.

# Incursion — playable development build

Single-player defensive space RTS / tower defense. Build an energy economy, organize up to three fleets, survive escalating incursions, then deliver the destabilizer to the active wormhole. This is a first playable development implementation, not a completed acceptance review. See `DEVELOPMENT.md` for verified behavior and remaining gaps against `GAME_SPEC.md` (the authoritative specification already in the repository).

## Run locally

The source is directly servable: no npm install, bundling, backend or network assets required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/` in a WebGL-capable browser. Serve the directory containing `index.html`, not its parent. If deploying to an existing static host, upload the same files as-is. `file://` is not supported.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Select asset | Left click; fleet shortcuts 1/2/3 | Tap asset or fleet shortcut |
| Move frigate/civilian | Right click ground | Tap empty ground while selected |
| Pan | WASD, arrows, drag battlefield | Drag battlefield |
| Zoom | Wheel | Pinch |
| Focus fleet | Double-click or double-press 1/2/3 | Double-tap |
| Assign miner | Select miner, click deposit or use asset panel | Same |
| Build | Select constructor, structure type, click location, Confirm | Same |
| Build wall | Select constructor, wall line, click both endpoints, Confirm | Same |
| Queue ships | Select shipyard, select destination fleet if desired, choose ship | Same |
| Pause | Space or HUD | HUD |
| Cancel build / menu | Escape or visible control | Visible control |
| Health bars | H or settings | Settings |

Tip: dock the initial miner immediately, grow extraction, move Alpha to cover the active approach, and mix missile batteries and beam turrets. At full charge, bring a living frigate within 80 world units of the command station (or dropped device) and then within 100 of the active wormhole for five uninterrupted simulation seconds. The command station must survive.

## Native tests and diagnostics

Open `http://localhost:8000/tests/` for the browser-native simulation test suite. It is independent of WebGL. There is an optional Node runner for the exact same test functions (Node is not required to serve or play):

```sh
node tests/run.mjs
node tests/scenario.mjs sector-01 10
```

The scenario uses normal commands, no debug actions. It is a scripted strategy, not a human playtest, and results depend on the seed. Start the game with `?debug` to expose FPS, simulation timing, selection data and controlled sandbox actions. Debug-assisted games are excluded from history. `window.incursion` is available only in debug mode.

## Architecture

- `src/config.js`: grouped entity, combat, world, pacing and economy constants.
- `src/world.js`: independent seeded random stream, terrain and validation, grid A* navigation, segment collision.
- `src/sim.js`: data-driven authoritative simulation, validated commands, combat, fleets, economy, construction, wave and objective systems. No DOM or renderer imports.
- `src/render.js`: self-contained native WebGL 3D geometry with Canvas 2D tactical and effects overlay; no external assets. This is a deliberate temporary deviation from the Three.js requirement, explained in development notes.
- `src/main.js`: fixed 20 Hz clock, DOM input/HUD, camera, settings/history, procedural audio, debug tools.
- `tests/`: native browser tests, optional Node runner and reproducible normal-command scenario.

The game keeps settings and the latest 20 ordinary results in versioned localStorage keys. There is no active-match save. All procedural geometry, sounds and art in this package were created for this implementation. No third-party art or audio assets.

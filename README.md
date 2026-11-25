# Incursion — v1.2 planar 3D foundation

Serve the root using any static HTTP server (e.g. python3 -m http.server 8000). Open localhost:8000. Requires WebGL 2. Three.js r170 is vendored locally under vendor/ with MIT license. No build or CDN.

Milestone 1 review: inspect the representative ships and station, drag/pinch/zoom, select, focus, pause, reset and change graphics quality. Use ?debug for diagnostics and spawn/remove fixtures. Open /tests/ for native tests; node tests/run.mjs for core tests. Combat simulation code is retained but battle controls and effects are deferred to the reopened Milestone 2. See DEVELOPMENT.md for actual validation status. Do not advance without approval.

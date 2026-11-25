// Milestone 1: distances in world units, times in seconds, screen sizes in CSS pixels.
export const CONFIG = Object.freeze({
  world: Object.freeze({width: 1800, height: 1800}),
  clock: Object.freeze({hz: 20, speeds: Object.freeze([0.5, 1, 2]), maxFrameSeconds: 0.25, maxStepsPerFrame: 10}),
  camera: Object.freeze({compression: 0.65, minZoom: 0.22, maxZoom: 3, keyboardPixelsPerSecond: 500, wheelSensitivity: 0.0014, dragThreshold: 6, fitPadding: 84}),
  visuals: Object.freeze({headingFrames: 24, spritePixelsPerUnit: 2, maxDpr: 2, backgroundSeed: 7149, starCounts: Object.freeze([260, 120, 42]), qualityDpr: Object.freeze({low: 1, medium: 1.5, high: 2}), defaultQuality: 'auto'}),
  demo: Object.freeze({seed: 'foundation-01', orbitSpeed: 0.095, showLabels: true})
});
export const LABELS = Object.freeze({station:'Command station', frigate:'Command frigate', carrier:'Light carrier', missile:'Missile cruiser', destroyer:'Destroyer', miner:'Miner', constructor:'Constructor'});

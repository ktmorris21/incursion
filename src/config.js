// Milestone 2: distances in world units, times in seconds, screen sizes in CSS pixels.
export const CONFIG = Object.freeze({
  world: Object.freeze({width: 1800, height: 1800}),
  clock: Object.freeze({hz: 20, speeds: Object.freeze([0.5, 1, 2]), maxFrameSeconds: 0.25, maxStepsPerFrame: 10}),
  camera: Object.freeze({elevation: 60, compression: Math.sin(Math.PI/3), minZoom: 0.22, maxZoom: 3, keyboardPixelsPerSecond: 500, wheelSensitivity: 0.0014, dragThreshold: 6, fitPadding: 84, sandboxFitMaxZoom: 1.0}),
  visuals: Object.freeze({shipScale: 0.52, maxDpr: 2, backgroundSeed: 7149, starCounts: Object.freeze([260, 120, 42]), qualityDpr: Object.freeze({low: 1, medium: 1.5, high: 2}), defaultQuality: 'auto'}),
  demo: Object.freeze({seed: 'foundation-01', orbitSpeed: 0.285, showLabels: true})
});
export const LABELS = Object.freeze({station:'Command station', frigate:'Command frigate', carrier:'Light carrier', missile:'Missile cruiser', destroyer:'Destroyer', miner:'Miner', constructor:'Constructor'});

export const COMBAT=Object.freeze({
 speed:270, delay:4, shieldRate:.08,hullRate:.01,shieldCost:.5,hullCost:2,sandboxEnergy:3000,
 classes:Object.freeze({
 carrier:Object.freeze({shield:80,hull:120,damage:15,interval:.5,range:480,sensor:780,cost:1500}),
 missile:Object.freeze({shield:120,hull:180,damage:30,interval:2,range:660,sensor:900,cost:1500}),
 destroyer:Object.freeze({shield:160,hull:240,damage:22,interval:1,range:330,sensor:690,cost:1500}),
 frigate:Object.freeze({shield:200,hull:300,damage:8,interval:1,range:390,sensor:900,cost:6000}),
 station:Object.freeze({shield:600,hull:1200,damage:0,interval:1,range:0,sensor:400}),
 miner:Object.freeze({shield:40,hull:100,damage:0,interval:1,range:0,sensor:160}),
 constructor:Object.freeze({shield:40,hull:100,damage:0,interval:1,range:0,sensor:160})
 }),
 matrix:Object.freeze({carrier:Object.freeze({carrier:1,missile:2,destroyer:.75}),missile:Object.freeze({carrier:.75,missile:1,destroyer:2}),destroyer:Object.freeze({carrier:2,missile:.75,destroyer:1})})
});

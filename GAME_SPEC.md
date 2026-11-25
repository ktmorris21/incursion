# Incursion — Game specification

**Version:** 1.2 — Planar 3D rendering and staged implementation  
**Status:** Approved concept decisions consolidated for initial implementation  
**Audience:** Codex and human developers  
**Working title:** Incursion

## 0. How to use this document

This is the authoritative initial game design, not a brainstorming transcript. Implement one milestone at a time in the order defined in Section 14. Each milestone must be runnable, tested and submitted for human review before beginning the next. The complete minimum playable game remains the ultimate deliverable, not the first review gate. Do not add mechanics outside this scope. No game code is included in this document.

**Requirement language:** MUST denotes an accepted requirement; SHOULD denotes a recommended implementation choice. Numerical values explicitly marked *initial tuning* are editable starting points, not validated balance. Section 15 records implementation assumptions where the design has not fixed exact behavior. Keep these assumptions visible in configuration and development notes; do not silently convert them into permanent rules.

## 1. Vision and identity

Incursion is a single-player, space-themed defensive RTS/tower defense hybrid. The inspiration is the strategic satisfaction of turtling in an RTS such as Age of Empires II: exploit natural terrain, construct layered fortifications, choose effective unit compositions, and allocate scarce mobile forces. Unlike lane-based tower defense, the enemy navigates a free battlefield. Unlike conventional RTS, individual combat ships are not directly commanded.

The player starts with a command station, a small fleet and civilian support vessels. They establish energy extraction and defenses, withstand progressively stronger enemy incursions, adapt to wormhole relocation, then deliver a charged destabilization device to the active wormhole. Destroying the wormhole wins; losing the command station loses.

### Design pillars

- **Composition:** a hard-counter combat triangle makes the choice of ships materially important.
- **Geography:** procedural terrain and variable approach corridors change the optimal defense every match.
- **Positioning:** at most three command frigates control the entire mobile combat force; static defenses cover gaps and free fleets to redeploy.
- **Investment:** a single continuous-flow energy economy creates competition among construction, production and combat recovery.
- **Accessibility:** low micromanagement, short matches, a clear interface and landscape-first mobile support.
- **Spectacle:** colorful fighter swarms, missile salvos, solid energy beams, shields and explosions are core presentation requirements, not optional end-stage decoration.
- **Replayability:** varied geography, enemy composition and relocation events create different strategic problems without requiring campaigns or a technology tree.

## 2. World and battlefield

### 2.1 Spatial model

Gameplay occurs on a bounded two-dimensional plane in outer space. Render a real-time 3D battlefield using a fixed, near-overhead oblique orthographic camera, with pan and zoom. The authoritative simulation remains strictly planar: map simulation (x,y) to scene (x,0,y); visual height, pitch, roll and geometry never affect gameplay. No tactical altitude, orbital dynamics or freely rotating camera. Map dimensions and movement speeds are configurable. A moderate map must provide meaningful travel and redeployment times while remaining navigable on a phone.

### 2.2 Terrain

| Terrain | Gameplay effect | Presentation |
|---|---|---|
| Open space | Normal movement and targeting | Dark starfield |
| Dense asteroid fields | Impassable to all ships | Clearly delineated dense rock clusters |
| Sparse asteroid fields | Same movement penalty for all classes | Scattered rocks |
| Nebulae | Reduced sensor and targeting ranges | Translucent colored clouds with legible boundaries |
| Energy deposits | Docking sites for miners; unlimited energy supply | Luminous mineral formations |

Terrain is visible at match start. Enemies are subject to fog of war: only detected enemies are rendered as current contacts or shown on the minimap. Friendly sensors reveal nearby enemies, with nebula penalties. Decorative backgrounds and celestial objects never affect navigation. Dense terrain is a movement obstruction; weapon occlusion is not an initial mechanic (assumption A1).

### 2.3 Procedural geography

Use seeded generation with broad archetypes (working labels Bastion, Frontier, Crossroads, Labyrinth). Vary asteroid shapes, corridor widths, travel distances, resource locations and potential wormhole zones. Maps are not required to be symmetrical. Some maps MUST offer more than three meaningful approach corridors from an active wormhole to the base, forcing static/mobile tradeoffs. Others may be naturally defensible with fewer corridors. Do not make every map a single obvious kill zone.

Approximately 50% of **potential mining output**, excluding baseline command station income, MUST be outside the natural starting defensive area. Nearby deposits offer safe economic growth; distant deposits require greater exposure and defensive investment. The enemy has no deposits, miners or economy. There is no requirement for a 20% faction income advantage.

Validate every map before play: all potential wormhole zones must have navigable paths to the command station and reachable device deployment areas; starting assets and buildable space must be valid; deposits must be reachable; asteroid clusters cannot overlap critical spawn/docking points; resource distribution and corridor diversity must meet generator constraints. Use a bounded retry process and a known-valid fallback rather than an infinite generation loop. Preview and regenerate maps before play.

### 2.4 Wormhole zones

Multiple potential wormhole sites are generated and visible from the beginning. Exactly one is active at any time. Enemy ships emerge from it. Announce a new destination and give brief warning before each relocation; expect one or two events per match, at randomized intervals. Existing enemies remain on the battlefield when relocation happens. Once the device is charged, prohibit further relocation. Prevent construction from obstructing the portal spawn/deployment area. Exact lore is deferred.

## 3. Match loop and game state

1. Choose duration, difficulty and seed; preview the generated map and accept or regenerate it.
2. Begin with one command station, one shipyard, one command frigate, one light carrier, one missile cruiser and one destroyer assigned to it, one miner and one constructor; baseline energy income and stored energy; no initial defensive towers or barriers.
3. During a short grace period, deploy the miner, position the fleet and initiate construction and production.
4. Automatically spawn an enemy wave. The player positions fleets and relies on automatic combat and static defenses.
5. Once every enemy from the wave is eliminated, start the recovery countdown. The next wave begins automatically after it expires. Energy, construction and charging continue during both combat and recovery.
6. Expand energy extraction, add defenses, develop up to three fleets, adapt to announced wormhole relocations.
7. After the automatic charge completes, collect and deliver the device using a command frigate. Survive while deploying it.
8. Win when deployment completes; lose immediately if the command station is destroyed. Stop gameplay simulation and present results over the existing battlefield.

Match duration presets are 10, 20 and 30 simulation minutes, representing the time to device readiness, not a hard timeout. Actual completion may take longer. Difficulty and speed are independent. Simulation speeds are 0.5×, 1× and 2×. Pause freezes all gameplay and prohibits gameplay orders, but allows camera movement, inspection and settings. Automatically pause when the tab becomes hidden; require explicit resume (recommended). No active match save/load.

## 4. Combat rules

### 4.1 Hard-counter triangle

**Light carrier counters missile cruiser; missile cruiser counters destroyer; destroyer counters light carrier.** Both factions use the same base combat statistics and counter relationships. Counters are explicit damage multipliers, not emergent accuracy or evasion calculations.

| Attacker / target | Carrier | Missile cruiser | Destroyer | Neutral class |
|---|---:|---:|---:|---:|
| Carrier | 1.0 | 2.0 | 0.75 | 1.0 |
| Missile cruiser | 0.75 | 1.0 | 2.0 | 1.0 |
| Destroyer | 2.0 | 0.75 | 1.0 | 1.0 |
| Neutral class | 1.0 | 1.0 | 1.0 | 1.0 |

These are accepted initial configurable multipliers. The 2/0.75 ratio is approximately 2.67:1 before base damage differences. Missile batteries belong to the missile class; beam turrets belong to the destroyer class, both for outgoing and incoming damage. Other structures, command frigates and civilian vessels are neutral. No carrier-equivalent tower.

### 4.2 Ship characteristics

| Ship | Relative DPS | Relative range | Relative HP | Weapon |
|---|---|---|---|---|
| Light carrier | Highest | Medium | Lowest | Swarms of small fighters firing blaster bolts |
| Missile cruiser | Lowest | Longest | Medium | Missile salvos |
| Destroyer | Medium | Shortest | Highest | Solid concentrated energy beams |
| Command frigate | Light defensive fire | Modest | Configurable | Small energy bolts |
| Miner / constructor | None (recommended) | None | Configurable | No weapon |

All combat classes share normal movement speed and terrain restrictions. No speed-based combat counter mechanics. Command frigates and civilian vessels are outside the triangle. Enemy has only the three primary combat classes and no physical command frigates.

### 4.3 Damage and recovery

Combat hits are calculated, not physically simulated. Each eligible attack applies base damage multiplied by the class matrix. Target must be alive, hostile, detectable and within effective weapon range. Target selection is nearest eligible enemy, not best counter. Resolve ties consistently by entity ID. No friendly fire. Cosmetic projectile paths, fighter count and collision effects do not affect outcomes.

Each damageable asset has shield HP and hull HP. Damage first consumes shields; excess damage carries to hull. Hull at zero destroys the entity. No separate armor rating or mitigation layer. Shields regenerate relatively quickly; hull repairs more slowly. Friendly regeneration begins only after a configurable damage-free interval and consumes energy per HP restored. Enemy shields regenerate after a similar delay without energy costs; enemy hull never regenerates. Regeneration cannot exceed maximum HP. Weapon firing and movement consume no energy. Existing assets remain operational during energy shortages.

### 4.4 Autonomous engagement

Ships automatically engage the nearest eligible enemy within range and maneuver within their command frigate's operational limits. They may position according to weapon range, but do not independently pursue beyond the engagement leash. On movement orders, follow the frigate and engage targets opportunistically without abandoning fleet cohesion. Static weapons target nearest eligible enemies in range. No individual combat orders, stances or attack-move interface is required.

## 5. Mobile units and fleet command

### 5.1 Roster

Friendly: command frigate, light carrier, missile cruiser, destroyer, miner, constructor. Hostile: light carrier, missile cruiser, destroyer only. Carrier fighters are cosmetic representations of their parent carrier's attacks; never independent combat entities.

### 5.2 Command and capacity

Maximum three command frigates, each with ten subordinate combat ship slots. Each ship consumes one slot. Count queued frigates against the frigate limit and reserved/in-transit reinforcements against fleet capacity (recommended). Civilian ships do not consume fleet capacity. The player directly controls only command frigates and civilian ships.

Command frigates accept move orders only and automatically defend upon arrival. Subordinates follow, separate locally, compress through narrow corridors and reform. Formation shape is secondary to successful navigation. Use configurable formation and engagement radii. A follower must not remain permanently stuck at an unreachable formation offset. All fleet movement obeys terrain and world bounds.

### 5.3 Production and reinforcement lifecycle

Shipyards build individual ships. A player can select a destination command frigate when queuing a combat ship. Upon completion, assigned ships travel physically at accelerated speed to the moving frigate, invulnerable until arrival. They cannot fire or be targeted during this special transit (recommended). They still respect impassable terrain. This travel mode is only for newly produced reinforcements, never for general movement, retreat or reassignment.

If a destination frigate is lost before production or transit completes, cancel its reservation and send the ship to the command station as an ordinary unassigned ship. Unassigned ships return to base, remain there, and automatically defend the local area. A frigate entering the collection radius automatically collects available unassigned ships up to capacity. It must physically collect them; no remote reassignment after command loss. Transfers between existing fleets are permitted only near friendly shipyards; use a simple manual transfer interaction and respect capacity. No automatic transfers between operational fleets.

### 5.4 Command loss

Frigate destruction is a substantial strategic event. Surviving subordinates lose their assignment, retreat to the command station at normal speed, remain vulnerable during retreat and defend on arrival. Replacement frigates are buildable but expensive and slow relative to ordinary combat ships. Keep the lost fleet slot visible in the interface and notify the player. If it carried the destabilizer, drop the device at its destruction position.

### 5.5 Civilian control

Miners and constructors are directly selectable, movable and manually assigned jobs. They do not follow command frigates. They can be attacked and destroyed. A miner docks at a selected unoccupied deposit and generates energy continuously; one miner per deposit; no hauling trips. Moving or losing the miner stops production immediately. A constructor travels to a valid placed project, initiates it, and may immediately leave; the project proceeds autonomously with cosmetic construction effects. A constructor may initiate another project while prior projects continue. No limit on simultaneous active structure projects beyond valid placement and energy availability. No requirement for multiple constructors to accelerate one project.

## 6. Defensive structures and construction

### 6.1 Initial structure roster (seven types)

| Structure | Function |
|---|---|
| Command station | Headquarters, baseline energy, construction influence, device charging, defeat condition |
| Shipyard | Serial ship production, fleet transfer location |
| Energy storage station | Increases maximum stored energy |
| Sensor station | Extends enemy detection coverage |
| Missile battery | Fixed missile cruiser equivalent: long range, lower DPS, medium relative durability |
| Beam turret | Fixed destroyer equivalent: short range, medium DPS, high relative durability |
| Barrier generator/post | Creates connected energy wall segments that obstruct hostile movement |

Only two weapon tower types. No fighter hangar, mining station, reactor, research station or shield support station. Static weapons provide better localized firepower and durability per energy spent than equivalent mobile ships, without consuming fleet slots. Their immobility and wormhole relocation balance this advantage. All structures use shields and hulls and consume energy for friendly regeneration.

### 6.2 Energy walls

Walls are stylized glowing energy fields between placed posts. Provide a line placement tool that previews endpoints, intermediate posts and total cost; automatically space posts within a configurable maximum span. Explicitly record adjacent links from each placed line; do not create unintended connections across nearby unrelated lines. Both endpoints must be complete and alive for a segment to operate. Adjacent links collapse immediately on post destruction or dismantling. Segments have no independent HP. Enemy ships cannot cross active segments, but friendly ships and both sides' weapons can pass through. No ongoing energy cost. Enemies may route around walls or attack the posts to breach them. Prevent placement through dense terrain except harmless contact at its boundary; no unbreachable or indestructible closure exploit.

### 6.3 Placement and construction

Use free placement with optional snapping. Preview valid/invalid placement, footprint, construction influence, range, energy cost, build time. New structures must be within friendly construction influence and not overlap other structures, dense obstacles, deposit docking sites or portal exclusion zones. Most completed structures extend construction influence. Completed disconnected infrastructure still functions and provides local influence. Unfinished projects do not provide influence or operational capabilities (recommended).

Select constructor, choose structure or wall tool, position preview, confirm, and send constructor to initiate work. Construction consumes energy over time and progresses according to common energy availability. Constructor may leave after initiation. Multiple projects can proceed in parallel. Construction visuals should show holographic placement and assembly. A started project is vulnerable (recommended); destruction removes it. Allow cancellation and dismantling with a partial energy refund, capped at storage capacity; refund only energy actually spent. No full-cost refund exploit.

## 7. Energy economy

Energy is the sole resource, measured in energy units (E); production and demand use E per simulation second. There is no separate credit, mineral, power-grid or upkeep system. The command station provides guaranteed baseline income and initial storage. Docked miners add deposit-specific production. No reward income from killing enemies. Deposits do not deplete.

### 7.1 Flow and allocation

All active ship production, structure construction, shield recharge and hull repair consume energy progressively. Weapons, movement, energy walls, ordinary operation and device charging do not consume energy. Surplus fills storage; excess beyond capacity is discarded. Build storage structures to increase reserves. On storage destruction, clamp stored energy to the new capacity (recommended).

For a simulation step of duration dt, compute total requested energy D as the sum of all eligible activities' requested energy for that step, clamped to their remaining work or missing HP. Available energy A = stored energy + production rate × dt. Allocation factor f = 1 if D = 0, otherwise min(1, A/D). Every active consumer receives its requested energy × f and progresses by the corresponding fraction. New storage = min(capacity, max(0, A − D × f)). All consumers must use the same factor for that step; iteration order must not grant priority. No separate power limit, no consumer priority controls, and no cancellation because of a temporary shortage. Production and repair slow proportionally; existing weapons still operate normally.

A construction project with total cost C and nominal duration T requests C/T energy per second until finished. Repair costs are defined as E/HP and nominal rates as HP/sec. Queued but not active ship projects consume no energy. Each shipyard has one active project; additional shipyards increase throughput. Queue cancellation and reordering must be supported, with clear treatment of partially completed work (see assumptions).

### 7.2 Strategic balance

Safe mining should allow a viable defensive strategy at normal difficulty; exposed mining increases capacity but demands protection. The exact number of sites is configurable; begin with two near and two exposed, with equal aggregate yields for both groups. The three combat classes have approximately equal costs. No recurring maintenance expenses; damage recovery is not free. Energy storage should materially buffer post-wave regeneration demand. Show production, requested demand, actual consumption, net flow, stored amount/capacity and slowdown factor in UI.

## 8. Progression and victory objective

No research, upgrades, technology tiers or unlockable unit classes in initial scope. All ordinary assets are available from the beginning subject to energy, construction influence and capacity. Progression is physical expansion, additional fleets, layered defenses and surviving escalating enemy waves.

### 8.1 Device lifecycle

The command station charges one wormhole destabilization device automatically over simulation time according to the duration preset. No energy investment is required. At full charge, announce readiness and permanently disable further wormhole relocations. A command frigate approaches the command station to collect it. Only one carrier may possess it. Mark its carrying frigate in the fleet panel, battlefield and minimap.

Move the frigate within the active wormhole activation radius to automatically deploy. Deployment requires a short continuous stay within range while alive. Leaving range interrupts and resets progress (recommended). Combat continues during deployment. On carrier destruction, the device remains at the destruction location as an indestructible recoverable object; another command frigate can physically collect it. No recharging and no automatic return to base. Ensure dropped locations are reachable, projecting to nearest valid position if necessary. Successful deployment collapses the portal and ends the match immediately with victory. The command station's destruction ends the match immediately with defeat; use defeat precedence if both occur on the same tick (recommended).

## 9. Enemy design and AI

The enemy is a wave generator, not a simulated opposing economy or RTS player. It has no shipyards, construction, mining, command frigates or resource accounting. Hostile combat ships share friendly class statistics and multipliers, except for the regeneration asymmetry in Section 4.

### 9.1 Wave director

Use a configurable combat budget that increases with normalized match progress and difficulty. Select constrained randomized combinations of the three classes, including balanced and class-heavy waves. Do not generate perfect counters based on the player's current composition. Display approximate upcoming composition (e.g., low/moderate/high presence of each class) and countdown, rather than exact counts. Enemy groups may split across multiple natural routes. Spawn enemies physically at the active portal; no fixed invisible lanes.

The next wave waits until all enemies of the current wave are destroyed, then a recovery interval runs. The first wave follows the initial grace period. Continue waves at the maximum established strength after the device charges until victory or defeat. Never spawn a new wave merely because a clock expires while survivors remain. Keep an eye on the potential exploit of deliberately retaining one enemy while accumulating resources or charge; do not silently change the accepted sequencing rule. Use diagnostics and playtests to evaluate this.

### 9.2 Navigation and objectives

The primary strategic objective is the command station. Occasionally assign groups to exposed miners or economic infrastructure. If a secondary objective disappears, continue toward the command station. At the tactical level, attack the nearest eligible friendly asset; after it dies resume movement or reacquire. Enemy navigation weighs travel time and approximate breach cost. Do not require an unobstructed route: a wall is a destructible obstacle, not an absolute invalidation of a route. If a path needs a breach, route to an attackable generator, attack it and replan when the segment falls. Enemies should not stall indefinitely behind barriers or terrain.

Use terrain-aware group routes, local spacing and bounded replanning. Choose alternate corridors when viable; avoid omniscient perfect knowledge of the player's hidden assets (recommended). A group may attack known barriers encountered along its route. The enemy uses the same basic movement restrictions as the player. No intentional difficulty advantages through increased base HP, damage, movement speed or different counter rules.

### 9.3 Difficulty and pacing

Four presets (working labels Cadet, Commander, Veteran, Admiral). Adjust initial wave budget, budget growth, recovery interval, composition variation and maximum groups. Preserve meaningful recovery periods and distinct wave identities. Scale economy, construction and wave pacing by selected duration without changing fundamental combat statistics or normal movement speed. A 10-minute match should reach the same general strategic arc more quickly than a 30-minute match. Do not guarantee victory at the charge deadline. Enemy wave budget caps at the final configured value; do not escalate without bound afterward.

## 10. Visual and audio direction

### 10.1 Artistic style

Stylized cinematic science fiction inspired by the readability and colorful energy effects of StarCraft, with dark atmospheric space. Aim for credible, detailed hard-surface spacecraft rather than cartoon-like silhouettes: actual 3D meshes, metallic materials, directional lighting, fine panel detail, restrained emissive accents and strong contrast against a predominantly black starfield. Use the player's reference screenshots as inspiration only, not copied assets. Friendly ships are angular, industrial, metallic, with blue/cyan emissive accents. Hostile ships are curved or segmented, darker, with red/violet accents. Shapes, silhouettes and markings must differentiate faction and class independently of color. Carrier hangar bays, missile banks and prominent beam emitters distinguish weapon classes. Command frigates are immediately recognizable; miners and constructors have visibly industrial equipment.

Use layered starfields, subtle parallax, varied asteroid forms, soft nebulae, glowing energy deposits and restrained background planets. Terrain boundaries, build areas and silhouettes must remain readable. Decorative objects have no gameplay effect.

### 10.2 Effects

| Event | Required presentation |
|---|---|
| Carrier attack | Cosmetic fighter launches, banking attack runs, repeated small luminous bolts, return/recovery |
| Missile cruiser / battery | Recognizable salvos, curved exhaust trails, explosive impacts |
| Destroyer / beam turret | Solid phaser-like energy beams, emitter glow and concentrated impact flashes |
| Command frigate attack | Modest energy bolts |
| Shield hit | Brief visible shield bubble/ripple; distinguish hull impacts |
| Hull damage | Sparks, localized damage effects and critical-state cues |
| Destruction | Flash, explosion, fading debris; larger effect for major assets |
| Movement | Engine glow and trails; distinct reinforcement fast-travel effect |
| Mining | Extraction beam between miner and deposit |
| Construction and shipyard | Assembly, welding effects and launch animations |
| Energy storage | Illumination indicating charge level |
| Energy barrier | Visible luminous line between posts; collapse on generator loss |
| Wormhole | Swirling animated vortex, opening/relocation/collapse effects |
| Device ready / dropped | Clear in-world marker and strategic alert |

Use faction-based weapon colors, with weapon shape, motion and rhythm distinguishing type. Decorative effects are driven by authoritative simulation events and should correspond closely to hit timing. Do not let effects change damage or targeting. Use minimal cinematic treatment: no forced camera takeover for combat or victory. Results appear as an overlay on the existing battlefield.

### 10.3 Rendering quality

**Rendering baseline: real-time planar 3D, using Three.js and WebGL 2.** The battlefield remains a continuous two-dimensional simulation plane mapped onto the 3D XZ plane. Use a fixed orthographic camera initially 60 degrees above the plane (90 degrees is directly overhead), with configurable elevation, pan and zoom; no player-controlled camera rotation. Centralize world-to-screen projection and ray-to-plane inverse picking. All placement, range, path and collision geometry is defined in simulation coordinates.

Create recognizable hard-surface 3D spacecraft and structures using procedural mesh assemblies and physically based metallic/roughness materials, or original/licensed local models. Use layered hull plating, bevels, engine housings, missile banks, hangars and beam emitters, with a coherent directional key light, restrained fill lighting and selective emissive details. Avoid large cartoon outlines, overly saturated hull colors and chunky toy-like proportions. Keep ships small relative to the battlefield. Preserve the reviewed visual direction: near-black space, subtle starfield without conspicuous circular cloud gradients, and high-contrast luminous combat. Actual 3D geometry and lighting must remain present at all graphics qualities; sprites may be used for particles, distant decoration and HUD only, not as the primary ship representation. Use mesh yaw for heading and optional cosmetic banking. Keep stable entity IDs and model anchors, and use depth testing for opaque models and suitable transparent-effect ordering. HTML/CSS or projected overlays provide health bars, labels and selection indicators.

Use an asset registry mapping class/faction to reusable local model descriptors, scales, orientation, anchors and weapon/engine attachment points. Support optional local GLB/glTF models with a pinned, locally vendored loader when needed; procedural 3D fallback models are required. No runtime external asset services. Geometry/material ownership and disposal must be explicit; share immutable geometries and materials, clone transforms or instance meshes where appropriate.

Use depth-tested 3D terrain and ships, layered starfields, emissive weapon effects, additive particles, missile trails, shield shells and explosions. Selective bloom or equivalent glow may be used, but retain a clean dark background and readable silhouettes. Limit expensive lighting, transparent overdraw, postprocessing resolution, particle counts and draw calls; use culling, pooling and instancing as appropriate. Low/medium/high may change pixel ratio, mesh detail, lighting/effects quality and decorative fighters but never simulation outcomes. Provide reduced-flash/effects controls where practical. Avoid unbounded per-frame allocations and dispose resources on reset or renderer teardown.

### 10.4 Audio

Include atmospheric music, combat music variation where feasible, distinctive weapons, impacts, explosions, command feedback and strategic alerts. Independent music, effects and interface volume controls plus mute. Start audio only after a user interaction in accordance with browser autoplay behavior. Limit simultaneous sounds and avoid alert spam. No voice acting requirement. Assets must be original, appropriately licensed or procedural; document attribution for any third-party content.

## 11. Player interface and controls

### 11.1 Layout

The battlefield occupies most of the screen. Persistent top HUD shows energy stored/capacity, net energy flow, slowdown status, current wave or next countdown, approximate threat composition, device charge/status, pause and speed. Use compact persistent fleet shortcuts and an expandable roster, contextual panels for selected assets, shipyard, construction, civilian operations and economy, plus interactive minimap. Native HTML/CSS overlays the WebGL 3D battlefield. Adapt layout to desktop and landscape-first mobile; do not merely shrink desktop UI. Keep touch targets comfortable, respect safe areas, avoid hover-only functionality, and ensure panels can collapse without losing critical alerts.

### 11.2 Fleet display

Show Alpha, Bravo, Charlie as stable command slots, including empty, building, operational or command-lost state. Display frigate shield/hull, status (moving, defending, engaged, etc.), occupied/reserved capacity and class counts. Expanded roster lists individual subordinate ships grouped by class with shield/hull bars and reinforcement status. Show device possession. Single selection selects frigate; double-click/tap focuses camera. Selecting a subordinate for inspection does not enable individual movement orders. Include unassigned ships at base in an appropriate roster.

### 11.3 Selection and orders

| Action | Desktop | Mobile |
|---|---|---|
| Select friendly asset | Left click | Tap asset |
| Move controllable ship | Right click ground | Tap empty ground while selected |
| Camera pan | Middle drag / WASD / arrows | Drag battlefield |
| Zoom | Mouse wheel | Pinch |
| Select fleet | 1/2/3 or fleet shortcut | Fleet shortcut |
| Focus fleet | Double-click or double-press key | Double-tap shortcut |
| Inspect asset | Select / details | Select / details, optional long press |
| Confirm construction | Click valid preview / confirm | Explicit confirmation button |
| Pause | Space or HUD | HUD |
| Cancel action / menu | Escape | Visible cancel/menu control |
| Health bars | H or settings | Settings |

These bindings are recommended defaults. Ensure drag/pinch does not accidentally issue a movement or construction order. For miners and constructors, contextual target selection assigns docking or construction jobs; support task cancellation and manual movement. A combat ship cannot be moved directly even if inspected. While paused, reject all gameplay mutations (including queue changes, assignments and placement) at the command-validation layer; camera and information panels remain available.

### 11.4 Contextual panels

- **Construction:** select constructor, choose structure or wall line, preview legal placement, range and cost, confirm, show travel and progress. Dismantle/cancel available with refund information.
- **Shipyard:** show all six friendly ship classes, costs, nominal build times, triangle strengths/weaknesses, optional destination fleet for combat ships, current progress and reorderable/cancellable queue. Display reserved capacity and limit errors.
- **Civilian:** list each miner and constructor, current task, idle/moving/docked status and focus/selection action. Highlight idle miners.
- **Economy:** stored energy, capacity, production breakdown, requested and actual consumption by construction, production, shields and hull, current efficiency and time-to-empty estimate when appropriate. Avoid confusing a negative net rate with an already empty reserve.
- **Inspection:** show class, faction, shields, hull, range, status and relevant role information. Show only information allowed by fog of war for enemies.

### 11.5 Tactical overlays and minimap

Provide selectable weapon-range, construction-influence and sensor-coverage overlays during normal play and appropriate placement previews. Show actual effective ranges, including terrain penalties, rather than misleading nominal rings. Health-bar settings: always, selected or damaged, selected only. Fleet-panel health is always available independently of battlefield health settings; hidden enemy health bars never reveal enemies.

Minimap shows all terrain, deposits, friendly units and structures, detected enemies only, potential portal zones, active portal, relocation destination when announced, device location/status and camera footprint. Click/tap moves camera. Alert selection focuses the relevant location. Critical alerts: command station attack, command loss, device ready/dropped, relocation, reserves depleted, miners lost, incoming wave. Routine construction/production notices expire; avoid repeated spam and distinguish alerts without relying on color alone.

### 11.6 Learning assistance

Provide contextual tooltips and a short optional tutorial explaining movement of command frigates, combat triangle, mining and energy flow, construction, regeneration and device delivery. No separate campaign or long mandatory tutorial. Include an in-game triangle reference. Player can skip or replay tutorial assistance.

## 12. Game modes, replayability and persistence

One initial mode: defend and destroy the wormhole. Main menu offers 10/20/30-minute presets, four difficulty presets, visible editable seed and map preview/regeneration. Battlefield archetype selection may be offered as optional generator preference; random archetype is default. Seed plus generation settings reproduces map; independent derived random streams for terrain, encounters and cosmetics prevent visual changes from modifying wave composition. Encounter generation is reproducible with the same seed/settings and algorithm version; full cross-browser deterministic replay is not required.

At victory or defeat freeze gameplay and show overlay with duration, waves defeated, hostile losses, friendly losses by class, frigates lost, structures built/destroyed, peak and total energy produced, energy spent by consumer category, shortage time, class-specific combat contribution, difficulty and seed. Allow inspecting the frozen battlefield, restarting or returning to menu. Results should count real simulation events, not fabricated metrics.

Use localStorage for settings, preferred match configuration, tutorial completion and previous match results. Limit history (initial recommendation: 20 results), tolerate unavailable or corrupt storage, and version persisted data. No active-match save/resume, accounts, online leaderboard or persistent upgrades. No backend. Future expansion ideas (not tasks): endless mode, campaigns, technology, new ship classes, custom maps, cooperative play.

## 13. Technical architecture

### 13.1 Hard constraints

- Standalone HTML/CSS/modern JavaScript, native ES modules, real-time Three.js/WebGL 2 renderer with planar gameplay.
- **No build step.** A conventional static HTTP server serves the checked-in source and assets directly. No mandatory npm install, bundler, transpiler, framework, generated dist directory, server-side code or external gameplay services.
- Vendor a pinned browser-ready Three.js release locally with its license, using native module imports. Vendor optional loaders and postprocessing modules from the same release only when needed, with license notices. No mandatory package installation. All runtime assets must be available from the same static deployment; no required CDN.
- Native browser test harness; no external testing tooling required. Development may use a simple static server. Opening via file:// is not a required use case.
- Modern desktop Chrome/Firefox/Edge and mobile Android Chrome/iOS Safari are targets; show useful compatibility/error message when WebGL 2 or required modules are unavailable.

### 13.2 Suggested repository layout

```text
index.html
styles/
  app.css
src/
  main.js
  config/          # grouped, documented gameplay and visual settings
  core/            # clock, state, commands, events, random streams
  entities/        # data records and lifecycle helpers
  systems/         # combat, economy, construction, fleets, objectives
  ai/              # waves, group objectives, autonomous behavior
  world/           # map generation, validation, navigation
  rendering/       # 3D camera, model registry, scene, lighting, effects
  ui/              # DOM panels, controls, input, notifications
  audio/           # audio events and mixing
  debug/           # diagnostics and sandbox
vendor/           # pinned browser-ready dependencies and licenses
assets/           # models, textures, audio, icons
  models/
  textures/
  audio/
  icons/
tests/
  index.html      # native browser test runner
  ...             # simulation and integration tests
docs/
  GAME_SPEC.md
README.md
AGENTS.md
```

File organization is a recommendation; responsibility separation is mandatory. README documents serving, controls, test invocation and configuration. AGENTS.md instructs agents to read this spec, preserve static hosting, run relevant tests, document assumptions and avoid feature creep.

### 13.3 Simulation / rendering separation

Authoritative state consists of plain data records with stable unique IDs. Use a simple data-driven entity system, not a mandatory ECS framework. Simulation modules must not import rendering modules, manipulate DOM or depend on rendering frame rate. Input adapters produce validated commands; only simulation systems change gameplay state. Rendering, audio and UI consume state and events. Asset registry maps entity class/faction to 3D models, anchors, visual scale, headings and effect attachment points; replace artwork without changing collision, damage or range. External local model assets must have configurable anchors, scale and orientation, with procedural mesh fallbacks. Centralize projection and inverse projection; gameplay distances and collision checks remain in unprojected world coordinates.

Use fixed-timestep simulation (initial 20 Hz) with position interpolation for rendering. All timers, energy, cooldowns, regeneration, movement and charging use simulation time. At 2× run twice as many simulation steps per real second; at 0.5× half as many. Use bounded catch-up to avoid a runaway frame backlog. Never advance hidden-tab wall-clock time on resume. Pausing must clear or freeze accumulated simulation time. A headless-in-browser simulation can be stepped directly for tests.

Define a consistent update order and stable tie-breaks; suggested order: validate queued commands, update wave/portal events and objectives, movement, detection, combat and destruction, eligible energy consumers and allocation, completion events, victory/defeat evaluation, statistics and output events. Check command station destruction before any subsequent victory transition. Exact ordering may be refined if documented and tested. No negative HP/energy or duplicate destruction events.

### 13.4 Navigation and performance

Use grid-based A* with diagonal corner-cut prevention, weighted traversal time through sparse asteroids, collision-aware smoothing, dynamic obstacle updates and local steering. Maintain faction-specific barrier traversal rules; plan hostile breaches as explicit attackable obstacles. Share group routes where practical, replan on topology change or meaningful destination change, not every tick. Smooth paths must not cross blocked terrain. Handle unreachable destinations with nearest reachable point and clear feedback. Ensure narrow corridors accommodate fleet compression; implement a stuck detector/replan fallback. Reinforcements use same terrain constraints, even when invulnerable.

Use spatial hashing or similar nearby-query acceleration for targeting, separation and sensors; avoid all-pairs checks every frame. Stagger costly AI work, reuse particles, geometries and materials, limit allocations, release per-match scene objects and owned GPU resources on reset. Render only visible enemy contacts. Use interpolation, culling and quality controls. Targets: 60 FPS desktop, 30 FPS mobile, 200 concurrent gameplay ships/structures in stress tests, excluding decorative objects. These are engineering objectives, not validated device performance claims. Report hardware/browser and actual frame/update timings in tests.

### 13.5 Centralized configuration

Explicit grouped settings are mandatory. Suggested modules: ships, structures, combat, fleets, economy, terrain, waves, match, visuals, audio. Include units, comments, valid ranges and initial defaults. Keep base damage and attack interval distinct; derive DPS rather than storing competing sources of truth. Separate gameplay values from effects. Use shared class definitions across factions except explicitly allowed regeneration and presentation differences. Document any derived scaling. Avoid unexplained numeric literals embedded in behavior. No graphical balance editor required initially.

### 13.6 Developer diagnostics

Provide a developer-only panel accessible through a documented URL flag or menu. Include FPS, sim step timing, entity counts, seed, selected entity state, target links, navigation cells and paths, collision bounds, fleet engagement limits, sensors, build influence, per-entity energy demand. Include controlled commands to spawn ships/waves, reset combat sandbox, modify reserves, damage entities, force relocation, charge/drop device and advance simulation. Keep debug actions separate from normal player controls; mark debug-assisted matches and exclude them from ordinary result history (recommended). Do not require debug tools to win a normal match.

## 14. Initial implementation scope and acceptance

**Version 1.2 transition:** reopen Milestone 1 for the planar 3D foundation, then revalidate Milestone 2 in 3D using the existing tested combat logic. Continue with Milestones 3–8 only after the applicable review gates. Preserve the accepted gameplay design, interface direction and prior history; do not treat the renderer migration as a mandate to rewrite the simulation.

### 14.0 Staged delivery and review gates

Implement one milestone at a time, in the sequence below. At the end of each milestone, stop implementation and provide a runnable increment for human review. Do not begin the next milestone until the user approves or requests continuation. The user may request corrections to the current increment before approving it. Each increment must remain directly servable from source, preserve previous accepted functionality, and include relevant native browser tests and documentation. Do not implement future milestones speculatively; minimal interfaces needed for the current milestone are appropriate. The combat sandbox is an early development tool, not the finished game.

At each gate, provide: implemented features; launch/test instructions; automated test results (distinguish executed tests from unexecuted tests); manual verification steps; balance/configuration changes; assumptions and known limitations; and a clear statement of what is deferred. Update README.md and AGENTS.md as appropriate. Preserve a runnable repository state; record milestone completion in development notes. Do not claim device performance or gameplay balance that has not been measured.

#### Milestone 1 — Application foundation

Deliver a directly servable application with modular JavaScript, pinned local Three.js/WebGL 2, fixed near-overhead orthographic camera, pan/zoom, fixed-step clock, entity lifecycle, centralized configuration, basic diagnostics and native browser test runner. Display representative actual 3D hard-surface ships and structures with metallic shading, directional lighting and a predominantly black starfield. Validate pointer-to-plane round trips across zoom and pan, correct opaque depth testing, resize and device-pixel-ratio handling, pause/speed, resource cleanup and simulation independence from render rate. No match objective required. This rendering foundation is reopened by version 1.2; retain previously tested renderer-independent code where compatible, but revalidate the foundation before porting combat visuals and proceeding to later gates.

**Review gate:** launch the scene, inspect visual direction and camera feel, confirm the no-build workflow and passing foundation tests.

#### Milestone 2 — Combat sandbox

Deliver three combat classes for each faction plus friendly command frigate, recognizable heading-aware 3D models, spawn/position/reset controls and controlled duels and fleet battles. Implement nearest eligible targeting, counter matrix, shield/hull damage, destruction and combat events. Show cosmetic fighter swarms, missile salvos, beams, shield impacts, engine trails and explosions from this milestone onward. Test neutral/same-class damage, each intended counter, equal-cost engagements, range differences, no friendly fire and identical results across graphical quality. Use a documented sandbox energy fixture for regeneration until the full economy is integrated.

**Review gate:** watch battles and assess silhouettes, visual spectacle, combat readability and initial counter balance before expanding the game.

#### Milestone 3 — Battlefield generation

Deliver seeded archetypes, dense/sparse asteroids, nebulae, energy deposits, starting area and potential wormhole sites; map validation and preview; grid A*, smoothing and local steering; fog of war, minimap and diagnostic paths. Test repeatable generation, bounded retries, resource-yield distribution, reachable portals and deposits, variable corridors and terrain penalties. Test at least 1,000 seeds where practical. Verify that projected terrain boundaries, range overlays and picking correspond to actual world-space geometry.

**Review gate:** generate and inspect multiple maps, navigate around obstacles and assess strategic geography and projected readability.

#### Milestone 4 — Fleet command

Deliver three command slots with ten combat ships each, autonomous following and engagement, formation compression/reformation, fleet status panel and individual ship roster. Implement command loss, survivors returning to and defending base, automatic pickup, and assigned reinforcement transit with reserved capacity and invulnerability. Use debug-spawned ships to test lifecycle before full production is available. Test narrow corridors, moving destinations, destroyed command frigates, full capacity and reassignment rules.

**Review gate:** control fleets without individual combat orders, observe formation behavior and verify recovery and reinforcement workflows.

#### Milestone 5 — Economy and construction

Deliver shared continuous energy, baseline generation, docked miners, storage, proportional shortage behavior, energy-consuming regeneration and production, constructors, shipyards, sensor stations, missile batteries, beam turrets and energy wall posts. Implement construction influence, previews, autonomous projects, queues, dismantling and refunds. Integrate production with fleet reservations and remove temporary economy fixtures from normal gameplay. Test conservation, parallel projects, miner loss, queue cancellation, construction after constructor departure, wall linkage and collapse, and faction-specific traversal.

**Review gate:** build a functional installation, operate mining, produce and replenish fleets, and verify the economic consequences of combat and shortages.

#### Milestone 6 — Enemy incursion

Deliver constrained randomized escalating waves, approximate intelligence, recovery gating, multi-route attack groups, occasional economic targets, breach navigation, shield-only enemy regeneration, and announced wormhole relocation. Test multi-front attacks, counter mismatches, exposed miners, wall breaches and relocation. Verify wave sequencing and bounded progression, with charge state available to test the post-charge cap.

**Review gate:** play a defensive sandbox with autonomous enemy pressure and assess wave pacing, route choices and defensive strategy.

#### Milestone 7 — Complete playable match

Deliver match menu, duration/difficulty/seed settings, preview, starting assets, all core HUD and control panels, time-based charge, physical device pickup, drop/recovery, deployment, victory/defeat, statistics and local preferences/history. Integrate all prior systems into an uninterrupted normal match without developer tools. Test terminal outcomes, restart, hidden-tab pause, post-charge waves and device recovery. Provide basic touch controls and audio integration by this gate, with further polish in Milestone 8.

**Review gate:** play a complete match from menu to results and review the minimum playable game as a whole.

#### Milestone 8 — Polish and validation

Refine procedural artwork and effects, music and sound, responsive desktop/mobile interaction, tutorial, accessibility, diagnostics, balance and performance. Verify the complete automated acceptance matrix and manual scenarios below. Profile representative desktop/mobile browsers; target 60 FPS desktop, 30 FPS mobile and 200 gameplay entities without changing simulation rules. Record actual results and unresolved issues.

**Review gate:** final integrated acceptance review, with documented test evidence and remaining limitations.

### 14.1 Automated acceptance tests

Use native browser modules and a dedicated test page with pass/fail reporting, reproducible fixture seeds and explicit failure details. Tests should run simulation independently of canvas initialization wherever possible. At minimum verify:

| Area | Acceptance test |
|---|---|
| Combat matrix | Every ordered attacker/target pairing matches configured multipliers; neutral and same-class attacks use 1× |
| Counter effectiveness | Each intended counter wins baseline equal-cost/controlled engagements; test starting in range and approaching from outside range; document exceptions and tune defaults if needed |
| Damage | Shields absorb damage first, overflow reaches hull, zero hull destroys once, no armor or friendly fire |
| Targeting | Nearest eligible visible in-range enemy is chosen with stable ties; no attack through fog or against invulnerable reinforcements |
| Regeneration | Damage-free delay, correct HP/s, energy/HP, caps; enemy shields only and free |
| Energy | Conservation, storage caps, zero-demand and zero-energy cases; all active consumers slow equally regardless of iteration order; no negative energy |
| Mining | One miner per deposit, docking starts income, departure/destruction stops it |
| Construction | Range/footprint validation, initiation requires constructor arrival, progress continues after departure, multiple projects work |
| Shipyard | Single active job, cancellation/reordering, reservation accounting, completion and assignment |
| Fleet limits | Fourth frigate and eleventh subordinate/reservation rejected; civilian ships not counted |
| Reinforcement | Physical accelerated transit, invulnerable/noncombat until arrival; destination loss resolves to ordinary return-to-base |
| Command loss | Survivors retreat normally, defend base, another frigate physically collects up to capacity |
| Barriers | Correct links, hostile blocking, friendly passage, both sides fire through; destroyed endpoint removes all incident segments |
| Navigation | No crossing dense obstacles or hostile walls; compressed formation passes corridors; replan on blockage and breach |
| Generation | Same seed/settings reproduces map; multiple portal sites reachable; protected/exposed yield target; bounded retries; test at least 1,000 seeds where practical |
| Fog | All terrain visible; enemy contacts/health/minimap obey sensor detection and nebula penalties |
| Waves | Constrained compositions, no next wave until all prior enemies gone and recovery expires, correct capped post-charge strength |
| Relocation | Exactly one active portal; warning and location change; no relocation after full charge |
| Device | Time-based readiness, unique pickup, continuous in-range deployment, drop and recovery, victory once |
| Defeat | Command station loss freezes match and wins precedence on simultaneous terminal events |
| Projection | World/screen round trips across pan, zoom and resize; picking, placement and range overlays align; opaque depth testing and stable overlay ordering |
| Visual assets | Missing optional models use procedural 3D fallback; replacement artwork and quality settings do not change simulation |
| Clock | Pause rejects orders; speed scales gameplay time; hidden tab pauses; identical outcomes at different render rates |
| Persistence | Settings/history recover from missing/corrupt storage; no active match save |
| Reset | Consecutive matches do not leak prior entities, events, listeners or graphics resources |

### 14.2 Manual and scenario acceptance

Verify a complete normal match from menu to results without developer commands. Test a naturally fortified map, a multi-front map exceeding available frigates, an exposed mining attack, a barrier breach, an unfavorable combat composition, energy shortage during regeneration, command frigate destruction and replacement, wormhole relocation and a failed device delivery followed by recovery. Verify the tutorial and all three speed settings. Check landscape touch play on representative Android/iOS devices and mouse/keyboard desktop; test resizing, hidden tab, audio initialization and graphics quality changes. Confirm actual visual spectacle is present early and at final integration: fighter swarms, salvos, beams, shield ripples, explosions and faction distinction. Record measured performance and unresolved defects rather than claiming targets are met without testing.

### 14.3 Scope boundaries

No free-flight 3D gameplay, tactical camera rotation, carrier tower, research, upgrades, armor stat, enemy economy, separate power resource, weapon/movement upkeep, mining stations or hauling, direct subordinate commands, independent fighter combat simulation, physical projectiles, tactical altitude, multiplayer, campaign, active match saving, backend or mandatory build tools. Do not scaffold deferred features speculatively. Do not add new unit classes to compensate for balance problems; first tune the accepted classes.

## 15. Initial tuning and implementation assumptions

These values are starting points selected to make the initial game implementable, not user-validated balance. The accepted three-frigate/ten-slot limits and 2×/0.75× multipliers are explicit defaults. Adjust provisional values through sandbox and full-match testing, keeping the intended relative roles and design constraints. Record meaningful changes.

### 15.1 Baseline combat and asset configuration

World distance units are arbitrary; time is simulation seconds. DPS below is descriptive (damage / interval). All ship normal speeds initially 270 units/s (Milestone 2 trial tuning at user request; previously 90). Friendly and hostile main combat classes use the same base values. Enemy hull recovery is disabled regardless of table rates.

| Ship | Shield HP | Hull HP | Damage / interval (s) | DPS | Range | Sensor | Cost E | Build s |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| Light carrier | 80 | 120 | 15 / 0.5 | 30 | 320 | 520 | 1,500 | 10 |
| Missile cruiser | 120 | 180 | 30 / 2 | 15 | 440 | 600 | 1,500 | 10 |
| Destroyer | 160 | 240 | 22 / 1 | 22 | 220 | 460 | 1,500 | 10 |
| Command frigate | 200 | 300 | 8 / 1 | 8 | 260 | 600 | 6,000 | 30 |
| Miner | 40 | 100 | — | 0 | 0 | 160 | 1,000 | 8 |
| Constructor | 40 | 100 | — | 0 | 0 | 160 | 1,000 | 8 |

| Structure | Shield HP | Hull HP | Damage / interval (s) | Range | Sensor | Build influence | Cost E | Build s |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| Command station | 600 | 1,200 | — | 0 | 400 | 300 | — | — |
| Shipyard | 200 | 400 | — | 0 | 220 | 200 | 3,000 | 15 |
| Energy storage | 100 | 250 | — | 0 | 160 | 160 | 1,200 | 10 |
| Sensor station | 80 | 160 | — | 0 | 550 | 180 | 1,000 | 6 |
| Missile battery | 150 | 220 | 36 / 2 | 500 | 600 | 160 | 1,200 | 8 |
| Beam turret | 200 | 320 | 26 / 1 | 260 | 460 | 160 | 1,200 | 8 |
| Barrier post | 100 | 180 | — | 0 | 100 | 100 | 400 | 4 |

Milestone 2 naval-combat trial: ship movement is three times the preceding 90-unit/s baseline, and mobile weapon/sensor ranges are twice their previous values. Static missile/beam range and sensor values are proportionally adjusted planning defaults to preserve their intended advantage; towers are not implemented at this gate. Reevaluate speed, range, map size, travel time and later strategic radii after playtesting. Damage, intervals, costs, HP and counter multipliers are unchanged.

Suggested common regeneration defaults: shield 8% maximum HP/sec, hull 1% maximum HP/sec, both begin 4 seconds after last damage; use derived HP/s internally. Shield cost 0.5 E/HP and hull cost 2 E/HP. These are per-asset configurable. Friendly hull and shields may regenerate simultaneously once eligible. Tune repair demand so major engagements create noticeable energy competition. Initial counter tests must include range effects: the 2×/0.75× multipliers alone do not guarantee every matchup at every distance. Do not eliminate range/positioning to enforce a universal outcome.

### 15.2 World, economy and pacing defaults

| Setting | Initial tuning |
|---|---|
| Map dimensions | 1,800 × 1,800 world units |
| Navigation cell | 20 units; adjust for collision geometry |
| Normal ship movement | 270 units/s (Milestone 2 trial tuning) |
| Sparse asteroid speed | 0.65× |
| Nebula sensor and targeting | 0.65× when source is within nebula |
| Formation / engagement radius | 90 / 250 units |
| Base collection / shipyard transfer radius | 100 / 100 units |
| Fast-travel speed | 3× normal |
| Barrier maximum span | 100 units |
| Construction initiation distance | 40 units |
| Command station income | 60 E/s |
| Deposits | 2 nearby, 2 exposed; initially 20 E/s each, vary yields while preserving aggregate split |
| Starting energy / storage capacity | 3,000 / 4,000 E |
| Storage station capacity addition | 4,000 E |
| Dismantle/cancel refund | 25% of energy spent |
| Device pickup / deployment radius | 80 / 100 units |
| Device deployment time | 5 s |
| Standard initial grace / recovery | 35 / 18 s |
| Wormhole sites | 3–5 valid sites |
| Relocation warning | 15 s |
| Relocation schedule | 1–2 events between 25% and 80% of charge time |
| Simulation rate | 20 Hz |

Use duration scale k = 20 / selected minutes. Suggested starting approach: multiply income and nominal construction rates by k, divide grace/recovery times by k; keep total costs, HP, attack intervals, movement, regeneration and ranges unchanged initially. Device charge duration is exactly the selected preset in simulation minutes. Tune overall pacing empirically; regeneration costs and combat duration are not automatically scaled. This is not a guarantee of equivalent difficulty across durations.

| Difficulty | Initial wave count budget | Maximum wave count budget | Recovery multiplier | Max groups |
|---|---:|---:|---:|---:|
| Cadet | 3 | 20 | 1.25 | 2 |
| Commander | 4 | 32 | 1.0 | 3 |
| Veteran | 5 | 45 | 0.85 | 4 |
| Admiral | 6 | 60 | 0.70 | 5 |

Initial budget may be linearly interpolated by charge progress (rounded to integer ship count), with constrained random class selection; later tune growth shape and specialization. Ensure high difficulty does not depend on untested extreme object counts. The 200-entity stress target is not a hard gameplay cap. If needed, document a safe explicit limit rather than silently dropping units or defenses.

### 15.3 Assumptions and edge cases to review

The following clarify otherwise unspecified implementation details. They are recommended defaults for the first complete playable version; report them in development notes and revise if playtesting suggests a better approach.

| ID | Assumption / resolution |
|---|---|
| A1 | Dense asteroids block movement and placement, not weapon line-of-sight; nebula penalties apply to sensors/targeting of the source within the region. |
| A2 | Command station, civilian ships and support structures are neutral for damage multipliers; civilians and nonweapon structures are unarmed. Towers inherit their corresponding class for both outgoing and incoming damage. |
| A3 | Walls use line tool with explicit adjacent post links, no accidental nearby auto-links. All posts in a requested line are individually validated; reject invalid line as a whole. Constructor initiates posts in sequence or via a single line job when physically near the first post; prefer individual site initiation to preserve the construction-location rule. |
| A4 | Unfinished structures are vulnerable after initiation; use a minimum nonzero initial hull and increase maximum available HP with progress, without granting free healing of damage. Pending placement before arrival reserves footprint only. |
| A5 | Cancelling a queued job that has consumed no energy has no refund; active cancellation and dismantling refund 25% actually spent. Reordering changes pending jobs, not the active job; explicitly cancel active job if desired. |
| A6 | Storage capacity loss discards excess energy; no separate maximum discharge rate. Base income and storage remain until command station loss. |
| A7 | Newly produced assigned ships are invulnerable and cannot attack until arrival, and reserve a fleet slot. Target frigate loss cancels immunity and redirects to base. Returning survivors are vulnerable. Base pickup is automatic in stable arrival/ID order until capacity; manual transfers near a shipyard remain possible. |
| A8 | Command frigate movement orders take precedence over chasing. Followers may fire while traveling but must remain cohesive; unassigned ships return to base before local defense. |
| A9 | Device is indestructible; leaving deployment range resets progress; no additional relocation once charged; simultaneous defeat takes precedence. |
| A10 | Recovery starts only after complete wave elimination. Deliberately retaining an enemy may permit economic accumulation or charge progress; assess exploit in testing, without changing this accepted rule unilaterally. |
| A11 | Initial resource distribution uses a measurable protected starting region defined by generator archetype, not actual player-built walls. Target 50% mining yield outside it (suggest 45–55% validation tolerance). |
| A12 | Most completed structures extend influence, including posts; disconnected structures remain operational. Use center point plus footprint collision checks for placement. No construction through portal exclusion zones. |
| A13 | Match results retain latest 20 completed games locally, no debug-assisted results; automatic pause on hidden tab requires manual resume. |
| A14 | Fixed near-overhead orthographic 3D camera (initial elevation 60 degrees above the plane), recommended input bindings, approximate wave descriptors, archetype names and difficulty names are provisional interface defaults. |
| A15 | No explicit upper construction or civilian population cap has been specified. Bound performance through tuning and optimization; document any hard cap before treating it as a design requirement. |

### 15.4 Definition of done

The final milestone deliverable is a directly servable, complete, single-player Incursion game implementing the accepted rules above, including the two fixed tower types and energy walls, with a functioning victory/defeat loop, visually distinct combat, responsive controls, native tests and documentation. Provide a concise implementation report listing tests run and results, balance adjustments, assumptions adopted, actual device performance observations and remaining defects or limitations. Do not claim production readiness or mobile frame-rate guarantees without measurement.

**End of specification.**

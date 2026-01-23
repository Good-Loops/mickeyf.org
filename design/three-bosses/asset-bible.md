# Three Bosses — Asset Bible (v1)

## Purpose
This document defines the **visual and asset contract** for the game *Three Bosses*.
All sprites, tiles, UI, and VFX must follow this specification to ensure visual
consistency, clean scaling, and speedrun readability.

This is a **project-level contract**. Breaking changes must be intentional and
should result in a version bump of this document.

---

## Global Resolution & Scale
- Target resolution: **1920×1080** (16:9)
- Development resolution: virtual 1920×1080, scaled with letterboxing when needed
- Tile size: **32×32 pixels**
- Player height: **64px tall** (≈ 2 tiles)
- Scaling: integer scaling preferred (no pixel interpolation)

---

## Art Style
- Style: **Pixel art**
- Animation feel: **Smooth**
- Animation FPS: **16 FPS**
- Palette: **Limited palette** (see Palette section)
- Outlines: **1px outline**, dark neutral tone
- Shading:
  - 2–3 shade ramps per material
  - No pillow shading
  - Consistent light source (top-left default)

Speedrun readability always has priority over detail.

---

## Palette (LOCKED AFTER CONFIRMATION)
All assets must exclusively use the locked palette below.

- Outline color: TBD
- Core neutrals: TBD
- Accent colors: TBD (radioactive, tech, water themes)

Palette source: **Coolors.co**

⚠ Do not introduce new colors without updating this document and bumping the version.

---

## Player Character
- Theme: **Masked runner**
- Silhouette priority: clear and readable at speed
- Size: **64px tall**
- Pivot point: **Feet center**
- Outline: 1px
- Required animations (v1):
  - Idle
  - Run
  - Jump
  - Double Jump
  - Dash
  - Hurt
  - Death

---

## Weapons
- Type: **Ranged only** (no melee)
- Count (v1): **10**
- Rules:
  - Always viable
  - Limited ammo
  - One weapon equipped at a time
- Required assets per weapon:
  - Pickup sprite
  - Projectile sprite(s)
  - UI icon
  - Optional impact / hit effect
- Pivot: center

---

## Bosses

### Boss 1 — Radioactive Bee
- Visual theme: toxic / radioactive
- Required animations:
  - Idle / hover
  - Attack(s)
  - Phase transition tell
  - Hurt
  - Death

### Boss 2 — Soldier-Cyborg
- Visual theme: military / tech
- Required animations:
  - Idle / walk
  - Ranged attack
  - Mobility or charge attack
  - Phase transition
  - Hurt
  - Death

### Boss 3 — Kraken
- Visual theme: water / ink / tentacles
- Required animations:
  - Tentacle attack
  - Projectile / ink attack
  - Arena hazard
  - Phase transition
  - Hurt
  - Death

Boss AI is **non-adaptive**, phase-based, and pattern-driven.

---

## Environments / Tilemaps
- Tile size: 32×32
- Tile categories:
  - Ground / platform
  - Edge / trim
  - Background
  - Hazards
- Collision shapes must be clear and readable
- Decoration must never obscure gameplay
- Parallax allowed only on background layers

---

## UI
- Health: **HP bar**
- Timer: always visible
- Split times: after each boss
- Font: bitmap or pixel-compatible
- Style: minimal, high contrast, readable at speed

---

## Effects (VFX)
- Screen shake: enabled (light, controlled)
- Damage numbers: enabled
- Hit sparks: small, fast, readable
- VFX must reuse existing palette ramps

---

## Naming Conventions
- Sprite naming:
  - player_run_01.png
  - bee_attack_sting_03.png
  - weapon_laser_projectile.png
- Versioning:
  - *_v01.png, *_v02.png
  - Never overwrite previous versions

---

## File Structure (Art)
- Art/Characters/Player/
- Art/Bosses/Bee/
- Art/Bosses/Cyborg/
- Art/Bosses/Kraken/
- Art/Weapons/
- Art/Tiles/Arena1/
- Art/Tiles/Arena2/
- Art/Tiles/Arena3/
- Art/UI/
- Art/VFX/

---

## Non-Goals
- No mixed pixel densities
- No inconsistent animation FPS
- No palette drift
- No excessive detail that harms readability

---

## Notes
If an animation or sprite is unclear at full speed, it is incorrect and must be revised.

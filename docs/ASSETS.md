# NEXUS 3D assets

Everything in the 3D scenes is generated in code at runtime. No models, textures, HDRIs or audio files are downloaded or bundled, and no paid or third-party assets are used.

## What is a placeholder

| Element | Status | Source |
| --- | --- | --- |
| Nexus Sentinel (guardian) | **Placeholder.** Procedural armoured figure built from primitives, lathes and instanced parts. It is not a sculpted, photoreal character. | `src/components/gateway/scene/Sentinel.tsx` |
| Nexus Artifact | Procedural (faceted crystal, three machined rings). | `src/components/gateway/scene/Artifact.tsx` |
| Gateway, platform, bridge | Procedural. | `src/components/gateway/scene/` |
| City fabric and six district landmarks | Procedural, stylised architecture. | `src/components/world/` |
| Textures (windows, iris, glow, fade) | Drawn to canvas at runtime. | `src/components/gateway/scene/textures.ts` |
| Soundscape | Synthesised with Web Audio. | `src/lib/audio/engine.ts` |

The Sentinel animates (breathing, head lift, eyelids, blink, eye glow, two-bone IK arms lifting the Artifact), but its anatomy and surface detail are limited by what primitives can express. Treat it as a stand-in until a real character model is supplied.

## Replacing the Sentinel with a real model

A production-quality guardian needs a licensed, rigged glTF/GLB. None has been added because that requires a decision on source, licence and cost.

Requirements for a drop-in model:

- Format: `.glb` (glTF 2.0), Draco or Meshopt compressed, ideally under 3 MB.
- Budget: about 40k triangles, one or two 2K texture sets, one skeleton.
- Height: about 8.4 scene units, standing at the origin, facing +Z.
- Animations (clips or bones to drive): idle/breathing, head raise, arms lifting to chest height.
- Licence: must permit use on a public website; record the licence and author here.

Integration steps:

1. Place the file at `public/models/sentinel.glb`.
2. Load it lazily with `useGLTF` from `@react-three/drei` inside `Sentinel.tsx`, on the HIGH and BALANCED tiers only.
3. Keep the procedural figure as the LOW tier and loading fallback.
4. Map the existing channels (`ch.visor`, `ch.lift`, `ch.pulse`) to the model's clips or bones.
5. Update the table above and add the licence details below.

## Licences

No third-party 3D, image or audio assets are in use.

Team, alumni and gallery photographs are uploaded by administrators through the admin centre. Only publish photographs of people who have given permission.

## Guardian model candidates (researched 2026-11-16, nothing downloaded)

No free, openly licensed model was found that is a photoreal armoured male
guardian with a rig and animation clips. The options below are what exists;
licences must be re-read on the source page before any file is added.

| Candidate | Source | Licence (as listed) | Notes |
| --- | --- | --- | --- |
| Universal Base Characters — male "Superhero" body | quaternius.com/packs/universalbasecharacters.html | CC0 | ~13k tris, humanoid rig, glTF. Clips come from the separate Universal Animation Library (CC0). Unarmoured, stylised-realistic: original armour would be attached to its bones. Recommended. |
| Man Base Mesh (rigged) | grab3d.com/models/characters/man-base-character/ | CC0 | GLB, walk/run clips, tagged realistic, unarmoured. Size not stated. |
| Knight Male (Quaternius) | app.cinevva.com/game-assets/free-3d-character-models | CC0 | GLB, 17 clips, ~5.9k vertices: low-poly and medieval, not the NEXUS design. |
| Rigged Knight in Armor (Xali) | blendswap.com/3d/characters | CC0 | .blend only, needs export; no clips listed; medieval. |

Rejected: three.js `Soldier.glb` / `Xbot.glb` (Mixamo origin, redistribution
terms unclear); BlendSwap "Low Poly Male Knight" (CC-BY, low-poly); CGTrader
and unlabelled Sketchfab models (not open licences).

Until one of these is approved and added, the Sentinel remains the labelled
procedural placeholder.

# NEXUS 3D assets

Everything in the 3D scenes is generated in code at runtime, with one exception: the Sentinel character model listed below. No textures, HDRIs or audio files are downloaded or bundled, and no paid assets have been purchased.

## Inventory

| Element | Status | Source |
| --- | --- | --- |
| Nexus Sentinel (guardian) | **Rigged GLB model**, supplied by the chapter. Procedural figure kept as the loading and error fallback. | `public/models/sentinel.glb`, driven by `src/components/gateway/scene/SentinelModel.tsx`; fallback in `Sentinel.tsx` |
| Nexus Artifact | Procedural (faceted crystal, machined rings). | `src/components/gateway/scene/Artifact.tsx` |
| Gateway, platform, bridge | Procedural. | `src/components/gateway/scene/` |
| City fabric and district landmarks | Procedural architecture. | `src/components/world/` |
| Textures (windows, iris, glow, fade, facades) | Drawn to canvas at runtime. | `src/components/gateway/scene/textures.ts`, `src/components/world/` |
| Soundscape | Synthesised with Web Audio. | `src/lib/audio/engine.ts` |

## Sentinel model record

| Field | Value |
| --- | --- |
| File | `public/models/sentinel.glb` (identical copy kept at the repository root as `captain_v2.glb`) |
| Size | 3,934,364 bytes |
| Contents | One skinned mesh (30,258 triangles, 24 joints), one material with base-colour, normal and metallic-roughness maps, ten animation clips (`Idle_02` is the only one played) |
| Exporter | Khronos glTF Blender I/O v4.2.57 (from the file header) |
| Supplied by | The chapter, added to the repository by the project owner |
| **Original source** | **Not recorded. To be confirmed by the project owner.** |
| **Licence** | **Not recorded. To be confirmed by the project owner before the site is published.** |

The file carries no author, source or licence metadata, so none is stated here. Before public launch the owner must confirm where the model came from and that its licence permits use on a public website, and whether it depicts or is derived from any existing character or real person. If that cannot be confirmed, replace it with one of the openly licensed candidates below or fall back to the procedural figure (delete the GLB and the fallback takes over automatically).

How the model is driven: the idle clip is damped and plays on the body only; the head, neck, arms and hands are set by code every frame as absolute rotations from the bind pose (one owner per bone), with two-bone IK placing the hands around the Artifact.

Requirements for a replacement model: `.glb` (glTF 2.0), about 40k triangles or fewer, one skeleton with `Hips`, `Spine`, `neck`, `Head` and `Left/Right` `Arm`, `ForeArm`, `Hand` bones, standing at the origin facing +Z, with an idle clip.

## Licences

No other third-party 3D, image or audio assets are in use.

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

These remain the fallback options if the licence of the current model cannot
be confirmed.

# 3D Model Asset & Integration Report

## 1. Asset Inventory (Source of Truth)

The following 3D model assets are present in the `public/models/` directory and constitute the current trebuchet visualization system.

| File                | Node Name    | Complexity / Metadata                  | Status     |
| :------------------ | :----------- | :------------------------------------- | :--------- |
| `base.glb`          | `base`       | 27k vertices (Highest complexity)      | Active     |
| `arm.glb`           | `arm`        | 4k Plywood textures                    | Active     |
| `counterweight.glb` | `overweight` | Mapped to `counterweight` in code      | Active     |
| `bezel.glb`         | `bezel`      | 64 vertices                            | Active     |
| `loop.glb`          | `loop`       | 5.6k vertices                          | Active     |
| `projectile.glb`    | `projectile` | Standard projectile asset              | Active     |
| `container.glb`     | N/A          | Replaced by `bezel.glb` and `loop.glb` | Deprecated |

## 2. Implementation Details

### Modular Loading Architecture

The 3D scene is built using a modular loading strategy in `src/components/TrebuchetVisualization.tsx`. Instead of a single monolithic file, components are loaded independently to allow for granular updates and better asset management.

- **Independent Loading:** Each asset is fetched via individual `useGLTF` hooks.
- **Preloading:** All assets are preloaded using `useGLTF.preload` to ensure smooth scene initialization.
- **Node Mapping:** Specific nodes are extracted using `useGraph` and `scene.getObjectByName`. Notably, the `overweight` node in `counterweight.glb` is correctly mapped to the `counterweight` reference used by the physics engine.

### Material Synchronization

To ensure visual consistency across disparate GLB files, a unified material configuration is applied programmatically:

- **Properties:** All `MeshStandardMaterial` instances are set to `roughness: 0.6` and `metalness: 0.2`.
- **Application:** This is handled via a `useEffect` hook in the `TrebuchetModel` component, which iterates through all loaded materials upon initialization.

## 3. Animation & Physics Integration

- **Arm:** Updates `rotation.z` and `position` based on simulation `frameData.arm`.
- **Counterweight:** Updates `rotation.z` and `position` based on simulation `frameData.counterweight`.
- **Projectile:** While `projectile.glb` is available, the current implementation utilizes a high-performance R3F `Sphere` for dynamic scaling and physics-based rendering.

## 4. Verification & Compliance

- **Linting & Formatting:** All integration code has been verified via `pnpm check`.
- **Asset Integrity:** All referenced `.glb` files are confirmed present in the `public/models/` directory.
- **Material Consistency:** Unified material settings are verified across all modular components.

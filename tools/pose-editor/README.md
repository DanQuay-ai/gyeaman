# Gyeaman Pose Workshop

Open `/tools/pose-editor/` from a static server rooted at this repository. No build, network API, paid service, or production game changes are required.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/tools/pose-editor/
```

## Review workflow

1. Start with Gyakari. Select **All source poses** to inspect all 16 images, or select an actual combat sequence.
2. Drag orange body landmarks, or select a landmark and enter normalized X/Y coordinates. Near/far describes depth in the image, not anatomical left/right. Hidden joints require a human estimate.
3. Confirm individual landmarks, or **Validate this pose** to explicitly confirm the whole body. Moving any landmark reopens pose review. Orange means uncertain; mint means confirmed. Undo reverses edits.
4. Play the skeleton with or without the sprite. Game sequences use original `ms` timings. The all-pose view uses synthetic 400 ms inspection holds and is not an animation from the game. Optional movement offsets apply the authored `x`/`y` step offsets; VFX, phantoms, runtime easing/recovery and combat logic are not simulated.
5. Drafts autosave separately per character in this browser. Export JSON for a durable backup or handoff. Imports validate the complete document before replacing the current character draft; select the matching character first. Import replacement is undoable.
6. Optionally add spear grip/tip or shield grip landmarks. Their purple connections encode the intended attachment chain. These landmarks prepare future rigging; no mesh deformation, automatic inverse kinematics, or interpolated animation is implemented.
7. Switch to **Agyekum (bayi)** for the next mapping pass. The 13 poses referenced by the current game metadata and all seven combat/recovery sequences are available. His initial landmarks are explicitly generic templates, not reviewed mappings. Attachment names currently reflect Gyakari's equipment; extend `ATTACHMENTS` for Agyekum's weapons in a later pass.

## Source inspection and limitations

Inspected baseline: `eff3c381b4ceab708c9b2bd6e586b5761f4abbb5`.

- `squads/kf.js` documents `[file, width, height, anchorX, floorY]` in source pixels. The files are already extracted poses from Firefly sheets; original multi-pose Firefly sheet files and the original `split4.py` are not in this checkout. `assets/sq/gyakari_0.webp`, `_1.webp`, `_2.webp` are individual legacy pose images (760×655, 808×705, 638×588), not multi-frame atlases.
- Gyakari has 16 current keyframes: `idle_0..3`, `gbA_0..3`, `gbB_0..3`, `gult_0..3`. All seven `SEQ.gyakari` sequences are copied into a generated authoring manifest without importing/booting the game. Idle suffixes are not simply a chronological idle loop: runtime uses `idle_1` for hurt, `idle_2` for defeated, and `idle_3` for movement.
- The ultimate is `gbB_3` (420 ms), `idle_3` (230), `gult_1` (380), `gult_2` (420), `gbB_1` (220), `gult_3` (420). The leap pose has a floor anchor below the image: `(208,983)` for a 418×779 sprite. Preserve this; fitting every sprite to its own bounding box would destroy alignment.
- Gyakari `gbB_2` contains a detached head/shield fragment above the main figure; `gult_2` has a cropped stray figure at the left edge. These are existing source artifacts. Mapping suggestions target the main figure. Images are left intact for review.
- `squads/data.js` names internal `bayi` as **Agyekum**. Current KF metadata references 13 images; additional `bayi_t*` images in the asset folder are not all referenced by the current manifest.
- Gyakari suggestions are rough visual landmarks per extracted pose, with shared stance suggestions for the repeated neutral images. Initialization automatically populates these per-frame suggestions; it does not claim image-model inference. Every point begins uncertain. Shield-covered arms, cloth-covered hips, crossed/foreshortened limbs and airborne poses especially need correction. Agyekum starts with a generic body template.
- Shared anchor space keeps scale consistent across frames. Source coordinates are independent of viewport size and optional playback translation.

## Data contract

JSON has `schemaVersion: 1`, `coordinateSpace: "normalized-image"`, `character` (asset ID), and `poses` keyed by source pose ID. Each pose contains `reviewed`, `joints` and `attachments`. Landmarks have `x`, `y` in `[0,1]`, `status` (`uncertain` or `confirmed`), and `source` (`visual-suggestion`, `template`, or `manual`). Convert to source pixels with `x * width`, `y * height`; to game anchor space with `(x * width - anchorX, y * height - floorY) / ref`. Sprite dimensions, files, anchors and sequence events remain in `manifest.json`.

## Maintenance and checks

```sh
node tools/pose-editor/generate.mjs
node --test tools/pose-editor/model.test.mjs
# With an existing Playwright installation and a local HTTP server running:
node tools/pose-editor/browser.test.cjs
```

`generate.mjs` reads the literal KF/SEQ metadata into a bounded VM context and validates sequence references; it never runs game initialization. Regenerate the checked-in manifest whenever source metadata changes. Browser tests accept `PREVIEW_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `SCREENSHOT` environment overrides.

Tests cover source references, schema rejection and document isolation, timing boundaries, actual pointer dragging, autosave/reload, review invalidation, undo, attachment creation, JSON download/import and malformed input rejection, playback, character separation, every current sequence/frame and sprite decoding, and mobile overflow. No server storage or production writes occur.

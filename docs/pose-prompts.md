# Pose sheet prompting notes (Firefly, Gemini 3.1)

Lessons from Dufie and Blay. Read before writing any hero's sheets.

## Pipeline
1. Character sheet first: 4 views (right profile, 3/4, front, back) in the combat idle pose, from a reference composite (outfit image, face crop, weapon crop, proportions as numbers). Get it approved.
2. Then move sheets, each with POSE 1 = the approved combat idle (scale anchor), poses 2-4 = the move.
3. Effects (slashes, phantoms, smears between poses) are made in code, not drawn on the body.

## Firefly takes the path of least resistance
- It turns "dynamic" into a neutral stance unless forced. Every pose needs an explicit body recipe: knee angles, which leg is extended, torso lean, hip/shoulder twist, where each hand and the weapon are.
- Say "FEET NEVER TOGETHER: at least 1.5 shoulder-widths apart, or one leg lifted/stretched". Feet together looks terrible in-game.
- Ban upright straight-legged standing and arms hanging at the sides.
- Name the swing path: from bottom-left to top-right, clockwise/anticlockwise, horizontal/vertical axis. Vary axes across a combo.
- For dashes say "running dash": torso pitched forward almost horizontal, head leading, back leg fully extended. "Dive" gives a flying superman pose.
- Last-pose follow-throughs often regress to the idle stance; describe them as a distinct pose.

## Consistency
- Repeat the full outfit list in every prompt; outfit images alone drift (a white coat leaked from a style reference once).
- When a reference is only for proportions/style, label it so and say "IGNORE its clothes".
- Strict profile: "nose, chest, toes and weapon tip point to the RIGHT edge; one eye visible". Otherwise the first view sometimes faces left.
- Eyes: "eyes on the enemy to the right, NEVER at the viewer"; front views still drift, so keep front views out of the game.
- Exactly one weapon: say "Never two swords" and describe the afena grip (gold ball pommel, gold disc guard). Firefly may add a scabbard.
- Ask for one hard-edged cel shadow tone, light from upper left; without it the art comes out flat.
- Firefly adds captions and floor lines anyway; split4.py strips them.

## Effects in code
- Slash projectiles: separate keyed images, full size from the blade tip, growing a little, strong double glow, slow enough to read.
- Phantom trail: blue tinted afterimages dropped every ~18 ms, ~1.6 s life.
- Shunpo: anticipation pose, vanish with smear, reappear sliding (snap step).

## Credit budget (important)
- Never one pose per sheet: it costs 4x. Use the 4-figure sheet (idle anchor + 3 move poses) or 3 move poses, about 20 credits per sheet.
- Prevent touching with layout words, not fewer figures: "four equal columns, each figure fully inside its own column with a wide empty gap of plain green between columns; weapons and cloth stay inside the column".
- Validate every sheet with check2.py-style component separation before extracting; regenerate only the failing sheet.
- Extract by connected components, never by column cuts (column cuts slice limbs).
- Left-facing poses are fixed by mirroring in code, not by regenerating.

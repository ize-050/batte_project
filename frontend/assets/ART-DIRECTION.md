# Four Clans — Stitch visual implementation

Created with the built-in imagegen tool, October 9, 2026. The generated PNG originals and optimized WebP assets are saved in this directory. WebP encoding preserves alpha. UI fonts and color tokens are taken from the user's existing Stitch screen; the game artwork is newly generated and rendered as individual live entities, not a baked screenshot of gameplay.

Reference: https://stitch.withgoogle.com/preview/3117575177263392006?node-id=30ffa5cc2398442baa9c749ed99dfb82

## Files

- jungle-atlas.png / jungle-atlas.webp: trees, buildings, rice paddy and units; source regions in ../src/art.js.
- forest-floor.png / forest-floor.webp: ground texture.
- pond.png / pond.webp: water source.

## Generation prompts

### Jungle atlas

Use case: stylized-concept. Asset type: transparent sprite atlas for an actual browser RTS game, not a UI mockup. Produce a high resolution square 4 by 4 grid, exactly 16 evenly sized cells. Transparent background for entire canvas and around every asset. Each cell contains one isolated fully visible object, centered horizontally, standing on the same baseline 90% down its cell, with 12% clear padding all sides. No text, no grid lines, no labels. Camera consistent elevated 45-degree three-quarter isometric view. Grounded realistic richly textured pre-rendered 3D aesthetic of a classic Southeast Asian jungle strategy game. Earthy olive green, weathered wood, warm straw thatch, moss, restrained bronze, soft natural afternoon light from upper left. NOT cartoon, NOT flat vector, NOT pixel art. Row1 left to right: dense tropical broadleaf tree with roots, tall palm with long fronds, dense bamboo thicket, ancient mossy Khmer stone ruin with ferns. Row2 left to right: large Thai/Khmer wooden thatched clan command hall with red cloth banners and small palisade courtyard, small peasant thatched stilt hut, timber sword training dojo with weapon racks and crimson banners, wooden archery school with straw targets and crimson banners. Row3 left to right: stone water well with wooden bucket and rope, thatched rice granary with burlap sacks, tall timber palisade watchtower with thatched roof, lush ripe rice paddy on a small muddy rectangular ground patch. Row4 left to right: one full body southeast Asian peasant in straw hat carrying sickle, one full body bronze lamellar armored swordsman with sword and round shield, one full body archer in leather cloth armor holding longbow, one full body green clad assassin with two daggers. Unit poses three quarter facing down-left, natural anatomically realistic proportions, no giant heads. The 4 rows each take exactly one quarter of image height, 4 columns each exactly one quarter width. Every object must remain entirely inside its own cell with empty transparent separation. Assets must have genuinely transparent backgrounds. Aim 2048x2048 or higher.

### Forest floor

Use case: stylized-concept. Asset type: square seamless terrain texture tile for a playable isometric RTS map. Flat overhead orthographic surface ONLY, no perspective horizon. Detailed natural tropical Southeast Asian jungle floor, mottled dry earth in brown ochre olive shades, fine gravel and small patches of deep olive moss and sparse short grass, fallen tiny dry leaves and dark soil. Rich realistic game texture like classic pre-rendered 3D strategy games. Even subdued soft daylight. Low contrast, natural fine-grained detail. No trees, no roots, no boulders, no buildings, no people, no large prominent objects, no water, no shadows, no text, no UI. Texture should tile without obvious seams and remain readable under small game characters. Earthy brown olive dominant not vivid green. 1024x1024.

### Pond

Use case: stylized-concept. Asset type: isolated isometric terrain sprite for Southeast Asian jungle RTS. One small natural freshwater pond, irregular oval muddy banks covered with moss, small weathered rocks, dense green ferns and clusters of thin reeds. Murky dark jade water with subdued natural reflections and three tiny lily pads. View from above at 45-degree isometric angle, same scale as a small village cottage. Grounded richly detailed realistic pre-rendered strategy game art, soft warm light upper left, olive and earthy color palette. Entire pond visible with 10% transparent empty padding on every side, including banks. Genuinely transparent background outside isolated pond. No people, no buildings, no text, no UI, no outline, no cartoon shapes. Landscape 3:2 composition inside square image.

## Validation

Engine regression checks cover camera, pathfinding between all bases, bridge crossings, fog, faction skills, combat alerts and pause. Economy checks cover harvesting/delivery, all-clan resource access, placement/costs, construction, training, refunds, population generation and storage. Browser checked resource delivery, selection/context commands, raid damage and attack alerts. This remains a local 2D sprite prototype, not an online match or 3D animation system.

## Walking atlas — 2026-10-09

`walk-cycle.png` and `walk-cycle.webp` contain a transparent 4×4 atlas generated with the built-in imagegen tool. Rows are peasant, swordsman, archer and spirit adept. Columns are four distinct gait poses. Frames are selected from the distance each unit actually travels; facing is mirrored left/right. Idle, harvest and attack states use the same artwork with separate transforms/effects. This is a 2D four-frame animation, not a full eight-direction 3D rig. WebP is a format-converted copy of the original PNG with alpha preserved.

Prompt specification: original Southeast Asian fantasy RTS characters, detailed painterly textures, elevated southeast-facing orthographic camera, four equal rows and columns, consistent size/baseline, transparent margins, no text or ground shadows. Each row repeats one consistent character across left-foot contact, right-knee passing, right-foot contact and left-knee passing poses. Straw-hatted peasant with sickle; bronze/red swordsman with shield; green leather archer; jade spirit adept with staff. Visible opposing arm/leg movement.

Rice is now a code-native field of 48 independently harvestable clumps. Live clump quantities drive standing stalks, cut stubble and the field meter; the former full-field sprite is no longer used for rice rendering.

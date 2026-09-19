# 图像生成提示词档案

本批素材通过 Codex 内置 imagegen 生成。参考图只用于提取“温暖、通透、手绘、东方幻想、圆润喜剧”的视觉语言；提示词不要求复制任何具体导演、工作室或影视角色的独特风格。

## 1. 通用风格基线

```text
Use case: stylized-concept
Asset type: polished 2D mobile game asset
Style/medium: original hand-painted East Asian fantasy storybook aesthetic,
soft watercolor and gouache texture, softly sculpted rounded forms,
warm daylight from upper left, clear readable silhouette at small size,
no heavy black outlines
Constraints: no text; no logo; no watermark; original visual design
```

除天空底图外，所有独立素材增加：

```text
genuinely transparent background with preserved alpha;
one isolated object only; full object visible; generous transparent padding
```

## 2. 八戒角色

角色锚点：

```text
An original cute flying pig hero with two very large floppy ears used as wings;
full-body round peach-pink character floating in the air; tiny arms and legs;
friendly expressive face; dark blue-gray travel vest; warm red scarf;
small tan pouch; simple gold cloud ornament on the head;
centered three-quarter front view; clear silhouette at mobile size.
Avoid photorealism, weapons, extra limbs, extra ears and cropped body.
```

派生姿态均使用 `player_bajie_idle.png` 作为 identity-preserve 参考：

- `fly_up`：耳朵用力向下扑，身体轻微抬头，脸颊用力并带一滴汗。
- `fall`：身体向下倾斜约 45°，耳朵被气流吹向上方，表情慌张。
- `hit`：身体喜剧式挤压，闭眼，耳朵后弯，头部附近有少量金色星星。
- `result`：直立悬浮，耳朵下垂，吐舌喘气并带两滴汗。

每个派生提示均要求保持脸型、比例、服装、头饰、挎包和配色不变。

## 3. 地面障碍

```text
obstacle_mountain:
Tall jagged floating-mountain peak rising upward from a broad bottom anchor;
layered gray-brown rock faces, muted green moss and tiny warm-white cloud wisps.

obstacle_stone_pillar:
Ancient broken heavenly stone pillar with a broad stable base, large readable cracks,
simple carved cloud motifs and sparse moss; avoid Greek or Roman column styling.

obstacle_fireball:
Single magical fireball with a bright golden-yellow round core,
thick orange-red hand-painted flame, short upward trail and a few close sparks.
```

## 4. 天空障碍

```text
obstacle_storm_cloud:
One dense blue-gray and violet-gray storm cloud with layered rounded billows,
a slightly pointed lower edge and subtle internal pale-blue glow.

obstacle_lightning_active:
One bold branching magical lightning bolt striking vertically downward,
thick pale-blue-white zigzag core, few branches and compact blue-violet glow.

obstacle_wind_fire_wheel:
One circular antique-gold and bronze wheel with four broad spokes,
simple cloud-scroll patterns and compact orange-red flames around the rim.
```

## 5. 天宫环境

```text
bg_sky_base:
Portrait 9:16 luminous blue sky gradient above a soft ivory cloud-sea haze;
large uncluttered central gameplay area; opaque full canvas; low contrast.

bg_clouds_far:
Extra-wide panoramic band of warm-ivory friendly clouds and thin mist;
open gaps, low contrast and visually tile-friendly edges; transparent background.

bg_islands_far:
Extra-wide strip of several small distant floating mountain islands,
tiny original pavilions, delicate waterfalls and strong atmospheric perspective.

bg_islands_mid:
Wide strip with two medium heavenly-garden islands at the outer thirds,
leaving the center open; mossy cliffs, pavilions, thin waterfalls and cloud wisps.
```

## 6. UI

UI 通用材质：暖棕手绘木头、柔和水粉纹理、少量古金装饰、圆润友好的形状。

```text
ui_title_board:
Large horizontal weathered wooden sign suspended by two rope loops,
broad blank center and small cloud-scroll corner accents.

ui_button_primary:
Horizontal rounded wooden button with blank center, raised rim and cloud ornaments.

ui_panel_result:
Portrait results panel with carved wood frame, clean ivory parchment center,
small cloud ornament and restrained rust-red tassels.

ui_icon_pause:
Circular carved-wood button with two simple antique-gold pause bars.

ui_icon_sound_on:
Circular carved-wood button with an antique-gold bell and two sound-wave marks.

ui_icon_sound_off:
Matching bell button crossed by one clear rust-red diagonal slash.

ui_gesture_tap:
Friendly hand with index finger demonstrating two successive taps with two small circular ripple echoes,
warm ivory skin and a restrained antique-gold cloud-pattern cuff.
```

所有 UI 生成图禁止烘焙文字、字母和数字。

## 7. VFX

```text
vfx_airflow_swoosh:
Two short curved warm-white airflow strokes with tapered ends and pale blue edges.

vfx_collision_cloud:
One compact ivory cloud puff with five rounded lobes and a few detached puffs.

vfx_foreground_leaf:
One simple windblown moss-green leaf with visible central vein and warm rim light.

vfx_score_sparkle:
One compact cluster of three four-point golden sparkles with soft warm glow.
```

## 8. 动画预览

`tools/create_bajie_preview.py` 将五个角色姿态合成为循环 GIF：

```text
idle → alternating fly_up/idle climb → apex → fall → hit → result
```

GIF 使用 `bg_sky_base.png` 作为评审背景，只用于观察动作方向和节奏，不是最终 Cocos AnimationClip。

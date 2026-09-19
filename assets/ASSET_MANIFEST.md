# 《八戒不会飞》第一版美术素材清单

生成日期：2026-09-18  
生成方式：Codex 内置 imagegen  
视觉方向：原创东方手绘幻想喜剧风

接入状态：P4 已完成。运行时由 `assets/scripts/art/P4ArtAssets.ts` 从 `core` Asset Bundle 集中加载；旧版长按手势图因操作方案已改为连续点击而明确不接入。

## 1. 目录结构

```text
assets/
  bundles/core/textures/
    characters/bajie/
    environments/tiangong/
    obstacles/
      ground/
      sky/
    ui/common/
    vfx/common/
art_source/
  previews/
```

命名统一采用小写英文和下划线：

```text
<类别>_<主体>_<状态或用途>.png
```

不在文件名中使用中文、空格、日期或无意义序号。Cocos Creator 自动生成的 `.meta` 文件应提交到版本控制。

## 2. 角色素材

目录：`bundles/core/textures/characters/bajie/`

| 文件 | 尺寸 | 用途 |
|---|---:|---|
| `player_bajie_idle.png` | 1230 × 1278 | 菜单和 Ready 状态悬停 |
| `player_bajie_fly_up.png` | 1230 × 1278 | 点击扑耳后的上升主姿态 |
| `player_bajie_fall.png` | 1230 × 1278 | 停止点击后的下落主姿态 |
| `player_bajie_hit.png` | 1230 × 1278 | 撞击瞬间 |
| `player_bajie_result.png` | 1230 × 1278 | 结算疲惫姿态 |

角色动画预览位于 `../art_source/previews/player_bajie_animation_preview.gif`（720 × 720），不属于运行时素材。

当前角色素材是五个关键姿态，不是最终逐帧序列。第一版可通过姿态切换、位置、旋转、缩放和短促抖动实现动画；若后续要求更细腻的耳朵循环，再补充 4～6 帧独立扇耳序列。

## 3. 天宫环境素材

目录：`bundles/core/textures/environments/tiangong/`

| 文件 | 尺寸 | Alpha | 用途 |
|---|---:|---|---|
| `bg_sky_base.png` | 941 × 1672 | 否 | 竖屏天空底图 |
| `bg_clouds_far.png` | 2172 × 724 | 是 | 最远云层视差 |
| `bg_islands_far.png` | 2172 × 724 | 是 | 远景仙山视差 |
| `bg_islands_mid.png` | 1774 × 887 | 是 | 中景仙山视差 |

背景条带为“视觉可循环”构图，导入后仍需在场景中做接缝检查。未确认像素级无缝前，优先使用两个节点交叠移动，而不是直接开启 Repeat。

## 4. 障碍物素材

### 4.1 地面障碍

目录：`bundles/core/textures/obstacles/ground/`

| 文件 | 尺寸 | 类型 |
|---|---:|---|
| `obstacle_mountain.png` | 1024 × 1536 | 静态山峰 |
| `obstacle_stone_pillar.png` | 1024 × 1536 | 静态石柱 |
| `obstacle_fireball.png` | 1254 × 1254 | 动态火球 |

### 4.2 天空障碍

目录：`bundles/core/textures/obstacles/sky/`

| 文件 | 尺寸 | 类型 |
|---|---:|---|
| `obstacle_storm_cloud.png` | 1536 × 1024 | 静态乌云/雷电承载云 |
| `obstacle_lightning_active.png` | 1024 × 1536 | 雷电激活态 |
| `obstacle_wind_fire_wheel.png` | 1254 × 1254 | 动态风火轮 |

雷电预警阶段复用 `obstacle_lightning_active.png`，降低透明度并配合缩放/闪烁，不重复增加一张外形不一致的资源。

## 5. UI 素材

目录：`bundles/core/textures/ui/common/`

| 文件 | 尺寸 | 用途 |
|---|---:|---|
| `ui_title_board.png` | 1920 × 819 | 标题木牌，文字运行时叠加 |
| `ui_button_primary.png` | 1997 × 788 | 开始、继续、重开等主按钮底图 |
| `ui_panel_result.png` | 1024 × 1536 | 结算面板底图 |
| `ui_icon_pause.png` | 1230 × 1278 | 暂停按钮 |
| `ui_icon_sound_on.png` | 1254 × 1254 | 声音开启按钮 |
| `ui_icon_sound_off.png` | 1254 × 1254 | 声音关闭按钮 |
| `ui_gesture_hold.png` | 1230 × 1278 | 现有旧版手势图；P4 接入前更名或替换为连续点击引导素材 |

按钮文字、标题、分数和提示语不烘焙进图片，由 Cocos Label/字体资产渲染。这样可保证文字正确、方便适配和后续修改。

## 6. 特效素材

目录：`bundles/core/textures/vfx/common/`

| 文件 | 尺寸 | 用途 |
|---|---:|---|
| `vfx_airflow_swoosh.png` | 1536 × 1024 | 耳朵扑动气流 |
| `vfx_collision_cloud.png` | 1536 × 1024 | 喜剧撞击云团 |
| `vfx_foreground_leaf.png` | 1536 × 1024 | 前景风吹树叶 |
| `vfx_score_sparkle.png` | 1218 × 1291 | 得分与新纪录闪光 |

火球火焰、风火轮火焰和雷电辉光已包含在主体资源中，首版通过旋转、缩放、透明度与少量粒子进行动态表现。

## 7. Cocos Creator 导入建议

所有透明 PNG 已检查为 RGBA，天空底图按设计为 RGB。

| 资产类型 | 建议 Max Size | Filter | Wrap | 图集建议 |
|---|---:|---|---|---|
| 角色 | 512 或 1024 | Bilinear | Clamp | 独立角色图集 |
| 障碍物 | 512 或 1024 | Bilinear | Clamp | 地面/天空可分图集 |
| UI 面板和木牌 | 1024 | Bilinear | Clamp | 配置九宫格切片 |
| UI 图标 | 256 | Bilinear | Clamp | 公共 UI 图集 |
| VFX | 256 或 512 | Bilinear | Clamp | 公共 VFX 图集 |
| 天空底图 | 2048 | Bilinear | Clamp | 不入小图集 |
| 视差条带 | 2048 | Bilinear | Clamp/验证后 Repeat | 不入小图集 |

首版构建前必须执行：

1. 在 720 × 1280 设计分辨率下确定实际显示尺寸。
2. 依据真机观感下调 Max Size，避免直接使用原始尺寸进入显存。
3. UI 木牌、按钮和结算面板配置 Sprite 九宫格。
4. 裁切透明边缘时保持各角色姿态的视觉中心一致。
5. 在微信开发者工具和真机中验证纹理压缩格式。
6. GIF 位于 `art_source/previews/`，只用于评审，不导入运行时 Bundle 或发布包。

## 8. 尚不属于本批图像素材的内容

- 字体文件及其商业授权。
- BGM 和 SFX 音频。
- Cocos 动画剪辑、Prefab、碰撞体和九宫格元数据。
- 微信启动图标、分享卡片和商店宣传图。

上述内容应在工程和发布阶段分别处理，不能把生成图片直接等同于完成游戏集成。

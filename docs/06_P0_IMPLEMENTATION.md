# 《八戒不会飞》P0 工程与灰盒实施记录

> 历史记录：本阶段最初按当时的长按需求验收。2026-09-19 共享飞行电机与 P0 兼容入口已同步改为点击冲量；下方原始验收数据仅记录当时事实。

## 1. 阶段结论

P0 已完成。当前工程可以在 Cocos Creator 3.8.8 中导入，并可构建为 Web Desktop 与微信小游戏调试包。

本阶段只验证工程链路、纵向飞行手感和基础状态流，不接入障碍、计分、正式素材、音频与完整菜单。

## 2. 命名约定

- 产品中文名：`八戒不会飞`。
- 工程与包标识：`bajie-cannot-fly`，避免中文标识影响构建工具链。
- 文件和目录：英文小写；TypeScript 类文件使用 PascalCase。
- P0 场景：`p0_game.scene`，名称明确表达阶段和用途。
- 可再生构建：`p0-web`、`p0-wechat`，统一位于 `build/` 并由 Git 忽略。
- 正式运行素材继续放在 `assets/bundles/core/`；P0 灰盒图形由代码绘制，不污染正式素材目录。

## 3. 工程结构

```text
assets/
├─ scenes/
│  └─ p0_game.scene
└─ scripts/
   ├─ app/
   │  ├─ GameState.ts
   │  └─ GameStateMachine.ts
   ├─ config/
   │  └─ FlightConfig.ts
   ├─ gameplay/
   │  ├─ FlightMotor.ts
   │  └─ P0PlayerView.ts
   └─ p0/
      └─ P0Bootstrap.ts

settings/v2/packages/
├─ engine.json
└─ project.json
```

职责划分：

- `GameState` / `GameStateMachine`：管理 Boot、Ready、Playing、Paused、Hit、Result 状态及合法迁移。
- `FlightConfig`：集中保存重力、上升推力、速度上限、旋转、边界与碰撞半径。
- `FlightMotor`：不依赖节点的确定性纵向飞行计算，采用固定子步长降低帧率波动影响。
- `P0PlayerView`：使用 `Graphics` 绘制大耳朵灰盒八戒，便于先验证轮廓和运动。
- `P0Bootstrap`：创建相机、画布、HUD、边界和角色，绑定输入与微信生命周期事件。

P0 只使用一个启动场景。现阶段拆分 Boot 场景只会增加空壳跳转；如果 P5 的资源预载或启动流程需要独立 Boot，再在 P5 创建。

## 4. 已实现行为

- 720 × 1280 竖屏逻辑分辨率，固定高度适配。
- Cocos 触摸事件统一处理桌面鼠标与移动端触摸，避免双事件重复触发。
- 按住持续施加向上推力，松开只受重力影响。
- 上升、下降速度限幅；角色俯仰随纵向速度平滑变化。
- Ready 待机漂浮；撞击边界进入 Hit，随后进入 Result；点击回到 Ready。
- `TOUCH_CANCEL` 等同松开。
- 进入后台自动清除按住状态并暂停；回到前台不会自动恢复飞行。
- HUD 使用 Cocos `SafeArea` 适配安全区。
- P0 调试 HUD 显示 y、vy、角度和按住状态。

## 5. 验收结果

| 项目 | 结果 | 证据 |
|---|---|---|
| TypeScript 严格校验 | 通过 | `tsc --project tsconfig.json` 无错误 |
| 飞行电机序列测试 | 通过 | 按住 250 ms 后 `vy = 362.5`；松开 350 ms 后 `vy = -145.0` |
| Web Desktop 构建 | 通过 | Creator 成功码 36；20 个文件，约 5.38 MB |
| 浏览器运行 | 通过 | 场景正常加载；Ready → Playing → Hit → Result → Ready；控制台无警告/错误 |
| 微信小游戏构建 | 通过 | Creator 成功码 36；24 个文件，约 5.20 MB |
| 微信构建入口 | 通过 | `launchScene` 为 `db://assets/scenes/p0_game.scene` |
| 微信工程结构 | 通过 | 已生成 `game.js`、`game.json`、`project.config.json` |

## 6. 本地运行

1. 使用 Cocos Creator 3.8.8 打开项目根目录。
2. 打开 `assets/scenes/p0_game.scene`。
3. 点击编辑器预览，或构建 Web Desktop / 微信小游戏。
4. 微信开发者工具导入目录为 `build/p0-wechat`。

`build/` 是可再生产物，不作为源文件维护。

## 7. 已知限制与下一步

- 本机微信开发者工具是首次安装状态，CLI 配置尚未在 GUI 登录后初始化；构建包已经生成，但首次导入需要项目负责人启动工具并完成扫码登录。
- `project.config.json` 当前使用 Creator 自动生成的调试 AppID；P7 前必须替换为正式项目 AppID。
- 安全区适配已经接入，但刘海屏、圆角屏和真实微信生命周期仍需在 P7 真机验收。
- P1 将加入占位障碍、滚动、碰撞、计分、失败和重开完整闭环；正式美术仍不在 P1 接入。

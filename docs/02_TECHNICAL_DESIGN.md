# 《八戒不会飞》技术设计文档（TDD）

## 1. 技术目标

- 使用 Cocos Creator 3.x 与 TypeScript 构建微信小游戏。
- 让飞行手感、生成规则和难度参数全部可配置。
- 保证不同帧率下的运动结果尽量一致。
- 避免游戏过程中频繁创建和销毁节点。
- 将平台能力与核心玩法解耦，便于编辑器预览和真机调试。

## 2. 基础技术决策

| 项目 | 决策 |
|---|---|
| 屏幕方向 | 竖屏 |
| 设计分辨率 | 720 × 1280 |
| 适配方式 | 固定设计高度，按设备宽度适配，并处理安全区 |
| 开发语言 | TypeScript，开启严格类型检查 |
| 场景维度 | 2D |
| 目标帧率 | 60 FPS；低性能目标机不得长期低于 45 FPS |
| 运动计算 | 固定时间步或带上限的 delta time |
| 数据保存 | 本地版本化 JSON，通过平台存储适配层读写 |
| 随机系统 | 可传入种子的伪随机数生成器，便于复现问题 |

具体 Cocos Creator 补丁版本在创建工程时锁定，首版开发中途不得升级。

## 3. 推荐目录结构

```text
assets/
  bundles/
    core/
      scenes/
      prefabs/
      scripts/
      textures/
      audio/
  scripts/
    app/
      App.ts
      GameStateMachine.ts
      EventBus.ts
    gameplay/
      PlayerController.ts
      FlightMotor.ts
      WorldScroller.ts
      ScoreSystem.ts
      CollisionSystem.ts
    obstacles/
      ObstaclePair.ts
      ObstacleSpawner.ts
      ObstaclePool.ts
      ObstacleBehaviour.ts
      behaviours/
        StaticObstacle.ts
        SineMover.ts
        LightningHazard.ts
        Spinner.ts
    config/
      GameConfig.ts
      BalanceConfig.ts
      ObstacleConfig.ts
    platform/
      PlatformService.ts
      WeChatPlatformService.ts
      EditorPlatformService.ts
    storage/
      SaveData.ts
      SaveService.ts
    ui/
      MenuView.ts
      HudView.ts
      PauseView.ts
      ResultView.ts
      TutorialView.ts
    presentation/
      PlayerAnimator.ts
      AudioService.ts
      VfxService.ts
      ParallaxLayer.ts
  resources/
  settings/
```

最终目录可按 Cocos Creator 的资源 Bundle 约束微调，但模块边界应保持一致。

## 4. 场景方案

第一版推荐使用两个场景：

### 4.1 Boot.scene

职责：

- 初始化平台服务。
- 读取本地存档。
- 加载 Core Bundle。
- 显示最小加载界面。
- 进入 Game 场景。

### 4.2 Game.scene

包含标题、Ready、Playing、Paused、Hit 和 Result 状态所需节点。首版不为每个界面单独切场景，以减少加载抖动和状态传递复杂度。

推荐层级：

```text
GameRoot
  BackgroundRoot
    Sky
    FarClouds
    FloatingIslands
    Midground
  GameplayRoot
    ObstacleRoot
    Player
    BoundaryRoot
  ForegroundRoot
  WorldUI
  ScreenUI
    MenuView
    HudView
    PauseView
    ResultView
    TutorialView
  Services
```

## 5. 核心架构

### 5.1 GameStateMachine

唯一负责游戏状态切换的模块。

主要接口：

```ts
enum GameState {
  Loading,
  Menu,
  Ready,
  Playing,
  Paused,
  Hit,
  Result,
}

interface GameStateMachine {
  state: GameState;
  transition(next: GameState): void;
}
```

约束：

- 失败只能从 `Playing` 进入 `Hit`。
- 计分只能在 `Playing` 中发生。
- 暂停恢复回到暂停前的合法状态，首版只允许从 `Playing` 进入暂停。
- 所有输入、生成器和滚动模块都订阅状态变化，不自行维护重复状态。

### 5.2 PlayerController

职责：

- 接收标准化后的单次飞行点击事件，并保证一次触摸只生成一次冲量。
- 驱动 FlightMotor。
- 根据速度通知动画表现层。
- 处理边界与死亡通知。

不负责：

- 直接更新分数。
- 生成障碍物。
- 控制 UI。
- 保存最高分。

### 5.3 FlightMotor

使用“持续重力 + 点击时瞬时向上冲量”的显式垂直速度模拟。首轮采用固定扑动速度，核心公式：

```text
每帧：vy += gravity * dt
有效点击时：vy = flapVelocity
vy = clamp(vy, maxFallSpeed, maxRiseSpeed)
y += vy * dt
```

输入层只在 `Touch Start` 产生 `flap()` 事件；`Touch End` 不改变速度。`flap()` 必须按触点生命周期去重，UI 点击、暂停状态和结算状态不得传入 FlightMotor。

为避免低帧率穿透：

- 对单帧 `dt` 设置上限。
- 必要时将长帧拆分为多个固定子步。
- 碰撞检查在运动子步之后进行。

### 5.4 WorldScroller

- 八戒的水平坐标基本固定。
- 背景层、障碍物和前景根据各自速度向左移动。
- 游戏世界基础速度由难度系统提供。
- 视差层只做表现，不参与碰撞。

### 5.5 ObstacleSpawner

生成流程：

1. 根据当前分数读取难度档位。
2. 选择允许出现的组合类型。
3. 计算安全通道高度。
4. 在允许范围内采样通道中心点。
5. 根据动态障碍完整运动包围盒进行安全校验。
6. 校验失败则重新采样，达到次数上限时回退到安全静态组合。
7. 从对象池取得障碍组并应用配置。

生成器必须接受随机种子。在调试日志中记录种子、分数和组合 ID，可复现无解或异常关卡。

### 5.6 ObstaclePool

- 按障碍组或障碍类型建立对象池。
- 游戏开始前预热首屏需要的数量。
- 障碍离开回收线后重置并放回池中。
- 重置内容包括动画状态、计分标记、碰撞开关、计时器和粒子状态。
- `update()` 中禁止反复 instantiate/destroy。

### 5.7 ScoreSystem

- 障碍组携带唯一运行时 ID 和 `scored` 标记。
- 计分线越过玩家水平坐标时触发一次计分。
- 撞击后立即锁定计分系统。
- 最高分更新通过 SaveService 完成。

## 6. 障碍行为组件

采用组合而非为每种障碍复制完整脚本：

- `StaticObstacle`：无自身运动。
- `SineMover`：按振幅、频率和相位进行垂直往复。
- `Spinner`：控制视觉节点旋转，不改变逻辑中心。
- `LightningHazard`：管理休眠、预警、激活和冷却状态。
- `ObstaclePresentation`：播放粒子、闪光和音效。

动态行为必须使用游戏时间，而不是不受暂停控制的系统时间。

## 7. 碰撞方案

首版使用简单、可视化调试的 2D 碰撞体：

- 八戒：一个主圆形或圆角矩形碰撞体，覆盖身体主体，不覆盖耳朵尖端和稀疏衣角。
- 山峰：一个或多个凸多边形，避免逐像素贴合。
- 石柱：矩形或圆角矩形。
- 火球：圆形。
- 乌云：圆角矩形或两个简化圆形。
- 雷电：预警阶段关闭碰撞，激活阶段使用窄矩形/多段矩形。
- 风火轮：圆形。

碰撞层建议：

| Group | 与谁碰撞 |
|---|---|
| Player | Hazard、Boundary |
| Hazard | Player |
| Boundary | Player |
| Sensor | Player，仅用于计分或事件 |

开发构建提供碰撞体可视化开关。正式构建默认关闭。

## 8. 配置数据

所有可调参数集中在配置对象，禁止散落硬编码：

```ts
interface FlightConfig {
  gravity: number;
  flapVelocity: number;
  maxRiseSpeed: number;
  maxFallSpeed: number;
  riseRotation: number;
  fallRotation: number;
  rotationSmoothTime: number;
}

interface DifficultyTier {
  minScore: number;
  worldSpeed: number;
  gapSize: number;
  dynamicWeight: number;
  maxGapCenterStep: number;
  doubleDynamicEnabled: boolean;
}
```

配置在第一版可以使用 TypeScript/JSON 或 Scriptable Asset；选择标准是能在编辑器中快速调整，并能被版本控制清晰比较。

## 9. 存档结构

```ts
interface SaveDataV1 {
  version: 1;
  bestScore: number;
  soundEnabled: boolean;
  tutorialCompleted: boolean;
}
```

要求：

- 存档读取失败时使用默认值，不阻止进入游戏。
- 写入采用完整对象覆盖，数据量很小。
- 保留 `version` 字段，为后续迁移做准备。
- 平台存储 API 只存在于平台适配层，游戏代码不直接调用微信全局对象。

## 10. 微信平台适配

`PlatformService` 至少提供：

- 初始化。
- 本地键值存储读取和写入。
- 监听进入前台与后台。
- 获取安全区/屏幕信息。
- 设置目标帧率能力（若平台支持）。

编辑器运行使用 `EditorPlatformService`，保证不依赖微信环境也能完整调试核心玩法。

## 11. 资源与性能策略

### 11.1 资源

- 角色、障碍和 UI 按用途打图集，避免大量零散小纹理。
- 背景大图按层拆分，能循环的云层使用可平铺资源。
- 禁止把完整参考海报直接作为游戏背景长期加载。
- 透明纹理裁切空白区域。
- 音效采用短文件并限制同时播放数量。
- 最终纹理压缩和音频格式以微信真机兼容测试为准。

### 11.2 运行时

- 游戏过程中不做同步大资源加载。
- 障碍物、常用粒子和分数特效使用对象池。
- 避免每帧创建临时数组、对象和闭包。
- 背景粒子设数量上限；低性能模式可减少树叶、云雾和火星。
- UI 不参与世界层每帧更新。

### 11.3 内部预算

- 目标帧率：主流目标机 60 FPS。
- 低性能目标机：持续游戏时尽量保持 45 FPS 以上。
- 同屏活动障碍组：通常 3～4 组。
- 同屏非必要装饰粒子：设硬上限，并允许质量降级。
- 首包内部目标不超过 4 MB；平台最终限制以发布时微信开发者工具为准。

## 12. 音频系统

- BGM 与 SFX 分通道管理。
- 同类高频音效设置最短播放间隔，避免耳朵扑动声叠加爆音。
- 雷电预警声与激活时间保持同步。
- 切后台暂停音乐，回到前台不自动恢复游戏状态。
- 玩家关闭声音后持久化设置。

## 13. 调试工具

开发构建建议提供隐藏调试面板：

- 实时 FPS。
- 当前游戏状态。
- 当前随机种子。
- 当前难度档位。
- 世界速度、通道高度和飞行速度。
- 碰撞体显示。
- 指定生成某一种障碍组合。
- 无敌模式。
- 清除最高分。

这些功能不得出现在正式玩家界面。

## 14. 错误与日志

关键日志包含：

- 启动失败或资源加载失败。
- 存档解析失败。
- 非法状态切换。
- 障碍生成连续校验失败并触发回退。
- 重复计分尝试。
- 未回收的障碍实例数量异常。

正式构建降低普通日志量，保留严重错误信息。

## 15. 后续扩展边界

首版架构需允许后续增加：

- 新障碍行为组件。
- 新场景主题和资源 Bundle。
- 微信排行榜、分享、广告和云存档。
- 皮肤与角色表现。

但不得为了未知的后续需求提前实现复杂框架。第一版只保留清晰接口。

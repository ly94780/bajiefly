import {
    _decorator,
    Camera,
    Canvas,
    Color,
    Component,
    EventTouch,
    Game,
    game,
    Graphics,
    input,
    Input,
    Label,
    Layers,
    Node,
    ResolutionPolicy,
    SafeArea,
    Sprite,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { loadP4ArtAssets, type P4ArtAssets } from '../art/P4ArtAssets';
import { GameState } from '../app/GameState';
import { GameStateMachine } from '../app/GameStateMachine';
import { DEFAULT_FLIGHT_CONFIG } from '../config/FlightConfig';
import {
    DEFAULT_P1_GAMEPLAY_CONFIG,
    type P1GameplayConfig,
} from '../config/P1GameplayConfig';
import { BajieGrayboxView } from '../gameplay/BajieGrayboxView';
import { FlightMotor } from '../gameplay/FlightMotor';
import { GrayboxObstaclePair } from '../gameplay/GrayboxObstaclePair';
import { ObjectPool } from '../gameplay/ObjectPool';
import { RunSession } from '../gameplay/RunSession';
import { ObstacleGenerator } from '../obstacles/ObstacleGenerator';
import { BestScoreStorage } from '../platform/BestScoreStorage';

const { ccclass } = _decorator;

interface ParallaxMarker {
    readonly node: Node;
    readonly startX: number;
    readonly speedRatio: number;
    readonly sprite: Sprite;
    readonly artKey: 'cloudsFar' | 'islandsFar' | 'islandsMid';
}

@ccclass('P1Bootstrap')
export class P1Bootstrap extends Component {
    private readonly config: P1GameplayConfig = DEFAULT_P1_GAMEPLAY_CONFIG;
    private readonly stateMachine = new GameStateMachine();
    private readonly flightMotor = new FlightMotor(DEFAULT_FLIGHT_CONFIG);
    private readonly runSession = new RunSession();
    private readonly bestScoreStorage = new BestScoreStorage();
    private readonly obstacleGenerator = new ObstacleGenerator(0x8a17c0de);

    private playerNode: Node | null = null;
    private playerView: BajieGrayboxView | null = null;
    private obstacleLayer: Node | null = null;
    private obstaclePool: ObjectPool<GrayboxObstaclePair> | null = null;
    private readonly activeObstacles: GrayboxObstaclePair[] = [];
    private readonly parallaxMarkers: ParallaxMarker[] = [];
    private artAssets: P4ArtAssets | null = null;
    private skySprite: Sprite | null = null;
    private pauseSprite: Sprite | null = null;
    private titleBoardSprite: Sprite | null = null;
    private resultPanelSprite: Sprite | null = null;
    private uiCamera: Camera | null = null;
    private backgroundVisibleWidth = 0;
    private backgroundVisibleHeight = 0;

    private titleLabel: Label | null = null;
    private scoreLabel: Label | null = null;
    private bestLabel: Label | null = null;
    private instructionLabel: Label | null = null;
    private debugLabel: Label | null = null;
    private pauseLabel: Label | null = null;
    private pauseButtonNode: Node | null = null;
    private resultPanel: Node | null = null;
    private resultScoreLabel: Label | null = null;
    private resultBestLabel: Label | null = null;

    private bestScore = 0;
    private flapCount = 0;
    private elapsed = 0;
    private hitElapsed = 0;
    private obstacleSequence = 0;
    private currentSeed = 0x8a17c0de;
    private activeFlightTouchId: number | null = null;
    private pauseTouchId: number | null = null;
    private unsubscribeState: (() => void) | null = null;

    protected override onLoad(): void {
        game.frameRate = 60;
        view.setDesignResolutionSize(
            this.config.designWidth,
            this.config.designHeight,
            ResolutionPolicy.FIXED_HEIGHT,
        );
        view.resizeWithBrowserSize(true);

        this.buildGrayboxScene();
        void this.loadAndApplyArt();
        this.bindInput();
        this.unsubscribeState = this.stateMachine.onChange(() => this.refreshHud());
        this.bestScore = this.bestScoreStorage.load();
        this.prepareRun();
        this.stateMachine.transition(GameState.Ready);
        this.refreshHud();
    }

    protected override onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onPress, this);
        input.off(Input.EventType.TOUCH_END, this.onRelease, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onCancel, this);
        game.off(Game.EVENT_HIDE, this.onGameHide, this);
        game.off(Game.EVENT_SHOW, this.onGameShow, this);
        this.unsubscribeState?.();
    }

    protected override update(deltaTime: number): void {
        this.elapsed += deltaTime;
        this.layoutSkyToVisibleArea();

        switch (this.stateMachine.state) {
            case GameState.Ready:
                this.updateReadyPose();
                break;
            case GameState.Playing:
                this.updatePlaying(deltaTime);
                break;
            case GameState.Hit:
                this.updateHit(deltaTime);
                break;
            case GameState.Boot:
            case GameState.Paused:
            case GameState.Result:
                break;
        }

        this.refreshDebugLabel();
    }

    private buildGrayboxScene(): void {
        const canvasNode = new Node('Canvas');
        canvasNode.layer = Layers.Enum.UI_2D;
        this.node.addChild(canvasNode);
        const canvasTransform = canvasNode.addComponent(UITransform);
        canvasTransform.setContentSize(this.config.designWidth, this.config.designHeight);

        const cameraNode = new Node('UICamera');
        cameraNode.layer = Layers.Enum.UI_2D;
        cameraNode.setPosition(0, 0, 1000);
        canvasNode.addChild(cameraNode);
        const camera = cameraNode.addComponent(Camera);
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = this.config.designHeight / 2;
        camera.near = 1;
        camera.far = 2000;
        camera.clearColor = new Color(83, 166, 227, 255);
        camera.visibility = Layers.Enum.UI_2D;
        this.uiCamera = camera;

        const canvas = canvasNode.addComponent(Canvas);
        canvas.cameraComponent = camera;

        this.createBackground(canvasNode);
        this.obstacleLayer = this.createUiNode(
            'ObstacleLayer',
            canvasNode,
            this.config.designWidth,
            this.config.designHeight,
        );
        this.createBoundaries(canvasNode);
        this.createPlayer(canvasNode);
        this.createHud(canvasNode);
        this.createResultPanel(canvasNode);

        this.obstaclePool = new ObjectPool(
            () => this.createObstaclePair(),
            (pair) => {
                pair.node.active = true;
            },
            (pair) => {
                pair.resetForPool();
                pair.node.active = false;
            },
        );
    }

    private createBackground(parent: Node): void {
        const node = this.createUiNode(
            'GrayboxBackground',
            parent,
            this.config.designWidth,
            this.config.designHeight,
        );
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(83, 166, 227, 255);
        graphics.rect(
            -this.config.designWidth / 2,
            -this.config.designHeight / 2,
            this.config.designWidth,
            this.config.designHeight,
        );
        graphics.fill();

        this.skySprite = this.createSpriteNode(
            'SkyArt', node, this.config.designWidth, this.config.designHeight,
        );

        graphics.strokeColor = new Color(255, 255, 255, 28);
        graphics.lineWidth = 2;
        for (let y = -430; y <= 430; y += 145) {
            graphics.moveTo(-this.config.designWidth / 2, y);
            graphics.lineTo(this.config.designWidth / 2, y);
        }
        graphics.stroke();

        const markerData = [
            { x: -250, y: 250, scale: 0.72, speedRatio: 0.1, artKey: 'cloudsFar' as const },
            { x: 120, y: -80, scale: 0.55, speedRatio: 0.16, artKey: 'islandsMid' as const },
            { x: 470, y: 350, scale: 0.8, speedRatio: 0.12, artKey: 'islandsFar' as const },
        ];
        markerData.forEach((data, index) => {
            const marker = this.createUiNode(`FarCloud_${index + 1}`, parent, 220, 90);
            marker.setPosition(data.x, data.y, 0);
            marker.setScale(data.scale, data.scale, 1);
            const cloud = marker.addComponent(Graphics);
            cloud.fillColor = new Color(226, 243, 249, 110);
            cloud.circle(-55, 0, 42);
            cloud.circle(0, 12, 58);
            cloud.circle(60, -2, 44);
            cloud.fill();
            const sprite = this.createSpriteNode(
                `ParallaxArt_${index + 1}`, marker, 430, 185,
            );
            this.parallaxMarkers.push({
                node: marker,
                startX: data.x,
                speedRatio: data.speedRatio,
                sprite,
                artKey: data.artKey,
            });
        });

        const cloudBank = this.createUiNode(
            'LowerCloudBank',
            parent,
            this.config.designWidth,
            230,
        );
        cloudBank.setPosition(0, -545, 0);
        const bankGraphics = cloudBank.addComponent(Graphics);
        bankGraphics.fillColor = new Color(218, 240, 249, 255);
        bankGraphics.circle(-280, -20, 150);
        bankGraphics.circle(-80, -5, 185);
        bankGraphics.circle(150, -25, 170);
        bankGraphics.circle(330, -10, 145);
        bankGraphics.fill();
    }

    private createBoundaries(parent: Node): void {
        const node = this.createUiNode(
            'FlightBoundaries',
            parent,
            this.config.designWidth,
            this.config.designHeight,
        );
        const graphics = node.addComponent(Graphics);
        graphics.strokeColor = new Color(255, 225, 150, 150);
        graphics.lineWidth = 3;
        graphics.moveTo(-this.config.designWidth / 2, DEFAULT_FLIGHT_CONFIG.topBoundaryY);
        graphics.lineTo(this.config.designWidth / 2, DEFAULT_FLIGHT_CONFIG.topBoundaryY);
        graphics.moveTo(-this.config.designWidth / 2, DEFAULT_FLIGHT_CONFIG.bottomBoundaryY);
        graphics.lineTo(this.config.designWidth / 2, DEFAULT_FLIGHT_CONFIG.bottomBoundaryY);
        graphics.stroke();
    }

    private createPlayer(parent: Node): void {
        const node = this.createUiNode('Bajie', parent, 190, 150);
        node.setPosition(this.config.playerX, DEFAULT_FLIGHT_CONFIG.startY, 0);
        this.playerView = node.addComponent(BajieGrayboxView);
        this.playerView.initialize();
        this.playerNode = node;
    }

    private createHud(parent: Node): void {
        const safeAreaNode = this.createUiNode(
            'SafeAreaHud',
            parent,
            this.config.designWidth,
            this.config.designHeight,
        );
        safeAreaNode.addComponent(SafeArea).updateArea();

        this.titleBoardSprite = this.createSpriteNode(
            'TitleBoardArt', safeAreaNode, 520, 145,
        );
        this.titleBoardSprite.node.setPosition(0, 560, -1);

        this.titleLabel = this.createLabel(
            'TitleLabel',
            safeAreaNode,
            new Vec3(0, 560, 0),
            30,
            new Color(255, 248, 225, 255),
            500,
            70,
        );
        this.scoreLabel = this.createLabel(
            'ScoreLabel',
            safeAreaNode,
            new Vec3(0, 475, 0),
            54,
            Color.WHITE,
            300,
            80,
        );
        this.bestLabel = this.createLabel(
            'BestLabel',
            safeAreaNode,
            new Vec3(0, 420, 0),
            22,
            new Color(232, 245, 255, 255),
            360,
            55,
        );
        this.instructionLabel = this.createLabel(
            'InstructionLabel',
            safeAreaNode,
            new Vec3(0, -430, 0),
            28,
            Color.WHITE,
            620,
            90,
        );
        this.debugLabel = this.createLabel(
            'DebugLabel',
            safeAreaNode,
            new Vec3(0, -500, 0),
            19,
            new Color(235, 247, 255, 230),
            660,
            60,
        );

        const pauseNode = this.createUiNode('PauseButton', safeAreaNode, 120, 70);
        pauseNode.setPosition(285, 555, 0);
        const buttonGraphics = pauseNode.addComponent(Graphics);
        buttonGraphics.fillColor = new Color(31, 57, 78, 185);
        buttonGraphics.roundRect(-60, -35, 120, 70, 16);
        buttonGraphics.fill();
        this.pauseSprite = this.createSpriteNode('PauseIconArt', pauseNode, 58, 58);
        this.pauseSprite.node.setPosition(-32, 0, 0);
        this.pauseLabel = this.createLabel(
            'PauseButtonLabel',
            pauseNode,
            Vec3.ZERO,
            22,
            Color.WHITE,
            112,
            62,
        );
        this.pauseButtonNode = pauseNode;
    }

    private createResultPanel(parent: Node): void {
        const panel = this.createUiNode('ResultPanel', parent, 520, 350);
        panel.setPosition(0, 35, 0);
        const graphics = panel.addComponent(Graphics);
        graphics.fillColor = new Color(34, 48, 63, 232);
        graphics.roundRect(-260, -175, 520, 350, 28);
        graphics.fill();
        graphics.strokeColor = new Color(255, 224, 155, 255);
        graphics.lineWidth = 5;
        graphics.roundRect(-260, -175, 520, 350, 28);
        graphics.stroke();
        this.resultPanelSprite = this.createSpriteNode('ResultPanelArt', panel, 540, 380);
        this.resultPanelSprite.node.setPosition(0, 0, -1);

        const title = this.createLabel(
            'ResultTitle',
            panel,
            new Vec3(0, 112, 0),
            38,
            new Color(255, 228, 168, 255),
            440,
            65,
        );
        title.string = '本局结束';
        this.resultScoreLabel = this.createLabel(
            'ResultScore',
            panel,
            new Vec3(0, 32, 0),
            32,
            Color.WHITE,
            440,
            60,
        );
        this.resultBestLabel = this.createLabel(
            'ResultBest',
            panel,
            new Vec3(0, -30, 0),
            25,
            new Color(214, 237, 249, 255),
            440,
            55,
        );
        const restart = this.createLabel(
            'RestartHint',
            panel,
            new Vec3(0, -112, 0),
            24,
            new Color(255, 228, 168, 255),
            440,
            58,
        );
        restart.string = '点击屏幕重新准备';
        panel.active = false;
        this.resultPanel = panel;
    }

    private createObstaclePair(): GrayboxObstaclePair {
        if (!this.obstacleLayer) {
            throw new Error('Obstacle layer must exist before creating the pool.');
        }
        const node = this.createUiNode(
            'ObstaclePair',
            this.obstacleLayer,
            220,
            this.config.designHeight,
        );
        node.active = false;
        const pair = node.addComponent(GrayboxObstaclePair);
        if (this.artAssets) pair.applyArtAssets(this.artAssets);
        return pair;
    }

    private createSpriteNode(
        name: string,
        parent: Node,
        width: number,
        height: number,
    ): Sprite {
        const node = this.createUiNode(name, parent, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return sprite;
    }

    private async loadAndApplyArt(): Promise<void> {
        try {
            const art = await loadP4ArtAssets();
            if (!this.node.isValid) return;
            this.artAssets = art;
            if (this.skySprite) {
                this.skySprite.spriteFrame = art.sky;
                this.layoutSkyToVisibleArea(true);
            }
            for (const marker of this.parallaxMarkers) {
                marker.sprite.spriteFrame = art[marker.artKey];
                const graphics = marker.node.getComponent(Graphics);
                if (graphics) graphics.enabled = false;
            }
            if (this.pauseSprite) this.pauseSprite.spriteFrame = art.pauseIcon;
            if (this.titleBoardSprite) this.titleBoardSprite.spriteFrame = art.titleBoard;
            if (this.resultPanelSprite) this.resultPanelSprite.spriteFrame = art.resultPanel;
            this.playerView?.applyArtAssets(art);
            this.activeObstacles.forEach((obstacle) => obstacle.applyArtAssets(art));
        } catch (error) {
            console.error('[P4] Failed to load core art bundle. Graybox fallback remains active.', error);
        }
    }

    private layoutSkyToVisibleArea(force = false): void {
        const sprite = this.skySprite;
        const frame = sprite?.spriteFrame;
        if (!sprite || !frame) return;

        const visible = view.getVisibleSize();
        const cameraHeight = this.config.designHeight;
        const canvas = game.canvas;
        const browserCanvas = typeof document !== 'undefined'
            ? document.querySelector('canvas')
            : null;
        const canvasWidth = Math.max(canvas?.width ?? 0, browserCanvas?.width ?? 0);
        const canvasHeight = browserCanvas?.height ?? canvas?.height ?? 0;
        const measuredCameraWidth = canvasHeight > 0
            ? cameraHeight * canvasWidth / canvasHeight
            : this.uiCamera
                ? this.uiCamera.orthoHeight * 2 * this.uiCamera.camera.aspect
                : visible.width;
        // Some Creator preview shells report the portrait logical size while the UI
        // camera renders a wider surface. A conservative minimum keeps the sky behind
        // every visible obstacle; the portrait viewport simply crops the excess sides.
        const cameraWidth = Math.max(measuredCameraWidth, cameraHeight * 1.1);
        const visibleWidth = Math.max(visible.width, cameraWidth);
        const visibleHeight = Math.max(visible.height, cameraHeight);
        if (!force
            && Math.abs(visibleWidth - this.backgroundVisibleWidth) < 0.5
            && Math.abs(visibleHeight - this.backgroundVisibleHeight) < 0.5) {
            return;
        }
        this.backgroundVisibleWidth = visibleWidth;
        this.backgroundVisibleHeight = visibleHeight;

        sprite.getComponent(UITransform)?.setContentSize(
            this.config.designWidth,
            this.config.designHeight,
        );
        const coverScale = Math.max(
            visibleWidth / this.config.designWidth,
            visibleHeight / this.config.designHeight,
        );
        sprite.node.setScale(coverScale, coverScale, 1);
    }

    private createUiNode(name: string, parent: Node, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        parent.addChild(node);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return node;
    }

    private createLabel(
        name: string,
        parent: Node,
        position: Vec3,
        fontSize: number,
        color: Color,
        width: number,
        height: number,
    ): Label {
        const node = this.createUiNode(name, parent, width, height);
        node.setPosition(position);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private bindInput(): void {
        input.on(Input.EventType.TOUCH_START, this.onPress, this);
        input.on(Input.EventType.TOUCH_END, this.onRelease, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onCancel, this);
        game.on(Game.EVENT_HIDE, this.onGameHide, this);
        game.on(Game.EVENT_SHOW, this.onGameShow, this);
    }

    private readonly onPress = (event: EventTouch): void => {
        const touchId = event.getID() ?? 0;
        if (this.isPauseArea(event) && this.togglePause()) {
            this.pauseTouchId = touchId;
            return;
        }

        switch (this.stateMachine.state) {
            case GameState.Ready:
                if (this.activeFlightTouchId !== null) {
                    return;
                }
                this.activeFlightTouchId = touchId;
                this.flightMotor.setPositionY(
                    this.playerNode?.position.y ?? DEFAULT_FLIGHT_CONFIG.startY,
                );
                this.stateMachine.transition(GameState.Playing);
                this.performFlap();
                break;
            case GameState.Playing:
                if (this.activeFlightTouchId === null) {
                    this.activeFlightTouchId = touchId;
                    this.performFlap();
                }
                break;
            case GameState.Result:
                this.resetToReady();
                break;
            case GameState.Boot:
            case GameState.Paused:
            case GameState.Hit:
                break;
        }
    };

    private readonly onRelease = (event: EventTouch): void => {
        const touchId = event.getID() ?? 0;
        if (touchId === this.pauseTouchId) {
            this.pauseTouchId = null;
            return;
        }
        if (touchId === this.activeFlightTouchId) {
            this.activeFlightTouchId = null;
        }
    };

    private readonly onCancel = (event: EventTouch): void => {
        const touchId = event.getID() ?? 0;
        if (touchId === this.pauseTouchId) {
            this.pauseTouchId = null;
        }
        if (touchId === this.activeFlightTouchId) {
            this.activeFlightTouchId = null;
        }
    };

    private readonly onGameHide = (): void => {
        this.clearTouches();
        if (this.stateMachine.state === GameState.Playing) {
            this.stateMachine.transition(GameState.Paused);
        }
    };

    private readonly onGameShow = (): void => {
        this.clearTouches();
    };

    private updateReadyPose(): void {
        if (!this.playerNode) {
            return;
        }
        const y = DEFAULT_FLIGHT_CONFIG.startY + Math.sin(this.elapsed * 2.4) * 9;
        this.playerNode.setPosition(this.config.playerX, y, 0);
        this.playerNode.setRotationFromEuler(0, 0, Math.sin(this.elapsed * 2.4) * 2);
    }

    private updatePlaying(deltaTime: number): void {
        const node = this.playerNode;
        if (!node) {
            return;
        }

        const snapshot = this.flightMotor.step(deltaTime);
        node.setPosition(this.config.playerX, snapshot.positionY, 0);
        node.setRotationFromEuler(0, 0, snapshot.rotationZ);
        this.playerView?.setFlightVelocity(snapshot.velocityY);

        this.updateParallax(deltaTime);
        this.updateObstacles(deltaTime, snapshot.positionY);

        const radius = DEFAULT_FLIGHT_CONFIG.collisionRadius;
        if (
            snapshot.positionY + radius >= DEFAULT_FLIGHT_CONFIG.topBoundaryY
            || snapshot.positionY - radius <= DEFAULT_FLIGHT_CONFIG.bottomBoundaryY
        ) {
            this.beginHit();
        }
    }

    private updateObstacles(deltaTime: number, playerY: number): void {
        const pool = this.obstaclePool;
        if (!pool) {
            return;
        }

        const tier = this.obstacleGenerator.getTier(this.runSession.score);
        const distance = tier.worldSpeed * deltaTime;
        const radius = DEFAULT_FLIGHT_CONFIG.collisionRadius;
        for (const obstacle of this.activeObstacles) {
            obstacle.moveLeft(distance);
            obstacle.updateBehavior(deltaTime);

            if (
                obstacle.rightX < this.config.playerX
                && this.runSession.tryScoreObstacle(obstacle.obstacleId)
            ) {
                this.bestScore = this.bestScoreStorage.saveIfHigher(
                    this.runSession.score,
                    this.bestScore,
                );
                this.refreshHud();
            }

            if (obstacle.intersectsCircle(this.config.playerX, playerY, radius)) {
                this.beginHit();
                return;
            }
        }

        for (let index = this.activeObstacles.length - 1; index >= 0; index -= 1) {
            const obstacle = this.activeObstacles[index];
            if (obstacle.rightX < this.config.obstacleDespawnX) {
                this.activeObstacles.splice(index, 1);
                pool.release(obstacle);
            }
        }
        this.ensureObstacleSupply();
    }

    private updateParallax(deltaTime: number): void {
        this.parallaxMarkers.forEach((marker) => {
            const nextX = marker.node.position.x
                - this.obstacleGenerator.getTier(this.runSession.score).worldSpeed
                    * marker.speedRatio * deltaTime;
            marker.node.setPosition(nextX < -500 ? nextX + 1000 : nextX, marker.node.position.y, 0);
        });
    }

    private updateHit(deltaTime: number): void {
        this.hitElapsed += deltaTime;
        if (this.playerNode) {
            const direction = Math.floor(this.hitElapsed * 30) % 2 === 0 ? -1 : 1;
            this.playerNode.setPosition(
                this.config.playerX + direction * 6,
                this.playerNode.position.y,
                0,
            );
        }

        if (this.hitElapsed >= this.config.hitDuration) {
            this.playerNode?.setPosition(
                this.config.playerX,
                this.playerNode.position.y,
                0,
            );
            this.stateMachine.transition(GameState.Result);
            this.playerView?.setResultState();
        }
    }

    private beginHit(): void {
        if (this.stateMachine.state !== GameState.Playing) {
            return;
        }
        this.clearTouches();
        this.hitElapsed = 0;
        this.playerView?.setHitState(true);
        this.stateMachine.transition(GameState.Hit);
    }

    private togglePause(): boolean {
        if (this.stateMachine.state === GameState.Playing) {
            this.clearTouches();
            this.stateMachine.transition(GameState.Paused);
            return true;
        }
        if (this.stateMachine.state === GameState.Paused) {
            this.clearTouches();
            this.stateMachine.transition(GameState.Playing);
            return true;
        }
        return false;
    }

    private isPauseArea(event: EventTouch): boolean {
        const location = event.getUILocation();
        const visibleSize = view.getVisibleSize();
        return location.x >= visibleSize.width - 140
            && location.y >= visibleSize.height - 120;
    }

    private prepareRun(): void {
        this.clearTouches();
        this.flapCount = 0;
        this.hitElapsed = 0;
        this.runSession.reset();
        this.obstacleSequence = 0;
        this.currentSeed = (0x8a17c0de ^ Date.now()) >>> 0;
        this.obstacleGenerator.reset(this.currentSeed);
        this.flightMotor.reset();
        this.playerView?.setHitState(false);
        this.playerNode?.setPosition(
            this.config.playerX,
            DEFAULT_FLIGHT_CONFIG.startY,
            0,
        );
        this.playerNode?.setRotationFromEuler(0, 0, 0);

        this.parallaxMarkers.forEach((marker) => {
            marker.node.setPosition(marker.startX, marker.node.position.y, 0);
        });

        const pool = this.obstaclePool;
        if (pool) {
            pool.releaseAll(this.activeObstacles);
            this.activeObstacles.length = 0;
            this.spawnObstacle(this.config.obstacleSpawnX);
            this.spawnObstacle(
                this.config.obstacleSpawnX
                + this.obstacleGenerator.getTier(0).obstacleSpacing,
            );
        }
    }

    private resetToReady(): void {
        this.prepareRun();
        this.stateMachine.transition(GameState.Ready);
    }

    private spawnObstacle(positionX: number): void {
        const pool = this.obstaclePool;
        if (!pool) {
            return;
        }
        const pair = pool.acquire();
        const generated = this.obstacleGenerator.generate(
            this.runSession.score,
            this.obstacleSequence,
        );
        pair.configure(
            {
                obstacleId: generated.obstacleId,
                gapCenterY: generated.gapCenterY,
                gapSize: generated.gapSize,
                width: generated.width,
                topExtentY: this.config.designHeight / 2 + 40,
                bottomExtentY: -this.config.designHeight / 2 - 40,
                groundType: generated.groundType,
                skyType: generated.skyType,
                combinationId: generated.combinationId,
                tierId: generated.tierId,
                visualScale: generated.visualScale,
                groundAmplitude: generated.groundAmplitude ?? 0,
                skyAmplitude: generated.skyAmplitude ?? 0,
                motionPeriod: generated.motionPeriod ?? 2,
                motionPhase: generated.motionPhase ?? 0,
                lightningExtension: generated.lightningExtension ?? 0,
            },
            positionX,
        );
        this.obstacleSequence += 1;
        this.activeObstacles.push(pair);
    }

    private ensureObstacleSupply(): void {
        if (this.activeObstacles.length === 0) {
            this.spawnObstacle(this.config.obstacleSpawnX);
            return;
        }
        const rightmostX = Math.max(
            ...this.activeObstacles.map((obstacle) => obstacle.node.position.x),
        );
        if (rightmostX <= this.config.obstacleSpawnX) {
            const spacing = this.obstacleGenerator.getTier(
                this.runSession.score,
            ).obstacleSpacing;
            this.spawnObstacle(rightmostX + spacing);
        }
    }

    private clearTouches(): void {
        this.activeFlightTouchId = null;
        this.pauseTouchId = null;
    }

    private performFlap(): void {
        this.flightMotor.flap();
        this.flapCount += 1;
        this.playerView?.triggerFlap();
    }

    private refreshHud(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = String(this.runSession.score);
        }
        if (this.bestLabel) {
            this.bestLabel.string = `最高分 ${this.bestScore}`;
        }
        if (this.pauseButtonNode) {
            this.pauseButtonNode.active = this.stateMachine.state === GameState.Playing
                || this.stateMachine.state === GameState.Paused;
        }
        if (this.pauseLabel) {
            this.pauseLabel.string = this.stateMachine.state === GameState.Paused
                ? '▶ 继续'
                : 'Ⅱ 暂停';
        }
        if (this.resultPanel) {
            this.resultPanel.active = this.stateMachine.state === GameState.Result;
        }
        if (this.resultScoreLabel) {
            this.resultScoreLabel.string = `本局得分  ${this.runSession.score}`;
        }
        if (this.resultBestLabel) {
            this.resultBestLabel.string = `最高分  ${this.bestScore}`;
        }
        if (!this.titleLabel || !this.instructionLabel) {
            return;
        }

        switch (this.stateMachine.state) {
            case GameState.Ready:
                this.titleLabel.string = '八戒不会飞 · P4 正式素材版';
                this.instructionLabel.string = '点击起飞 · 连续点击保持高度';
                break;
            case GameState.Playing:
                this.titleLabel.string = '穿过通道获得分数';
                this.instructionLabel.string = '每次点击扑耳上升 · 停止点击自然下落';
                break;
            case GameState.Paused:
                this.titleLabel.string = '游戏已暂停';
                this.instructionLabel.string = '点击右上角继续';
                break;
            case GameState.Hit:
                this.titleLabel.string = '撞上了！';
                this.instructionLabel.string = '正在结算';
                break;
            case GameState.Result:
                this.titleLabel.string = '本局结束';
                this.instructionLabel.string = '';
                break;
            case GameState.Boot:
                this.titleLabel.string = '正在初始化';
                this.instructionLabel.string = '';
                break;
        }
    }

    private refreshDebugLabel(): void {
        if (!this.debugLabel) {
            return;
        }
        const snapshot = this.flightMotor.snapshot;
        const poolStats = this.obstaclePool?.stats;
        const tier = this.obstacleGenerator.getTier(this.runSession.score);
        this.debugLabel.string = [
            this.stateMachine.state,
            `y ${snapshot.positionY.toFixed(0)}`,
            `vy ${snapshot.velocityY.toFixed(0)}`,
            `flaps ${this.flapCount}`,
            `tier ${tier.id}`,
            `seed ${this.currentSeed.toString(16)}`,
            `pairs ${this.activeObstacles.length}`,
            `pool ${poolStats?.active ?? 0}/${poolStats?.created ?? 0}`,
        ].join(' · ');
    }
}

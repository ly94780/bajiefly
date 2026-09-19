import {
    _decorator,
    Camera,
    Canvas,
    Color,
    Component,
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
    UITransform,
    Vec3,
    view,
} from 'cc';
import { GameState } from '../app/GameState';
import { GameStateMachine } from '../app/GameStateMachine';
import { DEFAULT_FLIGHT_CONFIG } from '../config/FlightConfig';
import { FlightMotor } from '../gameplay/FlightMotor';
import { P0PlayerView } from '../gameplay/P0PlayerView';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 720;
const DESIGN_HEIGHT = 1280;

// P0 owns only input, vertical flight, state transitions, and debug presentation.
@ccclass('P0Bootstrap')
export class P0Bootstrap extends Component {
    private readonly stateMachine = new GameStateMachine();
    private readonly flightMotor = new FlightMotor(DEFAULT_FLIGHT_CONFIG);

    private playerNode: Node | null = null;
    private playerView: P0PlayerView | null = null;
    private stateLabel: Label | null = null;
    private debugLabel: Label | null = null;
    private instructionLabel: Label | null = null;

    private flapCount = 0;
    private elapsed = 0;
    private hitElapsed = 0;
    private unsubscribeState: (() => void) | null = null;

    protected override onLoad(): void {
        game.frameRate = 60;
        view.setDesignResolutionSize(
            DESIGN_WIDTH,
            DESIGN_HEIGHT,
            ResolutionPolicy.FIXED_HEIGHT,
        );
        view.resizeWithBrowserSize(true);

        this.buildGrayboxScene();
        this.bindInput();
        this.unsubscribeState = this.stateMachine.onChange(() => this.refreshHud());
        this.flightMotor.reset();
        this.stateMachine.transition(GameState.Ready);
        this.refreshHud();
    }

    protected override onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onPress, this);
        input.off(Input.EventType.TOUCH_END, this.onRelease, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onRelease, this);
        game.off(Game.EVENT_HIDE, this.onGameHide, this);
        game.off(Game.EVENT_SHOW, this.onGameShow, this);
        this.unsubscribeState?.();
    }

    protected override update(deltaTime: number): void {
        this.elapsed += deltaTime;

        switch (this.stateMachine.state) {
            case GameState.Ready:
                this.updateReadyPose();
                break;
            case GameState.Playing:
                this.updateFlight(deltaTime);
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
        canvasTransform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

        const cameraNode = new Node('UICamera');
        cameraNode.layer = Layers.Enum.UI_2D;
        cameraNode.setPosition(0, 0, 1000);
        canvasNode.addChild(cameraNode);
        const camera = cameraNode.addComponent(Camera);
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = DESIGN_HEIGHT / 2;
        camera.near = 1;
        camera.far = 2000;
        camera.clearColor = new Color(83, 166, 227, 255);
        camera.visibility = Layers.Enum.UI_2D;

        const canvas = canvasNode.addComponent(Canvas);
        canvas.cameraComponent = camera;

        this.createBackground(canvasNode);
        this.createBoundaries(canvasNode);
        this.createPlayer(canvasNode);
        this.createHud(canvasNode);
    }

    private createBackground(parent: Node): void {
        const node = this.createUiNode('GrayboxBackground', parent, DESIGN_WIDTH, DESIGN_HEIGHT);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(83, 166, 227, 255);
        graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        graphics.fill();

        graphics.fillColor = new Color(218, 240, 249, 255);
        graphics.circle(-260, -470, 150);
        graphics.circle(-40, -520, 190);
        graphics.circle(220, -490, 170);
        graphics.fill();

        graphics.strokeColor = new Color(255, 255, 255, 35);
        graphics.lineWidth = 2;
        for (let y = -400; y <= 400; y += 160) {
            graphics.moveTo(-DESIGN_WIDTH / 2, y);
            graphics.lineTo(DESIGN_WIDTH / 2, y);
        }
        graphics.stroke();
    }

    private createBoundaries(parent: Node): void {
        const node = this.createUiNode('FlightBoundaries', parent, DESIGN_WIDTH, DESIGN_HEIGHT);
        const graphics = node.addComponent(Graphics);
        graphics.strokeColor = new Color(255, 225, 150, 210);
        graphics.lineWidth = 5;
        graphics.moveTo(-DESIGN_WIDTH / 2, DEFAULT_FLIGHT_CONFIG.topBoundaryY);
        graphics.lineTo(DESIGN_WIDTH / 2, DEFAULT_FLIGHT_CONFIG.topBoundaryY);
        graphics.moveTo(-DESIGN_WIDTH / 2, DEFAULT_FLIGHT_CONFIG.bottomBoundaryY);
        graphics.lineTo(DESIGN_WIDTH / 2, DEFAULT_FLIGHT_CONFIG.bottomBoundaryY);
        graphics.stroke();
    }

    private createPlayer(parent: Node): void {
        const node = this.createUiNode('BajieGraybox', parent, 190, 150);
        node.setPosition(-150, DEFAULT_FLIGHT_CONFIG.startY, 0);
        this.playerView = node.addComponent(P0PlayerView);
        this.playerView.initialize();
        this.playerNode = node;
    }

    private createHud(parent: Node): void {
        const safeAreaNode = this.createUiNode(
            'SafeAreaHud',
            parent,
            DESIGN_WIDTH,
            DESIGN_HEIGHT,
        );
        safeAreaNode.addComponent(SafeArea).updateArea();

        this.stateLabel = this.createLabel(
            'StateLabel',
            safeAreaNode,
            new Vec3(0, 555, 0),
            34,
            new Color(255, 248, 225, 255),
        );
        this.instructionLabel = this.createLabel(
            'InstructionLabel',
            safeAreaNode,
            new Vec3(0, -380, 0),
            30,
            Color.WHITE,
        );
        this.debugLabel = this.createLabel(
            'DebugLabel',
            safeAreaNode,
            new Vec3(0, 455, 0),
            22,
            new Color(235, 247, 255, 255),
        );
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
    ): Label {
        const node = this.createUiNode(name, parent, 660, 120);
        node.setPosition(position);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.3);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private bindInput(): void {
        input.on(Input.EventType.TOUCH_START, this.onPress, this);
        input.on(Input.EventType.TOUCH_END, this.onRelease, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onRelease, this);
        game.on(Game.EVENT_HIDE, this.onGameHide, this);
        game.on(Game.EVENT_SHOW, this.onGameShow, this);
    }

    private readonly onPress = (): void => {
        switch (this.stateMachine.state) {
            case GameState.Ready:
                this.flightMotor.setPositionY(this.playerNode?.position.y ?? DEFAULT_FLIGHT_CONFIG.startY);
                this.stateMachine.transition(GameState.Playing);
                this.performFlap();
                break;
            case GameState.Playing:
                this.performFlap();
                break;
            case GameState.Paused:
                this.stateMachine.transition(GameState.Playing);
                break;
            case GameState.Result:
                this.resetToReady();
                break;
            case GameState.Boot:
            case GameState.Hit:
                break;
        }
    };

    private readonly onRelease = (): void => {
        // A flap is triggered only by TOUCH_START; release does not alter velocity.
    };

    private readonly onGameHide = (): void => {
        if (this.stateMachine.state === GameState.Playing) {
            this.stateMachine.transition(GameState.Paused);
        }
    };

    private readonly onGameShow = (): void => {
        // Stay paused. A deliberate tap is required before flight resumes.
    };

    private updateReadyPose(): void {
        if (!this.playerNode) {
            return;
        }
        const y = DEFAULT_FLIGHT_CONFIG.startY + Math.sin(this.elapsed * 2.4) * 9;
        this.playerNode.setPosition(-150, y, 0);
        this.playerNode.setRotationFromEuler(0, 0, Math.sin(this.elapsed * 2.4) * 2);
    }

    private updateFlight(deltaTime: number): void {
        const node = this.playerNode;
        if (!node) {
            return;
        }

        const snapshot = this.flightMotor.step(deltaTime);
        node.setPosition(-150, snapshot.positionY, 0);
        node.setRotationFromEuler(0, 0, snapshot.rotationZ);

        const radius = DEFAULT_FLIGHT_CONFIG.collisionRadius;
        if (
            snapshot.positionY + radius >= DEFAULT_FLIGHT_CONFIG.topBoundaryY
            || snapshot.positionY - radius <= DEFAULT_FLIGHT_CONFIG.bottomBoundaryY
        ) {
            this.hitElapsed = 0;
            this.playerView?.setHitState(true);
            this.stateMachine.transition(GameState.Hit);
        }
    }

    private updateHit(deltaTime: number): void {
        this.hitElapsed += deltaTime;
        if (this.playerNode) {
            const direction = Math.floor(this.hitElapsed * 30) % 2 === 0 ? -1 : 1;
            this.playerNode.setPosition(
                -150 + direction * 6,
                this.playerNode.position.y,
                0,
            );
        }
        if (this.hitElapsed >= 0.45) {
            this.stateMachine.transition(GameState.Result);
        }
    }

    private resetToReady(): void {
        this.flapCount = 0;
        this.hitElapsed = 0;
        this.flightMotor.reset();
        this.playerView?.setHitState(false);
        this.playerNode?.setPosition(-150, DEFAULT_FLIGHT_CONFIG.startY, 0);
        this.playerNode?.setRotationFromEuler(0, 0, 0);
        this.stateMachine.transition(GameState.Ready);
    }

    private refreshHud(): void {
        if (this.stateLabel) {
            this.stateLabel.string = `P0 FLIGHT GRAYBOX · ${this.stateMachine.state}`;
        }
        if (!this.instructionLabel) {
            return;
        }

        switch (this.stateMachine.state) {
            case GameState.Ready:
                this.instructionLabel.string = '点击起飞 · 连续点击保持高度';
                break;
            case GameState.Playing:
                this.instructionLabel.string = '点击扑耳上升 · 停止点击自然下落';
                break;
            case GameState.Paused:
                this.instructionLabel.string = '游戏已暂停 · 点击屏幕继续';
                break;
            case GameState.Hit:
                this.instructionLabel.string = '撞到飞行边界';
                break;
            case GameState.Result:
                this.instructionLabel.string = '点击屏幕重新准备';
                break;
            case GameState.Boot:
                this.instructionLabel.string = '正在初始化';
                break;
        }
    }

    private refreshDebugLabel(): void {
        if (!this.debugLabel) {
            return;
        }
        const snapshot = this.flightMotor.snapshot;
        this.debugLabel.string = [
            `y: ${snapshot.positionY.toFixed(1)}`,
            `vy: ${snapshot.velocityY.toFixed(1)}`,
            `angle: ${snapshot.rotationZ.toFixed(1)}°`,
            `flaps: ${this.flapCount}`,
        ].join('   ');
    }

    private performFlap(): void {
        this.flightMotor.flap();
        this.flapCount += 1;
        this.playerView?.triggerFlap();
    }
}

import { _decorator, Color, Component, Graphics, Node, Sprite, UITransform } from 'cc';
import type { P4ArtAssets } from '../art/P4ArtAssets';
import { GroundObstacleType, SkyObstacleType } from '../obstacles/ObstacleTypes';

const { ccclass } = _decorator;

export interface ObstaclePairLayout {
    readonly obstacleId: number;
    readonly gapCenterY: number;
    readonly gapSize: number;
    readonly width: number;
    readonly topExtentY: number;
    readonly bottomExtentY: number;
    readonly groundType: GroundObstacleType;
    readonly skyType: SkyObstacleType;
    readonly combinationId: string;
    readonly tierId: string;
    readonly visualScale: number;
    readonly groundAmplitude: number;
    readonly skyAmplitude: number;
    readonly motionPeriod: number;
    readonly motionPhase: number;
    readonly lightningExtension: number;
}

@ccclass('GrayboxObstaclePair')
export class GrayboxObstaclePair extends Component {
    private art: P4ArtAssets | null = null;
    private groundSprite: Sprite | null = null;
    private cloudSprite: Sprite | null = null;
    private skyHazardSprite: Sprite | null = null;
    private obstacleIdValue = -1;
    private gapCenterYValue = 0;
    private gapSizeValue = 0;
    private widthValue = 0;
    private topExtentYValue = 0;
    private bottomExtentYValue = 0;
    private groundTypeValue = GroundObstacleType.Mountain;
    private skyTypeValue = SkyObstacleType.StormCloud;
    private combinationIdValue = '';
    private tierIdValue = '';
    private visualScaleValue = 1;
    private groundAmplitudeValue = 0;
    private skyAmplitudeValue = 0;
    private motionPeriodValue = 2;
    private motionPhaseValue = 0;
    private behaviorElapsed = 0;
    private groundOffset = 0;
    private skyOffset = 0;
    private lightningState: 'sleep' | 'warning' | 'active' | 'cooldown' = 'sleep';
    private lightningExtensionValue = 0;

    public get obstacleId(): number {
        return this.obstacleIdValue;
    }

    public get leftX(): number {
        return this.node.position.x - this.widthValue / 2;
    }

    public get rightX(): number {
        return this.node.position.x + this.widthValue / 2;
    }

    public get combinationId(): string {
        return this.combinationIdValue;
    }

    public get tierId(): string {
        return this.tierIdValue;
    }

    public applyArtAssets(art: P4ArtAssets): void {
        this.art = art;
        const graphics = this.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.enabled = false;
        }
        this.groundSprite = this.groundSprite ?? this.createSpriteNode('GroundObstacleArt');
        this.cloudSprite = this.cloudSprite ?? this.createSpriteNode('SkyCloudArt');
        this.skyHazardSprite = this.skyHazardSprite ?? this.createSpriteNode('SkyHazardArt');
        this.refreshArt();
    }

    public configure(layout: ObstaclePairLayout, positionX: number): void {
        this.obstacleIdValue = layout.obstacleId;
        this.gapCenterYValue = layout.gapCenterY;
        this.gapSizeValue = layout.gapSize;
        this.widthValue = layout.width;
        this.topExtentYValue = layout.topExtentY;
        this.bottomExtentYValue = layout.bottomExtentY;
        this.groundTypeValue = layout.groundType;
        this.skyTypeValue = layout.skyType;
        this.combinationIdValue = layout.combinationId;
        this.tierIdValue = layout.tierId;
        this.visualScaleValue = layout.visualScale;
        this.groundAmplitudeValue = layout.groundAmplitude;
        this.skyAmplitudeValue = layout.skyAmplitude;
        this.motionPeriodValue = Math.max(0.1, layout.motionPeriod);
        this.motionPhaseValue = layout.motionPhase;
        this.lightningExtensionValue = layout.lightningExtension;
        this.behaviorElapsed = 0;
        this.groundOffset = 0;
        this.skyOffset = 0;
        this.lightningState = 'sleep';
        this.node.setPosition(positionX, 0, 0);

        let transform = this.getComponent(UITransform);
        if (!transform) {
            transform = this.addComponent(UITransform);
        }
        transform!.setContentSize(
            this.widthValue + 20,
            this.topExtentYValue - this.bottomExtentYValue,
        );

        const graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        if (this.art) {
            graphics.enabled = false;
            this.refreshArt();
        } else {
            this.draw(graphics);
        }
    }

    public moveLeft(distance: number): void {
        this.node.setPosition(this.node.position.x - distance, 0, 0);
    }

    public updateBehavior(deltaTime: number): void {
        this.behaviorElapsed += deltaTime;
        const angle = this.motionPhaseValue
            + this.behaviorElapsed * Math.PI * 2 / this.motionPeriodValue;
        this.groundOffset = Math.sin(angle) * this.groundAmplitudeValue;
        this.skyOffset = Math.sin(angle + Math.PI) * this.skyAmplitudeValue;
        if (this.skyTypeValue === SkyObstacleType.Lightning) {
            const cycle = this.behaviorElapsed % 3;
            this.lightningState = cycle < 1
                ? 'sleep'
                : cycle < 1.75
                    ? 'warning'
                    : cycle < 2.2
                        ? 'active'
                        : 'cooldown';
        }
        if (this.art) {
            this.refreshArt();
            return;
        }
        const graphics = this.getComponent(Graphics);
        if (graphics && (
            this.groundTypeValue === GroundObstacleType.Fireball
            || this.skyTypeValue !== SkyObstacleType.StormCloud
        )) {
            this.draw(graphics);
        }
    }

    public intersectsCircle(centerX: number, centerY: number, radius: number): boolean {
        if (centerX + radius < this.leftX || centerX - radius > this.rightX) {
            return false;
        }

        const halfGap = this.gapSizeValue / 2;
        const gapBottom = this.gapCenterYValue - halfGap + this.groundOffset;
        const gapTop = this.gapCenterYValue + halfGap + this.skyOffset
            - (this.lightningState === 'active' ? this.lightningExtensionValue : 0);
        return centerY - radius < gapBottom || centerY + radius > gapTop;
    }

    public resetForPool(): void {
        this.obstacleIdValue = -1;
        this.combinationIdValue = '';
        this.tierIdValue = '';
        this.behaviorElapsed = 0;
        this.groundOffset = 0;
        this.skyOffset = 0;
        this.node.setPosition(0, 0, 0);
    }

    private createSpriteNode(name: string): Sprite {
        const node = new Node(name);
        node.layer = this.node.layer;
        this.node.addChild(node);
        node.addComponent(UITransform);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return sprite;
    }

    private refreshArt(): void {
        const art = this.art;
        const ground = this.groundSprite;
        const cloud = this.cloudSprite;
        const hazard = this.skyHazardSprite;
        if (!art || !ground || !cloud || !hazard || this.obstacleIdValue < 0) return;

        const halfGap = this.gapSizeValue / 2;
        const gapBottom = this.gapCenterYValue - halfGap + this.groundOffset;
        const gapTop = this.gapCenterYValue + halfGap + this.skyOffset;
        const groundHeight = Math.max(110, gapBottom - this.bottomExtentYValue + 55);
        const groundWidth = this.widthValue * (this.groundTypeValue === GroundObstacleType.Fireball ? 0.82 : 1.22);
        const groundTransform = ground.getComponent(UITransform)!;

        if (this.groundTypeValue === GroundObstacleType.Fireball) {
            ground.spriteFrame = art.fireball;
            groundTransform.setContentSize(groundWidth, groundWidth);
            ground.node.setPosition(0, gapBottom - groundWidth * 0.5, 0);
            ground.node.angle = Math.sin(this.behaviorElapsed * 4) * 8;
        } else {
            ground.spriteFrame = this.groundTypeValue === GroundObstacleType.StonePillar
                ? art.stonePillar
                : art.mountain;
            groundTransform.setContentSize(groundWidth, groundHeight);
            ground.node.setPosition(0, this.bottomExtentYValue + groundHeight * 0.5, 0);
            ground.node.angle = 0;
        }

        const cloudWidth = this.widthValue * 1.35;
        const cloudHeight = cloudWidth * 0.68;
        cloud.spriteFrame = art.stormCloud;
        cloud.getComponent(UITransform)!.setContentSize(cloudWidth, cloudHeight);
        cloud.node.setPosition(0, gapTop + cloudHeight * 0.34, 0);
        cloud.node.active = this.skyTypeValue !== SkyObstacleType.WindFireWheel;

        hazard.node.active = this.skyTypeValue !== SkyObstacleType.StormCloud;
        if (this.skyTypeValue === SkyObstacleType.WindFireWheel) {
            const size = this.widthValue * 0.9;
            hazard.spriteFrame = art.windFireWheel;
            hazard.getComponent(UITransform)!.setContentSize(size, size);
            hazard.node.setPosition(0, gapTop + size * 0.5, 0);
            hazard.node.angle = -this.behaviorElapsed * 150;
            hazard.color = Color.WHITE;
        } else if (this.skyTypeValue === SkyObstacleType.Lightning) {
            const active = this.lightningState === 'active';
            const visible = this.lightningState === 'warning' || active;
            const width = this.widthValue * (active ? 0.7 : 0.54);
            const height = Math.max(135, this.lightningExtensionValue + 105);
            hazard.spriteFrame = art.lightning;
            hazard.getComponent(UITransform)!.setContentSize(width, height);
            hazard.node.setPosition(0, gapTop - height * 0.36, 1);
            hazard.node.angle = 0;
            hazard.color = new Color(255, 255, 255, visible ? (active ? 255 : 115) : 0);
        }
    }

    private draw(graphics: Graphics): void {
        graphics.clear();

        const halfWidth = this.widthValue / 2;
        const halfGap = this.gapSizeValue / 2;
        const gapBottom = this.gapCenterYValue - halfGap + this.groundOffset;
        const gapTop = this.gapCenterYValue + halfGap + this.skyOffset;
        this.drawGround(graphics, halfWidth, gapBottom);
        this.drawSky(graphics, halfWidth, gapTop);

        graphics.strokeColor = new Color(255, 241, 194, 180);
        graphics.lineWidth = 3;
        graphics.moveTo(-halfWidth, gapBottom);
        graphics.lineTo(halfWidth, gapBottom);
        graphics.moveTo(-halfWidth, gapTop);
        graphics.lineTo(halfWidth, gapTop);
        graphics.stroke();
    }

    private drawGround(graphics: Graphics, halfWidth: number, gapBottom: number): void {
        if (this.groundTypeValue === GroundObstacleType.Fireball) {
            const radius = halfWidth * 0.45;
            const centerY = gapBottom - radius;
            graphics.fillColor = new Color(219, 70, 42, 210);
            graphics.moveTo(0, centerY + radius * 1.55);
            graphics.lineTo(-radius * 0.72, centerY + radius * 0.45);
            graphics.lineTo(radius * 0.72, centerY + radius * 0.45);
            graphics.close();
            graphics.fill();
            graphics.fillColor = new Color(241, 101, 46, 255);
            graphics.circle(0, centerY, radius);
            graphics.fill();
            graphics.fillColor = new Color(255, 211, 77, 255);
            graphics.circle(-radius * 0.16, centerY + radius * 0.12, radius * 0.55);
            graphics.fill();
            return;
        }
        if (this.groundTypeValue === GroundObstacleType.StonePillar) {
            graphics.fillColor = new Color(123, 116, 105, 255);
            graphics.rect(-halfWidth * 0.72, this.bottomExtentYValue, halfWidth * 1.44, gapBottom - this.bottomExtentYValue);
            graphics.fill();
            graphics.fillColor = new Color(157, 146, 127, 255);
            graphics.roundRect(-halfWidth, gapBottom - 34, this.widthValue, 34, 8);
            graphics.fill();
            graphics.strokeColor = new Color(82, 77, 72, 210);
            graphics.lineWidth = 4;
            graphics.moveTo(-halfWidth * 0.4, gapBottom - 95);
            graphics.lineTo(halfWidth * 0.15, gapBottom - 145);
            graphics.lineTo(-halfWidth * 0.05, gapBottom - 205);
            graphics.stroke();
            return;
        }

        graphics.fillColor = new Color(105, 104, 91, 255);
        graphics.moveTo(-halfWidth, this.bottomExtentYValue);
        graphics.lineTo(-halfWidth, gapBottom - 70 * this.visualScaleValue);
        graphics.lineTo(-halfWidth * 0.42, gapBottom - 25 * this.visualScaleValue);
        graphics.lineTo(0, gapBottom);
        graphics.lineTo(halfWidth * 0.38, gapBottom - 48 * this.visualScaleValue);
        graphics.lineTo(halfWidth, gapBottom - 88 * this.visualScaleValue);
        graphics.lineTo(halfWidth, this.bottomExtentYValue);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(113, 142, 81, 255);
        graphics.moveTo(-halfWidth * 0.42, gapBottom - 25 * this.visualScaleValue);
        graphics.lineTo(0, gapBottom);
        graphics.lineTo(halfWidth * 0.38, gapBottom - 48 * this.visualScaleValue);
        graphics.lineTo(halfWidth * 0.1, gapBottom - 62 * this.visualScaleValue);
        graphics.close();
        graphics.fill();
    }

    private drawSky(graphics: Graphics, halfWidth: number, gapTop: number): void {
        if (this.skyTypeValue === SkyObstacleType.WindFireWheel) {
            const radius = halfWidth * 0.48;
            const centerY = gapTop + radius;
            graphics.strokeColor = new Color(255, 190, 58, 255);
            graphics.lineWidth = 14;
            graphics.circle(0, centerY, radius * 0.72);
            graphics.stroke();
            graphics.strokeColor = new Color(220, 68, 35, 255);
            graphics.lineWidth = 9;
            for (let index = 0; index < 4; index += 1) {
                const angle = this.behaviorElapsed * 5 + index * Math.PI / 2;
                graphics.moveTo(0, centerY);
                graphics.lineTo(Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            }
            graphics.stroke();
            graphics.fillColor = new Color(255, 221, 88, 255);
            graphics.circle(0, centerY, radius * 0.22);
            graphics.fill();
            return;
        }

        graphics.fillColor = new Color(69, 77, 99, 220);
        graphics.rect(-halfWidth * 0.82, gapTop + 36, halfWidth * 1.64, this.topExtentYValue - gapTop - 36);
        graphics.fill();
        graphics.fillColor = new Color(82, 92, 119, 255);
        graphics.circle(-halfWidth * 0.48, gapTop + 36, halfWidth * 0.48);
        graphics.circle(0, gapTop + 48, halfWidth * 0.62);
        graphics.circle(halfWidth * 0.48, gapTop + 34, halfWidth * 0.5);
        graphics.fill();
        graphics.fillColor = new Color(112, 124, 151, 180);
        graphics.ellipse(-halfWidth * 0.18, gapTop + 60, halfWidth * 0.36, halfWidth * 0.16);
        graphics.fill();

        if (this.skyTypeValue === SkyObstacleType.Lightning && this.lightningState !== 'sleep') {
            graphics.strokeColor = this.lightningState === 'active'
                ? new Color(228, 246, 255, 255)
                : new Color(164, 204, 238, 150);
            graphics.lineWidth = this.lightningState === 'active' ? 12 : 6;
            graphics.moveTo(-12, gapTop + 42);
            graphics.lineTo(15, gapTop + 12);
            graphics.lineTo(-5, gapTop - 34);
            graphics.lineTo(20, gapTop - 72);
            graphics.stroke();
        }
    }
}

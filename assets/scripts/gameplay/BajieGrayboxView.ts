import {
    _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UITransform,
} from 'cc';
import type { P4ArtAssets } from '../art/P4ArtAssets';

const { ccclass } = _decorator;
type BajiePose = 'idle' | 'flyUp' | 'fall' | 'hit' | 'result';

@ccclass('BajieGrayboxView')
export class BajieGrayboxView extends Component {
    private graphics: Graphics | null = null;
    private sprite: Sprite | null = null;
    private airflowSprite: Sprite | null = null;
    private collisionSprite: Sprite | null = null;
    private art: P4ArtAssets | null = null;
    private pose: BajiePose = 'idle';
    private flapTimeRemaining = 0;
    private effectTimeRemaining = 0;

    public initialize(): void {
        const transform = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        transform.setContentSize(190, 150);
        this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        this.drawFallback();
    }

    public applyArtAssets(art: P4ArtAssets): void {
        this.art = art;
        this.graphics?.clear();
        if (this.graphics) this.graphics.enabled = false;
        this.sprite = this.sprite ?? this.createSpriteNode('BajieSprite', 184, 184);
        this.airflowSprite = this.airflowSprite ?? this.createSpriteNode('AirflowVfx', 190, 126);
        this.airflowSprite.node.setPosition(-68, -6, -1);
        this.airflowSprite.node.active = false;
        this.collisionSprite = this.collisionSprite
            ?? this.createSpriteNode('CollisionVfx', 230, 180);
        this.collisionSprite.node.active = false;
        this.airflowSprite.spriteFrame = art.airflow;
        this.collisionSprite.spriteFrame = art.collisionCloud;
        this.sprite.node.setScale(-1, 1, 1);
        this.refreshSpriteFrame();
    }

    public setFlightVelocity(velocityY: number): void {
        if (this.pose === 'hit' || this.pose === 'result' || this.flapTimeRemaining > 0) return;
        this.setPose(velocityY < -80 ? 'fall' : 'idle');
    }

    public setHitState(hit: boolean): void {
        this.flapTimeRemaining = 0;
        this.effectTimeRemaining = hit ? 0.32 : 0;
        this.setPose(hit ? 'hit' : 'idle');
        if (this.collisionSprite) {
            this.collisionSprite.node.active = hit;
            this.collisionSprite.color = new Color(255, 255, 255, 245);
        }
        if (this.airflowSprite) this.airflowSprite.node.active = false;
        if (!this.art) this.drawFallback();
    }

    public setResultState(): void {
        this.setPose('result');
    }

    public triggerFlap(): void {
        if (this.pose === 'hit' || this.pose === 'result') return;
        this.flapTimeRemaining = 0.16;
        this.effectTimeRemaining = 0.16;
        this.setPose('flyUp');
        if (this.airflowSprite) {
            this.airflowSprite.node.active = true;
            this.airflowSprite.color = Color.WHITE;
        }
        if (!this.art) this.drawFallback();
    }

    protected override update(deltaTime: number): void {
        if (this.flapTimeRemaining > 0) {
            this.flapTimeRemaining = Math.max(0, this.flapTimeRemaining - deltaTime);
            const pulse = 1 + Math.sin(this.flapTimeRemaining * 35) * 0.035;
            this.sprite?.node.setScale(-pulse, 2 - pulse, 1);
            if (this.flapTimeRemaining === 0) this.sprite?.node.setScale(-1, 1, 1);
        }
        if (this.effectTimeRemaining <= 0) return;
        this.effectTimeRemaining = Math.max(0, this.effectTimeRemaining - deltaTime);
        const alpha = Math.round(255 * this.effectTimeRemaining / 0.32);
        if (this.airflowSprite?.node.active) {
            this.airflowSprite.color = new Color(255, 255, 255, alpha);
        }
        if (this.collisionSprite?.node.active) {
            this.collisionSprite.color = new Color(255, 255, 255, alpha);
        }
        if (this.effectTimeRemaining === 0) {
            if (this.airflowSprite) this.airflowSprite.node.active = false;
            if (this.collisionSprite) this.collisionSprite.node.active = false;
        }
    }

    private createSpriteNode(name: string, width: number, height: number): Sprite {
        const node = new Node(name);
        node.layer = this.node.layer;
        this.node.addChild(node);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return sprite;
    }

    private setPose(pose: BajiePose): void {
        if (this.pose === pose) return;
        this.pose = pose;
        this.refreshSpriteFrame();
    }

    private refreshSpriteFrame(): void {
        if (!this.art || !this.sprite) return;
        const frames: Record<BajiePose, SpriteFrame> = {
            idle: this.art.bajieIdle,
            flyUp: this.art.bajieFlyUp,
            fall: this.art.bajieFall,
            hit: this.art.bajieHit,
            result: this.art.bajieResult,
        };
        this.sprite.spriteFrame = frames[this.pose];
    }

    private drawFallback(): void {
        const graphics = this.graphics;
        if (!graphics) return;
        graphics.clear();
        const flapping = this.flapTimeRemaining > 0;
        const hit = this.pose === 'hit';
        graphics.fillColor = new Color(246, 166, 157, 255);
        graphics.ellipse(-65, flapping ? 2 : 14, 58, hit ? 26 : flapping ? 24 : 38);
        graphics.ellipse(65, flapping ? 2 : 14, 58, hit ? 26 : flapping ? 24 : 38);
        graphics.fill();
        graphics.fillColor = new Color(244, 154, 139, 255);
        graphics.ellipse(0, 0, 55, 60);
        graphics.fill();
    }
}

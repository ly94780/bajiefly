import type { FlightConfig } from '../config/FlightConfig';

export interface FlightSnapshot {
    readonly positionY: number;
    readonly velocityY: number;
    readonly rotationZ: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
}

export class FlightMotor {
    private positionYValue = 0;
    private velocityYValue = 0;
    private rotationZValue = 0;

    public constructor(private readonly config: FlightConfig) {}

    public get snapshot(): FlightSnapshot {
        return {
            positionY: this.positionYValue,
            velocityY: this.velocityYValue,
            rotationZ: this.rotationZValue,
        };
    }

    public reset(positionY = this.config.startY): void {
        this.positionYValue = positionY;
        this.velocityYValue = 0;
        this.rotationZValue = 0;
    }

    public setPositionY(positionY: number): void {
        this.positionYValue = positionY;
    }

    public flap(): FlightSnapshot {
        this.velocityYValue = clamp(
            this.config.flapVelocity,
            this.config.maxFallSpeed,
            this.config.maxRiseSpeed,
        );
        return this.snapshot;
    }

    public step(deltaTime: number): FlightSnapshot {
        let remaining = Math.min(Math.max(deltaTime, 0), this.config.maxFrameDelta);

        while (remaining > 0) {
            const step = Math.min(remaining, this.config.fixedStep);

            this.velocityYValue = clamp(
                this.velocityYValue + this.config.gravity * step,
                this.config.maxFallSpeed,
                this.config.maxRiseSpeed,
            );
            this.positionYValue += this.velocityYValue * step;
            remaining -= step;
        }

        const targetRotation = this.calculateTargetRotation();
        const blend = 1 - Math.exp(-this.config.rotationResponsiveness * deltaTime);
        this.rotationZValue += (targetRotation - this.rotationZValue) * blend;

        return this.snapshot;
    }

    private calculateTargetRotation(): number {
        if (this.velocityYValue >= 0) {
            const ratio = clamp(this.velocityYValue / this.config.maxRiseSpeed, 0, 1);
            return this.config.riseRotation * ratio;
        }

        const ratio = clamp(this.velocityYValue / this.config.maxFallSpeed, 0, 1);
        return this.config.fallRotation * ratio;
    }
}

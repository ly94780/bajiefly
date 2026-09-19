export interface FlightConfig {
    readonly gravity: number;
    readonly flapVelocity: number;
    readonly maxRiseSpeed: number;
    readonly maxFallSpeed: number;
    readonly riseRotation: number;
    readonly fallRotation: number;
    readonly rotationResponsiveness: number;
    readonly fixedStep: number;
    readonly maxFrameDelta: number;
    readonly startY: number;
    readonly topBoundaryY: number;
    readonly bottomBoundaryY: number;
    readonly collisionRadius: number;
}

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = Object.freeze({
    gravity: -1450,
    flapVelocity: 430,
    maxRiseSpeed: 430,
    maxFallSpeed: -650,
    riseRotation: -18,
    fallRotation: 65,
    rotationResponsiveness: 9,
    fixedStep: 1 / 120,
    maxFrameDelta: 1 / 20,
    startY: 70,
    topBoundaryY: 500,
    bottomBoundaryY: -540,
    collisionRadius: 46,
});

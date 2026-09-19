import { GroundObstacleType, SkyObstacleType, type ObstacleCombination } from '../obstacles/ObstacleTypes';

export interface P3DifficultyTier {
    readonly id: string;
    readonly minimumScore: number;
    readonly worldSpeed: number;
    readonly safeGapSize: number;
    readonly obstacleSpacing: number;
    readonly maxCenterStep: number;
    readonly dynamicWeight: number;
    readonly doubleDynamicEnabled: boolean;
}

export interface P3ObstacleConfig {
    readonly minimumSafeGap: number;
    readonly minimumGapCenterY: number;
    readonly maximumGapCenterY: number;
    readonly validationRetries: number;
    readonly maximumConsecutiveDynamic: number;
    readonly combinations: readonly ObstacleCombination[];
    readonly tiers: readonly P3DifficultyTier[];
    readonly fireballAmplitude: number;
    readonly windFireWheelAmplitude: number;
    readonly fireballPeriod: number;
    readonly windFireWheelPeriod: number;
    readonly lightningExtension: number;
}

export const DEFAULT_P3_OBSTACLE_CONFIG: P3ObstacleConfig = Object.freeze({
    minimumSafeGap: 300,
    minimumGapCenterY: -210,
    maximumGapCenterY: 210,
    validationRetries: 8,
    maximumConsecutiveDynamic: 2,
    fireballAmplitude: 28,
    windFireWheelAmplitude: 24,
    fireballPeriod: 1.8,
    windFireWheelPeriod: 2.1,
    lightningExtension: 72,
    tiers: Object.freeze([
        Object.freeze({ id: 'tutorial', minimumScore: 0, worldSpeed: 200, safeGapSize: 400, obstacleSpacing: 500, maxCenterStep: 150, dynamicWeight: 0, doubleDynamicEnabled: false }),
        Object.freeze({ id: 'easy', minimumScore: 3, worldSpeed: 220, safeGapSize: 380, obstacleSpacing: 480, maxCenterStep: 170, dynamicWeight: 0.2, doubleDynamicEnabled: false }),
        Object.freeze({ id: 'normal', minimumScore: 10, worldSpeed: 240, safeGapSize: 360, obstacleSpacing: 460, maxCenterStep: 190, dynamicWeight: 0.4, doubleDynamicEnabled: true }),
        Object.freeze({ id: 'hard', minimumScore: 25, worldSpeed: 265, safeGapSize: 335, obstacleSpacing: 440, maxCenterStep: 205, dynamicWeight: 0.55, doubleDynamicEnabled: true }),
        Object.freeze({ id: 'endless', minimumScore: 50, worldSpeed: 285, safeGapSize: 315, obstacleSpacing: 430, maxCenterStep: 210, dynamicWeight: 0.65, doubleDynamicEnabled: true }),
    ]),
    combinations: Object.freeze([
        Object.freeze({ id: 'storm_cloud_mountain', groundType: GroundObstacleType.Mountain, skyType: SkyObstacleType.StormCloud, weight: 25, minimumScore: 0 }),
        Object.freeze({ id: 'storm_cloud_stone_pillar', groundType: GroundObstacleType.StonePillar, skyType: SkyObstacleType.StormCloud, weight: 25, minimumScore: 0 }),
        Object.freeze({ id: 'storm_cloud_fireball', groundType: GroundObstacleType.Fireball, skyType: SkyObstacleType.StormCloud, weight: 10, minimumScore: 3 }),
        Object.freeze({ id: 'lightning_mountain', groundType: GroundObstacleType.Mountain, skyType: SkyObstacleType.Lightning, weight: 10, minimumScore: 3 }),
        Object.freeze({ id: 'lightning_stone_pillar', groundType: GroundObstacleType.StonePillar, skyType: SkyObstacleType.Lightning, weight: 10, minimumScore: 3 }),
        Object.freeze({ id: 'lightning_fireball', groundType: GroundObstacleType.Fireball, skyType: SkyObstacleType.Lightning, weight: 5, minimumScore: 10 }),
        Object.freeze({ id: 'wind_fire_wheel_mountain', groundType: GroundObstacleType.Mountain, skyType: SkyObstacleType.WindFireWheel, weight: 10, minimumScore: 3 }),
        Object.freeze({ id: 'wind_fire_wheel_stone_pillar', groundType: GroundObstacleType.StonePillar, skyType: SkyObstacleType.WindFireWheel, weight: 10, minimumScore: 3 }),
        Object.freeze({ id: 'wind_fire_wheel_fireball', groundType: GroundObstacleType.Fireball, skyType: SkyObstacleType.WindFireWheel, weight: 5, minimumScore: 10 }),
    ]),
});

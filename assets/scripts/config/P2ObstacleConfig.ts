import {
    GroundObstacleType,
    SkyObstacleType,
    type StaticObstacleCombination,
} from '../obstacles/ObstacleTypes';

export interface P2DifficultyTier {
    readonly id: string;
    readonly minimumScore: number;
    readonly worldSpeed: number;
    readonly gapSize: number;
    readonly obstacleSpacing: number;
    readonly maxCenterStep: number;
}

export interface P2ObstacleConfig {
    readonly minimumGapSize: number;
    readonly minimumGapCenterY: number;
    readonly maximumGapCenterY: number;
    readonly validationRetries: number;
    readonly minimumVisualScale: number;
    readonly maximumVisualScale: number;
    readonly mountainWidth: number;
    readonly stonePillarWidth: number;
    readonly tiers: readonly P2DifficultyTier[];
    readonly combinations: readonly StaticObstacleCombination[];
}

export const DEFAULT_P2_OBSTACLE_CONFIG: P2ObstacleConfig = Object.freeze({
    minimumGapSize: 300,
    minimumGapCenterY: -210,
    maximumGapCenterY: 210,
    validationRetries: 8,
    minimumVisualScale: 0.9,
    maximumVisualScale: 1.1,
    mountainWidth: 170,
    stonePillarWidth: 140,
    tiers: Object.freeze([
        Object.freeze({ id: 'tutorial', minimumScore: 0, worldSpeed: 200, gapSize: 400, obstacleSpacing: 500, maxCenterStep: 150 }),
        Object.freeze({ id: 'easy', minimumScore: 3, worldSpeed: 220, gapSize: 380, obstacleSpacing: 480, maxCenterStep: 170 }),
        Object.freeze({ id: 'normal', minimumScore: 10, worldSpeed: 240, gapSize: 360, obstacleSpacing: 460, maxCenterStep: 190 }),
        Object.freeze({ id: 'hard', minimumScore: 25, worldSpeed: 265, gapSize: 335, obstacleSpacing: 440, maxCenterStep: 205 }),
        Object.freeze({ id: 'endless', minimumScore: 50, worldSpeed: 285, gapSize: 315, obstacleSpacing: 430, maxCenterStep: 210 }),
    ]),
    combinations: Object.freeze([
        Object.freeze({
            id: 'storm_cloud_mountain',
            groundType: GroundObstacleType.Mountain,
            skyType: SkyObstacleType.StormCloud,
            weight: 55,
        }),
        Object.freeze({
            id: 'storm_cloud_stone_pillar',
            groundType: GroundObstacleType.StonePillar,
            skyType: SkyObstacleType.StormCloud,
            weight: 45,
        }),
    ]),
});

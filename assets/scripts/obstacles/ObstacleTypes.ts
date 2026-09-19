export enum GroundObstacleType {
    Mountain = 'mountain',
    StonePillar = 'stone_pillar',
    Fireball = 'fireball',
}

export enum SkyObstacleType {
    StormCloud = 'storm_cloud',
    Lightning = 'lightning',
    WindFireWheel = 'wind_fire_wheel',
}

export type ObstacleCombinationId =
    | 'storm_cloud_mountain'
    | 'storm_cloud_stone_pillar'
    | 'storm_cloud_fireball'
    | 'lightning_mountain'
    | 'lightning_stone_pillar'
    | 'lightning_fireball'
    | 'wind_fire_wheel_mountain'
    | 'wind_fire_wheel_stone_pillar'
    | 'wind_fire_wheel_fireball';

export type StaticCombinationId = 'storm_cloud_mountain' | 'storm_cloud_stone_pillar';

export interface StaticObstacleCombination {
    readonly id: ObstacleCombinationId;
    readonly groundType: GroundObstacleType;
    readonly skyType: SkyObstacleType;
    readonly weight: number;
}

export interface ObstacleCombination extends StaticObstacleCombination {
    readonly minimumScore: number;
}

export interface GeneratedObstaclePair {
    readonly obstacleId: number;
    readonly combinationId: ObstacleCombinationId;
    readonly groundType: GroundObstacleType;
    readonly skyType: SkyObstacleType;
    readonly tierId: string;
    readonly gapCenterY: number;
    readonly gapSize: number;
    readonly width: number;
    readonly visualScale: number;
    readonly usedFallback: boolean;
    readonly groundAmplitude?: number;
    readonly skyAmplitude?: number;
    readonly motionPeriod?: number;
    readonly motionPhase?: number;
    readonly lightningExtension?: number;
}

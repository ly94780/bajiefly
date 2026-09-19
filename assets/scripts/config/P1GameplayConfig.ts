export interface P1GameplayConfig {
    readonly designWidth: number;
    readonly designHeight: number;
    readonly playerX: number;
    readonly obstacleSpawnX: number;
    readonly obstacleDespawnX: number;
    readonly obstacleSpacing: number;
    readonly obstacleWidth: number;
    readonly obstacleGapSize: number;
    readonly minimumGapCenterY: number;
    readonly maximumGapCenterY: number;
    readonly scrollSpeed: number;
    readonly hitDuration: number;
}

export const DEFAULT_P1_GAMEPLAY_CONFIG: P1GameplayConfig = Object.freeze({
    designWidth: 720,
    designHeight: 1280,
    playerX: -150,
    obstacleSpawnX: 500,
    obstacleDespawnX: -520,
    obstacleSpacing: 440,
    obstacleWidth: 150,
    obstacleGapSize: 380,
    minimumGapCenterY: -210,
    maximumGapCenterY: 210,
    scrollSpeed: 220,
    hitDuration: 0.45,
});

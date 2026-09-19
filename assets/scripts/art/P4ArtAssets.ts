import { assetManager, AssetManager, SpriteFrame } from 'cc';

export const P4_ASSET_BUNDLE = 'core';

export interface P4ArtAssets {
    readonly bajieIdle: SpriteFrame;
    readonly bajieFlyUp: SpriteFrame;
    readonly bajieFall: SpriteFrame;
    readonly bajieHit: SpriteFrame;
    readonly bajieResult: SpriteFrame;
    readonly sky: SpriteFrame;
    readonly cloudsFar: SpriteFrame;
    readonly islandsFar: SpriteFrame;
    readonly islandsMid: SpriteFrame;
    readonly mountain: SpriteFrame;
    readonly stonePillar: SpriteFrame;
    readonly fireball: SpriteFrame;
    readonly stormCloud: SpriteFrame;
    readonly lightning: SpriteFrame;
    readonly windFireWheel: SpriteFrame;
    readonly pauseIcon: SpriteFrame;
    readonly titleBoard: SpriteFrame;
    readonly resultPanel: SpriteFrame;
    readonly airflow: SpriteFrame;
    readonly collisionCloud: SpriteFrame;
    readonly scoreSparkle: SpriteFrame;
}

const PATHS: Record<keyof P4ArtAssets, string> = {
    bajieIdle: 'textures/characters/bajie/player_bajie_idle/spriteFrame',
    bajieFlyUp: 'textures/characters/bajie/player_bajie_fly_up/spriteFrame',
    bajieFall: 'textures/characters/bajie/player_bajie_fall/spriteFrame',
    bajieHit: 'textures/characters/bajie/player_bajie_hit/spriteFrame',
    bajieResult: 'textures/characters/bajie/player_bajie_result/spriteFrame',
    sky: 'textures/environments/tiangong/bg_sky_base/spriteFrame',
    cloudsFar: 'textures/environments/tiangong/bg_clouds_far/spriteFrame',
    islandsFar: 'textures/environments/tiangong/bg_islands_far/spriteFrame',
    islandsMid: 'textures/environments/tiangong/bg_islands_mid/spriteFrame',
    mountain: 'textures/obstacles/ground/obstacle_mountain/spriteFrame',
    stonePillar: 'textures/obstacles/ground/obstacle_stone_pillar/spriteFrame',
    fireball: 'textures/obstacles/ground/obstacle_fireball/spriteFrame',
    stormCloud: 'textures/obstacles/sky/obstacle_storm_cloud/spriteFrame',
    lightning: 'textures/obstacles/sky/obstacle_lightning_active/spriteFrame',
    windFireWheel: 'textures/obstacles/sky/obstacle_wind_fire_wheel/spriteFrame',
    pauseIcon: 'textures/ui/common/ui_icon_pause/spriteFrame',
    titleBoard: 'textures/ui/common/ui_title_board/spriteFrame',
    resultPanel: 'textures/ui/common/ui_panel_result/spriteFrame',
    airflow: 'textures/vfx/common/vfx_airflow_swoosh/spriteFrame',
    collisionCloud: 'textures/vfx/common/vfx_collision_cloud/spriteFrame',
    scoreSparkle: 'textures/vfx/common/vfx_score_sparkle/spriteFrame',
};

function loadBundle(): Promise<AssetManager.Bundle> {
    const cached = assetManager.getBundle(P4_ASSET_BUNDLE);
    if (cached) {
        return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
        assetManager.loadBundle(P4_ASSET_BUNDLE, (error, bundle) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(bundle);
        });
    });
}

function loadSpriteFrame(bundle: AssetManager.Bundle, path: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
        bundle.load(path, SpriteFrame, (error, frame) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(frame);
        });
    });
}

export async function loadP4ArtAssets(): Promise<P4ArtAssets> {
    const bundle = await loadBundle();
    const keys = Object.keys(PATHS) as Array<keyof P4ArtAssets>;
    const frames = await Promise.all(keys.map((key) => loadSpriteFrame(bundle, PATHS[key])));
    const loaded = {} as Record<keyof P4ArtAssets, SpriteFrame>;
    keys.forEach((key, index) => {
        loaded[key] = frames[index];
    });
    return loaded;
}

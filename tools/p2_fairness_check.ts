import { StaticObstacleGenerator } from '../assets/scripts/obstacles/StaticObstacleGenerator';

const SAMPLE_COUNT = 10_000;
const SEED = 0x20260920;

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

const generator = new StaticObstacleGenerator(SEED);
const replay = new StaticObstacleGenerator(SEED);
let previousCenter = 0;
let mountainCount = 0;
let pillarCount = 0;
let fallbackCount = 0;

for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const score = Math.floor(index / 100);
    const pair = generator.generate(score, index);
    const replayPair = replay.generate(score, index);
    const tier = generator.getTier(score);

    assert(JSON.stringify(pair) === JSON.stringify(replayPair), `seed mismatch at ${index}`);
    assert(pair.gapSize >= 300, `gap below minimum at ${index}`);
    assert(pair.gapCenterY >= -210 && pair.gapCenterY <= 210, `center out of bounds at ${index}`);
    assert(
        Math.abs(pair.gapCenterY - previousCenter) <= tier.maxCenterStep + Number.EPSILON,
        `center step too large at ${index}`,
    );
    assert(pair.visualScale >= 0.9 && pair.visualScale <= 1.1, `scale out of bounds at ${index}`);

    if (pair.groundType === 'mountain') {
        mountainCount += 1;
    } else if (pair.groundType === 'stone_pillar') {
        pillarCount += 1;
    }
    if (pair.usedFallback) {
        fallbackCount += 1;
    }
    previousCenter = pair.gapCenterY;
}

assert(mountainCount > 0 && pillarCount > 0, 'not all P2 combinations were generated');
console.log(JSON.stringify({
    passed: SAMPLE_COUNT,
    seed: `0x${SEED.toString(16)}`,
    mountainCount,
    pillarCount,
    fallbackCount,
}, null, 2));

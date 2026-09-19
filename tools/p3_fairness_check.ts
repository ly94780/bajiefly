import { ObstacleGenerator } from '../assets/scripts/obstacles/ObstacleGenerator';

const SAMPLE_COUNT = 10_000;
const SEED = 0x20260920;

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

const generator = new ObstacleGenerator(SEED);
const replay = new ObstacleGenerator(SEED);
const counts = new Map<string, number>();
let previousCenter = 0;
let previousCombination = '';
let sameCount = 0;
let dynamicStreak = 0;
let previousLightning = false;

for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const score = Math.floor(index / 80);
    const pair = generator.generate(score, index);
    const replayPair = replay.generate(score, index);
    const tier = generator.getTier(score);
    const groundDynamic = pair.groundType === 'fireball';
    const skyDynamic = pair.skyType === 'lightning' || pair.skyType === 'wind_fire_wheel';
    const effectiveGap = pair.gapSize
        - (pair.groundAmplitude ?? 0)
        - (pair.skyAmplitude ?? 0)
        - (pair.lightningExtension ?? 0);

    assert(JSON.stringify(pair) === JSON.stringify(replayPair), `seed mismatch at ${index}`);
    assert(effectiveGap >= Math.max(300, tier.safeGapSize), `unsafe dynamic gap at ${index}`);
    assert(Math.abs(pair.gapCenterY - previousCenter) <= tier.maxCenterStep + Number.EPSILON, `center step at ${index}`);
    assert(!(groundDynamic && skyDynamic) || tier.doubleDynamicEnabled, `double dynamic too early at ${index}`);
    assert(!(previousLightning && pair.skyType === 'lightning'), `consecutive lightning at ${index}`);

    dynamicStreak = groundDynamic || skyDynamic ? dynamicStreak + 1 : 0;
    assert(dynamicStreak <= 2, `dynamic streak at ${index}`);
    sameCount = pair.combinationId === previousCombination ? sameCount + 1 : 1;
    assert(sameCount <= 2, `same combination streak at ${index}`);

    counts.set(pair.combinationId, (counts.get(pair.combinationId) ?? 0) + 1);
    previousCenter = pair.gapCenterY;
    previousCombination = pair.combinationId;
    previousLightning = pair.skyType === 'lightning';
}

assert(counts.size === 9, `expected 9 combinations, received ${counts.size}`);
const combinationCounts: Record<string, number> = {};
[...counts.entries()].sort().forEach(([id, count]) => {
    combinationCounts[id] = count;
});
console.log(JSON.stringify({
    passed: SAMPLE_COUNT,
    seed: `0x${SEED.toString(16)}`,
    combinations: combinationCounts,
}, null, 2));

import { DEFAULT_P3_OBSTACLE_CONFIG, type P3DifficultyTier, type P3ObstacleConfig } from '../config/P3ObstacleConfig';
import { GroundObstacleType, SkyObstacleType, type GeneratedObstaclePair, type ObstacleCombination } from './ObstacleTypes';
import { SeededRandom } from './SeededRandom';

function isGroundDynamic(type: GroundObstacleType): boolean {
    return type === GroundObstacleType.Fireball;
}

function isSkyDynamic(type: SkyObstacleType): boolean {
    return type === SkyObstacleType.Lightning || type === SkyObstacleType.WindFireWheel;
}

export class ObstacleGenerator {
    private readonly random: SeededRandom;
    private previousGapCenter = 0;
    private previousCombinationId = '';
    private sameCombinationCount = 0;
    private consecutiveDynamicCount = 0;
    private previousWasLightning = false;

    public constructor(seed: number, private readonly config: P3ObstacleConfig = DEFAULT_P3_OBSTACLE_CONFIG) {
        this.random = new SeededRandom(seed);
    }

    public reset(seed: number): void {
        this.random.reset(seed);
        this.previousGapCenter = 0;
        this.previousCombinationId = '';
        this.sameCombinationCount = 0;
        this.consecutiveDynamicCount = 0;
        this.previousWasLightning = false;
    }

    public getTier(score: number): P3DifficultyTier {
        let selected = this.config.tiers[0];
        for (const tier of this.config.tiers) {
            if (score < tier.minimumScore) break;
            selected = tier;
        }
        return selected;
    }

    public generate(score: number, obstacleId: number): GeneratedObstaclePair {
        const tier = this.getTier(score);
        const combination = this.pickCombination(score, tier);
        const groundAmplitude = combination.groundType === GroundObstacleType.Fireball ? this.config.fireballAmplitude : 0;
        const skyAmplitude = combination.skyType === SkyObstacleType.WindFireWheel ? this.config.windFireWheelAmplitude : 0;
        const lightningExtension = combination.skyType === SkyObstacleType.Lightning ? this.config.lightningExtension : 0;
        const gapSize = Math.max(this.config.minimumSafeGap, tier.safeGapSize)
            + groundAmplitude + skyAmplitude + lightningExtension;
        const centerMinimum = Math.max(this.config.minimumGapCenterY, this.previousGapCenter - tier.maxCenterStep);
        const centerMaximum = Math.min(this.config.maximumGapCenterY, this.previousGapCenter + tier.maxCenterStep);
        let gapCenterY = this.previousGapCenter;
        let usedFallback = true;
        for (let attempt = 0; attempt < this.config.validationRetries; attempt += 1) {
            const candidate = this.random.range(centerMinimum, centerMaximum);
            if (Math.abs(candidate - this.previousGapCenter) <= tier.maxCenterStep) {
                gapCenterY = candidate;
                usedFallback = false;
                break;
            }
        }
        const visualScale = this.random.range(0.9, 1.1);
        const width = (combination.groundType === GroundObstacleType.StonePillar ? 140 : 170) * visualScale;
        const motionPeriod = combination.groundType === GroundObstacleType.Fireball
            ? this.config.fireballPeriod
            : this.config.windFireWheelPeriod;
        const motionPhase = this.random.range(0, Math.PI * 2);
        this.previousGapCenter = gapCenterY;
        this.recordCombination(combination);
        return {
            obstacleId,
            combinationId: combination.id,
            groundType: combination.groundType,
            skyType: combination.skyType,
            tierId: tier.id,
            gapCenterY,
            gapSize,
            width,
            visualScale,
            usedFallback,
            groundAmplitude,
            skyAmplitude,
            motionPeriod,
            motionPhase,
            lightningExtension,
        };
    }

    private pickCombination(score: number, tier: P3DifficultyTier): ObstacleCombination {
        let candidates = this.config.combinations.filter((combination) => {
            const groundDynamic = isGroundDynamic(combination.groundType);
            const skyDynamic = isSkyDynamic(combination.skyType);
            const dynamic = groundDynamic || skyDynamic;
            return score >= combination.minimumScore
                && (!groundDynamic || !skyDynamic || tier.doubleDynamicEnabled)
                && !(this.previousWasLightning && combination.skyType === SkyObstacleType.Lightning)
                && !(this.consecutiveDynamicCount >= this.config.maximumConsecutiveDynamic && dynamic)
                && !(this.sameCombinationCount >= 2 && combination.id === this.previousCombinationId);
        });
        if (candidates.length === 0) {
            candidates = this.config.combinations.filter((combination) => combination.minimumScore === 0);
        }
        const staticCandidates = candidates.filter((combination) => !isGroundDynamic(combination.groundType) && !isSkyDynamic(combination.skyType));
        const dynamicCandidates = candidates.filter((combination) => isGroundDynamic(combination.groundType) || isSkyDynamic(combination.skyType));
        const pool = dynamicCandidates.length > 0 && this.random.next() < tier.dynamicWeight ? dynamicCandidates : staticCandidates;
        const selectable = pool.length > 0 ? pool : candidates;
        const totalWeight = selectable.reduce((sum, combination) => sum + combination.weight, 0);
        let roll = this.random.range(0, totalWeight);
        for (const combination of selectable) {
            roll -= combination.weight;
            if (roll <= 0) return combination;
        }
        return selectable[0];
    }

    private recordCombination(combination: ObstacleCombination): void {
        const dynamic = isGroundDynamic(combination.groundType) || isSkyDynamic(combination.skyType);
        this.consecutiveDynamicCount = dynamic ? this.consecutiveDynamicCount + 1 : 0;
        this.sameCombinationCount = combination.id === this.previousCombinationId ? this.sameCombinationCount + 1 : 1;
        this.previousCombinationId = combination.id;
        this.previousWasLightning = combination.skyType === SkyObstacleType.Lightning;
    }
}

import {
    DEFAULT_P2_OBSTACLE_CONFIG,
    type P2DifficultyTier,
    type P2ObstacleConfig,
} from '../config/P2ObstacleConfig';
import {
    GroundObstacleType,
    type GeneratedObstaclePair,
    type StaticObstacleCombination,
} from './ObstacleTypes';
import { SeededRandom } from './SeededRandom';

export class StaticObstacleGenerator {
    private readonly random: SeededRandom;
    private previousGapCenter = 0;

    public constructor(
        seed: number,
        private readonly config: P2ObstacleConfig = DEFAULT_P2_OBSTACLE_CONFIG,
    ) {
        this.random = new SeededRandom(seed);
    }

    public reset(seed: number): void {
        this.random.reset(seed);
        this.previousGapCenter = 0;
    }

    public getTier(score: number): P2DifficultyTier {
        let selected = this.config.tiers[0];
        for (const tier of this.config.tiers) {
            if (score < tier.minimumScore) {
                break;
            }
            selected = tier;
        }
        return selected;
    }

    public generate(score: number, obstacleId: number): GeneratedObstaclePair {
        const tier = this.getTier(score);
        const combination = this.pickCombination();
        const gapSize = Math.max(this.config.minimumGapSize, tier.gapSize);
        const centerMinimum = Math.max(
            this.config.minimumGapCenterY,
            this.previousGapCenter - tier.maxCenterStep,
        );
        const centerMaximum = Math.min(
            this.config.maximumGapCenterY,
            this.previousGapCenter + tier.maxCenterStep,
        );

        let gapCenterY = this.previousGapCenter;
        let usedFallback = true;
        for (let attempt = 0; attempt < this.config.validationRetries; attempt += 1) {
            const candidate = this.random.range(centerMinimum, centerMaximum);
            if (this.isValidCenter(candidate, gapSize, tier)) {
                gapCenterY = candidate;
                usedFallback = false;
                break;
            }
        }
        if (usedFallback) {
            gapCenterY = Math.max(centerMinimum, Math.min(centerMaximum, this.previousGapCenter));
        }

        const visualScale = this.random.range(
            this.config.minimumVisualScale,
            this.config.maximumVisualScale,
        );
        const baseWidth = combination.groundType === GroundObstacleType.Mountain
            ? this.config.mountainWidth
            : this.config.stonePillarWidth;
        this.previousGapCenter = gapCenterY;

        return {
            obstacleId,
            combinationId: combination.id,
            groundType: combination.groundType,
            skyType: combination.skyType,
            tierId: tier.id,
            gapCenterY,
            gapSize,
            width: baseWidth * visualScale,
            visualScale,
            usedFallback,
        };
    }

    private pickCombination(): StaticObstacleCombination {
        const totalWeight = this.config.combinations.reduce(
            (total, combination) => total + combination.weight,
            0,
        );
        let roll = this.random.range(0, totalWeight);
        for (const combination of this.config.combinations) {
            roll -= combination.weight;
            if (roll <= 0) {
                return combination;
            }
        }
        return this.config.combinations[0];
    }

    private isValidCenter(
        candidate: number,
        gapSize: number,
        tier: P2DifficultyTier,
    ): boolean {
        return gapSize >= this.config.minimumGapSize
            && candidate >= this.config.minimumGapCenterY
            && candidate <= this.config.maximumGapCenterY
            && Math.abs(candidate - this.previousGapCenter) <= tier.maxCenterStep;
    }
}

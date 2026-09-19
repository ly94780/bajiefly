import { sys } from 'cc';

const STORAGE_KEY = 'bajie-cannot-fly.best-score.v1';

export class BestScoreStorage {
    public load(): number {
        try {
            const rawValue = sys.localStorage.getItem(STORAGE_KEY);
            if (rawValue === null) {
                return 0;
            }
            const value = Number.parseInt(rawValue, 10);
            return Number.isFinite(value) && value >= 0 ? value : 0;
        } catch {
            return 0;
        }
    }

    public saveIfHigher(score: number, previousBest: number): number {
        const nextBest = Math.max(previousBest, Math.max(0, Math.floor(score)));
        if (nextBest === previousBest) {
            return previousBest;
        }

        try {
            sys.localStorage.setItem(STORAGE_KEY, String(nextBest));
        } catch {
            // Storage can be unavailable in private or restricted environments.
        }
        return nextBest;
    }
}

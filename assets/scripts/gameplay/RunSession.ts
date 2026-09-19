export class RunSession {
    private readonly scoredObstacleIds = new Set<number>();
    private scoreValue = 0;

    public get score(): number {
        return this.scoreValue;
    }

    public reset(): void {
        this.scoredObstacleIds.clear();
        this.scoreValue = 0;
    }

    public tryScoreObstacle(obstacleId: number): boolean {
        if (this.scoredObstacleIds.has(obstacleId)) {
            return false;
        }

        this.scoredObstacleIds.add(obstacleId);
        this.scoreValue += 1;
        return true;
    }
}

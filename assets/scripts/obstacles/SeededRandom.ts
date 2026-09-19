export class SeededRandom {
    private state: number;

    public constructor(seed: number) {
        this.state = seed >>> 0;
    }

    public reset(seed: number): void {
        this.state = seed >>> 0;
    }

    public next(): number {
        this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }

    public range(minimum: number, maximum: number): number {
        return minimum + (maximum - minimum) * this.next();
    }
}

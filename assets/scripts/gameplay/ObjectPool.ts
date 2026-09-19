export interface ObjectPoolStats {
    readonly active: number;
    readonly available: number;
    readonly created: number;
}

export class ObjectPool<T> {
    private readonly availableItems: T[] = [];
    private readonly activeItems = new Set<T>();
    private createdCount = 0;

    public constructor(
        private readonly factory: () => T,
        private readonly onAcquire: (item: T) => void,
        private readonly onRelease: (item: T) => void,
    ) {}

    public get stats(): ObjectPoolStats {
        return {
            active: this.activeItems.size,
            available: this.availableItems.length,
            created: this.createdCount,
        };
    }

    public acquire(): T {
        const item = this.availableItems.pop() ?? this.createItem();
        this.activeItems.add(item);
        this.onAcquire(item);
        return item;
    }

    public release(item: T): boolean {
        if (!this.activeItems.delete(item)) {
            return false;
        }

        this.onRelease(item);
        this.availableItems.push(item);
        return true;
    }

    public releaseAll(items: readonly T[]): void {
        [...items].forEach((item) => this.release(item));
    }

    private createItem(): T {
        this.createdCount += 1;
        return this.factory();
    }
}

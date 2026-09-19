import { GameState } from './GameState';

export type GameStateListener = (current: GameState, previous: GameState) => void;

const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
    [GameState.Boot]: [GameState.Ready],
    [GameState.Ready]: [GameState.Playing],
    [GameState.Playing]: [GameState.Paused, GameState.Hit, GameState.Ready],
    [GameState.Paused]: [GameState.Playing, GameState.Ready],
    [GameState.Hit]: [GameState.Result],
    [GameState.Result]: [GameState.Ready],
};

export class GameStateMachine {
    private currentState: GameState = GameState.Boot;
    private readonly listeners = new Set<GameStateListener>();

    public get state(): GameState {
        return this.currentState;
    }

    public canTransition(next: GameState): boolean {
        return TRANSITIONS[this.currentState].indexOf(next) >= 0;
    }

    public transition(next: GameState): boolean {
        if (next === this.currentState || !this.canTransition(next)) {
            return false;
        }

        const previous = this.currentState;
        this.currentState = next;
        this.listeners.forEach((listener) => listener(next, previous));
        return true;
    }

    public onChange(listener: GameStateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

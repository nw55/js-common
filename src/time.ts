export interface Clock {
    // in milliseconds as float
    now(): number;
}

export interface Timer {
    readonly running: boolean;

    start(): void;
    stop(): void;

    addCallback(callback: () => void): void;
    removeCallback(callback: () => void): void;
}

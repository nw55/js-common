export type OperationFilterContextTypeMap<TMap> = {
    // [K in keyof TMap]: Extract<TMap[K], OperationFilterContext>;
    [K in keyof TMap]: TMap[K] & OperationFilterContext;
};

export interface OperationFilterContext {
    next(): boolean;

    finalize(): void;
}

export interface OperationFilter<TMap, K extends keyof TMap> {
    readonly operation: K;

    readonly order: number;

    process(context: OperationFilterContextTypeMap<TMap>[K]): void;
}

export interface OperationFilterProvider<TMap> {
    getOperationFilters(): Iterable<OperationFilter<TMap, keyof TMap>>;
}

export abstract class DefaultOperationFilterContext implements OperationFilterContext {
    private _cancelled = false;
    private _executeResult = true;

    cancel(executeResult: boolean) {
        this._cancelled = true;
        this._executeResult = executeResult;
    }

    get executeResult() {
        return this._executeResult;
    }

    next() {
        return !this._cancelled;
    }

    finalize() {
        if (this._executeResult)
            this._finalize();
    }

    protected _finalize() { }
}

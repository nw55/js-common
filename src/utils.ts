// tslint:disable-next-line: ban-types
export type ConstructorLike<T> = Function & { prototype: T };

export type AnyConstructor<T> = new (...args: any[]) => T;

export type DefaultConstructor<T> = new () => T;

export function defaultIfUndefined<T>(value: T | undefined, defaultValue: T) {
    return value === undefined ? defaultValue : value;
}

export function defaultFactory<TResult, TParams extends any[]>(constructor: new (...args: TParams) => TResult) {
    return (...args: TParams) => new constructor(...args);
}

export function shallowClone<T>(obj: T): T {
    return Object.assign({}, obj);
}

export function overwrite<T>(base: T, values: Partial<T>): T {
    return Object.assign({}, base, values);
}

export class PromiseSource<T = void> {
    private _resolve?: (result?: T) => void;
    private _reject?: (error: any) => void;
    private _promise: Promise<T>;
    private _pending = true;

    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    get promise() {
        return this._promise;
    }

    get pending() {
        return this._pending;
    }

    resolve(result?: T) {
        if (this._pending) {
            this._pending = false;
            this._resolve!(result);
        }
    }

    reject(error?: any) {
        if (this._pending) {
            this._pending = false;
            this._reject!(error);
        }
    }
}

export type TypedArray = Uint32Array | Uint16Array | Uint8Array | Int32Array | Int16Array | Int8Array | Uint8ClampedArray | Float32Array | Float64Array;
export type TypedArrayConstructor<T extends TypedArray> = new (size: number) => T;

export type Awaitable<T = void> = Promise<T> | T;

export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
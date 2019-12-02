const emptyMap: ReadonlyMap<any, any> = new Map();

export class MultiKeyMap<K1, K2, V> {
    private _map = new Map<K1, Map<K2, V>>();
    private _size = 0;

    get size() {
        return this._size;
    }

    hasAny(key1: K1) {
        return this._map.has(key1);
    }

    has(key1: K1, key2: K2) {
        const inner = this._map.get(key1);
        if (inner === undefined)
            return false;
        return inner.has(key2);
    }

    getAll(key1: K1): ReadonlyMap<K2, V> {
        const inner = this._map.get(key1);
        if (inner === undefined)
            return emptyMap;
        return inner;
    }

    get(key1: K1, key2: K2) {
        const inner = this._map.get(key1);
        if (inner === undefined)
            return undefined;
        return inner.get(key2);
    }

    set(key1: K1, key2: K2, value: V) {
        const inner = this._map.get(key1);
        if (inner === undefined) {
            const newInner = new Map([[key2, value]]);
            this._map.set(key1, newInner);
            this._size++;
        }
        else {
            const oldSize = inner.size;
            inner.set(key2, value);
            if (inner.size !== oldSize)
                this._size++;
        }
        return this;
    }

    deleteAll(key1: K1) {
        const inner = this._map.get(key1);
        if (inner !== undefined) {
            this._map.delete(key1);
            this._size -= inner.size;
            return true;
        }
        return false;
    }

    delete(key1: K1, key2: K2) {
        const inner = this._map.get(key1);
        if (inner === undefined)
            return false;
        const success = inner.delete(key2);
        if (success)
            this._size--;
        return success;
    }

    clear() {
        this._map.clear();
        this._size = 0;
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *entries(): IterableIterator<[K1, K2, V]> {
        for (const [key1, inner] of this._map) {
            for (const [key2, value] of inner)
                yield [key1, key2, value];
        }
    }

    keys() {
        return this._map.keys();
    }

    *keyPairs(): IterableIterator<[K1, K2]> {
        for (const [key1, inner] of this._map) {
            for (const key2 of inner.keys())
                yield [key1, key2];
        }
    }

    *values() {
        for (const inner of this._map.values())
            yield* inner.values();
    }

    forEach(cb: (value: V, key1: K1, key2: K2, map: this) => void) {
        for (const [key1, inner] of this._map) {
            for (const [key2, value] of inner)
                cb(value, key1, key2, this);
        }
    }
}

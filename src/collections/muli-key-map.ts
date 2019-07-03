export class MultiKeyMap<K1, K2, V> {
    private _map = new Map<K1, Map<K2, V>>();

    clear() {
        this._map.clear();
    }

    deleteAll(key1: K1) {
        return this._map.delete(key1);
    }

    delete(key1: K1, key2: K2) {
        let inner = this._map.get(key1);
        if (inner === undefined)
            return false;
        return inner.delete(key2);
    }

    getAll(key1: K1) {
        return this._map.get(key1);
    }

    get(key1: K1, key2: K2) {
        let inner = this._map.get(key1);
        if (inner === undefined)
            return undefined;
        return inner.get(key2);
    }

    hasAny(key1: K1) {
        return this._map.has(key1);
    }

    has(key1: K1, key2: K2) {
        let inner = this._map.get(key1);
        if (inner === undefined)
            return false;
        return inner.has(key2);
    }

    set(key1: K1, key2: K2, value: V) {
        let inner = this._map.get(key1);
        if (inner === undefined) {
            inner = new Map();
            this._map.set(key1, inner);
        }
        inner.set(key2, value);
        return this;
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *entries(): IterableIterator<[K1, K2, V]> {
        for (let [key1, inner] of this._map) {
            for (let [key2, value] of inner)
                yield [key1, key2, value];
        }
    }

    keys() {
        return this._map.keys();
    }

    *keyPairs(): IterableIterator<[K1, K2]> {
        for (let [key1, inner] of this._map) {
            for (let key2 of inner.keys())
                yield [key1, key2];
        }
    }

    *values() {
        for (let inner of this._map.values())
            yield* inner.values();
    }
}

export class MultiKeySet<K1, K2> {
    private _map = new Map<K1, Set<K2>>();

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

    hasAny(key1: K1) {
        return this._map.has(key1);
    }

    has(key1: K1, key2: K2) {
        let inner = this._map.get(key1);
        if (inner === undefined)
            return false;
        return inner.has(key2);
    }

    add(key1: K1, key2: K2) {
        let inner = this._map.get(key1);
        if (inner === undefined) {
            inner = new Set();
            this._map.set(key1, inner);
        }
        inner.add(key2);
        return this;
    }

    [Symbol.iterator]() {
        return this.keyPairs();
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
}

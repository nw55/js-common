const emptyIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined
};
Object.freeze(emptyIteratorResult);

const emptyIterableIterator: IterableIterator<any> = {
    next() { return emptyIteratorResult; },
    [Symbol.iterator]() { return this; }
};
Object.freeze(emptyIterableIterator);

export class MultiMap<K, V> {
    static add<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
        let inner = map.get(key);
        if (inner === undefined) {
            inner = new Set();
            map.set(key, inner);
        }
        inner.add(value);
    }

    private _map = new Map<K, Set<V>>();

    clear() {
        this._map.clear();
    }

    deleteAll(key: K) {
        return this._map.delete(key);
    }

    delete(key: K, value: V) {
        let inner = this._map.get(key);
        if (inner === undefined)
            return false;
        return inner.delete(value);
    }

    get(key: K): Iterable<V> {
        let inner = this._map.get(key);
        if (inner === undefined)
            return emptyIterableIterator;
        return inner;
    }

    hasKey(key: K) {
        return this._map.has(key);
    }

    has(key: K, value: V) {
        let inner = this._map.get(key);
        if (inner === undefined)
            return false;
        return inner.has(value);
    }

    add(key: K, value: V) {
        MultiMap.add(this._map, key, value);
        return this;
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *entries(): IterableIterator<[K, V]> {
        for (let [key, values] of this._map) {
            for (let value of values)
                yield [key, value];
        }
    }

    keys(): IterableIterator<K> {
        return this._map.keys();
    }

    *values() {
        for (let values of this._map.values()) {
            for (let value of values)
                yield value;
        }
    }
}

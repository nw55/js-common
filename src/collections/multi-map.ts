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
        const inner = map.get(key);
        if (inner === undefined) {
            const newInner = new Set([value]);
            map.set(key, newInner);
            return true;
        }
        const oldSize = inner.size;
        inner.add(value);
        return inner.size !== oldSize;
    }

    private _map = new Map<K, Set<V>>();
    private _size = 0;

    get size() {
        return this._size;
    }

    hasKey(key: K) {
        const inner = this._map.get(key);
        if (inner === undefined)
            return false;
        return inner.size > 0;
    }

    has(key: K, value: V) {
        const inner = this._map.get(key);
        if (inner === undefined)
            return false;
        return inner.has(value);
    }

    get(key: K): Iterable<V> {
        const inner = this._map.get(key);
        if (inner === undefined)
            return emptyIterableIterator;
        return inner;
    }

    add(key: K, value: V) {
        const success = MultiMap.add(this._map, key, value);
        if (success)
            this._size++;
        return this;
    }

    deleteAll(key: K) {
        const inner = this._map.get(key);
        if (inner !== undefined) {
            this._map.delete(key);
            this._size -= inner.size;
            return true;
        }
        return false;
    }

    delete(key: K, value: V) {
        const inner = this._map.get(key);
        if (inner === undefined)
            return false;
        const success = inner.delete(value);
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

    *entries(): IterableIterator<[K, V]> {
        for (const [key, values] of this._map) {
            for (const value of values)
                yield [key, value];
        }
    }

    keys(): IterableIterator<K> {
        return this._map.keys();
    }

    *values() {
        for (const values of this._map.values()) {
            for (const value of values)
                yield value;
        }
    }

    forEach(cb: (key: K, value: V, map: this) => void) {
        for (const [key, values] of this._map) {
            for (const value of values)
                cb(key, value, this);
        }
    }
}

export { MultiMap as MultiKeySet };

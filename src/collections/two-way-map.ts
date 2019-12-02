export class TwoWayMap<K, V> {
    private _map1 = new Map<K, V>();
    private _map2 = new Map<V, K>();

    get size() {
        return this._map1.size;
    }

    getValue(key: K) {
        return this._map1.get(key);
    }

    getKey(value: V) {
        return this._map2.get(value);
    }

    hasKey(key: K) {
        return this._map1.has(key);
    }

    hasValue(value: V) {
        return this._map2.has(value);
    }

    set(key: K, value: V) {
        const previousValue = this._map1.get(key);
        const previousKey = this._map2.get(value);
        if (this._map1.delete(previousKey!)) // undefined may be a valid value
            this._map2.delete(previousValue!); // undefined may be a valid value
        this._map1.set(key, value);
        this._map2.set(value, key);
        return this;
    }

    delete(key: K) {
        const value = this._map1.get(key);
        if (this._map1.delete(key))
            this._map2.delete(value!); // undefined may be a valid value
    }

    deleteValue(value: V) {
        const key = this._map2.get(value);
        if (this._map1.delete(key!)) // undefined may be a valid value
            this._map2.delete(value);
    }

    clear() {
        this._map1.clear();
        this._map2.clear();
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    entries() {
        return this._map1.entries();
    }

    keys() {
        return this._map1.keys();
    }

    values() {
        return this._map2.keys();
    }

    forEach(cb: (key: K, value: V, map: this) => void) {
        this._map1.forEach((value, key) => cb(key, value, this));
    }
}

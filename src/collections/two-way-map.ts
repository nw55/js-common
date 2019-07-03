export class TwoWayMap<K, V> {
    private _map1 = new Map<K, V>();
    private _map2 = new Map<V, K>();

    clear() {
        this._map1.clear();
        this._map2.clear();
    }

    delete(key: K) {
        let value = this._map1.get(key);
        this._map1.delete(key);
        this._map2.delete(value!); // undefined may be a valid value
    }

    deleteValue(value: V) {
        let key = this._map2.get(value);
        this._map1.delete(key!); // undefined may be a valid value
        this._map2.delete(value);
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
        let previousValue = this._map1.get(key);
        let previousKey = this._map2.get(value);
        this._map1.delete(previousKey!);
        this._map2.delete(previousValue!);
        this._map1.set(key, value);
        this._map2.set(value, key);
        return this;
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
}

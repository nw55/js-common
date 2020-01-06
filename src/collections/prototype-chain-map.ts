import { ConstructorLike } from '../utils';
import { MultiMap } from './multi-map';

export class PrototypeChainMap<K, V> {
    private _map = new Map<object, V>();

    has(key: ConstructorLike<K>) {
        return this._map.has(key.prototype);
    }

    get(key: ConstructorLike<K>) {
        return this._map.get(key.prototype);
    }

    set(key: ConstructorLike<K>, value: V) {
        this._map.set(key.prototype, value);
    }

    delete(key: ConstructorLike<K>) {
        return this._map.delete(key.prototype);
    }

    clear() {
        this._map.clear();
    }

    find(obj: K, predicate?: (value: V) => boolean) {
        let prototype = Object.getPrototypeOf(obj);
        while (prototype !== null) {
            const value = this._map.get(prototype);
            if (value !== undefined && (predicate === undefined || predicate(value)))
                return value;
            prototype = Object.getPrototypeOf(prototype);
        }
        return undefined;
    }

    *findAll(obj: K) {
        let prototype = Object.getPrototypeOf(obj);
        while (prototype !== null) {
            const value = this._map.get(prototype);
            if (value !== undefined)
                yield value;
            prototype = Object.getPrototypeOf(prototype);
        }
    }

    values() {
        return this._map.values();
    }
}

export class PrototypeChainMultiMap<K, V> {
    private _map = new MultiMap<object, V>();

    has(key: ConstructorLike<K>, value: V) {
        return this._map.has(key.prototype, value);
    }

    hasAny(key: ConstructorLike<K>) {
        return this._map.hasKey(key.prototype);
    }

    get(key: ConstructorLike<K>) {
        return this._map.get(key.prototype);
    }

    add(key: ConstructorLike<K>, value: V) {
        this._map.add(key.prototype, value);
    }

    delete(key: ConstructorLike<K>, value: V) {
        return this._map.delete(key.prototype, value);
    }

    deleteAll(key: ConstructorLike<K>) {
        return this._map.deleteAll(key.prototype);
    }

    clear() {
        this._map.clear();
    }

    *find(obj: K) {
        let prototype = Object.getPrototypeOf(obj);
        while (prototype !== null) {
            yield* this._map.get(prototype);
            prototype = Object.getPrototypeOf(prototype);
        }
    }

    values() {
        return this._map.values();
    }
}

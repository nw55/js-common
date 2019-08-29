export class LifetimeObject {
    private _lifetimeActive = true;

    get lifetimeActive() {
        return this._lifetimeActive;
    }

    endLifetime() {
        let wasAlive = this._lifetimeActive;
        this._lifetimeActive = false;
        if (wasAlive)
            this._onLifetimeEnd();
    }

    protected _onLifetimeEnd() {
    }
}

type IterationCallback<T> = (obj: T) => boolean;

export interface LifetimeManager<T extends LifetimeObject> {
    readonly objectCount: number;

    addObject: <U extends T>(obj: U) => U;

    forEachObject: (cb: IterationCallback<T>, removeDead?: boolean) => boolean;

    forEachLiveObject: (cb: IterationCallback<T>) => boolean;
}

export class DefaultLifetimeManager<T extends LifetimeObject> implements LifetimeManager<T> {
    private _deleteEarly: boolean;
    private _objects = new Set<T>();

    constructor(deleteEarly: boolean) {
        this._deleteEarly = deleteEarly;
    }

    addObject<U extends T>(obj: U) {
        this._objects.add(obj);
        return obj;
    }

    get objectCount() {
        return this._objects.size;
    }

    forEachObject(cb: IterationCallback<T>, removeDead = false) {
        for (let obj of this._objects) {
            let result = cb(obj);
            if (removeDead && !obj.lifetimeActive)
                this._objects.delete(obj);
            if (!result)
                return false;
        }
        return true;
    }

    forEachLiveObject(cb: IterationCallback<T>) {
        for (let obj of this._objects) {
            if (obj.lifetimeActive) {
                let result = cb(obj);
                if (this._deleteEarly && !obj.lifetimeActive)
                    this._objects.delete(obj);
                if (!result)
                    return false;
            }
            else {
                this._objects.delete(obj);
            }
        }
        return true;
    }
}
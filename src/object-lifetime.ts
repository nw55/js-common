export interface LifetimeObject {
    readonly lifetimeActive: boolean;
}

type IterationCallback<T> = (obj: T) => boolean;

export interface ReadonlyLifetimeManager<T extends LifetimeObject> {
    readonly objectCount: number;

    forEachObject: (cb: IterationCallback<T>, removeDead?: boolean) => boolean;

    forEachLiveObject: (cb: IterationCallback<T>) => boolean;
}

export interface LifetimeManager<T extends LifetimeObject> extends ReadonlyLifetimeManager<T> {
    addObject: <U extends T>(obj: U) => U;
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
                // lifetimeActive might have been changed in cb()
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

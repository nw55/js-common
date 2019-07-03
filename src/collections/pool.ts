export class Pool<T> {
    private _elements: T[] = [];
    private _factory: () => T;
    private _maxElements: number;

    constructor(factory: () => T, initialCount = 0, maxElements = Infinity) {
        this._factory = factory;

        for (let i = 0; i < initialCount; i++)
            this._elements.push(factory());

        this._maxElements = maxElements;
    }

    use() {
        if (this._elements.length === 0)
            return this._factory.call(undefined);
        return this._elements.pop()!;
    }

    return(obj: T) {
        if (this._elements.length < this._maxElements)
            this._elements.push(obj);
    }
}

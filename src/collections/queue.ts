export class Queue<T = any> {
    private _elements: T[];
    private _capacity: number;
    private _writeIndex = 0;
    private _count = 0;

    constructor(capacity: number) {
        this._capacity = capacity;
        this._elements = Array(capacity);
    }

    get capacity() {
        return this._capacity;
    }

    get count() {
        return this._count;
    }

    reset() {
        this._writeIndex = 0;
        this._count = 0;
    }

    clear() {
        this._elements = Array(this._capacity);
        this.reset();
    }

    get next() {
        if (this._count >= this._capacity)
            return undefined;
        let index = (this._writeIndex - this._count + this._capacity) % this._capacity;
        return this._elements[index];
    }

    enqueue(element: T, force = false) {
        if (this._count >= this._capacity) {
            if (!force)
                return false;
            this._count--;
        }
        this._elements[this._writeIndex] = element;
        this._writeIndex = (this._writeIndex + 1) % this._capacity;
        this._count++;
        return true;
    }

    dequeue() {
        if (this._count === 0)
            return undefined;
        let index = (this._writeIndex - this._count + this._capacity) % this._capacity;
        this._count--;
        return this._elements[index];
    }

    *[Symbol.iterator]() {
        for (let c = this._count; c > 0; c--) {
            let i = (this._writeIndex - c + this._capacity) % this._capacity;
            yield this._elements[i];
        }
    }
}

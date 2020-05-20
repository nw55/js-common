import { Log } from '../logging';
import { TypedArray } from '../utils';

export class BitArray {
    static nonemptyEntries(data: TypedArray, length = data.length) {
        const bits = new Uint32Array(Math.ceil(length / 32));
        let v = 0;
        let i = 0;
        while (i < length) {
            if (data[i] !== 0)
                v |= 0x80000000;
            i++;
            if (i % 32 === 0) {
                bits[i / 32 - 1] = v;
                v = 0;
            }
            v >>>= 1;
        }
        if (i % 32 !== 0)
            bits[Math.ceil(i / 32) - 1] = v >>> (32 - i % 32 - 1);
        return new BitArray(length, bits);
    }

    private _length: number;
    private _data: Uint32Array;

    constructor(length: number, data?: Uint32Array) {
        this._length = length | 0;
        if (length < 0)
            throw Log.invalidArgument();

        if (data === undefined) {
            const bufferSize = Math.ceil(length / 32);
            data = new Uint32Array(bufferSize);
        }
        else if (data.length * 32 < length) {
            throw Log.invalidArgument();
        }

        this._data = data;
    }

    get length() {
        return this._length;
    }

    getUnchecked(i: number) {
        return (this._data[(i / 32) | 0] & (1 << (i % 32))) !== 0;
    }

    get(i: number) {
        if (i < 0 || i > this._length)
            throw Log.invalidArgument();
        return this.getUnchecked(i);
    }

    setUnchecked(i: number, v: boolean) {
        if (v)
            this._data[(i / 32) | 0] |= 1 << (i % 32);
        else
            this._data[(i / 32) | 0] &= ~(1 << (i % 32));
    }

    set(i: number, v = true) {
        if (i < 0 || i > this._length)
            throw Log.invalidArgument();
        this.setUnchecked(i, v);
    }

    unset(i: number) {
        this.set(i, false);
    }

    clone() {
        const bufferSize = Math.ceil(this._length / 32);
        const newData = new Uint32Array(bufferSize);
        newData.set(this._data);
        return new BitArray(this._length, newData);
    }
}

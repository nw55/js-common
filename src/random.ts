import { Log } from './logging';

// +++
// XorShiftPlus based on:
//   https://github.com/AndreasMadsen/xorshift
//   Copyright (c) 2014 Andreas Madsen & Emil Bay
//   MIT License
// ---

// these are just random values
const seedBase0 = 0x92296e11;
const seedBase1 = 0x8c17f793;
const seedBase2 = 0x1eddaf1f;
const seedBase3 = 0xb15f847c;

function getRandomSeed() {
    return (Math.random() * 0x100000000) | 0;
}

export interface RandomNumberGenerator {
    // [min, max)
    nextInt(min: number, max: number): number;

    // [0, 1)
    nextFloat(): number;

    nextBool(): boolean;
}

export class XorShiftPlus implements RandomNumberGenerator {
    private static readonly jump = new Uint32Array([0x635d2dff, 0x8a5cd789, 0x5c472f96, 0x121fd215]);

    static getRandomSeed(): [number, number, number, number] {
        return [getRandomSeed(), getRandomSeed(), getRandomSeed(), getRandomSeed()];
    }

    static createWithRandomSeed() {
        return XorShiftPlus.create(...XorShiftPlus.getRandomSeed());
    }

    static create(seed0: number, seed1 = 0, seed2 = 0, seed3 = 0) {
        let state = new Uint32Array(4);
        state[0] = seed0 ^ seedBase0;
        state[1] = seed1 ^ seedBase1;
        state[2] = seed2 ^ seedBase2;
        state[3] = seed3 ^ seedBase3;
        return new XorShiftPlus(state);
    }

    private _state: Uint32Array;

    constructor(state: Uint32Array) {
        if (state.length !== 4)
            throw Log.invalidArgument();

        this._state = state;
    }

    get state(): [number, number, number, number] {
        return [this._state[0], this._state[1], this._state[2], this._state[3]];
    }

    clone() {
        let state = this._state.slice(0);
        return new XorShiftPlus(state);
    }

    nextInt64(): [number, number] {
        // uint64_t s1 = s[0]
        let s1U = this._state[0];
        let s1L = this._state[1];
        // uint64_t s0 = s[1]
        let s0U = this._state[2];
        let s0L = this._state[3];

        // result = s0 + s1
        let sumL = (s0L >>> 0) + (s1L >>> 0);
        let resU = (s0U + s1U + (sumL / 2 >>> 31)) >>> 0;
        let resL = sumL >>> 0;

        // s[0] = s0
        this._state[0] = s0U;
        this._state[1] = s0L;

        // s1 ^= s1 << 23;
        // :: t1 = s1 << 23
        const a1 = 23;
        const m1 = 0xFFFFFFFF << (32 - a1);
        let t1U = (s1U << a1) | ((s1L & m1) >>> (32 - a1));
        let t1L = s1L << a1;
        // :: s1 = s1 ^ t1
        s1U = s1U ^ t1U;
        s1L = s1L ^ t1L;

        // t1 = ( s1 ^ s0 ^ ( s1 >> 18 ) ^ ( s0 >> 5 ) )
        // :: t1 = s1 ^ s0
        t1U = s1U ^ s0U;
        t1L = s1L ^ s0L;
        // :: t2 = s1 >> 18
        const a2 = 18;
        const m2 = 0xFFFFFFFF >>> (32 - a2);
        let t2U = s1U >>> a2;
        let t2L = (s1L >>> a2) | ((s1U & m2) << (32 - a2));
        // :: t1 = t1 ^ t2
        t1U = t1U ^ t2U;
        t1L = t1L ^ t2L;
        // :: t2 = s0 >> 5
        const a3 = 5;
        const m3 = 0xFFFFFFFF >>> (32 - a3);
        t2U = s0U >>> a3;
        t2L = (s0L >>> a3) | ((s0U & m3) << (32 - a3));
        // :: t1 = t1 ^ t2
        t1U = t1U ^ t2U;
        t1L = t1L ^ t2L;

        // s[1] = t1
        this._state[2] = t1U;
        this._state[3] = t1L;

        // return result
        return [resU, resL];
    }

    jump() {
        let state = new Uint32Array(4);

        for (let j = 0; j < 4; j++) {
            for (let b = 0; b < 32; b++) {
                if ((XorShiftPlus.jump[j] & (1 << b)) !== 0) {
                    for (let i = 0; i < 4; i++)
                        state[i] ^= this._state[i];
                }
                this.nextInt64();
            }
        }

        this._state = state;
    }

    // between 0 (inclusive) and 1 (exclusive)
    nextFloat() {
        let [u, l] = this.nextInt64();
        // Math.pow(2, -32) = 2.3283064365386963e-10
        // Math.pow(2, -52) = 2.220446049250313e-16
        return u * 2.3283064365386963e-10 + (l >>> 12) * 2.220446049250313e-16;
    }

    nextInt(min: number, max: number) {
        min |= 0;
        max |= 0;
        return this.nextInt64()[0] % (max - min) + min;
    }

    nextBool() {
        return (this.nextInt64()[0] & 0x80000000) === 0;
    }
}

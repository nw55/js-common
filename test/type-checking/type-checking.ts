import { requireType, testType, Type } from '@nw55/common';
import { assert } from 'chai';
import { describe, test } from 'mocha';

describe('type-checking', () => {
    test('String', () => {
        const type = Type.from(String);
        assert.isTrue(testType(type, 'string'));
        assert.isFalse(testType(type, {}));
    });

    test('literal', () => {
        const type = Type.from(1);
        assert.isTrue(testType(type, 1));
        assert.isFalse(testType(type, 2));
    });

    test('array', () => {
        const type = Type.array(String);
        assert.isTrue(testType(type, []));
        assert.isTrue(testType(type, ['str']));
        assert.isFalse(testType(type, [123]));
    });

    test('union', () => {
        const type = Type.union(String, Number);
        assert.isTrue(testType(type, 'string'));
        assert.isTrue(testType(type, 123));
        assert.isFalse(testType(type, true));
    });

    test('partial', () => {
        const type = Type.partial({ a: String });
        assert.isTrue(testType(type, { a: 'string' }));
        assert.isTrue(testType(type, { b: 123 }));
        assert.isFalse(testType(type, { a: 123 }));
    });

    test('tuple', () => {
        const type = Type.from([String, Number] as const);
        assert.isTrue(testType(type, ['a', 1]));
        assert.isFalse(testType(type, ['a']));
        assert.isFalse(testType(type, ['a', 1, 2]));
    });

    test('complex type', () => {
        const type = Type.from({
            a: String,
            b: Type.array(Number)
        });
        const matchingValue = {
            a: 'string',
            b: [1, 2]
        };
        const failingValue = {
            a: 'a',
            b: ['b']
        };
        assert.isTrue(testType(type, matchingValue));
        assert.isFalse(testType(type, failingValue));
        requireType(type, matchingValue);
        assert.throws(() => requireType(type, failingValue));
    });
});
